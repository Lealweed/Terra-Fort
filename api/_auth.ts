import { supabaseAdmin } from './_supabaseAdmin.js';

type Req = any;

export async function requireAdmin(req: Req): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (!auth || typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const token = auth.slice(7).trim();
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: 'Invalid token' };

  const role = (data.user.user_metadata as any)?.role || (data.user.app_metadata as any)?.role;
  if (role !== 'admin') return { ok: false, status: 403, error: 'Forbidden' };

  return { ok: true };
}
