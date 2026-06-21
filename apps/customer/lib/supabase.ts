/**
 * Supabase client for the Customer app.
 *
 * For Expo, public keys are read from app config / env at build time.
 * We keep a DEMO_MODE flag: if the keys are not set, the app uses local
 * demo data so you can test the full UI without a backend.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// These get filled from EXPO_PUBLIC_* env vars (set in .env / EAS secrets).
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const DEMO_MODE = !SUPABASE_URL || !SUPABASE_ANON_KEY;

export const supabase = DEMO_MODE
  ? (null as any)
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
