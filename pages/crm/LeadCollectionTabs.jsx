import React from "react";
import { leadCollection } from "../../lib/lead-collections.js";

export default function LeadCollectionTabs({ leads, value, onChange }) {
  const prospects = leads.filter(lead => leadCollection(lead) === "prospeccao").length;
  const tabs = [["entrada", "Leads novos", leads.length - prospects], ["prospeccao", "Prospecção", prospects], ["all", "Todos", leads.length]];
  return <div className="crm-lead-collections">
    <div className="crm-tabs" aria-label="Tipo de carteira">
      {tabs.map(([id, label, count]) => <button key={id} type="button" className={value === id ? "active" : ""} aria-pressed={value === id} onClick={() => onChange(id)}>{label}<span>{count.toLocaleString("pt-BR")}</span></button>)}
    </div>
    <p>{value === "prospeccao" ? "Base histórica importada para prospecção e reativação, separada das novas entradas." : value === "entrada" ? "Contatos de entrada das campanhas e demais canais, em qualquer etapa do atendimento." : "Todas as carteiras, com os filtros e as permissões da sua conta."}</p>
  </div>;
}
