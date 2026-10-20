import {readJSON} from './auth.mjs';
const count=value=>Number.isSafeInteger(value)&&value>=0?value:null;
export function normalizedUsage(raw){
 if(!raw)return null;
 const input=count(raw.input_tokens),output=count(raw.output_tokens);
 if(input===null||output===null)return null;
 return {inputTokens:input,outputTokens:output,cachedInputTokens:count(raw.input_tokens_details?.cached_tokens),reasoningTokens:count(raw.output_tokens_details?.reasoning_tokens)};
}
export function summarizeUsage(requests,status){
 const measured=requests.filter(r=>r.usage),sum=key=>measured.reduce((n,r)=>n+(r.usage[key]??0),0);
 return {status,requestCount:requests.length,measuredRequests:measured.length,complete:requests.length>0&&measured.length===requests.length,inputTokens:sum('inputTokens'),outputTokens:sum('outputTokens'),cachedInputTokens:sum('cachedInputTokens'),reasoningTokens:sum('reasoningTokens'),requests};
}
export const usagePath=(project,concept)=>{if(![project,concept].every(id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(id)))throw Error('Invalid usage context.');return `cache/usage/${project}/${concept}.json`;};
export async function lastGenerationUsage(workspace,project,concept){return workspace?readJSON(workspace.resolve(usagePath(project,concept))):null;}
export async function trackGeneration({ai,workspace,project,concept},run){
 const requests=[];
 const tracked={async complete(options){
  const record={model:options.model||null,inputCharacters:JSON.stringify({instructions:options.instructions,input:options.input}).length,usage:null,status:'failed'};
  try{const result=await ai.complete(options);record.model=result.model;record.usage=normalizedUsage(result.usage);record.status='completed';return result;}
  catch(e){record.usage=normalizedUsage(e.usage);throw e;}
  finally{requests.push(record);}
 }};
 let status='failed',error;
 try{const result=await run(tracked);status='saved';return result;}catch(e){error=e;throw e;}
 finally{
  const summary={...summarizeUsage(requests,status),project,concept,at:new Date().toISOString()};if(error)error.generationUsage=summary;
  if(workspace){await workspace.append('usage/generations.jsonl',summary);await workspace.writeSummary(usagePath(project,concept),JSON.stringify(summary));}
 }
}
