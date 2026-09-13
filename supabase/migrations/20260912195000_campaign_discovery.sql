-- Recover provider IDs from recent inbound events without exposing lead payloads.
-- Existing active/enabled campaigns remain discoverable after the lookback window.
BEGIN;
CREATE OR REPLACE FUNCTION public.discover_zernio_campaign_ids(
  p_account_id text,
  p_lookback_days integer DEFAULT 90,
  p_limit integer DEFAULT 500
) RETURNS TABLE(campaign_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE ids text[]; known_ids text[];
BEGIN
  IF p_account_id IS NULL OR btrim(p_account_id) = '' OR
     p_lookback_days IS NULL OR p_lookback_days NOT BETWEEN 1 AND 365 OR
     p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'Invalid campaign discovery parameters' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(array_agg(DISTINCT c.external_id), ARRAY[]::text[]) INTO known_ids
  FROM public.campaigns c
  WHERE c.provider = 'zernio' AND c.source = 'meta'
    AND regexp_replace(c.ad_account_id, '^act_', '') = regexp_replace(p_account_id, '^act_', '')
    AND (c.effective_status = 'ACTIVE' OR c.routing_enabled)
    AND c.external_id ~ '^[0-9]{1,30}$';

  ids := known_ids;
  -- A new installation need not have the existing production ingestion table.
  IF to_regclass('public.zernio_inbound_log') IS NOT NULL THEN
    EXECUTE $query$
      SELECT coalesce(array_agg(DISTINCT entry.campaign_id), ARRAY[]::text[])
      FROM public.zernio_inbound_log entry
      WHERE entry.created_at >= now() - make_interval(days => $1)
        AND entry.campaign_id ~ '^[0-9]{1,30}$'
    $query$ INTO ids USING p_lookback_days;
    ids := ids || known_ids;
  END IF;
  SELECT coalesce(array_agg(DISTINCT candidate), ARRAY[]::text[]) INTO ids
  FROM unnest(ids) candidate;
  IF cardinality(ids) > p_limit THEN
    RAISE EXCEPTION 'Campaign discovery exceeded its limit; no partial result returned' USING ERRCODE = '54000';
  END IF;
  RETURN QUERY SELECT candidate FROM unnest(ids) candidate ORDER BY candidate;
END;
$$;
REVOKE ALL ON FUNCTION public.discover_zernio_campaign_ids(text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.discover_zernio_campaign_ids(text,integer,integer) TO service_role;
COMMIT;
