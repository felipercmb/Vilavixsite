import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {RefreshCw,Phone,MessageCircle,ArrowRight,Check,Settings2} from 'lucide-react';
import {PageHeader,SearchBox,Field,Empty,date,stamp,wpp} from './CRMUI.jsx';
import {createReactivationRepository,reactivationQueue,reactivationDay,nextReactivationDay,REACTIVATION_OUTCOMES} from '../../lib/reactivation.js';
import '../../styles/reactivation.css';

export default function Reativacao({demo,currentProfile,corretoresList=[],invalidateContactWork,focusReactivationId,setFocusReactivationId}) {
 const api=useMemo(()=>createReactivationRepository({demo}),[demo]);
 const admin=demo||currentProfile?.role==='admin';
 const [cases,setCases]=useState([]),[overview,setOverview]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [view,setView]=useState('today'),[query,setQuery]=useState(''),[selectedId,setSelectedId]=useState(null),[notes,setNotes]=useState([]),[notesLoading,setNotesLoading]=useState(false),[notesError,setNotesError]=useState('');
 const [drafts,setDrafts]=useState({}),[busy,setBusy]=useState(false),[config,setConfig]=useState(null),[confirmClose,setConfirmClose]=useState(false);
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
 const filtered=useMemo(()=>reactivationQueue(cases,view,query),[cases,view,query]);
 const current=cases.find(c=>String(c.id)===String(selectedId));
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
  let valid=true;setNotes([]);setNotesError('');setConfirmClose(false);
  if(selectedId==null)return;
  setNotesLoading(true);
  api.getNotes(selectedId).then(rows=>{if(valid)setNotes(rows);}).catch(err=>{if(valid)setNotesError(err.message);}).finally(()=>{if(valid)setNotesLoading(false);});
  return()=>{valid=false;};
 },[api,selectedId]);
 const draft=drafts[selectedId]||{body:'',outcome:'sem_resposta',nextOn:nextReactivationDay()};
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
 const counts={today:reactivationQueue(cases,'today').length,active:cases.filter(c=>c.status==='active').length,reactivated:cases.filter(c=>c.status==='reactivated').length,closed:cases.filter(c=>c.status==='closed').length};
 const profiles=demo?[{id:'demo-worker',nome:'Funcionária Exemplo',ativo:true},...corretoresList]:corretoresList;
 return <>
  <PageHeader title="Reativação de leads" description="Uma conversa de cada vez. Registre a tentativa e deixe o próximo contato combinado.">
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
  <div className="crm-tabs crm-reactivation-tabs" aria-label="Fila de reativação">{[['today','A fazer hoje'],['active','Em acompanhamento'],['reactivated','Reativados'],['closed','Encerrados']].map(([id,label])=><button key={id} disabled={busy} className={view===id?'active':''} aria-pressed={view===id} onClick={()=>setView(id)}>{label}<span>{counts[id]}</span></button>)}</div>
  {loading?<div className="crm-card crm-reactivation-loading" role="status">Carregando os acompanhamentos…</div>:<div className="crm-reactivation-workspace">
   <section className="crm-card crm-reactivation-queue" aria-label="Contatos para reativação"><SearchBox value={query} onChange={setQuery} placeholder="Buscar contato, telefone ou interesse"/>
    {!filtered.length?<Empty title={view==='today'?'Nenhum contato pendente hoje':'Nenhum acompanhamento nesta lista'} text={admin&&!overview?.settings.worker_id?'Cadastre a funcionária, vincule a conta acima e ative o fluxo para começar.':'Os próximos acompanhamentos aparecem aqui conforme a data combinada.'}/>:<ul>{filtered.map(c=><li key={c.id}><button disabled={busy} className={String(selectedId)===String(c.id)?'selected':''} aria-pressed={String(selectedId)===String(c.id)} onClick={()=>setSelectedId(c.id)}><strong>{c.lead_name}</strong><span>{c.interest||'Interesse a confirmar'}</span><small>{c.status==='active'?`${c.next_contact_on<reactivationDay()?'Em atraso · ':''}Contato em ${date(c.next_contact_on)}`:c.status==='reactivated'?`Entregue a ${c.returned_broker_name}`:'Acompanhamento encerrado'}{drafts[c.id]?.body?.trim()?' · Rascunho':''}</small></button></li>)}</ul>}
   </section>
   <section className="crm-card crm-reactivation-detail" aria-label="Acompanhamento selecionado">
    {!current?<Empty title="Seu espaço de acompanhamento" text="Selecione um contato para ver o histórico, registrar a tentativa e definir o próximo passo."/>:<>
     <header><div><h2>{current.lead_name}</h2><p>{current.interest||'Interesse a confirmar'}</p></div><span className="crm-reactivation-state">{current.status==='active'?'Em reativação':current.status==='reactivated'?'Reativado':'Encerrado'}</span></header>
     <dl className="crm-reactivation-context"><div><dt>Responsável anterior</dt><dd>{current.previous_broker_name||'Não informado'}</dd></div><div><dt>Último registro antes da entrada</dt><dd>{stamp(current.inactive_since)}</dd></div><div><dt>{current.status==='active'?'Próximo contato':'Finalização'}</dt><dd>{current.status==='active'?date(current.next_contact_on):stamp(current.finished_at)}</dd></div></dl>
     {current.status==='active'&&<>
      <div className="crm-actions crm-reactivation-contact">{current.lead?.telefone&&<><a className="crm-btn" href={`tel:${current.lead.telefone.replace(/[^+\d]/g,'')}`}><Phone size={15}/>{current.lead.telefone}</a>{wpp(current.lead.telefone)&&<a className="crm-btn" target="_blank" rel="noreferrer" href={wpp(current.lead.telefone)}><MessageCircle size={15}/>Abrir conversa</a>}</>}{current.lead?.email&&<a className="crm-link" href={`mailto:${current.lead.email}`}>{current.lead.email}</a>}</div>
      <form className="crm-reactivation-note" onSubmit={e=>{e.preventDefault();perform('record');}}>
       <h3>Registrar tentativa</h3><Field label="Como foi o contato? *"><textarea rows={4} value={draft.body} minLength={3} maxLength={4000} required disabled={busy} onChange={e=>edit({body:e.target.value})} placeholder="Conte o que foi conversado, o interesse atual e o próximo passo."/></Field>
       <div className="crm-form-grid"><Field label="Resultado"><select value={draft.outcome} disabled={busy} onChange={e=>edit({outcome:e.target.value})}>{['sem_resposta','em_conversa','retorno_agendado'].map(value=><option key={value} value={value}>{REACTIVATION_OUTCOMES[value]}</option>)}</select></Field><Field label="Próximo contato *"><input type="date" required min={reactivationDay()} max={nextReactivationDay(reactivationDay(),30)} value={draft.nextOn} disabled={busy} onChange={e=>edit({nextOn:e.target.value})}/></Field></div>
       <button className="crm-btn crm-btn-primary" disabled={busy||draft.body.trim().length<3}><Check size={15}/>{busy?'Salvando…':'Salvar comentário e próxima tarefa'}</button>
       <p className="crm-reactivation-hint">O registro conclui a tarefa atual e cria a próxima. O rascunho fica mantido ao trocar de contato nesta tela.</p>
      </form>
      <div className="crm-reactivation-handoff"><h3>O lead voltou a ter interesse?</h3><p>Use o comentário acima como resumo para o próximo corretor. A entrega segue a vez na roleta dos reativados e gera uma tarefa para ele.</p><button className="crm-btn crm-btn-primary" disabled={busy||draft.body.trim().length<3} onClick={()=>perform('route')}>Reativar e distribuir<ArrowRight size={15}/></button>
       {!confirmClose?<button className="crm-link" disabled={busy} onClick={()=>setConfirmClose(true)}>Encerrar sem interesse</button>:<div className="crm-reactivation-close"><p>O contato será marcado como descartado, com o motivo registrado no histórico.</p><button className="crm-btn" disabled={busy} onClick={()=>setConfirmClose(false)}>Continuar acompanhamento</button><button className="crm-btn crm-btn-danger" disabled={busy||draft.body.trim().length<3} onClick={()=>perform('close')}>Confirmar encerramento</button></div>}
      </div>
     </>}
     {current.status==='reactivated'&&<p className="crm-reactivation-success">Entregue para {current.returned_broker_name}. O histórico segue junto com o contato.</p>}
     <section className="crm-reactivation-history"><h3>Histórico de tentativas</h3>{notesLoading?<p role="status">Carregando histórico…</p>:notesError?<div role="alert"><p>{notesError}</p><button className="crm-btn" onClick={()=>loadNotes(current.id)}>Tentar carregar histórico</button></div>:!notes.length?<p className="crm-text-muted">Nenhuma tentativa registrada nesta reativação.</p>:<ol>{notes.map(n=><li key={n.id}><div><strong>{REACTIVATION_OUTCOMES[n.outcome]||n.outcome}</strong><time dateTime={n.created_at}>{stamp(n.created_at)}</time></div><p>{n.body}</p><small>{n.author_name}</small></li>)}</ol>}</section>
    </>}
   </section>
  </div>}
 </>;
}
