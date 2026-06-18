# Terra-Fort / terrafort.site

Aplicação web da Terra-Fort com catálogo, carrinho, checkout Stripe, atendimento integrado com n8n/WhatsApp e operação administrativa via Supabase.

## Stack principal
- React 19
- Vite 6
- TypeScript
- Express local para validação integrada
- API serverless em `api/`
- Supabase (dados + auth)
- Stripe
- n8n

## Estrutura de runtime
O projeto hoje trabalha com dois contextos:

1. `npm run dev`
   - sobe o servidor local via `tsx`
   - monta as rotas `/api/*`
   - injeta o frontend via middleware do Vite

2. Produção/deploy
   - frontend gerado com `npm run build`
   - APIs em `api/` para deploy serverless
   - `npm run start` serve o build localmente para validação pré-produção

## Requisitos
- Node.js 22+
- npm
- Projeto Supabase configurado
- Conta/credenciais Stripe
- Webhook n8n configurado

## Configuração local
1. Instale dependências:
   `npm install`
2. Copie `.env.example` para `.env.local`
3. Preencha pelo menos:
   - `APP_URL`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `N8N_SUPPORT_WEBHOOK_URL`
   - `N8N_SUPPORT_WEBHOOK_TOKEN`
   - `N8N_SHARED_SECRET`
   - `VITE_SUPPORT_WHATSAPP_NUMBER`
   - Para habilitar pagamento online também configure:
     - `STRIPE_SECRET_KEY`
     - `STRIPE_WEBHOOK_SECRET`
     - `VITE_STRIPE_PUBLIC_KEY`
   - Sem as chaves do Stripe, o carrinho continua operando com fallback para WhatsApp.
4. Rode em desenvolvimento:
   `npm run dev`

## Scripts
- `npm run dev` — servidor local integrado (Express + Vite)
- `npm run build` — build do frontend
- `npm run start` — sobe validação local do build pronto
- `npm run lint` — checagem TypeScript
- `npm run test` — testes dos serviços administrativos

## Banco / Supabase
Aplique as migrations na ordem:
1. `supabase/migrations/20260506_init.sql`
2. `supabase/migrations/20260506153000_production_phase1.sql`
3. `supabase/migrations/20260509120000_operations_integrations.sql`
4. `supabase/migrations/20260510_customer_company_support.sql`
5. `supabase/migrations/20260510_delivery_drivers.sql`
6. `supabase/migrations/20260514_support_tickets.sql`

Mais detalhes em:
- `supabase/README.md`
- `docs/deploy-runbook.md`
- `docs/env-matrix.md`
- `docs/production-checklist.md`
- `docs/smoke-test.md`

## Endpoints críticos
- `POST /api/checkout`
- `POST /api/create-payment-link`
- `POST /api/stripe-webhook`
- `GET|POST /api/agent-context`
- `POST /api/support-intake`
- `GET|POST|PATCH|DELETE /api/admin/users`

## Fluxo mínimo antes de produção
1. `npm run lint`
2. `npm run test`
3. `npm run build`
4. `npm run start`
5. Validar smoke test dos fluxos críticos
6. Confirmar variáveis e secrets no ambiente de produção
7. Validar webhooks Stripe/n8n

## Deploy na Vercel
1. Conecte o repositório na Vercel.
2. Use o build padrão definido em `vercel.json`: `npm run build`.
3. Publique a pasta `dist` como output.
4. Configure os secrets de produção conforme `docs/env-matrix.md`.
5. Após publicar, valide os fluxos críticos e os webhooks.

Observação: as rotas serverless em `api/` já estão no formato compatível com a Vercel.

## Observações
- O projeto tem histórico de template AI Studio, mas o fluxo atual é Terra-Fort/Supabase/Stripe/n8n.
- `GEMINI_API_KEY` foi mantida apenas como variável legada no exemplo; hoje não há uso funcional dela no app.
