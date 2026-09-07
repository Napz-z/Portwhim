import { app, BrowserWindow, ipcMain, shell, clipboard, dialog } from 'electron';
import path from 'node:path';
import { scan, terminate, verifyIdentity } from './scanner';
import type { Listener, Snapshot } from '../src/shared';
let win:BrowserWindow;
let latest:Snapshot|undefined;
let pending:Promise<Snapshot>|undefined;
let stopping=false;
const dev=process.env.PORTWHIM_DEV==='1';
function selected(id:unknown):Listener{
  if(typeof id!=='string')throw new Error('Invalid selection.');
  const row=latest?.listeners.find(l=>l.id===id);
  if(!row)throw new Error('Selection expired. Select the process again.');return row;
}
app.whenReady().then(()=>{
  app.setAppUserModelId('dev.portwhim.desktop');
  win=new BrowserWindow({width:1440,height:940,minWidth:1000,minHeight:680,backgroundColor:'#0c1015',title:'Portwhim',autoHideMenuBar:true,
    icon:path.join(__dirname,'../dist/brand/icon.png'),
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',e=>e.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  function handle(channel:string,fn:(...args:any[])=>any){ipcMain.handle(channel,(event,...args)=>{
    if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame)throw new Error('Untrusted sender.');
    return fn(...args);
  });}
  handle('ports:scan',()=>{
    if(stopping) return latest;
    if(!pending)pending=scan().then(s=>{latest=s;return s;}).finally(()=>{pending=undefined;});
    return pending;
  });
  handle('ports:copy',(id,field)=>{const row=selected(id);if(field!=='pid'&&field!=='port')throw new Error('Invalid field.');clipboard.writeText(String(field==='pid'?row.pid:row.port));});
  handle('ports:open',async id=>{const row=selected(id);if(row.protocol!=='TCP')throw new Error('Only TCP listeners can be opened.');await shell.openExternal(`http://${row.address==='::1'?'[::1]':'localhost'}:${row.port}`);});
  handle('ports:stop',async id=>{
    if(stopping)throw new Error('Another stop action is in progress.');const row=selected(id);stopping=true;
    try{
      await verifyIdentity(row);
      const result=await dialog.showMessageBox(win,{type:'warning',title:'Stop process?',message:`Stop ${row.name} (PID ${row.pid})?`,detail:`This closes every port owned by this process, including :${row.port}. Unsaved work may be lost.${process.platform==='win32'?' Windows terminates the process immediately.':' A SIGTERM signal will be sent.'}`,buttons:['Cancel','Stop process'],defaultId:0,cancelId:0,noLink:true});
      if(result.response!==1)return {cancelled:true};
      await terminate(row);return {message:process.platform==='win32'?'Process terminated.':'SIGTERM sent. Refresh to check whether the process has exited.'};
    }finally{stopping=false;}
  });
  if(dev)win.loadURL('http://127.0.0.1:5173');else win.loadFile(path.join(__dirname,'../dist/index.html'));
});
app.on('window-all-closed',()=>app.quit());
