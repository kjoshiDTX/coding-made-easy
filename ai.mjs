const BASE='https://api.openai.com/v1';
export async function consumeResponse(body,onDelta=()=>{},onUsage=()=>{}){
 let buffer='',text='',completed=false;const decoder=new TextDecoder();
 for await(const bytes of body){buffer+=decoder.decode(bytes,{stream:true});if(buffer.length>2_000_000)throw Error('AI stream was too large.');
  let boundary;
  while((boundary=buffer.search(/\r?\n\r?\n/))>=0){const chunk=buffer.slice(0,boundary);const separator=buffer.slice(boundary).match(/^\r?\n\r?\n/)[0];buffer=buffer.slice(boundary+separator.length);const data=chunk.split(/\r?\n/).filter(x=>x.startsWith('data:')).map(x=>x.slice(5).trimStart()).join('\n');if(!data||data==='[DONE]')continue;let e;try{e=JSON.parse(data);}catch{throw Error('OpenAI returned an invalid stream event.');}
   if(e.type==='response.output_text.delta'){text+=e.delta||'';if(text.length>300000)throw Error('AI response was too large.');onDelta(e.delta||'');}
   if(['response.completed','response.failed','response.incomplete'].includes(e.type))onUsage(e.response?.usage||null);
   if(e.type==='response.completed')completed=true;
   if(['response.failed','response.incomplete','error'].includes(e.type)){const code=e.response?.error?.code||e.error?.code||e.code||e.type;throw Error(`AI request did not complete (${String(code).replace(/[^a-zA-Z0-9_.-]/g,'').slice(0,100)}). Check your ChatGPT plan access and usage limits.`);}
  }
 }
 if(!completed)throw Error('The AI stream ended before completion. Retry the request.');
 return text;
}
export class AI {
 constructor(auth){this.auth=auth;this.catalog=null;}
 async models(){const token=await this.auth.accessToken();const r=await fetch(`${BASE}/models`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`ChatGPT model access failed (HTTP ${r.status}).`);const d=await r.json();const models=(d.models||[]).filter(m=>m.visibility==='list').map(m=>({id:m.slug,name:m.display_name||m.slug}));if(!models.length)throw Error('No eligible ChatGPT models were returned.');this.catalog=models;return models;}
 async complete({model,instructions,input,onDelta,signal,maxOutputTokens}){const catalog=this.catalog||await this.models();const selected=model||catalog.find(m=>m.id==='gpt-6.1-sol')?.id||catalog[0].id;if(!catalog.some(m=>m.id===selected))throw Error('Select a model available to this account.');const token=await this.auth.accessToken();const r=await fetch(`${BASE}/responses`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({model:selected,store:false,stream:true,instructions,input,...(maxOutputTokens?{max_output_tokens:maxOutputTokens}:{})}),signal:signal||AbortSignal.timeout(180000)});if(!r.ok)throw Error(`AI request failed (HTTP ${r.status}). Check your ChatGPT plan access and usage limits.`);let usage=null;try{return {text:await consumeResponse(r.body,onDelta,value=>{usage=value;}),model:selected,usage};}catch(e){e.usage=usage;throw e;}}
}
