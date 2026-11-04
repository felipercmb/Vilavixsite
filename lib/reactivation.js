import { supabase } from './supabase.js';
import { readAllRows } from './supabase-pagination.js';

import {reactivationDay,nextReactivationDay} from './reactivation-model.js';
export {REACTIVATION_OUTCOMES,reactivationDay,nextReactivationDay,reactivationQueue} from './reactivation-model.js';
const confirmed = async query => { const {data,error}=await query; if(error)throw error; if(data==null)throw new Error('O banco não confirmou a operação. Atualize e tente novamente.'); return data; };

export function createReactivationRepository({demo=false}={}) {
 if(demo) {
  if(!import.meta.env.DEV) throw new Error('A revisão local não está disponível em produção.');
  return demoRepository();
 }
 return {
  getCases:()=>confirmed(readAllRows(options=>supabase.from('reactivation_cases').select('*,lead:leads(id,nome,telefone,email,interesse,status,origem)',options).order('received_at',{ascending:false}).order('id'))),
  getNotes:id=>confirmed(readAllRows(options=>supabase.from('reactivation_notes').select('*',options).eq('case_id',id).order('created_at',{ascending:false}).order('id',{ascending:false}))),
  getOverview:()=>confirmed(supabase.rpc('reactivation_overview')),
  saveSettings:({worker_id,broker_ids,enabled})=>confirmed(supabase.rpc('save_reactivation_settings',{p_worker_id:worker_id||null,p_broker_ids:broker_ids,p_enabled:enabled})),
  processQueue:()=>confirmed(supabase.rpc('process_reactivation_queue',{p_limit:500})),
  record:({id,body,outcome,nextOn,requestId})=>confirmed(supabase.rpc('record_reactivation_contact',{p_case_id:id,p_body:body,p_outcome:outcome,p_next_on:nextOn,p_request_id:requestId})),
  finish:({id,body,reactivated,requestId})=>confirmed(supabase.rpc('finish_reactivation',{p_case_id:id,p_body:body,p_reactivated:reactivated,p_request_id:requestId})),
 };
}

function demoRepository() {
 const key='vilavix:reactivation:review:v2';
 const day=reactivationDay();
 const names=['Contato Demonstração 01','Contato Demonstração 02','Contato Demonstração 03'];
 const initial={settings:{worker_id:'demo-worker',enabled:true,broker_ids:['broker-demo-a','broker-demo-b']},cursor:-1,requests:{},notes:[{id:'demo-note-1',case_id:1,body:'Demonstração: cliente pediu opções com varanda em Itapuã. Combinado retomar a conversa para confirmar a faixa de valor.',outcome:'retorno_agendado',author_name:'Funcionária Exemplo',created_at:`${nextReactivationDay(day,-1)}T15:30:00-03:00`},{id:'demo-note-2',case_id:2,body:'Demonstração: primeira ligação sem resposta. Próxima tentativa ficou agendada para o dia seguinte.',outcome:'sem_resposta',author_name:'Funcionária Exemplo',created_at:`${nextReactivationDay(day,-3)}T10:00:00-03:00`}],cases:names.map((name,i)=>({id:i+1,lead_id:`recovery-demo-${i+1}`,worker_id:'demo-worker',lead_name:name,interest:i===1?'Apartamento em Itaparica':'Apartamento de 3 quartos',previous_broker_name:i===1?'Corretor Exemplo B':'Corretor Exemplo A',inactive_since:new Date(Date.now()-18*86400000).toISOString(),received_at:new Date(Date.now()-4*86400000).toISOString(),next_contact_on:i===2?nextReactivationDay():i===1?nextReactivationDay(day,-2):day,status:'active',lead:{nome:name,telefone:'',email:'',status:'atendimento',origem:'Demonstração local'}}))};
 const read=()=>{try{return JSON.parse(localStorage.getItem(key))||structuredClone(initial);}catch{return structuredClone(initial);}};
 const save=data=>localStorage.setItem(key,JSON.stringify(data));
 const receiving=[{id:'broker-demo-a',nome:'Corretor Exemplo A'},{id:'broker-demo-b',nome:'Corretor Exemplo B'}];
 const change=async(args,finish)=>{
  const data=read(),c=data.cases.find(row=>String(row.id)===String(args.id));
  if(!c)throw new Error('Contato não encontrado.');
  if(data.requests[args.requestId])return c;
  if(c.status!=='active')throw new Error('Acompanhamento já encerrado.');
  if(args.body.trim().length<3)throw new Error('Descreva o contato.');
  if(finish&&args.reactivated){
   if(!data.settings.broker_ids.length)throw new Error('A roleta está sem participantes.');
   data.cursor=(data.cursor+1)%data.settings.broker_ids.length;
   const broker=receiving.find(b=>b.id===data.settings.broker_ids[data.cursor]);
   c.status='reactivated';c.returned_broker_name=broker.nome;c.returned_broker_id=broker.id;c.finished_at=new Date().toISOString();
  }else if(finish){c.status='closed';c.finished_at=new Date().toISOString();}
  else c.next_contact_on=args.nextOn;
  data.notes.unshift({id:crypto.randomUUID(),case_id:c.id,body:args.body.trim(),outcome:finish?(args.reactivated?'reativado':'sem_interesse'):args.outcome,author_name:'Funcionária Exemplo',created_at:new Date().toISOString()});
  data.requests[args.requestId]=true;save(data);return c;
 };
 return {getCases:async()=>read().cases,getNotes:async id=>read().notes.filter(n=>String(n.case_id)===String(id)),getOverview:async()=>({settings:read().settings,receivingBrokers:receiving,eligibleCount:3,schedulerInstalled:true}),saveSettings:async settings=>{const d=read();d.settings=settings;save(d);return settings;},processQueue:async()=>({moved:0,enabled:read().settings.enabled}),record:args=>change(args,false),finish:args=>change(args,true)};
}
