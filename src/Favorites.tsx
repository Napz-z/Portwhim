import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bookmark, Plus, Pencil, Trash2, Bell } from 'lucide-react';
import type { Snapshot } from './shared';
import { spring, useMotionSettings } from './Motion';

export interface Favorite { port:number; protocol:'TCP'|'UDP'; label:string; watch?:boolean }
export const favoriteKey='portwhim.favorites.v1';
export function readFavorites():Favorite[]{
  const value=JSON.parse(localStorage.getItem(favoriteKey)||'[]');
  if(!Array.isArray(value))throw new Error('Invalid saved favorites');
  return value.filter((f:any)=>f&&Number.isInteger(f.port)&&f.port>0&&f.port<=65535&&['TCP','UDP'].includes(f.protocol)&&typeof f.label==='string').slice(0,32).map((f:any)=>({port:f.port,protocol:f.protocol,label:f.label.slice(0,60),watch:f.watch===true}));
}
export function Favorites({data,onSelect,onChange}:{data?:Snapshot;onSelect:(port:number,protocol:string)=>void;onChange:(favorites:Favorite[])=>void}){
  const { reduced } = useMotionSettings();
  const [watchBusy,setWatchBusy]=useState('');
  const [error,setError]=useState('');
  const [favorites,setFavorites]=useState<Favorite[]>(()=>{try{return readFavorites();}catch{return [];}});
  const [editing,setEditing]=useState(false);
  const addButton=useRef<HTMLButtonElement>(null);
  const closeEditor=()=>{setEditing(false);addButton.current?.focus({preventScroll:true});};
  const [port,setPort]=useState('');const [protocol,setProtocol]=useState<'TCP'|'UDP'>('TCP');const [label,setLabel]=useState('');
  function save(next:Favorite[]){
    try{localStorage.setItem(favoriteKey,JSON.stringify(next));setFavorites(next);onChange(next);setError('');return true;}
    catch{setError('Favorites could not be saved on this computer. Your previous list is unchanged.');return false;}
  }
  async function toggleWatch(f:Favorite){
    if(!window.portwhim?.requestNotificationPermission){setError('Desktop port watching is unavailable. Open the updated desktop app.');return;}
    const key=f.protocol+':'+f.port;setWatchBusy(key);
    try{if(!f.watch&&!await window.portwhim.requestNotificationPermission()){setError('Notifications are disabled. Enable Portwhim in system notification settings and try again.');return;}
      save(favorites.map(value=>value===f?{...value,watch:!f.watch}:value));
    }catch(e){setError('Could not enable port watching: '+String(e));}finally{setWatchBusy('');}
  }
  return <section className="favorites" aria-label="Favorite ports">
    <p className="panel-intro">Keep your everyday ports close. Turn on Watch to hear when a service disappears or changes owner.</p>
    <div className="panel-actions"><span>{favorites.length} of 32 saved</span><motion.button ref={addButton} className="soft-button" whileTap={{scale:.96}} disabled={!!watchBusy} onClick={()=>{if(editing){closeEditor();return;}setEditing(true);setPort('');setLabel('');}} aria-expanded={editing}><Plus size={15}/> Add favorite</motion.button></div>
    <AnimatePresence initial={false}>{editing&&<motion.div className="favorite-editor" initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={reduced?{duration:0}:spring}>
      <form onSubmit={e=>{e.preventDefault();const n=Number(port);if(!Number.isInteger(n)||n<1||n>65535)return;const next=favorites.filter(f=>f.port!==n||f.protocol!==protocol);if(next.length>=32){setError('Remove a favorite before adding another.');return;}if(save([...next,{port:n,protocol,label:label.trim().slice(0,60),watch:favorites.find(f=>f.port===n&&f.protocol===protocol)?.watch||false}]))closeEditor();}}>
        <label>Port<input autoFocus disabled={!!watchBusy} aria-label="Favorite port" type="number" min="1" max="65535" required placeholder="3000" value={port} onChange={e=>setPort(e.target.value)}/></label>
        <label>Protocol<select disabled={!!watchBusy} aria-label="Favorite protocol" value={protocol} onChange={e=>setProtocol(e.target.value as 'TCP'|'UDP')}><option>TCP</option><option>UDP</option></select></label>
        <label className="favorite-name">Name<input disabled={!!watchBusy} aria-label="Favorite label" maxLength={60} placeholder="e.g. Frontend" value={label} onChange={e=>setLabel(e.target.value)}/></label>
        <div className="editor-actions"><button type="button" onClick={closeEditor}>Cancel</button><button className="primary" disabled={!!watchBusy} type="submit">Save favorite</button></div>
      </form>
    </motion.div>}</AnimatePresence>
    {error&&<p role="alert" className="notice">{error}</p>}
    <motion.div layout="position" className="favorite-list">
      {!favorites.length&&!editing&&<div className="panel-empty"><Bookmark size={28}/><h3>Your shortcuts live here</h3><p>Save a port like 3000 to jump straight to its process next time.</p></div>}
      <AnimatePresence initial={false}>{favorites.map(f=>{const count=data?.listeners.filter(l=>l.port===f.port&&l.protocol===f.protocol).length;return <motion.article layout key={`${f.protocol}:${f.port}`} initial={{opacity:0,y:reduced?0:12}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:reduced?1:.96}} transition={reduced?{duration:0}:spring}>
        <button className="favorite-target" onClick={()=>onSelect(f.port,f.protocol)}><span className={'state-dot '+(count?'observed':'')}/><span><strong>{f.label||`Port ${f.port}`}</strong><small>{f.protocol} :{f.port} · {count===undefined?'Awaiting scan':count?'Listening':'Not listening'}</small></span></button>
        <div className="favorite-controls"><span><Bell size={13}/> Watch</span><button className={'watch-switch '+(f.watch?'watching':'')} role="switch" aria-label={'Watch '+f.protocol+' '+f.port} aria-checked={!!f.watch} disabled={!!watchBusy} onClick={()=>void toggleWatch(f)}><motion.span animate={{x:f.watch?16:0}} transition={reduced?{duration:0}:spring}/></button><button className="icon-button" disabled={!!watchBusy} aria-label={`Edit ${f.protocol} ${f.port}`} onClick={()=>{setPort(String(f.port));setProtocol(f.protocol);setLabel(f.label);setEditing(true);}}><Pencil size={14}/></button><button className="icon-button" disabled={!!watchBusy} aria-label={`Remove ${f.protocol} ${f.port}`} onClick={()=>save(favorites.filter(x=>x!==f))}><Trash2 size={14}/></button></div>
      </motion.article>;})}</AnimatePresence>
    </motion.div>
    {favorites.some(f=>f.watch)&&<p className="panel-footnote">Short restarts stay quiet. Keep Portwhim open or in the tray to watch your ports.</p>}
  </section>;
}
