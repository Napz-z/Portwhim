import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { scan, terminate, verifyIdentity } from '../electron/scanner';
test('real TCP / UDP discovery, identity check, termination of owned fixture only', {timeout:60000}, async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'portwhim-live-'));
  await fs.writeFile(path.join(root,'package.json'),'{"name":"portwhim-live-fixture"}');
  const script=path.join(root,'server.cjs');
  await fs.writeFile(script,`const net=require('node:net'),udp=require('node:dgram').createSocket('udp4');const s=net.createServer();s.listen(0,'127.0.0.1',()=>udp.bind(0,'127.0.0.1',()=>console.log(JSON.stringify({tcp:s.address().port,udp:udp.address().port}))));`);
  const fixture=spawn(process.execPath,[script],{cwd:root,stdio:['ignore','pipe','pipe']});
  try{
    const [chunk]=await once(fixture.stdout!,'data');const ports=JSON.parse(chunk.toString());
    const data=await scan();
    const tcp=data.listeners.find(l=>l.pid===fixture.pid&&l.port===ports.tcp&&l.protocol==='TCP');
    const udp=data.listeners.find(l=>l.pid===fixture.pid&&l.port===ports.udp&&l.protocol==='UDP');
    assert.ok(tcp,'TCP fixture must be visible');assert.ok(udp,'UDP fixture must be visible');
    assert.equal(tcp.scope,'loopback');assert.ok(tcp.started);assert.ok(tcp.memory!==null);assert.equal(tcp.service,'Node.js');
    assert.equal(tcp.provenance.project?.directory,root);assert.equal(tcp.provenance.project?.name,'portwhim-live-fixture');
    assert.equal(tcp.provenance.parent?.pid,process.pid);
    await assert.rejects(verifyIdentity({...tcp,started:'incorrect-start-time'}));
    const exited=once(fixture,'exit');await terminate(tcp);await exited;
    assert.equal((await scan()).listeners.some(l=>l.pid===fixture.pid&&l.port===ports.tcp),false);
  }finally{if(fixture.exitCode===null&&!fixture.killed)fixture.kill();await fs.rm(root,{recursive:true,force:true});}
});
