create extension if not exists pgcrypto;

create type public.member_role as enum ('owner', 'admin', 'manager', 'agent');
create type public.conversation_status as enum ('open', 'pending', 'resolved');
create type public.message_direction as enum ('inbound', 'outbound');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role public.member_role not null default 'agent',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.whatsapp_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  business_account_id text not null,
  phone_number_id text not null unique,
  display_phone_number text,
  verified_name text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  wa_id text not null,
  phone text not null,
  display_name text,
  email text,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, wa_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  whatsapp_account_id uuid not null references public.whatsapp_accounts on delete cascade,
  contact_id uuid not null references public.contacts on delete cascade,
  assigned_to uuid references auth.users on delete set null,
  status public.conversation_status not null default 'open',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (whatsapp_account_id, contact_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  conversation_id uuid not null references public.conversations on delete cascade,
  whatsapp_message_id text unique,
  direction public.message_direction not null,
  message_type text not null,
  body text,
  status text not null default 'pending',
  status_updated_at timestamptz,
  raw_payload jsonb not null default '{}',
  sent_by uuid references auth.users on delete set null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  name text not null,
  description text,
  trigger_type text not null,
  definition jsonb not null default '{"steps":[]}',
  is_active boolean not null default false,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  workflow_id uuid not null references public.workflows on delete cascade,
  conversation_id uuid references public.conversations on delete cascade,
  status text not null default 'queued',
  current_step integer not null default 0,
  context jsonb not null default '{}',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  external_id text,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_conversation_sent_idx on public.messages (conversation_id, sent_at desc);
create index conversations_org_status_idx on public.conversations (organization_id, status, last_message_at desc);
create index contacts_org_phone_idx on public.contacts (organization_id, phone);
create index workflow_runs_status_idx on public.workflow_runs (status, created_at);

create schema if not exists private;

create or replace function private.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id and user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_organization_member(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_organization_member(uuid) to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.whatsapp_accounts enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.workflows enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.webhook_events enable row level security;

create policy "members can view organizations" on public.organizations for select to authenticated
using (private.is_organization_member(id));
create policy "members can view memberships" on public.organization_members for select to authenticated
using (private.is_organization_member(organization_id));
create policy "members can view whatsapp accounts" on public.whatsapp_accounts for select to authenticated
using (private.is_organization_member(organization_id));
create policy "members can view contacts" on public.contacts for select to authenticated
using (private.is_organization_member(organization_id));
create policy "members can manage contacts" on public.contacts for all to authenticated
using (private.is_organization_member(organization_id)) with check (private.is_organization_member(organization_id));
create policy "members can view conversations" on public.conversations for select to authenticated
using (private.is_organization_member(organization_id));
create policy "members can manage conversations" on public.conversations for update to authenticated
using (private.is_organization_member(organization_id)) with check (private.is_organization_member(organization_id));
create policy "members can view messages" on public.messages for select to authenticated
using (private.is_organization_member(organization_id));
create policy "members can view workflows" on public.workflows for select to authenticated
using (private.is_organization_member(organization_id));
create policy "admins can manage workflows" on public.workflows for all to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id = workflows.organization_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin', 'manager')))
with check (exists (select 1 from public.organization_members m where m.organization_id = workflows.organization_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin', 'manager')));
create policy "members can view workflow runs" on public.workflow_runs for select to authenticated
using (private.is_organization_member(organization_id));

revoke all on public.webhook_events from anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.organizations, public.organization_members, public.whatsapp_accounts, public.messages, public.workflow_runs to authenticated;
grant select, insert, update on public.contacts, public.conversations, public.workflows to authenticated;

alter publication supabase_realtime add table public.conversations, public.messages;
