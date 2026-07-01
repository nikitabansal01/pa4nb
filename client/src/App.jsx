import { useState } from 'react';
import { RefreshCw, LayoutGrid, Heart, Sparkles, Users, Briefcase, Compass } from 'lucide-react';
import LifeOverview from './components/LifeOverview';
import CompassEditor from './components/CompassEditor';
import WorkArea from './components/WorkArea';
import AreaPlaceholder from './components/AreaPlaceholder';
import AuthPanel from './components/AuthPanel';
import VoiceDump from './components/VoiceDump';
import { useApplications, useHealth, useAuth, useLifeDesign } from './hooks';
import { LIFE_AREAS } from './lifeDesign';
import './App.css';

const AREA_ICONS = {
  overview: LayoutGrid,
  compass: Compass,
  work: Briefcase,
  health: Heart,
  play: Sparkles,
  love: Users,
};

export default function App() {
  const { isAuthenticated } = useAuth();
  const {
    applications,
    loading,
    error,
    dataSource,
    refresh,
    submitVoiceDump,
    updateApplication,
    clearExamples,
    resetToExamples,
  } = useApplications();
  const { data: lifeDesign, setGauge, setGaugeNote, setWorkview, setLifeview } = useLifeDesign();
  const { aiEnabled } = useHealth();
  const [processing, setProcessing] = useState(false);
  const [lastSummary, setLastSummary] = useState(null);
  const [area, setArea] = useState('overview');
  const [workTab, setWorkTab] = useState('pipeline');

  const handleVoiceSubmit = async (transcript) => {
    setProcessing(true);
    setLastSummary(null);
    try {
      const result = await submitVoiceDump(transcript);
      setLastSummary(result.summary);
    } catch (e) {
      setLastSummary(`Error: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const navigate = (nextArea, nextWorkTab = 'pipeline') => {
    setArea(nextArea);
    if (nextArea === 'work') setWorkTab(nextWorkTab);
  };

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'compass', label: 'Compass' },
    ...LIFE_AREAS.map((a) => ({ id: a.id, label: a.label })),
  ];

  return (
    <div className="app">
      <div className="bg-glow bg-glow--1" />
      <div className="bg-glow bg-glow--2" />
      <div className="bg-glow bg-glow--3" />

      <header className="header">
        <div className="header__brand">
          <div className="header__icon">
            <LayoutGrid size={22} />
          </div>
          <div>
            <h1>PA for NB</h1>
            <p>Design your life — one area at a time</p>
          </div>
        </div>
        <div className="header__meta">
          <span className={`mode-badge ${aiEnabled ? 'mode-badge--ai' : ''}`}>
            {aiEnabled ? 'AI parsing on' : 'Heuristic mode'}
          </span>
          <AuthPanel />
          {area === 'work' && (
            <button type="button" className="icon-btn" onClick={refresh} aria-label="Refresh">
              <RefreshCw size={18} />
            </button>
          )}
        </div>
      </header>

      <nav className="area-nav" aria-label="Life areas">
        {navItems.map(({ id, label }) => {
          const Icon = AREA_ICONS[id] || LayoutGrid;
          return (
            <button
              key={id}
              type="button"
              className={`area-nav__btn ${area === id ? 'area-nav__btn--active' : ''}`}
              onClick={() => setArea(id)}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="global-voice">
        <VoiceDump
          onSubmit={handleVoiceSubmit}
          processing={processing}
          currentArea={area}
        />
        {lastSummary && (
          <div className="toast global-voice__toast" role="status">
            {lastSummary}
          </div>
        )}
      </div>

      <main className="main">
        {area === 'overview' && (
          <LifeOverview
            data={lifeDesign}
            onGaugeChange={setGauge}
            onNoteChange={setGaugeNote}
            onNavigate={navigate}
          />
        )}

        {area === 'compass' && (
          <CompassEditor
            data={lifeDesign}
            onWorkviewChange={setWorkview}
            onLifeviewChange={setLifeview}
          />
        )}

        {area === 'work' && (
          <WorkArea
            workTab={workTab}
            onWorkTabChange={setWorkTab}
            lifeDesign={lifeDesign}
            onWorkviewChange={setWorkview}
            applications={applications}
            loading={loading}
            error={error}
            dataSource={dataSource}
            isAuthenticated={isAuthenticated}
            onUpdateApplication={updateApplication}
            onClearExamples={clearExamples}
            onResetExamples={resetToExamples}
          />
        )}

        {['health', 'play', 'love'].includes(area) && <AreaPlaceholder areaId={area} />}
      </main>
    </div>
  );
}
