import { useEffect, useMemo, useState } from 'react';
import { Calendar, Link2, Unlink, RefreshCw, Check } from 'lucide-react';
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

const SECTION_META = {
  update_existing: {
    title: 'Updates to companies you already track',
    hint: 'Interview progress on existing pipeline companies. Selected by default.',
  },
  create_new: {
    title: 'Possible new companies',
    hint: 'Looks like interviews with employers not yet on your dashboard. Off by default.',
  },
  filtered_out: {
    title: 'Filtered out / not auto-suggested',
    hint: 'Tasks, prep, ambiguous, or already-up-to-date events. Turn on any you still want to add.',
  },
};

export default function GoogleCalendarPanel({ enabled = true, applications = [], onSynced }) {
  const { isAuthenticated, getToken } = useAuth();
  const [status, setStatus] = useState({ configured: false, connected: false });
  const [proposals, setProposals] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [classifier, setClassifier] = useState(null);

  const sections = useMemo(() => {
    const grouped = {
      update_existing: [],
      create_new: [],
      filtered_out: [],
    };
    for (const proposal of proposals) {
      const key = grouped[proposal.category] ? proposal.category : 'filtered_out';
      grouped[key].push(proposal);
    }
    return grouped;
  }, [proposals]);

  const selectedCount = selectedIds.size;

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

  const previewCalendar = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const res = await fetch('/api/google/preview', {
        method: 'POST',
        headers: await authHeaders(getToken),
        body: JSON.stringify({ existingApplications: applications }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to review calendar');

      const next = Array.isArray(data.proposals) ? data.proposals : [];
      setProposals(next);
      setSelectedIds(new Set(next.filter((p) => p.defaultSelected).map((p) => p.id)));
      setClassifier(data.classifier || null);

      const counts = data.counts || {};
      if (next.length === 0) {
        setMessage('No interview-related events found in this window.');
      } else {
        setMessage(
          `Review ready [${data.classifier === 'llm' ? 'LLM' : 'heuristic'}]: ${counts.updateExisting || 0} existing updates, ${counts.createNew || 0} possible new companies, ${counts.filteredOut || 0} filtered out. Nothing written yet.`
        );
      }
    } catch (e) {
      setError(e.message);
      setProposals([]);
      setSelectedIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  const applySelected = async () => {
    if (!isAuthenticated || selectedCount === 0) return;
    try {
      setApplying(true);
      setError(null);
      const selected = proposals.filter((p) => selectedIds.has(p.id));
      const res = await fetch('/api/google/apply', {
        method: 'POST',
        headers: await authHeaders(getToken),
        body: JSON.stringify({
          existingApplications: applications,
          proposals: selected,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to apply calendar choices');

      if (Array.isArray(data.applications) && onSynced) {
        onSynced(data.applications);
      }

      setMessage(
        `Applied ${data.updatedCount || 0} update${(data.updatedCount || 0) === 1 ? '' : 's'} and ${data.createdCount || 0} new compan${(data.createdCount || 0) === 1 ? 'y' : 'ies'} to your dashboard.`
      );
      setProposals([]);
      setSelectedIds(new Set());
    } catch (e) {
      setError(e.message);
    } finally {
      setApplying(false);
    }
  };

  const toggleProposal = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setSectionSelected = (category, on) => {
    const ids = sections[category].map((p) => p.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const google = params.get('google');
    if (google === 'connected') {
      setMessage('Google Calendar connected. Review events before anything hits your dashboard.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (google === 'error') {
      setError(params.get('reason') || 'Google connection failed');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !enabled) return;
    loadStatus();
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
      setProposals([]);
      setSelectedIds(new Set());
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
        <p>
          {error
            ? `Could not reach the calendar API (${error}). Restart the local server with npm run dev.`
            : 'Server is running without Google OAuth env vars. Restart npm run dev after saving GOOGLE_CLIENT_ID / SECRET / REDIRECT_URI in .env.'}
        </p>
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
        Use calendar to check progress on companies you already track, and optionally catch interviews
        with new employers. Nothing is written until you choose what to apply.
      </p>

      <div className="google-cal-panel__actions">
        {!status.connected ? (
          <button type="button" className="auth-btn auth-btn--primary" onClick={connect} disabled={busy}>
            <Link2 size={15} />
            Connect Google Calendar
          </button>
        ) : (
          <>
            <button
              type="button"
              className="auth-btn auth-btn--primary"
              onClick={previewCalendar}
              disabled={loading || busy || applying}
            >
              <RefreshCw size={15} />
              {loading ? 'Reviewing…' : 'Review calendar'}
            </button>
            <button
              type="button"
              className="auth-btn auth-btn--primary"
              onClick={applySelected}
              disabled={loading || busy || applying || selectedCount === 0}
            >
              <Check size={15} />
              {applying ? 'Applying…' : `Apply selected (${selectedCount})`}
            </button>
            <button type="button" className="auth-btn auth-btn--ghost" onClick={disconnect} disabled={busy || applying}>
              <Unlink size={15} />
              Disconnect
            </button>
          </>
        )}
      </div>

      {message && <p className="google-cal-panel__msg">{message}</p>}
      {error && <p className="google-cal-panel__error">{error}</p>}

      {status.connected && proposals.length > 0 && (
        <div className="google-cal-panel__review">
          {['update_existing', 'create_new', 'filtered_out'].map((category) => {
            const items = sections[category];
            if (!items.length) return null;
            const meta = SECTION_META[category];
            const selectedInSection = items.filter((p) => selectedIds.has(p.id)).length;
            return (
              <div key={category} className={`google-cal-panel__section google-cal-panel__section--${category}`}>
                <div className="google-cal-panel__section-head">
                  <div>
                    <p className="google-cal-panel__empty">{meta.title}</p>
                    <p className="google-cal-panel__section-hint">{meta.hint}</p>
                  </div>
                  <div className="google-cal-panel__section-actions">
                    <button type="button" className="google-cal-panel__mini" onClick={() => setSectionSelected(category, true)}>
                      All
                    </button>
                    <button type="button" className="google-cal-panel__mini" onClick={() => setSectionSelected(category, false)}>
                      None
                    </button>
                    <span className="google-cal-panel__section-count">
                      {selectedInSection}/{items.length}
                    </span>
                  </div>
                </div>
                <ul>
                  {items.map((proposal) => {
                    const canApply = proposal.kind !== 'filtered_info' && (proposal.application || proposal.patch);
                    return (
                    <li key={proposal.id}>
                      <label className={`google-cal-panel__choice ${!canApply ? 'is-disabled' : ''}`}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(proposal.id)}
                          disabled={!canApply}
                          onChange={() => toggleProposal(proposal.id)}
                        />
                        <span className="google-cal-panel__choice-body">
                          <strong>{proposal.eventTitle || proposal.company}</strong>
                          <span>{formatEventWhen(proposal.eventStart)}</span>
                          <em className="google-cal-panel__match">{proposal.summary}</em>
                        </span>
                      </label>
                    </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {classifier && (
            <p className="google-cal-panel__empty">
              Classifier: {classifier === 'llm' ? 'LLM' : 'heuristic'}
            </p>
          )}
        </div>
      )}

      {status.connected && !loading && proposals.length === 0 && (
        <p className="google-cal-panel__empty">
          Click Review calendar to pull interview events and choose what lands on your dashboard.
        </p>
      )}
    </section>
  );
}
