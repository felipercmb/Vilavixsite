import {reactivationDay} from './reactivation-model.js';
const fullDay=day=>new Date(`${day}T12:00:00Z`).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'long',year:'numeric'});
export function groupManagementActivities(items) {
 const groups=new Map();
 for(const item of items) {
  const day=reactivationDay(new Date(item.created_at));
  if(!groups.has(day))groups.set(day,{day,label:fullDay(day),items:[]});
  groups.get(day).items.push(item);
 }
 return [...groups.values()].sort((a,b)=>b.day.localeCompare(a.day)).map(group=>({...group,items:[...group.items].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)||Number(b.id)-Number(a.id))}));
}
export function managementPeriodLabel({from,to}) {
 const label=day=>new Date(`${day}T12:00:00Z`).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'short',year:'numeric'});
 if(!from)return `Todo o histórico até ${label(to)}`;
 if(from===to)return label(to);
 return `${label(from)} a ${label(to)}`;
}
