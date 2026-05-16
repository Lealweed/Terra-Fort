type VercelRequest = any;
type VercelResponse = any;
import { handleSupportIntake } from './_supportIntake.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await handleSupportIntake(req.body || {});
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to create support intake' });
  }
}
