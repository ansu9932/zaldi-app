import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, DEMO_MODE } from './supabase';

export interface Session {
  id: string;
  name: string;
  role: string;
}

interface AuthState {
  session: Session | null;
  setSession: (s: Session) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (s) => set({ session: s }),
      logout: () => set({ session: null }),
    }),
    { name: 'next-rider-auth', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export async function signIn(username: string, password: string): Promise<{ ok: boolean; session?: Session; error?: string }> {
  if (DEMO_MODE) {
    if (username === 'demo' && password === 'demo') {
      return { ok: true, session: { id: 'demo', name: 'Demo Rider', role: 'rider' } };
    }
    return { ok: false, error: 'Not connected. Use demo / demo, or add the app .env.' };
  }
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('username', username.trim())
    .eq('password', password)
    .eq('role', 'rider')
    .eq('active', true)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'Invalid username or password' };
  return { ok: true, session: { id: data.id, name: data.name, role: 'rider' } };
}
