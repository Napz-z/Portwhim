import fs from 'node:fs/promises';
import path from 'node:path';
import type { Provenance } from '../src/shared';

export interface ProcessInfo { pid:number; parentPid:number; name:string; started?:string; command:string; params:string; }
export function ancestors(pid:number, processes:Map<number,ProcessInfo>) {
  const result:ProcessInfo[]=[];const seen=new Set([pid]);let current=processes.get(pid);
  while(current&&result.length<12){
    const parent=processes.get(current.parentPid);
    if(!parent||seen.has(parent.pid))break;
    // A recycled PID must not be presented as the original parent.
    if(current.started&&parent.started&&Date.parse(parent.started)>Date.parse(current.started))break;
    result.push(parent);seen.add(parent.pid);current=parent;
  }
  return result;
}
export function launchSource(chain:ProcessInfo[]) {
  for(const p of chain){
    if(/^(code|code-insiders|cursor|windsurf)(\.exe)?$/i.test(p.name))return `${p.name} (editor ancestor)`;
    if(/^(services\.exe|systemd|launchd|pm2|supervisord)$/i.test(p.name))return `${p.name} (service manager ancestor)`;
    if(/^(powershell|pwsh|cmd|bash|zsh|fish|sh|windowsterminal)(\.exe)?$/i.test(p.name))return `${p.name} (shell ancestor)`;
  }
  return chain[0]?`${chain[0].name} (parent process)` : null;
}
// Only absolute filesystem arguments are evidence. Never resolve relative paths
// against Portwhim's own working directory or expose a raw command line to the UI.
export function commandPaths(command:string):string[]{
  const tokens=command.match(/"[^"\r\n]*"|'[^'\r\n]*'|[^\s]+/g)||[];
  return tokens.map(t=>t.replace(/^["']|["']$/g,'')).filter(t=>path.isAbsolute(t)&&!t.startsWith('//')&&!t.startsWith('\\\\'));
}
export function createProvenanceReader(processes:Map<number,ProcessInfo>){
  const roots=new Map<string,Promise<{name:string;directory:string;marker:string}|null>>();
  async function projectAt(candidate:string){
    if(roots.has(candidate))return roots.get(candidate)!;
    const pending=(async()=>{
      try{
        let dir=(await fs.stat(candidate)).isDirectory()?candidate:path.dirname(candidate);
        const dependency=dir.split(path.sep).indexOf('node_modules');
        if(dependency>=0)dir=dir.split(path.sep).slice(0,dependency).join(path.sep)||path.parse(dir).root;
        for(let depth=0;depth<10;depth++){
          for(const marker of ['package.json','pyproject.toml','Cargo.toml','go.mod','composer.json','.git']){
            try{
              await fs.stat(path.join(dir,marker));let name=path.basename(dir);
              if(marker==='package.json'){
                const file=path.join(dir,marker);
                if((await fs.stat(file)).size<262144){try{const value=JSON.parse(await fs.readFile(file,'utf8')).name;if(typeof value==='string'&&value.length<160)name=value;}catch{}}
              }
              return {name,directory:dir,marker};
            }catch{}
          }
          const next=path.dirname(dir);if(next===dir)break;dir=next;
        }
      }catch{}
      return null;
    })();roots.set(candidate,pending);return pending;
  }
  return async(pid:number):Promise<Provenance>=>{
    const current=processes.get(pid);const chain=ancestors(pid,processes);
    const result:Provenance={project:null,parent:chain[0]?{pid:chain[0].pid,name:chain[0].name}:null,ancestors:chain.map(p=>({pid:p.pid,name:p.name})),source:launchSource(chain)};
    if(!current)return result;
    // Limit inherited attribution to the immediate parent; editors and shells
    // can own unrelated projects, so do not scan their installation directories.
    for(const [index,p] of [current,...chain.slice(0,1)].entries()){
      const candidates:string[]=[];
      if(process.platform==='linux'){try{candidates.push(await fs.readlink(`/proc/${p.pid}/cwd`));}catch{}}
      const cwdCount=candidates.length;
      candidates.push(...commandPaths(`${p.command} ${p.params}`).slice(0,16));
      for(const [i,candidate] of candidates.entries()){
        const found=await projectAt(candidate);
        if(found){result.project={...found,evidence:`${index?'Parent':'Process'} ${i<cwdCount?'working directory':'absolute command path'} + ${found.marker}`,inferred:true};return result;}
      }
    }
    return result;
  };
}
