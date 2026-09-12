import { createCampaignSyncHandler } from "../_shared/campaign-sync.js";

const handler = createCampaignSyncHandler({
  SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY"),
  CAMPAIGN_SYNC_CRON_KEY: Deno.env.get("CAMPAIGN_SYNC_CRON_KEY"),
  ZERNIO_API_KEY: Deno.env.get("ZERNIO_API_KEY"),
  ZERNIO_ACCOUNT_ID: Deno.env.get("ZERNIO_ACCOUNT_ID"),
  ZERNIO_AD_ACCOUNT_ID: Deno.env.get("ZERNIO_AD_ACCOUNT_ID"),
}, {
  onFailure: (event: { event: string; stage: string; code: string }) => console.error(JSON.stringify(event)),
});

Deno.serve(handler);
