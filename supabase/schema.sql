-- =============================================================
-- Nuray Workspace - Supabase schema
-- Internal tool - no Supabase auth users (access controlled via
-- NURAY_ACCESS_CODE in the Next.js layer).
-- Run this script in the Supabase SQL editor (or via psql).
-- =============================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- updated_at trigger helper
-- -------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =============================================================
-- clients
-- =============================================================
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_name text,
  contact_name text,
  phone text,
  email text,
  website text,
  status text not null default 'lead'
    check (status in ('lead','contacted','meeting_scheduled','proposal_sent','active','delivered','maintenance','lost')),
  project_status text not null default 'not_started'
    check (project_status in ('not_started','planning','in_progress','waiting_client','review','delivered','maintenance')),
  priority text not null default 'medium'
    check (priority in ('low','medium','high','urgent')),
  budget numeric,
  start_date date,
  next_action text,
  next_action_date timestamptz,
  notes text,
  important_links jsonb,
  payment_status text not null default 'not_applicable'
    check (payment_status in ('unpaid','partially_paid','paid','not_applicable')),
  analytics_sync_status text
    check (analytics_sync_status in ('synced','failed')),
  analytics_last_synced_at timestamptz,
  analytics_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients
  add column if not exists analytics_sync_status text,
  add column if not exists analytics_last_synced_at timestamptz,
  add column if not exists analytics_sync_error text;

do $$ begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_analytics_sync_status_check'
      and conrelid = 'public.clients'::regclass
  ) then
    alter table public.clients
      add constraint clients_analytics_sync_status_check
      check (analytics_sync_status in ('synced','failed'));
  end if;
end $$;

create or replace trigger trg_clients_updated_at before update on public.clients
for each row execute function set_updated_at();

-- =============================================================
-- projects
-- =============================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  type text not null default 'internal'
    check (type in ('agency','study','personal','internal')),
  status text not null default 'active'
    check (status in ('active','paused','completed','archived')),
  priority text not null default 'medium'
    check (priority in ('low','medium','high','urgent')),
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace trigger trg_projects_updated_at before update on public.projects
for each row execute function set_updated_at();

-- =============================================================
-- reminders
-- (created before tasks so tasks can FK reminder_id)
-- =============================================================
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text,
  remind_at timestamptz not null,
  channel text not null default 'app'
    check (channel in ('app','telegram')),
  status text not null default 'scheduled'
    check (status in ('scheduled','sent','failed','cancelled')),
  related_type text check (related_type in ('task','event','client','project','custom')),
  related_id uuid,
  telegram_sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace trigger trg_reminders_updated_at before update on public.reminders
for each row execute function set_updated_at();

create index if not exists idx_reminders_due
  on public.reminders (status, channel, remind_at);

-- =============================================================
-- notification_targets
-- Telegram chat destinations. Individual users or groups/teams.
-- =============================================================
create table if not exists public.notification_targets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'individual'
    check (type in ('individual','team')),
  telegram_chat_id text not null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace trigger trg_targets_updated_at before update on public.notification_targets
for each row execute function set_updated_at();

create index if not exists idx_targets_active on public.notification_targets (is_active);
create index if not exists idx_targets_type on public.notification_targets (type);

-- Add FK column to reminders (idempotent)
alter table public.reminders
  add column if not exists notification_target_id uuid
  references public.notification_targets(id) on delete set null;

-- =============================================================
-- tasks
-- =============================================================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'pending'
    check (status in ('pending','in_progress','blocked','done')),
  priority text not null default 'medium'
    check (priority in ('low','medium','high','urgent')),
  due_date timestamptz,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  reminder_id uuid references public.reminders(id) on delete set null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace trigger trg_tasks_updated_at before update on public.tasks
for each row execute function set_updated_at();

create index if not exists idx_tasks_status on public.tasks (status);
create index if not exists idx_tasks_due_date on public.tasks (due_date);
create index if not exists idx_tasks_client on public.tasks (client_id);
create index if not exists idx_tasks_project on public.tasks (project_id);

-- =============================================================
-- task_checklist_items
-- =============================================================
create table if not exists public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace trigger trg_checklist_updated_at before update on public.task_checklist_items
for each row execute function set_updated_at();

create index if not exists idx_checklist_task on public.task_checklist_items (task_id);

-- =============================================================
-- calendar_events
-- =============================================================
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null default 'work'
    check (type in ('work','study','client','personal','reminder','deadline')),
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean not null default false,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace trigger trg_events_updated_at before update on public.calendar_events
for each row execute function set_updated_at();

create index if not exists idx_events_start on public.calendar_events (start_at);

-- =============================================================
-- quick_captures
-- Inbox for fast text/audio notes that get processed manually later.
-- =============================================================
create table if not exists public.quick_captures (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('text','audio')),
  content text,
  audio_url text,
  audio_path text,
  status text not null default 'pending' check (status in ('pending','processed')),
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace trigger trg_captures_updated_at before update on public.quick_captures
for each row execute function set_updated_at();

create index if not exists idx_captures_status     on public.quick_captures (status);
create index if not exists idx_captures_created_at on public.quick_captures (created_at desc);
create index if not exists idx_captures_type       on public.quick_captures (type);

-- =============================================================
-- app_settings (single-row key/value store, optional)
-- =============================================================
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace trigger trg_settings_updated_at before update on public.app_settings
for each row execute function set_updated_at();

-- =============================================================
-- Row Level Security
-- The app uses the anon key from the Next.js server only after
-- the access gate validates NURAY_ACCESS_CODE. RLS is enabled
-- but kept open for the anon role here because there is no
-- per-user model. Tighten this if you later add Supabase auth.
-- =============================================================
alter table public.clients               enable row level security;
alter table public.projects              enable row level security;
alter table public.reminders             enable row level security;
alter table public.tasks                 enable row level security;
alter table public.task_checklist_items  enable row level security;
alter table public.calendar_events       enable row level security;
alter table public.app_settings          enable row level security;
alter table public.notification_targets  enable row level security;
alter table public.quick_captures        enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'open_clients') then
    create policy open_clients on public.clients for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'open_projects') then
    create policy open_projects on public.projects for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'open_reminders') then
    create policy open_reminders on public.reminders for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'open_tasks') then
    create policy open_tasks on public.tasks for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'open_checklist') then
    create policy open_checklist on public.task_checklist_items for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'open_events') then
    create policy open_events on public.calendar_events for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'open_settings') then
    create policy open_settings on public.app_settings for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'open_targets') then
    create policy open_targets on public.notification_targets for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'open_captures') then
    create policy open_captures on public.quick_captures for all using (true) with check (true);
  end if;
end $$;

-- =============================================================
-- Supabase Storage: quick-captures bucket + open MVP policies
-- Public bucket so audio_url can be played without signed URLs.
-- 25 MB cap, audio mime types only.
-- =============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quick-captures',
  'quick-captures',
  true,
  26214400,
  array['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav','audio/x-m4a']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='qc_select') then
    create policy qc_select on storage.objects for select using (bucket_id = 'quick-captures');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='qc_insert') then
    create policy qc_insert on storage.objects for insert with check (bucket_id = 'quick-captures');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='qc_update') then
    create policy qc_update on storage.objects for update using (bucket_id = 'quick-captures') with check (bucket_id = 'quick-captures');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='qc_delete') then
    create policy qc_delete on storage.objects for delete using (bucket_id = 'quick-captures');
  end if;
end $$;

-- =============================================================
-- Seed: idempotent default Telegram target for Óliver
-- =============================================================
insert into public.notification_targets (name, type, telegram_chat_id, is_default, is_active, notes)
select 'Óliver', 'individual', '6463198915', true, true, 'Destinatario por defecto (seed inicial)'
where not exists (
  select 1 from public.notification_targets where telegram_chat_id = '6463198915'
);

-- =============================================================
-- Optional seed (uncomment to insert)
-- =============================================================
-- insert into public.clients (name, business_name, status, project_status, priority)
-- values ('Haro Restaurante', 'Haro Restaurante', 'active', 'in_progress', 'high');
