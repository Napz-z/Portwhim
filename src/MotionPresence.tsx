import React, { useEffect, useRef, useState } from 'react';
export function MotionPresence({show,children}:{show:boolean;children:React.ReactNode}){
  const [mounted,setMounted]=useState(show);const content=useRef(children);
  if(show)content.current=children;
  useEffect(()=>{if(show){setMounted(true);return;}const delay=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:160;const timer=setTimeout(()=>setMounted(false),delay);return()=>clearTimeout(timer);},[show]);
  if(!show&&!mounted)return null;
  return <div className={`motion-presence ${show?'':'is-exiting'}`} inert={!show}>{show?children:content.current}</div>;
}
