import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AppBar } from '../components/AppBar';
import { IconAlert } from '../components/Icons';
import { supabase } from '../lib/supabase';

/**
 * Kirim tautan atur ulang kata sandi lewat Supabase Auth.
 * Aplikasi ini tidak pernah memegang kata sandi — Supabase yang mengurusnya.
 */
export function LupaSandiPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/masuk`,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal mengirim tautan.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <AppBar title="Lupa kata sandi" back backTo="/masuk" />

      <div className="screen screen--no-nav">
        {sent ? (
          <div className="alert alert--success" role="status">
            <span>
              Kalau email itu terdaftar, kami sudah mengirim tautan atur ulang. Cek kotak masukmu.
            </span>
          </div>
        ) : (
          <>
            <p className="caption" style={{ marginBottom: 'var(--space-5)' }}>
              Masukkan email akunmu. Kami akan mengirim tautan untuk mengatur ulang kata sandi.
            </p>

            {error ? (
              <div className="alert alert--danger" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
                <IconAlert size={16} />
                <span>{error}</span>
              </div>
            ) : null}

            <form onSubmit={handleSubmit}>
              <label className="field">
                <span className="field__label">Email</span>
                <input
                  type="email"
                  className="field__input"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </label>

              <button type="submit" className="button button--primary" disabled={submitting}>
                {submitting ? <span className="spinner" /> : 'Kirim tautan'}
              </button>
            </form>
          </>
        )}

        <p className="text-center" style={{ marginTop: 'var(--space-5)' }}>
          <Link to="/masuk" style={{ fontWeight: 600 }}>
            Kembali ke masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
