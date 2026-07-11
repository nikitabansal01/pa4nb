import ApplicationCard from './ApplicationCard';

export default function Dashboard({ applications, labels = [], onUpdate }) {
  const active = applications.filter((a) => !['rejected', 'withdrawn'].includes(a.status));
  const closed = applications.filter((a) => ['rejected', 'withdrawn'].includes(a.status));

  return (
    <section className="dashboard dashboard--list-first">
      <div className="dashboard__grid">
        {active.length === 0 ? (
          <div className="empty-state">
            <p>No applications yet.</p>
            <p>Do a voice dump above to add your first one.</p>
          </div>
        ) : (
          active.map((app) => (
            <ApplicationCard key={app.id} app={app} labels={labels} onUpdate={onUpdate} />
          ))
        )}
      </div>

      {closed.length > 0 && (
        <details className="dashboard__closed">
          <summary className="dashboard__closed-summary">
            Closed <span className="dashboard__closed-count">{closed.length}</span>
          </summary>
          <div className="dashboard__grid dashboard__grid--muted">
            {closed.map((app) => (
              <ApplicationCard key={app.id} app={app} labels={labels} onUpdate={onUpdate} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
