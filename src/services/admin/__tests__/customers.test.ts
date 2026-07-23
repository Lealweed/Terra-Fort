import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCreateCustomerPayload, buildCustomerInsights, filterCustomers, toCustomerDraft, validateCustomerDraft } from '../customers';
import type { AdminCustomerRow, AdminOrderRow } from '../../../pages/admin/admin-types';

const customers: AdminCustomerRow[] = [
  { id: 'c1', customer_kind: 'person', name: 'Maria Silva', contact_name: null, email: 'maria@teste.com', phone: '85999990000', document: '123', notes: 'VIP', is_blocked: false, created_at: '2026-05-01T10:00:00Z' },
  { id: 'c2', customer_kind: 'company', name: 'Acme LTDA', contact_name: 'João Souza', email: 'joao@teste.com', phone: '85888880000', document: null, notes: null, is_blocked: false, created_at: '2026-05-02T10:00:00Z' }
];

const orders: AdminOrderRow[] = [
  { id: 'o1', order_code: 'TF-001', customer_name: 'Maria Silva', customer_email: 'maria@teste.com', customer_phone: '85999990000', status: 'Pago', total: 120, payment_status: 'Pago', created_at: '2026-05-03T10:00:00Z', delivery_address: null },
  { id: 'o2', order_code: 'TF-002', customer_name: 'Maria Silva', customer_email: 'maria@teste.com', customer_phone: '85999990000', status: 'Concluído', total: 80, payment_status: 'Pago', created_at: '2026-05-04T10:00:00Z', delivery_address: null },
  { id: 'o3', order_code: 'TF-003', customer_name: 'Outro Nome', customer_email: 'outro@teste.com', customer_phone: '85777770000', status: 'Pendente', total: 50, payment_status: 'Pendente', created_at: '2026-05-05T10:00:00Z', delivery_address: null },
];

test('filterCustomers busca por nome, email e telefone', () => {
  assert.equal(filterCustomers(customers, 'maria').length, 1);
  assert.equal(filterCustomers(customers, '8588888').length, 1);
  assert.equal(filterCustomers(customers, '').length, 2);
});

test('toCustomerDraft mantém campos editáveis com strings seguras', () => {
  assert.deepEqual(toCustomerDraft(customers[1]), {
    customer_kind: 'company',
    name: 'Acme LTDA',
    contact_name: 'João Souza',
    email: 'joao@teste.com',
    phone: '85888880000',
    document: '',
    notes: '',
    is_blocked: false,
  });
});

test('buildCustomerInsights calcula total, receita e último pedido do cliente', () => {
  const insights = buildCustomerInsights(customers[0], orders);
  assert.equal(insights.totalOrders, 2);
  assert.equal(insights.totalRevenue, 200);
  assert.equal(insights.lastOrderCode, 'TF-002');
});

test('buildCustomerInsights vincula pedidos por ID de cliente ou telefone formatado', () => {
  const customerWithId: AdminCustomerRow = {
    id: 'c-unique-id',
    customer_kind: 'person',
    name: 'Nome Diferente',
    contact_name: null,
    email: 'outroemail@teste.com',
    phone: '(85) 97777-0000',
    document: null,
    notes: null,
    is_blocked: false,
    created_at: '2026-05-01T10:00:00Z',
  };

  const testOrders: AdminOrderRow[] = [
    {
      id: 'o-by-id',
      order_code: 'TF-999',
      customer_id: 'c-unique-id',
      customer_name: 'Antigo Nome',
      customer_email: 'antigo@teste.com',
      customer_phone: '85777770000',
      status: 'Pago',
      total: 350,
      payment_status: 'Pago',
      created_at: '2026-05-06T10:00:00Z',
      delivery_address: null,
    },
  ];

  const insights = buildCustomerInsights(customerWithId, testOrders);
  assert.equal(insights.totalOrders, 1);
  assert.equal(insights.totalRevenue, 350);
  assert.equal(insights.lastOrderCode, 'TF-999');
});

test('validateCustomerDraft exige nome e ao menos um contato', () => {
  assert.equal(validateCustomerDraft({ customer_kind: 'person', name: '', contact_name: '', email: '', phone: '', document: '', notes: '', is_blocked: false }), 'Nome do cliente é obrigatório.');
  assert.equal(validateCustomerDraft({ customer_kind: 'person', name: 'Cliente', contact_name: '', email: '', phone: '', document: '', notes: '', is_blocked: false }), 'Informe ao menos e-mail ou telefone do cliente.');
  assert.equal(validateCustomerDraft({ customer_kind: 'company', name: 'Empresa X', contact_name: '', email: 'cliente@teste.com', phone: '', document: '', notes: '', is_blocked: false }), 'Informe o nome do contato responsável pela empresa.');
  assert.equal(validateCustomerDraft({ customer_kind: 'company', name: 'Empresa X', contact_name: 'Paulo', email: 'cliente@teste.com', phone: '', document: '', notes: '', is_blocked: false }), null);
});

test('buildCreateCustomerPayload normaliza strings e converte vazios para null', () => {
  assert.deepEqual(
    buildCreateCustomerPayload({
      customer_kind: 'company',
      name: '  Novo Cliente  ',
      contact_name: '  Maria Gestora ',
      email: ' novo@teste.com ',
      phone: ' 94999990000 ',
      document: '',
      notes: ' observação ',
      is_blocked: false,
    }),
    {
      customer_kind: 'company',
      name: 'Novo Cliente',
      contact_name: 'Maria Gestora',
      email: 'novo@teste.com',
      phone: '94999990000',
      document: null,
      notes: 'observação',
      is_blocked: false,
    },
  );
});
