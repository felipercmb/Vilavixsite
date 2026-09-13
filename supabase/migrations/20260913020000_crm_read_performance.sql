-- Same authorization predicates and policy kinds; evaluate session-only helpers
-- once per statement instead of once per row/page scan. No grants are changed.
BEGIN;

ALTER POLICY crm_active_membership ON public.leads
  USING ((SELECT public.is_crm_member()))
  WITH CHECK ((SELECT public.is_crm_member()));
ALTER POLICY crm_active_membership ON public.tasks
  USING ((SELECT public.is_crm_member()))
  WITH CHECK ((SELECT public.is_crm_member()));
ALTER POLICY crm_active_membership ON public.comments
  USING ((SELECT public.is_crm_member()))
  WITH CHECK ((SELECT public.is_crm_member()));

ALTER POLICY leads_select ON public.leads
  USING ((SELECT public.is_admin()) OR corretor = (SELECT public.my_nome()));
ALTER POLICY tasks_select ON public.tasks
  USING (
    (SELECT public.is_admin())
    OR corretor = (SELECT public.my_nome())
    OR lead_id IN (
      SELECT leads.id FROM public.leads
      WHERE leads.corretor = (SELECT public.my_nome())
    )
  );
ALTER POLICY crm_comment_lead_scope ON public.comments
  USING (
    (SELECT public.is_crm_admin())
    OR EXISTS (SELECT 1 FROM public.leads WHERE leads.id = comments.lead_id)
  )
  WITH CHECK (
    (SELECT public.is_crm_admin())
    OR EXISTS (SELECT 1 FROM public.leads WHERE leads.id = comments.lead_id)
  );
ALTER POLICY "Profiles leitura CRM" ON public.profiles
  USING (id = (SELECT auth.uid()) OR (SELECT public.is_crm_member()));

-- Match the deterministic ordering of the complete paginated reads.
CREATE INDEX IF NOT EXISTS crm_tasks_read_order_idx ON public.tasks (data, hora, id);
CREATE INDEX IF NOT EXISTS crm_leads_read_order_idx ON public.leads (created_at DESC, id);
COMMIT;
