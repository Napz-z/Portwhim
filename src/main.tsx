import './native';
import { clearSearch, resetFilters, hasFilters, identity, inspectLabel, sortListeners, openTarget, stopFeedback, matchesQuery, queryPort, portQuery } from './explorer';
import { ProcessCard } from './ProcessCard';
import { ProcessInspector } from './ProcessInspector';
import { matchesOwnership, systemBadge, canRequestStop } from './process-policy';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowDownUp, ArrowUpRight, Boxes, Check, ChevronRight, CircleAlert, CircleHelp, Copy, Database, Globe, LayoutGrid, List, LoaderCircle, Monitor, Network, Pause, Play, Search, Square, Terminal, X } from 'lucide-react';
import type { Listener, Snapshot } from './shared';
import './style.css';
import './brand.css';
import './upgrades.css';
import { Favorites, readFavorites, type Favorite } from './Favorites';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { changesBetween, type Change } from './activity';
import { DockerPorts } from './DockerPorts';

const memory=(v:number|null)=>v===null?'—':v<1048576?`${(v/1024).toFixed(0)} KB`:`${(v/1048576).toFixed(1)} MB`;
const icon=(l:Listener)=>l.category==='database'?<Database size={18}/>:l.category==='container'?<Boxes size={18}/>:<Terminal size={18}/>;
const SystemBadge=({listener}:{listener:Listener})=>systemBadge(listener)?<span className="system-badge">{systemBadge(listener)}</span>:null;
function App(){
  const [favorites,setFavorites]=useState<Favorite[]>(()=>{try{return readFavorites();}catch{return [];}});
  const [foreground,setForeground]=useState(document.hasFocus());
  useEffect(()=>{const focus=()=>setForeground(true),blur=()=>setForeground(false);window.addEventListener('focus',focus);window.addEventListener('blur',blur);return()=>{window.removeEventListener('focus',focus);window.removeEventListener('blur',blur);};},[]);
  useEffect(()=>{if(!isTauri())return;let disposed=false;let cleanup:(()=>void)|undefined;void listen<{port:number;protocol:string}>('favorite-selected',event=>{setQuery(`:${event.payload.port}`);setProtocol(event.payload.protocol);setFilter('all');setSelected('');void refresh();search.current?.focus();}).then(fn=>{if(disposed)fn();else cleanup=fn;});return()=>{disposed=true;cleanup?.();};},[]);
  const previous=useRef<Snapshot|undefined>(undefined);const [changes,setChanges]=useState<Change[]>([]);
  const [stopResult,setStopResult]=useState<{target:Listener;message:string;at:string}>();
  const [data,setData]=useState<Snapshot>();const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const [paused,setPaused]=useState(false);const [query,setQuery]=useState('');const [filter,setFilter]=useState('all');
  const [view,setView]=useState<'list'|'map'>('list');const [protocol,setProtocol]=useState('all');const [selected,setSelected]=useState('');
  const [toast,setToast]=useState('');const [help,setHelp]=useState(false);const [sort,setSort]=useState<'port'|'memory'>('port');
  const [acting,setActing]=useState(false);const inFlight=useRef(false);const search=useRef<HTMLInputElement>(null);
  async function refresh(){
    if(inFlight.current||!window.portwhim)return;inFlight.current=true;setBusy(true);
    try{const snapshot=await window.portwhim.scan();const before=previous.current;if(before){const changes=changesBetween(before.listeners,snapshot.listeners,snapshot.scannedAt);setChanges(old=>[...changes,...old].slice(0,20));}previous.current=snapshot;setData(snapshot);setError('');return snapshot;}catch(e){setError(String(e));}finally{inFlight.current=false;setBusy(false);}
  }
  useEffect(()=>{void refresh();},[]);
  useEffect(()=>{if(paused||acting)return;const timer=setInterval(()=>void refresh(),foreground?5000:30000);return()=>clearInterval(timer);},[paused,acting,foreground]);
  useEffect(()=>{if(isTauri())void invoke('tray_update',{favorites}).catch(()=>setToast('Tray favorites could not be updated.'));},[favorites,data]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),3500);return()=>clearTimeout(timer);},[toast]);
  useEffect(()=>{const fn=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();search.current?.focus();}if(e.key==='Escape'){setSelected('');setHelp(false);}};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn);},[]);
  const all=data?.listeners||[];const dev=all.filter(l=>matchesOwnership(l,'dev'));
  const matches=all.filter(l=>matchesQuery(l,query));
  const rows=sortListeners(matches.filter(l=>matchesOwnership(l,filter)&&(protocol==='all'||l.protocol===protocol)),sort);
  const searchedPort=queryPort(query);
  const parsedQuery=portQuery(query);
  useEffect(()=>{
    const input=search.current;
    const enter=(e:KeyboardEvent)=>{if(e.key==='Enter'&&!e.isComposing&&rows.length){e.preventDefault();setSelected(identity(rows[0]));}};
    input?.addEventListener('keydown',enter);
    return()=>input?.removeEventListener('keydown',enter);
  },[rows]);
  const row=all.find(l=>identity(l)===selected);
  const filters={query,protocol,filter};
  const applyFilters=(next:typeof filters)=>{setQuery(next.query);setProtocol(next.protocol);setFilter(next.filter);};
  const processes=[...new Map(all.map(l=>[l.pid,l])).values()];
  const knownMemory=processes.filter(l=>l.memory!==null);
  const groups=[...new Map(rows.map(l=>[l.pid,rows.filter(r=>r.pid===l.pid)])).entries()];
  async function confirmStop(l:Listener){
    setStopResult({target:l,message:`Stop sent to ${l.service} · checking ${l.protocol} :${l.port}…`,at:new Date().toISOString()});let latest:Snapshot|undefined;
    for(const wait of [0,250,650,1200]){if(wait)await new Promise(resolve=>setTimeout(resolve,wait));const snapshot=await refresh();latest=snapshot;if(!snapshot)continue;const feedback=stopFeedback(l,snapshot.listeners);if(feedback.complete){setSelected('');setStopResult({target:l,message:feedback.message,at:snapshot.scannedAt});return;}}
    setStopResult({target:l,message:latest?stopFeedback(l,latest.listeners).message:'Stop sent, but the follow-up scan failed. Use Refresh to check the port.',at:latest?.scannedAt||new Date().toISOString()});
  }
  async function action(type:'copy'|'open'|'stop'|'project',l:Listener,field:'pid'|'port'|'projectPath'='port'){
    if(!window.portwhim)return;setActing(true);
    try{
      if(type==='copy'){await window.portwhim.copy(l.id,field);setToast(`${field==='pid'?'PID':field==='projectPath'?'Project path':'Port'} copied`);}
      if(type==='project'){await window.portwhim.openProject(l.id);}
      if(type==='open'){const target=openTarget(l);if(!target.url)throw new Error(target.reason||'Opening is disabled.');await window.portwhim.open(l.id);}
      if(type==='stop'){if(!canRequestStop(l))throw new Error(l.stopReason||'Stopping is disabled for this process.');const result=await window.portwhim.stop(l.id);if(!result.cancelled)await confirmStop(l);}
    }catch(e){const message=String(e).replace(/^Error: /,'');if(type==='stop')setStopResult({target:l,message,at:new Date().toISOString()});else setToast(message);}finally{setActing(false);}
  }
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><img className="brand-logo" src="./brand/mark.svg" alt="Portwhim logo"/><span>portwhim<span className="version">v0.1</span></span></div>
      <div className="workspace"><div className="machine"><Monitor size={19}/></div><div><strong>Local workspace</strong><small>{data?.hostname||'Your computer'}</small></div><span className="dot"/></div>
      <p className="nav-label">PROCESS OWNERSHIP</p>
      <button className={`nav ${filter==='all'?'active':''}`} onClick={()=>setFilter('all')}><Activity size={18}/> All listeners <b>{all.length}</b></button>
      <button className={`nav ${filter==='dev'?'active':''}`} onClick={()=>setFilter('dev')}><Terminal size={18}/> Dev services <b>{dev.length}</b></button>
      <button className={`nav ${filter==='system'?'active':''}`} onClick={()=>setFilter('system')}><Monitor size={18}/> System managed <b>{all.filter(l=>l.systemManaged).length}</b></button>
      <p className="nav-label exposure-label">EXPOSURE</p>
      <button className={`nav ${filter==='network'?'active':''}`} onClick={()=>setFilter('network')}><Globe size={18}/> Network bound <b>{all.filter(l=>l.scope!=='loopback').length}</b></button>
      <div className="side-note"><span className="tiny-line"/><strong>A little clarity.<br/>For your localhost.</strong><p>Find the port.<br/>Meet the process.<br/>Get back to building.</p></div>
      <div className="sidebar-bottom"><span><span className="dot"/> Local only · No telemetry</span><button className="nav" onClick={()=>setHelp(true)}><CircleHelp size={17}/> About & shortcuts</button></div>
    </aside>
    <main>
      <header><span>Workspace <ChevronRight size={14}/> <strong>{filter==='system'?'System managed':filter==='dev'?'Dev services':filter==='network'?'Network bound':'All listeners'}</strong></span><span className="platform"><Monitor size={14}/>{data?.platform==='win32'?'Windows':data?.platform==='darwin'?'macOS':data?.platform||'Desktop'}</span></header>
      <div className="content">
        <div className="heading"><div><div className="eyebrow">YOUR MACHINE, AT A GLANCE</div><h1>Make room for your next idea<span>.</span></h1><p>Every listening port. The process behind it. One quiet place.</p></div><button className="refresh" onClick={()=>void refresh()} disabled={busy||acting||!window.portwhim}><Activity size={16} className={busy?'spin':''}/>{busy?'Scanning…':'Refresh'}</button></div>
        {error&&data&&<div className="notice error" role="alert">Scan failed. Last successful data is retained. {error} <button onClick={()=>void refresh()}>Retry</button></div>}
        {data?.warnings.map(w=><div className="notice" key={w}>{w}</div>)}
        <section className="stats">
          <article><div><span>Listening sockets</span><Network size={17}/></div><strong>{data?all.length:'—'}</strong><small><span className="dot"/> TCP listeners & UDP bindings</small></article>
          <article><div><span>Dev services</span><Terminal size={17}/></div><strong>{data?new Set(dev.map(l=>l.pid)).size:'—'}<em>processes</em></strong><small>Recognized on your machine</small></article>
          <article><div><span>Memory footprint</span><Activity size={17}/></div><strong>{data&&knownMemory.length?memory(knownMemory.reduce((sum,l)=>sum+(l.memory||0),0)):'—'}</strong><small>{knownMemory.length} of {processes.length} processes measured</small></article>
        </section>
        <div className="section-title"><h2>Port explorer <span>{rows.length}</span></h2><div className="live-control"><span className={`dot ${paused?'muted':''}`}/>{paused?'Paused':`Auto-refresh · ${foreground?'5s':'30s (background)'}`}<button title={paused?'Resume auto-refresh':'Pause auto-refresh'} aria-label={paused?'Resume auto-refresh':'Pause auto-refresh'} onClick={()=>setPaused(!paused)}>{paused?<Play size={13}/>:<Pause size={13}/>}</button></div></div>
        <div className="toolbar"><div className="search"><Search size={17}/><input ref={search} placeholder="Find a port, process, service, or project…" aria-label="Search ports" value={query} onChange={e=>setQuery(e.target.value)}/><kbd>Ctrl K</kbd></div><select aria-label="Protocol" value={protocol} onChange={e=>setProtocol(e.target.value)}><option value="all">All protocols</option><option>TCP</option><option>UDP</option></select><button className="sort" onClick={()=>setSort(sort==='port'?'memory':'port')} title="Toggle sort"><ArrowDownUp size={15}/>{sort==='port'?'Port':'Memory'}</button><div className="view-toggle"><button aria-label="List view" className={view==='list'?'chosen':''} onClick={()=>setView('list')}><List size={17}/></button><button aria-label="Process map" className={view==='map'?'chosen':''} onClick={()=>setView('map')}><LayoutGrid size={17}/></button></div></div>
        {query.trim()&&data&&<div className="search-summary" role="status">{matches.length>rows.length?`${matches.length-rows.length} matching sockets hidden by filters. `:searchedPort!==null?`${protocol==='all'?'TCP / UDP':protocol} :${searchedPort} · ${matches.length?'Observed in the latest scan.':'No listener observed in the latest scan; binding availability is not guaranteed.'} `:''}{matches.length>rows.length&&<button onClick={()=>{setFilter('all');setProtocol('all');}}>Show all matches</button>}{rows.length>0&&<span>Enter opens the first result.</span>}</div>}
        <Favorites data={data} onSelect={(port,protocol)=>{setQuery(`:${port}`);setProtocol(protocol);setFilter('all');search.current?.focus();}} onChange={setFavorites}/>
        {parsedQuery.error&&<p className="query-note" role="alert">{parsedQuery.error}</p>}
        {isTauri()&&<div className="search-summary"><button onClick={()=>void invoke('hide_to_tray').catch(e=>setToast(String(e)))}>Hide to tray</button>Background scans every 30s; closing the window quits the app.</div>}
        {(stopResult||changes.length>0)&&<section className="activity-panel" aria-label="Recent activity"><header><h2>Recent activity</h2><button onClick={()=>{setChanges([]);setStopResult(undefined);}}>Dismiss</button></header>
          {stopResult&&<div className="result" role="status"><p><time>{new Date(stopResult.at).toLocaleTimeString()}</time>{stopResult.message}</p><button onClick={()=>{setQuery(`:${stopResult.target.port}`);setProtocol(stopResult.target.protocol);setFilter('all');setSelected('');}}>View current occupants</button> <button disabled={busy||acting} onClick={()=>void refresh()}>Check again</button></div>}
          {changes.length>0&&<details><summary>{changes.length} recent changes · this session</summary><ul>{changes.map((c,i)=><li key={`${c.at}:${c.key}:${i}`}><time>{new Date(c.at).toLocaleTimeString()}</time>{c.message}</li>)}</ul></details>}
        </section>}
        <section className="explorer">
          {!window.portwhim?<div className="empty"><CircleAlert size={28}/><h3>Desktop connection unavailable</h3><p>Open Portwhim through the desktop app to inspect this computer.</p></div>:!data&&busy?<div className="empty"><LoaderCircle className="spin"/><h3>Getting to know your localhost</h3><p>Reading socket and process information…</p></div>:!data&&error?<div className="empty scan-failure" role="alert"><CircleAlert size={28}/><h3>We couldn’t scan this computer</h3><p>No port data has been loaded yet. {error}</p><button onClick={()=>void refresh()}>Try again</button></div>:rows.length===0?<div className="empty"><Search size={28}/><h3>{all.length?'No matching ports':'Nothing listening here yet'}</h3><p>{all.length?'Try another search or clear your filters.':'Start a local development server, then refresh.'}</p>{hasFilters(filters)&&<div className="empty-actions">{query!==''&&<button onClick={()=>applyFilters(clearSearch(filters))}>Clear search</button>}<button onClick={()=>applyFilters(resetFilters())}>Reset all filters</button></div>}</div>:view==='list'?<table><thead><tr><th>SERVICE / PROCESS</th><th>PORT</th><th>ADDRESS</th><th>PROTOCOL</th><th>PID</th><th>MEMORY</th><th aria-label="Actions"/></tr></thead><tbody>{rows.map(l=><tr key={identity(l)} className={selected===identity(l)?'selected':''} tabIndex={0} aria-label={inspectLabel(l)} onKeyDown={e=>{if(e.target===e.currentTarget&&(e.key==='Enter'||e.key===' ')){e.preventDefault();setSelected(identity(l));}}} onClick={e=>{if(!(e.target as HTMLElement).closest('button'))setSelected(identity(l));}}><td><button className="service-button" aria-label={inspectLabel(l)} onClick={()=>setSelected(identity(l))}><span className={`service-icon ${l.category}`}>{icon(l)}</span><span><strong>{l.service}</strong><SystemBadge listener={l}/><small>{l.provenance.project?.name ? `${l.provenance.project.name} · ${l.name}` : l.name}{l.confidence==='port hint'?' · port hint':''}</small></span></button></td><td><button className="port-number" title="Copy port" onClick={e=>{e.stopPropagation();void action('copy',l);}}><span>:</span>{l.port}</button></td><td className="address-cell"><span title={l.address}>{l.address}</span></td><td><span className={`protocol ${l.protocol.toLowerCase()}`}>{l.protocol}</span></td><td><button className="pid" title="Copy PID" onClick={e=>{e.stopPropagation();void action('copy',l,'pid');}}>{l.pid>0?l.pid:'—'}</button></td><td className="mono">{memory(l.memory)}</td><td><button className="icon-button" aria-label={inspectLabel(l)} onClick={()=>setSelected(identity(l))}><ChevronRight size={17}/></button></td></tr>)}</tbody></table>:<div className="process-map"><div className="map-root"><Monitor size={19}/><span>{data?.hostname}</span><small>{groups.length} processes</small></div><div className="map-grid">{groups.map(([pid,ls])=><ProcessCard key={pid+':'+ls[0].started} listeners={ls} select={setSelected} title={<div className="map-card-title"><span className={`service-icon ${ls[0].category}`}>{icon(ls[0])}</span><div><strong>{ls[0].service}</strong><SystemBadge listener={ls[0]}/><small>PID {pid} · {memory(ls[0].memory)}</small></div></div>}/>)}</div><p className="map-caption">Process → bound sockets · Select a socket to inspect</p></div>}
          <footer><span>{rows.length} sockets · {new Set(rows.map(l=>l.pid)).size} processes</span><span>{data?`Updated ${new Date(data.scannedAt).toLocaleTimeString()}`:'Awaiting first scan'}</span></footer>
        </section>
        <DockerPorts port={searchedPort} onSelect={(port,protocol)=>{setQuery(`:${port}`);setProtocol(protocol);setFilter('all');search.current?.focus();}}/>
        <div className="bottom-note"><span><span className="dot"/> Your ports stay on your machine.</span><span>Built for the things you’re building.</span></div>
      </div>
    </main>
    {row&&<ProcessInspector row={row} all={all} selected={selected} acting={acting} close={()=>setSelected('')} select={setSelected} action={action}/>}
    {help&&<div className="modal-shade" onClick={()=>setHelp(false)}><section className="help" role="dialog" aria-modal="true" aria-label="About Portwhim" onClick={e=>e.stopPropagation()}><button className="icon-button close" aria-label="Close about" onClick={()=>setHelp(false)}><X size={18}/></button><Network size={32}/><h2>Small tool. Clearer localhost.</h2><p>Portwhim 0.1.0 reads local socket and process metadata. No account, telemetry, or remote scanning.</p><p><kbd>Ctrl / ⌘ K</kbd> Search · <kbd>Esc</kbd> Close inspector</p><p>UDP entries are bound sockets, not TCP-style listeners. Port hints are suggestions, not verified service identities. Network-bound sockets may not serve HTTP on localhost.</p><p>CPU and memory are per process, shared by all its sockets. Missing OS metadata appears as —. Stop affects the whole process and asks for confirmation.</p></section></div>}
    {toast&&<div className="toast" role="status"><Check size={16}/>{toast}</div>}
  </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
