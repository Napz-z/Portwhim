import { spawnSync } from 'node:child_process';
for (const [entry,args] of [['node_modules/typescript/bin/tsc',['--noEmit']],['node_modules/vite/bin/vite.js',['build']]]) {
 const result=spawnSync(process.execPath,[entry,...args],{stdio:'inherit'});
 if(result.status!==0)process.exit(result.status??1);
}
