import React, { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { PageHeader, Field, Alert } from "./CRMUI.jsx";
export function PropertyForm({ property, onSave, onCancel, demo }) {
  const [form, setForm] = useState(
      property
        ? { ...property, photoLines: (property.fotos || []).join("\n") }
        : {
            titulo: "",
            codigo: "",
            tipo: "Apartamento",
            finalidade: "venda",
            status: "disponivel",
            preco: "",
            area: "",
            quartos: "",
            suites: "",
            banheiros: "",
            vagas: "",
            bairro: "",
            cidade: "Vila Velha",
            estado: "ES",
            endereco: "",
            descricao: "",
            photoLines: "",
            destaque: false,
          },
    ),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const photos = form.photoLines
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (photos.some((url) => !/^https?:\/\//i.test(url))) {
      setError("Use links de imagem completos, começando com https://.");
      return;
    }
    setSaving(true);
    try {
      const result = {
        ...form,
        titulo: form.titulo.trim(),
        codigo: form.codigo || undefined,
        fotos: photos,
        img: photos[0] || null,
        transacao: form.finalidade === "aluguel" ? "Aluguel" : "Venda",
      };
      delete result.photoLines;
      [
        "preco",
        "area",
        "quartos",
        "suites",
        "banheiros",
        "vagas",
        "condominio",
        "ano",
      ].forEach((k) => {
        if (k in result)
          result[k] =
            result[k] === "" || result[k] === null ? null : Number(result[k]);
      });
      await onSave(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit}>
      <Alert>{error}</Alert>
      {demo && (
        <Alert tone="info">
          As alterações deste formulário são salvas apenas no ambiente local de
          revisão.
        </Alert>
      )}
      <div className="crm-form-grid">
        <Field label="Título do imóvel *" wide>
          <input
            required
            value={form.titulo || ""}
            onChange={(e) => set("titulo", e.target.value)}
            maxLength={220}
          />
        </Field>
        <Field label="Código de referência">
          <input
            value={form.codigo || ""}
            onChange={(e) => set("codigo", e.target.value)}
            placeholder="Ex.: AP1500"
          />
        </Field>
        <Field label="Tipo">
          <select
            value={form.tipo || "Apartamento"}
            onChange={(e) => set("tipo", e.target.value)}
          >
            {[
              ...new Set(
                [
                  "Apartamento",
                  "Casa",
                  "Cobertura",
                  "Terreno",
                  "Comercial",
                  "Sala",
                  "Loja",
                  "Galpão",
                  form.tipo,
                ].filter(Boolean),
              ),
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Finalidade">
          <select
            value={form.finalidade || "venda"}
            onChange={(e) => set("finalidade", e.target.value)}
          >
            <option value="venda">Venda</option>
            <option value="aluguel">Aluguel</option>
          </select>
        </Field>
        <Field label="Disponibilidade">
          <select
            value={form.status || "disponivel"}
            onChange={(e) => set("status", e.target.value)}
          >
            <option value="disponivel">Disponível</option>
            <option value="reservado">Reservado</option>
            <option value="vendido">Vendido</option>
            <option value="alugado">Alugado</option>
            <option value="rascunho">Rascunho</option>
          </select>
        </Field>
        <Field
          label={
            form.finalidade === "aluguel"
              ? "Aluguel mensal (R$)"
              : "Valor de venda (R$)"
          }
        >
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.preco ?? ""}
            onChange={(e) => set("preco", e.target.value)}
            placeholder="Deixe vazio para sob consulta"
          />
        </Field>
        <Field label="Área (m²)">
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.area ?? ""}
            onChange={(e) => set("area", e.target.value)}
          />
        </Field>
        {[
          ["quartos", "Quartos"],
          ["suites", "Suítes"],
          ["banheiros", "Banheiros"],
          ["vagas", "Vagas de garagem"],
        ].map(([k, l]) => (
          <Field key={k} label={l}>
            <input
              type="number"
              min="0"
              step="1"
              value={form[k] ?? ""}
              onChange={(e) => set(k, e.target.value)}
            />
          </Field>
        ))}
        <Field label="Cidade *">
          <input
            required
            value={form.cidade || ""}
            onChange={(e) => set("cidade", e.target.value)}
          />
        </Field>
        <Field label="Bairro *">
          <input
            required
            value={form.bairro || ""}
            onChange={(e) => set("bairro", e.target.value)}
          />
        </Field>
        <Field label="Endereço" wide>
          <input
            value={form.endereco || ""}
            onChange={(e) => set("endereco", e.target.value)}
          />
        </Field>
        <Field label="Descrição" wide>
          <textarea
            value={form.descricao || ""}
            onChange={(e) => set("descricao", e.target.value)}
            rows={5}
          />
        </Field>
        <Field label="Fotos — um link público de imagem por linha" wide>
          <textarea
            value={form.photoLines}
            onChange={(e) => set("photoLines", e.target.value)}
            rows={4}
            placeholder="https://..."
          />
        </Field>
      </div>
      <label className="crm-checkbox" style={{ marginTop: 20 }}>
        <input
          type="checkbox"
          checked={Boolean(form.destaque)}
          onChange={(e) => set("destaque", e.target.checked)}
        />
        Destacar este imóvel no catálogo
      </label>
      <div
        className="crm-actions"
        style={{ marginTop: 27, justifyContent: "flex-end" }}
      >
        <button type="button" className="crm-btn" onClick={onCancel}>
          Cancelar
        </button>
        <button className="crm-btn crm-btn-primary" disabled={saving}>
          <Save size={14} />
          {saving ? "Salvando…" : "Salvar imóvel"}
        </button>
      </div>
    </form>
  );
}
export default function AddImovel({ addImovel, setMenu, demo, setNotice }) {
  return (
    <>
      <PageHeader
        title="Adicionar ao catálogo"
        eyebrow="Novo imóvel"
        description="Cadastre informações completas para uma apresentação mais clara."
      >
        <button className="crm-btn" onClick={() => setMenu("imoveis")}>
          <ArrowLeft size={14} />
          Voltar ao catálogo
        </button>
      </PageHeader>
      <section className="crm-card" style={{ maxWidth: 950 }}>
        <div className="crm-card-body">
          <PropertyForm
            demo={demo}
            onCancel={() => setMenu("imoveis")}
            onSave={async (data) => {
              await addImovel(data);
              setNotice(
                demo
                  ? "Imóvel salvo no ambiente de revisão."
                  : "Imóvel salvo no catálogo.",
              );
              setMenu("imoveis");
            }}
          />
        </div>
      </section>
    </>
  );
}
