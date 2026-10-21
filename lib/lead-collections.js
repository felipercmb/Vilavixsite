const HISTORICAL_IMPORT = "Importado da planilha de leads da VilaVix.";

// This import was the historical list distributed for prospecting. A contact's
// age, campaign name and current funnel stage do not change its collection.
export function leadCollection(lead) {
  return String(lead.notas || "").trimStart().startsWith(HISTORICAL_IMPORT)
    ? "prospeccao"
    : "entrada";
}

export function filterLeadCollection(leads, collection = "all") {
  return collection === "all" ? leads : leads.filter(lead => leadCollection(lead) === collection);
}

// Freeze the filtered order when opening a contact. New arrivals or stage
// changes must not move the operator's place in the queue. Deleted rows vanish.
export function contactNavigation(queue, selectedId, leads) {
  const available = new Set(leads.map(lead => String(lead.id)));
  const ids = [...new Set(queue.map(String))].filter(id => available.has(id));
  const index = ids.indexOf(String(selectedId));
  return {
    position: index < 0 ? 0 : index + 1,
    total: ids.length,
    previous: index > 0 ? ids[index - 1] : null,
    next: index >= 0 && index < ids.length - 1 ? ids[index + 1] : null,
  };
}
