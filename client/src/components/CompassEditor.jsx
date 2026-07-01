import { WORKVIEW_PROMPTS, LIFEVIEW_PROMPTS } from '../lifeDesign';

function CompassField({ id, label, description, prompts, value, onChange }) {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="compass-field">
      <div className="compass-field__header">
        <div>
          <h3>{label}</h3>
          <p>{description}</p>
        </div>
        <span className={`compass-field__count ${wordCount >= 200 ? 'compass-field__count--good' : ''}`}>
          {wordCount} / ~250 words
        </span>
      </div>
      <ul className="compass-field__prompts">
        {prompts.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <textarea
        id={id}
        className="compass-field__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write freely — pen-and-paper energy. Save happens automatically."
        rows={10}
      />
    </div>
  );
}

export default function CompassEditor({ data, onWorkviewChange, onLifeviewChange, workviewOnly = false }) {
  return (
    <section className="compass-editor ui-stack">
      {!workviewOnly && (
        <header className="ui-section ui-section--header life-overview__intro">
          <h2>Your compass</h2>
          <p>
            Direction, not destination. When Workview and Lifeview align, you have coherence —
            who you are, what you believe, and what you&apos;re doing connect.
          </p>
        </header>
      )}

      <div className="ui-block">
        <CompassField
        id="workview"
        label="Workview"
        description="Your philosophy of work. Career lives here — this is the north star for everything in the Work area."
        prompts={WORKVIEW_PROMPTS}
        value={data.workview}
        onChange={onWorkviewChange}
      />
      </div>

      {!workviewOnly && (
        <div className="ui-block">
          <CompassField
          id="lifeview"
          label="Lifeview"
          description="Your philosophy of life — meaning, values, and what matters beyond any single job."
          prompts={LIFEVIEW_PROMPTS}
          value={data.lifeview}
          onChange={onLifeviewChange}
        />
        </div>
      )}
    </section>
  );
}
