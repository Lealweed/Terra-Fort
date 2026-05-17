import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCreateSupportTicketPayload,
  buildSupportSummary,
  buildSupportTicketPayload,
  buildSupportTicketMetadata,
  filterSupportTickets,
  normalizeSupportStatus,
  toSupportTicketDraft,
  validateSupportTicketDraft,
} from '../support';
import type { AdminSupportTicketRow } from '../../../pages/admin/admin-types';

const tickets: AdminSupportTicketRow[] = [
  {
    id: 't1',
    customer_name: 'Maria Silva',
    customer_phone: '85999990000',
    customer_email: 'maria@teste.com',
    source: 'cart_checkout',
    intent: 'quote_request',
    status: 'new',
    handoff_requested: false,
    assigned_to: null,
    last_message: 'Preciso de orçamento para cimento',
    metadata: { channel: 'site_cart' },
    context: null,
    created_at: '2026-05-14T09:00:00Z',
    updated_at: '2026-05-14T09:05:00Z',
  },
  {
    id: 't2',
    customer_name: 'Construtora Atlas',
    customer_phone: '84988887777',
    customer_email: 'compras@atlas.com',
    source: 'product_details',
    intent: 'price_question',
    status: 'waiting_human',
    handoff_requested: true,
    assigned_to: null,
    last_message: 'Quero falar com atendente humano',
    metadata: { channel: 'site_product' },
    context: null,
    created_at: '2026-05-14T10:00:00Z',
    updated_at: '2026-05-14T10:15:00Z',
  },
  {
    id: 't3',
    customer_name: 'Paulo Rocha',
    customer_phone: '94977776666',
    customer_email: 'paulo@teste.com',
    source: 'product_details',
    intent: 'basic_question',
    status: 'in_progress',
    handoff_requested: true,
    assigned_to: 'admin@terrafort.site',
    last_message: 'Entrega em Canaã?',
    metadata: { channel: 'site_product' },
    context: null,
    created_at: '2026-05-14T11:00:00Z',
    updated_at: '2026-05-14T11:20:00Z',
  },
];

test('normalizeSupportStatus mantém apenas status válidos', () => {
  assert.equal(normalizeSupportStatus('waiting_human'), 'waiting_human');
  assert.equal(normalizeSupportStatus('qualquer-coisa'), 'new');
});

test('filterSupportTickets busca por cliente, contato, mensagem e status', () => {
  assert.deepEqual(filterSupportTickets(tickets, 'atlas', 'todos').map((ticket) => ticket.id), ['t2']);
  assert.deepEqual(filterSupportTickets(tickets, '8599999', 'new').map((ticket) => ticket.id), ['t1']);
  assert.deepEqual(filterSupportTickets(tickets, 'entrega', 'in_progress').map((ticket) => ticket.id), ['t3']);
});

test('buildSupportSummary calcula fila total, aguardando humano, em atendimento e orçamentos', () => {
  assert.deepEqual(buildSupportSummary(tickets), {
    total: 3,
    waitingHuman: 1,
    inProgress: 1,
    quotes: 1,
  });
});

test('toSupportTicketDraft hidrata status/atribuição/comentário com strings seguras', () => {
  assert.deepEqual(toSupportTicketDraft({
    ...tickets[2],
    metadata: { channel: 'site_product', internal_note: 'Cliente já validado pelo financeiro' },
  }), {
    status: 'in_progress',
    assigned_to: 'admin@terrafort.site',
    handoff_requested: true,
    internal_note: 'Cliente já validado pelo financeiro',
  });
});

test('buildSupportTicketMetadata preserva nota existente quando draft não informa nova anotação', () => {
  assert.deepEqual(
    buildSupportTicketMetadata(
      { internal_note: 'Nota existente', internal_note_updated_at: '2026-05-14T11:00:00Z', channel: 'site_product' },
      { status: 'resolved', assigned_to: null, handoff_requested: false, internal_note: '' },
      '2026-05-16T10:00:00Z',
    ),
    {
      channel: 'site_product',
      internal_note: 'Nota existente',
      internal_note_updated_at: '2026-05-14T11:00:00Z',
    },
  );

  assert.deepEqual(
    buildSupportTicketMetadata(
      { internal_note: 'Nota antiga', channel: 'site_product' },
      { status: 'resolved', assigned_to: null, handoff_requested: false, internal_note: 'Nova nota' },
      '2026-05-16T10:00:00Z',
    ),
    {
      channel: 'site_product',
      internal_note: 'Nova nota',
      internal_note_updated_at: '2026-05-16T10:00:00Z',
    },
  );
});

test('validateSupportTicketDraft exige status válido e responsável quando em atendimento', () => {
  assert.equal(validateSupportTicketDraft({ status: 'foo' as any, assigned_to: '', handoff_requested: false, internal_note: '' }), 'Status do atendimento é inválido.');
  assert.equal(validateSupportTicketDraft({ status: 'in_progress', assigned_to: '', handoff_requested: true, internal_note: '' }), 'Informe quem assumiu o atendimento humano.');
  assert.equal(validateSupportTicketDraft({ status: 'resolved', assigned_to: '', handoff_requested: false, internal_note: 'ok' }), null);
});

test('buildSupportTicketPayload normaliza strings e atualiza flags de handoff', () => {
  assert.deepEqual(
    buildSupportTicketPayload({
      status: 'resolved',
      assigned_to: ' admin@terrafort.site ',
      handoff_requested: false,
      internal_note: ' Cliente orientado e orçamento enviado ',
    }),
    {
      status: 'resolved',
      assigned_to: 'admin@terrafort.site',
      handoff_requested: false,
      internal_note: 'Cliente orientado e orçamento enviado',
    },
  );
});

test('buildCreateSupportTicketPayload cria payload seguro para abertura manual', () => {
  assert.deepEqual(
    buildCreateSupportTicketPayload({
      customer_name: '  Maria Silva  ',
      customer_phone: ' 85999990000 ',
      customer_email: ' ',
      source: '',
      intent: '',
      last_message: ' ',
      handoff_requested: true,
    }),
    {
      customer_name: 'Maria Silva',
      customer_phone: '85999990000',
      customer_email: null,
      source: 'admin_manual',
      intent: 'manual_followup',
      status: 'new',
      handoff_requested: true,
      assigned_to: null,
      last_message: 'Ticket criado manualmente pelo admin.',
      metadata: {
        created_by: 'admin_panel',
        created_manually: true,
      },
    },
  );

  assert.throws(
    () => buildCreateSupportTicketPayload({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      source: 'admin_manual',
      intent: 'manual_followup',
      last_message: 'teste',
      handoff_requested: false,
    }),
    /Nome do cliente é obrigatório/,
  );
});
