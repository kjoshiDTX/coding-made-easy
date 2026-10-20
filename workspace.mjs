import path from 'node:path';
import {mkdir,readFile,open,realpath,stat,rename,unlink} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {atomicJSON,readJSON} from './auth.mjs';

export const categories=['unknown','misread-requirement','off-by-one','invariant','data-model','control-flow','syntax','tooling','complexity','encoding'];
const digest=value=>createHash('sha256').update(value).digest('hex');
const id=value=>{if(typeof value!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(value))throw Error('Invalid context identifier.');return value;};
const bounded=(value,max)=>Buffer.from(String(value)).subarray(0,max).toString('utf8');
export async function acquireWorkspaceLock(root){
 const directory=path.join(root,'.workspace');await mkdir(directory,{recursive:true,mode:0o700});const file=path.join(directory,'server.lock');
 const create=async()=>{const handle=await open(file,'wx',0o600);try{await handle.writeFile(JSON.stringify({pid:process.pid}));await handle.sync();}finally{await handle.close();}};
 try{await create();}catch(e){if(e.code!=='EEXIST')throw e;const saved=JSON.parse(await readFile(file,'utf8'));if(!Number.isInteger(saved.pid)||saved.pid<1)throw Error('Invalid workspace lock. Inspect it before starting.');let alive=true;try{process.kill(saved.pid,0);}catch(check){if(check.code==='ESRCH')alive=false;else throw check;}if(alive)throw Error('This learning workspace is already open in another server. Use its existing browser session.');await unlink(file);await create();}
 return async()=>{const saved=JSON.parse(await readFile(file,'utf8'));if(saved.pid===process.pid)await unlink(file);};
}
export class Workspace {
 constructor(root,{legacyFile}={}){this.root=path.resolve(root);this.legacyFile=legacyFile;this.writes=Promise.resolve();this.sessionId=randomUUID();}
 resolve(relative){const target=path.resolve(this.root,relative);if(!target.startsWith(this.root+path.sep))throw Error('Invalid workspace path.');return target;}
 async load(){
  const file=this.resolve('.workspace/catalog.json');let manifest;
  try{manifest=await readJSON(file);}catch(e){if(!(e instanceof SyntaxError))throw e;manifest=await readJSON(file+'.backup');if(!manifest)throw e;}
  manifest??=await readJSON(file+'.backup');
  if(manifest){
   if(manifest.schema!==1)throw Error('Unsupported workspace version. No files were modified.');
   const data={projects:[],lessons:{},progress:{},sourceCache:{},seedVersion:manifest.seedVersion};
   const read=async ref=>{const content=await readFile(this.resolve(ref.file),'utf8');if(digest(content)!==ref.hash)throw Error('Saved data checksum mismatch. Restore a backup before continuing.');return JSON.parse(content);};
   for(const ref of manifest.projects)data.projects.push(await read(ref));
   for(const type of ['lessons','progress','sourceCache'])for(const [key,ref]of Object.entries(manifest[type]||{}))data[type][key]=await read(ref);
   this.manifest=manifest;return data;
  }
  if(this.legacyFile){let legacy;try{legacy=await readJSON(this.legacyFile);}catch(e){if(!(e instanceof SyntaxError))throw e;legacy=await readJSON(this.legacyFile+'.backup');if(!legacy)throw e;}legacy??=await readJSON(this.legacyFile+'.backup');if(legacy){
   if(legacy.schemaVersion&&legacy.schemaVersion>1)throw Error('Unknown legacy progress version.');
   await mkdir(this.resolve('.workspace/migrations'),{recursive:true,mode:0o700});
   // Archive learning data only. Never copy sibling credential files.
   await atomicJSON(this.resolve('.workspace/migrations/legacy-library.json'),legacy);
   await this.save(legacy);return legacy;
  }}
  return null;
 }
 projectDir(project){return `tracks/${project.track==='interview'?'interview/problems':'personal/projects'}/${id(project.id)}`;}
 conceptDir(project,concept){const ticket=project.tickets.find(t=>t.conceptIds.includes(concept));return `${this.projectDir(project)}/tickets/${id(ticket?.id||'shared')}/concepts/${id(concept)}`;}
 async save(data){
  const next={schema:1,seedVersion:data.seedVersion,projects:[],lessons:{},progress:{},sourceCache:{},savedAt:new Date().toISOString()};
  const put=async(base,value)=>{const content=JSON.stringify(value),hash=digest(content),file=`${base}.${hash}.json`,target=this.resolve(file);await mkdir(path.dirname(target),{recursive:true,mode:0o700});try{await readFile(target);}catch(e){if(e.code!=='ENOENT')throw e;await atomicJSON(target,value);}return {file,hash};};
  for(const project of data.projects){
   const base=this.projectDir(project);next.projects.push(await put(`${base}/project`,project));
   for(const ticket of project.tickets)await put(`${base}/tickets/${id(ticket.id)}/curriculum`,{ticket,concepts:project.concepts.filter(c=>ticket.conceptIds.includes(c.id))});
  }
  for(const type of ['lessons','progress'])for(const [key,value]of Object.entries(data[type]||{})){
   const split=key.indexOf(':'),project=data.projects.find(p=>p.id===key.slice(0,split));if(!project)throw Error('Orphaned saved context.');
   next[type][key]=await put(`${this.conceptDir(project,key.slice(split+1))}/${type==='lessons'?'lesson':'state'}`,value);
  }
  for(const [key,value]of Object.entries(data.sourceCache||{}))next.sourceCache[key]=await put(`cache/sources/${digest(key)}`,value);
  const file=this.resolve('.workspace/catalog.json');if(this.manifest)await atomicJSON(file+'.backup',this.manifest);
  // A single atomic manifest commits references to immutable content files.
  await atomicJSON(file,next);this.manifest=next;
 }
 async append(relative,event){
  const entry={...event,sessionId:this.sessionId,eventId:randomUUID(),at:new Date().toISOString()};
  const write=async()=>{const file=this.resolve(relative);await mkdir(path.dirname(file),{recursive:true,mode:0o700});const handle=await open(file,'a+',0o600);try{const {size}=await handle.stat();if(size){const last=Buffer.alloc(1);await handle.read(last,0,1,size-1);if(last[0]!==10)await handle.writeFile('\n');}await handle.writeFile(JSON.stringify(entry)+'\n');await handle.sync();}finally{await handle.close();}const parent=await open(path.dirname(file),'r');try{await parent.sync();}finally{await parent.close();}return entry;};
  const next=this.writes.then(write,write);this.writes=next;return next;
 }
 async event(project,concept,event){return this.append(`${this.conceptDir(project,concept)}/events.jsonl`,{project:project.id,concept,...event});}
 async chat(project,concept,event){return this.append(`${this.conceptDir(project,concept)}/chat.jsonl`,event);}
 async conversation(project,concept){
  // Read a bounded tail without pulling the full raw log into memory/context.
  const file=this.resolve(`${this.conceptDir(project,concept)}/chat.jsonl`);let handle;
  try{handle=await open(file,'r');const {size}=await handle.stat(),buffer=Buffer.alloc(Math.min(size,160000));await handle.read(buffer,0,buffer.length,size-buffer.length);let lines=buffer.toString('utf8').split('\n');if(size>buffer.length)lines.shift();return lines.filter(Boolean).flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}}).slice(-30);}catch(e){if(e.code==='ENOENT')return [];throw e;}finally{await handle?.close();}
 }
 async context(project,concept){
  const read=async(file,limit)=>{try{const handle=await open(this.resolve(file),'r');try{const buffer=Buffer.alloc(limit);const {bytesRead}=await handle.read(buffer,0,limit,0);return buffer.subarray(0,bytesRead).toString('utf8');}finally{await handle.close();}}catch(e){if(e.code==='ENOENT')return '';throw e;}};
  const summary=await read(`${this.conceptDir(project,concept)}/summary.md`,8000);
  return {profile:await read('learner/profile.md',8000),patterns:await read('learner/patterns.md',8000),summary,repoContext:project.repoContext||null};
 }
 async summarize(project,concept,progress){
  const counts=progress.mistakeCounts||{},rows=Object.entries(counts).map(([key,count])=>`- ${key}: ${count} observed event(s)`);
  const advice={encoding:'Trace text → UTF-8 bytes → symbols → reconstructed bytes → text; test emoji and mixed scripts.',invariant:'State the invariant, trace one iteration, and explain why it is preserved.', 'off-by-one':'Trace empty, one-element, and final-index cases before changing the loop.', 'misread-requirement':'Restate the exact input/output contract and edge cases before implementing.', 'data-model':'Draw the representation and trace each operation on a tiny example.', 'control-flow':'Predict a branch/loop trace before execution.',syntax:'Explain the unfamiliar syntax with one minimal compiling example.',tooling:'Separate toolchain/setup diagnostics from the algorithm.',complexity:'Count operations on increasing input sizes before optimizing.'};
  const recommendations=Object.keys(counts).filter(key=>counts[key]>0&&advice[key]).map(key=>`- ${key}: ${advice[key]}`).join('\n');
  const summary=bounded(`# ${project.title} / ${concept}\n\nUpdated: ${new Date().toISOString()}\n\nManual completion: ${JSON.stringify(progress.done||{})}\nIndependent evidence: ${JSON.stringify({passes:progress.passes,hints:progress.hints,revealed:progress.revealed})}\n\n${rows.join('\n')||'No classified mistakes recorded.'}\n\nLatest classification (hypothesis unless learner-reported): ${JSON.stringify(progress.lastClassification||null)}\nEvidence event: ${progress.lastMistakeEvent||'none'}\n\nSuggested review:\n${recommendations||'Collect evidence before prescribing remediation.'}\n\nObserved failures do not by themselves identify a misconception. Review unknown events before assigning a cause.\n`,8000);
  await this.writeSummary(`${this.conceptDir(project,concept)}/summary.md`,summary);
 }
 async writeSummary(relative,text){
  const file=this.resolve(relative);await mkdir(path.dirname(file),{recursive:true,mode:0o700});const temp=file+'.'+randomUUID()+'.tmp',handle=await open(temp,'wx',0o600);try{await handle.writeFile(text);await handle.sync();}finally{await handle.close();}await rename(temp,file);
 }
 async analyze(data){
  const groups=new Map();for(const [context,progress]of Object.entries(data.progress||{}))for(const [category,count]of Object.entries(progress.mistakeCounts||{})){if(category==='unknown'||!count)continue;const list=groups.get(category)||[];list.push({context,count,event:progress.lastMistakeEvent});groups.set(category,list);}
  const recurring=[...groups].filter(([,entries])=>new Set(entries.map(e=>e.context.split(':')[0])).size>=2);
  await this.writeSummary('learner/patterns.md',bounded(`# Cross-project observations\n\nThese are recorded categories, not a diagnosis or a mastery score. Only categories observed in at least two projects are promoted here. Raw events remain scoped.\n\n${recurring.map(([category,entries])=>`- ${category}: ${entries.reduce((sum,e)=>sum+e.count,0)} recorded events across ${new Set(entries.map(e=>e.context.split(':')[0])).size} projects. Evidence: ${entries.map(e=>`${e.context} (${e.event})`).join(', ')}`).join('\n')||'No cross-project patterns established yet.'}\n`,8000));
 }
 async repoContext(repo,files){
  if(typeof repo!=='string'||!Array.isArray(files)||files.length>20)throw Error('Choose a repo and up to 20 relative files.');
  const root=await realpath(repo);if(!(await stat(path.join(root,'.git'))).isDirectory()&&!(await stat(path.join(root,'.git'))).isFile())throw Error('Choose a Git repository.');
  let total=0;const selected=[];
  for(const relative of files){if(typeof relative!=='string'||relative.split(/[\\/]/).some(part=>part.startsWith('.')||/^(node_modules|credentials|secrets)$/i.test(part))||/\.(pem|key|p12)$/i.test(relative))throw Error('Select source files, excluding credentials and hidden files.');
   const file=await realpath(path.resolve(root,relative));if(!file.startsWith(root+path.sep))throw Error('Source must stay inside the selected repo.');const info=await stat(file);if(!info.isFile()||info.size>40000||total+info.size>100000)throw Error('Selected source files exceed the 100 KB context budget.');const content=await readFile(file,'utf8');if(content.includes('\0'))throw Error('Choose text source files.');total+=info.size;selected.push({path:relative,content});
  }
  return {root,files:selected,capturedAt:new Date().toISOString(),readOnly:true};
 }
}
