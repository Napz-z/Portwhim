import React, { useRef, useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import type { HealthReport, Listener } from './shared';
export function HealthCheck({row}:{row:Listener}){
  const [scheme,setScheme]=useState<'http'|'https'>([443,8443].includes(row.port)?'https':'http');
  const [busy,setBusy]=useState(false);const [result,setResult]=useState<HealthReport>();const [error,setError]=useState('');
  const alive=useRef(true);useEffect(()=>()=>{alive.current=false;},[]);
  const eligible=row.protocol==='TCP'&&(row.scope==='loopback'||row.scope==='all interfaces');
  async function check(){if(!window.portwhim?.checkHealth)return;setBusy(true);setError('');setResult(undefined);try{const response=await window.portwhim.checkHealth(row.id,scheme);if(alive.current)setResult(response);}catch(e){if(alive.current)setError(String(e));}finally{if(alive.current)setBusy(false);}}
  return <section className="inspector-section health-check"><h3>Connection check</h3><p>Manually check TCP connectivity and an HTTP HEAD response from localhost.</p>
    <div className="check-controls"><select aria-label="Check protocol" value={scheme} disabled={busy} onChange={e=>{setScheme(e.target.value as 'http'|'https');setResult(undefined);setError('');}}><option value="http">HTTP</option><option value="https">HTTPS</option></select><button className="secondary" disabled={busy||!eligible||!window.portwhim?.checkHealth} onClick={()=>void check()}><Activity size={14} className={busy?'spin':''}/>{busy?'Checking…':'Check response'}</button></div>
    {!eligible&&<p>Available for TCP bindings reachable through localhost.</p>}
    {error&&<p role="alert">{error}</p>}
    {result&&<div className="health-result" role="status"><strong>{result.status!==null?`HTTP ${result.status}`:result.connected?'TCP connected · HTTP unavailable':'Connection failed'}</strong><small>{result.elapsedMs} ms · {new Date(result.checkedAt).toLocaleTimeString()}</small><code>{result.url}</code><p>{result.message}</p></div>}
    <details className="check-explanation"><summary>What this checks</summary><p>Checks the selected endpoint at this moment. No redirects, proxy, response body or automatic polling. HTTPS certificate validation stays enabled.</p></details>
  </section>;
}
