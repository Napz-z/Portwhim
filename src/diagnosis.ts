import type { Listener } from './shared';
export function restartDiagnosis(row:Listener,previous?:Listener):{title:string;detail:string;next:string}{
  const samePort=previous?.port===row.port&&previous?.protocol===row.protocol;
  const replaced=samePort&&(previous!.pid!==row.pid||previous!.started!==row.started);
  const prior=previous?.provenance.project?.directory,current=row.provenance.project?.directory;
  if(replaced&&prior&&current&&prior!==current)return {title:'A different project now occupies this port',detail:'The current process identity and inferred project directory differ from the process you stopped.',next:'Inspect this project before taking any further stop action.'};
  const manager=row.provenance.manager||row.provenance.ancestors.map(p=>p.name.toLowerCase().replace(/\.exe$/,'')).find(name=>['nodemon','pm2','supervisord','systemd','launchd'].includes(name));
  const detail=replaced?'A different process identity was observed on this port after your stop request. This may be a restart; it is not proof of who launched it.':'These are observed launch clues, not a complete launch history.';
  if(manager){
    const next=/nodemon|--watch/.test(manager)?'Stop the watch command in its original terminal, or disable its watch mode.':/pm2/.test(manager)?'Find this application in PM2 and stop it there; killing its child may trigger a restart.':/docker/.test(manager)?'Inspect the container and its restart policy in Docker or Compose.':`Inspect the service in ${manager}; its restart policy may relaunch child processes.`;
    return {title:`Possible restart owner: ${manager}`,detail,next};
  }
  if(row.category==='container')return {title:'Container tooling may own this port',detail,next:'Check Docker published ports and the container restart policy. This process label alone does not prove container ownership.'};
  return {title:replaced?'New occupant after stop; cause unknown':'No restart manager identified',detail,next:'Check the parent chain and the terminal or editor that started the service. Portwhim will not repeatedly kill it.'};
}
