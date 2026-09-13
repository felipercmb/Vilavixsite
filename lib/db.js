/**
 * Camada de dados — abstrai todas as chamadas ao Supabase.
 * Cada função retorna { data, error } como padrão Supabase.
 */
import { supabase } from "./supabase.js";
import { readAllRows } from "./supabase-pagination.js";

// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────
export const authSignIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password });

export const authSignOut = () => supabase.auth.signOut();

export const authGetSession = () => supabase.auth.getSession();

export const authGetUser = () => supabase.auth.getUser();

export const authResetPassword = (email) =>
  supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/redefinir-senha`,
  });

// ─────────────────────────────────────────────────────────────
// PROFILES (corretores vinculados ao Auth)
// ─────────────────────────────────────────────────────────────
export const getProfile = (userId) =>
  supabase.from("profiles").select("*").eq("id", userId).single();

export const getProfiles = () =>
  readAllRows((options) =>
    supabase.from("profiles").select("*", options).order("vendas", { ascending: false }),
  );

export const upsertProfile = (profile) =>
  supabase.from("profiles").upsert(profile).select().single();

export const updateProfile = (id, changes) =>
  supabase.from("profiles").update(changes).eq("id", id).select().single();

// ─────────────────────────────────────────────────────────────
// IMÓVEIS
// ─────────────────────────────────────────────────────────────
export const getImoveis = () =>
  readAllRows((options) =>
    supabase
      .from("imoveis")
      .select("*", options)
      .order("created_at", { ascending: false }),
  );

export const getImoveisPublic = () =>
  readAllRows((options) =>
    supabase
      .from("imoveis")
      .select("*", options)
      .eq("status", "disponivel")
      .order("created_at", { ascending: false }),
  );

export const getImovel = (id) =>
  supabase.from("imoveis").select("*").eq("id", id).single();

export const insertImovel = (imovel) =>
  supabase.from("imoveis").insert(imovel).select().single();

export const updateImovel = (id, changes) =>
  supabase.from("imoveis").update(changes).eq("id", id).select().single();

export const deleteImovel = (id) =>
  supabase.from("imoveis").delete().eq("id", id).select("id").single();

// Upload foto de imóvel → retorna URL pública
export const uploadFotoImovel = async (imovelId, file) => {
  const ext = file.name.split(".").pop();
  const path = `imoveis/${imovelId}/${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage
    .from("fotos")
    .upload(path, file, { upsert: true });
  if (error) return { url: null, error };
  const {
    data: { publicUrl },
  } = supabase.storage.from("fotos").getPublicUrl(path);
  return { url: publicUrl, error: null };
};

// ─────────────────────────────────────────────────────────────
// LEADS
// ─────────────────────────────────────────────────────────────
export const getLeads = () =>
  readAllRows((options) =>
    supabase.from("leads").select("*", options).order("created_at", { ascending: false }),
  );

export const getLead = (id) =>
  supabase.from("leads").select("*").eq("id", id).single();

export const insertLead = (lead) =>
  supabase.from("leads").insert(lead).select().single();

export const updateLead = (id, changes) =>
  supabase.from("leads").update(changes).eq("id", id).select().single();

export const deleteLead = (id) =>
  supabase.from("leads").delete().eq("id", id).select("id").single();

// ─────────────────────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────────────────────
export const getTasks = ({ tipo, signal } = {}) =>
  readAllRows((options) => {
    let query = supabase.from("tasks").select("*", options).order("data").order("hora");
    if (tipo) query = query.eq("tipo", tipo);
    if (signal) query = query.abortSignal(signal);
    return query;
  });

export const insertTask = (task) =>
  supabase.from("tasks").insert(task).select().single();

export const updateTask = (id, changes) =>
  supabase.from("tasks").update(changes).eq("id", id).select().single();

export const deleteTask = (id) =>
  supabase.from("tasks").delete().eq("id", id).select("id").single();

export const toggleTask = (id, concluida) =>
  supabase.from("tasks").update({ concluida }).eq("id", id).select().single();

// ─────────────────────────────────────────────────────────────
// COMMENTS
// ─────────────────────────────────────────────────────────────
export const getComments = () =>
  readAllRows((options) =>
    supabase.from("comments").select("*", options).order("created_at"),
  );

export const getCommentsByLead = (leadId) =>
  readAllRows((options) =>
    supabase
      .from("comments")
      .select("*", options)
      .eq("lead_id", leadId)
      .order("created_at"),
  );

export const insertComment = (comment) =>
  supabase.from("comments").insert(comment).select().single();

export const deleteComment = (id) =>
  supabase.from("comments").delete().eq("id", id).select("id").single();
