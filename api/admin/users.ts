type VercelRequest = any;
type VercelResponse = any;
import { supabaseAdmin } from '../_supabaseAdmin.js';
import { requireAdmin } from '../_auth.js';

function send(res: VercelResponse, code: number, body: unknown) {
  res.status(code).json(body);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const auth: any = await requireAdmin(req);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });

    if (req.method === 'GET') {
      const page = Number(req.query.page || 1);
      const perPage = Math.min(100, Number(req.query.perPage || 50));
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) return send(res, 400, { error: error.message });

      const users = data.users.map((u) => ({
        id: u.id,
        email: u.email,
        role: (u.user_metadata as any)?.role || (u.app_metadata as any)?.role || 'unknown',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        banned_until: u.banned_until,
      }));

      return send(res, 200, { users });
    }

    if (req.method === 'POST') {
      const { email, password, role } = req.body || {};
      if (!email || !password) return send(res, 400, { error: 'email and password are required' });

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: role || 'customer' },
      });
      if (error) return send(res, 400, { error: error.message });

      return send(res, 200, { user: { id: data.user.id, email: data.user.email, role: (data.user.user_metadata as any)?.role || 'customer' } });
    }

    if (req.method === 'PATCH') {
      const { id, role, password, ban } = req.body || {};
      if (!id) return send(res, 400, { error: 'id is required' });

      const attrs: any = {};
      if (role) attrs.user_metadata = { role };
      if (password) attrs.password = password;
      if (typeof ban === 'boolean') attrs.ban_duration = ban ? '876000h' : 'none';

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, attrs);
      if (error) return send(res, 400, { error: error.message });

      return send(res, 200, { user: { id: data.user.id, email: data.user.email, role: (data.user.user_metadata as any)?.role || 'unknown' } });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return send(res, 400, { error: 'id is required' });
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id, true);
      if (error) return send(res, 400, { error: error.message });
      return send(res, 200, { ok: true });
    }

    return send(res, 405, { error: 'Method not allowed' });
  } catch (error: any) {
    return send(res, 500, { error: error.message || 'Unexpected error' });
  }
}
