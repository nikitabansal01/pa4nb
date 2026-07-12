import { useState } from 'react';
import { Briefcase, RefreshCw } from 'lucide-react';
import AuthPanel from './components/AuthPanel';
import VoiceDump from './components/VoiceDump';
import JobTrackerArea from './components/JobTrackerArea';
import { useApplications, useHealth, useAuth } from './hooks';
import './App.css';

export default function App() {
  const { isAuthenticated } = useAuth();
  const {
    applications,
    labels,
    loading,
    error,
    dataSource,
    refresh,
    submitVoiceDump,
    updateApplication,
    createLabel,
    updateLabel,
    deleteLabel,
    clearExamples,
    resetToExamples,
    syncToAccount,
    applySyncedApplications,
  } = useApplications();
  const { aiEnabled } = useHealth();
  const [jobVoiceProcessing, setJobVoiceProcessing] = useState(false);
  const [jobVoiceSummary, setJobVoiceSummary] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const handleJobVoiceSubmit = async (transcript) => {
    setJobVoiceProcessing(true);
    setJobVoiceSummary(null);
    try {
      const result = await submitVoiceDump(transcript);
      const parserNote = result.parser === 'heuristic'
        ? ' Parsed with basic rules — add OPENAI_API_KEY on the server for smarter understanding.'
        : '';
      const warning = result.storageWarning
        ? ' Saved in this browser until your database is connected.'
        : '';
      setJobVoiceSummary(`${result.summary}${warning}${parserNote}`);
    } catch (e) {
      setJobVoiceSummary(`Error: ${e.message}`);
    } finally {
      setJobVoiceProcessing(false);
    }
  };

  const handleSyncToAccount = async () => {
    setSyncing(true);
    try {
      const synced = await syncToAccount(applications);
      if (!synced) {
        setJobVoiceSummary('Error: Could not sync to your account. Try again in a moment.');
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="app">
      <div className="bg-glow bg-glow--1" />
      <div className="bg-glow bg-glow--2" />
      <div className="bg-glow bg-glow--3" />
      <div className="bg-glow bg-glow--4" />

      <header className="header">
        <div className="header__brand">
          <div className="header__icon">
            <Briefcase size={22} />
          </div>
          <div>
            <h1 className="header__wordmark">Job Tracker</h1>
            <p>Voice updates, pipeline, and calendar-aware interview sync</p>
          </div>
        </div>
        <div className="header__meta">
          <span className={`mode-badge ${aiEnabled ? 'mode-badge--ai' : ''}`}>
            {aiEnabled ? 'AI parsing on' : 'Heuristic mode'}
          </span>
          <AuthPanel />
          <button type="button" className="icon-btn" onClick={refresh} aria-label="Refresh">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      <main className="main">
        <div className="ui-block ui-block--capture">
          <VoiceDump
            onSubmit={handleJobVoiceSubmit}
            processing={jobVoiceProcessing}
            currentArea="jobs"
          />
          {jobVoiceSummary && (
            <div className="toast" role="status">
              {jobVoiceSummary}
            </div>
          )}
        </div>

        <JobTrackerArea
          applications={applications}
          labels={labels}
          loading={loading}
          error={error}
          dataSource={dataSource}
          isAuthenticated={isAuthenticated}
          onUpdateApplication={updateApplication}
          onCreateLabel={createLabel}
          onUpdateLabel={updateLabel}
          onDeleteLabel={deleteLabel}
          onClearExamples={clearExamples}
          onResetExamples={resetToExamples}
          onSyncToAccount={handleSyncToAccount}
          syncing={syncing}
          onCalendarSynced={applySyncedApplications}
        />
      </main>
    </div>
  );
}
