import React, { useState } from 'react';
import type { Snapshot } from './shared';

export interface Favorite { port:number; protocol:'TCP'|'UDP'; label:string; watch?:boolean }
export const favoriteKey='portwhim.favorites.v1';
export function readFavorites():Favorite[]{
  const value=JSON.parse(localStorage.getItem(favoriteKey)||'[]');
  if(!Array.isArray(value))throw new Error('Invalid saved favorites');
  return value.filter((f:any)=>f&&Number.isInteger(f.port)&&f.port>0&&f.port<=65535&&['TCP','UDP'].includes(f.protocol)&&typeof f.label==='string').slice(0,32).map((f:any)=>({port:f.port,protocol:f.protocol,label:f.label.slice(0,60),watch:f.watch===true}));
}
export function Favorites({data,onSelect,onChange}:{data?:Snapshot;onSelect:(port:number,protocol:string)=>void;onChange:(favorites:Favorite[])=>void}){
  const [watchBusy,setWatchBusy]=useState('');
  const [error,setError]=useState('');
  const [favorites,setFavorites]=useState<Favorite[]>(()=>{try{return readFavorites();}catch{return [];}});
  const [port,setPort]=useState('');const [protocol,setProtocol]=useState<'TCP'|'UDP'>('TCP');const [label,setLabel]=useState('');
  function save(next:Favorite[]){
    try{localStorage.setItem(favoriteKey,JSON.stringify(next));setFavorites(next);onChange(next);setError('');}
    catch{setError('Favorites could not be saved on this computer. Your previous list is unchanged.');}
  }
  async function toggleWatch(f:Favorite){
    if(!window.portwhim?.requestNotificationPermission){setError('Desktop port watching is unavailable. Open the updated desktop app.');return;}
    const key=f.protocol+':'+f.port;setWatchBusy(key);
    try{if(!f.watch&&!await window.portwhim.requestNotificationPermission()){setError('Notifications are disabled. Enable Portwhim in system notification settings and try again.');return;}
      save(favorites.map(value=>value===f?{...value,watch:!f.watch}:value));
    }catch(e){setError('Could not enable port watching: '+String(e));}finally{setWatchBusy('');}
  }
  return <section className="favorites" aria-label="Favorite ports"><h2>Favorite ports <small>Saved on this computer · up to 32</small></h2>
    <form onSubmit={e=>{e.preventDefault();const n=Number(port);if(!Number.isInteger(n)||n<1||n>65535)return;const next=favorites.filter(f=>f.port!==n||f.protocol!==protocol);if(next.length>=32){setError('Remove a favorite before adding another.');return;}save([...next,{port:n,protocol,label:label.trim().slice(0,60),watch:favorites.find(f=>f.port===n&&f.protocol===protocol)?.watch||false}]);}}>
      <input disabled={!!watchBusy} aria-label="Favorite port" type="number" min="1" max="65535" required placeholder="3000" value={port} onChange={e=>setPort(e.target.value)}/>
      <select disabled={!!watchBusy} aria-label="Favorite protocol" value={protocol} onChange={e=>setProtocol(e.target.value as 'TCP'|'UDP')}><option>TCP</option><option>UDP</option></select>
      <input disabled={!!watchBusy} aria-label="Favorite label" maxLength={60} placeholder="Name, e.g. Frontend" value={label} onChange={e=>setLabel(e.target.value)}/>
      <button disabled={!!watchBusy} type="submit">Save favorite</button>
    </form>
    {error&&<p role="alert">{error}</p>}
    <p className="watch-note">Watch alerts you when a port disappears or its observed owner changes. Short restarts stay quiet; keep Portwhim open.</p>
    <div className="favorite-list">{favorites.map(f=>{const count=data?.listeners.filter(l=>l.port===f.port&&l.protocol===f.protocol).length;return <article key={`${f.protocol}:${f.port}`}>
      <button onClick={()=>onSelect(f.port,f.protocol)}><strong>{f.label||`Port ${f.port}`}</strong><small>{f.protocol} :{f.port} · {count===undefined?'Awaiting scan':count?`${count} bindings`:'No listener observed'}</small></button>
      <button className={'watch-toggle '+(f.watch?'watching':'')} aria-label={'Watch '+f.protocol+' '+f.port} aria-pressed={!!f.watch} disabled={!!watchBusy} onClick={()=>void toggleWatch(f)}>{watchBusy===f.protocol+':'+f.port?'Enabling…':f.watch?'Watching':'Watch'}</button>
      <button disabled={!!watchBusy} aria-label={`Edit ${f.protocol} ${f.port}`} onClick={()=>{setPort(String(f.port));setProtocol(f.protocol);setLabel(f.label);}}>Edit</button>
      <button disabled={!!watchBusy} aria-label={`Remove ${f.protocol} ${f.port}`} onClick={()=>save(favorites.filter(x=>x!==f))}>×</button>
    </article>;})}</div>
  </section>;
}
