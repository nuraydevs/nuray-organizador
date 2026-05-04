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
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','partially_paid','paid','not_applicable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at before update on public.clients
for each row execute function set_updated_at();

-- =============================================================
-- projects
-- =============================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  type text not null default 'personal'
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

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at before update on public.projects
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

drop trigger if exists trg_reminders_updated_at on public.reminders;
create trigger trg_reminders_updated_at before update on public.reminders
for each row execute function set_updated_at();

create index if not exists idx_reminders_due
  on public.reminders (status, channel, remind_at);

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

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at before update on public.tasks
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

drop trigger if exists trg_checklist_updated_at on public.task_checklist_items;
create trigger trg_checklist_updated_at before update on public.task_checklist_items
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

drop trigger if exists trg_events_updated_at on public.calendar_events;
create trigger trg_events_updated_at before update on public.calendar_events
for each row execute function set_updated_at();

create index if not exists idx_events_start on public.calendar_events (start_at);

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

drop trigger if exists trg_settings_updated_at on public.app_settings;
create trigger trg_settings_updated_at before update on public.app_settings
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
end $$;

-- =============================================================
-- Optional seed (uncomment to insert)
-- =============================================================
-- insert into public.clients (name, business_name, status, project_status, priority)
-- values ('Haro Restaurante', 'Haro Restaurante', 'active', 'in_progress', 'high');
