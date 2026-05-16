# Smoke test - Terra-Fort

## Objetivo
Validar rapidamente os fluxos críticos do site e da operação antes de publicar ou logo após um deploy.

## Pré-condições
- `npm run lint` ok
- `npm run test` ok
- `npm run build` ok
- `npm run start` ok para validação local ou deploy concluído em ambiente alvo
- variáveis confirmadas em `docs/env-matrix.md`
- migrations aplicadas conforme `supabase/README.md`

## Ambiente de teste
Preencher antes de executar:
- URL alvo:
- data/hora:
- responsável:
- branch/release:

## Fluxo 1 - Home e catálogo
1. Abrir a home.
2. Confirmar que a página responde sem erro visual.
3. Navegar para o catálogo.
4. Confirmar que produtos carregam.

Esperado:
- status 200 nas páginas
- sem erro crítico no console
- cards de produto renderizados

## Fluxo 2 - Detalhe do produto
1. Abrir um produto pelo catálogo.
2. Confirmar título, preço, descrição e CTA.
3. Validar se o botão de compra/adicionar ao carrinho responde.

Esperado:
- detalhe abre sem tela em branco
- preço e conteúdo do produto aparecem
- CTA responde ao clique

## Fluxo 3 - Carrinho
1. Adicionar um produto.
2. Abrir o carrinho.
3. Alterar quantidade.
4. Remover e readicionar item.

Esperado:
- subtotal recalcula
- item persiste durante a sessão
- carrinho não quebra com quantidade inválida

## Fluxo 4 - Checkout / payment link
1. Iniciar checkout pelo carrinho.
2. Confirmar resposta do endpoint `/api/checkout`.
3. Se aplicável, testar criação de payment link.

Esperado:
- sem erro 500
- checkout/session ou payment link retornado
- redirecionamento/URL válida

## Fluxo 5 - Webhook Stripe
1. Simular ou validar um evento `checkout.session.completed`.
2. Confirmar que `/api/stripe-webhook` responde adequadamente.
3. Verificar logs da aplicação.

Esperado:
- assinatura validada
- retorno `{ received: true }`
- log do evento sem erro de secret/assinatura

## Fluxo 6 - Atendimento do site
1. Abrir atendimento a partir de um produto.
2. Abrir atendimento a partir do carrinho.
3. Enviar payload mínimo de suporte.

Esperado:
- `/api/support-intake` responde sem erro 500
- fallback para WhatsApp existe quando n8n não responder
- número de suporte está correto

## Fluxo 7 - n8n / contexto do agente
1. Confirmar recebimento do webhook no n8n.
2. Validar chamada protegida a `/api/agent-context`.
3. Confirmar retorno com contexto mínimo quando houver dados.

Esperado:
- webhook chega autenticado
- `/api/agent-context` rejeita acesso sem token
- `/api/agent-context` responde com contexto quando autenticado

## Fluxo 8 - Admin
1. Acessar área administrativa.
2. Validar autenticação de usuário admin.
3. Confirmar carregamento inicial do dashboard.

Esperado:
- acesso restrito funciona
- dashboard abre sem erro crítico
- módulos principais ficam navegáveis

## Fluxo 9 - Operação
Executar leitura mínima de cada área:
1. Pedidos
2. Clientes
3. Entregadores
4. Suporte/tickets
5. Estoque/financeiro, se estiverem no escopo do release

Esperado:
- listas carregam
- sem erro crítico de permissão ou consulta
- ações básicas de visualização funcionam

## Registro de resultado
Marcar para cada fluxo:
- PASSOU
- PASSOU COM RESSALVA
- FALHOU

## Bloqueadores comuns
- secret faltando ou divergente
- migration não aplicada
- webhook Stripe apontando para URL errada
- token do n8n divergente
- usuário admin sem papel correto no Supabase
