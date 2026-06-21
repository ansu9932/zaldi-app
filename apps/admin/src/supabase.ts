import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const DEMO_MODE = !url || !anon;
export const supabase = DEMO_MODE ? (null as any) : createClient(url, anon);
