alter table public.customers 
add column if not exists is_blocked boolean not null default false;
