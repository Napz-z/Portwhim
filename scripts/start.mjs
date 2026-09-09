import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
const executable=resolve('src-tauri/target/release',process.platform==='win32'?'portwhim.exe':'portwhim');
if(!existsSync(executable)){console.error('Build the desktop app first: pnpm run pack');process.exit(1);}
const child=spawn(executable,[],{stdio:'inherit'});
child.on('error',error=>{console.error(error.message);process.exit(1);});
child.on('exit',code=>process.exit(code??1));
