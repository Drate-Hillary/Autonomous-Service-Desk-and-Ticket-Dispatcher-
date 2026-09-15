-- =====================================================================
-- RESOLV-HQ — core schema
-- =====================================================================
-- Grounded directly in the real app code, not a generic template:
--   src/types/console.ts, src/types/index.ts         (resolv-hq console: admin + agent)
--   ../resolv-hq-customer/lib/types.ts                (customer app)
-- See docs/database-schema.md for the full gap analysis this fixes.
--
-- Safe to re-run: enums are created via DO-blocks, tables use
-- IF NOT EXISTS, so iterating on this in the SQL editor won't error
-- on a second paste.
-- =====================================================================

create extension if not exists vector;
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('customer', 'admin', 'agent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type profile_status as enum ('active', 'suspended', 'pending');
exception when duplicate_object then null; end $$;

-- Unifies customer app's RequestStatus (submitted/processing/review/
-- completed/needs_info) — the admin console has no separate status
-- vocabulary today, which is itself a gap this closes.
do $$ begin
  create type request_status as enum ('submitted', 'processing', 'review', 'needs_info', 'completed');
exception when duplicate_object then null; end $$;

-- Unifies two DIFFERENT priority vocabularies found in the code:
-- customer app's RequestPriority = low/normal/high, admin's
-- TicketPriority = high/medium/low. Canonical: low/medium/high.
-- Map the customer app's "normal" -> "medium" at the API layer.
do $$ begin
  create type request_priority as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type request_source as enum ('web', 'mobile', 'chat', 'email', 'phone');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_sender_type as enum ('customer', 'support', 'ai');
exception when duplicate_object then null; end $$;

-- Unifies customer app's ChatRole (user/assistant) and console's
-- ChatRole (user/agent) — same concept, two names in the two codebases.
do $$ begin
  create type ai_message_role as enum ('user', 'assistant');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum ('request_update', 'ai', 'support', 'completed', 'system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type knowledge_file_type as enum ('PDF', 'DOCX', 'MD');
exception when duplicate_object then null; end $$;

do $$ begin
  create type knowledge_status as enum ('indexed', 'indexing', 'error');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tool_permission as enum ('read', 'write');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tool_status as enum ('active', 'disabled');
exception when duplicate_object then null; end $$;

-- Run-level status. Step-level detail (thinking/retrieving/using_tool)
-- lives on agent_steps.status instead — src/types/console.ts defines
-- AgentStatus, RunStepStatus AND TraceRun.status as three overlapping
-- vocabularies for what is really two levels of one thing. Collapsed here.
do $$ begin
  create type run_status as enum ('in_progress', 'awaiting_approval', 'completed', 'recovered', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type step_status as enum ('pending', 'active', 'done', 'blocked', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type approval_risk as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type approval_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type eval_category as enum ('normal', 'edge', 'incorrect_info', 'adversarial', 'tool_failure', 'unauthorized_action');
exception when duplicate_object then null; end $$;

do $$ begin
  create type eval_result as enum ('passed', 'blocked', 'recovered', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type guardrail_outcome as enum ('blocked', 'allowed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- 1. Identity — profiles.role is the single source of truth for the
--    three roles the app actually has: customer, admin, agent.
-- =====================================================================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  status profile_status not null default 'active',
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- customer app's UserProfile { plan, memberSince, ... } — memberSince
-- is redundant with profiles.created_at, dropped; plan is genuinely
-- customer-specific.
create table if not exists customer_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  plan text not null default 'Free',
  notification_channel_preference text not null default 'in_app',
  -- Backs the customer app's Profile > Notifications toggles
  -- (notification-settings.tsx) and the AI personalization / memory
  -- master switches on Profile > Saved Information — both existed as
  -- UI with no backing field before this.
  push_notifications boolean not null default true,
  email_notifications boolean not null default true,
  ai_personalization boolean not null default true,
  memory_enabled boolean not null default true
);
-- Idempotent for a database that already ran an earlier version of this file.
alter table customer_profiles add column if not exists push_notifications boolean not null default true;
alter table customer_profiles add column if not exists email_notifications boolean not null default true;
alter table customer_profiles add column if not exists ai_personalization boolean not null default true;
alter table customer_profiles add column if not exists memory_enabled boolean not null default true;

-- Gap: nothing in the mock data lets an admin "own" a ticket. Real
-- support consoles need this to avoid two admins working the same
-- escalation — added department/title (from your original schema)
-- plus request-assignment support (see requests.assigned_admin_id).
create table if not exists admin_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  department text,
  title text,
  is_available boolean not null default true
);

-- A profile row representing the AI system itself, so every table that
-- needs an "authored by" actor (request_messages.sender_id,
-- ai_messages, tool_executions) can point at a real, stable FK instead
-- of a bare string like RequestMessage.sender = "ai". See
-- docs/database-schema.md ("Who is the agent?") for the RLS tradeoff:
-- writes made *by the pipeline itself* should normally go through the
-- Postgres service_role (bypasses RLS) rather than this profile
-- signing in as an authenticated user; this row exists for attribution,
-- not for login.
insert into profiles (id, role, status, full_name)
values ('00000000-0000-0000-0000-000000000001', 'agent', 'active', 'Resolv Agent')
on conflict (id) do nothing;

-- =====================================================================
-- 2. Requests — the spine that was MISSING entirely: today the
--    customer app's ServiceRequest (id "1042") and the admin console's
--    Ticket/Escalation (id "4821") are two disconnected mock datasets
--    that can never reference the same record. This table is what
--    both surfaces should read/write against.
-- =====================================================================

create table if not exists request_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create sequence if not exists request_code_seq start 1042;

create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('REQ-' || nextval('request_code_seq')),
  customer_id uuid not null references profiles(id) on delete cascade,
  category_id uuid references request_categories(id),
  assigned_admin_id uuid references profiles(id), -- gap-fill: ticket ownership
  title text not null,
  description text not null,
  status request_status not null default 'submitted',
  priority request_priority not null default 'medium',
  source request_source not null default 'web',
  ai_summary text, -- the one AI-generated field both ServiceRequest and Escalation share
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists idx_requests_customer on requests (customer_id);
create index if not exists idx_requests_status on requests (status);
create index if not exists idx_requests_assigned_admin on requests (assigned_admin_id);
drop trigger if exists trg_requests_updated_at on requests;
create trigger trg_requests_updated_at before update on requests
  for each row execute function set_updated_at();

-- Gap: the customer app's `timeline: TimelineStep[]` is a static array
-- baked into mock data with no record of WHO changed the status or
-- WHEN in a queryable way. This table is the real audit trail; the
-- timeline UI becomes a read of this table grouped by request_id.
create table if not exists request_status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  from_status request_status,
  to_status request_status not null,
  changed_by uuid references profiles(id),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_status_history_request on request_status_history (request_id);

create table if not exists request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  sender_type message_sender_type not null,
  sender_id uuid references profiles(id),
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_request_messages_request on request_messages (request_id);

-- Gap: neither app's UI currently supports attaching a file to a
-- request or message, but "invoice number", "a copy of the invoice"
-- etc. show up directly in the mock conversation text (see
-- lib/mock-data.ts req 1051) — the feature is implied by the content
-- but never built. Added per your original schema's intent.
create table if not exists request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  message_id uuid references request_messages(id) on delete set null,
  uploaded_by uuid references profiles(id),
  file_url text not null,
  file_name text not null,
  file_type text,
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

-- Normalizes ServiceRequest.csat (inline nullable object) into its own
-- row — one per request, but as a table rather than a JSON column so
-- it can be reported on (avg CSAT by category/admin/agent run).
create table if not exists request_feedback (
  request_id uuid primary key references requests(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 3. Knowledge base (RAG) — src/types/console.ts KnowledgeDocument.
--    Placed before AI conversations because ai_message_sources below
--    references knowledge_documents.
-- =====================================================================

create table if not exists knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_type knowledge_file_type not null,
  source text not null, -- e.g. "Registrar's office" (org unit, not a category)
  status knowledge_status not null default 'indexing',
  storage_path text,
  chunk_count int not null default 0,
  added_by uuid references profiles(id),
  added_at timestamptz not null default now()
);

-- vector(1024): sized for Voyage AI embeddings (Anthropic's recommended
-- embedding partner for Claude-based RAG); change to 1536 if you embed
-- with an OpenAI model instead — pick one and keep it consistent, the
-- dimension is fixed per column.
create table if not exists knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references knowledge_documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  location text, -- RetrievedSource.location, e.g. "§2.3 Purchase thresholds"
  embedding vector(1024),
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);
create index if not exists idx_knowledge_chunks_embedding
  on knowledge_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- =====================================================================
-- 4. AI conversations — unifies the customer app's assistant chat
--    (lib/types.ts ChatMessage) and the console's escalation transcript
--    (src/types/index.ts TranscriptEntry) into one model. Optionally
--    linked to a request, which is what lets an escalation and a
--    customer's request finally be the same conversation.
-- =====================================================================

create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references profiles(id) on delete cascade,
  request_id uuid references requests(id) on delete set null,
  channel request_source not null default 'chat',
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists idx_ai_conversations_customer on ai_conversations (customer_id);
create index if not exists idx_ai_conversations_request on ai_conversations (request_id);

create table if not exists ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role ai_message_role not null,
  content text not null,
  suggestions jsonb not null default '[]'::jsonb, -- ChatMessage.suggestions
  steps jsonb not null default '[]'::jsonb,        -- ChatMessage.steps (typing/tool steps)
  feedback smallint, -- ChatMessage.feedback: null / -1 (down) / 1 (up)
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_messages_conversation on ai_messages (conversation_id);

-- Unifies customer app's ChatSource {id,title} and console's Citation
-- {id,policyLabel,excerpt} — same concept (a grounding citation),
-- different shapes in the two codebases.
create table if not exists ai_message_sources (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references ai_messages(id) on delete cascade,
  knowledge_document_id uuid references knowledge_documents(id),
  label text not null,   -- "Late Delivery Policy §2.1" / ChatSource.title
  excerpt text,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 5. Memory — TWO distinct concepts the original generic schema
--    blurred into one `customer_memory` table:
--      a) agent_memory_records — operational memory the AGENT and
--         ADMIN see (console's MemoryRecord: case history, preferred
--         suppliers, budget codes). Not customer-editable.
--      b) customer_memory_facts — preference toggles the CUSTOMER
--         owns (customer app's MemoryFact: on/off switches under
--         Profile > Saved Information). Customer-editable, agent
--         reads only the enabled ones.
--    These need different RLS, so they're different tables.
-- =====================================================================

create table if not exists agent_memory_records (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references requests(id) on delete set null,
  title text not null,
  content text not null,
  reason text not null,
  access_scope text not null, -- e.g. "Procurement Agent, finance office"
  source text not null,
  retention_days int not null default 90,
  created_at timestamptz not null default now(),
  expires_at timestamptz generated always as (created_at + (retention_days || ' days')::interval) stored
);

create table if not exists customer_memory_facts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id) on delete cascade,
  label text not null,
  detail text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_customer_memory_updated_at on customer_memory_facts;
create trigger trg_customer_memory_updated_at before update on customer_memory_facts
  for each row execute function set_updated_at();

-- =====================================================================
-- 6. Agent operations — console's AgentRun/RunStep/ToolDefinition,
--    PLUS the approval persistence that's missing today (approve/
--    reject in /admin currently only updates client state and is lost
--    on refresh — EscalationDecision has no backing row anywhere).
-- =====================================================================

create table if not exists agent_tools (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  purpose text not null,
  input_schema jsonb not null default '[]'::jsonb,
  output_schema jsonb not null default '[]'::jsonb,
  permission tool_permission not null,
  approval_required boolean not null default false,
  status tool_status not null default 'active',
  failure_behavior text not null,
  used_by text not null
);

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  request_id uuid references requests(id) on delete set null, -- gap-fill: runs weren't linked to a request
  conversation_id uuid references ai_conversations(id) on delete set null,
  initiated_by uuid references profiles(id),
  status run_status not null default 'in_progress',
  model text not null,
  prompt_version text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  latency_ms int
);
create index if not exists idx_agent_runs_request on agent_runs (request_id);

create table if not exists agent_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references agent_runs(id) on delete cascade,
  step_key text not null, -- request/context/retrieval/plan/tool/observation/decision/approval/result
  sequence int not null,
  label text not null,
  status step_status not null default 'pending',
  detail jsonb, -- RunStepDetail discriminated union, stored as-is
  created_at timestamptz not null default now(),
  unique (run_id, sequence)
);
create index if not exists idx_agent_steps_run on agent_steps (run_id);

create table if not exists tool_executions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references agent_runs(id) on delete cascade,
  step_id uuid references agent_steps(id) on delete set null,
  tool_id uuid not null references agent_tools(id),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  status text not null check (status in ('success', 'error')),
  duration_ms int,
  created_at timestamptz not null default now()
);

-- The real fix for "approve/reject isn't persisted": every escalation
-- shown in /admin (Escalation.action) becomes a row here, and the
-- decision an admin makes is written back to THIS row, not just
-- React state.
create table if not exists agent_approvals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references agent_runs(id) on delete cascade,
  step_id uuid references agent_steps(id) on delete set null,
  request_id uuid references requests(id) on delete cascade,
  action text not null,       -- ProposedAction.type / description
  description text not null,
  risk approval_risk not null default 'low',
  amount numeric(12, 2),
  currency text default 'USD',
  status approval_status not null default 'pending',
  decided_by uuid references profiles(id),
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_agent_approvals_request on agent_approvals (request_id);
create index if not exists idx_agent_approvals_status on agent_approvals (status);

create table if not exists guardrail_rules (
  capability text primary key,
  ai_allowed boolean not null,
  human_approval boolean not null,
  note text
);

-- Gap: /guardrails today only renders the static rule table — there is
-- no record of a guardrail actually firing. Without this, "10 blocked
-- adversarial cases" (evaluation-table.md) has no real audit trail.
create table if not exists guardrail_events (
  id uuid primary key default gen_random_uuid(),
  capability text references guardrail_rules(capability),
  run_id uuid references agent_runs(id) on delete set null,
  outcome guardrail_outcome not null,
  detail text,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 7. Evaluation & observability — console's EvalScenario/EvalDimension/
--    TraceRun. Note: TraceRun/TraceEvent are NOT modeled as separate
--    tables — they were duplicating agent_runs/agent_steps in the
--    mock data (same run, same events, second copy). /traces should
--    be a read view over agent_runs + agent_steps instead (see below).
-- =====================================================================

create table if not exists prompt_versions (
  id uuid primary key default gen_random_uuid(),
  name text not null,   -- "procurement-planner", "retrieval-grounding", ...
  version text not null,
  status text not null default 'active' check (status in ('active', 'deprecated')),
  diff_note text,       -- prompt-specification.md's "Change made" text
  created_at timestamptz not null default now(),
  unique (name, version)
);

-- Backs /settings "Model" card, which is hardcoded today.
create table if not exists model_configs (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists evaluation_scenarios (
  id text primary key, -- "001".."030" to match evaluation-table.md numbering
  category eval_category not null,
  scenario text not null,
  expected_behavior text
);

-- Gap: the mock's evalDimensions/evalOverallScore is a single static
-- snapshot — there's no way to compare prompt v1.0 vs v1.1 results,
-- which is explicitly called out as a Week 3 goal in
-- docs/week-2-progress-report.md ("re-run ... compare real vs.
-- simulated results and note any regressions"). This table makes each
-- run of the suite a row, so that comparison is a query.
create table if not exists evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  prompt_version_id uuid references prompt_versions(id),
  model text not null,
  run_at timestamptz not null default now(),
  overall_score numeric(5, 2),
  dimension_scores jsonb not null default '[]'::jsonb -- EvalDimension[]
);

create table if not exists evaluation_results (
  id uuid primary key default gen_random_uuid(),
  evaluation_run_id uuid not null references evaluation_runs(id) on delete cascade,
  scenario_id text not null references evaluation_scenarios(id),
  result eval_result not null,
  latency_ms int not null,
  actual_behavior_note text,
  unique (evaluation_run_id, scenario_id)
);

-- Read-model for /traces, so trace data is never a second copy of
-- agent_runs/agent_steps that can drift out of sync.
-- security_invoker: the view must apply the QUERYING user's RLS on
-- agent_runs/agent_steps (staff-only), not the view owner's — without
-- this a view defaults to its owner's (often-unrestricted) privileges
-- and would leak every run to any authenticated caller.
create or replace view trace_runs_view
with (security_invoker = true) as
select
  r.id,
  r.title,
  r.started_at as date,
  r.status,
  r.model,
  r.prompt_version,
  r.latency_ms,
  (
    select jsonb_agg(jsonb_build_object(
      'time', s.created_at, 'label', s.label, 'detail', s.detail, 'kind', s.step_key
    ) order by s.sequence)
    from agent_steps s where s.run_id = r.id
  ) as events
from agent_runs r;

-- =====================================================================
-- 8. Notifications, help center, integrations, admin audit
-- =====================================================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id) on delete cascade,
  request_id uuid references requests(id) on delete set null,
  type notification_type not null,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_customer on notifications (customer_id, read);

-- Gap: HELP_ARTICLES is hardcoded in the customer app's mock-data.ts —
-- an admin has no way to edit help content without a redeploy.
create table if not exists help_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  summary text not null,
  body jsonb not null default '[]'::jsonb, -- array of paragraphs, matches HelpArticle.body: string[]
  source text not null,
  read_minutes int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_help_articles_updated_at on help_articles;
create trigger trg_help_articles_updated_at before update on help_articles
  for each row execute function set_updated_at();

-- Backs /settings "Integrations" card (MCP tool exposure).
create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  protocol text not null,
  endpoint text not null,
  status text not null default 'connected',
  exposed_tool_count int not null default 0,
  last_sync_at timestamptz
);

-- Gap: nothing persists WHO approved/rejected an escalation or WHEN —
-- agent_approvals.decided_by/decided_at covers the decision itself;
-- this table is the broader admin audit trail (login, edits to
-- knowledge base, tool status changes, etc.), which your original
-- schema listed but nothing in the app currently writes to.
create table if not exists admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references profiles(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 9. Auto-create a profile row when a Supabase Auth user signs up,
--    and auto-log status changes + notify the customer. This is what
--    makes "approve in /admin" or "status change" reliably produce a
--    customer notification, instead of relying on the frontend to
--    remember to call setNotifications (today's failure mode: it's
--    only ever created client-side, in the same process that made
--    the change).
-- =====================================================================

create or replace function handle_new_auth_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  insert into public.customer_profiles (id) values (new.id);
  return new;
end;
$$;
drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- security definer: this must write request_status_history/notifications
-- regardless of which role (customer or staff) fired the UPDATE that
-- changed requests.status, so it runs with the function owner's rights
-- rather than the caller's RLS-restricted ones.
create or replace function log_request_status_change()
returns trigger language plpgsql security definer as $$
begin
  if new.status is distinct from old.status then
    insert into request_status_history (request_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, coalesce(new.assigned_admin_id, old.assigned_admin_id));

    insert into notifications (customer_id, request_id, type, title, body)
    values (
      new.customer_id,
      new.id,
      case when new.status = 'completed' then 'completed' else 'request_update' end,
      case when new.status = 'completed' then 'Request completed' else 'Request updated' end,
      'Your request ' || new.code || ' is now ' || replace(new.status::text, '_', ' ') || '.'
    );
  end if;
  return new;
end;
$$;
drop trigger if exists trg_request_status_change on requests;
create trigger trg_request_status_change
  after update on requests
  for each row execute function log_request_status_change();
