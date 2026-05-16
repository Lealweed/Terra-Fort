# Runbook de deploy - Terra-Fort

## Objetivo
Checklist operacional para publicar o terrafort.site com frontend, APIs, Stripe, Supabase e n8n consistentes.

## Decisão operacional atual
Até nova refatoração, tratar o projeto assim:
- desenvolvimento/local integrado: `server.ts` via `tsx`
- produção: frontend buildado + rotas `api/` em ambiente serverless compatível
- validação pré-publicação: `npm run build` + `npm run start`

## Pré-requisitos
- repositório limpo ou branch de release definida
- secrets de produção disponíveis
- projeto Supabase pronto
- Stripe com chaves/live e webhook definidos
- n8n com webhook de suporte publicado

## Variáveis obrigatórias em produção
- `APP_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `VITE_STRIPE_PUBLIC_KEY`
- `N8N_SUPPORT_WEBHOOK_URL`
- `N8N_SUPPORT_WEBHOOK_TOKEN`
- `N8N_SHARED_SECRET`
- `VITE_SUPPORT_WHATSAPP_NUMBER`

Referência única de ambiente:
- `docs/env-matrix.md`

## Passo 1 — validar código local
Rodar:
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run start`

## Passo 2 — validar banco
Aplicar migrations na ordem descrita em `supabase/README.md`.

Conferir principalmente:
- `products`
- `customers`
- `orders`
- `order_items`
- `inventory_movements`
- `promotions`
- `integration_connections`
- `sync_runs`
- `delivery_drivers`
- `support_tickets`

## Passo 3 — configurar integrações
### Stripe
- configurar `STRIPE_SECRET_KEY`
- configurar `STRIPE_WEBHOOK_SECRET`
- apontar o webhook para `/api/stripe-webhook`
- validar evento `checkout.session.completed`

### n8n
- publicar o webhook de suporte
- configurar `N8N_SUPPORT_WEBHOOK_URL`
- alinhar `N8N_SUPPORT_WEBHOOK_TOKEN`
- alinhar `N8N_SHARED_SECRET` para consumo de `/api/agent-context`

### Supabase Auth/Admin
- validar usuário admin real
- validar `/api/admin/users` com bearer token

## Passo 4 — smoke test mínimo
1. abrir home e catálogo
2. abrir produto
3. adicionar ao carrinho
4. testar checkout/payment-link
5. testar atendimento do produto
6. testar atendimento do carrinho
7. validar criação de ticket em `support_tickets`
8. validar recepção no n8n
9. validar acesso admin
10. validar operação de clientes/pedidos/entregas

Roteiro detalhado:
- `docs/smoke-test.md`

## Passo 5 — publicar
- subir branch/release escolhida
- confirmar build do ambiente
- reexecutar smoke test já no domínio final
- revisar logs de Stripe/n8n/Supabase

## Critérios para chamar de pronto
- lint ok
- testes ok
- build ok
- start local de validação ok
- migrations aplicadas
- webhook Stripe confirmado
- intake n8n confirmado
- admin autenticado funcionando
