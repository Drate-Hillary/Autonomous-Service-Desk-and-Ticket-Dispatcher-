-- =====================================================================
-- RESOLV-HQ — Row Level Security
-- =====================================================================
-- Run after schema.sql. Enforces the three-role split the app actually
-- has (customer / admin / agent) — see docs/database-schema.md.
--
-- IMPORTANT on the agent's identity: the AI pipeline should normally
-- run server-side using Supabase's `service_role` key, which bypasses
-- RLS entirely — that's the standard, recommended pattern and needs no
-- policies below. The `is_agent()` helper and its policies exist for
-- the alternative where the agent authenticates as a normal user
-- (profiles.role = 'agent') — include them only if you actually need
-- the agent callable as a signed-in client; otherwise service_role
-- alone is simpler and just as correct.
--
-- Notably: agent_approvals can be INSERTED by staff (admin or agent)
-- but only DECIDED (approved/rejected) by an admin — see the policy
-- below. That's guardrails.aiAllowed = false enforced as a database
-- rule, not just a prompt instruction: "the agent may never approve
-- its own draft" (src/lib/mock-console.ts guardrails) now holds even
-- if a future prompt or client bug tries to skip it.
-- =====================================================================

create or replace function current_role_value()
returns user_role language sql stable security definer as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin() returns boolean language sql stable as $$
  select current_role_value() = 'admin';
$$;

create or replace function is_agent() returns boolean language sql stable as $$
  select current_role_value() = 'agent';
$$;

-- "staff" = admin or agent — the two non-customer roles that share
-- read access to most operational tables.
create or replace function is_staff() returns boolean language sql stable as $$
  select current_role_value() in ('admin', 'agent');
$$;

-- Blocks a customer from self-promoting via `update profiles set role
-- = 'admin'` — RLS is row-level, not column-level, so this needs a
-- trigger rather than a policy.
create or replace function prevent_role_self_escalation()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and not is_admin() then
    raise exception 'only an admin can change profiles.role';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_prevent_role_self_escalation on profiles;
create trigger trg_prevent_role_self_escalation before update on profiles
  for each row execute function prevent_role_self_escalation();

-- ---------------------------------------------------------------------
alter table profiles enable row level security;
create policy "profiles_select_own_or_staff" on profiles for select
  using (id = auth.uid() or is_staff());
create policy "profiles_update_own_or_admin" on profiles for update
  using (id = auth.uid() or is_admin());

alter table customer_profiles enable row level security;
create policy "customer_profiles_rw_own_or_staff_read" on customer_profiles for select
  using (id = auth.uid() or is_staff());
create policy "customer_profiles_update_own" on customer_profiles for update
  using (id = auth.uid() or is_admin());

alter table admin_profiles enable row level security;
create policy "admin_profiles_select_staff" on admin_profiles for select using (is_staff());
create policy "admin_profiles_write_admin" on admin_profiles for all
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
alter table request_categories enable row level security;
create policy "request_categories_select_all" on request_categories for select using (true);
create policy "request_categories_write_admin" on request_categories for all
  using (is_admin()) with check (is_admin());

alter table requests enable row level security;
create policy "requests_select_own_or_staff" on requests for select
  using (customer_id = auth.uid() or is_staff());
create policy "requests_insert_own_or_staff" on requests for insert
  with check (customer_id = auth.uid() or is_staff());
-- Customers may only edit their own request while it still needs their
-- input; every other transition (status, assignment, ai_summary) is
-- staff-only.
create policy "requests_update_own_while_open" on requests for update
  using (
    is_staff()
    or (customer_id = auth.uid() and status in ('submitted', 'needs_info'))
  );

alter table request_status_history enable row level security;
create policy "request_status_history_select" on request_status_history for select
  using (
    is_staff()
    or exists (select 1 from requests r where r.id = request_id and r.customer_id = auth.uid())
  );
-- No direct insert policy: rows are written only by the SECURITY
-- DEFINER trigger log_request_status_change(), which bypasses RLS.

alter table request_messages enable row level security;
create policy "request_messages_select" on request_messages for select
  using (
    is_staff()
    or exists (select 1 from requests r where r.id = request_id and r.customer_id = auth.uid())
  );
create policy "request_messages_insert" on request_messages for insert
  with check (
    (is_staff() and sender_type in ('support', 'ai'))
    or (
      sender_type = 'customer'
      and exists (select 1 from requests r where r.id = request_id and r.customer_id = auth.uid())
    )
  );

alter table request_attachments enable row level security;
create policy "request_attachments_select" on request_attachments for select
  using (
    is_staff()
    or exists (select 1 from requests r where r.id = request_id and r.customer_id = auth.uid())
  );
create policy "request_attachments_insert" on request_attachments for insert
  with check (
    is_staff()
    or exists (select 1 from requests r where r.id = request_id and r.customer_id = auth.uid())
  );

alter table request_feedback enable row level security;
create policy "request_feedback_select" on request_feedback for select
  using (
    is_staff()
    or exists (select 1 from requests r where r.id = request_id and r.customer_id = auth.uid())
  );
-- CSAT can only be left by the customer, and only once the request is done.
create policy "request_feedback_insert_own_completed" on request_feedback for insert
  with check (
    exists (
      select 1 from requests r
      where r.id = request_id and r.customer_id = auth.uid() and r.status = 'completed'
    )
  );

-- ---------------------------------------------------------------------
alter table ai_conversations enable row level security;
create policy "ai_conversations_select" on ai_conversations for select
  using (customer_id = auth.uid() or is_staff());
create policy "ai_conversations_insert" on ai_conversations for insert
  with check (customer_id = auth.uid() or is_staff());

alter table ai_messages enable row level security;
create policy "ai_messages_select" on ai_messages for select
  using (
    is_staff()
    or exists (
      select 1 from ai_conversations c where c.id = conversation_id and c.customer_id = auth.uid()
    )
  );
create policy "ai_messages_insert" on ai_messages for insert
  with check (
    (is_staff() and role = 'assistant')
    or (
      role = 'user'
      and exists (
        select 1 from ai_conversations c where c.id = conversation_id and c.customer_id = auth.uid()
      )
    )
  );
-- Feedback (up/down) is left by the customer who owns the conversation.
create policy "ai_messages_update_feedback" on ai_messages for update
  using (
    exists (
      select 1 from ai_conversations c where c.id = conversation_id and c.customer_id = auth.uid()
    )
  );

alter table ai_message_sources enable row level security;
create policy "ai_message_sources_select" on ai_message_sources for select
  using (
    is_staff()
    or exists (
      select 1 from ai_messages m
      join ai_conversations c on c.id = m.conversation_id
      where m.id = message_id and c.customer_id = auth.uid()
    )
  );
create policy "ai_message_sources_insert_staff" on ai_message_sources for insert
  with check (is_staff());

-- ---------------------------------------------------------------------
-- Knowledge base is internal — not customer-facing in either app today.
alter table knowledge_documents enable row level security;
create policy "knowledge_documents_select_staff" on knowledge_documents for select using (is_staff());
create policy "knowledge_documents_write_staff" on knowledge_documents for insert with check (is_staff());
create policy "knowledge_documents_update_staff" on knowledge_documents for update using (is_staff());
create policy "knowledge_documents_delete_admin" on knowledge_documents for delete using (is_admin());

alter table knowledge_chunks enable row level security;
create policy "knowledge_chunks_select_staff" on knowledge_chunks for select using (is_staff());
create policy "knowledge_chunks_write_staff" on knowledge_chunks for insert with check (is_staff());
create policy "knowledge_chunks_delete_admin" on knowledge_chunks for delete using (is_admin());

-- ---------------------------------------------------------------------
alter table agent_memory_records enable row level security;
create policy "agent_memory_records_staff_only" on agent_memory_records for all
  using (is_staff()) with check (is_staff());

alter table customer_memory_facts enable row level security;
create policy "customer_memory_facts_select" on customer_memory_facts for select
  using (customer_id = auth.uid() or is_staff());
create policy "customer_memory_facts_write_own" on customer_memory_facts for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- ---------------------------------------------------------------------
alter table agent_tools enable row level security;
create policy "agent_tools_select_staff" on agent_tools for select using (is_staff());
create policy "agent_tools_write_admin" on agent_tools for all
  using (is_admin()) with check (is_admin());

alter table agent_runs enable row level security;
create policy "agent_runs_staff_only" on agent_runs for all
  using (is_staff()) with check (is_staff());

alter table agent_steps enable row level security;
create policy "agent_steps_staff_only" on agent_steps for all
  using (is_staff()) with check (is_staff());

alter table tool_executions enable row level security;
create policy "tool_executions_staff_only" on tool_executions for all
  using (is_staff()) with check (is_staff());

alter table agent_approvals enable row level security;
create policy "agent_approvals_select" on agent_approvals for select
  using (
    is_staff()
    or exists (select 1 from requests r where r.id = request_id and r.customer_id = auth.uid())
  );
create policy "agent_approvals_insert_staff" on agent_approvals for insert
  with check (is_staff());
-- The actual approve/reject decision — admin only, never the agent
-- that drafted the action. This is the DB-level guardrail.
create policy "agent_approvals_decide_admin_only" on agent_approvals for update
  using (is_admin())
  with check (is_admin());

alter table guardrail_rules enable row level security;
create policy "guardrail_rules_select_staff" on guardrail_rules for select using (is_staff());
create policy "guardrail_rules_write_admin" on guardrail_rules for all
  using (is_admin()) with check (is_admin());

alter table guardrail_events enable row level security;
create policy "guardrail_events_select_staff" on guardrail_events for select using (is_staff());
create policy "guardrail_events_insert_staff" on guardrail_events for insert with check (is_staff());

-- ---------------------------------------------------------------------
alter table prompt_versions enable row level security;
create policy "prompt_versions_select_staff" on prompt_versions for select using (is_staff());
create policy "prompt_versions_write_admin" on prompt_versions for all
  using (is_admin()) with check (is_admin());

alter table model_configs enable row level security;
create policy "model_configs_select_staff" on model_configs for select using (is_staff());
create policy "model_configs_write_admin" on model_configs for all
  using (is_admin()) with check (is_admin());

alter table evaluation_scenarios enable row level security;
create policy "evaluation_scenarios_select_staff" on evaluation_scenarios for select using (is_staff());
create policy "evaluation_scenarios_write_admin" on evaluation_scenarios for all
  using (is_admin()) with check (is_admin());

alter table evaluation_runs enable row level security;
create policy "evaluation_runs_select_staff" on evaluation_runs for select using (is_staff());
create policy "evaluation_runs_insert_staff" on evaluation_runs for insert with check (is_staff());

alter table evaluation_results enable row level security;
create policy "evaluation_results_select_staff" on evaluation_results for select using (is_staff());
create policy "evaluation_results_insert_staff" on evaluation_results for insert with check (is_staff());

-- ---------------------------------------------------------------------
alter table notifications enable row level security;
create policy "notifications_select_own" on notifications for select
  using (customer_id = auth.uid() or is_staff());
create policy "notifications_update_own" on notifications for update
  using (customer_id = auth.uid());
create policy "notifications_insert_staff" on notifications for insert with check (is_staff());

alter table help_articles enable row level security;
create policy "help_articles_select_all" on help_articles for select using (true);
create policy "help_articles_write_admin" on help_articles for all
  using (is_admin()) with check (is_admin());

alter table integrations enable row level security;
create policy "integrations_select_staff" on integrations for select using (is_staff());
create policy "integrations_write_admin" on integrations for all
  using (is_admin()) with check (is_admin());

alter table admin_activity_logs enable row level security;
create policy "admin_activity_logs_admin_only" on admin_activity_logs for all
  using (is_admin()) with check (is_admin());
