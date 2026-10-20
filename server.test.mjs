import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import net from 'node:net';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

test('HTTP app saves scoped completion, resume position and feedback across a server restart',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'coding-http-'));let child;
 const listener=net.createServer();await new Promise(resolve=>listener.listen(0,'127.0.0.1',resolve));const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));const origin=`http://127.0.0.1:${port}`;
 const start=async()=>{child=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:String(port),CODING_LEARNING_ROOT:path.join(root,'learning'),CODING_AUTH_DIR:path.join(root,'auth')},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{let error='';const timer=setTimeout(()=>reject(Error('Server did not start: '+error)),10000);child.stderr.on('data',data=>error+=data);child.stdout.once('data',()=>{clearTimeout(timer);resolve();});child.once('exit',()=>{clearTimeout(timer);reject(Error('Server exited: '+error));});});};
 const stop=async()=>{const exited=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await exited;};
 const login=async()=>{const page=await fetch(origin),cookie=page.headers.get('set-cookie').split(';')[0],status=await (await fetch(origin+'/api/status',{headers:{cookie}})).json();return {cookie,csrf:status.csrf};};
 try{await start();let session=await login();const post=async(url,body,headers={})=>fetch(origin+url,{method:'POST',headers:{cookie:session.cookie,origin,'x-csrf-token':session.csrf,'content-type':'application/json',...headers},body:JSON.stringify(body)});
  assert.equal((await post('/api/done',{project:'minifhir',id:'program',stage:'learn',done:true},{'x-csrf-token':'bad'})).status,403);
  const unopened=await (await fetch(origin+'/api/lesson?project=minifhir&id=program',{headers:{cookie:session.cookie}})).json();assert.equal(unopened.lesson,null);assert.equal(unopened.needsAudit,true);
  assert.equal((await post('/api/prepare',{project:'minifhir',ticket:'T1'})).status,400,'personal paths must not start eager interview generation');
  assert.equal((await post('/api/done',{project:'minifhir',id:'program',stage:'learn',done:true})).status,200);
  assert.equal((await post('/api/selection',{project:'minifhir',id:'program',stage:'practice'})).status,200);
  assert.equal((await post('/api/feedback',{project:'minifhir',id:'program',stage:'practice',note:'Test feedback in a disposable workspace'})).status,200);
  await stop();await start();session=await login();const projects=await (await fetch(origin+'/api/projects',{headers:{cookie:session.cookie}})).json();assert.equal(projects.progress['minifhir:program'].done.learn,true);assert.equal(projects.selection.stage,'practice');assert.equal(projects.projects[0].title,'llm inference project');assert.match(projects.projects[0].spec,/arbitrary UTF-8 including emoji/);
  assert.match(await readFile(path.join(root,'learning/feedback/requests.jsonl'),'utf8'),/Test feedback/);assert.equal((await post('/api/session/end',{project:'minifhir',id:'program'})).status,200);await stop();child=null;
 }finally{child?.kill('SIGKILL');await rm(root,{recursive:true,force:true});}
});
