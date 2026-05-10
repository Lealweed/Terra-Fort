type VercelRequest = any;
type VercelResponse = any;
import { buildAgentContext } from './_agentContext.js';
import { requireIntegrationAccess } from './_integrationAuth.js';

function readInput(req: VercelRequest) {
  const input = req.method === 'GET' ? req.query || {} : req.body || {};
  return {
    phone: typeof input.phone === 'string' ? input.phone : undefined,
    email: typeof input.email === 'string' ? input.email : undefined,
    orderCode: typeof input.orderCode === 'string' ? input.orderCode : undefined,
    productQuery: typeof input.productQuery === 'string' ? input.productQuery : undefined,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = requireIntegrationAccess(req);
  if (auth.ok === false) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    const context = await buildAgentContext(readInput(req));
    return res.status(200).json(context);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to build agent context' });
  }
}