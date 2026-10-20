const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function bpeSteps(text='banana'){
 let tokens=[...new TextEncoder().encode(text)].map((byte,id)=>({id:byte,bytes:[byte]})),nextId=256;
 const steps=[{title:'Start with UTF-8 bytes',tokens:structuredClone(tokens),detail:'Every byte starts as one symbol. Emoji may span several bytes.'}];
 for(let n=0;n<8&&tokens.length>1;n++){
  const counts=new Map();for(let i=0;i<tokens.length-1;i++){const key=`${tokens[i].id},${tokens[i+1].id}`;counts.set(key,(counts.get(key)||0)+1);}
  const [pair,count]=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];const merged=[];
  for(let i=0;i<tokens.length;){if(i+1<tokens.length&&`${tokens[i].id},${tokens[i+1].id}`===pair){merged.push({id:nextId,bytes:[...tokens[i].bytes,...tokens[i+1].bytes]});i+=2;}else merged.push(tokens[i++]);}
  tokens=merged;steps.push({title:`Merge ${pair} → ${nextId}`,tokens:structuredClone(tokens),detail:`The most frequent adjacent pair occurs ${count} time(s). Replace non-overlapping matches from left to right. This toy training trace uses a fixed tie-break; it is not Qwen's tokenizer.`});nextId++;
 }
 return steps;
}
export function mountVisual(container,diagram,{bpe=false}={}){
 if(!diagram&&!bpe)return;
 const root=document.createElement('section');root.className='interactive-visual';let position=0,text='banana';
 const frames=()=>bpe?bpeSteps(text):diagram.steps.map(step=>({title:step.label,detail:step.detail}));
 const render=()=>{const steps=frames(),frame=steps[position];root.innerHTML=`<h3>${bpe?'Watch byte-pair merging':escape(diagram.title)}</h3>${bpe?'<label>Try a short UTF-8 string <input aria-label="BPE visual input" maxlength="40"></label>':''}<p class="visual-counter">STEP ${position+1} / ${steps.length}</p><strong>${escape(frame.title)}</strong>${frame.tokens?`<div class="byte-tokens">${frame.tokens.map(t=>`<span><b>${t.id}</b><small>${t.bytes.map(b=>b.toString(16).padStart(2,'0')).join(' ')}</small></span>`).join('')}</div>`:''}<p>${escape(frame.detail)}</p><div class="visual-controls"><button data-direction="-1" ${position?'':'disabled'}>← Previous</button><button data-direction="0">Reset</button><button data-direction="1" ${position<steps.length-1?'':'disabled'}>Next →</button></div>`;
  const input=root.querySelector('input');if(input){input.value=text;input.onchange=()=>{text=input.value;position=0;render();};}
  root.querySelectorAll('[data-direction]').forEach(button=>button.onclick=()=>{const direction=Number(button.dataset.direction);position=direction?Math.max(0,Math.min(steps.length-1,position+direction)):0;render();});
 };render();container.append(root);
}
