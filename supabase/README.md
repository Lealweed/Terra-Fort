# Supabase - Terra-Fort

## 1) Variáveis locais
Arquivo `.env.local` já configurado com:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 2) Criar estrutura do banco
No painel do Supabase, abra **SQL Editor** e execute:

`supabase/migrations/20260506_init.sql`

Isso cria as tabelas:
- `products`
- `customers`
- `orders`
- `order_items`
- `inventory_movements`
- `site_content`

Além de:
- triggers `updated_at`
- políticas RLS iniciais
- seed de conteúdo da home

## 3) Próximo passo recomendado
Trocar os dados mockados do frontend por queries reais no Supabase (`products`, `orders`, `site_content`).
