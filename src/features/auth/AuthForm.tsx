'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { LogoMark } from '@/components/brand/LogoMark';
import { api, errorMessage } from '@/lib/api/client';

/** Only same-site paths, so a crafted ?next= cannot send the person to another site after signing in. */
const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/');

/** Sign in or create an account. A new account gets its own empty workspace; the very first one also gets today's data. */
export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await api(signup ? '/auth/signup' : '/auth/login', { body: signup ? { name, email, password } : { email, password } });
      // A full load, so every query starts fresh in the new session.
      window.location.assign(next);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 16, background: 'var(--bg)' }}>
      <form
        className="card"
        style={{ width: '100%', maxWidth: 400 }}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="row" style={{ gap: 10 }}>
          <LogoMark size={32} title="AI Video Studio" />
          <b style={{ fontSize: 18 }}>Video Studio</b>
        </div>
        <div>
          <h1 style={{ fontSize: 24, margin: '8px 0 4px' }}>{signup ? 'Tạo tài khoản' : 'Đăng nhập'}</h1>
          <p className="cap">{signup ? 'Tài khoản mới có một workspace riêng để làm dự án và mời người khác vào.' : 'Đăng nhập để vào workspace của bạn.'}</p>
        </div>
        {signup && (
          <div className="field">
            <label htmlFor="au-name">Tên của bạn</label>
            <input id="au-name" className="input" autoComplete="name" maxLength={80} required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div className="field">
          <label htmlFor="au-email">Email</label>
          <input id="au-email" className="input" type="email" autoComplete="email" required autoFocus={!signup} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="au-pass">Mật khẩu</label>
          <input id="au-pass" className="input" type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 8 : 1} required value={password} onChange={(e) => setPassword(e.target.value)} />
          {signup && <span className="hint">Ít nhất 8 ký tự.</span>}
        </div>
        {error && (
          <div className="alert bad" role="alert">
            {error}
          </div>
        )}
        <button className="btn pri" disabled={busy}>
          {busy ? 'Đang xử lý…' : signup ? 'Tạo tài khoản' : 'Đăng nhập'}
        </button>
        <p className="cap" style={{ textAlign: 'center' }}>
          {signup ? (
            <>
              Đã có tài khoản? <Link href={`/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}>Đăng nhập</Link>
            </>
          ) : (
            <>
              Chưa có tài khoản? <Link href={`/signup${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}>Tạo tài khoản</Link>
            </>
          )}
        </p>
      </form>
    </main>
  );
}
