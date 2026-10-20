import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,mkdir,symlink} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {Workspace,acquireWorkspaceLock} from './workspace.mjs';
import {Library} from './library.mjs';
import {verifyEvidence} from './evidence.mjs';
import {Runner} from './runner.mjs';
import {runtimePaths} from './runtimes.mjs';
import {bpeSteps} from './public/visual.js';
const temporary=()=>mkdtemp(path.join(os.tmpdir(),'coding-made-easy-'));

test('file workspace persists isolated progress, completion, chat and append-only mistake evidence',async()=>{
 const root=await temporary();try{
  let workspace=new Workspace(root),library=new Library({directory:root,workspace,runner:{async run(){return {ok:false,stdout:'',stderr:'expected 8; actual 4',exitCode:1};}}});await library.init();
  await library.saveDraft('minifhir','functions','practice','my draft');await library.markDone('minifhir','functions','learn',true);
  await library.grade({project:'minifhir',id:'functions',stage:'predict',prediction:'wrong'});
  await library.grade({project:'minifhir',id:'functions',stage:'practice',code:'bad code'});
  await workspace.chat(library.project('minifhir'),'functions',{role:'user',content:'why?',status:'completed'});
  const events=await readFile(workspace.resolve(workspace.conceptDir(library.project('minifhir'),'functions')+'/events.jsonl'),'utf8');
  assert.equal(events.trim().split('\n').length,4);assert.match(events,/expected 8; actual 4/);assert.match(events,/"prediction":"wrong"/);
  workspace=new Workspace(root);library=new Library({directory:root,workspace});await library.init();const progress=library.progress('minifhir','functions');assert.equal(progress.done.learn,true);assert.equal(progress.drafts.practice,'bad code');assert.equal(progress.mistakeCounts.unknown,2);assert.equal(library.progress('minifhir','structs').done,undefined);
  assert.equal((await workspace.conversation(library.project('minifhir'),'functions'))[0].content,'why?');assert.deepEqual(await workspace.conversation(library.project('minifhir'),'structs'),[]);
  assert.match((await workspace.context(library.project('minifhir'),'functions')).summary,/unknown: 2/);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('legacy migration archives progress without moving credentials; future schemas fail closed',async()=>{
 const root=await temporary();try{const legacyDir=path.join(root,'old'),old=new Library({directory:legacyDir});await old.init();await old.saveDraft('minifhir','functions','guided','migration draft');await writeFile(path.join(legacyDir,'credentials.json'),'DO NOT COPY');
  const workspace=new Workspace(path.join(root,'new'),{legacyFile:path.join(legacyDir,'library.json')}),library=new Library({directory:legacyDir,workspace});await library.init();assert.equal(library.progress('minifhir','functions').drafts.guided,'migration draft');assert.match(await readFile(path.join(legacyDir,'credentials.json'),'utf8'),/DO NOT COPY/);assert.match(await readFile(workspace.resolve('.workspace/migrations/legacy-library.json'),'utf8'),/migration draft/);
  const catalog=await readFile(workspace.resolve('.workspace/catalog.json'),'utf8');assert.ok(!catalog.includes('credentials'));await writeFile(workspace.resolve('.workspace/catalog.json'),'{"schema":999}');await assert.rejects(new Workspace(workspace.root).load(),/Unsupported workspace version/);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('catalog corruption recovers the previous committed snapshot',async()=>{
 const root=await temporary();try{const workspace=new Workspace(root),library=new Library({directory:root,workspace});await library.init();await library.saveDraft('minifhir','functions','practice','keep this');await library.hint('minifhir','functions','practice');await writeFile(workspace.resolve('.workspace/catalog.json'),'{broken');const recovered=new Library({directory:root,workspace:new Workspace(root)});await recovered.init();assert.equal(recovered.progress('minifhir','functions').drafts.practice,'keep this');
 }finally{await rm(root,{recursive:true,force:true});}
});

test('repo context rejects traversal, symlinks and hidden credentials',async()=>{
 const root=await temporary();try{const repo=path.join(root,'repo');await mkdir(path.join(repo,'.git'),{recursive:true});await writeFile(path.join(repo,'main.py'),'print(1)');await writeFile(path.join(repo,'.env'),'secret');await writeFile(path.join(root,'outside.py'),'outside');await symlink(path.join(root,'outside.py'),path.join(repo,'link.py'));const workspace=new Workspace(root);assert.equal((await workspace.repoContext(repo,['main.py'])).files[0].content,'print(1)');for(const files of [['../outside.py'],['link.py'],['.env']])await assert.rejects(workspace.repoContext(repo,files));
 }finally{await rm(root,{recursive:true,force:true});}
});

test('claim audit rejects dead sources, unsupported claims and invented quotations',async()=>{
 const excerpt='A bytes object is an immutable sequence of integers in the range 0 <= x < 256. '+ 'source text '.repeat(20),url='https://docs.python.org/3/library/stdtypes.html',notes=[{url,available:true,excerpt,retrievedAt:'2026-10-20'}];
 const audit=claims=>({async complete(){return {text:JSON.stringify({supported:true,issues:[],claims}),model:'test'};}});
 await assert.rejects(verifyEvidence({},[{...notes[0],available:false}],audit([])),/could not be retrieved/);
 await assert.rejects(verifyEvidence({},notes,audit([{claim:'bytes',url,quote:'invented quote that does not occur'}])),/did not match/);
 const result=await verifyEvidence({},notes,audit([{claim:'bytes contain integers',url,quote:'A bytes object is an immutable sequence of integers'}]));assert.equal(result.guarantee,false);assert.equal(result.sources[0].sha256.length,64);
 await assert.rejects(verifyEvidence({},notes,{async complete(){return {text:'{"supported":false,"issues":["unproven"],"claims":[]}'};}}),/unsupported claims/);
});

test('a cached lesson audit preserves progress and does not publish an unsupported reading',async()=>{
 const root=await temporary();try{const workspace=new Workspace(root),library=new Library({directory:root,workspace,ai:{async complete(){return {text:'{"supported":false,"issues":["missing evidence"],"claims":[]}'};}}});await library.init();await library.saveDraft('minifhir','program','learn','retained draft');
  const url=library.get('minifhir','program').sources[0].url;library.sourceNotes=async()=>({url,available:true,excerpt:'source text '.repeat(30)});library.checkLesson=async()=>({ok:true});await assert.rejects(library.generate('minifhir','program'),/unsupported claims/);assert.equal(library.get('minifhir','program').evidence,undefined);assert.equal(library.progress('minifhir','program').drafts.learn,'retained draft');
 }finally{await rm(root,{recursive:true,force:true});}
});

test('BPE visual preserves UTF-8 bytes across all merges including emoji',()=>{
 for(const text of ['banana','😀😀a','', 'é你好'])for(const frame of bpeSteps(text))assert.deepEqual(frame.tokens.flatMap(t=>t.bytes),[...new TextEncoder().encode(text)]);
});

test('multi-ticket imports duplicate shared prerequisites into independent ticket curricula',async()=>{
 const root=await temporary();try{const plan={title:'generated title',language:'python',description:'Two tasks',concepts:[{id:'base',title:'Base',why:'Foundation',prerequisites:[],sourceUrls:['https://docs.python.org/3/tutorial/']},{id:'next',title:'Next',why:'Next step',prerequisites:['base'],sourceUrls:['https://docs.python.org/3/tutorial/']}],tickets:[{id:'one',title:'First',conceptIds:['next']},{id:'two',title:'Second',conceptIds:['next']}]};
  const workspace=new Workspace(root),library=new Library({directory:root,workspace,ai:{async complete(){return {text:JSON.stringify(plan),model:'synthetic'};}}});await library.init();const project=await library.importProject({title:'My exact project name',language:'python',spec:'two tasks',track:'interview'});assert.equal(project.title,'My exact project name');assert.equal(project.track,'interview');assert.equal(project.concepts.length,4);assert.equal(project.tickets[0].conceptIds.length,2);assert.equal(project.tickets[0].conceptIds.some(id=>project.tickets[1].conceptIds.includes(id)),false);assert.match(workspace.conceptDir(project,project.tickets[1].conceptIds[0]),/interview\/problems\/.*\/tickets\/two\//);
  const existing=library.data.projects.find(p=>p.title==='My exact project name');const previous=existing.tickets.flatMap(t=>t.conceptIds);const added=await library.importProject({projectId:existing.id,title:existing.title,language:'python',spec:'another task',track:'interview'});assert.equal(added.id,existing.id);assert.equal(added.tickets.length,4);assert.equal(new Set(added.concepts.map(c=>c.id)).size,8);assert.deepEqual(added.tickets.slice(0,2).flatMap(t=>t.conceptIds),previous);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('interrupted raw-log tails do not consume subsequent valid messages',async()=>{
 const root=await temporary();try{const workspace=new Workspace(root);await mkdir(path.join(root,'logs'));await writeFile(path.join(root,'logs/events.jsonl'),'{interrupted');await workspace.append('logs/events.jsonl',{type:'complete'});const lines=(await readFile(path.join(root,'logs/events.jsonl'),'utf8')).trim().split('\n');assert.equal(lines[0],'{interrupted');assert.equal(JSON.parse(lines[1]).type,'complete');}finally{await rm(root,{recursive:true,force:true});}
});

test('a workspace rejects a second server until the first releases its lock',async()=>{
 const root=await temporary();try{const release=await acquireWorkspaceLock(root);await assert.rejects(acquireWorkspaceLock(root),/already open/);await release();await (await acquireWorkspaceLock(root))();}finally{await rm(root,{recursive:true,force:true});}
});

test('uncommitted workspace save cannot replace the committed catalog',async()=>{
 const root=await temporary();try{const workspace=new Workspace(root),library=new Library({directory:root,workspace});await library.init();await library.saveDraft('minifhir','functions','guided','committed');const saved=await readFile(workspace.resolve('.workspace/catalog.json'),'utf8');
  const data=structuredClone(library.data);data.projects[0].id='../invalid';await assert.rejects(workspace.save(data));assert.equal(await readFile(workspace.resolve('.workspace/catalog.json'),'utf8'),saved);assert.equal((await new Workspace(root).load()).progress['minifhir:functions'].drafts.guided,'committed');
 }finally{await rm(root,{recursive:true,force:true});}
});

test('Java/C++/Rust compile and run real tests when installed; compile errors remain distinct',async()=>{
 const root=await temporary();try{const runner=new Runner(root),paths=runtimePaths();
  for(const [language,present,code,testCode]of [
   ['java',paths.javac,'public class Main { public static int twice(int n){return n*2;} public static void main(String[] args){} }','public class Checks { public static void main(String[] args){if(Main.twice(4)!=8 || Main.twice(0)!=0)throw new AssertionError("twice");}}'],
   ['cpp',paths.cpp,'int twice(int n){return n*2;}\n#ifndef CONCEPT_TEST\nint main(){return 0;}\n#endif','#define CONCEPT_TEST\n#include "main.cpp"\n#include <cassert>\nint main(){assert(twice(4)==8);assert(twice(0)==0);}'],
   ['rust',paths.rust,'fn twice(n: i32) -> i32 {n*2}\nfn main() {}','include!("main.rs");\n#[test] fn check_twice(){assert_eq!(twice(4),8);assert_eq!(twice(0),0);}']
  ]){if(!present)continue;const result=await runner.run({language,code,testCode});assert.equal(result.ok,true,language+': '+result.stderr);assert.equal(result.phase,'run');const bad=await runner.run({language,code:'invalid syntax !!!!'});assert.equal(bad.ok,false);assert.equal(bad.phase,'compile');}
 }finally{await rm(root,{recursive:true,force:true});}
});
