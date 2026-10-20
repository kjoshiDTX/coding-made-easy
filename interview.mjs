// Interview paths teach a reusable pattern. Syntax refreshers are optional support.
export const intervalSource='https://algs4.cs.princeton.edu/12oop/Interval1D.java.html';
export function planningPolicy(track,language){
 if(track!=='interview')return `For each personal project ticket work backwards from its concrete deliverable and construct a prerequisite-complete foundational curriculum for a learner new to ${language}. Aim for 15–40 concepts across a substantial specification, fewer when sufficient; do not pad a small task.`;
 return `INTERVIEW TRACK: First identify the underlying data structure and reusable algorithmic pattern targeted by each problem. Aim for 3–6 CORE concepts per ticket, maximum 8 including transitive prerequisites. Use fewer when sufficient. Build intuition from first principles: representation and essential operations; the pattern's trigger and mental model; the invariant and state transitions; independent application with edge cases and complexity. These are skills, not one module per detail in the target answer. For a data-structure problem teach its model and relevant operations before the algorithm. Explain necessary ${language} syntax inline in the first example, without assuming proficiency. Do not make installation, assignment, booleans, loops, functions, testing, or each edge case separate required concepts. Supply at most 3 OPTIONAL refreshers only when useful. Adjacent algorithms (e.g. event sweeps vs interval merging) belong to at most 2 optional extensions, not the prerequisite chain. Final practice must change the surface story or constraints to test transfer without revealing the target solution. Do not turn one question into a complete course in the language or data structure. Mark each concept kind as core, refresher, or extension. Ticket conceptIds include optional concepts for discoverability; core concepts must depend only on core concepts.`;
}
export function validateInterviewScope(plan){
 for(const c of plan.concepts){c.kind??='core';if(!['core','refresher','extension'].includes(c.kind))throw Error('Invalid interview concept kind.');}
 for(const t of plan.tickets){
  const all=new Set();const add=id=>{if(all.has(id))return;all.add(id);plan.concepts.find(c=>c.id===id).prerequisites.forEach(add);};t.conceptIds.forEach(add);
  const concepts=plan.concepts.filter(c=>all.has(c.id)),core=concepts.filter(c=>c.kind==='core');
  if(!core.length||core.length>8||concepts.filter(c=>c.kind==='refresher').length>3||concepts.filter(c=>c.kind==='extension').length>2)throw Error('Interview path is too broad: use 1–8 core skills, at most 3 optional refreshers and 2 extensions. No extra planning request was made.');
  if(core.some(c=>c.prerequisites.some(id=>plan.concepts.find(p=>p.id===id).kind!=='core')))throw Error('Optional interview refreshers cannot be required by the core path.');
 }
 return plan;
}
// Narrow, idempotent migration for the known overlong v1 interval path. Keep every
// original ID in its original ticket so lessons, chat, drafts and raw logs stay put.
export function refocusIntervalPlan(project){
 if(project.track!=='interview'||project.language!=='python'||project.curriculumVersion>=2||project.tickets.length!==1||project.concepts.length<15||!/^merge intervals$/i.test(project.title.trim())||!project.concepts.some(c=>c.title==='Contracts and closed-interval semantics'))return null;
 const p=structuredClone(project),ticket=p.tickets[0],prefix='interval-v2-';
 const definitions=[
  ['model','Intervals as a data structure','Represent a span with endpoints; reason visually about inclusive boundaries, intersection and containment.',[],[intervalSource,'https://docs.python.org/3/library/stdtypes.html#comparisons']],
  ['ordering','Ordering as a problem-solving tool','See why processing spans in start order reduces the state you need; trace ties and nested spans.',['model'],['https://docs.python.org/3/howto/sorting/',intervalSource]],
  ['scan','The sorted-scan pattern and its invariant','Trace finalized output and an active span; reason about the next decision and why earlier work remains valid.',['ordering'],['https://www.techinterviewhandbook.org/algorithms/interval/',intervalSource]],
  ['transfer','Independent interval practice and transfer','Use the model independently, justify edge cases and cost, then compare an adjacent interval task without adding a new prerequisite chain.',['scan'],['https://www.techinterviewhandbook.org/algorithms/interval/','https://docs.python.org/3/howto/sorting/']]
 ];
 const core=definitions.map(([id,title,why,prerequisites,sourceUrls])=>({id:prefix+id,title,why,prerequisites:prerequisites.map(x=>prefix+x),sourceUrls,kind:'core'}));
 if(core.some(c=>p.concepts.some(old=>old.id===c.id)))return null;
 for(const c of p.concepts){c.kind='previous';if(c.title==='Contracts and closed-interval semantics')c.sourceUrls=[intervalSource,'https://docs.python.org/3/library/stdtypes.html#comparisons'];}
 ticket.coreConceptIds=core.map(c=>c.id);ticket.conceptIds.push(...ticket.coreConceptIds);
 p.concepts.push(...core);p.curriculumVersion=2;return p;
}
