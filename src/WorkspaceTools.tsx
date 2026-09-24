import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bookmark, Bell, History, PanelBottomClose, Check, ArrowUpRight } from 'lucide-react';
import { Favorites, type Favorite } from './Favorites';
import { MotionPresence } from './MotionPresence';
import { Overlay } from './Overlay';
import type { Listener, Snapshot, WatchStatus } from './shared';
import type { Change } from './activity';
type StopResult = {target:Listener;message:string;at:string};
export function WorkspaceTools({data,favorites,onChange,onSelect,watch,watchError,changes,stopResult,dismiss,refresh,busy,hideToTray}:{data?:Snapshot;favorites:Favorite[];onChange:(items:Favorite[])=>void;onSelect:(port:number,protocol:string)=>void;watch:WatchStatus;watchError:string;changes:Change[];stopResult?:StopResult;dismiss:()=>void;refresh:()=>void;busy:boolean;hideToTray?:()=>void}) {
  const [panel,setPanel]=useState<'favorites'|'activity'|null>(null);
  const [dismissedAlerts,setDismissedAlerts]=useState<Set<string>>(new Set());
  const alerts=watch.alerts.filter(a=>!dismissedAlerts.has(a.at+':'+a.port+':'+a.protocol));
  const watching=favorites.filter(f=>f.watch).length;
  const problem=watchError||watch.error||watch.notificationError;
  const select=(port:number,protocol:string)=>{onSelect(port,protocol);setPanel(null);};
  return <>
    <div className="workspace-tools" aria-label="Workspace tools">
      <motion.button whileTap={{scale:.96}} className="tool-button" onClick={()=>setPanel('favorites')} aria-haspopup="dialog"><Bookmark size={15}/> Favorites {favorites.length>0&&<span className="tool-count">{favorites.length}</span>}</motion.button>
      {watching>0&&<button className="watch-summary" onClick={()=>setPanel('activity')} title={watch.scannedAt?'Last checked '+new Date(watch.scannedAt).toLocaleTimeString():'Establishing a baseline'}><span className="dot"/>{watching} watching</button>}
      <span className="tools-spacer"/>
      <motion.button whileTap={{scale:.96}} className={'tool-button '+(alerts.length||problem?'has-alert':'')} onClick={()=>setPanel('activity')} aria-haspopup="dialog">{alerts.length||problem?<Bell size={15}/>:<History size={15}/>} Activity {(alerts.length+changes.length)>0&&<span className="tool-count">{alerts.length+changes.length}</span>}{problem&&<span className="error-dot"/>}</motion.button>
      {hideToTray&&<button className="tray-button icon-button" aria-label="Hide to tray" title="Keep watching in the tray. Closing the window quits Portwhim." onClick={hideToTray}><PanelBottomClose size={16}/></button>}
    </div>
    {stopResult&&<button className="stop-summary" aria-live="polite" onClick={()=>setPanel('activity')}><Check size={14}/><span>{stopResult.message}</span><ArrowUpRight size={14}/></button>}
    <MotionPresence show={!!panel}>{panel&&<Overlay title={panel==='favorites'?'Favorites':'Activity'} sheet close={()=>setPanel(null)}>
      {panel==='favorites'?<Favorites data={data} onSelect={select} onChange={onChange}/>:<section className="activity-feed" aria-label="Recent activity">
        <p className="panel-intro">Service changes and watch alerts from this session.</p>
        {problem&&<p className="notice" role="alert">{problem}</p>}
        {watching>0&&<p className="watch-health"><span className="dot"/>{watch.scannedAt?'Watching '+watching+' ports · checked '+new Date(watch.scannedAt).toLocaleTimeString():'Preparing your first watch scan…'}</p>}
        {(changes.length>0||alerts.length>0||stopResult)&&<div className="panel-actions"><span>{alerts.length} watch alerts · {changes.length} changes</span><button className="soft-button" onClick={()=>{dismiss();setDismissedAlerts(new Set(watch.alerts.map(a=>a.at+':'+a.port+':'+a.protocol)));}}>Clear activity</button></div>}
        {stopResult&&<div className="stop-detail" role="status"><strong>Last stop request</strong><p>{stopResult.message}</p><div><button onClick={()=>select(stopResult.target.port,stopResult.target.protocol)}>View port <ArrowUpRight size={13}/></button><button disabled={busy} onClick={refresh}>Check again</button></div></div>}
        {alerts.map((alert,index)=><article className="timeline-item watch-event" key={alert.at+':'+index}><Bell size={15}/><div><time>{new Date(alert.at).toLocaleTimeString()}</time><button onClick={()=>select(alert.port,alert.protocol)}>{alert.message}</button></div></article>)}
        {changes.map((change,index)=><article className="timeline-item" key={change.at+':'+change.key+':'+index}><History size={15}/><div><time>{new Date(change.at).toLocaleTimeString()}</time><p>{change.message}</p></div></article>)}
        {!changes.length&&!alerts.length&&!stopResult&&<div className="panel-empty"><History size={28}/><h3>All quiet for now</h3><p>New listeners, stopped services and watch alerts will appear here.</p></div>}
        {watching>0&&<p className="panel-footnote">Watch runs every 5 seconds, even when the explorer is paused. Desktop alerts follow your system notification settings.</p>}
      </section>}
    </Overlay>}</MotionPresence>
  </>;
}
