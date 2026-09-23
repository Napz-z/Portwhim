import type { Listener } from './shared';
export interface Change { key:string; message:string; at:string }
export function changesBetween(before:Listener[],after:Listener[],at:string):Change[]{
  const groups=(rows:Listener[])=>{const m=new Map<string,Set<string>>();for(const l of rows){const k=`${l.protocol} :${l.port}`;if(!m.has(k))m.set(k,new Set());m.get(k)!.add(`${l.pid}@${l.started}`);}return m;};
  const old=groups(before),next=groups(after);const result:Change[]=[];
  for(const key of new Set([...old.keys(),...next.keys()])){
    const a=old.get(key),b=next.get(key);
    if(!a)result.push({key,at,message:`${key} · New listener observed`});
    else if(!b)result.push({key,at,message:`${key} · No listener observed`});
    else if([...a].sort().join()!==[...b].sort().join())result.push({key,at,message:`${key} · Occupant changed; it may have restarted`});
  }return result;
}
