# Mapeamento de melhorias de robustez/observabilidade (baixo risco)

Data: 2026-05-17  
Escopo analisado: `api/*`, `src/server-core/*`, `src/lib/*`, `src/components/*` (fluxos de checkout/suporte)

## Critérios usados
- Mudanças pequenas, isoladas e testáveis.
- Sem alterar fluxo principal de negócio.
- Logs sem segredos (tokens/chaves/PII sensível).
- Melhorias de fallback amigável e proteção contra falhas transitórias.

---

## 1) Prioridade alta (baixo esforço, alto ganho)

### 1.1 `api/stripe-webhook.ts` — adicionar logs estruturados + checagem de erro no Supabase
**Situação atual**
- Não há logs de início/fim por evento.
- Atualizações em `orders`/`order_events` ignoram retorno de erro.
- Em exceção, retorna erro bruto (`error.message`) ao cliente.

**Risco**
- Falhas silenciosas em atualização de pagamento.
- Difícil diagnosticar incidentes de reconciliação Stripe ↔ pedidos.

**Melhoria sugerida (pequena)**
- Logar: `event.type`, `event.id`, `orderRef` (sem payload completo).
- Validar `error` de cada chamada Supabase e registrar `console.error` sanitizado.
- Retornar mensagem genérica ao cliente (`Webhook validation failed`) e manter detalhe só em log.

**Como testar**
- Teste unitário para evento `checkout.session.completed` com falha simulada no `update`.
- Verificar que responde 200/400 conforme caso e que log de erro é emitido.

---

### 1.2 `api/create-payment-link.ts` — alinhar com `checkout.ts` (sanitização e observabilidade)
**Situação atual**
- `catch` retorna `error.message` diretamente.
- Não há log contextual.

**Risco**
- Vazamento acidental de detalhe interno.
- Menor rastreabilidade de falhas.

**Melhoria sugerida**
- Reaproveitar padrão de `api/checkout.ts`:
  - `sanitizeErrorMessage`.
  - `console.error('[create-payment-link] failed', { method, hasBody, error })`.
  - Resposta amigável e estável (`Failed to create payment link`).

**Como testar**
- Mock de `createPaymentLink` lançando erro com texto sensível; validar redaction no log.

---

### 1.3 `api/agent-context.ts` — logs mínimos de falha/autorização
**Situação atual**
- Sem logs para negação de auth e exceções.

**Risco**
- Suporte operacional difícil para erros 401/403/500.

**Melhoria sugerida**
- Em `auth.ok === false`, `console.warn` com `method`, `status`, `hasAuthHeader`.
- Em `catch`, `console.error` sanitizado + `requestId` se houver (`x-request-id`/`x-correlation-id`).

**Como testar**
- Testes de GET/POST sem credencial e com exceção em `buildAgentContext`.

---

## 2) Prioridade média (baixo risco, impacto UX/diagnóstico)

### 2.1 `src/lib/customerSupport.ts` — timeout no `fetch` e request-id no cliente
**Situação atual**
- `submitSupportRequest` não impõe timeout do lado cliente.
- Em rede degradada pode ficar aguardando muito tempo.

**Risco**
- UX ruim (spinner longo) e sensação de travamento.

**Melhoria sugerida**
- Usar `AbortController` com timeout curto (ex.: 8–12s).
- Opcional: gerar `requestId` no cliente e enviar header `x-request-id` para correlação ponta-a-ponta.
- Em timeout, manter fallback WhatsApp já existente.

**Como testar**
- Mock de `fetch` pendente; validar retorno com `ok: false`, `whatsappUrl` de fallback.

---

### 2.2 `src/components/ProductCard.tsx` e `src/pages/ProductDetails.tsx` — capturar erro explícito do suporte
**Situação atual**
- `try/finally` sem `catch` local; qualquer erro inesperado ainda abre WhatsApp apenas se `submitSupportRequest` resolver.

**Risco**
- Em exceção não tratada, UX pode falhar sem feedback.

**Melhoria sugerida**
- Adicionar `catch` curto:
  - `console.warn` sem dados sensíveis.
  - fallback `window.open(buildWhatsAppUrl(...))` (já existe helper em `customerSupport.ts`).
- Mantém comportamento atual, com proteção extra.

**Como testar**
- Simular `submitSupportRequest` lançando exceção; validar abertura de fallback.

---

### 2.3 `src/components/CartDrawer.tsx` — hardening no fluxo Stripe pós-criação de pedido
**Situação atual**
- Cria `orders` e `order_items`; se `/api/checkout` falha, fica pedido pendente sem evento explícito de falha de checkout.

**Risco**
- Dificuldade de auditoria/reprocessamento manual.

**Melhoria sugerida**
- Em falha de `/api/checkout`, inserir `order_events` com `event_type: 'checkout_session_failed'` e mensagem genérica.
- Não altera UX principal (alert já existente), melhora rastreabilidade.

**Como testar**
- Mock de falha em `/api/checkout`; verificar tentativa de insert em `order_events`.

---

## 3) Prioridade baixa (higiene/consistência)

### 3.1 `api/admin/users.ts` — guardrails de entrada e logging de auditoria leve
**Situação atual**
- `page/perPage` sem clamp de mínimo e sem validação estrita.
- `role` aceito livremente em POST/PATCH.
- Sem logs de operações admin.

**Risco**
- Inputs ruins gerando comportamento inesperado.
- Menos trilha para ações administrativas.

**Melhoria sugerida**
- Clamp: `page >= 1`, `1 <= perPage <= 100`.
- Whitelist de roles permitidas (`admin|delivery|customer`).
- Logs `info/warn` com `action`, `actorId` (se disponível), `targetUserId`; sem email/senha em log.

**Como testar**
- Unit tests para inputs inválidos de paginação/role.

---

### 3.2 `server.ts` — correlação por request para endpoints críticos
**Situação atual**
- Logs pontuais sem correlação consistente entre rotas.

**Melhoria sugerida**
- Middleware simples para `requestId` (`x-request-id` existente ou gerado).
- Incluir requestId em logs de `/api/checkout`, `/api/create-payment-link`, `/api/stripe-webhook`.

**Como testar**
- Requisição com/sem header e validação de header de resposta + logs.

---

## 4) Pontos positivos já existentes (manter padrão)
- `api/_supportIntake.ts` já está robusto:
  - timeouts (n8n/persistência/total),
  - fallback WhatsApp,
  - degradação explícita (`degraded`, códigos),
  - sanitização de erro,
  - logs estruturados.
- `api/checkout.ts` já possui sanitização e log contextual de falha.
- `src/lib/cartCheckout.ts` já fornece mensagens amigáveis para indisponibilidade Stripe.

---

## 5) Backlog sugerido (ordem de execução)
1. `api/stripe-webhook.ts` (observabilidade + checagem de erros Supabase).  
2. `api/create-payment-link.ts` (sanitização/log).  
3. `api/agent-context.ts` (logs de auth/falha).  
4. `src/lib/customerSupport.ts` (timeout/AbortController).  
5. `CartDrawer` (evento de falha de checkout).  
6. `api/admin/users.ts` (validação de inputs + audit log leve).  

Cada item acima pode ser entregue em PRs pequenos e independentes.
