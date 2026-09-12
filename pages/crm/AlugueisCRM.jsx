import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  FileText,
  Pencil,
  RefreshCw,
  Download,
  Upload,
  CalendarDays,
  ChevronRight,
  Check,
  AlertCircle,
  Search,
} from "lucide-react";
import {
  PageHeader,
  SearchBox,
  Empty,
  Field,
  Dialog,
  Alert,
  today,
  matches,
  stamp,
  exportRows,
} from "./CRMUI.jsx";
import { createRentalRepository } from "../../lib/rentals.js";
import { contractsForMonth } from "../../lib/rental-domain.js";
import "../../styles/crm-rentals.css";

const emptyData = {
  properties: [],
  contracts: [],
  charges: [],
  receipts: [],
  payouts: [],
  issues: [],
  documents: [],
  audit: [],
};
const REFRESH_REQUIRED_MESSAGE =
  "O registro foi salvo, mas a lista não pôde ser atualizada. Novos cadastros, edições e lançamentos estão bloqueados até você clicar em Atualizar e a recarga ser concluída.";
const tabs = [
  ["portfolio", "Carteira"],
  ["contracts", "Contratos"],
  ["receipts", "Recebimentos"],
  ["payouts", "Repasses"],
  ["issues", "Pendências"],
];
const currency = (cents = 0) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(cents) / 100,
  );
const inputMoney = (cents = 0) =>
  `${Math.floor(Number(cents) / 100)},${String(Number(cents) % 100).padStart(2, "0")}`;
const fullDate = (v) =>
  v
    ? new Date(`${String(v).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR")
    : "Não informada";
const monthLabel = (value) =>
  new Date(`${value.slice(0, 7)}-01T12:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
const contractStatuses = {
  active: "Em vigor",
  draft: "Em preparação",
  ended: "Encerrado",
};
const issueStatuses = {
  open: "Aberta",
  in_progress: "Em andamento",
  resolved: "Resolvida",
};
const priorities = { low: "Baixa", normal: "Normal", high: "Alta" };
const methods = {
  pix: "Pix",
  transferencia: "Transferência",
  boleto: "Boleto",
  dinheiro: "Dinheiro",
  outro: "Outro",
};
const centsFromInput = (value, label = "Valor") => {
  const text = String(value)
    .trim()
    .replace(/\s|R\$/g, "");
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(text))
    throw new Error(`${label}: use o formato 1.234,56.`);
  const [whole, fraction = ""] = text.replaceAll(".", "").split(",");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(result) || result < 0)
    throw new Error(`${label} inválido.`);
  return result;
};
const balance = (charge) =>
  Math.max(0, Number(charge.amount_cents) - Number(charge.received_cents || 0));
const available = (charge) =>
  Math.max(
    0,
    Number(charge.received_cents || 0) -
      Number(charge.fee_cents || 0) -
      Number(charge.payout_cents || 0),
  );
const chargeStatus = (charge, day) =>
  balance(charge) === 0
    ? "paid"
    : charge.due_date < day
      ? "late"
      : Number(charge.received_cents) > 0
        ? "partial"
        : "pending";
const chargeLabels = {
  paid: "Recebido",
  late: "Em atraso",
  partial: "Parcial",
  pending: "A receber",
};
const dayDistance = (date, day) =>
  date
    ? Math.round(
        (new Date(`${date}T12:00:00`) - new Date(`${day}T12:00:00`)) / 86400000,
      )
    : null;

function Status({ value, children }) {
  return (
    <span className={`rental-status rental-status-${value}`}>{children}</span>
  );
}
function TextArea({ value, onChange, ...props }) {
  return (
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      maxLength={3000}
      {...props}
    />
  );
}
function SaveDialog({
  title,
  subtitle,
  children,
  onClose,
  onSave,
  saveLabel = "Salvar",
  wide = false,
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const busyRef = useRef(false);
  const close = () => {
    if (!busyRef.current) onClose();
  };
  return (
    <Dialog title={title} subtitle={subtitle} onClose={close} wide={wide}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busyRef.current) return;
          busyRef.current = true;
          setBusy(true);
          setError("");
          try {
            await onSave();
            onClose();
          } catch (err) {
            setError(
              err.message ||
                "Não foi possível salvar. Confira os dados e tente novamente.",
            );
          } finally {
            busyRef.current = false;
            setBusy(false);
          }
        }}
      >
        <div className="crm-dialog-body">
          <Alert>{error}</Alert>
          <fieldset className="rental-fieldset" disabled={busy}>
            {children}
          </fieldset>
        </div>
        <footer className="crm-dialog-footer">
          <button
            className="crm-btn"
            type="button"
            onClick={close}
            disabled={busy}
          >
            Cancelar
          </button>
          <button className="crm-btn crm-btn-primary" disabled={busy}>
            {busy ? "Salvando…" : saveLabel}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}

function PropertyForm({ item, catalog, onClose, onSave }) {
  const [form, setForm] = useState(
    item || {
      title: "",
      catalog_ref: "",
      address: "",
      owner_name: "",
      owner_contact: "",
      notes: "",
      archived: false,
    },
  );
  const [query, setQuery] = useState("");
  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  const results =
    query.trim().length >= 2
      ? catalog
          .filter((p) =>
            matches([p.codigo, p.titulo, p.bairro, p.cidade].join(" "), query),
          )
          .slice(0, 6)
      : [];
  return (
    <SaveDialog
      title={item ? "Editar imóvel da carteira" : "Adicionar imóvel à carteira"}
      subtitle="Identifique o imóvel e quem recebe os repasses."
      onClose={onClose}
      onSave={() =>
        onSave({
          ...form,
          title: form.title.trim(),
          owner_name: form.owner_name.trim(),
        })
      }
      saveLabel={item ? "Salvar alterações" : "Adicionar imóvel"}
    >
      {!item && (
        <div className="rental-catalog-search">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Buscar no catálogo por código, bairro ou título"
            label="Buscar imóvel no catálogo"
          />
          <small>
            Vincule um imóvel existente ou preencha os dados abaixo.
          </small>
          {query.trim().length >= 2 && (
            <div className="rental-search-results">
              {results.length ? (
                results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        catalog_ref: String(p.codigo || p.id),
                        title: p.titulo || p.title || "",
                        address: [p.endereco, p.bairro, p.cidade]
                          .filter(Boolean)
                          .join(", "),
                      }));
                      setQuery("");
                    }}
                  >
                    <span>
                      <strong>{p.titulo}</strong>
                      <small>
                        Ref. {p.codigo || p.id} · {p.bairro} {p.cidade}
                      </small>
                    </span>
                    <Plus size={16} />
                  </button>
                ))
              ) : (
                <p>
                  Nenhum imóvel encontrado. Você pode cadastrar manualmente.
                </p>
              )}
            </div>
          )}
        </div>
      )}
      <div className="crm-form-grid">
        <Field label="Identificação do imóvel *" wide>
          <input
            required
            maxLength={180}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Ex.: Apartamento 302 · Edifício Atlântico"
          />
        </Field>
        <Field label="Referência no catálogo">
          <input
            maxLength={100}
            value={form.catalog_ref || ""}
            onChange={(e) => set("catalog_ref", e.target.value)}
          />
        </Field>
        <Field label="Proprietário *">
          <input
            required
            maxLength={180}
            value={form.owner_name}
            onChange={(e) => set("owner_name", e.target.value)}
          />
        </Field>
        <Field label="Endereço completo" wide>
          <input
            maxLength={500}
            value={form.address || ""}
            onChange={(e) => set("address", e.target.value)}
          />
        </Field>
        <Field label="Contato do proprietário" wide>
          <input
            maxLength={180}
            value={form.owner_contact || ""}
            onChange={(e) => set("owner_contact", e.target.value)}
            placeholder="Telefone ou e-mail"
          />
        </Field>
        <Field label="Observações da gestão" wide>
          <TextArea value={form.notes} onChange={(v) => set("notes", v)} />
        </Field>
        {item && (
          <label className="rental-check">
            <input
              type="checkbox"
              checked={!!form.archived}
              onChange={(e) => set("archived", e.target.checked)}
            />{" "}
            Arquivar imóvel na carteira
          </label>
        )}
      </div>
    </SaveDialog>
  );
}

function ContractForm({ item, propertyId, properties, onClose, onSave }) {
  const [form, setForm] = useState(
    item
      ? {
          ...item,
          rent_input: inputMoney(item.rent_cents),
          fee_input: inputMoney(item.admin_fee_bps),
        }
      : {
          property_id: propertyId || "",
          tenant_name: "",
          tenant_contact: "",
          start_date: today(),
          end_date: "",
          rent_input: "",
          fee_input: "10,00",
          due_day: 10,
          transfer_day: 15,
          status: "draft",
          adjustment_date: "",
          adjustment_index: "",
          notes: "",
        },
  );
  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  const [query, setQuery] = useState("");
  const filtered = properties.filter(
    (p) =>
      !p.archived &&
      matches([p.title, p.owner_name, p.catalog_ref].join(" "), query),
  );
  return (
    <SaveDialog
      title={item ? "Editar contrato de locação" : "Novo contrato de locação"}
      subtitle="Registre as condições do contrato já combinado entre as partes."
      onClose={onClose}
      onSave={() => {
        const { rent_input, fee_input, ...values } = form;
        const rent_cents = centsFromInput(rent_input, "Aluguel"),
          admin_fee_bps = centsFromInput(fee_input, "Taxa de administração");
        if (rent_cents <= 0)
          throw new Error("Informe um aluguel maior que zero.");
        if (admin_fee_bps > 10000)
          throw new Error(
            "A taxa de administração deve ficar entre 0% e 100%.",
          );
        if (values.end_date && values.end_date < values.start_date)
          throw new Error(
            "O término não pode ser anterior ao início do contrato.",
          );
        return onSave({
          ...values,
          rent_cents,
          admin_fee_bps,
          due_day: Number(values.due_day),
          transfer_day: Number(values.transfer_day),
          end_date: values.end_date || null,
          adjustment_date: values.adjustment_date || null,
        });
      }}
      saveLabel={item ? "Salvar contrato" : "Cadastrar contrato"}
      wide
    >
      <div className="crm-form-grid">
        <Field label="Filtrar imóveis da carteira" wide>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busque pelo imóvel ou proprietário"
          />
        </Field>
        <Field label="Imóvel *" wide>
          <select
            required
            value={form.property_id}
            onChange={(e) => set("property_id", e.target.value)}
          >
            <option value="">Selecione o imóvel</option>
            {properties
              .filter((p) => filtered.includes(p) || p.id === form.property_id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} · {p.owner_name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Locatário *">
          <input
            required
            maxLength={180}
            value={form.tenant_name}
            onChange={(e) => set("tenant_name", e.target.value)}
          />
        </Field>
        <Field label="Contato do locatário">
          <input
            maxLength={180}
            value={form.tenant_contact || ""}
            onChange={(e) => set("tenant_contact", e.target.value)}
            placeholder="Telefone ou e-mail"
          />
        </Field>
        <Field label="Início do contrato *">
          <input
            type="date"
            required
            value={form.start_date}
            onChange={(e) => set("start_date", e.target.value)}
          />
        </Field>
        <Field label="Término previsto">
          <input
            type="date"
            min={form.start_date}
            value={form.end_date || ""}
            onChange={(e) => set("end_date", e.target.value)}
          />
        </Field>
        <Field label="Aluguel mensal (R$) *">
          <input
            required
            inputMode="decimal"
            value={form.rent_input}
            onChange={(e) => set("rent_input", e.target.value)}
            placeholder="2.500,00"
          />
        </Field>
        <Field label="Administração (%) *">
          <input
            required
            inputMode="decimal"
            value={form.fee_input}
            onChange={(e) => set("fee_input", e.target.value)}
            placeholder="10,00"
          />
        </Field>
        <Field label="Dia do vencimento *">
          <input
            required
            type="number"
            min="1"
            max="31"
            value={form.due_day}
            onChange={(e) => set("due_day", e.target.value)}
          />
        </Field>
        <Field label="Dia previsto do repasse *">
          <input
            required
            type="number"
            min="1"
            max="31"
            value={form.transfer_day}
            onChange={(e) => set("transfer_day", e.target.value)}
          />
        </Field>
        <Field label="Próxima revisão do aluguel">
          <input
            type="date"
            value={form.adjustment_date || ""}
            onChange={(e) => set("adjustment_date", e.target.value)}
          />
        </Field>
        <Field label="Índice / regra de reajuste">
          <input
            maxLength={180}
            value={form.adjustment_index || ""}
            onChange={(e) => set("adjustment_index", e.target.value)}
            placeholder="Conforme definido no contrato"
          />
        </Field>
        <Field label="Situação" wide>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
          >
            {Object.entries(contractStatuses).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Garantia, encargos e outras condições" wide>
          <TextArea value={form.notes} onChange={(v) => set("notes", v)} />
        </Field>
      </div>
      <p className="rental-form-note">
        Os valores atualizados valem para as próximas cobranças. Lançamentos já
        gerados mantêm as condições registradas.
      </p>
    </SaveDialog>
  );
}

function IssueForm({ item, propertyId, properties, onClose, onSave }) {
  const [form, setForm] = useState(
    item || {
      property_id: propertyId || "",
      title: "",
      description: "",
      priority: "normal",
      status: "open",
      due_date: "",
    },
  );
  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  return (
    <SaveDialog
      title={item ? "Atualizar pendência" : "Nova pendência da locação"}
      subtitle="Acompanhe manutenção, vistoria, documentos e solicitações."
      onClose={onClose}
      onSave={() => onSave({ ...form, due_date: form.due_date || null })}
    >
      <div className="crm-form-grid">
        <Field label="Imóvel *" wide>
          <select
            required
            value={form.property_id}
            onChange={(e) => set("property_id", e.target.value)}
          >
            <option value="">Selecione o imóvel</option>
            {properties.map((p) => (
              <option value={p.id} key={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="O que precisa ser feito? *" wide>
          <input
            required
            maxLength={180}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Ex.: acompanhar reparo na torneira da cozinha"
          />
        </Field>
        <Field label="Prioridade">
          <select
            value={form.priority}
            onChange={(e) => set("priority", e.target.value)}
          >
            {Object.entries(priorities).map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Prazo">
          <input
            type="date"
            value={form.due_date || ""}
            onChange={(e) => set("due_date", e.target.value)}
          />
        </Field>
        <Field label="Andamento" wide>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
          >
            {Object.entries(issueStatuses).map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Responsável, fornecedor e detalhes" wide>
          <TextArea
            value={form.description}
            onChange={(v) => set("description", v)}
          />
        </Field>
      </div>
    </SaveDialog>
  );
}

function MoneyForm({ kind, charge, contract, property, onSave, onClose }) {
  const max = kind === "receipt" ? balance(charge) : available(charge);
  const [form, setForm] = useState({
    amount: inputMoney(max),
    date: today(),
    method: "pix",
    note: "",
  });
  const requestId = useRef(globalThis.crypto.randomUUID());
  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  return (
    <SaveDialog
      title={
        kind === "receipt"
          ? "Registrar recebimento"
          : "Registrar repasse ao proprietário"
      }
      subtitle="Registro manual de uma movimentação já realizada."
      onClose={onClose}
      saveLabel={
        kind === "receipt" ? "Confirmar recebimento" : "Confirmar repasse"
      }
      onSave={() => {
        const amountCents = centsFromInput(form.amount);
        if (amountCents <= 0 || amountCents > max)
          throw new Error(`Informe um valor entre R$ 0,01 e ${currency(max)}.`);
        if (form.date > today())
          throw new Error(
            "A data de uma movimentação realizada não pode estar no futuro.",
          );
        return onSave({
          chargeId: charge.id,
          amountCents,
          date: form.date,
          method: form.method,
          note: form.note,
          requestId: requestId.current,
        });
      }}
    >
      <div className="rental-transaction-context">
        <strong>{property?.title || "Imóvel"}</strong>
        <span>
          {kind === "receipt" ? contract?.tenant_name : property?.owner_name} ·{" "}
          {monthLabel(charge.reference_month)}
        </span>
        <dl>
          <div>
            <dt>
              {kind === "receipt"
                ? "Saldo do aluguel"
                : "Disponível para repasse"}
            </dt>
            <dd>{currency(max)}</dd>
          </div>
          {kind === "payout" && (
            <>
              <div>
                <dt>Recebido do locatário</dt>
                <dd>{currency(charge.received_cents)}</dd>
              </div>
              <div>
                <dt>Taxa de administração</dt>
                <dd>{currency(charge.fee_cents)}</dd>
              </div>
              <div>
                <dt>Já repassado</dt>
                <dd>{currency(charge.payout_cents)}</dd>
              </div>
            </>
          )}
        </dl>
      </div>
      <div className="crm-form-grid">
        <Field label="Valor realizado (R$) *">
          <input
            required
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
          />
        </Field>
        <Field label="Data da movimentação *">
          <input
            required
            type="date"
            max={today()}
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </Field>
        {kind === "receipt" && (
          <Field label="Forma de recebimento" wide>
            <select
              value={form.method}
              onChange={(e) => set("method", e.target.value)}
            >
              {Object.entries(methods).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Referência do comprovante / observações" wide>
          <TextArea value={form.note} onChange={(v) => set("note", v)} />
        </Field>
      </div>
      <p className="rental-form-note">
        Este registro atualiza o controle da carteira. Nenhuma cobrança ou
        transferência bancária é executada aqui.
      </p>
    </SaveDialog>
  );
}

function AdjustmentForm({ charge, property, onClose, onSave }) {
  const [amount, setAmount] = useState(inputMoney(charge.amount_cents)),
    [reason, setReason] = useState("");
  return (
    <SaveDialog
      title="Ajustar cobrança"
      subtitle="Ajustes ficam registrados no histórico e só são permitidos antes de receber qualquer valor."
      onClose={onClose}
      saveLabel="Salvar ajuste"
      onSave={() => {
        const amountCents = centsFromInput(amount);
        if (amountCents <= 0)
          throw new Error("O valor da cobrança deve ser maior que zero.");
        if (reason.trim().length < 3)
          throw new Error("Descreva o motivo do ajuste.");
        return onSave({
          chargeId: charge.id,
          amountCents,
          reason: reason.trim(),
        });
      }}
    >
      <div className="rental-transaction-context">
        <strong>{property?.title}</strong>
        <span>
          {monthLabel(charge.reference_month)} · Valor atual:{" "}
          {currency(charge.amount_cents)}
        </span>
      </div>
      <div className="crm-form-grid">
        <Field label="Novo valor da cobrança (R$) *" wide>
          <input
            required
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Motivo do ajuste *" wide>
          <TextArea
            required
            minLength={3}
            value={reason}
            onChange={setReason}
            placeholder="Ex.: aluguel proporcional de 15 dias, conforme combinado no contrato"
          />
        </Field>
      </div>
    </SaveDialog>
  );
}

function GenerateForm({
  month,
  contracts,
  properties,
  charges,
  onClose,
  onSave,
}) {
  const [reference, setReference] = useState(month);
  const candidates =
    reference && reference <= today().slice(0, 7)
      ? contractsForMonth(contracts, properties, reference).filter(
          (c) =>
            !charges.some(
              (ch) =>
                ch.contract_id === c.id &&
                ch.reference_month.slice(0, 7) === reference,
            ),
        )
      : [];
  return (
    <SaveDialog
      title="Gerar cobranças do mês"
      subtitle="Confira os aluguéis de toda a carteira. Os filtros da lista não limitam esta geração."
      onClose={onClose}
      saveLabel="Gerar cobranças"
      onSave={() => {
        if (!candidates.length)
          throw new Error(
            "Não há novos contratos elegíveis para essa competência.",
          );
        return onSave({ month: reference });
      }}
    >
      <Field label="Competência *">
        <input
          required
          type="month"
          max={today().slice(0, 7)}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      </Field>
      <div className="rental-transaction-context">
        <strong>
          {candidates.length}{" "}
          {candidates.length === 1 ? "cobrança a gerar" : "cobranças a gerar"}
        </strong>
        <span>
          {currency(candidates.reduce((s, c) => s + Number(c.rent_cents), 0))}{" "}
          em aluguéis mensais
        </span>
      </div>
      {candidates.length > 0 && (
        <div
          className="rental-generation-list"
          aria-label="Cobranças que serão geradas"
        >
          {candidates.map((c) => (
            <div key={c.id}>
              <span>
                <strong>
                  {properties.find((p) => p.id === c.property_id)?.title}
                </strong>
                <small>{c.tenant_name}</small>
              </span>
              <strong>{currency(c.rent_cents)}</strong>
            </div>
          ))}
        </div>
      )}
      <p className="rental-form-note">
        Contratos em vigor no período entram uma única vez por mês. O lançamento
        usa o aluguel mensal integral: confira o primeiro e o último mês e
        ajuste o valor acordado antes de registrar recebimentos. Multas e
        encargos não são calculados. Não são emitidos boletos nem mensagens.
      </p>
    </SaveDialog>
  );
}

function ContractDetail({
  contract,
  property,
  data,
  repo,
  onClose,
  onEdit,
  onIssue,
  mutate,
  readOnly = false,
}) {
  const [tab, setTab] = useState("summary"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [file, setFile] = useState(null),
    [documentLink, setDocumentLink] = useState(null);
  const busyRef = useRef(false);
  busyRef.current = busy;
  const charges = data.charges
    .filter((c) => c.contract_id === contract.id)
    .sort((a, b) => b.reference_month.localeCompare(a.reference_month));
  const chargeIds = new Set(charges.map((c) => c.id));
  const docs = data.documents.filter((d) => d.contract_id === contract.id);
  const movements = [
    ...data.receipts
      .filter((r) => chargeIds.has(r.charge_id))
      .map((r) => ({ ...r, kind: "receipt" })),
    ...data.payouts
      .filter((p) => chargeIds.has(p.charge_id))
      .map((p) => ({ ...p, kind: "payout" })),
  ].sort((a, b) =>
    (b.created_at || b.date).localeCompare(a.created_at || a.date),
  );
  const entityIds = new Set([
    contract.id,
    property?.id,
    ...chargeIds,
    ...docs.map((d) => d.id),
    ...movements.map((m) => m.id),
    ...data.issues
      .filter((i) => i.property_id === property?.id)
      .map((i) => i.id),
  ]);
  const audit = data.audit
    .filter(
      (a) =>
        entityIds.has(a.entity_id) || a.details?.contract_id === contract.id,
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const actionNames = {
    generate: "Cobrança gerada",
    adjust: "Valor da cobrança ajustado",
    create: "Cadastro criado",
    update: "Cadastro atualizado",
    insert: "Registro criado",
    property_created: "Imóvel cadastrado",
    property_updated: "Imóvel atualizado",
    contract_created: "Contrato cadastrado",
    contract_updated: "Contrato atualizado",
    charge_created: "Cobrança gerada",
    receipt_recorded: "Recebimento registrado",
    payout_recorded: "Repasse registrado",
    document_uploaded: "Documento adicionado",
    issue_created: "Pendência criada",
    issue_updated: "Pendência atualizada",
    demo: "Demonstração iniciada",
  };
  const entityNames = {
    rental_properties: "Imóvel",
    rental_contracts: "Contrato",
    rental_charges: "Cobrança",
    rental_receipts: "Recebimento",
    rental_payouts: "Repasse",
    rental_issues: "Pendência",
    rental_documents: "Documento",
  };
  return (
    <Dialog
      title={property?.title || "Contrato de locação"}
      subtitle={`${contract.tenant_name} · ${contractStatuses[contract.status]}`}
      onClose={() => {
        if (!busyRef.current) onClose();
      }}
      wide
    >
      <div className="rental-detail-nav">
        {[
          ["summary", "Contrato"],
          ["documents", `Documentos (${docs.length})`],
          ["history", "Histórico"],
        ].map(([v, l]) => (
          <button
            type="button"
            key={v}
            className={tab === v ? "active" : ""}
            onClick={() => setTab(v)}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="crm-dialog-body">
        {readOnly && (
          <Alert>
            O registro foi salvo. Feche esta janela e clique em Atualizar para
            recarregar os dados antes de fazer outra alteração.
          </Alert>
        )}
        <Alert>{error}</Alert>
        {tab === "summary" && (
          <>
            <dl className="rental-detail-grid">
              <div>
                <dt>Proprietário</dt>
                <dd>{property?.owner_name || "Não informado"}</dd>
                <small>{property?.owner_contact}</small>
              </div>
              <div>
                <dt>Locatário</dt>
                <dd>{contract.tenant_name}</dd>
                <small>{contract.tenant_contact}</small>
              </div>
              <div>
                <dt>Aluguel mensal</dt>
                <dd>{currency(contract.rent_cents)}</dd>
              </div>
              <div>
                <dt>Administração</dt>
                <dd>
                  {(Number(contract.admin_fee_bps) / 100).toLocaleString(
                    "pt-BR",
                  )}
                  % sobre o recebido
                </dd>
              </div>
              <div>
                <dt>Vigência</dt>
                <dd>
                  {fullDate(contract.start_date)} a{" "}
                  {contract.end_date
                    ? fullDate(contract.end_date)
                    : "prazo indeterminado"}
                </dd>
              </div>
              <div>
                <dt>Vencimento / repasse previsto</dt>
                <dd>
                  Dia {contract.due_day} / dia {contract.transfer_day}
                </dd>
              </div>
              <div>
                <dt>Próxima revisão do aluguel</dt>
                <dd>{fullDate(contract.adjustment_date)}</dd>
                <small>
                  {contract.adjustment_index || "Sem índice registrado"}
                </small>
              </div>
              <div>
                <dt>Endereço</dt>
                <dd>{property?.address || "Não informado"}</dd>
              </div>
            </dl>
            {contract.notes && (
              <div className="rental-notes">
                <h3>Condições e observações</h3>
                <p>{contract.notes}</p>
              </div>
            )}
            <h3 className="rental-section-title">Cobranças deste contrato</h3>
            {charges.length ? (
              <div className="rental-mini-ledger">
                {charges.map((c) => (
                  <div key={c.id}>
                    <span>
                      <strong>{monthLabel(c.reference_month)}</strong>
                      <small>Vencimento {fullDate(c.due_date)}</small>
                    </span>
                    <span>
                      {currency(c.amount_cents)}
                      <small>Recebido {currency(c.received_cents)}</small>
                    </span>
                    <Status value={chargeStatus(c, today())}>
                      {chargeLabels[chargeStatus(c, today())]}
                    </Status>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rental-muted">
                Ainda não há cobranças. Gere a competência na aba Recebimentos.
              </p>
            )}
            <div className="rental-detail-actions">
              <button
                type="button"
                className="crm-btn"
                disabled={readOnly || busy}
                onClick={() => onIssue(property.id)}
              >
                <Plus size={15} /> Nova pendência
              </button>
              <button
                type="button"
                className="crm-btn crm-btn-primary"
                disabled={readOnly || busy}
                onClick={() => onEdit(contract)}
              >
                <Pencil size={15} /> Editar contrato
              </button>
            </div>
          </>
        )}
        {tab === "documents" && (
          <>
            <form
              className="rental-upload"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!file || busyRef.current || readOnly) return;
                busyRef.current = true;
                setBusy(true);
                setError("");
                try {
                  await mutate(
                    () =>
                      repo.uploadDocument({ contractId: contract.id, file }),
                    "Documento salvo na pasta do contrato.",
                  );
                  setFile(null);
                  e.target.reset();
                } catch (err) {
                  setError(err.message);
                } finally {
                  busyRef.current = false;
                  setBusy(false);
                }
              }}
            >
              <Field label="Adicionar contrato, vistoria ou comprovante">
                <input
                  type="file"
                  required
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null);
                    setDocumentLink(null);
                  }}
                  disabled={busy || readOnly}
                />
              </Field>
              <small>
                PDF, JPG ou PNG, até 10 MB. Arquivos privados, disponíveis
                somente para a equipe autorizada.
              </small>
              <button
                className="crm-btn crm-btn-primary"
                disabled={!file || busy || readOnly}
              >
                <Upload size={16} />
                {busy ? "Enviando…" : "Salvar documento"}
              </button>
            </form>
            {documentLink && (
              <p className="rental-document-link">
                <a href={documentLink.url} target="_blank" rel="noreferrer">
                  Abrir {documentLink.name} <ArrowUpRight size={14} />
                </a>
                <small>Link temporário. Gere outro quando expirar.</small>
              </p>
            )}
            {docs.length ? (
              <ul className="rental-documents">
                {docs.map((d) => (
                  <li key={d.id}>
                    <FileText size={21} />
                    <span>
                      <strong>{d.name}</strong>
                      <small>
                        {Math.max(1, Math.ceil(d.size_bytes / 1024))} KB ·{" "}
                        {fullDate(d.created_at)}
                      </small>
                    </span>
                    <button
                      className="crm-btn"
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        setError("");
                        try {
                          const url = await repo.getDocumentUrl(d);
                          setDocumentLink({ url, name: d.name });
                        } catch (err) {
                          setError(err.message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Abrir
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty
                title="Documentos em um só lugar"
                text="Adicione o contrato assinado, laudos de vistoria e comprovantes desta locação."
              />
            )}
          </>
        )}
        {tab === "history" && (
          <>
            <h3 className="rental-section-title">Movimentações registradas</h3>
            {movements.length ? (
              <ol className="rental-history">
                {movements.map((m) => (
                  <li key={`${m.kind}-${m.id}`}>
                    <span className={`rental-movement-icon ${m.kind}`}>
                      {m.kind === "receipt" ? (
                        <ArrowDownLeft size={17} />
                      ) : (
                        <ArrowUpRight size={17} />
                      )}
                    </span>
                    <div>
                      <strong>
                        {m.kind === "receipt"
                          ? "Recebimento"
                          : "Repasse ao proprietário"}{" "}
                        · {currency(m.amount_cents)}
                      </strong>
                      <small>
                        {fullDate(m.date)}
                        {m.method ? ` · ${methods[m.method] || m.method}` : ""}
                      </small>
                      {m.note && <p>{m.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rental-muted">
                Nenhum recebimento ou repasse registrado.
              </p>
            )}
            <h3 className="rental-section-title">Alterações do cadastro</h3>
            {audit.length ? (
              <ol className="rental-audit">
                {audit.slice(0, 50).map((a) => (
                  <li key={a.id}>
                    <span>
                      {actionNames[a.action] || "Registro atualizado"}
                      {entityNames[a.entity_type] && (
                        <small>
                          {entityNames[a.entity_type]}
                          {a.details?.after?.title
                            ? ` · ${a.details.after.title}`
                            : a.details?.after?.name
                              ? ` · ${a.details.after.name}`
                              : ""}
                        </small>
                      )}
                      {a.action === "adjust" &&
                        a.details?.before &&
                        a.details?.after && (
                          <small>
                            {currency(a.details.before.amount_cents)} →{" "}
                            {currency(a.details.after.amount_cents)}
                          </small>
                        )}
                      {a.details?.reason && <p>{a.details.reason}</p>}
                    </span>
                    <time>{stamp(a.created_at)}</time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rental-muted">
                As próximas alterações ficam registradas aqui.
              </p>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}

export default function AlugueisCRM({
  demo = false,
  currentProfile,
  imoveis = [],
}) {
  const repo = useMemo(
    () => createRentalRepository({ demo, userId: currentProfile?.id }),
    [demo, currentProfile?.id],
  );
  const [data, setData] = useState(emptyData),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [tab, setTab] = useState("portfolio"),
    [query, setQuery] = useState(""),
    [propertyFilter, setPropertyFilter] = useState(""),
    [month, setMonth] = useState(today().slice(0, 7)),
    [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState(null),
    [access, setAccess] = useState(false),
    [needsRefresh, setNeedsRefresh] = useState(false);
  const mounted = useRef(true),
    refreshSequence = useRef(0),
    needsRefreshRef = useRef(false);
  const day = today();
  const reload = useCallback(async () => {
    const seq = ++refreshSequence.current;
    const next = await repo.load();
    if (mounted.current && seq === refreshSequence.current) {
      setData({ ...emptyData, ...next });
      needsRefreshRef.current = false;
      setNeedsRefresh(false);
    }
  }, [repo]);
  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    setData(emptyData);
    setAccess(false);
    setError("");
    let cancelled = false;
    (async () => {
      try {
        const allowed = await repo.getAccess();
        if (cancelled) return;
        setAccess(allowed);
        if (!allowed) return;
        await reload();
      } catch (err) {
        if (!cancelled)
          setError(err.message || "Não foi possível carregar a carteira.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      mounted.current = false;
      refreshSequence.current++;
    };
  }, [repo, reload]);
  const mutate = async (operation, message) => {
    if (needsRefreshRef.current) throw new Error(REFRESH_REQUIRED_MESSAGE);
    const result = await operation();
    setNotice(message);
    setError("");
    // A confirmed financial write must never look like a failed write if refreshing fails.
    try {
      await reload();
    } catch {
      needsRefreshRef.current = true;
      setNeedsRefresh(true);
      setError(REFRESH_REQUIRED_MESSAGE);
    }
    return result;
  };
  const openModal = (next) => {
    if (needsRefreshRef.current && next.type !== "detail") {
      setError(REFRESH_REQUIRED_MESSAGE);
      return;
    }
    setModal(next);
  };
  const propertyMap = new Map(data.properties.map((p) => [p.id, p]));
  const contractMap = new Map(data.contracts.map((c) => [c.id, c]));
  const propertyOf = (charge) =>
    propertyMap.get(contractMap.get(charge.contract_id)?.property_id);
  const contractMatches = (c) =>
    (!propertyFilter || c.property_id === propertyFilter) &&
    matches(
      [
        c.tenant_name,
        c.tenant_contact,
        propertyMap.get(c.property_id)?.title,
        propertyMap.get(c.property_id)?.owner_name,
      ].join(" "),
      query,
    );
  const activeProperties = data.properties.filter((p) => !p.archived);
  const visibleProperties = data.properties.filter(
    (p) =>
      (!propertyFilter || p.id === propertyFilter) &&
      matches(
        [
          p.title,
          p.address,
          p.owner_name,
          p.catalog_ref,
          ...data.contracts
            .filter((c) => c.property_id === p.id)
            .map((c) => c.tenant_name),
        ].join(" "),
        query,
      ) &&
      (statusFilter === "archived" ? p.archived : !p.archived) &&
      (statusFilter !== "vacant" ||
        !data.contracts.some(
          (c) => c.property_id === p.id && c.status === "active",
        )),
  );
  const visibleContracts = data.contracts.filter(
    (c) => contractMatches(c) && (!statusFilter || c.status === statusFilter),
  );
  const monthCharges = data.charges.filter(
    (c) =>
      c.reference_month.slice(0, 7) === month &&
      contractMap.has(c.contract_id) &&
      contractMatches(contractMap.get(c.contract_id)),
  );
  const visibleCharges = monthCharges
    .filter(
      (c) =>
        !statusFilter ||
        (statusFilter === "with_receipts"
          ? Number(c.received_cents) > 0
          : chargeStatus(c, day) === statusFilter),
    )
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const visiblePayouts = monthCharges.filter(
    (c) =>
      !statusFilter ||
      (statusFilter === "available"
        ? available(c) > 0
        : statusFilter === "done"
          ? Number(c.payout_cents) > 0 && available(c) === 0
          : Number(c.received_cents) === 0),
  );
  const visibleIssues = data.issues
    .filter(
      (i) =>
        (!propertyFilter || i.property_id === propertyFilter) &&
        matches(
          [i.title, i.description, propertyMap.get(i.property_id)?.title].join(
            " ",
          ),
          query,
        ) &&
        (statusFilter ? i.status === statusFilter : i.status !== "resolved"),
    )
    .sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));
  const totals = monthCharges.reduce(
    (s, c) => ({
      expected: s.expected + Number(c.amount_cents),
      received: s.received + Number(c.received_cents || 0),
      available: s.available + available(c),
      late: s.late + (chargeStatus(c, day) === "late" ? balance(c) : 0),
      pending: s.pending + balance(c),
    }),
    { expected: 0, received: 0, available: 0, late: 0, pending: 0 },
  );
  const reminders = data.contracts
    .filter((c) => c.status === "active" && contractMatches(c))
    .flatMap((c) =>
      [
        { kind: "renewal", date: c.end_date, label: "Término do contrato" },
        {
          kind: "adjustment",
          date: c.adjustment_date,
          label: "Revisão do aluguel",
        },
      ]
        .filter((r) => r.date && dayDistance(r.date, day) <= 60)
        .map((r) => ({ ...r, contract: c })),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);
  const switchTab = (value, status = "") => {
    setTab(value);
    setStatusFilter(status);
  };
  const selectedContract =
    modal?.type === "detail" ? contractMap.get(modal.id) : null;
  const download = () =>
    exportRows(
      `carteira-aluguel-${month}.csv`,
      [
        "Competência",
        "Imóvel",
        "Proprietário",
        "Locatário",
        "Vencimento",
        "Aluguel",
        "Recebido",
        "Saldo a receber",
        "Administração",
        "Repassado",
        "Disponível para repasse",
      ],
      monthCharges.map((c) => [
        monthLabel(c.reference_month),
        propertyOf(c)?.title,
        propertyOf(c)?.owner_name,
        contractMap.get(c.contract_id)?.tenant_name,
        fullDate(c.due_date),
        inputMoney(c.amount_cents),
        inputMoney(c.received_cents),
        inputMoney(balance(c)),
        inputMoney(c.fee_cents),
        inputMoney(c.payout_cents),
        inputMoney(available(c)),
      ]),
    );
  if (loading)
    return (
      <div className="crm-rentals">
        <PageHeader
          title="Carteira de aluguel"
          description="Carregando contratos e movimentações…"
        />
      </div>
    );
  if (!access)
    return (
      <div className="crm-rentals">
        <PageHeader
          title="Carteira de aluguel"
          description="Esta área é restrita à equipe autorizada para a gestão de locações."
        />
        <Alert>{error}</Alert>
        <Empty
          title={
            error ? "Não foi possível abrir a carteira" : "Acesso restrito"
          }
          text={
            error
              ? "Confira a conexão e tente carregar novamente."
              : "O acesso precisa estar liberado para seu usuário na carteira de aluguel."
          }
        >
          <button
            className="crm-btn"
            onClick={async () => {
              setLoading(true);
              setError("");
              try {
                const allowed = await repo.getAccess();
                setAccess(allowed);
                if (allowed) await reload();
              } catch (err) {
                setError(err.message);
              } finally {
                setLoading(false);
              }
            }}
          >
            <RefreshCw size={16} />
            Tentar novamente
          </button>
        </Empty>
      </div>
    );
  return (
    <div className="crm-rentals">
      <PageHeader
        title="Carteira de aluguel"
        description="Imóveis, contratos e o caminho de cada recebimento até o proprietário."
      >
        <button
          className="crm-btn"
          onClick={async () => {
            setLoading(true);
            setError("");
            try {
              await reload();
            } catch (err) {
              setError(err.message);
            } finally {
              setLoading(false);
            }
          }}
        >
          <RefreshCw size={16} />
          Atualizar
        </button>
        <button
          disabled={needsRefresh}
          className="crm-btn crm-btn-primary"
          onClick={() => openModal({ type: "property" })}
        >
          <Plus size={17} />
          Adicionar imóvel
        </button>
      </PageHeader>
      {demo && (
        <div className="rental-demo-note">
          <strong>Carteira de exemplo</strong>
          <span>
            Cadastros e lançamentos desta prévia ficam somente neste navegador.
          </span>
        </div>
      )}
      <Alert>{needsRefresh ? REFRESH_REQUIRED_MESSAGE : error}</Alert>
      <Alert tone="success">{notice}</Alert>
      <section
        className="rental-month-overview"
        aria-label="Resumo financeiro da competência"
      >
        <div className="rental-month-heading">
          <span>Controle mensal</span>
          <label>
            Competência
            <input
              aria-label="Competência do resumo financeiro"
              type="month"
              required
              value={month}
              onChange={(e) => {
                if (e.target.value) setMonth(e.target.value);
              }}
            />
          </label>
        </div>
        <div className="rental-totals">
          <button onClick={() => switchTab("receipts")}>
            <span>Previsto no mês</span>
            <strong>{currency(totals.expected)}</strong>
            <small>
              {monthCharges.length}{" "}
              {monthCharges.length === 1
                ? "cobrança registrada"
                : "cobranças registradas"}
            </small>
          </button>
          <button onClick={() => switchTab("receipts", "with_receipts")}>
            <span>Recebido</span>
            <strong>{currency(totals.received)}</strong>
            <small>{currency(totals.pending)} a receber</small>
          </button>
          <button onClick={() => switchTab("payouts", "available")}>
            <span>A repassar</span>
            <strong>{currency(totals.available)}</strong>
            <small>Após a taxa de administração</small>
          </button>
          <button
            className={totals.late > 0 ? "is-late" : ""}
            onClick={() => switchTab("receipts", "late")}
          >
            <span>Em atraso</span>
            <strong>{currency(totals.late)}</strong>
            <small>Saldo após o vencimento</small>
          </button>
        </div>
      </section>
      <div className="rental-workspace">
        <nav className="rental-tabs" aria-label="Gestão de aluguel">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              aria-current={tab === key ? "page" : undefined}
              onClick={() => switchTab(key)}
            >
              {label}
              {key === "issues" &&
                data.issues.some((i) => i.status !== "resolved") && (
                  <span>
                    {data.issues.filter((i) => i.status !== "resolved").length}
                  </span>
                )}
            </button>
          ))}
        </nav>
        <div className="rental-toolbar">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Buscar imóvel, proprietário ou locatário"
          />
          <label className="rental-filter">
            <span className="crm-sr-only">Filtrar por imóvel</span>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
            >
              <option value="">Todos os imóveis</option>
              {data.properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          <label className="rental-filter">
            <span className="crm-sr-only">Filtrar situação</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {(tab === "portfolio"
                ? [
                    ["", "Imóveis na carteira"],
                    ["vacant", "Sem contrato em vigor"],
                    ["archived", "Arquivados"],
                  ]
                : tab === "contracts"
                  ? [
                      ["", "Todos os contratos"],
                      ...Object.entries(contractStatuses),
                    ]
                  : tab === "issues"
                    ? [
                        ["", "Pendências abertas"],
                        ...Object.entries(issueStatuses),
                      ]
                    : tab === "payouts"
                      ? [
                          ["", "Todos os repasses"],
                          ["available", "Com saldo disponível"],
                          ["done", "Repassado"],
                          ["waiting", "Aguardando recebimento"],
                        ]
                      : [
                          ["", "Todas as cobranças"],
                          ["with_receipts", "Com recebimento"],
                          ...Object.entries(chargeLabels),
                        ]
              ).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        {tab === "portfolio" && (
          <>
            <div className="rental-section-heading">
              <div>
                <h2>
                  {visibleProperties.length}{" "}
                  {visibleProperties.length === 1
                    ? "imóvel na carteira"
                    : "imóveis na carteira"}
                </h2>
                <p>Proprietário, contrato atual e assuntos a acompanhar.</p>
              </div>
            </div>
            {visibleProperties.length ? (
              <div className="rental-portfolio-list">
                {visibleProperties.map((p) => {
                  const c = data.contracts.find(
                    (ct) => ct.property_id === p.id && ct.status === "active",
                  );
                  const issues = data.issues.filter(
                    (i) => i.property_id === p.id && i.status !== "resolved",
                  );
                  return (
                    <article key={p.id} className="rental-property-row">
                      <div className="rental-property-icon">
                        <Building2 size={24} />
                      </div>
                      <div className="rental-property-info">
                        <h3>{p.title}</h3>
                        <p>
                          {p.address ||
                            (p.catalog_ref
                              ? `Referência ${p.catalog_ref}`
                              : "Endereço ainda não informado")}
                        </p>
                        <span>
                          Proprietário: <strong>{p.owner_name}</strong>
                        </span>
                        {p.owner_contact && <small>{p.owner_contact}</small>}
                      </div>
                      <div className="rental-property-contract">
                        {c ? (
                          <>
                            <Status value="active">Em vigor</Status>
                            <strong>
                              {currency(c.rent_cents)}
                              <small>/ mês</small>
                            </strong>
                            <span>{c.tenant_name}</span>
                          </>
                        ) : (
                          <>
                            <Status value={p.archived ? "ended" : "draft"}>
                              {p.archived
                                ? "Arquivado"
                                : "Sem contrato em vigor"}
                            </Status>
                            <span>Cadastre as condições da locação</span>
                          </>
                        )}
                      </div>
                      <div className="rental-property-actions">
                        {c ? (
                          <button
                            className="crm-btn"
                            onClick={() =>
                              openModal({ type: "detail", id: c.id })
                            }
                          >
                            Abrir contrato
                            <ChevronRight size={15} />
                          </button>
                        ) : (
                          !p.archived && (
                            <button
                              disabled={needsRefresh}
                              className="crm-btn"
                              onClick={() =>
                                openModal({
                                  type: "contract",
                                  propertyId: p.id,
                                })
                              }
                            >
                              <Plus size={15} />
                              Contrato
                            </button>
                          )
                        )}
                        <button
                          disabled={needsRefresh}
                          className="crm-link"
                          onClick={() =>
                            openModal({ type: "property", item: p })
                          }
                        >
                          Editar imóvel
                        </button>
                        {issues.length > 0 && (
                          <button
                            className="rental-pending-link"
                            onClick={() => {
                              setPropertyFilter(p.id);
                              switchTab("issues");
                            }}
                          >
                            {issues.length}{" "}
                            {issues.length === 1 ? "pendência" : "pendências"}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <Empty
                title={
                  data.properties.length
                    ? "Nenhum imóvel com esses filtros"
                    : "Comece pelos imóveis que vocês administram"
                }
                text={
                  data.properties.length
                    ? "Ajuste a busca ou a situação para encontrar um cadastro."
                    : "Cadastre o imóvel e o proprietário. Depois, adicione o contrato para controlar cobranças e repasses."
                }
              >
                {!data.properties.length && (
                  <button
                    disabled={needsRefresh}
                    className="crm-btn crm-btn-primary"
                    onClick={() => openModal({ type: "property" })}
                  >
                    <Plus size={16} />
                    Adicionar primeiro imóvel
                  </button>
                )}
              </Empty>
            )}
            {reminders.length > 0 && (
              <section className="rental-reminders">
                <h2>
                  <CalendarDays size={19} />
                  Contratos que pedem atenção
                </h2>
                {reminders.map((r) => (
                  <button
                    key={`${r.contract.id}-${r.kind}`}
                    onClick={() =>
                      openModal({ type: "detail", id: r.contract.id })
                    }
                  >
                    <span>
                      <strong>{r.label}</strong>
                      <small>
                        {propertyMap.get(r.contract.property_id)?.title} ·{" "}
                        {r.contract.tenant_name}
                      </small>
                    </span>
                    <time className={r.date < day ? "rental-late" : ""}>
                      {fullDate(r.date)}
                      {r.date < day ? " · revisar" : ""}
                    </time>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </section>
            )}
          </>
        )}
        {tab === "contracts" && (
          <>
            <div className="rental-section-heading">
              <div>
                <h2>Contratos de locação</h2>
                <p>Condições, documentos e histórico de cada locação.</p>
              </div>
              <button
                className="crm-btn crm-btn-primary"
                disabled={needsRefresh || !activeProperties.length}
                onClick={() => openModal({ type: "contract" })}
              >
                <Plus size={16} />
                Novo contrato
              </button>
            </div>
            {visibleContracts.length ? (
              <div className="crm-table-wrap">
                <table className="crm-table rental-table">
                  <thead>
                    <tr>
                      <th>Imóvel / locatário</th>
                      <th>Vigência</th>
                      <th>Aluguel / administração</th>
                      <th>Vencimento</th>
                      <th>Situação</th>
                      <th>
                        <span className="crm-sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleContracts.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <button
                            className="crm-link"
                            onClick={() =>
                              openModal({ type: "detail", id: c.id })
                            }
                          >
                            {propertyMap.get(c.property_id)?.title || "Imóvel"}
                          </button>
                          <small>{c.tenant_name}</small>
                        </td>
                        <td>
                          {fullDate(c.start_date)}
                          <small>
                            até{" "}
                            {c.end_date
                              ? fullDate(c.end_date)
                              : "prazo indeterminado"}
                          </small>
                        </td>
                        <td>
                          {currency(c.rent_cents)}
                          <small>
                            {Number(c.admin_fee_bps) / 100}% de administração
                          </small>
                        </td>
                        <td>
                          Dia {c.due_day}
                          <small>Repasse previsto: dia {c.transfer_day}</small>
                        </td>
                        <td>
                          <Status value={c.status}>
                            {contractStatuses[c.status]}
                          </Status>
                        </td>
                        <td>
                          <button
                            className="crm-btn"
                            onClick={() =>
                              openModal({ type: "detail", id: c.id })
                            }
                          >
                            Abrir
                            <FileText size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="Nenhum contrato encontrado"
                text={
                  activeProperties.length
                    ? "Cadastre as condições da locação e reúna os documentos no mesmo lugar."
                    : "Adicione um imóvel à carteira antes de cadastrar o contrato."
                }
              />
            )}
          </>
        )}
        {tab === "receipts" && (
          <>
            <div className="rental-section-heading">
              <div>
                <h2>Aluguéis de {monthLabel(month)}</h2>
                <p>
                  Registre valores recebidos e acompanhe o saldo de cada
                  locatário.
                </p>
              </div>
              <div className="crm-actions">
                <button
                  className="crm-btn"
                  disabled={!monthCharges.length}
                  onClick={download}
                >
                  <Download size={15} />
                  Exportar
                </button>
                <button
                  className="crm-btn crm-btn-primary"
                  disabled={
                    needsRefresh ||
                    !data.contracts.some((c) => c.status !== "draft")
                  }
                  onClick={() => openModal({ type: "generate" })}
                >
                  <Plus size={16} />
                  Gerar cobranças
                </button>
              </div>
            </div>
            {visibleCharges.length ? (
              <div className="crm-table-wrap">
                <table className="crm-table rental-table">
                  <thead>
                    <tr>
                      <th>Imóvel / locatário</th>
                      <th>Vencimento</th>
                      <th>Aluguel</th>
                      <th>Recebido</th>
                      <th>Saldo</th>
                      <th>Situação</th>
                      <th>
                        <span className="crm-sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCharges.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <button
                            className="crm-link"
                            onClick={() =>
                              openModal({ type: "detail", id: c.contract_id })
                            }
                          >
                            {propertyOf(c)?.title}
                          </button>
                          <small>
                            {contractMap.get(c.contract_id)?.tenant_name}
                          </small>
                        </td>
                        <td
                          className={
                            chargeStatus(c, day) === "late" ? "rental-late" : ""
                          }
                        >
                          {fullDate(c.due_date)}
                        </td>
                        <td>{currency(c.amount_cents)}</td>
                        <td>{currency(c.received_cents)}</td>
                        <td>
                          <strong>{currency(balance(c))}</strong>
                        </td>
                        <td>
                          <Status value={chargeStatus(c, day)}>
                            {chargeLabels[chargeStatus(c, day)]}
                          </Status>
                        </td>
                        <td>
                          <div className="rental-charge-actions">
                            {balance(c) > 0 ? (
                              <button
                                disabled={needsRefresh}
                                className="crm-btn"
                                onClick={() =>
                                  openModal({ type: "receipt", chargeId: c.id })
                                }
                              >
                                <ArrowDownLeft size={15} />
                                Registrar
                              </button>
                            ) : (
                              <span className="rental-settled">
                                <Check size={15} />
                                Quitado
                              </span>
                            )}
                            {Number(c.received_cents) === 0 && (
                              <button
                                disabled={needsRefresh}
                                className="crm-link"
                                onClick={() =>
                                  openModal({ type: "adjust", chargeId: c.id })
                                }
                              >
                                Ajustar cobrança
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="Nenhuma cobrança nesta seleção"
                text="Gere a competência dos contratos em vigor ou ajuste os filtros acima."
              />
            )}
            <p className="rental-table-note">
              Os totais correspondem à competência selecionada, mesmo quando o
              recebimento ocorre em outro mês. Recebimentos são registros
              manuais.
            </p>
          </>
        )}
        {tab === "payouts" && (
          <>
            <div className="rental-section-heading">
              <div>
                <h2>Repasses de {monthLabel(month)}</h2>
                <p>Recebido menos administração e repasses já realizados.</p>
              </div>
              <button
                className="crm-btn"
                disabled={!monthCharges.length}
                onClick={download}
              >
                <Download size={15} />
                Exportar demonstrativo
              </button>
            </div>
            {visiblePayouts.length ? (
              <div className="crm-table-wrap">
                <table className="crm-table rental-table">
                  <thead>
                    <tr>
                      <th>Proprietário / imóvel</th>
                      <th>Previsão</th>
                      <th>Recebido</th>
                      <th>Administração</th>
                      <th>Já repassado</th>
                      <th>Disponível</th>
                      <th>
                        <span className="crm-sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePayouts.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <strong>{propertyOf(c)?.owner_name}</strong>
                          <small>{propertyOf(c)?.title}</small>
                        </td>
                        <td>
                          {c.transfer_date
                            ? fullDate(c.transfer_date)
                            : `Dia ${contractMap.get(c.contract_id)?.transfer_day}`}
                          <small>Após o recebimento</small>
                        </td>
                        <td>{currency(c.received_cents)}</td>
                        <td>{currency(c.fee_cents)}</td>
                        <td>{currency(c.payout_cents)}</td>
                        <td>
                          <strong>{currency(available(c))}</strong>
                        </td>
                        <td>
                          {available(c) > 0 ? (
                            <button
                              disabled={needsRefresh}
                              className="crm-btn"
                              onClick={() =>
                                openModal({ type: "payout", chargeId: c.id })
                              }
                            >
                              <ArrowUpRight size={15} />
                              Registrar repasse
                            </button>
                          ) : (
                            <span className="rental-muted">
                              {Number(c.received_cents) > 0
                                ? "Sem saldo a repassar"
                                : "Aguardando recebimento"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="Nenhum repasse nesta seleção"
                text="O valor fica disponível após registrar o recebimento do aluguel."
              />
            )}
            <p className="rental-table-note">
              O repasse deve ser realizado pelo banco e registrado aqui. Nenhuma
              transferência é iniciada pelo CRM.
            </p>
          </>
        )}
        {tab === "issues" && (
          <>
            <div className="rental-section-heading">
              <div>
                <h2>Pendências da carteira</h2>
                <p>
                  Manutenção, vistorias e solicitações com prazo e andamento.
                </p>
              </div>
              <button
                className="crm-btn crm-btn-primary"
                disabled={needsRefresh || !activeProperties.length}
                onClick={() => openModal({ type: "issue" })}
              >
                <Plus size={16} />
                Nova pendência
              </button>
            </div>
            {visibleIssues.length ? (
              <div className="rental-issue-list">
                {visibleIssues.map((i) => (
                  <article key={i.id}>
                    <span className={`rental-issue-mark ${i.priority}`}>
                      <AlertCircle size={19} />
                    </span>
                    <div>
                      <h3>{i.title}</h3>
                      <p>{propertyMap.get(i.property_id)?.title}</p>
                      {i.description && <small>{i.description}</small>}
                    </div>
                    <div className="rental-issue-state">
                      <Status value={i.status}>
                        {issueStatuses[i.status]}
                      </Status>
                      <small
                        className={
                          i.due_date &&
                          i.due_date < day &&
                          i.status !== "resolved"
                            ? "rental-late"
                            : ""
                        }
                      >
                        {i.due_date
                          ? `Prazo: ${fullDate(i.due_date)}`
                          : "Sem prazo"}{" "}
                        · {priorities[i.priority]}
                      </small>
                    </div>
                    <button
                      disabled={needsRefresh}
                      className="crm-btn"
                      onClick={() => openModal({ type: "issue", item: i })}
                    >
                      <Pencil size={15} />
                      Atualizar
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <Empty
                title="Nenhuma pendência nesta seleção"
                text="Adicione as solicitações da locação para acompanhar quem cuida de cada assunto e o próximo prazo."
              />
            )}
          </>
        )}
      </div>
      {modal?.type === "property" && (
        <PropertyForm
          item={modal.item}
          catalog={imoveis}
          onClose={() => setModal(null)}
          onSave={(values) =>
            mutate(() => repo.saveProperty(values), "Imóvel salvo na carteira.")
          }
        />
      )}
      {modal?.type === "contract" && (
        <ContractForm
          item={modal.item}
          propertyId={modal.propertyId}
          properties={data.properties}
          onClose={() => setModal(null)}
          onSave={(values) =>
            mutate(() => repo.saveContract(values), "Contrato salvo.")
          }
        />
      )}
      {modal?.type === "issue" && (
        <IssueForm
          item={modal.item}
          propertyId={modal.propertyId}
          properties={data.properties}
          onClose={() => setModal(null)}
          onSave={(values) =>
            mutate(() => repo.saveIssue(values), "Pendência atualizada.")
          }
        />
      )}
      {modal?.type === "generate" && (
        <GenerateForm
          month={month}
          contracts={data.contracts}
          properties={data.properties}
          charges={data.charges}
          onClose={() => setModal(null)}
          onSave={async (values) => {
            const result = await mutate(
              () => repo.generateCharges(values),
              "Competência processada.",
            );
            setMonth(values.month);
            setNotice(
              `${result.created} ${result.created === 1 ? "cobrança gerada" : "cobranças geradas"}. Lançamentos existentes foram preservados.`,
            );
          }}
        />
      )}
      {modal?.type === "adjust" &&
        (() => {
          const charge = data.charges.find((c) => c.id === modal.chargeId);
          return (
            charge && (
              <AdjustmentForm
                charge={charge}
                property={propertyOf(charge)}
                onClose={() => setModal(null)}
                onSave={(values) =>
                  mutate(
                    () => repo.adjustCharge(values),
                    "Valor da cobrança ajustado. O motivo foi salvo no histórico.",
                  )
                }
              />
            )
          );
        })()}
      {["receipt", "payout"].includes(modal?.type) &&
        (() => {
          const charge = data.charges.find((c) => c.id === modal.chargeId);
          return (
            charge && (
              <MoneyForm
                kind={modal.type}
                charge={charge}
                contract={contractMap.get(charge.contract_id)}
                property={propertyOf(charge)}
                onClose={() => setModal(null)}
                onSave={(values) =>
                  mutate(
                    () =>
                      modal.type === "receipt"
                        ? repo.recordReceipt(values)
                        : repo.recordPayout(values),
                    modal.type === "receipt"
                      ? "Recebimento registrado."
                      : "Repasse registrado.",
                  )
                }
              />
            )
          );
        })()}
      {selectedContract && (
        <ContractDetail
          readOnly={needsRefresh}
          contract={selectedContract}
          property={propertyMap.get(selectedContract.property_id)}
          data={data}
          repo={repo}
          mutate={mutate}
          onClose={() => setModal(null)}
          onEdit={(item) => openModal({ type: "contract", item })}
          onIssue={(propertyId) => openModal({ type: "issue", propertyId })}
        />
      )}
    </div>
  );
}
