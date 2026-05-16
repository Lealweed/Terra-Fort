create table if not exists public.delivery_drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  document text,
  status text not null default 'available' check (status in ('available', 'busy', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_delivery_drivers_updated_at on public.delivery_drivers;
create trigger trg_delivery_drivers_updated_at
before update on public.delivery_drivers
for each row execute function public.set_updated_at();

alter table public.delivery_drivers enable row level security;

drop policy if exists "authenticated full delivery_drivers" on public.delivery_drivers;
create policy "authenticated full delivery_drivers"
on public.delivery_drivers for all
to authenticated
using (true)
with check (true);

alter table public.orders
  add column if not exists assigned_driver_id uuid references public.delivery_drivers(id) on delete set null;

create index if not exists idx_orders_assigned_driver_id on public.orders(assigned_driver_id);
