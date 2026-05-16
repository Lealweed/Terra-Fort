# Production checklist - Terra-Fort

## Código
- [ ] branch/release definida
- [ ] mudanças locais revisadas
- [ ] `npm install`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run start`

## Banco
- [ ] migrations aplicadas na ordem correta
- [ ] tabelas críticas conferidas
- [ ] usuário admin validado

## Integrações
- [ ] `docs/env-matrix.md` conferido com os secrets reais
- [ ] `STRIPE_SECRET_KEY` configurada
- [ ] `STRIPE_WEBHOOK_SECRET` configurada
- [ ] webhook Stripe apontando para `/api/stripe-webhook`
- [ ] `N8N_SUPPORT_WEBHOOK_URL` configurada
- [ ] `N8N_SUPPORT_WEBHOOK_TOKEN` configurada
- [ ] `N8N_SHARED_SECRET` configurada

## Frontend
- [ ] `docs/smoke-test.md` usado como roteiro de validação
- [ ] catálogo abre
- [ ] detalhe de produto abre
- [ ] carrinho funciona
- [ ] checkout/pagamento responde
- [ ] atendimento abre fallback WhatsApp se necessário

## Operação/admin
- [ ] login/admin válido
- [ ] usuários admin consultáveis
- [ ] pedidos carregam
- [ ] clientes carregam
- [ ] entregadores carregam
- [ ] suporte/tickets carregam

## Go live
- [ ] domínio final responde
- [ ] smoke test em produção concluído
- [ ] logs sem erro crítico pós-publicação
