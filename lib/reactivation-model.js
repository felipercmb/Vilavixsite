export const REACTIVATION_OUTCOMES = {sem_resposta:'Sem resposta',em_conversa:'Em conversa',retorno_agendado:'Retorno combinado',reativado:'Reativado',sem_interesse:'Sem interesse'};
export const reactivationDay = (date=new Date()) => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export function nextReactivationDay(day=reactivationDay(),days=1) { const date=new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate()+days); return date.toISOString().slice(0,10); }
export function reactivationQueue(cases,view,query='',day=reactivationDay()) {
 const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 return cases.filter(c=>(view==='today'?c.status==='active'&&c.next_contact_on<=day:view==='active'?c.status==='active':c.status===view)
  && fold([c.lead_name,c.interest,c.lead?.telefone,c.previous_broker_name].join(' ')).includes(fold(query)))
  .sort((a,b)=>String(a.next_contact_on).localeCompare(String(b.next_contact_on))||Number(a.id)-Number(b.id));
}
