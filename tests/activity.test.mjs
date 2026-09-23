import {test} from 'node:test';
import assert from 'node:assert/strict';
import {changesBetween} from '../src/activity.ts';
test('changes ignore binding duplication and detect PID reuse, protocol and disappearance',()=>{
  const row={pid:1,started:'a',protocol:'TCP',port:3000};
  assert.deepEqual(changesBetween([row],[row,{...row,address:'::1'}],'now'),[]);
  assert.match(changesBetween([row],[{...row,started:'b'}],'now')[0].message,/Occupant changed/);
  assert.equal(changesBetween([row],[{...row,protocol:'UDP'}],'now').length,2);
  assert.match(changesBetween([row],[],'now')[0].message,/No listener/);
});
