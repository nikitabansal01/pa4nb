import { useState } from 'react';
import { createPortal } from 'react-dom';
import { LogIn, LogOut, UserPlus, X } from 'lucide-react';
import { useAuth } from '../hooks';
import { getLocalApplications, stripExamples } from '../storage';

export default function AuthPanel() {
  const { user, isAuthenticated, register, login, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const local = getLocalApplications();
      const toMigrate = local ? stripExamples(local) : [];

      if (mode === 'login') {
        await login(email, password, toMigrate);
      } else {
        await register(email, password, toMigrate);
      }

      setOpen(false);
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (isAuthenticated) {
    return (
      <div className="auth-panel auth-panel--signed-in">
        <span className="auth-panel__email">{user.email}</span>
        <button type="button" className="auth-btn auth-btn--ghost" onClick={signOut}>
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="auth-panel">
      <button type="button" className="auth-btn" onClick={() => { setMode('login'); setOpen(true); }}>
        <LogIn size={16} />
        Sign in
      </button>
      <button type="button" className="auth-btn auth-btn--primary" onClick={() => { setMode('register'); setOpen(true); }}>
        <UserPlus size={16} />
        Create account
      </button>

      {open && createPortal(
        <div className="auth-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="auth-title">
            <div className="auth-modal__header">
              <h2 id="auth-title">{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
              <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <p className="auth-modal__hint">
              Optional — your data stays in this browser until you sign in. Any local changes will be moved to your account.
            </p>

            <form onSubmit={handleSubmit} className="auth-form">
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </label>

              {error && <p className="auth-form__error">{error}</p>}

              <button type="submit" className="submit-btn" disabled={busy}>
                {busy ? 'Please wait…' : mode === 'login' ? 'Sign in & save' : 'Create account & save'}
              </button>
            </form>

            <p className="auth-modal__switch">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              {' '}
              <button
                type="button"
                className="auth-link"
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              >
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
