import type { Listener } from './shared';
export interface ExpectedService { root:string; projectName:string; port:number; protocol:'TCP'|'UDP'; label:string }
export interface ProjectGroup { key:string; name:string; directory:string|null; branch:string|null; worktree:boolean; listeners:Listener[]; expected:ExpectedService[] }
export const expectedKey='portwhim.expected-services.v1';
export function directoryKey(directory:string):string {
  return /^[a-z]:[\\/]/i.test(directory)?directory.replace(/\\/g,'/').replace(/\/$/,'').toLowerCase():directory.replace(/\/$/,'');
}
export function projectKey(row:Listener):string|null {
  const project=row.provenance.project;
  return project ? directoryKey(project.git?.root || project.directory) : null;
}
export function validExpected(value:unknown):ExpectedService[] {
  if(!Array.isArray(value))throw new Error('Saved services are invalid.');
  return value.filter((s):s is ExpectedService=>!!s&&typeof s.root==='string'&&s.root.length>0&&typeof s.projectName==='string'&&typeof s.label==='string'&&s.label.length<=60&&Number.isInteger(s.port)&&s.port>0&&s.port<65536&&['TCP','UDP'].includes(s.protocol)).slice(0,64).map(s=>({...s,root:directoryKey(s.root)}));
}
export function groupProjects(rows:Listener[],expected:ExpectedService[]):ProjectGroup[] {
  const groups=new Map<string,ProjectGroup>();
  for(const row of rows){
    const project=row.provenance.project;
    const key=projectKey(row)||`unknown:${row.pid}:${row.started}`;
    const git=project?.git;
    if(!groups.has(key))groups.set(key,{key,name:git?git.root.split(/[\\/]/).filter(Boolean).at(-1)||project!.name:project?.name||row.name,directory:project?.git?.root||project?.directory||null,branch:git?.branch||null,worktree:git?.worktree||false,listeners:[],expected:[]});
    groups.get(key)!.listeners.push(row);
  }
  for(const service of expected){
    if(!groups.has(service.root))groups.set(service.root,{key:service.root,name:service.projectName,directory:service.root,branch:null,worktree:false,listeners:[],expected:[]});
    groups.get(service.root)!.expected.push(service);
  }
  return [...groups.values()].sort((a,b)=>Number(!a.directory)-Number(!b.directory)||a.name.localeCompare(b.name)||a.key.localeCompare(b.key));
}
export function expectedState(service:ExpectedService,all:Listener[]):'observed'|'elsewhere'|'missing'{
  const rows=all.filter(row=>row.port===service.port&&row.protocol===service.protocol);
  return rows.some(row=>projectKey(row)===service.root)?'observed':rows.length?'elsewhere':'missing';
}
