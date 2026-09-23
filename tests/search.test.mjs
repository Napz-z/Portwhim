import { test } from 'node:test';
import assert from 'node:assert/strict';
import { queryPort, matchesQuery } from '../src/explorer.ts';
test('port queries accept local URLs and never confuse PID with port', () => {
  for (const q of ['3000', ':3000', ' localhost:3000 ', 'http://localhost:3000/path', 'http://[::1]:3000']) assert.equal(queryPort(q), 3000);
  for (const q of [':0', ':65536', 'hello', 'https://example.com:3000']) assert.equal(queryPort(q), null);
  const row={port:80,pid:3000,name:'node',service:'Node',address:'127.0.0.1',provenance:{project:null}};
  assert.equal(matchesQuery(row,'3000'),false);
  assert.equal(matchesQuery(row,'pid:3000'),true);
  assert.equal(matchesQuery(row,' NODE '),true);
});
