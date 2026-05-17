# Política CRUD para Produção (Admin)

## Princípio
Em produção real, entidades operacionais e financeiras **não devem ser removidas fisicamente** por padrão.

## Regras por domínio
- **Orders (`orders`)**: sem delete físico. Usar status/cancelamento + trilha de eventos.
- **Finance (`finance`)**: sem delete físico preferencial. Se exclusão for necessária, exigir auditoria explícita.
- **Inventory (`inventory`)**: sem delete físico de movimentos. Ajustes são aditivos e rastreáveis.
- **Delivery (`delivery`)**: sem delete físico de histórico logístico.
- **Drivers (`delivery_drivers`)**: usar **desativação** (`status = inactive`) no lugar de delete.
- **Support (`support_tickets`)**: usar **arquivamento lógico** (status resolvido + metadados de arquivamento).

## Objetivo
Garantir rastreabilidade, auditoria e capacidade de investigação de incidentes em produção.