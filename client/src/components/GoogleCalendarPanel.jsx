import { useEffect, useState } from 'react';
import { Calendar, Link2, Unlink, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks';
import { authHeaders } from '../storage';

function formatEventWhen(start) {
  if (!start) return 'No time';
  const date = new Date(start);
  if (Number.isNaN(date.getTime())) return start;
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function GoogleCalendarPanel({ enabled = true }) {
  const { isAuthenticated, getToken } = useAuth();
  const [status, setStatus] = useState({ configured: false, connected: false });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const loadStatus = async () => {
    if (!isAuthenticated || !enabled) return;
    try {
      setError(null);
      const res = await fetch('/api/google/status', {
        headers: await authHeaders(getToken),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to check Google status');
      setStatus(data);
      return data;
    } catch (e) {
      setError(e.message);
      return null;
    }
  };

  const loadEvents = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/google/events', {
        headers: await authHeaders(getToken),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load calendar events');
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (e) {
      setError(e.message);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const google = params.get('google');
    if (google === 'connected') {
      setMessage('Google Calendar connected.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (google === 'error') {
      setError(params.get('reason') || 'Google connection failed');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !enabled) return;
    (async () => {
      const next = await loadStatus();
      if (next?.connected) await loadEvents();
    })();
  }, [isAuthenticated, enabled]);

  if (!enabled || !isAuthenticated) return null;

  const connect = async () => {
    try {
      setBusy(true);
      setError(null);
      const res = await fetch('/api/google/connect', {
        headers: await authHeaders(getToken),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to start Google connect');
      if (!data.url) throw new Error('Google connect URL missing');
      window.location.href = data.url;
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const disconnect = async () => {
    try {
      setBusy(true);
      setError(null);
      const res = await fetch('/api/google/disconnect', {
        method: 'DELETE',
        headers: await authHeaders(getToken),
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to disconnect Google');
      }
      setStatus({ configured: true, connected: false });
      setEvents([]);
      setMessage('Google Calendar disconnected.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!status.configured) {
    return (
      <section className="google-cal-panel google-cal-panel--muted">
        <div className="google-cal-panel__head">
          <Calendar size={16} />
          <h3>Google Calendar</h3>
        </div>
        <p>Add Google OAuth env vars on the server to enable calendar sync.</p>
      </section>
    );
  }

  return (
    <section className="google-cal-panel">
      <div className="google-cal-panel__head">
        <Calendar size={16} />
        <h3>Google Calendar</h3>
        <span className={`google-cal-panel__badge ${status.connected ? 'is-on' : ''}`}>
          {status.connected ? 'Connected' : 'Not connected'}
        </span>
      </div>

      <p className="google-cal-panel__hint">
        Read-only access to upcoming events. Nothing updates your pipeline until you approve it later.
      </p>

      <div className="google-cal-panel__actions">
        {!status.connected ? (
          <button type="button" className="auth-btn auth-btn--primary" onClick={connect} disabled={busy}>
            <Link2 size={15} />
            Connect Google Calendar
          </button>
        ) : (
          <>
            <button type="button" className="auth-btn" onClick={loadEvents} disabled={loading || busy}>
              <RefreshCw size={15} />
              Refresh events
            </button>
            <button type="button" className="auth-btn auth-btn--ghost" onClick={disconnect} disabled={busy}>
              <Unlink size={15} />
              Disconnect
            </button>
          </>
        )}
      </div>

      {message && <p className="google-cal-panel__msg">{message}</p>}
      {error && <p className="google-cal-panel__error">{error}</p>}

      {status.connected && (
        <div className="google-cal-panel__events">
          {loading ? (
            <p className="google-cal-panel__empty">Loading events…</p>
          ) : events.length === 0 ? (
            <p className="google-cal-panel__empty">No events in the next 3 weeks.</p>
          ) : (
            <ul>
              {events.slice(0, 12).map((event) => (
                <li key={event.id}>
                  <strong>{event.title}</strong>
                  <span>{formatEventWhen(event.start)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
