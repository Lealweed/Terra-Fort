# Supabase - Terra-Fort

## Objetivo
Este diretório concentra a evolução do banco usado pelo site, checkout, operação, suporte e integrações da Terra-Fort.

## Variáveis necessárias no backend local/serverless
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Ordem de aplicação das migrations
Aplique em banco limpo/staging nesta ordem:

1. `20260506_init.sql`
   - tabelas-base: `products`, `customers`, `orders`, `order_items`, `inventory_movements`, `site_content`
   - triggers `updated_at`
   - políticas RLS iniciais
   - seed inicial de conteúdo

2. `20260506153000_production_phase1.sql`
   - ajustes de produção fase 1

3. `20260509120000_operations_integrations.sql`
   - tabelas operacionais e de integração
   - `promotions`
   - `integration_connections`
   - `sync_runs`

4. `20260510_customer_company_support.sql`
   - suporte ao fluxo pessoa física / empresa
   - campos e estruturas ligadas ao cadastro comercial

5. `20260510_delivery_drivers.sql`
   - cadastro de entregadores
   - vínculo operacional com pedidos/logística

6. `20260514_support_tickets.sql`
   - fila de atendimento
   - persistência de tickets do site/WhatsApp/n8n

## Recomendação de validação após migrations
Depois de aplicar tudo:
1. validar leitura/escrita de produtos
2. validar autenticação/admin no Supabase
3. validar criação/consulta de pedidos
4. validar cadastro/edição de clientes
5. validar entregadores e vínculo em pedidos
6. validar persistência de `support_tickets`

## Observações importantes
- Não usar apenas `20260506_init.sql` em produção: isso deixa o banco incompleto para o estado atual do sistema.
- Para produção, rode primeiro em staging e confirme os fluxos críticos antes do banco final.
- Se houver divergência entre estrutura real e frontend/admin, revisar as migrations mais recentes antes do deploy.
