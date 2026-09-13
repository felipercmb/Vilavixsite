const keyOf = (value) => value === null || value === undefined ? null : String(value);

// One instance belongs to one authenticated workspace. Reads use their start
// version; confirmed writes use their commit version, regardless of arrival order.
export function createCrmTaskCache() {
  let clock = 0, resetVersion = 0, fullReadVersion = 0, visitReadVersion = 0;
  const records = new Map(), unlinkedLeads = new Map();
  let current = { tasks: [], visits: [] };
  let dirty = false;

  function snapshot() {
    if (dirty) {
      const tasks = [], visits = [];
      for (const { row } of records.values()) {
        if (!row) continue;
        tasks.push(row);
        if (row.tipo === "visita") visits.push(row);
      }
      current = { tasks, visits };
      dirty = false;
    }
    return current;
  }

  function requireId(row) {
    const id = keyOf(row?.id);
    if (id === null || id === "") throw new TypeError("A atividade precisa de um identificador.");
    return id;
  }

  function put(id, row, version) {
    records.set(id, { row, version });
    dirty = true;
  }

  function applyRead(kind, rows, token) {
    if (kind !== "tasks" && kind !== "visits") throw new TypeError("Consulta de atividades desconhecida.");
    if (!Number.isSafeInteger(token) || token <= resetVersion || token > clock) return snapshot();
    if (token <= fullReadVersion || (kind === "visits" && token <= visitReadVersion)) return snapshot();
    if (!Array.isArray(rows)) throw new TypeError("A consulta deve retornar uma lista completa de atividades.");
    const incoming = new Map();
    for (const row of rows) {
      const id = requireId(row);
      if (kind === "visits" && row.tipo !== "visita") throw new TypeError("A consulta de visitas retornou outro tipo de atividade.");
      if (incoming.has(id)) throw new TypeError("A consulta retornou uma atividade repetida.");
      incoming.set(id, row);
    }

    for (const [id, row] of incoming) {
      if ((records.get(id)?.version || 0) > token) continue;
      // A newer complete visit snapshot also excludes previously unseen old visits.
      if (row.tipo === "visita" && token < visitReadVersion) continue;
      const unlinkedAt = unlinkedLeads.get(keyOf(row.leadId)) || 0;
      put(id, unlinkedAt > token ? { ...row, leadId: null } : { ...row }, Math.max(token, unlinkedAt));
    }

    for (const [id, entry] of records) {
      if (!entry.row || incoming.has(id) || entry.version > token) continue;
      if (kind === "visits" && entry.row.tipo !== "visita") continue;
      if (entry.row.tipo === "visita" && token < visitReadVersion) continue;
      put(id, null, token);
    }
    if (kind === "tasks") fullReadVersion = token;
    else visitReadVersion = token;
    return snapshot();
  }

  return {
    beginRead() { return ++clock; },
    applyRead,
    snapshot,
    upsert(row) {
      const id = requireId(row);
      put(id, { ...row }, ++clock);
      return snapshot();
    },
    remove(id) {
      const key = requireId({ id });
      put(key, null, ++clock);
      return snapshot();
    },
    unlinkLead(id) {
      const key = requireId({ id }), version = ++clock;
      unlinkedLeads.set(key, version);
      for (const [taskId, entry] of records) {
        if (entry.row && keyOf(entry.row.leadId) === key) put(taskId, { ...entry.row, leadId: null }, version);
      }
      return snapshot();
    },
    reset() {
      resetVersion = ++clock;
      fullReadVersion = resetVersion;
      visitReadVersion = resetVersion;
      records.clear();
      unlinkedLeads.clear();
      dirty = true;
      return snapshot();
    },
  };
}
