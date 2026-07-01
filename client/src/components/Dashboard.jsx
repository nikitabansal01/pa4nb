import ApplicationCard from './ApplicationCard';
import { STATUS_LABELS, STATUS_COLORS } from '../constants';

export default function Dashboard({ applications }) {
  const active = applications.filter((a) => !['rejected', 'withdrawn'].includes(a.status));
  const closed = applications.filter((a) => ['rejected', 'withdrawn'].includes(a.status));

  const counts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  const actionItems = applications.filter((a) => a.needsFollowUp || a.needsPrep);

  return (
    <section className="dashboard">
      <header className="dashboard__header">
        <h2 className="dashboard__title">Pipeline</h2>
        <p className="dashboard__subtitle">Your active job applications at a glance</p>
      </header>

      <div className="dashboard__block dashboard__block--stats">
        <h3 className="dashboard__block-label">Status overview</h3>
        <div className="stats-row">
          {Object.entries(STATUS_LABELS).map(([key, label]) => {
            const count = counts[key] || 0;
            if (!count && !['applied', 'interview_scheduled', 'offer'].includes(key)) return null;
            const color = STATUS_COLORS[key];
            return (
              <div key={key} className="stat-pill" style={{ '--pill-color': color }}>
                <span className="stat-pill__count">{count}</span>
                <span className="stat-pill__label">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {actionItems.length > 0 && (
        <div className="dashboard__block dashboard__block--attention">
          <h3 className="dashboard__block-label">Needs attention</h3>
          <div className="action-banner">
            <strong>{actionItems.length} need your attention</strong>
            <span>{actionItems.map((a) => a.company).join(' · ')}</span>
          </div>
        </div>
      )}

      <div className="dashboard__block dashboard__block--cards">
        <h3 className="dashboard__block-label">Companies</h3>
        <div className="dashboard__grid">
          {active.length === 0 ? (
            <div className="empty-state">
              <p>No applications yet.</p>
              <p>Do a voice dump above to add your first one.</p>
            </div>
          ) : (
            active.map((app) => <ApplicationCard key={app.id} app={app} />)
          )}
        </div>
      </div>

      {closed.length > 0 && (
        <div className="dashboard__block dashboard__block--closed">
          <h3 className="dashboard__section-title">Closed</h3>
          <div className="dashboard__grid dashboard__grid--muted">
            {closed.map((app) => (
              <ApplicationCard key={app.id} app={app} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
