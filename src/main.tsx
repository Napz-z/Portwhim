import './native';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowDownUp, ArrowUpRight, Boxes, Check, ChevronRight, CircleHelp, Copy, Database, Globe, LayoutGrid, List, LoaderCircle, Monitor, Network, Pause, Play, Search, Square, Terminal, X } from 'lucide-react';
import type { Listener, Snapshot } from './shared';
import './style.css';
import './brand.css';

const memory=(v:number|null)=>v===null?'—':v<1048576?`${(v/1024).toFixed(0)} KB`:`${(v/1048576).toFixed(1)} MB`;
const cpu=(v:number|null)=>v===null?'—':`${v.toFixed(1)}%`;
const time=(v:string|null)=>v?new Date(v).toLocaleString():'Unavailable';
const identity=(l:Listener)=>`${l.pid}:${l.protocol}:${l.address}:${l.port}`;
const icon=(l:Listener)=>l.category==='database'?<Database size={18}/>:l.category==='container'?<Boxes size={18}/>:<Terminal size={18}/>;
function App(){
  const [data,setData]=useState<Snapshot>();const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const [paused,setPaused]=useState(false);const [query,setQuery]=useState('');const [filter,setFilter]=useState('all');
  const [view,setView]=useState<'list'|'map'>('list');const [protocol,setProtocol]=useState('all');const [selected,setSelected]=useState('');
  const [toast,setToast]=useState('');const [help,setHelp]=useState(false);const [sort,setSort]=useState<'port'|'memory'>('port');
  const [acting,setActing]=useState(false);const inFlight=useRef(false);const search=useRef<HTMLInputElement>(null);
  async function refresh(){
    if(inFlight.current||!window.portwhim)return;inFlight.current=true;setBusy(true);
    try{setData(await window.portwhim.scan());setError('');}catch(e){setError(String(e));}finally{inFlight.current=false;setBusy(false);}
  }
  useEffect(()=>{void refresh();},[]);
  useEffect(()=>{if(paused||acting)return;const timer=setInterval(()=>void refresh(),5000);return()=>clearInterval(timer);},[paused,acting]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),3500);return()=>clearTimeout(timer);},[toast]);
  useEffect(()=>{const fn=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();search.current?.focus();}if(e.key==='Escape'){setSelected('');setHelp(false);}};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn);},[]);
  const all=data?.listeners||[];const dev=all.filter(l=>l.category!=='system');
  const rows=all.filter(l=>(filter==='all'||filter==='dev'&&l.category!=='system'||filter==='network'&&l.scope!=='loopback')&&(protocol==='all'||l.protocol===protocol)&&`${l.port} ${l.pid} ${l.name} ${l.service} ${l.address} ${l.provenance.project?.name||""} ${l.provenance.project?.directory||""}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>sort==='port'?a.port-b.port:(b.memory??-1)-(a.memory??-1));
  const row=all.find(l=>identity(l)===selected);
  const processes=[...new Map(all.map(l=>[l.pid,l])).values()];
  const knownMemory=processes.filter(l=>l.memory!==null);
  const groups=[...new Map(rows.map(l=>[l.pid,rows.filter(r=>r.pid===l.pid)])).entries()];
  async function action(type:'copy'|'open'|'stop',l:Listener,field:'pid'|'port'='port'){
    if(!window.portwhim)return;setActing(true);
    try{
      if(type==='copy'){await window.portwhim.copy(l.id,field);setToast(`${field==='pid'?'PID':'Port'} copied`);}
      if(type==='open')await window.portwhim.open(l.id);
      if(type==='stop'){const result=await window.portwhim.stop(l.id);if(!result.cancelled){setToast(result.message||'Stop requested');await refresh();}}
    }catch(e){setToast(String(e).replace(/^Error: /,''));}finally{setActing(false);}
  }
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><img className="brand-logo" src="./brand/mark.svg" alt="Portwhim logo"/><span>portwhim<span className="version">v0.1</span></span></div>
      <div className="workspace"><div className="machine"><Monitor size={19}/></div><div><strong>Local workspace</strong><small>{data?.hostname||'Your computer'}</small></div><span className="dot"/></div>
      <p className="nav-label">WORKSPACE</p>
      <button className={`nav ${filter==='all'?'active':''}`} onClick={()=>setFilter('all')}><Activity size={18}/> All listeners <b>{all.length}</b></button>
      <button className={`nav ${filter==='dev'?'active':''}`} onClick={()=>setFilter('dev')}><Terminal size={18}/> Dev services <b>{dev.length}</b></button>
      <button className={`nav ${filter==='network'?'active':''}`} onClick={()=>setFilter('network')}><Globe size={18}/> Network bound <b>{all.filter(l=>l.scope!=='loopback').length}</b></button>
      <div className="side-note"><span className="tiny-line"/><strong>A little clarity.<br/>For your localhost.</strong><p>Find the port.<br/>Meet the process.<br/>Get back to building.</p></div>
      <div className="sidebar-bottom"><span><span className="dot"/> Local only · No telemetry</span><button className="nav" onClick={()=>setHelp(true)}><CircleHelp size={17}/> About & shortcuts</button></div>
    </aside>
    <main>
      <header><span>Workspace <ChevronRight size={14}/> <strong>{filter==='dev'?'Dev services':filter==='network'?'Network bound':'All listeners'}</strong></span><span className="platform"><Monitor size={14}/>{data?.platform==='win32'?'Windows':data?.platform==='darwin'?'macOS':data?.platform||'Desktop'}</span></header>
      <div className="content">
        <div className="heading"><div><div className="eyebrow">YOUR MACHINE, AT A GLANCE</div><h1>Make room for your next idea<span>.</span></h1><p>Every listening port. The process behind it. One quiet place.</p></div><button className="refresh" onClick={()=>void refresh()} disabled={busy||acting||!window.portwhim}><Activity size={16} className={busy?'spin':''}/>{busy?'Scanning…':'Refresh'}</button></div>
        {!window.portwhim&&<div className="notice">Desktop connection unavailable. Run Portwhim with <code>pnpm dev</code> or <code>pnpm start</code> to inspect this computer.</div>}
        {error&&<div className="notice error" role="alert">Scan failed. Last successful data is retained. {error} <button onClick={()=>void refresh()}>Retry</button></div>}
        {data?.warnings.map(w=><div className="notice" key={w}>{w}</div>)}
        <section className="stats">
          <article><div><span>Listening sockets</span><Network size={17}/></div><strong>{data?all.length:'—'}</strong><small><span className="dot"/> TCP listeners & UDP bindings</small></article>
          <article><div><span>Dev services</span><Terminal size={17}/></div><strong>{data?new Set(dev.map(l=>l.pid)).size:'—'}<em>processes</em></strong><small>Recognized on your machine</small></article>
          <article><div><span>Memory footprint</span><Activity size={17}/></div><strong>{data&&knownMemory.length?memory(knownMemory.reduce((sum,l)=>sum+(l.memory||0),0)):'—'}</strong><small>{knownMemory.length} of {processes.length} processes measured</small></article>
        </section>
        <div className="section-title"><h2>Port explorer <span>{rows.length}</span></h2><div className="live-control"><span className={`dot ${paused?'muted':''}`}/>{paused?'Paused':'Auto-refresh · 5s'}<button title={paused?'Resume auto-refresh':'Pause auto-refresh'} aria-label={paused?'Resume auto-refresh':'Pause auto-refresh'} onClick={()=>setPaused(!paused)}>{paused?<Play size={13}/>:<Pause size={13}/>}</button></div></div>
        <div className="toolbar"><div className="search"><Search size={17}/><input ref={search} placeholder="Find a port, process, service, or project…" aria-label="Search ports" value={query} onChange={e=>setQuery(e.target.value)}/><kbd>Ctrl K</kbd></div><select aria-label="Protocol" value={protocol} onChange={e=>setProtocol(e.target.value)}><option value="all">All protocols</option><option>TCP</option><option>UDP</option></select><button className="sort" onClick={()=>setSort(sort==='port'?'memory':'port')} title="Toggle sort"><ArrowDownUp size={15}/>{sort==='port'?'Port':'Memory'}</button><div className="view-toggle"><button aria-label="List view" className={view==='list'?'chosen':''} onClick={()=>setView('list')}><List size={17}/></button><button aria-label="Process map" className={view==='map'?'chosen':''} onClick={()=>setView('map')}><LayoutGrid size={17}/></button></div></div>
        <section className="explorer">
          {!data&&busy?<div className="empty"><LoaderCircle className="spin"/><h3>Getting to know your localhost</h3><p>Reading socket and process information…</p></div>:rows.length===0?<div className="empty"><Search size={28}/><h3>{all.length?'No matching ports':'Nothing listening here yet'}</h3><p>{all.length?'Try another search or clear your filters.':'Start a local development server, then refresh.'}</p>{all.length>0&&<button onClick={()=>{setQuery('');setFilter('all');setProtocol('all');}}>Clear filters</button>}</div>:view==='list'?<table><thead><tr><th>SERVICE / PROCESS</th><th>PORT</th><th>PROTOCOL</th><th>PID</th><th>MEMORY</th><th aria-label="Actions"/></tr></thead><tbody>{rows.map(l=><tr key={identity(l)} className={selected===identity(l)?'selected':''} onClick={()=>setSelected(identity(l))}><td><button className="service-button" onClick={()=>setSelected(identity(l))}><span className={`service-icon ${l.category}`}>{icon(l)}</span><span><strong>{l.service}</strong><small>{l.provenance.project?.name ? `${l.provenance.project.name} · ${l.name}` : l.name}{l.confidence==='port hint'?' · port hint':''}</small></span></button></td><td><button className="port-number" title="Copy port" onClick={e=>{e.stopPropagation();void action('copy',l);}}><span>:</span>{l.port}</button><small className="scope">{l.scope==='loopback'?'localhost':l.address}</small></td><td><span className={`protocol ${l.protocol.toLowerCase()}`}>{l.protocol}</span></td><td><button className="pid" title="Copy PID" onClick={e=>{e.stopPropagation();void action('copy',l,'pid');}}>{l.pid>0?l.pid:'—'}</button></td><td className="mono">{memory(l.memory)}</td><td><button className="icon-button" aria-label={`Inspect port ${l.port}`} onClick={()=>setSelected(identity(l))}><ChevronRight size={17}/></button></td></tr>)}</tbody></table>:<div className="process-map"><div className="map-root"><Monitor size={19}/><span>{data?.hostname}</span><small>{groups.length} processes</small></div><div className="map-grid">{groups.map(([pid,ls])=><article className="map-card" key={pid}><div className="map-card-title"><span className={`service-icon ${ls[0].category}`}>{icon(ls[0])}</span><div><strong>{ls[0].service}</strong><small>PID {pid} · {memory(ls[0].memory)}</small></div></div><div className="socket-branches">{ls.map(l=><button key={identity(l)} onClick={()=>setSelected(identity(l))}><span className="dot"/><strong>:{l.port}</strong><small>{l.protocol}</small><ArrowUpRight size={13}/></button>)}</div></article>)}</div><p className="map-caption">Process → bound sockets · Select a socket to inspect</p></div>}
          <footer><span>{rows.length} sockets · {new Set(rows.map(l=>l.pid)).size} processes</span><span>{data?`Updated ${new Date(data.scannedAt).toLocaleTimeString()}`:'Awaiting first scan'}</span></footer>
        </section>
        <div className="bottom-note"><span><span className="dot"/> Your ports stay on your machine.</span><span>Built for the things you’re building.</span></div>
      </div>
    </main>
    {row&&<><div className="drawer-shade" onClick={()=>setSelected('')}/><aside className="drawer" aria-label="Process details"><div className="drawer-top"><span>PROCESS INSPECTOR</span><button className="icon-button" aria-label="Close details" onClick={()=>setSelected('')}><X size={19}/></button></div><span className={`service-icon large ${row.category}`}>{icon(row)}</span><h2>{row.service}</h2><p className="detail-sub">{row.name} <span className="protocol">{row.protocol}</span></p><div className="detail-port">:{row.port}<button className="icon-button" title="Copy port" onClick={()=>void action('copy',row)}><Copy size={17}/></button></div><div className="detail-actions"><button className="primary" disabled={acting||row.protocol!=='TCP'} onClick={()=>void action('open',row)}>Open localhost <ArrowUpRight size={16}/></button><button className="secondary" onClick={()=>void action('copy',row,'pid')}><Copy size={15}/> PID</button></div><section className="provenance"><h3>Project & launch origin</h3><dl><div><dt>Project (inferred)</dt><dd>{row.provenance.project?.name||'Unknown'}</dd></div><div><dt>Project directory</dt><dd>{row.provenance.project?.directory||'Unavailable'}</dd></div><div><dt>Evidence</dt><dd>{row.provenance.project?.evidence||'No accessible project marker found in available paths.'}</dd></div><div><dt>Launch source</dt><dd>{row.provenance.source||'Unknown'}</dd></div><div><dt>Parent process</dt><dd>{row.provenance.parent?row.provenance.parent.name+' · PID '+row.provenance.parent.pid:'Unavailable or exited'}</dd></div></dl>{row.provenance.ancestors.length>0&&<><h3>Parent chain · nearest first</h3><ol>{row.provenance.ancestors.map(p=><li key={p.pid}>{p.name} <small>PID {p.pid}</small></li>)}</ol></>}<p>Project ownership is inferred from local paths. Launch source describes observed ancestors, not a complete launch history.</p></section><dl>{[['Process ID',row.pid],['Bind address',row.address],['Scope',row.scope],['Started',time(row.started)],['CPU',cpu(row.cpu)],['Memory (RSS)',memory(row.memory)],['Recognition',row.confidence==='process'?'Process / command signature':row.confidence==='port hint'?'Port hint · not verified':'No known signature']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="related"><h3>Other sockets in this process</h3><div>{all.filter(l=>l.pid===row.pid&&identity(l)!==identity(row)).map(l=><button key={identity(l)} onClick={()=>setSelected(identity(l))}>:{l.port} <small>{l.protocol}</small></button>)}{all.filter(l=>l.pid===row.pid).length===1&&<p>No other sockets.</p>}</div></div><div className="stop-area"><p>Stopping a process closes all of its ports.</p><button className="danger" disabled={!row.canStop||acting} onClick={()=>void action('stop',row)}><Square size={14}/> Stop process</button>{!row.canStop&&<small>{row.stopReason||'无法核实进程身份，暂不可停止。'}</small>}</div></aside></>}
    {help&&<div className="modal-shade" onClick={()=>setHelp(false)}><section className="help" role="dialog" aria-modal="true" aria-label="About Portwhim" onClick={e=>e.stopPropagation()}><button className="icon-button close" aria-label="Close about" onClick={()=>setHelp(false)}><X size={18}/></button><Network size={32}/><h2>Small tool. Clearer localhost.</h2><p>Portwhim 0.1.0 reads local socket and process metadata. No account, telemetry, or remote scanning.</p><p><kbd>Ctrl / ⌘ K</kbd> Search · <kbd>Esc</kbd> Close inspector</p><p>UDP entries are bound sockets, not TCP-style listeners. Port hints are suggestions, not verified service identities. Network-bound sockets may not serve HTTP on localhost.</p><p>CPU and memory are per process, shared by all its sockets. Missing OS metadata appears as —. Stop affects the whole process and asks for confirmation.</p></section></div>}
    {toast&&<div className="toast" role="status"><Check size={16}/>{toast}</div>}
  </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);

