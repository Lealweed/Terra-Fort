create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('INCOME', 'EXPENSE')),
  category text not null,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.finance_transactions enable row level security;

create policy if not exists "authenticated full finance_transactions"
on public.finance_transactions for all
to authenticated
using (true)
with check (true);
