import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDriverDeactivationNote, buildDriverPayload, toDriverDraft, validateDriverDraft } from '../drivers';

test('toDriverDraft fornece valores seguros para novo cadastro e edição', () => {
  assert.deepEqual(toDriverDraft(), {
    name: '',
    phone: '',
    document: '',
    status: 'available',
    notes: '',
  });

  assert.deepEqual(
    toDriverDraft({ id: 'd1', name: 'Carlos', phone: '(94) 99999-1111', document: '123', status: 'busy', notes: null, created_at: '2026-05-10T10:00:00Z' }),
    {
      name: 'Carlos',
      phone: '(94) 99999-1111',
      document: '123',
      status: 'busy',
      notes: '',
    },
  );
});

test('validateDriverDraft exige nome e telefone para cadastro operacional', () => {
  assert.equal(validateDriverDraft({ name: '', phone: '', document: '', status: 'available', notes: '' }), 'Informe o nome do entregador.');
  assert.equal(validateDriverDraft({ name: 'Carlos', phone: '', document: '', status: 'available', notes: '' }), 'Informe o telefone do entregador.');
  assert.equal(validateDriverDraft({ name: 'Carlos', phone: '(94) 99999-1111', document: '', status: 'available', notes: '' }), null);
});

test('buildDriverPayload normaliza campos vazios e mantém status válido', () => {
  assert.deepEqual(
    buildDriverPayload({
      name: '  Carlos Silva  ',
      phone: ' (94) 99999-1111 ',
      document: ' ',
      status: 'busy',
      notes: '  Rota manhã  ',
    }),
    {
      name: 'Carlos Silva',
      phone: '(94) 99999-1111',
      document: null,
      status: 'busy',
      notes: 'Rota manhã',
    },
  );
});

test('buildDriverDeactivationNote preserva histórico e anexa motivo de desativação', () => {
  assert.equal(
    buildDriverDeactivationNote('Atende região central', 'mudança de escala'),
    'Atende região central\nDesativado: mudança de escala',
  );

  assert.equal(
    buildDriverDeactivationNote('', ''),
    'Desativado manualmente no painel admin.',
  );
});
