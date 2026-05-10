create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  description text,
  badge text,
  discount_type text not null default 'percent' check (discount_type in ('percent', 'fixed', 'price_override')),
  discount_value numeric(12,2) not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  applies_to_all boolean not null default false,
  product_ids jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null check (provider in ('n8n', 'erp', 'whatsapp', 'bi', 'other')),
  status text not null default 'inactive' check (status in ('active', 'inactive', 'error', 'maintenance')),
  base_url text,
  description text,
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid references public.integration_connections(id) on delete set null,
  scope text not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'success', 'error', 'partial')),
  records_read integer not null default 0,
  records_written integer not null default 0,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_promotions_active_window on public.promotions(is_active, starts_at, ends_at);
create index if not exists idx_integration_connections_provider on public.integration_connections(provider, status);
create index if not exists idx_sync_runs_integration_id on public.sync_runs(integration_id, created_at desc);

create trigger trg_promotions_updated_at
before update on public.promotions
for each row execute function public.set_updated_at();

create trigger trg_integration_connections_updated_at
before update on public.integration_connections
for each row execute function public.set_updated_at();

alter table public.promotions enable row level security;
alter table public.integration_connections enable row level security;
alter table public.sync_runs enable row level security;

drop policy if exists "authenticated full promotions" on public.promotions;
create policy "authenticated full promotions"
on public.promotions for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated full integration_connections" on public.integration_connections;
create policy "authenticated full integration_connections"
on public.integration_connections for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated full sync_runs" on public.sync_runs;
create policy "authenticated full sync_runs"
on public.sync_runs for all
to authenticated
using (true)
with check (true);

comment on table public.promotions is 'Campanhas promocionais vigentes para loja, agente WhatsApp e canais externos';
comment on table public.integration_connections is 'Conexoes operacionais com n8n, ERP legado, WhatsApp e ferramentas de BI';
comment on table public.sync_runs is 'Historico de execucoes de sincronizacao entre Terra-Fort e sistemas externos';