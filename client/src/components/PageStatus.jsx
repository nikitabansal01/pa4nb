import { Loader2, AlertCircle } from 'lucide-react';

export function PageLoading({ label = 'Loading…' }) {
  return (
    <div className="page-status page-status--loading" role="status" aria-live="polite">
      <Loader2 size={18} className="spin" />
      <span>{label}</span>
    </div>
  );
}

export function PageError({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="error-banner page-status page-status--error" role="alert">
      <AlertCircle size={16} />
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="auth-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
