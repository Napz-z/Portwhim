import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detect } from '../electron/detect';
import { isListener, scope, verifyIdentity } from '../electron/scanner';
import type { Listener } from '../src/shared';
test('framework signatures beat generic Node identity',()=>{
  assert.equal(detect('node.exe','node C:/app/node_modules/next/dist/bin/next dev',3000).service,'Next.js');
  assert.equal(detect('node','node /app/node_modules/vite/bin/vite.js',5173).service,'Vite');
  assert.equal(detect('php','php artisan serve',8000).service,'Laravel');
  for(const [name,expected] of [['redis-server','Redis'],['postgres','PostgreSQL'],['com.docker.backend.exe','Docker'],['node.exe','Node.js']]) assert.equal(detect(name,'',1234).service,expected);
});
test('port numbers never identify arbitrary app frameworks',()=>{
  assert.equal(detect('mystery','',3000).confidence,'unknown');
  assert.equal(detect('mystery','',5432).confidence,'port hint');
  assert.equal(detect('node','',5432).service,'Node.js');
});
test('listening TCP and bound UDP; established TCP is excluded',()=>{
  assert.equal(isListener({protocol:'tcp6',state:'LISTEN'}),true);
  assert.equal(isListener({protocol:'TCP',state:'LISTENING'}),true);
  assert.equal(isListener({protocol:'tcp',state:'ESTABLISHED'}),false);
  assert.equal(isListener({protocol:'udp6',state:''}),true);
});
test('IPv4 and IPv6 binding scopes',()=>{
  assert.equal(scope('127.0.0.2'),'loopback');assert.equal(scope('::1'),'loopback');
  assert.equal(scope('0.0.0.0'),'all interfaces');assert.equal(scope('::'),'all interfaces');assert.equal(scope('192.168.1.10'),'network');
});
test('protected and unverifiable processes cannot be stopped',async()=>{
  for(const pid of [0,1,4,process.pid,process.ppid]) await assert.rejects(verifyIdentity({pid,canStop:true,started:'today'} as Listener));
  await assert.rejects(verifyIdentity({pid:999999,canStop:false,started:null} as Listener));
});
