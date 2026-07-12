import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload,
  Link2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  FileText,
  Star,
  Bookmark,
  MessageCircle,
  SlidersHorizontal,
  RefreshCw,
  X,
  ArrowRight,
} from 'lucide-react';
import {
  EMPTY_SNAPSHOT,
  MOCK_RESUME_SNAPSHOT,
  MOCK_LINKEDIN_SNAPSHOT,
  REFLECTION_QUESTIONS,
  SNAPSHOT_FIELDS,
  ASSUMPTION_FIELDS,
  buildAssumptionsFromAnswers,
  buildCareerPaths,
  buildResumeInsights,
} from '../careerMocks';

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.txt';
const ACCEPTED_LABEL = 'PDF, DOC, DOCX, or TXT';

function fieldFilled(value) {
  return Boolean(String(value || '').trim());
}

function splitPillValues(value) {
  return String(value || '')
    .split(/[,;·|]+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function joinPillValues(pills) {
  return pills.join(', ');
}

function PillField({ value, onChange, onFocus, placeholder, 'aria-label': ariaLabel }) {
  const [draft, setDraft] = useState('');
  const pills = splitPillValues(value);

  const commitDraft = () => {
    const next = draft.trim();
    if (!next) return;
    const exists = pills.some((pill) => pill.toLowerCase() === next.toLowerCase());
    if (!exists) onChange(joinPillValues([...pills, next]));
    setDraft('');
  };

  const removePill = (index) => {
    onChange(joinPillValues(pills.filter((_, i) => i !== index)));
  };

  return (
    <div
      className="career-direction__pills"
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.querySelector('input')?.focus();
      }}
    >
      {pills.map((pill, index) => (
        <span key={`${pill}-${index}`} className="career-direction__pill">
          {pill}
          <button
            type="button"
            className="career-direction__pill-remove"
            aria-label={`Remove ${pill}`}
            onClick={() => removePill(index)}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        type="text"
        className="career-direction__pill-input"
        value={draft}
        aria-label={ariaLabel}
        placeholder={pills.length === 0 ? placeholder : ''}
        onFocus={onFocus}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commitDraft();
          } else if (e.key === 'Backspace' && !draft && pills.length > 0) {
            removePill(pills.length - 1);
          }
        }}
        onBlur={commitDraft}
      />
    </div>
  );
}

function RouteCard({ path, isPrimary, onExplore }) {
  const strengths = (path.strengths || path.evidence || []).slice(0, 3);
  const buildNext = (path.buildNext || path.deepen || []).slice(0, 2);

  return (
    <article
      className={`route-card${isPrimary ? ' route-card--selected' : ''}${path.rank === 1 ? ' route-card--best' : ''}`}
    >
      <div className="route-card__header">
        <span className={`route-card__rank route-card__rank--${path.rank || 1}`}>
          {path.rankLabel || 'Route'}
        </span>
        {isPrimary && <span className="route-card__selected-tag">Selected</span>}
      </div>

      <h3 className="route-card__title">{path.title}</h3>
      <p className="route-card__summary">{path.summary || path.exciting || path.whyFits}</p>

      <div className="route-card__lists">
        <div>
          <h4>You already have</h4>
          <ul>
            {strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Build next</h4>
          <ul>
            {buildNext.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <button type="button" className="submit-btn route-card__cta" onClick={onExplore}>
        Explore route
        <ArrowRight size={16} />
      </button>
    </article>
  );
}

function RouteExplorePanel({
  path,
  isPrimary,
  isSecondary,
  onClose,
  onSelectPrimary,
  onSaveSecondary,
}) {
  if (!path) return null;

  const skillsToBuild = (path.buildNext || path.deepen || []).slice(0, 4);
  const whatItDoes = (path.whatItDoes || path.focusAreas || []).slice(0, 4);

  return (
    <div className="route-explore-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="route-explore-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="route-explore-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="route-explore-panel__header">
          <div>
            <span className={`route-card__rank route-card__rank--${path.rank || 1}`}>
              {path.rankLabel}
            </span>
            <h2 id="route-explore-title">{path.title}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="route-explore-panel__body">
          <section>
            <h3>What this role does</h3>
            <p>{path.summary || path.exciting}</p>
            {whatItDoes.length > 0 && (
              <ul>
                {whatItDoes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3>Why it may fit</h3>
            <p>{path.whyFits}</p>
          </section>

          <section>
            <h3>Main trade-offs</h3>
            <p>{path.tradeoffs}</p>
          </section>

          <section>
            <h3>Skills to build</h3>
            <ul>
              {skillsToBuild.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3>Example job titles</h3>
            <p className="route-explore-panel__titles">{(path.roles || []).join(' · ')}</p>
          </section>
        </div>

        <footer className="route-explore-panel__footer">
          <button
            type="button"
            className={`auth-btn${isPrimary ? ' auth-btn--primary' : ''}`}
            onClick={onSelectPrimary}
          >
            <Star size={14} />
            {isPrimary ? 'Primary route' : 'Make primary'}
          </button>
          <button
            type="button"
            className={`auth-btn${isSecondary ? ' auth-btn--primary' : ''}`}
            onClick={onSaveSecondary}
            disabled={isPrimary}
          >
            <Bookmark size={14} />
            {isSecondary ? 'Saved secondary' : 'Save secondary'}
          </button>
        </footer>
      </aside>
    </div>
  );
}

export default function CareerDirection({
  profile,
  importResume,
  updateSnapshot,
  updateReflection,
  generatePaths,
  selectPaths,
  updateAssumptions,
}) {
  const fileInputRef = useRef(null);
  const viewBootstrapped = useRef(false);

  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [importStatus, setImportStatus] = useState('idle');
  const [importMessage, setImportMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [hasParsed, setHasParsed] = useState(false);
  const [answers, setAnswers] = useState({});
  const [generateNote, setGenerateNote] = useState(null);
  const [reflectionComplete, setReflectionComplete] = useState(false);
  const [view, setView] = useState('intake'); // intake | results
  const [paths, setPaths] = useState([]);
  const [primaryPathId, setPrimaryPathId] = useState(null);
  const [secondaryPathId, setSecondaryPathId] = useState(null);
  const [assumptions, setAssumptions] = useState(null);
  const [editingAssumptions, setEditingAssumptions] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [resumeSource, setResumeSource] = useState(null);
  const [focusField, setFocusField] = useState(null);
  const [exploredRouteId, setExploredRouteId] = useState(null);
  const [importBaseline, setImportBaseline] = useState(null);
  const [fromResumeOpen, setFromResumeOpen] = useState(false);
  const [needsWriteupOpen, setNeedsWriteupOpen] = useState(true);
  const snapshotSectionRef = useRef(null);
  const reflectionSectionRef = useRef(null);

  useEffect(() => {
    if (!profile) return;

    setSnapshot({ ...EMPTY_SNAPSHOT, ...(profile.snapshot || {}) });
    setAnswers(profile.reflection || {});
    setReflectionComplete(Boolean(profile.reflectionComplete));
    setHasParsed(Boolean(profile.workflow?.hasResume || profile.resume?.importedAt));
    setFileName(profile.resume?.fileName || '');
    setLinkedinUrl(profile.resume?.linkedinUrl || '');
    setResumeSource(profile.resume?.source || null);
    setImportBaseline(profile.importBaseline || null);
    setPaths(Array.isArray(profile.generatedPaths) ? profile.generatedPaths : []);
    setAssumptions(profile.assumptions || null);
    setPrimaryPathId(profile.selection?.primaryPathId || null);
    setSecondaryPathId(profile.selection?.secondaryPathId || null);

    if (!viewBootstrapped.current) {
      viewBootstrapped.current = true;
      if (
        (profile.generatedPaths || []).length > 0
        && profile.selection?.primaryPathId
      ) {
        setView('results');
      } else {
        setView('intake');
      }
    }
  }, [profile]);

  const answeredCount = REFLECTION_QUESTIONS.filter((q) => fieldFilled(answers[q.id])).length;

  const progress = useMemo(() => {
    const snapshotKeys = Object.keys(EMPTY_SNAPSHOT);
    const snapshotFilled = snapshotKeys.filter((key) => fieldFilled(snapshot[key])).length;
    const snapshotScore = snapshotFilled / snapshotKeys.length;
    const reflectionScore = answeredCount / REFLECTION_QUESTIONS.length;
    const importScore = hasParsed || importStatus === 'success' ? 1 : 0;
    const raw = importScore * 0.25 + snapshotScore * 0.4 + reflectionScore * 0.35;
    return Math.round(raw * 100);
  }, [answeredCount, hasParsed, importStatus, snapshot]);

  const insights = useMemo(() => {
    if (!hasParsed) return null;
    return buildResumeInsights(snapshot, { source: resumeSource || 'upload' });
  }, [hasParsed, resumeSource, snapshot]);

  const parseResumeImport = async ({
    source,
    sourceLabel,
    nextFileName,
    nextLinkedinUrl,
    text = '',
    file = null,
  }) => {
    setImportStatus('loading');
    setImportMessage(
      source === 'linkedin'
        ? 'Fetching LinkedIn profile…'
        : file
          ? `Reading ${nextFileName || 'resume'}…`
          : `Reading your ${sourceLabel} with AI…`
    );
    setGenerateNote(null);
    setFocusField(null);

    let parsedSnapshot = source === 'linkedin' ? MOCK_LINKEDIN_SNAPSHOT : MOCK_RESUME_SNAPSHOT;
    let parseMode = 'heuristic';
    let warning = null;

    try {
      let res;
      if (file) {
        const form = new FormData();
        form.append('source', source);
        form.append('fileName', nextFileName || file.name || '');
        form.append('linkedinUrl', nextLinkedinUrl || '');
        if (text) form.append('text', text);
        form.append('file', file);
        res = await fetch('/api/career/parse-resume', {
          method: 'POST',
          body: form,
        });
      } else {
        res = await fetch('/api/career/parse-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source,
            fileName: nextFileName || '',
            linkedinUrl: nextLinkedinUrl || '',
            text: text || '',
          }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Resume parse failed');
      }
      parseMode = data.mode || 'llm';
      warning = data.warning || null;
      if (parseMode === 'error') {
        setImportStatus('error');
        setImportMessage(warning || 'Could not parse that LinkedIn profile.');
        if (nextLinkedinUrl) setLinkedinUrl(nextLinkedinUrl);
        return;
      }
      if (data.snapshot && typeof data.snapshot === 'object') {
        parsedSnapshot = { ...EMPTY_SNAPSHOT, ...data.snapshot };
      }
    } catch (error) {
      if (source === 'linkedin' || file) {
        setImportStatus('error');
        setImportMessage(
          error.message
            || (source === 'linkedin'
              ? 'Could not import from LinkedIn. Paste About + Experience text instead.'
              : 'Could not read that resume file. Try PDF/DOCX, or paste the text.')
        );
        if (nextLinkedinUrl) setLinkedinUrl(nextLinkedinUrl);
        if (nextFileName) setFileName(nextFileName);
        return;
      }
      warning = error.message || 'AI parse unavailable — using a demo snapshot.';
      parseMode = 'heuristic';
    }

    const next = importResume({
      source,
      fileName: nextFileName || '',
      linkedinUrl: nextLinkedinUrl || '',
      snapshot: parsedSnapshot,
    });

    const nextSnapshot = next?.snapshot || parsedSnapshot;
    setSnapshot(nextSnapshot);
    setImportBaseline({ ...EMPTY_SNAPSHOT, ...nextSnapshot });
    setHasParsed(true);
    setResumeSource(source);
    setFileName(next?.resume?.fileName || nextFileName || '');
    setLinkedinUrl(next?.resume?.linkedinUrl || nextLinkedinUrl || '');
    setImportStatus('success');
    setFromResumeOpen(false);
    setNeedsWriteupOpen(true);

    if (parseMode === 'llm') {
      setImportMessage(warning || 'Background extracted.');
    } else {
      setImportMessage(warning || 'Demo snapshot — paste resume text for AI parse.');
    }

    requestAnimationFrame(() => {
      snapshotSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const jumpToSnapshotField = (fieldKey) => {
    if (!fieldKey) return;
    const status = fieldStatus(fieldKey);
    if (status === 'add' || status === 'review') setNeedsWriteupOpen(true);
    else setFromResumeOpen(true);
    setFocusField(fieldKey);
    snapshotSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      const input = snapshotSectionRef.current?.querySelector(
        `[data-field="${fieldKey}"] .career-direction__pill-input, [data-field="${fieldKey}"] .compass-field__input`
      );
      input?.focus?.();
    }, 280);
  };

  function fieldStatus(key) {
    const value = snapshot[key];
    const filled = fieldFilled(value);
    const needs = (insights?.highlightedFields || []).includes(key);
    const baseline = importBaseline?.[key];
    const hadBaseline = fieldFilled(baseline);
    const unchanged = hadBaseline && String(value || '').trim() === String(baseline || '').trim();

    if (needs && !filled) return 'add';
    if (needs && filled) return 'review';
    if (!filled) return 'add';
    if (hadBaseline && unchanged) return 'from-resume';
    if (hadBaseline && !unchanged) return 'yours';
    if (hasParsed && filled && !importBaseline) return 'from-resume';
    return 'yours';
  }

  const jumpToReflection = (questionId) => {
    setNeedsWriteupOpen(true);
    reflectionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      reflectionSectionRef.current
        ?.querySelector(`[data-question="${questionId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) {
      setImportStatus('error');
      setImportMessage(`Unsupported file. Please upload a ${ACCEPTED_LABEL}.`);
      return;
    }

    setFileName(file.name);

    try {
      await parseResumeImport({
        source: 'upload',
        sourceLabel: 'resume',
        nextFileName: file.name,
        nextLinkedinUrl: linkedinUrl,
        file,
      });
    } catch {
      setImportStatus('error');
      setImportMessage('Could not parse that resume. Try PDF/DOCX, or paste the text.');
    }
  };

  const handleTextImport = async () => {
    const text = resumeText.trim();
    if (!text) {
      setImportStatus('error');
      setImportMessage('Paste resume text first, or upload a PDF/DOC/DOCX.');
      return;
    }
    try {
      await parseResumeImport({
        source: 'upload',
        sourceLabel: 'resume text',
        nextFileName: fileName || 'pasted-resume.txt',
        nextLinkedinUrl: linkedinUrl,
        text,
      });
    } catch {
      setImportStatus('error');
      setImportMessage('Could not parse that text. Try again.');
    }
  };

  const handleLinkedInImport = async () => {
    const url = linkedinUrl.trim();
    if (!url) {
      setImportStatus('error');
      setImportMessage('Add a LinkedIn profile URL, or upload a resume file.');
      return;
    }
    if (!/linkedin\.com\/in\/[^/?#\s]+/i.test(url)) {
      setImportStatus('error');
      setImportMessage('Use a profile URL like https://linkedin.com/in/your-name');
      return;
    }

    setFileName('');
    try {
      await parseResumeImport({
        source: 'linkedin',
        sourceLabel: 'LinkedIn profile',
        nextFileName: '',
        nextLinkedinUrl: url,
        text: resumeText.trim(),
      });
    } catch {
      setImportStatus('error');
      setImportMessage('Could not import from LinkedIn. Paste About + Experience text instead.');
    }
  };

  const handleSnapshotChange = (key, value) => {
    setSnapshot((prev) => {
      const next = { ...prev, [key]: value };
      updateSnapshot(next);
      return next;
    });
  };

  const setAnswerFor = (questionId, value) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value };
      const complete = REFLECTION_QUESTIONS.every((q) => fieldFilled(next[q.id]));
      setReflectionComplete(complete);
      updateReflection(next, { complete });
      return next;
    });
  };

  const toggleMultiAnswer = (questionId, option) => {
    const selected = splitPillValues(answers[questionId] || '');
    const next = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];
    setAnswerFor(questionId, joinPillValues(next));
  };

  const applyGeneratedProfile = (next) => {
    const nextPaths = next?.generatedPaths?.length
      ? next.generatedPaths
      : buildCareerPaths(
        snapshot,
        next?.assumptions || assumptions || buildAssumptionsFromAnswers(answers, snapshot),
        { answers }
      );
    setPaths(nextPaths);
    setAssumptions(next?.assumptions || null);
    setPrimaryPathId(next?.selection?.primaryPathId || null);
    setSecondaryPathId(next?.selection?.secondaryPathId || null);
    setEditingAssumptions(false);
    setView('results');
    setGenerateNote(null);
  };

  const showResults = async (nextAssumptions) => {
    setGenerating(true);
    try {
      const next = await generatePaths({ assumptions: nextAssumptions });
      applyGeneratedProfile(next);
      if (next?.recommendMode === 'heuristic') {
        setGenerateNote('Ranked with rules — set OPENAI_API_KEY on the server for LLM-grounded routes.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (answeredCount < REFLECTION_QUESTIONS.length && !reflectionComplete) {
      setGenerateNote('Finish preferences first — paths work better with your full context.');
      setNeedsWriteupOpen(true);
      reflectionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (progress < 35) {
      setGenerateNote('Add a bit more resume context before generating paths.');
      return;
    }

    setGenerating(true);
    setGenerateNote(null);
    try {
      setReflectionComplete(true);
      updateReflection(answers, { complete: true });
      const nextAssumptions = buildAssumptionsFromAnswers(answers, snapshot);
      const next = await generatePaths({
        assumptions: nextAssumptions,
        answers,
      });
      applyGeneratedProfile(next);
      if (next?.recommendMode === 'llm') {
        setGenerateNote(null);
      } else if (next?.recommendMode === 'heuristic') {
        setGenerateNote('Ranked with rules — set OPENAI_API_KEY on the server for LLM-grounded routes.');
      }
    } catch (error) {
      setGenerateNote(error.message || 'Could not generate routes. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleReopenReflection = () => {
    setView('intake');
    setNeedsWriteupOpen(true);
    setGenerateNote('Update any answers, then generate paths again.');
  };

  const handleSaveAssumptions = async () => {
    if (!assumptions) return;
    updateAssumptions(assumptions);
    await showResults(assumptions);
    setEditingAssumptions(false);
  };

  const selectPrimary = (id) => {
    setPrimaryPathId(id);
    const nextSecondary = secondaryPathId === id ? null : secondaryPathId;
    if (secondaryPathId === id) setSecondaryPathId(null);
    selectPaths({ primaryPathId: id, secondaryPathId: nextSecondary });
  };

  const saveSecondary = (id) => {
    if (id === primaryPathId) return;
    setSecondaryPathId((prev) => {
      const next = prev === id ? null : id;
      selectPaths({ primaryPathId, secondaryPathId: next });
      return next;
    });
  };

  if (view === 'results') {
    const rankedRoutes = paths.slice(0, 3);
    const exploredRoute = rankedRoutes.find((p) => p.id === exploredRouteId) || null;

    return (
      <section className="career-direction career-direction--results">
        <header className="ui-section ui-section--header career-direction__intro career-direction__intro--results">
          <h2>Your strongest routes</h2>
        </header>

        <div className="career-direction__results-toolbar">
          <button type="button" className="auth-btn" onClick={handleReopenReflection}>
            <MessageCircle size={14} />
            Reopen reflection
          </button>
          <button
            type="button"
            className={`auth-btn${editingAssumptions ? ' auth-btn--primary' : ''}`}
            onClick={() => setEditingAssumptions((open) => !open)}
          >
            <SlidersHorizontal size={14} />
            Edit assumptions
          </button>
          <button
            type="button"
            className="auth-btn"
            onClick={() => {
              setExploredRouteId(null);
              showResults(assumptions || buildAssumptionsFromAnswers(answers, snapshot));
            }}
          >
            <RefreshCw size={14} />
            Refresh routes
          </button>
        </div>

        {editingAssumptions && assumptions && (
          <div className="career-direction__card">
            <div className="career-direction__card-header">
              <SlidersHorizontal size={18} />
              <div>
                <h3>Edit assumptions</h3>
                <p>Tweak these, then refresh routes.</p>
              </div>
            </div>
            <div className="career-direction__assumptions-grid">
              {ASSUMPTION_FIELDS.map((field) => (
                <label key={field.key} className="career-direction__field">
                  <span>{field.label}</span>
                  <input
                    className="compass-field__input"
                    type="text"
                    value={assumptions[field.key] || ''}
                    onChange={(e) =>
                      setAssumptions((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
            <div className="career-direction__assumptions-actions">
              <button type="button" className="submit-btn" onClick={handleSaveAssumptions}>
                Apply & refresh routes
              </button>
            </div>
          </div>
        )}

        {primaryPathId && (
          <p className="career-direction__selection-summary" aria-live="polite">
            Primary route: <strong>{paths.find((p) => p.id === primaryPathId)?.title}</strong>
            {secondaryPathId
              ? <> · Secondary: <strong>{paths.find((p) => p.id === secondaryPathId)?.title}</strong></>
              : null}
          </p>
        )}

        <div className="route-card-list">
          {rankedRoutes.map((path) => (
            <RouteCard
              key={path.id}
              path={path}
              isPrimary={primaryPathId === path.id}
              onExplore={() => setExploredRouteId(path.id)}
            />
          ))}
        </div>

        {exploredRoute && (
          <RouteExplorePanel
            path={exploredRoute}
            isPrimary={primaryPathId === exploredRoute.id}
            isSecondary={secondaryPathId === exploredRoute.id}
            onClose={() => setExploredRouteId(null)}
            onSelectPrimary={() => selectPrimary(exploredRoute.id)}
            onSaveSecondary={() => saveSecondary(exploredRoute.id)}
          />
        )}
      </section>
    );
  }

  return (
    <section className="career-direction">
      <header className="ui-section ui-section--header career-direction__intro">
        <div className="career-direction__intro-row">
          <div>
            <h2>Career Direction</h2>
          </div>
          <div className="career-direction__progress-compact" aria-live="polite">
            <div className="career-direction__progress-compact-top">
              <span>Profile</span>
              <strong>{progress}%</strong>
            </div>
            <div
              className="career-direction__progress-track"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Career profile completeness"
            >
              <div className="career-direction__progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </header>

      <div className="career-direction__card">
        <div className="career-direction__card-header">
          <FileText size={18} />
          <div>
            <h3>Resume</h3>
          </div>
        </div>

        <div className="career-direction__import-row">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="visually-hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="submit-btn career-direction__upload-btn"
            onClick={handleUploadClick}
            disabled={importStatus === 'loading'}
          >
            {importStatus === 'loading' ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
            Upload resume
          </button>
          <div className="career-direction__linkedin">
            <label htmlFor="linkedin-url">LinkedIn URL</label>
            <div className="career-direction__linkedin-row">
              <div className="career-direction__linkedin-input-wrap">
                <Link2 size={16} />
                <input
                  id="linkedin-url"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/…"
                  disabled={importStatus === 'loading'}
                />
              </div>
              <button
                type="button"
                className="auth-btn auth-btn--primary"
                onClick={handleLinkedInImport}
                disabled={importStatus === 'loading'}
              >
                Import
              </button>
            </div>
          </div>
        </div>

        <label className="career-direction__paste" htmlFor="resume-text">
          <span>Resume text</span>
          <textarea
            id="resume-text"
            className="compass-field__input"
            rows={4}
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste resume text…"
            disabled={importStatus === 'loading'}
          />
        </label>
        <div className="career-direction__paste-actions">
          <button
            type="button"
            className="auth-btn auth-btn--primary"
            onClick={handleTextImport}
            disabled={importStatus === 'loading'}
          >
            {importStatus === 'loading' ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
            Import
          </button>
          {fileName ? (
            <p className="career-direction__file-note">{fileName}</p>
          ) : null}
        </div>

        {importStatus === 'loading' && (
          <div className="career-direction__status career-direction__status--loading" role="status">
            <Loader2 size={16} className="spin" />
            {importMessage}
          </div>
        )}
        {importStatus === 'success' && (
          <div className="toast career-direction__status" role="status">
            <CheckCircle2 size={16} />
            {importMessage}
          </div>
        )}
        {importStatus === 'error' && (
          <div className="error-banner career-direction__status" role="alert">
            <AlertCircle size={16} />
            {importMessage}
          </div>
        )}
      </div>

      <div ref={snapshotSectionRef} className="career-direction__card">
        <div className="career-direction__card-header">
          <Sparkles size={18} />
          <div>
            <h3>Background</h3>
          </div>
        </div>

        {(() => {
          const renderField = (field) => {
            const status = hasParsed
              ? fieldStatus(field.key)
              : (fieldFilled(snapshot[field.key]) ? 'yours' : 'add');
            const open = status === 'add' || status === 'review';
            const hint = insights?.fieldHints?.[field.key];
            const focused = focusField === field.key;
            return (
              <label
                key={field.key}
                data-field={field.key}
                className={`career-direction__field${open ? ' career-direction__field--open' : ' career-direction__field--settled'}${focused ? ' career-direction__field--focused' : ''}`}
              >
                <span className="career-direction__field-label">{field.label}</span>
                {hint && open && (
                  <span className="career-direction__field-hint">{hint}</span>
                )}
                {field.pills ? (
                  <PillField
                    value={snapshot[field.key]}
                    onChange={(next) => handleSnapshotChange(field.key, next)}
                    onFocus={() => setFocusField(field.key)}
                    placeholder={field.placeholder}
                    aria-label={field.label}
                  />
                ) : field.multiline ? (
                  <textarea
                    className="compass-field__input"
                    rows={3}
                    value={snapshot[field.key]}
                    onChange={(e) => handleSnapshotChange(field.key, e.target.value)}
                    onFocus={() => setFocusField(field.key)}
                    placeholder={field.placeholder}
                  />
                ) : (
                  <input
                    className="compass-field__input"
                    type="text"
                    value={snapshot[field.key]}
                    onChange={(e) => handleSnapshotChange(field.key, e.target.value)}
                    onFocus={() => setFocusField(field.key)}
                    placeholder={field.placeholder}
                  />
                )}
              </label>
            );
          };

          const openFields = hasParsed
            ? SNAPSHOT_FIELDS.filter((f) => {
              const s = fieldStatus(f.key);
              return s === 'add' || s === 'review';
            })
            : SNAPSHOT_FIELDS;
          const settledFields = hasParsed
            ? SNAPSHOT_FIELDS.filter((f) => {
              const s = fieldStatus(f.key);
              return s !== 'add' && s !== 'review';
            })
            : [];

          const preferencesBlock = (
            <div ref={reflectionSectionRef} className="career-direction__preferences">
              <div className="career-direction__preferences-head">
                <h5>Preferences</h5>
                <span className="career-direction__question-count">
                  {answeredCount} / {REFLECTION_QUESTIONS.length}
                  {reflectionComplete ? ' · Done' : ''}
                </span>
              </div>

              <div className="career-direction__pref-list">
                {REFLECTION_QUESTIONS.map((question, index) => {
                  const value = answers[question.id] || '';
                  const selected = splitPillValues(value);
                  const multi = question.type === 'multi';
                  return (
                    <div
                      key={question.id}
                      data-question={question.id}
                      className="career-direction__pref-item"
                    >
                      <div className="career-direction__pref-prompt-row">
                        <span className="career-direction__pref-num" aria-hidden="true">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div className="career-direction__pref-prompt-copy">
                          <p className="career-direction__pref-prompt">{question.prompt}</p>
                          <span className="career-direction__pref-hint">
                            {multi ? 'Select all that apply' : 'Choose one'}
                          </span>
                        </div>
                      </div>
                      {(question.type === 'choice' || question.type === 'multi') && (
                        <div
                          className="career-direction__choices"
                          role="group"
                          aria-label={question.prompt}
                        >
                          {question.options.map((option) => {
                            const active = multi
                              ? selected.includes(option)
                              : value === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                className={`career-direction__choice${active ? ' career-direction__choice--active' : ''}`}
                                onClick={() => {
                                  if (multi) toggleMultiAnswer(question.id, option);
                                  else setAnswerFor(question.id, option);
                                }}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );

          const parsedSection = settledFields.length > 0 && (
            <div className="career-direction__group career-direction__group--settled">
              <button
                type="button"
                className="career-direction__collapse-toggle"
                aria-expanded={fromResumeOpen}
                onClick={() => setFromResumeOpen((open) => !open)}
              >
                <ChevronDown
                  size={18}
                  className={`career-direction__collapse-chevron${fromResumeOpen ? ' is-open' : ''}`}
                />
                <span className="career-direction__collapse-copy">
                  <span className="career-direction__collapse-label">
                    Already parsed from your resume
                  </span>
                  <span className="career-direction__collapse-sub">
                    AI filled these — expand only to correct something
                  </span>
                </span>
                <span className="career-direction__collapse-meta">{settledFields.length}</span>
              </button>
              {fromResumeOpen && (
                <div className="career-direction__collapse-body">
                  <div className="career-direction__snapshot-grid">
                    {settledFields.map(renderField)}
                  </div>
                </div>
              )}
            </div>
          );

          const writeupSection = (
            <div className="career-direction__group career-direction__group--open">
              <button
                type="button"
                className="career-direction__collapse-toggle"
                aria-expanded={needsWriteupOpen}
                onClick={() => setNeedsWriteupOpen((open) => !open)}
              >
                <ChevronDown
                  size={18}
                  className={`career-direction__collapse-chevron${needsWriteupOpen ? ' is-open' : ''}`}
                />
                <span className="career-direction__collapse-copy">
                  <span className="career-direction__collapse-label">Needs a write-up</span>
                  <span className="career-direction__collapse-sub">
                    Thin resume gaps + your preferences
                  </span>
                </span>
                <span className="career-direction__collapse-meta">
                  {openFields.length + (REFLECTION_QUESTIONS.length - answeredCount)}
                </span>
              </button>
              {needsWriteupOpen && (
                <div className="career-direction__collapse-body">
                  {openFields.length > 0 && (
                    <div className="career-direction__writeup-fields">
                      <p className="career-direction__writeup-kicker">Fill these in</p>
                      <div className="career-direction__snapshot-grid">
                        {openFields.map(renderField)}
                      </div>
                    </div>
                  )}
                  {preferencesBlock}
                </div>
              )}
            </div>
          );

          return (
            <div className="career-direction__snapshot-groups">
              {hasParsed ? parsedSection : null}
              {writeupSection}
            </div>
          );
        })()}
      </div>

      <div className="career-direction__cta-row">
        <button
          type="button"
          className="submit-btn career-direction__cta"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
          {generating ? 'Generating routes…' : 'Generate my career paths'}
        </button>
        {generateNote && (
          <p className="career-direction__cta-note" role="status">
            {generateNote}
          </p>
        )}
      </div>
    </section>
  );
}
