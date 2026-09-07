import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import electron from 'electron';
await import('./build.mjs');
const server = await createServer(); await server.listen();
const child = spawn(electron, ['.'], {stdio:'inherit',env:{...process.env,PORTWHIM_DEV:'1',ELECTRON_RUN_AS_NODE:''}});
const close=async()=>{await server.close();process.exit();};
child.on('exit',close); process.on('SIGINT',()=>child.kill());
