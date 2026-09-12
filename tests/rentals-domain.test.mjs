import test from "node:test";
import assert from "node:assert/strict";
import {
  chargeTotals,
  contractsForMonth,
  dateInMonth,
  feeCents,
  isoDate,
  monthStart,
  rentalToday,
  validateContract,
  validateDocument,
  validateLedgerEntry,
} from "../lib/rental-domain.js";

test("rental money: cumulative fee rounding, partial receipts and available payout are exact", () => {
  const charge = { id: "charge", amount_cents: 300001, admin_fee_bps: 1000 };
  const totals = chargeTotals(
    charge,
    [
      { charge_id: "charge", amount_cents: 100005 },
      { charge_id: "other", amount_cents: 90000 },
    ],
    [{ charge_id: "charge", amount_cents: 50000 }],
  );
  assert.deepEqual(
    [totals.received_cents, totals.fee_cents, totals.payout_cents],
    [100005, 10001, 50000],
  );
  assert.equal(feeCents(100_000_000_000, 9999), 99_990_000_000);
  assert.equal(
    validateLedgerEntry(
      "payout",
      { amountCents: 40004, date: "2024-02-12" },
      totals,
      "2024-02-12",
    ).amount_cents,
    40004,
  );
  assert.throws(
    () =>
      validateLedgerEntry(
        "payout",
        { amountCents: 40005, date: "2024-02-12" },
        totals,
        "2024-02-12",
      ),
    /excede/,
  );
  assert.throws(
    () =>
      validateLedgerEntry(
        "receipt",
        { amountCents: 200000, date: "2024-02-12" },
        totals,
        "2024-02-12",
      ),
    /excede/,
  );
  assert.throws(
    () =>
      validateLedgerEntry(
        "receipt",
        { amountCents: 1.5, date: "2024-02-12" },
        totals,
        "2024-02-12",
      ),
    /inteiro/,
  );
  assert.throws(
    () =>
      validateLedgerEntry(
        "receipt",
        { amountCents: 1, date: "2024-02-13" },
        totals,
        "2024-02-12",
      ),
    /futuras/,
  );
});
test("rental dates: valid dates, São Paulo calendar, month bounds and real contract periods", () => {
  assert.equal(rentalToday(new Date("2024-03-01T01:30:00Z")), "2024-02-29");
  assert.throws(() => isoDate("2024-02-30"), /válida/);
  assert.equal(monthStart("2024-02"), "2024-02-01");
  assert.equal(dateInMonth("2024-02", 31), "2024-02-29");
  const properties = [
    { id: "p", archived: false },
    { id: "archived", archived: true },
  ];
  const base = {
    property_id: "p",
    status: "active",
    start_date: "2024-01-15",
    end_date: "2024-03-12",
  };
  const contracts = [
    base,
    { ...base, status: "draft" },
    { ...base, property_id: "archived" },
    { ...base, start_date: "2025-01-01", end_date: null },
  ];
  assert.equal(
    contractsForMonth(contracts, properties, "2024-02", "2024-08-01").length,
    1,
  );
  assert.equal(
    contractsForMonth(contracts, properties, "2024-04", "2024-08-01").length,
    0,
  );
  assert.throws(
    () => contractsForMonth(contracts, properties, "2024-09", "2024-08-01"),
    /atual/,
  );
  assert.throws(
    () =>
      validateContract({
        property_id: "p",
        tenant_name: "A",
        start_date: "2024-03-01",
        end_date: "2024-02-01",
      }),
    /posterior/,
  );
});
test("rental attachments accept only bounded PDF/JPG/PNG files", () => {
  assert.equal(validateDocument({ size: 100, type: "application/pdf" }), "pdf");
  assert.throws(
    () => validateDocument({ size: 100, type: "image/svg+xml" }),
    /PDF/,
  );
  assert.throws(
    () => validateDocument({ size: 10485761, type: "application/pdf" }),
    /10 MB/,
  );
  assert.throws(
    () => validateDocument({ size: 0, type: "application/pdf" }),
    /vazio/,
  );
});
