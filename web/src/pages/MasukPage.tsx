import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { IconGoogle } from '../components/Icons';

export function MasukPage() {
  const { user, signInWithGoogle, signInWithPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/beranda" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await signInWithPassword(email, password);
      navigate('/beranda', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal masuk.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal masuk dengan Google.');
    }
  }

  return (
    <div className="app-shell">
      <div className="screen screen--no-nav" style={{ paddingTop: 'var(--space-8)' }}>
        <div className="text-center" style={{ marginBottom: 'var(--space-8)' }}>
          <img
            src="/logo-mark.png"
            alt=""
            width={96}
            height={68}
            style={{ marginBottom: 'var(--space-4)' }}
          />
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>TheOnePlanner</h1>
          <p className="caption" style={{ marginTop: 'var(--space-2)' }}>
            Catat keuangan acaramu, rapi dan jelas
          </p>
        </div>

        {error ? (
          <div className="alert alert--danger" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
            {error}
          </div>
        ) : null}

        <button type="button" className="button button--outlined" onClick={handleGoogle}>
          <IconGoogle size={20} />
          Masuk dengan Google
        </button>

        <div className="divider">atau</div>

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

          <label className="field">
            <span className="field__label">Kata sandi</span>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="field__input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: 56 }}
                required
              />
              <button
                type="button"
                className="app-bar__action"
                onClick={() => setShowPassword((value) => !value)}
                style={{ position: 'absolute', right: 0, top: 0, height: '100%' }}
              >
                {showPassword ? 'Sembunyi' : 'Lihat'}
              </button>
            </div>
          </label>

          <div style={{ textAlign: 'right', marginBottom: 'var(--space-4)' }}>
            <Link to="/lupa-sandi" className="caption" style={{ fontWeight: 600 }}>
              Lupa kata sandi?
            </Link>
          </div>

          <button type="submit" className="button button--primary" disabled={submitting}>
            {submitting ? <span className="spinner" /> : 'Masuk'}
          </button>
        </form>

        <p className="text-center" style={{ marginTop: 'var(--space-5)' }}>
          <span className="caption">Belum punya akun? </span>
          <Link to="/daftar" style={{ fontWeight: 600 }}>
            Daftar
          </Link>
        </p>

        <p className="text-center muted-note" style={{ marginTop: 'var(--space-6)' }}>
          Data kamu privat dan tidak dibagikan ke siapa pun.
        </p>
      </div>
    </div>
  );
}
