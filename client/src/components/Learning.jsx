import { useMemo, useState } from 'react';
import {
  Target,
  TriangleAlert,
  ListChecks,
  Trophy,
  ArrowRight,
} from 'lucide-react';
import {
  getLearningPlanStatuses,
  getPracticedQuestions,
  saveLearningPlanStatuses,
} from '../storage';
import {
  buildLearningPlan,
  getCurrentLearningFocus,
  getInterviewDrivenGaps,
  getLearningEvidence,
  LEARNING_STATUS_LABELS,
} from '../utils/learningHub';
import EmptyState from './EmptyState';

export default function Learning({ applications = [], profile = null, direction: directionProp, onNavigate }) {
  const direction = directionProp || null;
  const practiced = useMemo(() => getPracticedQuestions(), [applications, profile]);
  const [statuses, setStatuses] = useState(() => getLearningPlanStatuses());

  const focus = useMemo(
    () => getCurrentLearningFocus(profile || direction),
    [profile, direction]
  );
  const gaps = useMemo(
    () => getInterviewDrivenGaps(applications, profile),
    [applications, profile]
  );
  const plan = useMemo(
    () => buildLearningPlan(applications, profile || direction, statuses),
    [applications, profile, direction, statuses]
  );
  const evidence = useMemo(
    () => getLearningEvidence(applications, practiced, plan),
    [applications, practiced, plan]
  );

  const setStatus = (id, status) => {
    const next = { ...statuses, [id]: status };
    setStatuses(next);
    saveLearningPlanStatuses(next);
  };

  return (
    <section className="learning-hub page-section">
      <header className="ui-section ui-section--header learning-hub__intro">
        <h2>Learning</h2>
        <p>
          Practice tied to <strong>{focus.path}</strong> and your active interviews — not a course catalog.
        </p>
      </header>

      <div className="learning-hub__grid">
        <article className="os-card learning-hub__card learning-hub__card--focus">
          <div className="os-card__header learning-hub__section-head">
            <Target size={18} />
            <div>
              <h3>Current focus</h3>
              <p>{focus.summary}</p>
            </div>
          </div>

          <div className="learning-focus__path">
            <span className="ui-block__label">Selected career path</span>
            <strong>{focus.path}</strong>
          </div>

          <ul className="learning-focus__areas">
            {focus.focusAreas.map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>

          <p className="learning-focus__action">
            <span>Next</span>
            {focus.nextAction}
          </p>

          <button
            type="button"
            className="auth-btn auth-btn--primary"
            onClick={() => onNavigate?.('direction')}
          >
            {focus.isMockPath ? 'Choose a path' : 'Update direction'}
            <ArrowRight size={14} />
          </button>
        </article>

        <article className="os-card learning-hub__card">
          <div className="os-card__header learning-hub__section-head">
            <TriangleAlert size={18} />
            <div>
              <h3>Interview-driven gaps</h3>
              <p>From active loops, study topics, and post-interview reflections</p>
            </div>
          </div>

          {gaps.length === 0 ? (
            <EmptyState
              compact
              title="No interview gaps yet"
              body="Gaps appear after you prep for loops or log what felt hard in Notes and Reflection."
              actionLabel="Open interview prep"
              onAction={() => onNavigate?.('interview')}
            />
          ) : (
            <ul className="learning-gap-list">
              {gaps.map((gap) => (
                <li key={gap.id}>
                  <strong>{gap.topic}</strong>
                  <p>{gap.reason}</p>
                  <span>{gap.source}{gap.company ? ` · ${gap.company}` : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <section className="os-card learning-hub__card">
        <div className="os-card__header learning-hub__section-head">
          <ListChecks size={18} />
          <div>
            <h3>Learning plan</h3>
            <p>Short, personalized drills you can complete before interviews</p>
          </div>
        </div>

        {plan.length === 0 ? (
          <EmptyState
            compact
            title="No learning plan yet"
            body="Choose a career path or add interview prep topics to generate personalized drills."
            actionLabel="Career Direction"
            onAction={() => onNavigate?.('direction')}
          />
        ) : (
          <div className="learning-plan-list">
            {plan.map((item) => (
              <article key={item.id} className="learning-plan-item">
                <div className="learning-plan-item__top">
                  <div>
                    <h4>{item.topic}</h4>
                    <span className="learning-plan-item__origin">{item.origin}</span>
                  </div>
                  <select
                    className="company-table__input"
                    value={item.status}
                    onChange={(e) => setStatus(item.id, e.target.value)}
                    aria-label={`Status for ${item.topic}`}
                  >
                    {Object.entries(LEARNING_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <dl className="learning-plan-item__facts">
                  <div>
                    <dt>Why it matters</dt>
                    <dd>{item.why}</dd>
                  </div>
                  <div>
                    <dt>Estimated time</dt>
                    <dd>{item.time}</dd>
                  </div>
                  <div>
                    <dt>Suggested exercise</dt>
                    <dd>{item.exercise}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="os-card learning-hub__card">
        <div className="os-card__header learning-hub__section-head">
          <Trophy size={18} />
          <div>
            <h3>Evidence of progress</h3>
            <p>Proof from exercises, practice, and real interviews</p>
          </div>
        </div>

        <div className="learning-evidence-grid">
          <div>
            <h4>Completed exercises</h4>
            <ul className="learning-evidence-list">
              {evidence.completedExercises.map((item) => (
                <li key={item.id} className={item.empty ? 'is-empty' : ''}>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Improved interview answers</h4>
            <ul className="learning-evidence-list">
              {evidence.improvedAnswers.map((item) => (
                <li key={item.id} className={item.empty ? 'is-empty' : ''}>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Topics used in real interviews</h4>
            <ul className="learning-evidence-list">
              {evidence.topicsUsed.map((item) => (
                <li key={item.id} className={item.empty ? 'is-empty' : ''}>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </section>
  );
}
