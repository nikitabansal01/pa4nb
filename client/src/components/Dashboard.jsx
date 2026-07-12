import ApplicationCard from './ApplicationCard';
import EmptyState from './EmptyState';

export default function Dashboard({ applications, labels = [], onUpdate, onOpenCompany }) {
  const active = applications.filter((a) => !['rejected', 'withdrawn'].includes(a.status));
  const closed = applications.filter((a) => ['rejected', 'withdrawn'].includes(a.status));

  return (
    <section className="dashboard dashboard--list-first">
      <div className="dashboard__grid">
        {active.length === 0 ? (
          <EmptyState
            title="No opportunities yet"
            body="Use a voice update above to add your first company, or reset example data from settings."
          />
        ) : (
          active.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              labels={labels}
              onUpdate={onUpdate}
              onOpen={() => onOpenCompany?.(app.id)}
            />
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
              <ApplicationCard
                key={app.id}
                app={app}
                labels={labels}
                onUpdate={onUpdate}
                onOpen={() => onOpenCompany?.(app.id)}
              />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
