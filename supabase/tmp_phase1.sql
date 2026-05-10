create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  description text,
  actor_role text,
  actor_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_order_events_order_id on public.order_events(order_id);
alter table public.order_events enable row level security;
drop policy if exists "authenticated full order_events" on public.order_events;
create policy "authenticated full order_events"
on public.order_events for all
to authenticated
using (true)
with check (true);
