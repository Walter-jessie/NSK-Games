import { createClient } from '@supabase/supabase-js';
import config from './supabase.json';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || config.supabase_url;
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || config.supabase_anon_key;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
