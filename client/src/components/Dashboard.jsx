import ApplicationCard from './ApplicationCard';
import { STATUS_COLORS } from '../constants';
import { getPipelineOverviewStats } from '../utils/pipelineStats';

const OVERVIEW_STATS = [
  {
    key: 'applied',
    label: 'Applied',
    hint: 'Unique companies',
    color: STATUS_COLORS.applied,
    alwaysShow: true,
  },
  {
    key: 'recruiterCall',
    label: 'Recruiter / phone',
    hint: 'Initial screen stage',
    color: STATUS_COLORS.recruiter_screen,
  },
  {
    key: 'hiringManager',
    label: 'Hiring manager',
    hint: 'Manager round in progress',
    color: STATUS_COLORS.phone_screen,
  },
  {
    key: 'takeHomeOrOnsite',
    label: 'Take-home / onsite',
    hint: 'Assignment or onsite rounds',
    color: STATUS_COLORS.interview_scheduled,
  },
  {
    key: 'interviewDone',
    label: 'Interview done',
    hint: 'Completed take-home or onsite round',
    color: STATUS_COLORS.interview_completed,
  },
  {
    key: 'rejected',
    label: 'Rejected',
    color: STATUS_COLORS.rejected,
  },
  {
    key: 'offer',
    label: 'Offer',
    color: STATUS_COLORS.offer,
  },
];

export default function Dashboard({ applications }) {
  const active = applications.filter((a) => !['rejected', 'withdrawn'].includes(a.status));
  const closed = applications.filter((a) => ['rejected', 'withdrawn'].includes(a.status));
  const stats = getPipelineOverviewStats(applications);
  const actionItems = applications.filter((a) => a.needsFollowUp || a.needsPrep);

  return (
    <section className="dashboard">
      <header className="dashboard__header">
        <h2 className="dashboard__title">Pipeline</h2>
        <p className="dashboard__subtitle">Your active job applications at a glance</p>
      </header>

      <div className="dashboard__block dashboard__block--stats">
        <h3 className="dashboard__block-label">Status overview</h3>
        <p className="dashboard__stats-note">
          Applied counts every unique company in your pipeline — one per employer, regardless of stage.
        </p>
        <div className="stats-row">
          {OVERVIEW_STATS.map(({ key, label, hint, color, alwaysShow }) => {
            const count = stats[key] || 0;
            if (!count && !alwaysShow) return null;

            return (
              <div
                key={key}
                className="stat-pill"
                style={{ '--pill-color': color }}
                title={hint}
              >
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
