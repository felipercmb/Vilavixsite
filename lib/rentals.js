import { supabase } from "./supabase.js";
import {
  chargeTotals,
  contractsForMonth,
  dateInMonth,
  integer,
  isoDate,
  monthStart,
  rentalToday,
  validateContract,
  validateDocument,
  validateIssue,
  validateLedgerEntry,
  validateProperty,
} from "./rental-domain.js";

const TABLES = {
  properties: "rental_properties",
  contracts: "rental_contracts",
  charges: "rental_charges",
  receipts: "rental_receipts",
  payouts: "rental_payouts",
  issues: "rental_issues",
  documents: "rental_documents",
  audit: "rental_audit",
};
const pendingRequests = new Map();
const uuid = () => crypto.randomUUID();
async function retryToken(scope, payload, explicitId) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify([scope, payload])),
  );
  const key =
    "vilavix:rental-attempt:" +
    Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  let stored;
  try {
    stored = sessionStorage.getItem(key);
  } catch {
    /* The in-memory key still covers a retry in this page. */
  }
  const id = pendingRequests.get(key) || stored || explicitId || uuid();
  pendingRequests.set(key, id);
  try {
    sessionStorage.setItem(key, id);
  } catch {
    /* Browsers may disable session storage. */
  }
  return {
    id,
    clear() {
      pendingRequests.delete(key);
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* Nothing persisted. */
      }
    },
  };
}
const fail = (error) => {
  if (
    error?.code === "42501" ||
    /não autorizado|not authorized|permission denied|row-level security/i.test(
      error?.message || "",
    )
  )
    return new Error(
      "Seu acesso à carteira de aluguel não está liberado. Fale com o responsável pela liberação.",
    );
  if (["PGRST202", "42P01", "42883"].includes(error?.code))
    return new Error(
      "A gestão de aluguéis ainda precisa ser ativada no banco de dados. Solicite a aplicação da migração de aluguéis.",
    );
  if (/fetch|network|failed to|load failed/i.test(error?.message || ""))
    return new Error(
      "Não foi possível confirmar a operação com o servidor. Confira a conexão e tente novamente; a mesma tentativa não duplica lançamentos.",
    );
  return new Error(
    error?.message || "Não foi possível concluir a operação. Tente novamente.",
  );
};
async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw fail(error);
  return data;
}
async function allRows(table) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("id")
      .range(offset, offset + 499);
    if (error) throw fail(error);
    rows.push(...(data || []));
    if (!data || data.length < 500) return rows;
  }
}
function seed(userId) {
  const today = rentalToday(),
    month = monthStart(today),
    previous = new Date(`${month}T12:00:00Z`);
  previous.setUTCMonth(previous.getUTCMonth() - 1);
  const start = previous.toISOString().slice(0, 10),
    now = new Date().toISOString();
  const p1 = "00000000-0000-4000-8000-000000000101",
    p2 = "00000000-0000-4000-8000-000000000102",
    p3 = "00000000-0000-4000-8000-000000000103";
  const c1 = "00000000-0000-4000-8000-000000000201",
    c2 = "00000000-0000-4000-8000-000000000202";
  const ch1 = "00000000-0000-4000-8000-000000000301",
    ch2 = "00000000-0000-4000-8000-000000000302";
  const properties = [
    {
      id: p1,
      title: "Exemplo · Apartamento em Itapuã",
      address: "Endereço fictício para demonstração",
      owner_name: "Proprietária de exemplo A",
      owner_contact: "",
      notes: "Cadastro fictício da prévia local.",
      archived: false,
      catalog_ref: null,
      created_at: now,
    },
    {
      id: p2,
      title: "Exemplo · Apartamento na Praia da Costa",
      address: "Endereço fictício para demonstração",
      owner_name: "Proprietário de exemplo B",
      owner_contact: "",
      notes: "Cadastro fictício da prévia local.",
      archived: false,
      catalog_ref: null,
      created_at: now,
    },
    {
      id: p3,
      title: "Exemplo · Apartamento disponível em Itaparica",
      address: "Endereço fictício para demonstração",
      owner_name: "Proprietária de exemplo C",
      owner_contact: "",
      notes: "Cadastro fictício da prévia local.",
      archived: false,
      catalog_ref: null,
      created_at: now,
    },
  ];
  const contracts = [
    {
      id: c1,
      property_id: p1,
      tenant_name: "Locatária de exemplo A",
      tenant_contact: "",
      start_date: start,
      end_date: null,
      rent_cents: 280000,
      admin_fee_bps: 1000,
      due_day: 5,
      transfer_day: 10,
      status: "active",
      adjustment_date: `${Number(today.slice(0, 4)) + 1}${start.slice(4)}`,
      adjustment_index: "Índice a combinar",
      notes: "Contrato fictício; nenhum documento real foi utilizado.",
      created_at: now,
    },
    {
      id: c2,
      property_id: p2,
      tenant_name: "Locatário de exemplo B",
      tenant_contact: "",
      start_date: start,
      end_date: null,
      rent_cents: 420000,
      admin_fee_bps: 1000,
      due_day: 10,
      transfer_day: 15,
      status: "active",
      adjustment_date: null,
      adjustment_index: "",
      notes: "Contrato fictício; nenhum documento real foi utilizado.",
      created_at: now,
    },
  ];
  const charges = contracts.map((c, i) => ({
    id: i ? ch2 : ch1,
    contract_id: c.id,
    reference_month: month,
    due_date: dateInMonth(month, c.due_day),
    transfer_date: dateInMonth(month, c.transfer_day),
    amount_cents: c.rent_cents,
    admin_fee_bps: c.admin_fee_bps,
    received_cents: 0,
    payout_cents: 0,
    fee_cents: 0,
    created_at: now,
  }));
  const receipts = [
    {
      id: uuid(),
      charge_id: ch1,
      amount_cents: 140000,
      date: today,
      method: "pix",
      note: "Recebimento parcial fictício.",
      request_id: uuid(),
      created_by: userId,
      created_at: now,
    },
  ];
  const issues = [
    {
      id: uuid(),
      property_id: p1,
      title: "Exemplo · Acompanhar reparo da torneira",
      description:
        "Pendência fictícia para revisar o acompanhamento da manutenção.",
      priority: "normal",
      status: "open",
      due_date: today,
      created_at: now,
    },
  ];
  return {
    properties,
    contracts,
    charges,
    receipts,
    payouts: [],
    issues,
    documents: [],
    audit: [
      {
        id: uuid(),
        actor_id: userId,
        action: "demo",
        entity_type: "rental_properties",
        entity_id: p1,
        details: {
          note: "Dados fictícios de demonstração criados neste navegador.",
        },
        created_at: now,
      },
    ],
    documentData: {},
  };
}
function ensureContractPeriod(state, row) {
  const property = state.properties.find(
    (p) => p.id === row.property_id && !p.archived,
  );
  if (!property) throw new Error("Selecione um imóvel ativo da carteira.");
  const old = state.contracts.find((c) => c.id === row.id);
  const charges = state.charges.filter((c) => c.contract_id === row.id);
  if (
    charges.length &&
    old &&
    (old.property_id !== row.property_id || row.status === "draft")
  )
    throw new Error(
      "Um contrato com cobranças não pode trocar de imóvel ou voltar a rascunho.",
    );
  if (
    row.status !== "draft" &&
    state.contracts.some(
      (c) =>
        c.id !== row.id &&
        c.property_id === row.property_id &&
        c.status !== "draft" &&
        c.start_date <= (row.end_date || "9999-12-31") &&
        (c.end_date || "9999-12-31") >= row.start_date,
    )
  )
    throw new Error(
      "Já existe um contrato neste imóvel para esse período. Revise as datas.",
    );
  if (
    charges.some(
      (c) =>
        (row.end_date && c.reference_month > row.end_date) ||
        dateInMonth(c.reference_month, 31) < row.start_date,
    )
  )
    throw new Error(
      "As novas datas deixariam cobranças existentes fora do período do contrato.",
    );
}

export function createRentalRepository({ demo = false, userId } = {}) {
  if (demo && !import.meta.env.DEV)
    throw new Error(
      "A demonstração de aluguéis só está disponível na prévia local.",
    );
  const key = `vilavix:rental-review:v1:${userId || "local"}`;
  const readDemo = () => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        if (!Object.keys(TABLES).every((k) => Array.isArray(data[k])))
          throw new Error("Formato inválido");
        return data;
      }
      const data = seed(userId || "local-review");
      localStorage.setItem(key, JSON.stringify(data));
      return data;
    } catch {
      throw new Error(
        "Não foi possível abrir a demonstração salva neste navegador. Confira o armazenamento local.",
      );
    }
  };
  const changeDemo = (operation) => {
    const data = readDemo(),
      result = operation(data);
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      throw new Error(
        "O navegador não conseguiu salvar a alteração. Libere espaço de armazenamento e tente novamente.",
      );
    }
    return result;
  };
  const audit = (data, action, entity_type, row, before) =>
    data.audit.push({
      id: uuid(),
      actor_id: userId || "local-review",
      action,
      entity_type,
      entity_id: row.id,
      details: { ...(before ? { before } : {}), after: row },
      created_at: new Date().toISOString(),
    });
  const save = async (group, values, validate, procedure) => {
    const normalized = validate(values);
    const attempt = await retryToken(
      `${userId}:${group}`,
      normalized,
      values.id,
    );
    const row = { ...normalized, id: attempt.id };
    if (!demo) {
      const result = await rpc(procedure, { p_values: row });
      attempt.clear();
      return result;
    }
    attempt.clear();
    return changeDemo((data) => {
      if (
        group === "properties" &&
        row.archived &&
        data.contracts.some(
          (c) => c.property_id === row.id && c.status === "active",
        )
      )
        throw new Error(
          "Encerre os contratos ativos antes de arquivar o imóvel.",
        );
      if (group === "contracts") ensureContractPeriod(data, row);
      if (
        group === "issues" &&
        !data.properties.some((p) => p.id === row.property_id)
      )
        throw new Error("Imóvel não encontrado na carteira.");
      const index = data[group].findIndex((p) => p.id === row.id),
        before = index >= 0 ? data[group][index] : null;
      const saved = {
        ...before,
        ...row,
        created_at: before?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (index < 0) data[group].push(saved);
      else data[group][index] = saved;
      audit(data, before ? "update" : "insert", TABLES[group], saved, before);
      return saved;
    });
  };
  const ledger = async (kind, values) => {
    const payload = {
      chargeId: values.chargeId,
      amountCents: integer(values.amountCents, "Valor", 1),
      date: isoDate(values.date),
      note: String(values.note || "")
        .trim()
        .slice(0, 4000),
      ...(kind === "receipt"
        ? {
            method: String(values.method || "transferencia")
              .trim()
              .slice(0, 80),
          }
        : {}),
    };
    if (payload.date > rentalToday())
      throw new Error(
        "Informe a data em que o recebimento ou repasse aconteceu; datas futuras não são permitidas.",
      );
    const attempt = await retryToken(
      `${userId}:${kind}`,
      payload,
      values.requestId,
    );
    const requestId = attempt.id;
    let result;
    if (demo) {
      result = changeDemo((data) => {
        const list = kind === "receipt" ? data.receipts : data.payouts;
        const previous = list.find((r) => r.request_id === requestId);
        if (previous) {
          if (
            previous.charge_id !== payload.chargeId ||
            previous.amount_cents !== payload.amountCents ||
            previous.date !== payload.date ||
            previous.note !== payload.note ||
            (kind === "receipt" && previous.method !== payload.method)
          )
            throw new Error(
              "Identificador de lançamento já usado com outros dados.",
            );
          return previous;
        }
        const raw = data.charges.find((c) => c.id === values.chargeId);
        const charge = raw
          ? chargeTotals(raw, data.receipts, data.payouts)
          : null;
        const normalized = validateLedgerEntry(kind, payload, charge);
        const row = {
          id: uuid(),
          charge_id: values.chargeId,
          ...normalized,
          request_id: requestId,
          created_by: userId || "local-review",
          created_at: new Date().toISOString(),
        };
        list.push(row);
        audit(
          data,
          "insert",
          kind === "receipt" ? TABLES.receipts : TABLES.payouts,
          row,
        );
        return row;
      });
    } else {
      // The retry identifier survives an uncertain response for this exact payload.
      // All balance validation and changes happen in one locked database transaction.
      result = await rpc(
        kind === "receipt" ? "record_rental_receipt" : "record_rental_payout",
        {
          p_charge_id: payload.chargeId,
          p_amount_cents: payload.amountCents,
          p_date: payload.date,
          p_note: payload.note,
          p_request_id: requestId,
          ...(kind === "receipt" ? { p_method: payload.method } : {}),
        },
      );
    }
    attempt.clear();
    return result;
  };
  return {
    async getAccess() {
      return demo ? true : (await rpc("has_rental_access")) === true;
    },
    async load() {
      if (demo) {
        const data = readDemo();
        return Object.fromEntries(
          Object.keys(TABLES).map((k) => [
            k,
            k === "charges"
              ? data.charges.map((c) =>
                  chargeTotals(c, data.receipts, data.payouts),
                )
              : data[k],
          ]),
        );
      }
      if (!(await rpc("has_rental_access")))
        throw new Error("Seu acesso à carteira de aluguel não está liberado.");
      const result = await Promise.all(
        Object.entries(TABLES).map(async ([key, table]) => [
          key,
          await allRows(table),
        ]),
      );
      return Object.fromEntries(result);
    },
    saveProperty: (values) =>
      save("properties", values, validateProperty, "save_rental_property"),
    saveContract: (values) =>
      save("contracts", values, validateContract, "save_rental_contract"),
    saveIssue: (values) =>
      save("issues", values, validateIssue, "save_rental_issue"),
    async generateCharges({ month }) {
      const reference = monthStart(month);
      if (!demo) return rpc("generate_rental_charges", { p_month: reference });
      return changeDemo((data) => {
        let created = 0;
        for (const c of contractsForMonth(
          data.contracts,
          data.properties,
          reference,
        )) {
          if (
            data.charges.some(
              (r) => r.contract_id === c.id && r.reference_month === reference,
            )
          )
            continue;
          const row = {
            id: uuid(),
            contract_id: c.id,
            reference_month: reference,
            due_date: dateInMonth(reference, c.due_day),
            transfer_date: dateInMonth(reference, c.transfer_day),
            amount_cents: c.rent_cents,
            admin_fee_bps: c.admin_fee_bps,
            received_cents: 0,
            payout_cents: 0,
            fee_cents: 0,
            created_at: new Date().toISOString(),
          };
          data.charges.push(row);
          audit(data, "generate", TABLES.charges, row);
          created++;
        }
        return {
          created,
          total: data.charges.filter((c) => c.reference_month === reference)
            .length,
        };
      });
    },
    async adjustCharge({ chargeId, amountCents, reason }) {
      const amount = integer(amountCents, "Valor da cobrança", 1);
      const note = String(reason || "").trim();
      if (note.length < 3 || note.length > 4000)
        throw new Error(
          "Informe o motivo do ajuste, com pelo menos três caracteres.",
        );
      if (!demo)
        return rpc("adjust_rental_charge", {
          p_charge_id: chargeId,
          p_amount_cents: amount,
          p_reason: note,
        });
      return changeDemo((data) => {
        const index = data.charges.findIndex((c) => c.id === chargeId);
        if (index < 0) throw new Error("Cobrança não encontrada.");
        if (data.receipts.some((r) => r.charge_id === chargeId))
          throw new Error(
            "Uma cobrança com recebimentos não pode ter o valor alterado.",
          );
        const before = data.charges[index],
          row = { ...before, amount_cents: amount };
        data.charges[index] = row;
        data.audit.push({
          id: uuid(),
          actor_id: userId || "local-review",
          action: "adjust",
          entity_type: TABLES.charges,
          entity_id: chargeId,
          details: { before, after: row, reason: note },
          created_at: new Date().toISOString(),
        });
        return chargeTotals(row, data.receipts, data.payouts);
      });
    },
    recordReceipt: (values) => ledger("receipt", values),
    recordPayout: (values) => ledger("payout", values),
    async uploadDocument({ contractId, file }) {
      const extension = validateDocument(file);
      const firstBytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
      const validSignature =
        extension === "pdf"
          ? String.fromCharCode(...firstBytes.slice(0, 5)) === "%PDF-"
          : extension === "jpg"
            ? firstBytes[0] === 0xff &&
              firstBytes[1] === 0xd8 &&
              firstBytes[2] === 0xff
            : [137, 80, 78, 71, 13, 10, 26, 10].every(
                (b, i) => firstBytes[i] === b,
              );
      if (!validSignature)
        throw new Error(
          "O conteúdo do arquivo não corresponde ao formato PDF, JPG ou PNG informado.",
        );
      const fileHash = Array.from(
        new Uint8Array(
          await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
        ),
        (b) => b.toString(16).padStart(2, "0"),
      ).join("");
      const attempt = await retryToken(`${userId}:document`, [
        contractId,
        file.name,
        file.size,
        fileHash,
      ]);
      const id = attempt.id,
        storage_path = `${contractId}/${id}.${extension}`;
      const row = {
        id,
        contract_id: contractId,
        name: String(file.name || `documento.${extension}`)
          .replace(/[\\/\u0000-\u001f]/g, "_")
          .slice(0, 240),
        storage_path,
        size_bytes: file.size,
        mime_type: file.type,
      };
      if (demo) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () =>
            reject(new Error("Não foi possível ler o documento."));
          reader.readAsDataURL(file);
        });
        return changeDemo((data) => {
          if (!data.contracts.some((c) => c.id === contractId))
            throw new Error("Contrato não encontrado.");
          const saved = {
            ...row,
            uploaded_by: userId || "local-review",
            created_at: new Date().toISOString(),
          };
          data.documents.push(saved);
          data.documentData ||= {};
          data.documentData[id] = dataUrl;
          audit(data, "insert", TABLES.documents, saved);
          attempt.clear();
          return saved;
        });
      }
      const { error } = await supabase.storage
        .from("rental-documents")
        .upload(storage_path, file, { upsert: false, contentType: file.type });
      if (
        error &&
        String(error.statusCode) !== "409" &&
        !/already exists|duplicate/i.test(error.message || "")
      )
        throw fail(error);
      const result = await rpc("register_rental_document", { p_values: row });
      attempt.clear();
      return result;
    },
    async getDocumentUrl(document) {
      if (demo) {
        const data = readDemo();
        const dataUrl = data.documentData?.[document.id];
        if (!data.documents.some((d) => d.id === document.id) || !dataUrl)
          throw new Error(
            "O documento não está disponível nesta demonstração.",
          );
        const response = await fetch(dataUrl);
        const url = URL.createObjectURL(await response.blob());
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return url;
      }
      if (!(await rpc("has_rental_access")))
        throw new Error("Seu acesso à carteira de aluguel não está liberado.");
      const { data, error } = await supabase.storage
        .from("rental-documents")
        .createSignedUrl(document.storage_path, 60, {
          download: document.name,
        });
      if (error) throw fail(error);
      if (!data?.signedUrl)
        throw new Error("Não foi possível abrir o documento. Tente novamente.");
      return data.signedUrl;
    },
  };
}
