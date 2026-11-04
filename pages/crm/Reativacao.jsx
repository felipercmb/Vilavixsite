import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {RefreshCw,Phone,MessageCircle,ArrowRight,Check,Settings2,ChevronLeft,ChevronRight,CalendarDays,Clock3} from 'lucide-react';
import {PageHeader,SearchBox,Field,Empty,date,wpp} from './CRMUI.jsx';
import {createReactivationRepository,reactivationQueue,reactivationDay,nextReactivationDay,REACTIVATION_OUTCOMES} from '../../lib/reactivation.js';
import {reactivationSummary} from '../../lib/reactivation-model.js';
import '../../styles/reactivation.css';

const localStamp=value=>value?new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Sem registro';
const VIEW_LABELS={today:'A fazer hoje',due_today:'Marcados para hoje',overdue:'Retornos atrasados',scheduled:'Próximos dias',active:'Em acompanhamento',reactivated:'Reativados',closed:'Encerrados'};

export default function Reativacao({demo,currentProfile,corretoresList=[],invalidateContactWork,focusReactivationId,setFocusReactivationId,setMenu}) {
 const api=useMemo(()=>createReactivationRepository({demo}),[demo]);
 const admin=demo||currentProfile?.role==='admin';
 const [cases,setCases]=useState([]),[overview,setOverview]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [view,setView]=useState('today'),[query,setQuery]=useState(''),[selectedId,setSelectedId]=useState(null),[notes,setNotes]=useState([]),[notesLoading,setNotesLoading]=useState(false),[notesError,setNotesError]=useState('');
 const [drafts,setDrafts]=useState({}),[busy,setBusy]=useState(false),[config,setConfig]=useState(null),[confirmClose,setConfirmClose]=useState(false);
 const [day,setDay]=useState(reactivationDay),[showLastNote,setShowLastNote]=useState(false);
 useEffect(()=>{const timer=setInterval(()=>setDay(reactivationDay()),60000);return()=>clearInterval(timer);},[]);
 const request=useRef(null),live=useRef(true),selectedIdRef=useRef(selectedId);
 selectedIdRef.current=selectedId;
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const refresh=useCallback(async()=>{
  const [rows,info]=await Promise.all([api.getCases(),admin?api.getOverview():null]);
  if(!live.current)return;
  setCases(rows);setOverview(info);
  if(info)setConfig(previous=>previous||{worker_id:info.settings.worker_id||'',broker_ids:info.settings.broker_ids?.length?info.settings.broker_ids:info.receivingBrokers.map(b=>b.id),enabled:info.settings.enabled});
 },[api,admin]);
 useEffect(()=>{setLoading(true);setError('');refresh().catch(err=>{if(live.current)setError(err.message);}).finally(()=>{if(live.current)setLoading(false);});},[refresh]);
 const filtered=useMemo(()=>reactivationQueue(cases,view,query,day),[cases,view,query,day]);
 const current=cases.find(c=>String(c.id)===String(selectedId));
 const selectedIndex=filtered.findIndex(c=>String(c.id)===String(selectedId));
 const visibleNotes=notes.filter(n=>String(n.case_id)===String(selectedId));
 const lastNote=visibleNotes[0];
 useEffect(()=>{if(!filtered.some(c=>String(c.id)===String(selectedId)))setSelectedId(filtered[0]?.id??null);},[filtered,selectedId]);
 useEffect(()=>{
  if(focusReactivationId==null||loading)return;
  const target=cases.find(c=>String(c.id)===String(focusReactivationId));
  if(target){setView(target.status==='active'?'active':target.status);setQuery('');setSelectedId(target.id);}
  else setError('Acompanhamento não encontrado. Atualize a fila para conferir.');
  setFocusReactivationId?.(null);
 },[cases,loading,focusReactivationId,setFocusReactivationId]);
 const loadNotes=useCallback(async(id)=>{
  setNotesError('');setNotesLoading(true);
  try{const rows=await api.getNotes(id);if(live.current&&String(selectedIdRef.current)===String(id))setNotes(rows);}
  catch(err){if(live.current&&String(selectedIdRef.current)===String(id))setNotesError(err.message);}
  finally{if(live.current&&String(selectedIdRef.current)===String(id))setNotesLoading(false);}
 },[api]);
 useEffect(()=>{
  let valid=true;setNotes([]);setNotesError('');setConfirmClose(false);setShowLastNote(false);
  if(selectedId==null)return;
  setNotesLoading(true);
  api.getNotes(selectedId).then(rows=>{if(valid)setNotes(rows);}).catch(err=>{if(valid)setNotesError(err.message);}).finally(()=>{if(valid)setNotesLoading(false);});
  return()=>{valid=false;};
 },[api,selectedId]);
 const draft=drafts[selectedId]||{body:'',outcome:'sem_resposta',nextOn:nextReactivationDay(day)};
 const edit=patch=>setDrafts(previous=>({...previous,[selectedId]:{...draft,...patch}}));
 const activeDrafts=Object.values(drafts).some(d=>d.body?.trim());
 useEffect(()=>{if(!activeDrafts)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[activeDrafts]);
 const perform=async action=>{
  if(busy||!current)return;
  setBusy(true);setError('');setNotice('');
  const signature=JSON.stringify({id:current.id,...draft,body:draft.body.trim(),action});
  if(request.current?.signature!==signature)request.current={signature,id:crypto.randomUUID()};
  try {
   const args={id:current.id,body:draft.body.trim(),outcome:draft.outcome,nextOn:draft.nextOn,requestId:request.current.id};
   const saved=action==='record'?await api.record(args):await api.finish({...args,reactivated:action==='route'});
   if(!live.current)return;
   setCases(previous=>previous.map(c=>String(c.id)===String(saved.id)?{...c,...saved}:c));
   setDrafts(previous=>{const next={...previous};delete next[current.id];return next;});request.current=null;setConfirmClose(false);
   const message=action==='route'?`Lead reativado e entregue para ${saved.returned_broker_name}. A tarefa de primeiro contato foi criada.`:action==='close'?'Acompanhamento encerrado e motivo registrado.':`Comentário salvo. Próximo contato: ${date(saved.next_contact_on)}`;
   setNotice(message);invalidateContactWork?.();
   try{await refresh();if(String(selectedIdRef.current)===String(saved.id))await loadNotes(saved.id);}catch{setNotice(`${message} A lista não atualizou; clique em Atualizar fila para conferir.`);}
  }catch(err){if(live.current)setError(`${err.message} Seu comentário continua no formulário.`);}
  finally{if(live.current)setBusy(false);}
 };
 const saveConfig=async e=>{
  e.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
  try{const saved=await api.saveSettings({...config,broker_ids:config.broker_ids.filter(id=>id!==config.worker_id)});setConfig({...saved,worker_id:saved.worker_id||''});setOverview(previous=>({...previous,settings:saved}));setNotice(saved.enabled?'Reativação ativada. A fila é verificada automaticamente a cada hora.':'Configuração salva. A entrada automática está desativada.');}
  catch(err){setError(err.message);}finally{setBusy(false);}
 };
 const process=async()=>{
  setBusy(true);setError('');setNotice('');
  try{const result=await api.processQueue();setNotice(`${result.moved} lead${result.moved===1?'':'s'} encaminhado${result.moved===1?'':'s'} para reativação nesta verificação.`);invalidateContactWork?.();try{await refresh();}catch{setNotice('Verificação concluída. Atualize a lista para conferir os contatos.');}}
  catch(err){setError(err.message);}finally{setBusy(false);}
 };
 const summary=reactivationSummary(cases,day);
 const counts={today:summary.overdue+summary.dueToday,due_today:summary.dueToday,overdue:summary.overdue,scheduled:summary.scheduled,active:summary.active,reactivated:cases.filter(c=>c.status==='reactivated').length,closed:cases.filter(c=>c.status==='closed').length};
 const changeView=value=>{setView(value);setQuery('');};
 const profiles=demo?[{id:'demo-worker',nome:'Funcionária Exemplo',ativo:true},...corretoresList]:corretoresList;
 return <div className="crm-reactivation">
  <PageHeader title="Reativação de leads" description="Retome a conversa, registre o resultado e combine o próximo passo.">
   {admin&&setMenu&&<button className="crm-btn crm-btn-ghost" disabled={busy} onClick={()=>setMenu('remalho')}>Ver gestão do remalho<ArrowRight size={15}/></button>}
   <button className="crm-btn" disabled={busy||loading} onClick={()=>{setLoading(true);setError('');refresh().then(()=>selectedId!=null&&loadNotes(selectedId)).catch(err=>setError(err.message)).finally(()=>setLoading(false));}}><RefreshCw size={15}/>Atualizar fila</button>
  </PageHeader>
  {error&&<p className="crm-reactivation-error" role="alert">{error}</p>}
  {notice&&<p className="crm-reactivation-success" role="status">{notice}</p>}
  {admin&&overview&&<details className="crm-reactivation-settings" open={!overview.settings.worker_id||undefined}>
   <summary><Settings2 size={17}/><span>Configuração do fluxo</span><strong>{overview.settings.enabled?'Automação ativa':overview.settings.worker_id?'Automação desativada':'Aguardando funcionária'}</strong></summary>
   <form onSubmit={saveConfig}>
    <p>Contatos abertos sem atualização há 14 dias entram na fila da funcionária. Hoje, {overview.eligibleCount} contato{overview.eligibleCount===1?' atende':'s atendem'} ao critério.</p>
    <div className="crm-form-grid">
     <Field label="Conta da funcionária"><select value={config?.worker_id||''} disabled={busy} onChange={e=>setConfig(p=>({...p,worker_id:e.target.value,enabled:e.target.value?p.enabled:false,broker_ids:p.broker_ids.filter(id=>id!==e.target.value)}))}><option value="">Selecione após cadastrar a funcionária</option>{profiles.filter(p=>p.ativo!==false).map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></Field>
     <div className="crm-reactivation-activation"><label><input type="checkbox" checked={config?.enabled||false} disabled={busy||!config?.worker_id} onChange={e=>setConfig(p=>({...p,enabled:e.target.checked}))}/>Ativar entrada automática após 14 dias</label><small>A conta selecionada recebe apenas os contatos encaminhados para ela.</small></div>
    </div>
    <fieldset disabled={busy} className="crm-reactivation-team"><legend>Roleta exclusiva dos reativados</legend><p>Os participantes abaixo já recebem leads. Pausas nas regras de distribuição também valem para esta roleta.</p>
     {overview.receivingBrokers.filter(b=>b.id!==config?.worker_id).map(b=><label key={b.id}><input type="checkbox" checked={config?.broker_ids.includes(b.id)||false} onChange={e=>setConfig(p=>({...p,broker_ids:e.target.checked?[...p.broker_ids,b.id]:p.broker_ids.filter(id=>id!==b.id)}))}/>{b.nome}</label>)}
     {!overview.receivingBrokers.length&&<p>Nenhum corretor está habilitado para receber leads. Revise as regras da roleta.</p>}
    </fieldset>
    <p className="crm-reactivation-hint">Para contatos antigos, o cálculo usa os registros disponíveis de criação, mudança de etapa e comentários. Novas atualizações passam a ser acompanhadas automaticamente. Fechados e descartados ficam fora.</p>
    {!overview.schedulerInstalled&&<p className="crm-reactivation-error">A verificação automática ainda precisa ser instalada no servidor.</p>}
    <div className="crm-actions"><button className="crm-btn crm-btn-primary" disabled={busy||!config}>{busy?'Salvando…':'Salvar configuração'}</button><button type="button" className="crm-btn" disabled={busy||!overview.settings.enabled} onClick={process}>Verificar leads agora</button></div>
   </form>
  </details>}
  {!loading&&<section className="crm-reactivation-day" aria-labelledby="reactivation-day-heading">
   <header><div><h2 id="reactivation-day-heading">Sua fila de acompanhamento</h2><p>{summary.active} contato{summary.active===1?'':'s'} em aberto · calendário de Brasília</p></div><span><CalendarDays size={16}/>{date(day)}</span></header>
   <div className="crm-reactivation-day-counts">{[['overdue','Atrasados',summary.overdue,'Comece por estes retornos'],['due_today','Para hoje',summary.dueToday,'Contatos combinados para hoje'],['scheduled','Agendados',summary.scheduled,'Próximos dias']].map(([id,label,total,description])=><button key={id} className={`${view===id?'selected ':''}${id==='overdue'&&total?'has-overdue':''}`} disabled={busy} aria-pressed={view===id} onClick={()=>changeView(id)}><span>{label}<strong>{total}</strong></span><small>{description}</small><ChevronRight size={16}/></button>)}</div>
  </section>}
  <div className="crm-tabs crm-reactivation-tabs" aria-label="Fila de reativação">{[['today','A fazer hoje'],['active','Todos em acompanhamento'],['reactivated','Reativados'],['closed','Encerrados']].map(([id,label])=><button key={id} disabled={busy} className={view===id?'active':''} aria-pressed={view===id} onClick={()=>changeView(id)}>{label}<span>{counts[id]}</span></button>)}</div>
  {loading?<div className="crm-card crm-reactivation-loading" role="status">Carregando os acompanhamentos…</div>:<div className="crm-reactivation-workspace">
   <section className="crm-card crm-reactivation-queue" aria-label="Contatos para reativação"><header className="crm-reactivation-queue-heading"><h2>{VIEW_LABELS[view]}</h2><span>{filtered.length} contato{filtered.length===1?'':'s'}</span></header><fieldset className="crm-reactivation-search-field" disabled={busy}><SearchBox value={query} onChange={setQuery} placeholder="Nome, telefone ou interesse"/></fieldset>
    {!filtered.length?<Empty title={view==='today'?'Nenhum contato pendente hoje':'Nenhum acompanhamento nesta lista'} text={query?'Tente buscar pelo nome, telefone ou interesse do contato.':admin&&!overview?.settings.worker_id?'Cadastre a funcionária, vincule a conta acima e ative o fluxo para começar.':view==='overdue'?'Os retornos pendentes estão em dia. Veja os contatos de hoje ou os próximos agendamentos.':'Os próximos acompanhamentos aparecem aqui conforme a data combinada.'}/>:<ul>{filtered.map(c=><li key={c.id}><button disabled={busy} className={String(selectedId)===String(c.id)?'selected':''} aria-pressed={String(selectedId)===String(c.id)} onClick={()=>setSelectedId(c.id)}><strong>{c.lead_name}</strong><span>{c.interest||'Interesse a confirmar'}</span><small>{c.status==='active'?`${c.next_contact_on<day?'Em atraso · ':''}Contato em ${date(c.next_contact_on)}`:c.status==='reactivated'?`Entregue a ${c.returned_broker_name}`:'Acompanhamento encerrado'}</small>{drafts[c.id]?.body?.trim()&&<em className="crm-reactivation-draft-tag">Rascunho nesta tela</em>}</button></li>)}</ul>}
   </section>
   <section className="crm-card crm-reactivation-detail" aria-label="Acompanhamento selecionado">
    {!current?<Empty title="Seu espaço de acompanhamento" text="Selecione um contato para ver o histórico, registrar a tentativa e definir o próximo passo."/>:<>
     <nav className="crm-reactivation-case-nav" aria-label="Navegar pelos contatos da fila"><span>Contato {selectedIndex+1} de {filtered.length}</span><div><button className="crm-btn crm-btn-ghost" disabled={busy||selectedIndex<=0} onClick={()=>setSelectedId(filtered[selectedIndex-1].id)}><ChevronLeft size={16}/>Anterior</button><button className="crm-btn crm-btn-ghost" disabled={busy||selectedIndex<0||selectedIndex>=filtered.length-1} onClick={()=>setSelectedId(filtered[selectedIndex+1].id)}>Próximo<ChevronRight size={16}/></button></div></nav>
     <header><div><h2>{current.lead_name}</h2><p>{current.interest||'Interesse a confirmar'}</p></div><span className="crm-reactivation-state">{current.status==='active'?'Em reativação':current.status==='reactivated'?'Reativado':'Encerrado'}</span></header>
     <dl className="crm-reactivation-context"><div><dt>Responsável anterior</dt><dd>{current.previous_broker_name||'Não informado'}</dd></div><div><dt>Entrou no remalho</dt><dd>{localStamp(current.received_at)}</dd></div><div><dt>Último registro antes da entrada</dt><dd>{localStamp(current.inactive_since)}</dd></div><div><dt>{current.status==='active'?'Próximo contato':'Finalização'}</dt><dd className={current.status==='active'&&current.next_contact_on<day?'crm-reactivation-overdue-text':''}>{current.status==='active'?`${date(current.next_contact_on)}${current.next_contact_on<day?' · Em atraso':''}`:localStamp(current.finished_at)}</dd></div></dl>
     {current.status==='active'&&<>
      <section className="crm-reactivation-last-contact" aria-label="Contexto do último contato"><div><Clock3 size={16}/><h3>Último contato registrado</h3></div>{notesLoading?<p role="status">Consultando o histórico…</p>:notesError?<p>Não foi possível consultar o último registro. Use a opção de tentar novamente no histórico abaixo.</p>:lastNote?<><p className="crm-reactivation-last-meta">{REACTIVATION_OUTCOMES[lastNote.outcome]||lastNote.outcome} · {localStamp(lastNote.created_at)} · {lastNote.author_name}</p><p className="crm-reactivation-last-body">{showLastNote||lastNote.body.length<=220?lastNote.body:`${lastNote.body.slice(0,220)}…`}</p>{lastNote.body.length>220&&<button className="crm-link" aria-expanded={showLastNote} onClick={()=>setShowLastNote(v=>!v)}>{showLastNote?'Recolher comentário':'Ler comentário completo'}</button>}</>:<p>Este será o primeiro contato desta reativação. Confira o interesse e registre como foi a conversa.</p>}</section>
      <div className="crm-actions crm-reactivation-contact">{current.lead?.telefone&&<><a className="crm-btn" href={`tel:${current.lead.telefone.replace(/[^+\d]/g,'')}`}><Phone size={15}/>{current.lead.telefone}</a>{wpp(current.lead.telefone)&&<a className="crm-btn" target="_blank" rel="noreferrer" href={wpp(current.lead.telefone)}><MessageCircle size={15}/>Abrir conversa</a>}</>}{current.lead?.email&&<a className="crm-link" href={`mailto:${current.lead.email}`}>{current.lead.email}</a>}</div>
      <form className="crm-reactivation-note" onSubmit={e=>{e.preventDefault();perform('record');}}>
       <div className="crm-reactivation-note-heading"><h3>Registrar tentativa</h3><span>{draft.body.trim()?'Rascunho nesta tela':'Preencha após o contato'}</span></div><Field label="Como foi o contato? *"><textarea rows={4} value={draft.body} minLength={3} maxLength={4000} required disabled={busy} onChange={e=>edit({body:e.target.value})} placeholder="Conte o que foi conversado, o interesse atual e o próximo passo."/></Field>
       <div className="crm-form-grid"><Field label="Resultado"><select value={draft.outcome} disabled={busy} onChange={e=>edit({outcome:e.target.value})}>{['sem_resposta','em_conversa','retorno_agendado'].map(value=><option key={value} value={value}>{REACTIVATION_OUTCOMES[value]}</option>)}</select></Field><Field label="Próximo contato *"><input type="date" required min={day} max={nextReactivationDay(day,30)} value={draft.nextOn} disabled={busy} onInput={e=>edit({nextOn:e.target.value})}/></Field></div>
       <div className="crm-reactivation-date-shortcuts" aria-label="Atalhos para o próximo contato"><span>Agendar para</span>{[[0,'Hoje'],[1,'Amanhã'],[7,'Em 7 dias']].map(([offset,label])=><button type="button" key={offset} className={draft.nextOn===nextReactivationDay(day,offset)?'selected':''} aria-pressed={draft.nextOn===nextReactivationDay(day,offset)} disabled={busy} onClick={()=>edit({nextOn:nextReactivationDay(day,offset)})}>{label}</button>)}</div>
       <button className="crm-btn crm-btn-primary" disabled={busy||draft.body.trim().length<3}><Check size={15}/>{busy?'Salvando…':'Salvar comentário e próxima tarefa'}</button>
       <p className="crm-reactivation-hint">Salvar conclui a tarefa atual e agenda o próximo retorno. Ao alternar entre contatos desta tela, o rascunho fica guardado; ao sair desta área do CRM, ele será perdido.</p>
      </form>
      <div className="crm-reactivation-handoff"><h3>O lead voltou a ter interesse?</h3><p>Use o comentário acima como resumo para o próximo corretor. A entrega segue a vez na roleta dos reativados e gera uma tarefa para ele.</p><button className="crm-btn crm-btn-primary" disabled={busy||draft.body.trim().length<3} onClick={()=>perform('route')}>Reativar e distribuir<ArrowRight size={15}/></button>
       {!confirmClose?<button className="crm-link" disabled={busy} onClick={()=>setConfirmClose(true)}>Encerrar sem interesse</button>:<div className="crm-reactivation-close"><p>O contato será marcado como descartado, com o motivo registrado no histórico.</p><button className="crm-btn" disabled={busy} onClick={()=>setConfirmClose(false)}>Continuar acompanhamento</button><button className="crm-btn crm-btn-danger" disabled={busy||draft.body.trim().length<3} onClick={()=>perform('close')}>Confirmar encerramento</button></div>}
      </div>
     </>}
     {current.status==='reactivated'&&<p className="crm-reactivation-success">Entregue para {current.returned_broker_name}. O histórico segue junto com o contato.</p>}
     <section className="crm-reactivation-history"><div className="crm-reactivation-history-heading"><h3>Histórico de tentativas</h3>{!notesLoading&&!notesError&&<span>{visibleNotes.length} registro{visibleNotes.length===1?'':'s'}</span>}</div>{notesLoading?<p role="status">Carregando histórico…</p>:notesError?<div role="alert"><p>{notesError}</p><button className="crm-btn" onClick={()=>loadNotes(current.id)}>Tentar carregar histórico</button></div>:!visibleNotes.length?<p className="crm-text-muted">Nenhuma tentativa registrada nesta reativação.</p>:<ol>{visibleNotes.map(n=><li key={n.id}><div><strong>{REACTIVATION_OUTCOMES[n.outcome]||n.outcome}</strong><time dateTime={n.created_at}>{localStamp(n.created_at)}</time></div><p>{n.body}</p><small>{n.author_name}</small></li>)}</ol>}</section>
    </>}
   </section>
  </div>}
 </div>;
}
