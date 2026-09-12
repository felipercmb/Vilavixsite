const fold = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const same = (a, b) => a != null && b != null && String(a) === String(b);

export const isOpenLead = (lead) => !["fechado", "descartado"].includes(lead.status);
export function isOwnLead(lead, profile) {
  if (!profile) return false;
  if (lead.corretorId) return same(lead.corretorId, profile.id);
  return Boolean(profile.nome && lead.corretor && fold(lead.corretor) === fold(profile.nome));
}
export function filterPortfolio(leads, scope = "all", profile) {
  return leads.filter((lead) => scope === "mine" ? isOwnLead(lead, profile) : scope === "unassigned" ? !lead.corretorId && !lead.corretor : true);
}
export function nextTaskForLead(leadId, tasks = []) {
  return tasks.filter((task) => !task.concluida && same(task.leadId, leadId)).sort((a, b) => `${a.data || "9999"} ${a.hora || "23:59"}`.localeCompare(`${b.data || "9999"} ${b.hora || "23:59"}`))[0] || null;
}
export const nextLeadTask = (lead, tasks) => nextTaskForLead(lead.id, tasks);
export const leadNeedsFollowup = (lead, tasks) => isOpenLead(lead) && !nextLeadTask(lead, tasks);

export function searchProperties(items, query, limit = 12) {
  const tokens = fold(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  return items.filter((item) => tokens.every((token) => fold([item.codigo, item.titulo, item.bairro, item.cidade].join(" ")).includes(token)))
    .sort((a, b) => Number(fold(b.codigo) === fold(query)) - Number(fold(a.codigo) === fold(query)))
    .slice(0, limit);
}
export function groupTasksByDay(tasks) {
  const sorted = [...tasks].sort((a, b) => `${a.data || "9999"} ${a.hora || "23:59"}`.localeCompare(`${b.data || "9999"} ${b.hora || "23:59"}`));
  return [...sorted.reduce((groups, task) => {
    const key = task.data || "";
    groups.set(key, [...(groups.get(key) || []), task]);
    return groups;
  }, new Map())].map(([day, items]) => ({ day, tasks: items }));
}
export function postponeTaskDate(taskDate, days = 1, fromDay) {
  const base = taskDate && taskDate > fromDay ? taskDate : fromDay;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(base || "") || !Number.isInteger(days) || days < 1) throw new Error("Informe uma data válida para reagendar.");
  const result = new Date(`${base}T12:00:00Z`);
  if (!Number.isFinite(result.getTime()) || result.toISOString().slice(0, 10) !== base) throw new Error("Informe uma data válida para reagendar.");
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

// Preserve confirmed progress when a second write fails; retry only the remaining write.
export async function saveLeadInteraction({ leadId, note, followup }, actions, progress = {}) {
  const saved = { ...progress };
  if (!String(note || "").trim() && !saved.comment) throw new Error("Escreva o que foi conversado.");
  if (followup && (!followup.titulo?.trim() || !followup.data || !followup.hora)) throw new Error("Preencha a atividade, a data e o horário do retorno.");
  try {
    if (!saved.comment) {
      await actions.addComment(leadId, note.trim());
      saved.comment = true;
      actions.onProgress?.({ ...saved });
    }
    if (followup && !saved.task) {
      await actions.addTask({ ...followup, titulo: followup.titulo.trim(), leadId, prioridade: followup.prioridade || "media" });
      saved.task = true;
      actions.onProgress?.({ ...saved });
    }
    return saved;
  } catch (error) {
    const failure = new Error(saved.comment && followup && !saved.task ? `Atendimento registrado. O retorno não foi agendado: ${error.message}. Tente agendar novamente.` : error.message);
    failure.progress = saved;
    throw failure;
  }
}
