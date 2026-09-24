import { AnimatePresence, motion } from 'motion/react';
import { spring, useMotionSettings } from './Motion';
import React, { useState } from 'react';
import { Folder, GitBranch, Plus, ChevronDown } from 'lucide-react';
import type { Listener } from './shared';
import { identity } from './explorer';
import { expectedKey, expectedState, projectKey, groupProjects, validExpected, type ExpectedService } from './projects';
export function Projects({rows,all,select,filtered}:{rows:Listener[];all:Listener[];select:(id:string)=>void;filtered:boolean}){
  const { reduced } = useMotionSettings();
  const [error,setError]=useState('');
  const [expected,setExpected]=useState<ExpectedService[]>(()=>{try{return validExpected(JSON.parse(localStorage.getItem(expectedKey)||'[]'));}catch{return [];}});
  const [editing,setEditing]=useState('');const [port,setPort]=useState('');const [protocol,setProtocol]=useState<'TCP'|'UDP'>('TCP');const [label,setLabel]=useState('');
  const [collapsed,setCollapsed]=useState<Set<string>>(new Set());
  const visibleRoots=new Set(rows.map(projectKey));
  const groups=groupProjects(rows,filtered?expected.filter(s=>visibleRoots.has(s.root)):expected);
  function save(next:ExpectedService[]){try{localStorage.setItem(expectedKey,JSON.stringify(next));setExpected(next);setError('');return true;}catch{setError('Expected services could not be saved on this computer.');return false;}}
  return <div className="projects-view"><p className="view-caption">Services grouped by project directory. Separate worktrees stay separate. Ownership is inferred; listening does not establish health.</p>
    {error&&<p role="alert" className="query-note">{error}</p>}
    {groups.length===0&&<div className="empty"><Folder/><h3>No projects in this view</h3><p>Start a development server or clear your filters.</p></div>}
    <div className="project-grid"><AnimatePresence initial={false}>{groups.map((group,index)=>{
      const closed=collapsed.has(group.key);const sectionId=`project-services-${index}`;
      const sockets=[...new Map(group.listeners.map(row=>[`${row.protocol}:${row.port}`,row])).values()];
      const missing=group.expected.filter(s=>expectedState(s,all)!=='observed').length;
      return <motion.article layout="position" initial={{opacity:0,y:reduced?0:16}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:reduced?1:.97}} transition={reduced?{duration:0}:spring} className="project-card" key={group.key}>
        <button className="project-heading" aria-expanded={!closed} aria-controls={sectionId} onClick={()=>setCollapsed(old=>{const next=new Set(old);next.has(group.key)?next.delete(group.key):next.add(group.key);return next;})}>
          <Folder size={20}/><span><strong>{group.name}</strong><small>{group.directory?'Project':'Unattributed process'} · {sockets.length} observed services{missing?` · ${missing} expected not found`:''}</small></span><ChevronDown size={16} className={closed?'chevron closed':'chevron'}/>
        </button>
        <p className="project-path" title={group.directory||undefined}>{group.directory||'Project directory unavailable'}</p>
        {group.branch&&<p className="branch-label"><GitBranch size={13}/>{group.branch}{group.worktree&&<span>Worktree</span>}</p>}
        <motion.div className="project-expansion" initial={false} animate={{height:closed?0:"auto",opacity:closed?0:1}} transition={reduced?{duration:0}:spring} id={sectionId} inert={closed}><div>
          <div className="project-services">{sockets.map(row=><button key={`${row.protocol}:${row.port}`} onClick={()=>select(identity(row))}><span className="dot"/><strong>:{row.port}</strong><span>{row.service}</span><small>{row.protocol}</small></button>)}</div>
          {group.expected.length>0&&<ul className="expected-list">{group.expected.map(service=>{const state=expectedState(service,all);return <li key={`${service.protocol}:${service.port}`}><span className={`state-dot ${state}`}/><span><strong>{service.label||'Expected service'} · :{service.port}</strong><small>{service.protocol} · {state==='observed'?'Listener observed':state==='elsewhere'?'Port occupied; not attributed to this project':'No listener observed'}</small></span><button aria-label={`Remove expected ${service.protocol} ${service.port}`} onClick={()=>save(expected.filter(s=>!(s.root===service.root&&s.port===service.port&&s.protocol===service.protocol)))}>Remove</button></li>;})}</ul>}
          {group.directory&&<button className="add-service" aria-expanded={editing===group.key} onClick={()=>{setEditing(editing===group.key?'':group.key);setPort('');setLabel('');}}><Plus size={14}/> Expected service</button>}
          {editing===group.key&&<form className="expected-form" onSubmit={e=>{e.preventDefault();const number=Number(port);if(!Number.isInteger(number)||number<1||number>65535)return;const next=expected.filter(s=>!(s.root===group.key&&s.port===number&&s.protocol===protocol));if(next.length>=64){setError('Remove an expected service before adding another (64 maximum).');return;}if(save([...next,{root:group.key,projectName:group.name,port:number,protocol,label:label.trim()}]))setEditing('');}}>
            <input aria-label={`Expected port for ${group.name}`} type="number" min="1" max="65535" required placeholder="Port" value={port} onChange={e=>setPort(e.target.value)}/>
            <select aria-label="Expected service protocol" value={protocol} onChange={e=>setProtocol(e.target.value as 'TCP'|'UDP')}><option>TCP</option><option>UDP</option></select>
            <input aria-label="Expected service name" maxLength={60} placeholder="e.g. Backend" value={label} onChange={e=>setLabel(e.target.value)}/><button>Save</button>
          </form>}
        </div></motion.div>
      </motion.article>;
    })}</AnimatePresence></div>
  </div>;
}
