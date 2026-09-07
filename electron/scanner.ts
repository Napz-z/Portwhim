import si from 'systeminformation';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { detect } from './detect';
import type { Listener, Snapshot } from '../src/shared';
export function isListener(c: {protocol:string;state:string}) {
  return c.protocol.toLowerCase().startsWith('tcp') ? c.state.toUpperCase()==='LISTEN' || c.state.toUpperCase()==='LISTENING' : c.protocol.toLowerCase().startsWith('udp');
}
export function scope(address:string): Listener['scope'] {
  return address==='::1'||address.startsWith('127.') ? 'loopback' : ['0.0.0.0','::','*',''].includes(address)?'all interfaces':'network';
}
export async function scan(): Promise<Snapshot> {
  const warnings:string[]=[];
  const [connections, processes] = await Promise.all([
    si.networkConnections(),
    si.processes().catch(()=>{warnings.push('Process details are unavailable. Some fields and stop actions are disabled.');return {list:[]};})
  ]);
  const byPid=new Map(processes.list.map(p=>[p.pid,p]));
  if(processes.list.length===0)warnings.push('The OS returned no process metadata. Try running outside a restricted shell.');
  const appPids=new Set([process.pid]);
  for(let i=0;process.versions.electron&&i<processes.list.length;i++){
    let added=false;for(const p of processes.list)if(appPids.has(p.parentPid)&&!appPids.has(p.pid)){appPids.add(p.pid);added=true;}
    if(!added)break;
  }
  const seen=new Set<string>(); const listeners:Listener[]=[];
  for(const c of connections){
    if(!isListener(c))continue;
    const port=Number(c.localPort); if(!Number.isInteger(port)||port<1||port>65535)continue;
    const protocol=c.protocol.toLowerCase().startsWith('tcp')?'TCP':'UDP';
    const key=`${c.pid}|${protocol}|${c.localAddress}|${port}`;if(seen.has(key))continue;seen.add(key);
    const p=byPid.get(c.pid); const name=p?.name||c.process||'Unknown';
    const started=p?.started||null;
    listeners.push({id:randomUUID(),pid:c.pid,name,port,protocol,address:c.localAddress,started,
      cpu:p&&Number.isFinite(p.cpu)?p.cpu:null,memory:p&&Number.isFinite(p.memRss)?p.memRss*1024:null,
      ...detect(name,`${p?.command||''} ${p?.params||''}`,port),scope:scope(c.localAddress),
      canStop:!!started&&c.pid>4&&!appPids.has(c.pid)&&c.pid!==process.ppid
    });
  }
  if(listeners.some(l=>l.name==='Unknown'))warnings.push('Some process details require additional OS permissions. Unavailable values are shown as —.');
  return {listeners:listeners.sort((a,b)=>a.port-b.port||a.pid-b.pid),scannedAt:new Date().toISOString(),hostname:os.hostname(),platform:process.platform,warnings};
}
export async function verifyIdentity(listener:Listener){
  if(!listener.canStop||!listener.started||listener.pid<=4||listener.pid===process.pid||listener.pid===process.ppid)throw new Error('This process is protected or its identity cannot be verified.');
  const current=(await si.processes()).list.find(p=>p.pid===listener.pid);
  if(!current||current.started!==listener.started||current.name!==listener.name)throw new Error('The process changed or exited. Refresh before trying again.');
}
export async function terminate(listener:Listener){
  await verifyIdentity(listener);
  process.kill(listener.pid,'SIGTERM');
}
