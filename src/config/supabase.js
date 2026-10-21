import { createClient } from '@supabase/supabase-js';
import config from './supabase.json';

export const supabase = createClient(
  config.supabase_url,
  config.supabase_anon_key
);

export default supabase;
