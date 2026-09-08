import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {ancestors,commandPaths,createProvenanceReader,launchSource, type ProcessInfo} from '../electron/provenance';
const proc=(pid:number,parentPid:number,name='node',command=''):ProcessInfo=>({pid,parentPid,name,command,params:''});
test('parent chain is bounded, cycle safe and rejects recycled parent identities',()=>{
  const ps=new Map([[10,proc(10,11)],[11,proc(11,10,'pwsh')]]);
  assert.deepEqual(ancestors(10,ps).map(p=>p.pid),[11]);
  assert.match(launchSource(ancestors(10,ps))!,/shell ancestor/);
  ps.get(10)!.started='2026-01-01';ps.get(11)!.started='2026-01-02';
  assert.deepEqual(ancestors(10,ps),[]);
});
test('absolute paths with spaces identify nearest project, not dependency package; unknown stays unknown',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'portwhim-project-'));
  try{
    const project=path.join(root,'my app');const bin=path.join(project,'node_modules','vite','bin');
    await fs.mkdir(bin,{recursive:true});await fs.writeFile(path.join(project,'package.json'),JSON.stringify({name:'owned-fixture'}));
    await fs.writeFile(path.join(bin,'vite.js'),'');await fs.writeFile(path.join(project,'node_modules','vite','package.json'),'{"name":"vite"}');
    const command=`node "${path.join(bin,'vite.js')}" --token=secret`;
    assert.deepEqual(commandPaths(command),[path.join(bin,'vite.js')]);
    const read=createProvenanceReader(new Map([[999991,proc(999991,999992,'node',command)],[999992,proc(999992,0,'cmd.exe')]]));
    const result=await read(999991);
    assert.equal(result.project?.name,'owned-fixture');assert.equal(result.project?.directory,project);
    assert.equal(result.parent?.pid,999992);assert.ok(!JSON.stringify(result).includes('secret'));
    assert.equal((await read(999993)).project,null);
    const relative=createProvenanceReader(new Map([[999994,proc(999994,0,'node','node ./server.js')]]));
    assert.equal((await relative(999994)).project,null);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});
