import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  const { data: { users }, error: uErr } = await supabase.auth.admin.listUsers();
  if (uErr) {
    console.error('Error fetching users:', uErr.message);
    return;
  }
  
  const user = users.find(u => u.email === 'adm@terrafort.com');
  if (!user) {
    console.error('User adm@terrafort.com not found');
    return;
  }
  
  const { error } = await supabase.auth.admin.updateUserById(user.id, { 
    user_metadata: { role: 'admin' },
    app_metadata: { role: 'admin' }
  });
  
  if (error) {
    console.error('Error updating user:', error.message);
  } else {
    console.log('Fixed role for', user.email, '-> admin');
  }
}
fix();
