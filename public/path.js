export function coreIds(ticket){return ticket.coreConceptIds||ticket.conceptIds;}
export function corePath(project){const ids=new Set(project.tickets.flatMap(coreIds));return project.concepts.filter(c=>ids.has(c.id));}
export function firstConcept(project){return coreIds(project.tickets[0])[0];}
export function navigationPath(project,id){const core=corePath(project);return core.some(c=>c.id===id)?project.tickets.flatMap(t=>coreIds(t).map(id=>project.concepts.find(c=>c.id===id))):project.concepts.filter(c=>!core.some(k=>k.id===c.id));}
