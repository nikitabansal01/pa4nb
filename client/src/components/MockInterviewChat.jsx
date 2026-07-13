import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Loader2,
  Mic,
  RotateCcw,
  Send,
  Square,
  Sparkles,
} from 'lucide-react';
import { authHeaders } from '../storage';
import { useAuth } from '../hooks';
import useSpeechToText from '../hooks/useSpeechToText';
import {
  buildMockApplicationContext,
  defaultMockConfig,
  defaultTopicForInterviewType,
  getActiveMockSession,
  getMockInterviewState,
  getMockTopicsForStyle,
  mergeDrillIntoPrep,
  MOCK_INTERVIEW_TYPES,
  resolveMockTrack,
  showsTopicPicker,
} from '../utils/mockInterview';
import { getWorkspace } from '../utils/companyWorkspace';

const PERSONAS = [
  { id: 'friendly', label: 'Friendly' },
  { id: 'tough', label: 'Tough' },
  { id: 'bar-raiser', label: 'Bar-raiser' },
];

function newSessionId() {
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Lightweight markdown-ish rendering for interview messages. */
function formatInline(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, '<code class="mock-md__code">$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  return html;
}

function FormattedMessage({ content }) {
  const blocks = useMemo(() => {
    let raw = String(content || '').replace(/\r\n/g, '\n').trim();
    if (!raw) return [];

    // Turn inline "1. Foo 2. Bar" into real list lines when the model packs them.
    raw = raw.replace(/([^\n])\s+(\d+[.)]\s+)/g, '$1\n$2');
    raw = raw.replace(/([^\n])\s+([-•]\s+)/g, '$1\n$2');

    const parts = [];
    const fenceSplit = raw.split(/(```[\s\S]*?```)/g);

    for (const chunk of fenceSplit) {
      if (!chunk) continue;
      if (chunk.startsWith('```')) {
        const body = chunk.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/```$/, '');
        parts.push({ type: 'code', text: body.trimEnd() });
        continue;
      }

      const lines = chunk.split('\n');
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        if (!line.trim()) {
          i += 1;
          continue;
        }

        if (/^#{1,3}\s+/.test(line)) {
          const level = line.match(/^(#{1,3})/)[1].length;
          parts.push({ type: 'heading', level, text: line.replace(/^#{1,3}\s+/, '') });
          i += 1;
          continue;
        }

        if (/^[-*•]\s+/.test(line)) {
          const items = [];
          while (i < lines.length && /^[-*•]\s+/.test(lines[i])) {
            items.push(lines[i].replace(/^[-*•]\s+/, ''));
            i += 1;
          }
          parts.push({ type: 'ul', items });
          continue;
        }

        if (/^\d+[.)]\s+/.test(line)) {
          const items = [];
          while (i < lines.length && /^\d+[.)]\s+/.test(lines[i])) {
            items.push(lines[i].replace(/^\d+[.)]\s+/, ''));
            i += 1;
          }
          parts.push({ type: 'ol', items });
          continue;
        }

        const para = [];
        while (
          i < lines.length
          && lines[i].trim()
          && !/^#{1,3}\s+/.test(lines[i])
          && !/^[-*•]\s+/.test(lines[i])
          && !/^\d+[.)]\s+/.test(lines[i])
        ) {
          para.push(lines[i]);
          i += 1;
        }
        parts.push({ type: 'p', text: para.join(' ') });
      }
    }

    return parts;
  }, [content]);

  if (!blocks.length) return null;

  return (
    <div className="mock-md">
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return (
            <pre key={idx} className="mock-md__pre">
              <code>{block.text}</code>
            </pre>
          );
        }
        if (block.type === 'heading') {
          const Tag = block.level === 1 ? 'h4' : 'h5';
          return (
            <Tag
              key={idx}
              className="mock-md__heading"
              dangerouslySetInnerHTML={{ __html: formatInline(block.text) }}
            />
          );
        }
        if (block.type === 'ul') {
          return (
            <ul key={idx} className="mock-md__list">
              {block.items.map((item, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
              ))}
            </ul>
          );
        }
        if (block.type === 'ol') {
          return (
            <ol key={idx} className="mock-md__list mock-md__list--ol">
              {block.items.map((item, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
              ))}
            </ol>
          );
        }
        return (
          <p
            key={idx}
            className="mock-md__p"
            dangerouslySetInnerHTML={{ __html: formatInline(block.text) }}
          />
        );
      })}
    </div>
  );
}

export default function MockInterviewChat({
  app,
  profile = null,
  onUpdate,
  onImmersiveChange,
  onExitWorkspace,
}) {
  const { getToken } = useAuth();
  const speech = useSpeechToText();

  const track = useMemo(() => resolveMockTrack(app, profile), [app, profile]);
  const [config, setConfig] = useState(() => defaultMockConfig(app, profile));
  const topicOptions = useMemo(
    () => getMockTopicsForStyle(config.type, track),
    [config.type, track]
  );
  const showTopic = showsTopicPicker(config.type);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [researchAssist, setResearchAssist] = useState(null);
  const [insightOpen, setInsightOpen] = useState(false);
  const bottomRef = useRef(null);
  const transcriptRef = useRef(null);
  const inputRef = useRef(null);

  const activeSession = useMemo(() => getActiveMockSession(app), [app]);
  const messages = activeSession?.messages || [];
  const isActive = activeSession?.status === 'active';
  const isCompleted = activeSession?.status === 'completed';
  const isCalibrating = activeSession?.phase === 'calibrating';
  const inSession = isActive || isCompleted;
  const selectedType = MOCK_INTERVIEW_TYPES.find((t) => t.id === config.type) || MOCK_INTERVIEW_TYPES[0];
  const sessionStyleLabel = MOCK_INTERVIEW_TYPES.find((t) => t.id === activeSession?.config?.type)?.label
    || activeSession?.config?.type
    || '';

  useEffect(() => {
    onImmersiveChange?.(inSession);
    return () => onImmersiveChange?.(false);
  }, [inSession, onImmersiveChange]);

  useEffect(() => {
    setConfig(defaultMockConfig(app, profile));
  }, [app.id, track]);

  useEffect(() => {
    if (!showTopic) return;
    if (topicOptions.some((t) => t.id === config.topic)) return;
    setConfig((c) => ({ ...c, topic: topicOptions[0]?.id || 'behavioral' }));
  }, [topicOptions, config.topic, showTopic]);

  useEffect(() => {
    if (lastFeedback || researchAssist) setInsightOpen(false);
  }, [lastFeedback, researchAssist]);

  const onInterviewTypeChange = (type) => {
    const nextTopic = defaultTopicForInterviewType(type, track);
    const allowed = getMockTopicsForStyle(type, track);
    const topic = allowed.some((t) => t.id === nextTopic)
      ? nextTopic
      : allowed[0]?.id || defaultTopicForInterviewType(type, track);
    setConfig((c) => ({
      ...c,
      type,
      topic,
      maxTurns: type === 'live_coding' || type === 'live_prototype' ? 6 : 5,
    }));
  };

  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, processing, lastFeedback, researchAssist, isCompleted]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [speech.displayText, isActive]);

  const persistMockState = (nextMock, extraWorkspace = {}) => {
    const workspace = getWorkspace(app);
    onUpdate?.(app.id, {
      workspace: {
        ...workspace,
        ...extraWorkspace,
        mockInterview: nextMock,
      },
    });
  };

  const upsertSession = (session) => {
    const state = getMockInterviewState(app);
    const sessions = [...state.sessions.filter((s) => s.id !== session.id), session]
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .slice(0, 8);
    persistMockState({
      sessions,
      activeSessionId: session.id,
    });
  };

  const callTurn = async ({ session, userMessage }) => {
    const applicationContext = buildMockApplicationContext(app, profile);
    const headers = {
      ...(await authHeaders(getToken)),
    };
    const res = await fetch('/api/mock-interview/turn', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        applicationContext,
        profileSnapshot: {
          pathTitle: applicationContext.pathTitle,
          resumeEvidence: applicationContext.resumeEvidence,
        },
        session,
        userMessage: userMessage || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Mock interview turn failed');
    }
    return res.json();
  };

  const startSession = async () => {
    setProcessing(true);
    setError(null);
    setLastFeedback(null);
    setResearchAssist(null);
    try {
      const seed = {
        id: newSessionId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        phase: 'calibrating',
        config: { ...config, track },
        messages: [],
        feedback: [],
        questionIndex: 0,
        followUpsUsed: 0,
        summary: null,
      };
      const result = await callTurn({ session: seed, userMessage: null });
      upsertSession({
        ...seed,
        ...(result.sessionPatch || {}),
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      setError(e.message || 'Could not start mock interview');
    } finally {
      setProcessing(false);
    }
  };

  const sendAnswer = async () => {
    const answer = speech.displayText.trim();
    if (!answer || !activeSession || processing) return;
    if (speech.listening) speech.stop();
    setProcessing(true);
    setError(null);
    try {
      const result = await callTurn({ session: activeSession, userMessage: answer });
      const session = {
        ...activeSession,
        ...(result.sessionPatch || {}),
        updatedAt: new Date().toISOString(),
      };
      setLastFeedback(result.feedback || null);
      setResearchAssist(result.researchAssist || null);
      speech.reset();

      const workspaceExtras = {};
      if (result.done) {
        workspaceExtras.interviewPrep = mergeDrillIntoPrep(
          app,
          Array.isArray(result.drillQuestions) ? result.drillQuestions : []
        );
      }

      const state = getMockInterviewState(app);
      const sessions = [...state.sessions.filter((s) => s.id !== session.id), session]
        .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
        .slice(0, 8);
      persistMockState({ sessions, activeSessionId: session.id }, workspaceExtras);
    } catch (e) {
      setError(e.message || 'Could not send answer');
    } finally {
      setProcessing(false);
    }
  };

  const resetToSetup = () => {
    if (speech.listening) speech.stop();
    const state = getMockInterviewState(app);
    persistMockState({
      sessions: state.sessions,
      activeSessionId: null,
    });
    setLastFeedback(null);
    setResearchAssist(null);
    setError(null);
    speech.reset();
  };

  const hasInsight = Boolean(
    (researchAssist?.bullets?.length && isActive)
    || (lastFeedback?.notes && isActive)
    || (isCompleted && activeSession?.summary)
  );

  return (
    <div className={`mock-interview ${inSession ? 'mock-interview--live' : ''}`}>
      {!inSession && (
        <section className="mock-interview__setup-shell">
          <header className="mock-interview__hero">
            <p className="mock-interview__kicker">Interview practice</p>
            <h3>
              {app.company || 'Company'}
              {app.positionTitle ? ` · ${app.positionTitle}` : ''}
            </h3>
            <p className="mock-interview__lede">
              Pick the round you want to practice. The interviewer will confirm company, role, and style before starting.
            </p>
          </header>

          <div className="mock-interview__setup">
            <label className="mock-interview__field mock-interview__setup-type">
              <span>Interview style</span>
              <select
                className="compass-field__input"
                value={config.type}
                onChange={(e) => onInterviewTypeChange(e.target.value)}
              >
                {MOCK_INTERVIEW_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              {selectedType?.blurb && (
                <p className="mock-interview__style-blurb">{selectedType.blurb}</p>
              )}
            </label>
            {showTopic && (
              <label className="mock-interview__field">
                <span>Topic</span>
                <select
                  className="compass-field__input"
                  value={config.topic}
                  onChange={(e) => setConfig((c) => ({ ...c, topic: e.target.value }))}
                >
                  {topicOptions.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="mock-interview__field">
              <span>Persona</span>
              <select
                className="compass-field__input"
                value={config.persona}
                onChange={(e) => setConfig((c) => ({ ...c, persona: e.target.value }))}
              >
                {PERSONAS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="submit-btn mock-interview__start"
              onClick={startSession}
              disabled={processing}
            >
              {processing ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              Start session
            </button>
          </div>
          {error && <p className="mock-interview__error" role="alert">{error}</p>}
        </section>
      )}

      {inSession && (
        <section className="mock-chat" aria-label="Interview chat">
          <header className="mock-chat__top">
            <div className="mock-chat__top-left">
              {onExitWorkspace && (
                <button type="button" className="mock-chat__exit" onClick={onExitWorkspace}>
                  <ArrowLeft size={15} />
                  Exit
                </button>
              )}
              <div className="mock-chat__title-block">
                <h3 className="mock-chat__title">Interview</h3>
                <div className="mock-chat__meta">
                  <span className="mock-chat__company">{app.company || 'Company'}</span>
                  {app.positionTitle && <span>{app.positionTitle}</span>}
                  {sessionStyleLabel && <span>{sessionStyleLabel}</span>}
                  {isCalibrating && <span className="mock-chat__meta-pill">Confirming</span>}
                  {isCompleted && <span className="mock-chat__meta-pill">Done</span>}
                </div>
              </div>
            </div>
            <div className="mock-chat__top-actions">
              {hasInsight && (
                <button
                  type="button"
                  className={`mock-chat__insight-toggle${insightOpen ? ' is-open' : ''}`}
                  onClick={() => setInsightOpen((v) => !v)}
                  aria-expanded={insightOpen}
                >
                  Insights
                </button>
              )}
              <button type="button" className="mock-chat__end" onClick={resetToSetup}>
                <RotateCcw size={14} />
                {isCompleted ? 'New session' : 'End'}
              </button>
            </div>
          </header>

          <div className="mock-chat__stream" ref={transcriptRef} aria-live="polite">
            {messages.map((msg) => (
              <article
                key={msg.id}
                className={`mock-chat__msg mock-chat__msg--${msg.role}`}
              >
                <div className="mock-chat__bubble">
                  <span className="mock-chat__who">
                    {msg.role === 'candidate' ? 'You' : 'Interviewer'}
                  </span>
                  <FormattedMessage content={msg.content} />
                </div>
              </article>
            ))}

            {researchAssist?.bullets?.length > 0 && isActive && (
              <aside className="mock-chat__note mock-chat__note--research">
                <strong>Company context</strong>
                <ul>
                  {researchAssist.bullets.slice(0, 4).map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </aside>
            )}

            {lastFeedback?.notes && isActive && (
              <aside className="mock-chat__note mock-chat__note--feedback">
                <strong>Feedback</strong>
                <FormattedMessage content={lastFeedback.notes} />
              </aside>
            )}

            {isCompleted && activeSession?.summary && (
              <aside className="mock-chat__note mock-chat__note--summary">
                <strong>Session summary</strong>
                <FormattedMessage content={activeSession.summary} />
              </aside>
            )}

            {processing && (
              <article className="mock-chat__msg mock-chat__msg--interviewer mock-chat__msg--pending">
                <div className="mock-chat__bubble">
                  <span className="mock-chat__who">Interviewer</span>
                  <p className="mock-chat__pending">
                    <Loader2 size={14} className="spin" />
                    {messages.length === 0
                      ? 'Building briefing…'
                      : isCalibrating
                        ? 'Updating…'
                        : 'Thinking…'}
                  </p>
                </div>
              </article>
            )}
            <div ref={bottomRef} />
          </div>

          {insightOpen && hasInsight && (
            <div className="mock-chat__insight-drawer" role="dialog" aria-label="Session insights">
              <div className="mock-chat__insight-drawer-head">
                <strong>Insights</strong>
                <button
                  type="button"
                  className="mock-chat__insight-close"
                  onClick={() => setInsightOpen(false)}
                >
                  Close
                </button>
              </div>
              <div className="mock-chat__insight-drawer-body">
                {researchAssist?.bullets?.length > 0 && (
                  <section>
                    <strong>Company context</strong>
                    <ul>
                      {researchAssist.bullets.slice(0, 6).map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </section>
                )}
                {lastFeedback?.notes && (
                  <section>
                    <strong>Latest feedback</strong>
                    <FormattedMessage content={lastFeedback.notes} />
                  </section>
                )}
                {isCompleted && activeSession?.summary && (
                  <section>
                    <strong>Summary</strong>
                    <FormattedMessage content={activeSession.summary} />
                  </section>
                )}
              </div>
            </div>
          )}

          {(isActive || isCalibrating) && (
            <footer className={`mock-chat__composer ${speech.listening ? 'mock-chat__composer--live' : ''}`}>
              <textarea
                ref={inputRef}
                className="mock-chat__input"
                placeholder={
                  isCalibrating
                    ? 'Reply yes, or correct any bullet'
                    : speech.listening
                      ? 'Listening…'
                      : 'Type your answer — Enter to send, Shift+Enter for a new line'
                }
                value={speech.displayText}
                onChange={(e) => speech.setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendAnswer();
                  }
                }}
                rows={2}
                disabled={processing}
                aria-label="Your interview answer"
              />
              <div className="mock-chat__actions">
                {speech.supported && (
                  <button
                    type="button"
                    className={`mock-chat__icon-btn ${speech.listening ? 'mock-chat__icon-btn--live' : ''}`}
                    onClick={speech.toggle}
                    disabled={processing}
                    aria-label={speech.listening ? 'Stop recording' : 'Start recording'}
                    aria-pressed={speech.listening}
                  >
                    {speech.listening ? <Square size={15} fill="currentColor" /> : <Mic size={17} />}
                  </button>
                )}
                <button
                  type="button"
                  className="mock-chat__send"
                  onClick={sendAnswer}
                  disabled={!speech.displayText.trim() || processing}
                  aria-label={processing ? 'Sending' : 'Send answer'}
                >
                  {processing ? <Loader2 size={17} className="spin" /> : <Send size={17} />}
                  <span>Send</span>
                </button>
              </div>
            </footer>
          )}

          {(speech.error || error) && (
            <p className="mock-interview__error" role="alert">{speech.error || error}</p>
          )}
        </section>
      )}
    </div>
  );
}
