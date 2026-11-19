import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { clearAllLocalData } from '../lib/db';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** True sampai sesi tersimpan selesai dibaca — cegah kedipan ke layar Masuk. */
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  /** Menghapus akun permanen di server, lalu membersihkan sesi dan data lokal. */
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,

      async signInWithGoogle() {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        });
        if (error) {
          throw new Error(error.message);
        }
      },

      async signInWithPassword(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw new Error(terjemahkanGalat(error.message));
        }
      },

      async signUp(name, email, password) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) {
          throw new Error(terjemahkanGalat(error.message));
        }

        // Supabase mengembalikan user tanpa session bila konfirmasi email aktif.
        return { needsConfirmation: !data.session };
      },

      async signOut() {
        await supabase.auth.signOut();
        // Data lokal ikut dibersihkan supaya Pengguna berikutnya tidak
        // melihat cache milik Pengguna sebelumnya.
        await clearAllLocalData();
      },

      async deleteAccount() {
        // Penghapusan dilakukan di server (backend memakai service role untuk
        // menghapus akun Auth sekaligus seluruh baris datanya).
        await api.delete('/account');

        // Setelah akun dihapus, token yang tersimpan sudah tidak berarti.
        // `scope: 'local'` membersihkan sesi tanpa memanggil server — server
        // akan menolak token milik akun yang baru saja dihapus.
        await supabase.auth.signOut({ scope: 'local' });
        await clearAllLocalData();
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth harus dipakai di dalam AuthProvider');
  }

  return context;
}

/** Pesan Supabase berbahasa Inggris — diterjemahkan agar konsisten. */
function terjemahkanGalat(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'Email atau kata sandi salah.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Email belum dikonfirmasi. Cek kotak masukmu.';
  }
  if (normalized.includes('already registered') || normalized.includes('already been registered')) {
    return 'Email sudah terdaftar';
  }
  if (normalized.includes('password should be at least')) {
    return 'Kata sandi minimal 8 karakter';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many')) {
    return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  }

  return message;
}
