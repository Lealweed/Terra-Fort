# Terra-Fort / terrafort.site — auditoria técnica do estado atual

Data: 2026-05-16
Repositório: `G:/Terra-Fort`
Branch analisada: `feat/sync-local-progress`

## Resumo executivo

O projeto está mais maduro do que o levantamento anterior indicava.
Hoje o estado real é:

- TypeScript ok
- testes ok
- build ok
- `npm run start` funcional para validação local do build
- documentação de ambiente/deploy/smoke test já criada
- novas frentes visíveis no admin para suporte e operação

Mesmo assim, eu ainda não chamaria de pronto para uma entrega fechada sem ressalvas, porque o repositório está com muitas mudanças locais não consolidadas e os fluxos externos críticos ainda não foram validados ponta a ponta neste ciclo (`Stripe`, `n8n`, `Supabase admin`, migrations em banco limpo/staging).

Veredito atual: `PARCIALMENTE PRONTO`

## O que foi validado agora

### Estrutura e runtime
- Frontend: React 19 + Vite 6 + TypeScript
- Runtime local integrado: `server.ts` + `tsx scripts/dev-server.ts`
- Validação local de produção: `tsx scripts/prod-server.ts`
- Runtime serverless: pasta `api/`
- Banco/Auth: Supabase
- Pagamento: Stripe
- Integração operacional: n8n + WhatsApp

### Estado do repositório
- Remote: `https://github.com/Lealweed/Terra-Fort.git`
- Branch atual: `feat/sync-local-progress`
- `git status --porcelain` retornou 48 mudanças locais:
  - 24 arquivos modificados rastreados
  - 24 arquivos novos não rastreados
- Áreas impactadas:
  - `src/`
  - `api/`
  - `supabase/`
  - `docs/`
  - `scripts/`
  - arquivos auxiliares de workflow n8n na raiz

### Mudanças funcionais visíveis no código
1. Atendimento/admin
   - nova página `src/pages/admin/AdminSupportPage.tsx`
   - dashboard carrega e renderiza aba `support`
   - serviço `src/services/admin/support.ts` lista e atualiza tickets
   - migration `supabase/migrations/20260514_support_tickets.sql`

2. Clientes PF/PJ
   - `AdminCustomersPage.tsx` contém alternância explícita entre `person` e `company`
   - tipos `customer_kind` estão definidos em `admin-types.ts`

3. Entregadores/logística
   - existe fluxo para `delivery_drivers`
   - migration `supabase/migrations/20260510_delivery_drivers.sql`
   - dashboard e páginas admin referenciam `assigned_driver_id`

4. Backend/admin protegido
   - endpoint `GET|POST|PATCH|DELETE /api/admin/users`
   - proteção por bearer token + role `admin`
   - rota montada também no Express local

5. Atendimento do site
   - endpoint `POST /api/support-intake`
   - persistência em `support_tickets`
   - encaminhamento ao n8n
   - fallback para WhatsApp

## Checks executados

### 1) TypeScript
Comando:
`npm run lint`

Resultado:
- PASSOU

### 2) Testes
Comando:
`npm test`

Resultado:
- PASSOU
- 50/50 testes ok

Cobertura prática visível da suíte:
- admin users route
- checkout/cart fallback Stripe
- clientes
- entregas
- entregadores
- finanças
- pedidos
- suporte
- produto sob consulta

### 3) Build
Comando:
`npm run build`

Resultado:
- PASSOU

Artefatos principais do build:
- `dist/assets/react-vendor-*.js` ~387 kB bruto
- `dist/assets/supabase-vendor-*.js` ~206 kB bruto
- `dist/assets/AdminSupportPage-*.js` gerado com sucesso

### 4) Start de validação local
Comandos/evidências:
- `npm run start` na porta padrão falhou por conflito local de porta (`EADDRINUSE 3000`), não por erro do código
- `PORT=3011 npm run start` manteve o processo de pé
- `curl -I http://127.0.0.1:3011` respondeu `HTTP/1.1 200 OK`

Conclusão:
- o fluxo atual de start está funcional
- o problema observado anteriormente de import/resolução foi superado
- a falha atual na porta 3000 é ambiental e não estrutural do projeto

### 5) Auditoria de dependências
Comando:
`npm audit --omit=dev`

Resultado:
- PASSOU
- `found 0 vulnerabilities`

## Ambiente e documentação

### Positivos
- `.env.example` agora cobre o conjunto principal de variáveis
- `docs/env-matrix.md` existe e está coerente com o backend atual
- `docs/deploy-runbook.md` existe
- `docs/production-checklist.md` existe
- `docs/smoke-test.md` existe
- `supabase/README.md` foi atualizado com a ordem completa das migrations
- `README.md` foi reescrito para o fluxo real da Terra-Fort

### Variáveis importantes confirmadas em uso
- `APP_URL`
- `PORT`
- `NODE_ENV`
- `DISABLE_HMR`
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
- aliases legados: `N8N_WEBHOOK_URL`, `AGENT_API_KEY`, `GEMINI_API_KEY`

## Principais riscos restantes

### Risco 1 — branch ainda não congelada
Achado:
- 48 mudanças locais
- 24 arquivos novos não rastreados
- existem artefatos auxiliares na raiz, incluindo:
  - `.hermes-workflow-backup-terrafort-site.json`
  - `.hermes-workflow-terrafort-site-updated.json`
  - `.hermes_update_n8n_workflow.py`

Impacto:
- alto risco de publicar escopo misturado
- difícil afirmar prontidão final sem separar o que entra no release

Prioridade:
- Alta

### Risco 2 — integrações críticas ainda não validadas ponta a ponta neste ciclo
Achado:
- não executei webhook real do Stripe
- não validei entrega real ao n8n
- não validei login/admin real no Supabase com usuário de produção/staging
- não validei migrations em banco limpo/staging

Impacto:
- pode haver falha apenas em produção mesmo com build/test ok

Prioridade:
- Alta

### Risco 3 — contrato de deploy ainda depende de convenção, não de configuração explícita
Achado:
- não existe `vercel.json`
- o projeto mistura `server.ts` local com `api/` serverless
- a documentação atual já explica a intenção operacional, mas o contrato ainda é implícito

Impacto:
- risco moderado de divergência futura entre local e produção
- onboarding e manutenção ficam mais frágeis do que precisariam

Prioridade:
- Média

### Risco 4 — resíduos legados ainda presentes
Achado:
- `vite.config.ts` ainda injeta `process.env.GEMINI_API_KEY`
- comentários ainda citam AI Studio/HMR legado
- `GEMINI_API_KEY` está mantida como legado no exemplo de env

Impacto:
- não bloqueia release
- aumenta confusão técnica e custo de manutenção

Prioridade:
- Média

### Risco 5 — dependência de ambiente local ocupando porta padrão
Achado:
- porta `3000` já estava em uso por processo local durante a auditoria

Impacto:
- pode gerar falso negativo em validação manual
- não é bug do projeto, mas atrapalha rotina operacional

Prioridade:
- Baixa

## Pontos fortes atuais
- `npm run lint` ok
- `npm test` ok com 50 testes
- `npm run build` ok
- `npm run start` validado com resposta HTTP 200 em porta alternativa
- suporte admin visível e integrado ao dashboard
- fluxo PF/PJ visível no admin de clientes
- suporte a entregadores/logística presente
- documentação operacional melhorou bastante
- `npm audit --omit=dev` sem vulnerabilidades
- webhook Stripe já valida assinatura no endpoint serverless
- `/api/admin/users` exige bearer token e role `admin`
- `/api/support-intake` persiste ticket e tenta encaminhar ao n8n com fallback para WhatsApp

## Veredito atualizado

Status atual: `PARCIALMENTE PRONTO, MAIS PERTO DE RELEASE DO QUE ANTES`

### Pode ser considerado pronto para seguir para fase final de release se:
1. congelar a branch e limpar escopo
2. decidir o que entra e o que não entra dos arquivos não rastreados
3. validar migrations em staging/banco limpo
4. executar smoke test completo
5. validar integrações reais de Stripe, n8n e admin auth

### Não recomendo chamar de “entrega fechada” antes disso.

## Próxima ordem recomendada
1. revisar e classificar os 48 arquivos alterados por bloco funcional
2. separar lixo/artefato auxiliar do que realmente pertence ao produto
3. rodar checklist de staging
4. executar smoke test técnico
5. só então preparar commit/release
