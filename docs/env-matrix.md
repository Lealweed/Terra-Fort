# Matriz de variáveis de ambiente - Terra-Fort

## Objetivo
Mapa único das variáveis usadas pelo frontend, backend local, rotas serverless e integrações da Terra-Fort.

## Convenções
- `VITE_*`: exposta no build do frontend.
- sem `VITE_*`: uso restrito ao backend/local/serverless.
- `legado/opcional`: mantida por compatibilidade, evitar depender dela em novas implementações.

## Variáveis obrigatórias

| Variável | Camada | Obrigatória | Uso principal | Onde aparece |
|---|---|---:|---|---|
| `APP_URL` | backend/serverless | sim | monta URLs de retorno do checkout e payment link | `server.ts`, `api/checkout.ts`, `api/create-payment-link.ts` |
| `PORT` | backend local | local | porta do Express local / validação com `npm run start` | `server.ts` |
| `NODE_ENV` | backend/build | recomendado | diferencia runtime local/produção | `scripts/prod-server.ts`, `server.ts` |
| `DISABLE_HMR` | backend local | opcional | desabilita HMR em ambientes controlados | `vite.config.ts` |
| `VITE_SUPABASE_URL` | frontend + backend | sim | URL do projeto Supabase | `src/lib/supabase.ts`, `api/_supabaseAdmin.ts` |
| `VITE_SUPABASE_ANON_KEY` | frontend | sim | cliente público do Supabase | `src/lib/supabase.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | backend/serverless | sim | operações administrativas e protegidas no Supabase | `api/_supabaseAdmin.ts` |
| `STRIPE_SECRET_KEY` | backend/serverless | sim | cliente Stripe privado | `api/_stripe.ts` |
| `STRIPE_WEBHOOK_SECRET` | backend/serverless | sim | valida assinatura do webhook Stripe | `server.ts`, `api/stripe-webhook.ts` |
| `VITE_STRIPE_PUBLIC_KEY` | frontend | sim | inicializa Stripe.js no carrinho | `src/components/CartDrawer.tsx` |
| `N8N_SUPPORT_WEBHOOK_URL` | backend/serverless | sim | encaminha intake de suporte do site para o n8n | `api/_supportIntake.ts` |
| `N8N_SUPPORT_WEBHOOK_TOKEN` | backend/serverless | sim | autentica chamada backend -> n8n | `api/_supportIntake.ts` |
| `N8N_SHARED_SECRET` | backend/serverless | sim | autentica chamadas do n8n para `/api/agent-context` e fallback do intake | `api/_integrationAuth.ts`, `api/_supportIntake.ts` |
| `VITE_SUPPORT_WHATSAPP_NUMBER` | frontend/build | recomendado | número de fallback visível ao usuário | `api/_supportIntake.ts` |
| `SUPPORT_WHATSAPP_NUMBER` | backend/serverless | opcional | alias backend para fallback WhatsApp | `api/_supportIntake.ts` |

## Variáveis legadas / compatibilidade

| Variável | Status | Observação |
|---|---|---|
| `N8N_WEBHOOK_URL` | legado/opcional | alias para `N8N_SUPPORT_WEBHOOK_URL`; manter só enquanto existirem fluxos antigos |
| `AGENT_API_KEY` | legado/opcional | alias para `N8N_SHARED_SECRET`; evitar uso novo |
| `GEMINI_API_KEY` | legado/sem uso funcional atual | ainda injetada em `vite.config.ts`, mas o app atual não depende dela |

## Perfis mínimos por ambiente

### Desenvolvimento local (`npm run dev`)
Obrigatórias:
- `APP_URL=http://localhost:3000`
- `PORT=3000`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `VITE_STRIPE_PUBLIC_KEY`
- `N8N_SUPPORT_WEBHOOK_URL`
- `N8N_SUPPORT_WEBHOOK_TOKEN`
- `N8N_SHARED_SECRET`

Recomendadas:
- `VITE_SUPPORT_WHATSAPP_NUMBER`
- `SUPPORT_WHATSAPP_NUMBER`
- `DISABLE_HMR=false`

### Validação local de produção (`npm run build && npm run start`)
Obrigatórias:
- todas as acima
- `NODE_ENV=production` é aplicado por `scripts/prod-server.ts`, mas pode ser definido explicitamente se necessário

### Produção serverless
Obrigatórias:
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
- `VITE_SUPPORT_WHATSAPP_NUMBER` ou `SUPPORT_WHATSAPP_NUMBER`

## Regras operacionais
1. Não usar `SUPABASE_SERVICE_ROLE_KEY` no frontend.
2. Preferir `N8N_SUPPORT_WEBHOOK_URL` e `N8N_SHARED_SECRET`; deixar aliases legados só por compatibilidade.
3. Antes de publicar, validar `.env.local`, provider de deploy e secrets do n8n/Stripe com esta matriz.
4. Se remover `GEMINI_API_KEY` de vez, limpar também a injeção em `vite.config.ts`.
