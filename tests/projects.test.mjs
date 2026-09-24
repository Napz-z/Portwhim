import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groupProjects,expectedState,validExpected,directoryKey} from '../src/projects.ts';
import {matchesQuery} from '../src/explorer.ts';
import {restartDiagnosis} from '../src/diagnosis.ts';
const row=(root,pid=10,port=3000)=>({pid,started:'birth',name:'node',port,protocol:'TCP',category:'app',provenance:{project:root?{directory:root+'/app',name:'web',git:{root,branch:'main',worktree:false}}:null,ancestors:[],manager:null}});
test('monorepo packages group by Git root, worktrees and unknown owners stay separate',()=>{
 const main=row('/repo');const api={...row('/repo',11,8080),provenance:{...main.provenance,project:{...main.provenance.project,directory:'/repo/api'}}};
 const groups=groupProjects([main,api,row('/feature',12),row(null,13),row(null,14)],[]);
 assert.equal(groups.length,4);assert.equal(groups.find(g=>g.key==='/repo').listeners.length,2);
 assert.equal(groups.filter(g=>!g.directory).length,2);
});
test('expected services retain stopped projects and distinguish protocol and other owners',()=>{
 const expected={root:'/repo',projectName:'Shop',port:3000,protocol:'TCP',label:'Web'};
 assert.equal(groupProjects([],[expected])[0].name,'Shop');
 assert.equal(expectedState(expected,[row('/repo')]),'observed');
 assert.equal(expectedState(expected,[row('/other')]),'elsewhere');
 assert.equal(expectedState(expected,[{...row('/repo'),protocol:'UDP'}]),'missing');
 assert.equal(validExpected([expected,{...expected,port:65536},null]).length,1);
});
test('restart diagnosis distinguishes replacement projects from a possible supervisor restart',()=>{
 const before=row('/repo');const after={...row('/repo',99),provenance:{...before.provenance,manager:'nodemon'}};
 assert.match(restartDiagnosis(after,before).title,/nodemon/);
 assert.match(restartDiagnosis(after,before).detail,/not proof/);
 assert.match(restartDiagnosis(row('/other',99),before).title,/different project/);
 assert.match(restartDiagnosis(row('/repo')).title,/No restart manager/);
 assert.doesNotMatch(restartDiagnosis(after,{...before,port:5000}).detail,/after your stop/);
});

test('branch search can find a separate worktree without matching unrelated projects',()=>{
 const feature=row('/feature');feature.provenance.project.git.branch='feature/cart';
 assert.equal(matchesQuery(feature,'feature/cart'),true);
 assert.equal(matchesQuery(row('/repo'),'feature/cart'),false);
});

test('Windows directory casing and slash styles identify the same project',()=>{
 assert.equal(directoryKey('C:\\Dev\\Shop'),directoryKey('c:/dev/shop/'));
 assert.notEqual(directoryKey('/Work/Shop'),directoryKey('/work/shop'));
});
