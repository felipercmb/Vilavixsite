import test from "node:test";
import assert from "node:assert/strict";
import {
  campaignEligibility,
  routingDay,
  routingPreview,
} from "../lib/routing.js";
import { normalizeCampaign, fetchCampaigns } from "../server/zernio.js";
const now = new Date("2026-09-12T15:00:00Z");
const active = {
  id: "campaign",
  source: "meta",
  effective_status: "ACTIVE",
  synced_at: now.toISOString(),
  routing_enabled: true,
  broker_ids: ["a", "b"],
  weights: { a: 2, b: 1 },
  daily_limit: 3,
};
const brokers = [
  { id: "a", nome: "A", ativo: true },
  { id: "b", nome: "B", ativo: true },
];
test("paused, future, expired and stale campaigns cannot assign leads", () => {
  for (const override of [
    { effective_status: "PAUSED" },
    { routing_enabled: false },
    { start_time: "2026-09-13" },
    { stop_time: "2026-09-11" },
    { synced_at: "2026-09-10" },
    { synced_at: "invalid" },
  ])
    assert.ok(campaignEligibility({ ...active, ...override }, now));
  assert.equal(campaignEligibility(active, now), null);
});
test("uses Sao Paulo day boundary instead of UTC", () => {
  assert.equal(routingDay("2026-09-13T01:00:00Z"), "2026-09-12");
});
test("weighted routing distributes 2 to 1 and respects daily capacity", () => {
  const history = [];
  for (let i = 0; i < 6; i++) {
    const p = routingPreview(active, brokers, history, now);
    assert.ok(p.nextBroker);
    history.push({
      campaign_id: "campaign",
      broker_id: p.nextBroker.id,
      assigned_at: now.toISOString(),
    });
  }
  assert.equal(
    history.slice(0, 3).filter((h) => h.broker_id === "a").length,
    2,
  );
  assert.equal(history.filter((h) => h.broker_id === "a").length, 3);
  assert.equal(routingPreview(active, brokers, history, now).nextBroker, null);
});
test("excludes inactive, zero-weight and nonparticipant brokers", () => {
  assert.equal(
    routingPreview(
      { ...active, weights: { a: 0, b: 1 } },
      [{ ...brokers[1], ativo: false }, brokers[0], { id: "c", ativo: true }],
      [],
      now,
    ).nextBroker,
    null,
  );
});
test("campaign parent pause dominates active ad aggregation", () => {
  assert.equal(
    normalizeCampaign(
      {
        platformCampaignId: "1",
        platform: "facebook",
        status: "active",
        platformCampaignStatus: "PAUSED",
      },
      now.toISOString(),
    ).effective_status,
    "PAUSED",
  );
  assert.equal(
    normalizeCampaign(
      {
        platformCampaignId: "1",
        status: "paused",
        platformCampaignStatus: "ACTIVE",
      },
      now.toISOString(),
    ).effective_status,
    "PAUSED",
  );
});
test("Zernio adapter follows pagination, includes external ads, deduplicates Meta ids", async () => {
  const calls = [];
  const fetcher = async (url) => {
    calls.push(url);
    const page = Number(url.searchParams.get("page"));
    return {
      ok: true,
      status: 200,
      json: async () =>
        page
          ? {
              campaigns: [
                {
                  platformCampaignId: String(page),
                  platformAdAccountId: "act_1",
                  platform: "facebook",
                  campaignName: "Campaign " + page,
                  status: "active",
                  platformCampaignStatus: "ACTIVE",
                },
              ],
              pagination: { pages: 2 },
            }
          : {
              campaign: {
                id: url.pathname.split("/").pop(),
                status: "ACTIVE",
                effective_status: "ACTIVE",
              },
            },
    };
  };
  const r = await fetchCampaigns(
    {
      ZERNIO_API_KEY: "test-only",
      ZERNIO_ACCOUNT_ID: "connection",
      ZERNIO_AD_ACCOUNT_ID: "act_1",
    },
    fetcher,
  );
  assert.equal(r.campaigns.length, 2);
  assert.equal(r.active, 2);
  assert.equal(calls[1].searchParams.get("page"), "2");
  assert.equal(calls[0].searchParams.get("source"), "all");
  assert.equal(calls[0].searchParams.get("adAccountId"), "act_1");
});
test("live Zernio status blocks a campaign whose cached aggregate is active", async () => {
  const env = {
    ZERNIO_API_KEY: "test-only",
    ZERNIO_ACCOUNT_ID: "connection",
    ZERNIO_AD_ACCOUNT_ID: "act_1",
  };
  const result = await fetchCampaigns(env, async (url) => ({
    ok: true,
    status: 200,
    json: async () =>
      url.searchParams.has("page")
        ? {
            campaigns: [
              {
                platformCampaignId: "1",
                platformAdAccountId: "act_1",
                platform: "facebook",
                status: "active",
                platformCampaignStatus: "ACTIVE",
              },
            ],
          }
        : {
            campaign: { id: "1", status: "PAUSED", effective_status: "PAUSED" },
          },
  }));
  assert.equal(result.active, 0);
  assert.equal(result.campaigns[0].effective_status, "PAUSED");
});
test("failed or incomplete provider reads never become an empty success", async () => {
  const env = {
    ZERNIO_API_KEY: "test-only",
    ZERNIO_ACCOUNT_ID: "connection",
    ZERNIO_AD_ACCOUNT_ID: "act_1",
  };
  await assert.rejects(
    fetchCampaigns(env, async () => ({ ok: false, status: 401 })),
    /autenticação/,
  );
  await assert.rejects(
    fetchCampaigns(env, async () => ({
      ok: true,
      status: 202,
      json: async () => ({ campaigns: [], backfillPending: true }),
    })),
    /atualizando/,
  );
});
