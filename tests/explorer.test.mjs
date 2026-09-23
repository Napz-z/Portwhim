import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clearSearch, resetFilters, hasFilters, identity, socketGroups, visibleGroups, sortListeners, openTarget, inspectLabel, sameProcess, stopFeedback } from '../src/explorer.ts';

test('Clear search preserves ownership and protocol; reset restores All listeners', () => {
  const active = { query: 'no matches', protocol: 'UDP', filter: 'system' };
  assert.deepEqual(clearSearch(active), { ...active, query: '' });
  assert.equal(active.query, 'no matches');
  assert.deepEqual(resetFilters(), { query: '', protocol: 'all', filter: 'all' });
  assert.equal(hasFilters(resetFilters()), false);
  for (const patch of [{ query: 'x' }, { protocol: 'TCP' }, { filter: 'network' }]) {
    assert.equal(hasFilters({ ...resetFilters(), ...patch }), true);
  }
});
const row = { pid: 100, name: 'fixture', port: 80, protocol: 'TCP', address: '127.0.0.1', memory: 100 };
test('socket groups merge addresses, retain bindings, and separate PID/protocol/port', () => {
  const groups = socketGroups([row, { ...row, address: '::1' }, row,
    { ...row, pid: 101 }, { ...row, protocol: 'UDP' }, { ...row, port: 81 }]);
  assert.equal(groups.length, 4);
  assert.deepEqual(groups[0].bindings.map(b => b.address), ['127.0.0.1', '::1']);
  assert.equal(groups[0].bindings[0], row);
});
test('cards show six groups initially and allow expansion and collapse', () => {
  const groups = socketGroups(Array.from({ length: 9 }, (_, i) => ({ ...row, port: 80 + i })));
  assert.equal(visibleGroups(groups, false).visible.length, 6);
  assert.equal(visibleGroups(groups, false).remaining, 3);
  assert.equal(visibleGroups(groups, true).visible.length, 9);
  assert.equal(visibleGroups(groups, false).visible.length, 6);
  assert.equal(visibleGroups(groups.slice(0, 2), false).remaining, 0);
});
test('port ordering ignores memory changes, including ties; memory sort is explicit', () => {
  const rows = [row, { ...row, pid: 90, memory: 80 }, { ...row, port: 79, memory: null }];
  const keys = rows => rows.map(l => `${l.port}:${l.pid}`);
  const before = keys(sortListeners(rows, 'port'));
  const after = keys(sortListeners(rows.map((l, i) => ({ ...l, memory: 100 + i })), 'port'));
  assert.deepEqual(before, ['79:100', '80:90', '80:100']);
  assert.deepEqual(after, before);
  assert.equal(sortListeners(rows, 'memory')[0], row);
  assert.equal(rows[0], row);
  assert.match(inspectLabel(row), /PID 100, TCP port 80 at 127.0.0.1/);
});
test('stop feedback distinguishes a running target, a freed port, and a replacement owner', () => {
  const target = { ...row, service: 'Vite', started: '2026-09-14T01:00:00Z' };
  assert.equal(sameProcess(target, { ...target }), true);
  assert.equal(sameProcess(target, { ...target, started: '2026-09-14T01:01:00Z' }), false);
  assert.notEqual(identity(target), identity({ ...target, started: '2026-09-14T01:01:00Z' }));
  assert.deepEqual(stopFeedback(target, [{ ...target, address: '::1' }]), {
    complete: false,
    message: 'Stop sent, but PID 100 still has listening sockets. Refresh to check again.'
  });
  assert.deepEqual(stopFeedback(target, []), {
    complete: true,
    message: 'No TCP listener observed on :80 in this scan. Binding availability is not guaranteed.'
  });
  assert.deepEqual(stopFeedback(target, [{ ...target, pid: 101, name: 'replacement', started: '2026-09-14T01:02:00Z' }]), {
    complete: true,
    message: 'Vite no longer appears, but TCP :80 is occupied by replacement (PID 101).'
  });
});
for (const c of JSON.parse(readFileSync(new URL('./open-cases.json', import.meta.url), 'utf8'))) {
  test(`browser policy: ${c.name}`, () => assert.deepEqual(openTarget(c.row), { url: c.url, reason: c.reason }));
}
