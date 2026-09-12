import React, { useEffect, useId, useRef } from "react";
import { Search, X, Inbox, ArrowUpRight } from "lucide-react";
export const STAGES = [
  "novo",
  "atendimento",
  "visita",
  "proposta",
  "fechado",
  "descartado",
];
export const LABELS = {
  novo: "Novo lead",
  atendimento: "Em atendimento",
  contato: "Em atendimento",
  visita: "Visita agendada",
  proposta: "Em proposta",
  fechado: "Fechado",
  descartado: "Descartado",
};
export const TYPES = {
  ligacao: "Ligação",
  mensagem: "WhatsApp",
  visita: "Visita",
  email: "E-mail",
  geral: "Tarefa",
};
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const money = (v) =>
  v === null || v === undefined || v === ""
    ? "Sob consulta"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(Number(v));
export const date = (value) =>
  value
    ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString(
        "pt-BR",
        { day: "2-digit", month: "short" },
      )
    : "Sem data";
export const stamp = (value) =>
  value ? new Date(value).toLocaleString("pt-BR") : "Ainda não sincronizado";
export const initials = (name) =>
  (name || "VX")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
export const matches = (text, query) =>
  String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes(
      query
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase(),
    );
export const wpp = (number) => {
  let n = String(number || "").replace(/\D/g, "");
  if (n.length === 10 || n.length === 11) n = "55" + n;
  return n ? `https://wa.me/${n}` : null;
};
export function PageHeader({ eyebrow, title, description, children }) {
  return (
    <header className="crm-page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="crm-actions">{children}</div>
    </header>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = "Buscar...",
  label,
}) {
  return (
    <label className="crm-search">
      <Search size={17} />
      <span className="crm-sr-only">{label || placeholder}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => onChange("")}
        >
          <X size={15} />
        </button>
      )}
    </label>
  );
}
export function Empty({ title = "Nenhum registro por aqui", text, children }) {
  return (
    <div className="crm-empty">
      <Inbox size={30} />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}
export function Stat({ label, value, detail, icon: Icon, tone = "" }) {
  return (
    <article className={`crm-stat ${tone}`}>
      <div className="crm-stat-label">
        {label}
        {Icon && <Icon size={18} />}
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
export function Badge({ status, children }) {
  return (
    <span className={`crm-badge crm-status-${status || "default"}`}>
      <i />
      {children || LABELS[status] || status}
    </span>
  );
}
export function Field({ label, children, wide }) {
  const id = useId();
  return (
    <label className={`crm-field ${wide ? "crm-field-wide" : ""}`} htmlFor={id}>
      <span>{label}</span>
      {React.isValidElement(children)
        ? React.cloneElement(children, { id: children.props.id || id })
        : children}
    </label>
  );
}
export function Dialog({ title, subtitle, onClose, children, wide = false }) {
  const ref = useRef();
  const id = useId();
  useEffect(() => {
    const prior = document.activeElement;
    ref.current?.focus();
    const close = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = ref.current.querySelectorAll(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]",
        );
        const first = items[0],
          last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", close);
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", close);
      document.body.style.overflow = scroll;
      prior?.focus();
    };
  }, []);
  return (
    <div
      className="crm-dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={`crm-dialog ${wide ? "crm-dialog-wide" : ""}`}
      >
        <div className="crm-dialog-heading">
          <div>
            <h2 id={id}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="crm-icon-btn"
            onClick={onClose}
            type="button"
            aria-label="Fechar janela"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function Alert({ children, tone = "error" }) {
  return children ? (
    <div
      className={`crm-alert ${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  ) : null;
}
export function Avatar({ name }) {
  return <span className="crm-avatar">{initials(name)}</span>;
}
export function exportRows(filename, headers, rows) {
  const escape = (value) => {
    let text = String(value ?? "");
    if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const csv =
    "\uFEFF" +
    [headers, ...rows].map((r) => r.map(escape).join(";")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
