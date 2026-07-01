import { Compass, LayoutGrid, Building2 } from 'lucide-react';
import Dashboard from './Dashboard';
import CompanyBrowser from './CompanyBrowser';
import CompassEditor from './CompassEditor';
import DataSourceBanner from './DataSourceBanner';

export default function WorkArea({
  workTab,
  onWorkTabChange,
  lifeDesign,
  onWorkviewChange,
  applications,
  loading,
  error,
  dataSource,
  isAuthenticated,
  onUpdateApplication,
  onClearExamples,
  onResetExamples,
}) {
  return (
    <section className="work-area">
      <header className="ui-section ui-section--header work-area__intro">
        <h2>Work</h2>
        <p>
          In <em>Designing Your Life</em>, Work is all contribution — paid and unpaid.
          Your <strong>Workview</strong> sets the philosophy; <strong>Job search</strong> is where you execute.
        </p>
      </header>

      <nav className="view-tabs view-tabs--nested ui-section ui-section--nav" aria-label="Work sub-areas">
        <button
          type="button"
          className={`view-tab ${workTab === 'workview' ? 'view-tab--active' : ''}`}
          onClick={() => onWorkTabChange('workview')}
        >
          <Compass size={16} />
          Workview
        </button>
        <button
          type="button"
          className={`view-tab ${workTab === 'pipeline' ? 'view-tab--active' : ''}`}
          onClick={() => onWorkTabChange('pipeline')}
        >
          <LayoutGrid size={16} />
          Pipeline
        </button>
        <button
          type="button"
          className={`view-tab ${workTab === 'companies' ? 'view-tab--active' : ''}`}
          onClick={() => onWorkTabChange('companies')}
        >
          <Building2 size={16} />
          Browse companies
        </button>
      </nav>

      {workTab === 'workview' ? (
        <div className="ui-stack">
          <CompassEditor
            data={lifeDesign}
            onWorkviewChange={onWorkviewChange}
            onLifeviewChange={() => {}}
            workviewOnly
          />
        </div>
      ) : (
        <div className="ui-stack ui-stack--work">
          <div className="ui-block ui-block--meta">
            <DataSourceBanner
              dataSource={dataSource}
              isAuthenticated={isAuthenticated}
              onClearExamples={onClearExamples}
              onResetExamples={onResetExamples}
            />
          </div>

          {error && <div className="error-banner ui-block--toast">{error}</div>}

          <div className="ui-block ui-block--content">
            {loading ? (
              <div className="loading">Loading your pipeline…</div>
            ) : workTab === 'companies' ? (
              <CompanyBrowser applications={applications} onUpdate={onUpdateApplication} />
            ) : (
              <Dashboard applications={applications} />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
