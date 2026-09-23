import React,{useState} from 'react';
import {invoke,isTauri} from '@tauri-apps/api/core';
interface Mapping{name:string;project:string|null;address:string;hostPort:number;containerPort:number;protocol:string}
export function DockerPorts({port,onSelect}:{port:number|null;onSelect:(port:number,protocol:string)=>void}){
 const [rows,setRows]=useState<Mapping[]>();const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [at,setAt]=useState('');
 async function scan(){setBusy(true);try{setRows(await invoke<Mapping[]>('docker_ports'));setAt(new Date().toLocaleTimeString());setError('');}catch(e){setError(String(e));}finally{setBusy(false);}}
 const visible=rows?.filter(r=>port===null||r.hostPort===port);
 return <section className="activity-panel" aria-label="Docker published ports"><header><h2>Docker published ports</h2><button disabled={busy||!isTauri()} onClick={()=>void scan()}>{busy?'Inspecting…':'Inspect local Docker'}</button></header>
 <p>Read-only container mappings from the local Docker engine. {at&&`Last checked ${at}.`}</p>
 {error&&<p role="alert">{error}{rows&&' Previous results are retained.'}</p>}
 {visible?.length===0&&<p>{port===null?'No published container ports found.':`No published mapping for :${port} in this Docker snapshot.`}</p>}
 {visible&&visible.length>0&&<ul>{visible.map((r,i)=><li key={i}><button onClick={()=>onSelect(r.hostPort,r.protocol)}>{r.protocol} {r.address}:{r.hostPort} → :{r.containerPort}</button> {r.name}{r.project&&` · Compose: ${r.project}`}</li>)}</ul>}
 </section>;
}
