import {supabase} from './supabase.js';
import {readAllRows} from './supabase-pagination.js';
import {managementParams} from './reactivation-management-model.js';
import {reactivationDay,nextReactivationDay} from './reactivation-model.js';
const confirmed=async query=>{const {data,error}=await query;if(error)throw error;if(data==null)throw new Error('A consulta não foi confirmada. Tente atualizar o painel.');return data;};
export function createReactivationManagementRepository({demo=false}={}) {
 if(demo){if(!import.meta.env.DEV)throw new Error('A revisão não está disponível em produção.');return demoManagement();}
 return {
  getReport:async(filters,casePage,activityPage,signal)=>{
   let query=supabase.rpc('reactivation_admin_report',managementParams(filters,casePage,activityPage));
   if(signal)query=query.abortSignal(signal);return confirmed(query);
  },
  getHistory:id=>confirmed(readAllRows(options=>supabase.from('reactivation_notes').select('*',options).eq('case_id',id).order('created_at',{ascending:false}).order('id',{ascending:false}))),
 };
}

function demoManagement() {
 const day=reactivationDay(),at=(days,hour=12)=>`${nextReactivationDay(day,-days)}T${String(hour).padStart(2,'0')}:00:00-03:00`;
 const cases=Array.from({length:34},(_,i)=>{
  const status=i%5===0?'closed':i%3===0?'reactivated':'active';
  return {id:i+1,lead_id:`demo-management-${i+1}`,lead_name:`Contato Demonstração ${String(i+1).padStart(2,'0')}`,interest:i%2?'Apartamento de 3 quartos':'Casa em condomínio',worker_id:'demo-worker',worker_name:'Funcionária Exemplo',previous_broker_name:i%2?'Corretor Exemplo A':'Corretor Exemplo B',inactive_since:at(30+i),received_at:at(3+i%25),next_contact_on:nextReactivationDay(day,i%4-2),status,finished_at:status!=='active'?at(i%3,16):null,returned_broker_name:status==='reactivated'?(i%2?'Corretor Exemplo A':'Corretor Exemplo B'):null,lead_status:status==='reactivated'?(i%2?'visita':'fechado'):status==='closed'?'descartado':'atendimento',current_owner:status==='reactivated'?(i%2?'Corretor Exemplo A':'Corretor Exemplo B'):'Funcionária Exemplo'};
 });
 const notes=cases.flatMap((c,i)=>i%7===0&&c.status==='active'?[]:Array.from({length:1+i%4},(_,j)=>({id:i*10+j+1,case_id:c.id,lead_id:c.lead_id,lead_name:c.lead_name,interest:c.interest,worker_id:c.worker_id,worker_name:c.worker_name,status:c.status,previous_broker_name:c.previous_broker_name,returned_broker_name:c.returned_broker_name,author_id:j===0&&i%6===0?'demo-admin':'demo-worker',author_name:j===0&&i%6===0?'Administrador Exemplo':'Funcionária Exemplo',by_worker:!(j===0&&i%6===0),body:j%2?'Demonstração: cliente pediu novas opções de três quartos e combinou uma conversa para amanhã.':'Demonstração: ligação sem resposta. Registrado novo retorno para acompanhar o interesse.',outcome:c.status==='reactivated'&&j===i%4?'reativado':c.status==='closed'&&j===i%4?'sem_interesse':j%2?'em_conversa':'sem_resposta',created_at:at(i%3+(i%4-j),10+j)})));
 return {
  getHistory:async id=>notes.filter(n=>String(n.case_id)===String(id)).sort((a,b)=>b.created_at.localeCompare(a.created_at)),
  getReport:async(filters,casePage=1,activityPage=1)=>{
   managementParams(filters,casePage,activityPage);
   const inPeriod=t=>t&&(!filters.from||t.slice(0,10)>=filters.from)&&t.slice(0,10)<=filters.to;
   const base=cases.filter(c=>!filters.worker||c.worker_id===filters.worker),pn=notes.filter(n=>base.some(c=>c.id===n.case_id)&&inPeriod(n.created_at)),done=base.filter(c=>inPeriod(c.finished_at));
   const queue={active:base.filter(c=>c.status==='active').length,dueToday:base.filter(c=>c.status==='active'&&c.next_contact_on===day).length,overdue:base.filter(c=>c.status==='active'&&c.next_contact_on<day).length,untouched:base.filter(c=>c.status==='active'&&!notes.some(n=>n.case_id===c.id)).length};
   const q=(filters.query||'').toLocaleLowerCase(),matches=c=>(!q||[c.lead_name,c.interest,c.worker_name,c.previous_broker_name,c.returned_broker_name].join(' ').toLocaleLowerCase().includes(q))&&(!filters.status||filters.status==='all'||(filters.status==='overdue'?c.status==='active'&&c.next_contact_on<day:filters.status==='due_today'?c.status==='active'&&c.next_contact_on===day:filters.status==='untouched'?c.status==='active'&&!notes.some(n=>n.case_id===c.id):c.status===filters.status));
   const scoped=base.filter(matches),rows=scoped.filter(c=>inPeriod(c.received_at)||inPeriod(c.finished_at)||pn.some(n=>n.case_id===c.id)).map(c=>{const ns=notes.filter(n=>n.case_id===c.id).sort((a,b)=>b.created_at.localeCompare(a.created_at));return {...c,attempts:ns.length,last_attempt_at:ns[0]?.created_at||null,last_outcome:ns[0]?.outcome||null};}).sort((a,b)=>a.next_contact_on.localeCompare(b.next_contact_on)||b.id-a.id);
   const activities=pn.filter(n=>scoped.some(c=>c.id===n.case_id)).sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id-a.id);
   const reactivated=done.filter(c=>c.status==='reactivated').length,closed=done.filter(c=>c.status==='closed').length;
   const pagination={caseTotal:rows.length,casePage:Math.max(1,Math.min(casePage,Math.ceil(rows.length/20))),activityTotal:activities.length,activityPage:Math.max(1,Math.min(activityPage,Math.ceil(activities.length/20))),pageSize:20};
   const chartFrom=filters.from&&filters.from>nextReactivationDay(filters.to,-13)?filters.from:nextReactivationDay(filters.to,-13),daily=[];
   for(let d=chartFrom;d<=filters.to;d=nextReactivationDay(d)){const ns=pn.filter(n=>n.created_at.slice(0,10)===d);daily.push({day:d,attempts:ns.length,worker_attempts:ns.filter(n=>n.by_worker).length});}
   const deliveries=[...new Set(done.filter(c=>c.status==='reactivated').map(c=>c.returned_broker_name))].map(name=>{const cs=done.filter(c=>c.status==='reactivated'&&c.returned_broker_name===name);return {broker_name:name,received:cs.length,new:cs.filter(c=>c.lead_status==='novo').length,in_progress:cs.filter(c=>['atendimento','visita','proposta'].includes(c.lead_status)).length,won:cs.filter(c=>c.lead_status==='fechado').length,lost:0,reassigned:0};});
   return {period:{from:filters.from||null,to:filters.to,today:day,chartFrom},generatedAt:new Date().toISOString(),settings:{enabled:true,workerId:'demo-worker',workerName:'Funcionária Exemplo'},workers:[{id:'demo-worker',nome:'Funcionária Exemplo'}],metrics:{received:base.filter(c=>inPeriod(c.received_at)).length,attempts:pn.length,workerAttempts:pn.filter(n=>n.by_worker).length,supervisorAttempts:pn.filter(n=>!n.by_worker).length,contacted:new Set(pn.map(n=>n.case_id)).size,reactivated,closed,reactivationRate:reactivated+closed?Math.round(1000*reactivated/(reactivated+closed))/10:null},queue,daily,deliveries,cases:rows.slice((pagination.casePage-1)*20,pagination.casePage*20),activities:activities.slice((pagination.activityPage-1)*20,pagination.activityPage*20),pagination};
  },
 };
}
