import {reactivationDay,nextReactivationDay} from './reactivation-model.js';
export const MANAGEMENT_STATUSES={all:'Todas as situações',active:'Em acompanhamento',reactivated:'Reativados',closed:'Encerrados sem interesse',overdue:'Retorno atrasado',untouched:'Sem tentativa',due_today:'Retorno hoje'};
export function managementPeriod(preset,day=reactivationDay()) {
 const from=preset==='today'?day:preset==='7'?nextReactivationDay(day,-6):preset==='month'?`${day.slice(0,7)}-01`:preset==='all'?'':nextReactivationDay(day,-29);
 return {from,to:day};
}
export function managementParams(filters,casePage=1,activityPage=1) {
 if(!filters.to||filters.from&&filters.from>filters.to||filters.to>reactivationDay())throw new Error('Informe um período válido até hoje.');
 return {p_from:filters.from||null,p_to:filters.to,p_worker_id:filters.worker||null,p_status:filters.status||'all',p_query:(filters.query||'').trim(),p_page:casePage,p_activity_page:activityPage};
}
export const MANAGEMENT_CASE_LABELS={active:'Em acompanhamento',reactivated:'Reativado',closed:'Encerrado'};
