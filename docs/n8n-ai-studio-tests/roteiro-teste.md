# Roteiro de teste – Webhook AI Studio

## Objetivo
Validar normalização de payload, envio ao endpoint AI Studio e comportamento com mensagem vazia.

## Pré-condições
- Workflow atualizado com os nós:
  - `Normalizar Inbound AI Studio` (Set)
  - `Mensagem válida?` (IF)
  - `Enviar p/ AI Studio Webhook` (HTTP Request)
- Em n8n, variável de ambiente opcional:
  - `N8N_WEBHOOK_INBOUND_SECRET` (se o endpoint exigir Authorization)

## Cenários
1. `payload-01-phone-name-text.json`
   - Esperado no Set: `phone`, `name`, `message` preenchidos
   - Esperado no IF: TRUE
   - Esperado no HTTP: executa

2. `payload-02-destination-pushname-message.json`
   - Esperado no Set: fallback de `destination/pushName/message`
   - Esperado no IF: TRUE
   - Esperado no HTTP: executa

3. `payload-03-remotejid-content.json`
   - Esperado no Set: fallback de `remoteJid/content`
   - Esperado no IF: TRUE
   - Esperado no HTTP: executa

4. `payload-04-empty-message.json`
   - Esperado no Set: `message` vazio após trim
   - Esperado no IF: FALSE
   - Esperado no HTTP: NÃO executa

## Como executar no n8n
1. Abra o workflow e clique em **Test workflow**.
2. No nó `Gatilho` (Webhook), envie cada payload de teste.
3. Em cada execução, valide:
   - Saída do `Normalizar Inbound AI Studio`
   - Ramo tomado no `Mensagem válida?`
   - Status/Body no `Enviar p/ AI Studio Webhook`

## Critérios de aprovação
- Cenários 1-3: IF TRUE + HTTP executado com body JSON correto.
- Cenário 4: IF FALSE + HTTP não chamado.
- Sem quebra do fluxo principal quando webhook externo falhar (`continueOnFail=true`).

## Registro rápido (preencher)
- Data/hora:
- Ambiente:
- Cenário 1: PASS/FAIL
- Cenário 2: PASS/FAIL
- Cenário 3: PASS/FAIL
- Cenário 4: PASS/FAIL
- Observações:
