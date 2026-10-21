import { leadCollectionChange } from "./lead-collections.js";

// Selection is a snapshot: new arrivals never join an existing selection.
export function selectedLeadIds(ids, leads) {
  const available = new Set(leads.map(lead => String(lead.id)));
  return [...new Set(ids.map(String))].filter(id => available.has(id));
}

export function toggleLeadSelection(ids, pageIds, checked) {
  const selection = new Set(ids.map(String));
  for (const id of pageIds.map(String)) {
    if (checked) selection.add(id);
    else selection.delete(id);
  }
  return [...selection];
}

// Small authenticated PATCHes avoid URL/response limits. RLS can omit rows
// silently: only matching IDs returned by the database count as confirmed.
// On a request failure, stop; the unconfirmed snapshot remains safe to retry.
export async function moveLeadCollections(ids, collection, writeBatch, onConfirmed = () => {}) {
  const changes = leadCollectionChange(collection);
  const requestedIds = [...new Set(ids.map(String))];
  const confirmed = new Set();
  let error = null;
  for (let offset = 0; offset < requestedIds.length; offset += 100) {
    const batch = requestedIds.slice(offset, offset + 100);
    let result;
    try { result = await writeBatch(batch, changes); }
    catch (err) { error = err; break; }
    if (result?.error) { error = result.error; break; }
    const expected = new Set(batch);
    const saved = [...new Set((Array.isArray(result?.data) ? result.data : [])
      .filter(row => row && expected.has(String(row.id)) && row.carteira === collection)
      .map(row => String(row.id)))];
    saved.forEach(id => confirmed.add(id));
    if (saved.length) onConfirmed(saved, changes);
    if (!Array.isArray(result?.data)) {
      error = new Error("O banco não confirmou esta movimentação.");
      break;
    }
  }
  return {
    confirmedIds: [...confirmed],
    unconfirmedIds: requestedIds.filter(id => !confirmed.has(id)),
    error,
  };
}
