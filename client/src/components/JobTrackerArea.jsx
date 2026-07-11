import { useState } from 'react';
import { LayoutGrid, Building2, Settings } from 'lucide-react';
import Dashboard from './Dashboard';
import CompanyBrowser from './CompanyBrowser';
import DataSourceBanner from './DataSourceBanner';
import LabelsSettingsOverlay from './LabelsSettingsOverlay';

export default function JobTrackerArea({
  applications,
  labels = [],
  loading,
  error,
  dataSource,
  isAuthenticated,
  onUpdateApplication,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
  onClearExamples,
  onResetExamples,
  onSyncToAccount,
  syncing,
  nested = false,
}) {
  const [jobTab, setJobTab] = useState('pipeline');
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <section className={`job-tracker-area ${nested ? 'job-tracker-area--nested' : ''}`}>
      <div className="job-tracker-area__top">
        {!nested && (
          <header className="ui-section ui-section--header job-tracker-area__intro">
            <h2>Job search</h2>
            <p>
              Your pipeline at a glance — voice-dump interviews, status changes, and next steps to keep everything current.
            </p>
          </header>
        )}
        <button
          type="button"
          className="icon-btn job-tracker-area__settings"
          onClick={() => setSettingsOpen(true)}
          aria-label="Job tracker settings"
          title="Labels settings"
        >
          <Settings size={18} />
        </button>
      </div>

      <nav className="view-tabs view-tabs--nested ui-section ui-section--nav" aria-label="Job search views">
        <button
          type="button"
          className={`view-tab ${jobTab === 'pipeline' ? 'view-tab--active' : ''}`}
          onClick={() => setJobTab('pipeline')}
        >
          <LayoutGrid size={16} />
          Pipeline
        </button>
        <button
          type="button"
          className={`view-tab ${jobTab === 'companies' ? 'view-tab--active' : ''}`}
          onClick={() => setJobTab('companies')}
        >
          <Building2 size={16} />
          Browse companies
        </button>
      </nav>

      <div className="ui-stack ui-stack--work">
        <div className="ui-block ui-block--meta">
          <DataSourceBanner
            dataSource={dataSource}
            isAuthenticated={isAuthenticated}
            onClearExamples={onClearExamples}
            onResetExamples={onResetExamples}
            onSyncToAccount={onSyncToAccount}
            syncing={syncing}
          />
        </div>

        {error && <div className="error-banner ui-block--toast">{error}</div>}

        <div className="ui-block ui-block--content">
          {loading ? (
            <div className="loading">Loading your pipeline…</div>
          ) : jobTab === 'companies' ? (
            <CompanyBrowser
              applications={applications}
              labels={labels}
              onUpdate={onUpdateApplication}
            />
          ) : (
            <Dashboard applications={applications} labels={labels} />
          )}
        </div>
      </div>

      {settingsOpen && (
        <LabelsSettingsOverlay
          labels={labels}
          onClose={() => setSettingsOpen(false)}
          onCreate={onCreateLabel}
          onUpdate={onUpdateLabel}
          onDelete={onDeleteLabel}
        />
      )}
    </section>
  );
}
