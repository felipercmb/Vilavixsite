// Each tab requests its own data. Slow background resources never block the shell.
export const CRM_RESOURCE_LABELS = {
  profile: 'Perfil', leads: 'Contatos', tasks: 'Agenda', visits: 'Visitas',
  comments: 'Histórico', profiles: 'Equipe', properties: 'Imóveis', rentalAccess: 'Acesso à locação',
};
const PLANS = {
  dashboard: { required: ['leads'], background: ['tasks', 'profiles'] },
  funil: { required: ['leads', 'profiles'], background: ['tasks'] },
  pipeline: { required: ['leads', 'profiles'], background: ['tasks'] },
  leads: { required: ['leads', 'profiles', 'tasks', 'comments', 'properties'], background: [] },
  tarefas: { required: ['tasks', 'leads', 'profiles'], background: [] },
  visitas: { required: ['visits', 'leads', 'profiles'], background: [] },
  imoveis: { required: ['properties'], background: [] },
  'add-imovel': { required: [], background: [] },
  corretores: { required: ['profiles'], background: [] },
  campanhas: { required: ['leads', 'profiles'], background: [] },
  alugueis: { required: ['rentalAccess', 'properties'], background: [] },
};
export const crmResourcePlan = (menu) => PLANS[menu] || PLANS.dashboard;

export function createCrmResourceLoader(loaders, { onStatus, onData, timeoutMs = 30000 }) {
  const entries = new Map();
  let disposed = false;
  function load(name, { refresh = false } = {}) {
    if (disposed) return Promise.resolve();
    const previous = entries.get(name);
    if (previous?.pending) return previous.pending;
    if (previous?.ready && !refresh) return Promise.resolve();
    const controller = new AbortController();
    const entry = { controller, ready: previous?.ready || false };
    entries.set(name, entry);
    onStatus(name, { state: 'loading', error: null });
    let timer;
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error('A consulta demorou demais. Tente atualizar esta aba.')); }, timeoutMs);
    });
    entry.pending = Promise.race([Promise.resolve().then(() => loaders[name](controller.signal)), deadline]).then((result) => {
      if (disposed || controller.signal.aborted) return;
      if (result?.error) throw result.error;
      onData(name, result?.data);
      entry.ready = true;
      onStatus(name, { state: 'ready', error: null });
    }).catch((error) => {
      if (!disposed)
        onStatus(name, { state: 'error', error: error?.message || 'Não foi possível carregar. Tente novamente.' });
    }).finally(() => { clearTimeout(timer); entry.pending = null; });
    return entry.pending;
  }
  return {
    load,
    ensure(names, options) { return Promise.all([...new Set(names)].map(name => load(name, options))); },
    dispose() { disposed = true; entries.forEach(entry => entry.controller.abort()); },
  };
}
