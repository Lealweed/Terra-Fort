create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text,
  customer_email text,
  source text not null,
  intent text not null,
  status text not null default 'new' check (status in ('new', 'bot', 'waiting_human', 'in_progress', 'resolved')),
  handoff_requested boolean not null default false,
  assigned_to text,
  last_message text,
  metadata jsonb not null default '{}'::jsonb,
  context jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_support_tickets_updated_at on public.support_tickets;
create trigger trg_support_tickets_updated_at
before update on public.support_tickets
for each row execute function public.set_updated_at();

create index if not exists idx_support_tickets_status on public.support_tickets(status);
create index if not exists idx_support_tickets_updated_at on public.support_tickets(updated_at desc);
create index if not exists idx_support_tickets_handoff on public.support_tickets(handoff_requested);

alter table public.support_tickets enable row level security;

drop policy if exists "authenticated full support_tickets" on public.support_tickets;
create policy "authenticated full support_tickets"
on public.support_tickets for all
to authenticated
using (true)
with check (true);
