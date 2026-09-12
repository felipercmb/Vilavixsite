// All monetary amounts use integer centavos. No floating-point currency enters the ledger.
export const RENTAL_LIMIT_CENTS = 100_000_000_000;
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_TYPES = Object.freeze({
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
});
export function integer(value, name, min = 0, max = RENTAL_LIMIT_CENTS) {
  const n = Number(value);
  if (
    value === "" ||
    value === null ||
    value === undefined ||
    !Number.isSafeInteger(n) ||
    n < min ||
    n > max
  )
    throw new Error(
      `${name}: informe um número inteiro entre ${min} e ${max}.`,
    );
  return n;
}
export function isoDate(value, name = "Data", nullable = false) {
  if (!value && nullable) return null;
  const date = String(value || "");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(`${date}T12:00:00Z`)) ||
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date
  )
    throw new Error(`${name}: informe uma data válida.`);
  return date;
}
export function rentalToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function monthStart(value) {
  const date = /^\d{4}-\d{2}$/.test(String(value)) ? `${value}-01` : value;
  isoDate(date, "Competência");
  return `${date.slice(0, 7)}-01`;
}
export function dateInMonth(month, day) {
  const start = monthStart(month);
  const last = new Date(
    Date.UTC(Number(start.slice(0, 4)), Number(start.slice(5, 7)), 0),
  ).getUTCDate();
  return `${start.slice(0, 7)}-${String(Math.min(integer(day, "Dia", 1, 31), last)).padStart(2, "0")}`;
}
export function feeCents(received, bps) {
  const amount = integer(received, "Valor recebido");
  const rate = integer(bps, "Taxa de administração", 0, 10000);
  // BigInt also keeps the half-cent rounding exact for large ledgers.
  return Number((BigInt(amount) * BigInt(rate) + 5000n) / 10000n);
}
export function chargeTotals(charge, receipts = [], payouts = []) {
  const received_cents = receipts
    .filter((r) => r.charge_id === charge.id)
    .reduce((sum, r) => sum + integer(r.amount_cents, "Recebimento", 1), 0);
  const payout_cents = payouts
    .filter((r) => r.charge_id === charge.id)
    .reduce((sum, r) => sum + integer(r.amount_cents, "Repasse", 1), 0);
  const fee_cents = feeCents(received_cents, charge.admin_fee_bps);
  return { ...charge, received_cents, payout_cents, fee_cents };
}
export function validateLedgerEntry(
  kind,
  values,
  charge,
  today = rentalToday(),
) {
  if (!charge) throw new Error("Cobrança não encontrada. Atualize a carteira.");
  const amount = integer(values.amountCents, "Valor", 1);
  const date = isoDate(values.date);
  if (date > today)
    throw new Error(
      "Informe a data em que o recebimento ou repasse aconteceu; datas futuras não são permitidas.",
    );
  const maximum =
    kind === "receipt"
      ? charge.amount_cents - charge.received_cents
      : charge.received_cents - charge.fee_cents - charge.payout_cents;
  if (amount > maximum)
    throw new Error(
      kind === "receipt"
        ? "O valor excede o saldo em aberto desta cobrança."
        : "O repasse excede o saldo recebido disponível, após a taxa de administração.",
    );
  return {
    amount_cents: amount,
    date,
    note: String(values.note || "")
      .trim()
      .slice(0, 4000),
    ...(kind === "receipt"
      ? { method: String(values.method || "transferencia").slice(0, 80) }
      : {}),
  };
}
export function validateProperty(values) {
  const title = String(values.title || "").trim();
  const owner = String(values.owner_name || "").trim();
  if (!title || !owner)
    throw new Error("Informe o imóvel e o nome do proprietário.");
  return {
    ...(values.id ? { id: values.id } : {}),
    title: title.slice(0, 240),
    address: String(values.address || "")
      .trim()
      .slice(0, 1000),
    owner_name: owner.slice(0, 240),
    owner_contact: String(values.owner_contact || "")
      .trim()
      .slice(0, 500),
    catalog_ref:
      String(values.catalog_ref || "")
        .trim()
        .slice(0, 120) || null,
    notes: String(values.notes || "")
      .trim()
      .slice(0, 8000),
    archived: Boolean(values.archived),
  };
}
export function validateContract(values) {
  if (!values.property_id || !String(values.tenant_name || "").trim())
    throw new Error("Selecione o imóvel e informe o locatário.");
  const start_date = isoDate(values.start_date, "Início do contrato");
  const end_date = isoDate(values.end_date, "Fim do contrato", true);
  if (end_date && end_date < start_date)
    throw new Error("O fim do contrato deve ser igual ou posterior ao início.");
  const status = values.status || "draft";
  if (!["draft", "active", "ended"].includes(status))
    throw new Error("Situação do contrato inválida.");
  if (status === "ended" && !end_date)
    throw new Error("Informe a data de encerramento do contrato.");
  return {
    ...(values.id ? { id: values.id } : {}),
    property_id: values.property_id,
    tenant_name: String(values.tenant_name).trim().slice(0, 240),
    tenant_contact: String(values.tenant_contact || "")
      .trim()
      .slice(0, 500),
    start_date,
    end_date,
    rent_cents: integer(values.rent_cents, "Aluguel", 1),
    admin_fee_bps: integer(
      values.admin_fee_bps ?? 0,
      "Taxa de administração",
      0,
      10000,
    ),
    due_day: integer(values.due_day, "Dia de vencimento", 1, 31),
    transfer_day: integer(values.transfer_day, "Dia de repasse", 1, 31),
    status,
    adjustment_date: isoDate(values.adjustment_date, "Data do reajuste", true),
    adjustment_index: String(values.adjustment_index || "")
      .trim()
      .slice(0, 100),
    notes: String(values.notes || "")
      .trim()
      .slice(0, 8000),
  };
}
export function validateIssue(values) {
  if (!values.property_id || !String(values.title || "").trim())
    throw new Error("Selecione o imóvel e descreva a pendência.");
  const status = values.status || "open",
    priority = values.priority || "normal";
  if (
    !["open", "in_progress", "resolved"].includes(status) ||
    !["low", "normal", "high"].includes(priority)
  )
    throw new Error("Situação ou prioridade inválida.");
  return {
    ...(values.id ? { id: values.id } : {}),
    property_id: values.property_id,
    title: String(values.title).trim().slice(0, 240),
    description: String(values.description || "")
      .trim()
      .slice(0, 8000),
    status,
    priority,
    due_date: isoDate(values.due_date, "Prazo", true),
  };
}
export function contractsForMonth(
  contracts,
  properties,
  month,
  today = rentalToday(),
) {
  const start = monthStart(month),
    end = dateInMonth(start, 31);
  if (start > monthStart(today))
    throw new Error(
      "Gere cobranças da competência atual ou de meses anteriores.",
    );
  return contracts.filter(
    (c) =>
      c.status !== "draft" &&
      c.start_date <= end &&
      (!c.end_date || c.end_date >= start) &&
      properties.some((p) => p.id === c.property_id && !p.archived),
  );
}
export function validateDocument(file) {
  if (!file || !DOCUMENT_TYPES[file.type])
    throw new Error("Selecione um documento PDF ou uma imagem JPG/PNG.");
  if (
    !Number.isSafeInteger(file.size) ||
    file.size < 1 ||
    file.size > DOCUMENT_MAX_BYTES
  )
    throw new Error("O documento deve ter até 10 MB e não pode estar vazio.");
  return DOCUMENT_TYPES[file.type];
}
