import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {Preparation,inputReservation,MODEL,MAX_OUTPUT} from './preparation.mjs';
import {Workspace} from './workspace.mjs';
import {atomicJSON} from './auth.mjs';
import {AI} from './ai.mjs';
import {interviewResources} from './interview-resources.mjs';
const project=()=>({id:'p',track:'interview',language:'python',title:'Merge intervals',tickets:[{id:'t',task:'Merge',conceptIds:['a','b','optional'],coreConceptIds:['a','b']}],concepts:[{id:'a',title:'Intervals',prerequisites:[]},{id:'b',title:'Ordering',prerequisites:['a']},{id:'optional',title:'Extra',prerequisites:[]}]});
async function fixture(run){const dir=await mkdtemp(path.join(os.tmpdir(),'cme-preparation-'));try{
 const p=project(),lessons={a:{evidence:{}}},calls=[];
 const library={project(id){if(id!==p.id)throw Error('Missing project');return p;},get(_p,id){return lessons[id];},ai:{async complete(options){calls.push(options);return {text:'synthetic',model:MODEL,usage:{input_tokens:100,output_tokens:200,output_tokens_details:{reasoning_tokens:50}}};}},async generate(_p,id,_model,{ai}){for(let i=0;i<2;i++)await ai.complete({model:MODEL,instructions:'short',input:[]});lessons[id]={evidence:{}};return lessons[id];}};
 const workspace=new Workspace(dir),preparation=new Preparation({library,workspace});await run({dir,p,lessons,calls,library,workspace,preparation});
 }finally{await rm(dir,{recursive:true,force:true});}}
test('prepares only missing core lessons, retains existing work, caps provider output and reuses cache without spending',()=>fixture(async({preparation,calls,lessons})=>{
 await preparation.start({project:'p',ticket:'t'});await preparation.promise;const job=await preparation.status('p','t');
 assert.equal(job.status,'ready');assert.deepEqual(job.completed,['a','b']);assert.equal(calls.length,2);assert.equal(calls[0].maxOutputTokens,MAX_OUTPUT);assert.ok(!lessons.optional);
 assert.equal(job.requests.reduce((s,r)=>s+r.output,0),400,'reasoning is included, not added twice');
 await preparation.start({project:'p',ticket:'t'});await preparation.promise;assert.equal(calls.length,2);
}));
test('audit failure pauses immediately; explicit resume and restart retain the cumulative budget',()=>fixture(async({preparation,library,calls,workspace,p})=>{
 library.generate=async(_p,_id,_model,{ai})=>{await ai.complete({model:MODEL,input:[]});throw Error('Unsupported claim');};
 await preparation.start({project:'p',ticket:'t'});await preparation.promise;assert.equal(calls.length,1);assert.equal((await preparation.status('p','t')).status,'paused');
 const again=new Preparation({library,workspace});await again.start({project:'p',ticket:'t'});await again.promise;assert.equal((await again.status('p','t')).requests.length,2);
 await assert.rejects(again.start({project:'p',ticket:'t',policy:1}),/cannot be reset/);
 const saved=JSON.parse(await readFile(again.file(p,p.tickets[0]),'utf8'));assert.equal(saved.schema,1);assert.ok(await readFile(again.file(p,p.tickets[0])+'.backup','utf8'));
}));
test('hard caps block requests before inference, including oversized text, repeat attempts and malformed scopes',()=>fixture(async({preparation,p,library,calls,workspace})=>{
 p.tickets[0].coreConceptIds=Array.from({length:9},(_,i)=>'c'+i);await assert.rejects(preparation.start({project:'p',ticket:'t'}),/at most 8/);assert.equal(calls.length,0);
 p.tickets[0].coreConceptIds=['b'];await assert.rejects(preparation.start({project:'p',ticket:'t'}),/prerequisite/);assert.equal(calls.length,0);
 p.tickets[0].coreConceptIds=['a','b'];library.generate=async(_p,_id,_model,{ai})=>ai.complete({model:MODEL,input:'x'.repeat(600000)});
 await preparation.start({project:'p',ticket:'t'});await preparation.promise;assert.equal(calls.length,0);assert.match((await preparation.status('p','t')).error,/Hard preparation budget/);
 const file=preparation.file(p,p.tickets[0]),saved=JSON.parse(await readFile(file,'utf8'));saved.requests=Array.from({length:24},()=>({input:1,output:1,status:'completed'}));await atomicJSON(file,saved);
 library.generate=async(_p,_id,_model,{ai})=>ai.complete({model:MODEL,input:[]});await preparation.start({project:'p',ticket:'t'});await preparation.promise;assert.equal(calls.length,0);
}));
test('unknown usage retains reservation, stops subsequent calls, and survives process interruption without a reset',()=>fixture(async({preparation,library,calls,workspace,p})=>{
 library.ai.complete=async options=>{calls.push(options);return {text:'synthetic',model:MODEL};};
 await preparation.start({project:'p',ticket:'t'});await preparation.promise;let job=await preparation.status('p','t');assert.equal(job.status,'paused');assert.equal(calls.length,1);assert.equal(job.requests[0].output,8000);assert.equal(job.requests[0].status,'unknown');
 job.status='running';await atomicJSON(preparation.file(p,p.tickets[0]),job);const restarted=new Preparation({library,workspace});assert.equal((await restarted.status('p','t')).status,'interrupted');
 job.schema=99;await atomicJSON(preparation.file(p,p.tickets[0]),job);await assert.rejects(restarted.start({project:'p',ticket:'t'}),/Unknown or invalid/);assert.equal(calls.length,1);
}));
test('single active job, cancellation, and locked model cannot be bypassed by a second start',()=>fixture(async({preparation,library,calls})=>{
 let release;library.ai.complete=options=>new Promise((resolve,reject)=>{calls.push(options);options.signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true});release=resolve;});
 await assert.rejects(preparation.start({project:'p',ticket:'t',model:'other-model'}),/GPT-6.1/);
 await preparation.start({project:'p',ticket:'t'});while(!calls.length)await new Promise(r=>setTimeout(r,5));
 await assert.rejects(preparation.start({project:'p',ticket:'t'}),/already/);await assert.rejects(preparation.stop({project:'other',ticket:'t'}),/not the active/);await preparation.stop();await preparation.promise;assert.equal(calls.length,1);assert.equal((await preparation.status('p','t')).status,'paused');
}));
test('API adapter sends a real max_output_tokens limit and retains terminal usage',async()=>{
 const original=globalThis.fetch;let payload;try{
 globalThis.fetch=async(_url,options)=>{payload=JSON.parse(options.body);return new Response('data: '+JSON.stringify({type:'response.output_text.delta',delta:'ok'})+'\n\ndata: '+JSON.stringify({type:'response.completed',response:{usage:{input_tokens:2,output_tokens:3}}})+'\n\n');};
 const ai=new AI({async accessToken(){return 'synthetic';}});ai.catalog=[{id:MODEL}];await ai.complete({model:MODEL,input:[],maxOutputTokens:8000});assert.equal(payload.max_output_tokens,8000);
 }finally{globalThis.fetch=original;}
 assert.ok(inputReservation({instructions:'😀',input:[]})>4096);assert.throws(()=>inputReservation({input:[{role:'user',content:[{type:'input_image',image_url:'x'}]}]}),/text-only/);
});
test('curated resources stay scoped, mark worked answers as optional, and do not affect personal paths',()=>{
 const p=project(),resources=interviewResources(p,p.concepts[0]);assert.match(resources.pattern,/Intervals/);assert.ok(resources.resources.some(r=>r.url.includes('neetcode')));assert.ok(resources.resources.some(r=>r.url.includes('geeksforgeeks')));assert.ok(resources.resources.some(r=>r.url.includes('visualgo')));assert.equal(interviewResources({...p,track:'personal'},p.concepts[0]),null);
});

test('outline requests transfer into the same preparation budget and repeated imports reuse the saved outline',()=>fixture(async({preparation,library,p,calls})=>{
 const planned=await preparation.plan({policy:1,key:'same question'},async ai=>{await ai.complete({model:MODEL,input:[]});return p;});
 assert.equal(planned.requests.length,1);assert.equal(calls.length,1);
 const duplicate=await preparation.plan({policy:1,key:'same question'},()=>{throw Error('Must not replan');});assert.equal(duplicate.project.id,p.id);assert.equal(calls.length,1);
 await assert.rejects(preparation.plan({policy:2,key:'same question'},()=>p),/cannot be reset/);
 await preparation.start({project:'p',ticket:'t',policy:1,seedRequests:planned.requests,importID:planned.importID});await preparation.promise;
 assert.equal((await preparation.status('p','t')).requests.length,3);assert.equal(calls.length,3);
}));
