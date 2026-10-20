import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {planningPolicy,validateInterviewScope,refocusIntervalPlan,intervalSource,lessonSourceUrls,pythonInlineSources} from './interview.mjs';
import {corePath,firstConcept,navigationPath} from './public/path.js';
import {Library} from './library.mjs';
import {Workspace} from './workspace.mjs';
const fixture=()=>({id:'intervals',title:'merge intervals',track:'interview',language:'python',description:'Merge closed intervals',spec:'Preserve this exact task',tickets:[{id:'t1',title:'Merge',conceptIds:Array.from({length:23},(_,i)=>`c${i}`)}],concepts:Array.from({length:23},(_,i)=>({id:`c${i}`,title:i===12?'Contracts and closed-interval semantics':`Old concept ${i}`,why:'Original purpose',prerequisites:i?[`c${i-1}`]:[],sourceUrls:['https://docs.python.org/3/library/stdtypes.html#comparisons']}))});
test('interview scope is bounded per ticket, including hidden prerequisites and optional chains',()=>{
 const plan=fixture();assert.throws(()=>validateInterviewScope(plan),/too broad/);
 plan.concepts=plan.concepts.slice(0,4);plan.tickets[0].conceptIds=['c3'];assert.equal(validateInterviewScope(plan),plan);
 plan.concepts[0].kind='refresher';assert.throws(()=>validateInterviewScope(plan),/cannot be required/);
 assert.match(planningPolicy('interview','rust'),/3–6 CORE/);assert.doesNotMatch(planningPolicy('interview','rust'),/15–40/);
 assert.match(planningPolicy('personal','rust'),/concrete deliverable/);
});
test('old interval curriculum becomes four core skills with original work still addressable',()=>{
 const original=fixture(),updated=refocusIntervalPlan(original);assert.equal(original.concepts.length,23);
 assert.equal(corePath(updated).length,4);assert.equal(updated.concepts.length,27);
 assert.equal(updated.spec,original.spec);assert.equal(firstConcept(updated),'interval-v2-model');
 assert.deepEqual(navigationPath(updated,firstConcept(updated)).map(c=>c.id),updated.tickets[0].coreConceptIds);
 assert.equal(navigationPath(updated,'c12').length,23);
 assert.ok(updated.tickets[0].conceptIds.includes('c12'));assert.equal(updated.concepts.find(c=>c.id==='c12').sourceUrls[0],intervalSource);
 assert.equal(refocusIntervalPlan(updated),null);assert.equal(refocusIntervalPlan({...original,track:'personal'}),null);
});
test('curriculum migration backs up the original and preserves scoped progress, chats and logs on restart',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'cme-pattern-migration-'));
 try{
  let workspace=new Workspace(dir);const project=fixture(),key='intervals:c12',progress={drafts:{guided:'my code'},done:{learn:true},hints:{practice:2}};
  const lesson={title:'Prior lesson',sources:[],prediction:{code:'code'}};
  await workspace.save({seedVersion:2,projects:[project],lessons:{[key]:lesson},progress:{[key]:progress}});
  await workspace.chat(project,'c12',{role:'user',content:'My saved question',status:'completed'});
  await workspace.event(project,'c12',{type:'manual-completion',stage:'learn',done:true});
  const oldDirectory=workspace.conceptDir(project,'c12');
  let library=new Library({workspace,directory:dir,ai:null,runner:null});await library.init();
  assert.equal(corePath(library.project('intervals')).length,4);assert.deepEqual(library.data.progress[key],progress);assert.deepEqual(library.get('intervals','c12'),lesson);
  assert.equal(workspace.conceptDir(library.project('intervals'),'c12'),oldDirectory);
  const backup=JSON.parse(await readFile(workspace.resolve('.workspace/migrations/interview-pattern-v2-intervals.json'),'utf8'));
  assert.deepEqual(backup.project,project);
  workspace=new Workspace(dir);library=new Library({workspace,directory:dir,ai:null,runner:null});await library.init();
  assert.equal(library.project('intervals').concepts.length,27);assert.deepEqual(library.data.progress[key],progress);
  assert.equal((await workspace.conversation(library.project('intervals'),'c12'))[0].content,'My saved question');
  assert.match(await readFile(workspace.resolve(`${oldDirectory}/events.jsonl`),'utf8'),/manual-completion/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('new interview imports use the pattern policy and keep optional work outside the core count',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'cme-pattern-import-'));
 let request;
 const plan={title:'List problem',description:'Study a list pattern.',language:'python',concepts:[{id:'model',title:'List model',why:'Represent a list.',prerequisites:[],sourceUrls:['https://docs.python.org/3/tutorial/datastructures.html'],kind:'core'},{id:'scan',title:'Scan invariant',why:'Trace the state.',prerequisites:['model'],sourceUrls:['https://docs.python.org/3/tutorial/datastructures.html'],kind:'core'},{id:'syntax',title:'Syntax refresher',why:'Read a loop.',prerequisites:[],sourceUrls:['https://docs.python.org/3/tutorial/controlflow.html'],kind:'refresher'}],tickets:[{id:'t1',title:'List task',conceptIds:['scan','syntax']}]};
 try{
  const workspace=new Workspace(dir),library=new Library({directory:dir,workspace,runner:null,ai:{async complete(options){request=options;return {text:JSON.stringify(plan),model:'synthetic'};}}});await library.init();
  const p=await library.importProject({title:'List task',spec:'A single list task',track:'interview'});
  assert.match(request.instructions,/3–6 CORE/);assert.doesNotMatch(request.instructions,/learner who knows no/);
  assert.equal(corePath(p).length,2);assert.equal(p.concepts.length,3);assert.equal(p.tickets[0].coreConceptIds.length,2);
  assert.equal(p.concepts.find(c=>c.title==='Syntax refresher').kind,'refresher');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('interval generation supplies a domain source even when an old plan only cites language docs',async()=>{
 let request;
 const library=new Library({directory:'unused',runner:null,ai:{async complete(options){request=options;throw Error('synthetic stop before generation');}}});
 library.data={projects:[fixture()],lessons:{},progress:{}};
 library.sourceNotes=async url=>({url,available:true,excerpt:'Source '.repeat(30)});
 await assert.rejects(library.generate('intervals','c12'),/synthetic stop/);
 const urls=JSON.parse(request.input[0].content).sources.map(n=>n.url);assert.equal(urls[0],intervalSource);for(const url of pythonInlineSources)assert.ok(urls.includes(url));
 assert.match(request.instructions,/Use only technical rules supported by the supplied excerpts/);
});

test('inline Python syntax sources supplement compact interview lessons without duplicating URLs',()=>{
 const concept={title:'Intervals as a data structure',sourceUrls:[intervalSource,...pythonInlineSources]};
 const interview=lessonSourceUrls({track:'interview',language:'python'},concept);
 assert.equal(new Set(interview).size,interview.length);for(const url of pythonInlineSources)assert.ok(interview.includes(url));
 const personal=lessonSourceUrls({track:'personal',language:'python'},{title:'Encoding',sourceUrls:['https://docs.python.org/3/library/stdtypes.html#bytes']});
 assert.equal(personal.length,1);
 const other=lessonSourceUrls({track:'interview',language:'go'},{title:'Intervals',sourceUrls:['https://go.dev/ref/spec']});
 assert.ok(other.includes(intervalSource));assert.ok(!other.some(url=>url.includes('python.org')));
 const many=lessonSourceUrls({track:'interview',language:'python'},{title:'List model',sourceUrls:Array.from({length:8},(_,i)=>'https://docs.python.org/3/?'+i)});assert.ok(many.length<=6);for(const url of pythonInlineSources)assert.ok(many.includes(url));
});
