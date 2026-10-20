import {randomUUID,createHash} from 'node:crypto';
import {atomicJSON,readJSON} from './auth.mjs';
import {normalizedUsage} from './usage.mjs';
import {coreIds} from './public/path.js';
export const MODEL='gpt-6.1-sol';
export const MAX_CORE=8,MAX_REQUESTS=24,MAX_OUTPUT=8000;
export const POLICIES={1:{input:300000,output:40000},2:{input:600000,output:80000}};
export function inputReservation(options){if(options.input!==undefined&&typeof options.input!=='string'&&(!Array.isArray(options.input)||options.input.some(m=>!m||typeof m.content!=='string'||!['user','assistant','system','developer'].includes(m.role))))throw Error('Budgeted preparation accepts text-only input.');return Buffer.byteLength(JSON.stringify({instructions:options.instructions,input:options.input}),'utf8')+4096;}
function scope(library,projectID,ticketID){
 const project=library.project(projectID),ticket=project.tickets.find(t=>t.id===ticketID);
 if(project.track!=='interview'||!ticket)throw Error('Choose an interview question.');
 const ids=coreIds(ticket);if(!ids.length||ids.length>MAX_CORE||new Set(ids).size!==ids.length)throw Error('Preparation accepts at most 8 unique core lessons.');
 const seen=new Set();for(const id of ids){const c=project.concepts.find(c=>c.id===id);if(!c||c.prerequisites.some(p=>!seen.has(p)))throw Error('Core lessons must be prerequisite-complete and ordered; optional lessons cannot be hidden prerequisites.');seen.add(id);}
 const fingerprint=createHash('sha256').update(JSON.stringify({language:project.language,task:ticket.task,ids,concepts:ids.map(id=>project.concepts.find(c=>c.id===id)).map(({id,title,prerequisites})=>({id,title,prerequisites}))})).digest('hex');
 return {project,ticket,ids,fingerprint};
}
export class Preparation {
 constructor({library,workspace}){this.library=library;this.workspace=workspace;this.running=false;this.promise=null;this.current=null;}
 file(project,ticket){return this.workspace.resolve(`${this.workspace.projectDir(project)}/tickets/${ticket.id}/preparation.json`);}
 async load(project,ticket){const job=await readJSON(this.file(project,ticket));if(job&&(job.schema!==1||!POLICIES[job.policy]||job.model!==MODEL||!Array.isArray(job.requests)||job.requests.length>MAX_REQUESTS||job.requests.some(r=>![r.input,r.output].every(n=>Number.isSafeInteger(n)&&n>=0))||!Array.isArray(job.coreIds)||job.coreIds.length>MAX_CORE||job.project!==project.id||job.ticket!==ticket.id))throw Error('Unknown or invalid preparation budget. No new request was sent.');return job;}
 async save(job,project,ticket){const file=this.file(project,ticket),old=await readJSON(file);if(old)await atomicJSON(file+'.backup',old);await atomicJSON(file,job);}
 async status(projectID,ticketID){const {project,ticket,ids}=scope(this.library,projectID,ticketID);const job=await this.load(project,ticket);if(!job)return null;const result=structuredClone(job);result.completed=ids.filter(id=>!!this.library.get(projectID,id)?.evidence);if(result.status==='running'&&(!this.current||this.current.job.project!==projectID||this.current.job.ticket!==ticketID))result.status='interrupted';return result;}
 async start({project:projectID,ticket:ticketID,policy=2,model=MODEL,seedRequests,importID}){
  if(this.running)throw Error('A question is already being prepared.');
  if(model!==MODEL)throw Error('Budgeted interview preparation currently uses GPT-6.1 Sol. Choose that model before starting.');
  if(!POLICIES[policy])throw Error('Choose a $1 or $2 API-equivalent workload budget.');
  this.running=true;
  try{
   const {project,ticket,ids,fingerprint}=scope(this.library,projectID,ticketID);let job=await this.load(project,ticket);
   if(job&&(job.fingerprint!==fingerprint||JSON.stringify(job.coreIds)!==JSON.stringify(ids)||job.policy!==policy))throw Error('The saved question budget cannot be reset or changed by retrying. Keep its original scope and budget.');
   job??={schema:1,project:projectID,ticket:ticketID,model,policy,fingerprint,coreIds:ids,requests:seedRequests||[],importID,createdAt:new Date().toISOString()};
   job.status='running';job.error=null;job.stopRequested=false;job.completed=ids.filter(id=>!!this.library.get(projectID,id)?.evidence);await this.save(job,project,ticket);
   this.current={job,project,ticket,controller:new AbortController()};
   this.promise=this.run(this.current).finally(()=>{this.running=false;this.current=null;});
   return structuredClone(job);
  }catch(e){this.running=false;throw e;}
 }
 async stop(expected={}){if(!this.current)return;if(expected.project&&(expected.project!==this.current.job.project||expected.ticket!==this.current.job.ticket))throw Error('That question is not the active preparation job.');const {job,project,ticket,controller}=this.current;job.stopRequested=true;await this.save(job,project,ticket);controller.abort();}
 async plan({policy=2,model=MODEL,key},run){
  if(model!==MODEL||!POLICIES[policy])throw Error('Choose GPT-6.1 Sol and a supported preparation budget.');
  const identity=createHash('sha256').update(String(key)).digest('hex');
  const file=this.workspace.resolve(`.workspace/preparation-imports/${identity}.json`);
  let job=await readJSON(file);
  if(job&&(job.schema!==1||job.policy!==policy||job.model!==model||!Array.isArray(job.requests)||job.requests.some(r=>![r.input,r.output].every(n=>Number.isSafeInteger(n)&&n>=0))))throw Error('The existing outline budget is invalid or cannot be reset.');
  job??={schema:1,policy,model,requests:[],importID:randomUUID(),createdAt:new Date().toISOString()};
  const persist=()=>atomicJSON(file,job);await persist();
  if(job.resultProject)return {project:this.library.project(job.resultProject),ticket:job.resultTicket,requests:job.requests,importID:job.importID};
  const result=await run(this.guarded({job,controller:new AbortController(),persist}));
  if(job.stopRequested)throw Error(job.error||'Preparation planning stopped.');
  job.resultProject=result.id;job.resultTicket=result.tickets.at(-1).id;await persist();
  return {project:result,ticket:job.resultTicket,requests:job.requests,importID:job.importID};
 }
 guarded({job,project,ticket,controller,persist}){
  persist??=()=>this.save(job,project,ticket);
  return {complete:async options=>{
   if(job.stopRequested)throw Error('Preparation stopped by you.');
   if(options.model&&options.model!==MODEL)throw Error('A model change would bypass the workload budget.');
   const input=inputReservation(options),output=MAX_OUTPUT,limits=POLICIES[job.policy];
   const used=job.requests.reduce((s,r)=>({input:s.input+r.input,output:s.output+r.output}),{input:0,output:0});
   if(job.requests.length>=MAX_REQUESTS||used.input+input>limits.input||used.output+output>limits.output)throw Error('Hard preparation budget reached. Completed lessons are saved. No further model request was sent.');
   const reservation={input,output,status:'reserved',at:new Date().toISOString()};job.requests.push(reservation);await persist();
   let result,error;
   try{result=await this.library.ai.complete({...options,model:MODEL,maxOutputTokens:output,signal:AbortSignal.any([controller.signal,AbortSignal.timeout(180000)])});return result;}
   catch(e){error=e;throw e;}
   finally{
    const usage=normalizedUsage(result?.usage||error?.usage);
    if(usage&&usage.inputTokens<=input&&usage.outputTokens<=output){reservation.input=usage.inputTokens;reservation.output=usage.outputTokens;reservation.usage=usage;reservation.status=error?'failed':'completed';}
    else{reservation.status='unknown';job.stopRequested=true;job.error=(error?error.message+' ':'')+'Usage was unavailable or exceeded its reservation. Full reservation retained; preparation stopped.';}
    await persist();
   }
  }};
 }
 async run(context){const {job,project,ticket}=context;try{
  const ai=this.guarded(context);
  for(const id of job.coreIds){
   if(job.stopRequested)throw Error(job.error||'Preparation stopped by you.');
   if(!this.library.get(project.id,id)?.evidence){job.activeConcept=id;await this.save(job,project,ticket);await this.library.generate(project.id,id,MODEL,{ai});}
   job.completed=job.coreIds.filter(id=>!!this.library.get(project.id,id)?.evidence);await this.save(job,project,ticket);
  }
  if(job.stopRequested)throw Error(job.error||'Preparation stopped.');job.status='ready';job.activeConcept=null;
 }catch(e){job.status='paused';job.error=job.error||e.message;}
 finally{await this.save(job,project,ticket);}
 return job;
 }
}
