import './_env.js';
type Req = any;

function readHeader(req: Req, key: string): string | undefined {
  const value = req.headers?.[key] || req.headers?.[key.toLowerCase()] || req.headers?.[key.toUpperCase()];
  return typeof value === 'string' ? value : undefined;
}

export function requireIntegrationAccess(req: Req): { ok: true } | { ok: false; status: number; error: string } {
  const sharedSecret = process.env.N8N_SHARED_SECRET || process.env.AGENT_API_KEY;
  if (!sharedSecret) {
    return { ok: false, status: 500, error: 'Missing N8N_SHARED_SECRET or AGENT_API_KEY' };
  }

  const authorization = readHeader(req, 'authorization');
  const integrationKey = readHeader(req, 'x-integration-key');
  const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : undefined;
  const token = integrationKey || bearer;

  if (!token) {
    return { ok: false, status: 401, error: 'Unauthorized integration request' };
  }

  if (token !== sharedSecret) {
    return { ok: false, status: 403, error: 'Invalid integration key' };
  }

  return { ok: true };
}