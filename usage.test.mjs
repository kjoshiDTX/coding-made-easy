import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {consumeResponse} from './ai.mjs';
import {trackGeneration,lastGenerationUsage,normalizedUsage,usagePath} from './usage.mjs';
import {Workspace} from './workspace.mjs';
const raw={input_tokens:100,output_tokens:40,input_tokens_details:{cached_tokens:20},output_tokens_details:{reasoning_tokens:10}};
const stream=events=>new ReadableStream({start(c){for(const e of events)c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(e)}\n\n`));c.close();}});
test('terminal stream usage is retained for success and provider failure',async()=>{
 let usage;
 assert.equal(await consumeResponse(stream([{type:'response.output_text.delta',delta:'ok'},{type:'response.completed',response:{usage:raw}}]),()=>{},u=>usage=u),'ok');assert.deepEqual(usage,raw);
 usage=null;await assert.rejects(consumeResponse(stream([{type:'response.failed',response:{usage:raw,error:{code:'limit'}}}]),()=>{},u=>usage=u),/limit/);assert.deepEqual(usage,raw);
 assert.equal(normalizedUsage(null),null);assert.equal(normalizedUsage({input_tokens:-1,output_tokens:2}),null);
 assert.throws(()=>usagePath('valid','../../learner/active'),/Invalid usage/);
});
test('generation totals include repair/audit and failure usage without double counting reasoning or storing prompts',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'cme-usage-')),workspace=new Workspace(dir);
 const ai={async complete(){return {model:'synthetic',text:'private output',usage:raw};}};
 try{
  await trackGeneration({ai,workspace,project:'p',concept:'c'},async tracked=>{for(let i=0;i<3;i++)await tracked.complete({instructions:'secret prompt',input:[],model:'synthetic'});});
  let saved=await lastGenerationUsage(new Workspace(dir),'p','c');assert.equal(saved.requestCount,3);assert.equal(saved.inputTokens,300);assert.equal(saved.outputTokens,120);assert.equal(saved.reasoningTokens,30);assert.equal(saved.complete,true);
  await assert.rejects(trackGeneration({ai,workspace,project:'p',concept:'c'},async tracked=>{await tracked.complete({input:[]});throw Error('Source audit rejected');}),e=>{assert.equal(e.generationUsage.outputTokens,40);return /Source audit/.test(e.message);});
  saved=await lastGenerationUsage(workspace,'p','c');assert.equal(saved.status,'failed');
  const log=await readFile(workspace.resolve('usage/generations.jsonl'),'utf8');assert.ok(!log.includes('secret prompt'));assert.ok(!log.includes('private output'));assert.equal(log.trim().split('\n').length,2);
  await trackGeneration({ai:{async complete(){return {text:'ok'};}},workspace,project:'p',concept:'unknown'},t=>t.complete({input:[]}));
  assert.equal((await lastGenerationUsage(workspace,'p','unknown')).complete,false);
 }finally{await rm(dir,{recursive:true,force:true});}
});
