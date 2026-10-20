// Explicit opt-in setup. Exercises themselves keep network access disabled.
import {spawn} from 'node:child_process';
import {mkdir,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runtimePaths} from '../runtimes.mjs';
import {atomicJSON} from '../auth.mjs';
const app=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const root=process.env.CODING_LEARNING_ROOT||path.dirname(app),directory=path.join(root,'cache/resources/qwen');
const python=runtimePaths().python;if(!python)throw Error('Install Python first.');
await mkdir(directory,{recursive:true,mode:0o700});
const run=(tool,args)=>new Promise((resolve,reject)=>{const child=spawn(tool,args,{stdio:'inherit'}),timer=setTimeout(()=>child.kill('SIGKILL'),240000);child.on('error',reject);child.on('close',code=>{clearTimeout(timer);code===0?resolve():reject(Error('Qwen setup failed. Check the installer output.'));});});
console.log('Preparing the real Qwen2.5-0.5B tokenizer from Hugging Face, plus the tokenizers Python package. No model weights or inference service are used.');
await run(python,['-m','venv',path.join(directory,'venv')]);
await run(path.join(directory,'venv/bin/python'),['-m','pip','install','--disable-pip-version-check','tokenizers==0.22.1']);
const response=await fetch('https://huggingface.co/api/models/Qwen/Qwen2.5-0.5B',{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Could not resolve the official model revision.');
const revision=(await response.json()).sha;if(!/^[a-f0-9]{40}$/.test(revision))throw Error('Invalid model revision.');
const url=`https://huggingface.co/Qwen/Qwen2.5-0.5B/resolve/${revision}/tokenizer.json`,download=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!download.ok)throw Error('Tokenizer download failed.');
const chunks=[];let size=0;for await(const chunk of download.body){size+=chunk.length;if(size>30000000)throw Error('Tokenizer asset exceeds expected size.');chunks.push(chunk);}
const bytes=Buffer.concat(chunks),tokenizer=JSON.parse(bytes.toString('utf8'));if(tokenizer.model?.type!=='BPE')throw Error('Unexpected tokenizer format.');
const file=path.join(directory,'tokenizer.json');await writeFile(file+'.tmp',bytes,{mode:0o600});await rename(file+'.tmp',file);
await run(path.join(directory,'venv/bin/python'),['-c',`from tokenizers import Tokenizer; t=Tokenizer.from_file(${JSON.stringify(file)}); print('Real tokenizer smoke test:', len(t.encode('Hello, 😀', add_special_tokens=False).ids))`]);
await atomicJSON(path.join(directory,'ready.json'),{schema:1,model:'Qwen/Qwen2.5-0.5B',revision,url,sha256:createHash('sha256').update(bytes).digest('hex'),preparedAt:new Date().toISOString()});
console.log('Ready. In the app use os.environ["QWEN_TOKENIZER_PATH"] with tokenizers.Tokenizer.from_file. Compare raw text consistently with add_special_tokens=False; chat formatting is a separate variable.');
