// The web server and scheduled Edge Function share exactly the same provider logic.
export { IntegrationError, normalizeCampaign, zernioGet, fetchCampaigns } from "../supabase/functions/_shared/zernio.js";
