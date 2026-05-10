alter table public.customers
  add column if not exists customer_kind text not null default 'person' check (customer_kind in ('person', 'company')),
  add column if not exists contact_name text;

update public.customers
set customer_kind = coalesce(customer_kind, 'person')
where customer_kind is null;
