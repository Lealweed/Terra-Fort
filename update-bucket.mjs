import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
  const BUCKET_NAME = 'products';
  
  console.log(`Atualizando limite de tamanho do bucket '${BUCKET_NAME}' para 50MB...`);
  
  const { error: updateError } = await supabase.storage.updateBucket(BUCKET_NAME, {
    public: true,
    fileSizeLimit: 52428800, // 50MB em bytes
  });
  
  if (updateError) {
    console.error('Erro ao atualizar bucket:', updateError);
    return;
  }
  
  console.log('Limite do Bucket expandido com sucesso!');
}

setup();
