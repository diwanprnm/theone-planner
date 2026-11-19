import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AppBar } from '../components/AppBar';
import { IconAlert } from '../components/Icons';

export function DaftarPage() {
  const { user, signUp } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/beranda" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Kata sandi minimal 8 karakter');
      return;
    }

    if (password !== confirm) {
      setError('Ulangi kata sandi belum cocok');
      return;
    }

    if (!agreed) {
      setError('Centang persetujuan penyimpanan data untuk melanjutkan');
      return;
    }

    setSubmitting(true);
    try {
      const result = await signUp(name, email, password);
      if (result.needsConfirmation) {
        setInfo('Cek emailmu untuk mengonfirmasi akun, lalu masuk.');
      } else {
        navigate('/beranda', { replace: true });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal membuat akun.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell">
      <AppBar title="Buat akun" back backTo="/masuk" />

      <div className="screen screen--no-nav">
        <p className="caption" style={{ marginBottom: 'var(--space-5)' }}>
          Satu akun untuk semua acaramu
        </p>

        {error ? (
          <div className="alert alert--danger" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
            <IconAlert size={16} />
            <span>{error}</span>
          </div>
        ) : null}

        {info ? (
          <div className="alert alert--success" role="status" style={{ marginBottom: 'var(--space-4)' }}>
            <span>{info}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">Nama</span>
            <input
              className="field__input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
          </label>

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
            <input
              type="password"
              className="field__input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
            <span className="field__hint">Minimal 8 karakter</span>
          </label>

          <label className="field">
            <span className="field__label">Ulangi kata sandi</span>
            <input
              type="password"
              className="field__input"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <label
            className="row row--start"
            style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-5)', cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              style={{ width: 20, height: 20, marginTop: 2, accentColor: 'var(--color-primary)' }}
            />
            <span className="caption">
              Saya setuju data saya disimpan untuk menjalankan aplikasi ini.
            </span>
          </label>

          <button type="submit" className="button button--primary" disabled={submitting}>
            {submitting ? <span className="spinner" /> : 'Buat akun'}
          </button>
        </form>

        <p className="text-center" style={{ marginTop: 'var(--space-5)' }}>
          <span className="caption">Sudah punya akun? </span>
          <Link to="/masuk" style={{ fontWeight: 600 }}>
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
