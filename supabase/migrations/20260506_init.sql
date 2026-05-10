-- Terra-Fort | Supabase bootstrap
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  description text not null default '',
  price numeric(12,2) not null default 0,
  original_price numeric(12,2),
  category text not null,
  image_url text not null default '',
  images jsonb not null default '[]'::jsonb,
  video_url text,
  brand text,
  features jsonb not null default '[]'::jsonb,
  specifications jsonb not null default '{}'::jsonb,
  sob_consulta boolean not null default false,
  stock_level integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  document text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  status text not null default 'Pendente' check (status in ('Pendente','Pago','Em rota de entrega','Cancelado','Concluído')),
  subtotal numeric(12,2) not null default 0,
  freight numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_status text not null default 'Pendente' check (payment_status in ('Pendente','Pago','Falhou','Estornado')),
  payment_link text,
  delivery_address jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12,2) not null,
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) generated always as (unit_price * quantity) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type text not null check (movement_type in ('IN','OUT','ADJUSTMENT')),
  quantity integer not null,
  reason text,
  reference_type text,
  reference_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  title text,
  subtitle text,
  cta_text text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger trg_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger trg_site_content_updated_at
before update on public.site_content
for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.site_content enable row level security;

-- Public catalog read
create policy if not exists "public can read products"
on public.products for select
using (is_active = true);

create policy if not exists "public can read site content"
on public.site_content for select
using (true);

-- Checkout (anon) can create order flow
create policy if not exists "anon can insert orders"
on public.orders for insert
to anon
with check (true);

create policy if not exists "anon can insert order items"
on public.order_items for insert
to anon
with check (true);

-- Admin/service_role manages everything (service role bypasses RLS, but keeps explicit policies for authenticated)
create policy if not exists "authenticated full products"
on public.products for all
to authenticated
using (true)
with check (true);

create policy if not exists "authenticated full customers"
on public.customers for all
to authenticated
using (true)
with check (true);

create policy if not exists "authenticated full orders"
on public.orders for all
to authenticated
using (true)
with check (true);

create policy if not exists "authenticated full order_items"
on public.order_items for all
to authenticated
using (true)
with check (true);

create policy if not exists "authenticated full inventory"
on public.inventory_movements for all
to authenticated
using (true)
with check (true);

create policy if not exists "authenticated full site_content"
on public.site_content for all
to authenticated
using (true)
with check (true);

insert into public.site_content (section_key, title, subtitle, cta_text, payload)
values
(
  'home.hero',
  'Força e Construção na Medida Certa.',
  'Encontre tudo para sua obra: do básico ao acabamento. Qualidade que você confia, entrega que você precisa.',
  'Comprar Agora',
  jsonb_build_object('hero_image_url', null)
),
(
  'home.features',
  'Destaques',
  null,
  null,
  jsonb_build_object(
    'items',
    jsonb_build_array(
      jsonb_build_object('title','Entrega Expressa','description','Receba seu material direto na obra em tempo recorde.'),
      jsonb_build_object('title','Pagamento Facilitado','description','Parcele suas compras no cartão em até 10x sem juros.'),
      jsonb_build_object('title','Atendimento Zap','description','Chame nosso time de especialistas para fazer orçamentos.')
    )
  )
)
on conflict (section_key) do nothing;
