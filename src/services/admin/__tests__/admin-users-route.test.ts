import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminUsersExpressHandler, registerAdminUsersRoute } from '../../../server-core/admin-users-route';

test('registerAdminUsersRoute monta a rota /api/admin/users no app Express', () => {
  const registrations: Array<{ path: string; handler: unknown }> = [];
  const app = {
    all(path: string, handler: unknown) {
      registrations.push({ path, handler });
      return this;
    },
  };

  registerAdminUsersRoute(app);

  assert.equal(registrations.length, 1);
  assert.equal(registrations[0]?.path, '/api/admin/users');
  assert.equal(typeof registrations[0]?.handler, 'function');
});

test('createAdminUsersExpressHandler delega req/res para o handler da API', async () => {
  const req = { method: 'GET' };
  const res = { statusCode: 200 };
  let delegated = false;

  const handler = createAdminUsersExpressHandler(async () => ({
    default: async (incomingReq, incomingRes) => {
      delegated = true;
      assert.equal(incomingReq, req);
      assert.equal(incomingRes, res);
    },
  }));

  await handler(req, res);

  assert.equal(delegated, true);
});
