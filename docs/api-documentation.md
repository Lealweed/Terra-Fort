# 📚 Documentação Oficial de APIs e Integração n8n - Terra Fort

Esta documentação especifica todas as rotas de API (`GET`, `POST`), métodos de autenticação, payloads de requisição/resposta e o guia completo para conectar o sistema ao **n8n**.

---

## 🔑 Autenticação e Chave de Integração para o n8n

O sistema Terra Fort utiliza um mecanismo de **Header Auth / Bearer Token** seguro para autorizar chamadas originadas de integrações externas como o **n8n**.

### Chave de Integração Ativa

- **Chave de Integração (Shared Secret)**:
  `7RUpfSqIc7YIouZfxta6lDlgsj2RLSHnD2zIH7sE-hw`
- **Ambiente de Produção Base**:
  `https://www.terrafort.site`

---

## ⚙️ Como Configurar a Conexão no n8n

### Opção 1: Credencial Header Auth (Recomendado)
No n8n, ao criar a credencial para chamar as APIs da Terra Fort:
1. Vá em **Credentials** > **Add Credential** > Selecione **Header Auth**.
2. **Name**: `Header Auth TerraFort.site`
3. **Header Name**: `x-integration-key`
4. **Header Value**: `7RUpfSqIc7YIouZfxta6lDlgsj2RLSHnD2zIH7sE-hw`

### Opção 2: Credencial Bearer Auth
1. Selecione **Bearer Auth**.
2. **Token**: `7RUpfSqIc7YIouZfxta6lDlgsj2RLSHnD2zIH7sE-hw`

---

## 🛰️ Especificação dos Endpoints de API

---

### 1. `GET` / `POST` `/api/agent-context`
> **Finalidade**: Fornece o contexto dinâmico da empresa, cliente, pedidos recentes, catálogo de produtos e promoções ativas para alimentar o agente de IA no n8n.

- **Método**: `GET` ou `POST`
- **Autenticação**: Obrigatoria (Header Auth ou Bearer Token)
  - `x-integration-key: 7RUpfSqIc7YIouZfxta6lDlgsj2RLSHnD2zIH7sE-hw`
  - ou `Authorization: Bearer 7RUpfSqIc7YIouZfxta6lDlgsj2RLSHnD2zIH7sE-hw`

#### Parâmetros de Entrada (`Query Params` ou `JSON Body`):
| Parâmetro | Tipo | Exemplo | Descrição |
| :--- | :--- | :--- | :--- |
| `phone` | `string` | `"5594999999999"` | Telefone do cliente para localização |
| `email` | `string` | `"cliente@terrafort.site"` | E-mail do cliente para localização |
| `orderCode` | `string` | `"TF-1234"` | Código do pedido para busca detalhada |
| `productQuery` | `string` | `"cimento"` | Nome ou categoria para busca de produtos |

#### Exemplo de Requisição (curl):
```bash
curl -X GET "https://www.terrafort.site/api/agent-context?phone=5594999999999&productQuery=cimento" \
  -H "x-integration-key: 7RUpfSqIc7YIouZfxta6lDlgsj2RLSHnD2zIH7sE-hw"
```

#### Exemplo de Resposta (HTTP 200 OK):
```json
{
  "business": {
    "company": "Terra Fort",
    "segment": "Loja de material de construcao",
    "region": "Parauapebas - PA",
    "paymentMethods": ["cartao", "boleto", "pix"],
    "channels": ["loja online", "portal do cliente", "portal do entregador", "portal administrativo", "whatsapp"]
  },
  "customer": {
    "id": "c123",
    "name": "João da Silva",
    "email": "joao@exemplo.com",
    "phone": "5594999999999"
  },
  "orders": [
    {
      "id": "o456",
      "orderCode": "TF-1002",
      "status": "Em rota de entrega",
      "paymentStatus": "Pago",
      "total": 245.50,
      "items": [
        { "product_name": "Cimento Campeão 50kg", "quantity": 5, "unit_price": 32.50 }
      ]
    }
  ],
  "products": [
    {
      "id": "p789",
      "sku": "CIM-50KG",
      "name": "Cimento Campeão 50kg",
      "category": "Cimento",
      "price": 32.50,
      "stockLevel": 150,
      "sobConsulta": false
    }
  ],
  "promotions": [],
  "requestedAt": "2026-07-23T17:45:00.000Z"
}
```

---

### 2. `POST` `/api/support-intake`
> **Finalidade**: Canal de entrada de solicitações de suporte e orçamentos vindo da loja web para o n8n e salvamento automático no Supabase.

- **Método**: `POST`
- **Autenticação**: Pública (usada pelo front-end do e-commerce).
- **Content-Type**: `application/json`

#### Body da Requisição:
```json
{
  "source": "product_details",
  "intent": "quote_request",
  "message": "Gostaria de solicitar orçamento de 10 sacos de cimento.",
  "customer": {
    "name": "Maria Santos",
    "phone": "5594988887777",
    "email": "maria@exemplo.com",
    "address": "Rua das Flores, 100",
    "city": "Parauapebas",
    "neighborhood": "Cidade Nova"
  },
  "product": {
    "id": "p789",
    "name": "Cimento Campeão 50kg",
    "price": 32.50,
    "sob_consulta": false
  }
}
```

#### Exemplo de Resposta (HTTP 200 OK):
```json
{
  "ok": true,
  "degraded": false,
  "degradedReasons": [],
  "requestId": "992b1c91-59de-4b9e-919b-ceb2f89992ea",
  "forwardedToN8n": true,
  "n8nStatus": 200,
  "ticketId": "dc462e11-efd5-4cc3-ac86-aaeae3015637",
  "whatsappUrl": "https://wa.me/5594999346107?text=...",
  "finalMessage": "Solicitação recebida com sucesso. Você pode continuar pelo WhatsApp se preferir."
}
```

---

### 3. `POST` `/api/checkout`
> **Finalidade**: Criação de sessão de pagamento no Stripe Checkout para compras efetuadas no e-commerce.

- **Método**: `POST`
- **Content-Type**: `application/json`

#### Body da Requisição:
```json
{
  "items": [
    { "id": "p789", "name": "Cimento Campeão 50kg", "price": 32.50, "quantity": 2 }
  ],
  "customerEmail": "cliente@exemplo.com"
}
```

#### Resposta:
```json
{
  "sessionId": "cs_test_a1b2c3d4",
  "url": "https://checkout.stripe.com/c/pay/cs_test_a1b2c3d4"
}
```

---

### 4. `POST` `/api/create-payment-link`
> **Finalidade**: Emissão de link de pagamento avulso direto pelo Dashboard Administrativo.

- **Método**: `POST`
- **Content-Type**: `application/json`

#### Body da Requisição:
```json
{
  "amount": 150.00,
  "description": "Pagamento de Frete - Pedido TF-1002",
  "customerName": "Maria Santos"
}
```

#### Resposta:
```json
{
  "url": "https://buy.stripe.com/test_12345"
}
```

---

### 5. `POST` `/api/stripe-webhook`
> **Finalidade**: Recepção de eventos assíncronos do Stripe (`checkout.session.completed`).

- **Método**: `POST`
- **Headers**: `stripe-signature`

---

## 🔒 Boas Práticas e Segurança

1. **Rotação de Chaves**: Mantenha a chave `N8N_SHARED_SECRET` atualizada no arquivo `.env.local` e nas variáveis de ambiente do Vercel.
2. **Timeouts e Fallbacks**: A rota `/api/support-intake` possui fallback automático para o WhatsApp em caso de timeout de rede ou indisponibilidade temporária.
