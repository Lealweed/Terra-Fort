import { config } from 'dotenv';

let loaded = false;

export function loadServerEnv() {
  if (loaded) return;
  loaded = true;

  config({ path: '.env.local', override: false });
  config({ path: '.env', override: false });
}

loadServerEnv();
