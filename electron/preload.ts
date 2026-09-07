import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('portwhim', {
  scan:()=>ipcRenderer.invoke('ports:scan'),
  open:(id:string)=>ipcRenderer.invoke('ports:open',id),
  copy:(id:string,field:string)=>ipcRenderer.invoke('ports:copy',id,field),
  stop:(id:string)=>ipcRenderer.invoke('ports:stop',id)
});
