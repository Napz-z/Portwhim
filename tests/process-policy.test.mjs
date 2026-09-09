import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesOwnership, systemBadge, canRequestStop } from '../src/process-policy.ts';

const ordinary = { pid: 800, category: 'system', systemManaged: false, scope: 'network', canStop: true, started: '2026-09-09' };
test('unknown category and protected applications are not labeled as system managed', () => {
  assert.equal(matchesOwnership(ordinary, 'system'), false);
  assert.equal(systemBadge({ ...ordinary, canStop: false }), null);
});
test('system filter counts sockets and exposure overlaps ownership', () => {
  const system = { ...ordinary, systemManaged: true };
  const sockets = [system, { ...system, scope: 'loopback' }, ordinary];
  assert.equal(sockets.filter(l => matchesOwnership(l, 'system')).length, 2);
  assert.equal(matchesOwnership(system, 'all'), true);
  assert.equal(matchesOwnership(system, 'network'), true);
  assert.equal(matchesOwnership(system, 'dev'), false);
  assert.equal(systemBadge(system), 'System managed');
  assert.equal(matchesOwnership({ ...ordinary, category: 'app' }, 'dev'), true);
});
test('stop eligibility never overrides backend protection or identity requirements', () => {
  assert.equal(canRequestStop(ordinary), true);
  for (const change of [{ canStop: false }, { systemManaged: true }, { pid: 4 }, { pid: 0 }, { started: null }]) {
    assert.equal(canRequestStop({ ...ordinary, ...change }), false);
  }
});
