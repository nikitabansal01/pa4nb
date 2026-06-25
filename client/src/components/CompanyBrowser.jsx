import { Fragment, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import {
  INDUSTRIES,
  INDUSTRY_LABELS,
  BUSINESS_MODELS,
  BUSINESS_MODEL_LABELS,
  FUNDING_STAGES,
  FUNDING_STAGE_LABELS,
  FINANCE_STANDINGS,
  FINANCE_STANDING_LABELS,
  FINANCE_STANDING_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  formatDate,
  relativeTime,
} from '../constants';
import {
  filterCompanies,
  getFinanceStanding,
  formatFundingAmount,
} from '../utils/companyFilters';

const EMPTY_FILTERS = {
  industry: '',
  businessModel: '',
  fundingStage: '',
  financeStanding: '',
  search: '',
};

const GROUP_BY_OPTIONS = [
  { value: '', label: 'No grouping' },
  { value: 'industry', label: 'Industry' },
  { value: 'businessModel', label: 'Business model' },
  { value: 'status', label: 'Status' },
];

const COLUMN_COUNT = 10;

function byRecency(a, b) {
  return new Date(b.updatedAt) - new Date(a.updatedAt);
}

function getGroupKey(app, groupBy) {
  return app[groupBy] || '';
}

function getGroupLabel(key, groupBy) {
  if (!key) return 'Not set';
  if (groupBy === 'industry') return INDUSTRY_LABELS[key] || key;
  if (groupBy === 'businessModel') return BUSINESS_MODEL_LABELS[key] || key;
  if (groupBy === 'status') return STATUS_LABELS[key] || key;
  return key;
}

function buildGroups(apps, groupBy) {
  const sorted = [...apps].sort(byRecency);

  if (!groupBy) {
    return [{ key: null, label: null, items: sorted }];
  }

  const map = new Map();
  for (const app of sorted) {
    const key = getGroupKey(app, groupBy);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(app);
  }

  return [...map.entries()]
    .map(([key, items]) => ({
      key,
      label: getGroupLabel(key, groupBy),
      items,
      latest: Math.max(...items.map((a) => new Date(a.updatedAt).getTime())),
    }))
    .sort((a, b) => b.latest - a.latest);
}

function FilterSelect({ label, value, onChange, options, labels }) {
  return (
    <label className="company-filter">
      <span className="company-filter__label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="company-filter__select">
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {labels[opt] || opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function CompanyTableRow({ app, onUpdate, hideColumn }) {
  const financeStanding = getFinanceStanding(app);
  const standingColor = FINANCE_STANDING_COLORS[financeStanding];
  const statusColor = STATUS_COLORS[app.status] || '#6B7280';

  const handleChange = (field, value) => {
    const payload = { [field]: value };
    if (field === 'lastFundingAmount') {
      payload.lastFundingAmount = value === '' ? null : Number(value);
    }
    onUpdate(app.id, payload);
  };

  return (
    <tr className="company-table__row">
      <th scope="row" className="company-table__company">
        <span className="company-table__company-name">{app.company || 'Unknown'}</span>
        <span className="company-table__updated">{relativeTime(app.updatedAt)}</span>
      </th>
      <td className="company-table__cell company-table__cell--muted">
        {app.positionTitle || '—'}
      </td>
      {!hideColumn?.status && (
        <td className="company-table__cell">
          <span
            className="company-table__status"
            style={{ '--status-color': statusColor }}
          >
            {STATUS_LABELS[app.status] || app.status || '—'}
          </span>
        </td>
      )}
      {!hideColumn?.industry && (
        <td className="company-table__cell">
          <select
            className="company-table__input"
            value={app.industry || ''}
            onChange={(e) => handleChange('industry', e.target.value)}
            aria-label={`Industry for ${app.company}`}
          >
            <option value="">—</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {INDUSTRY_LABELS[i]}
              </option>
            ))}
          </select>
        </td>
      )}
      {!hideColumn?.businessModel && (
        <td className="company-table__cell">
          <select
            className="company-table__input"
            value={app.businessModel || ''}
            onChange={(e) => handleChange('businessModel', e.target.value)}
            aria-label={`Business model for ${app.company}`}
          >
            <option value="">—</option>
            {BUSINESS_MODELS.map((m) => (
              <option key={m} value={m}>
                {BUSINESS_MODEL_LABELS[m]}
              </option>
            ))}
          </select>
        </td>
      )}
      <td className="company-table__cell">
        <select
          className="company-table__input"
          value={app.fundingStage || ''}
          onChange={(e) => handleChange('fundingStage', e.target.value)}
          aria-label={`Funding stage for ${app.company}`}
        >
          <option value="">—</option>
          {FUNDING_STAGES.map((s) => (
            <option key={s} value={s}>
              {FUNDING_STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </td>
      <td className="company-table__cell">
        <input
          className="company-table__input company-table__input--date"
          type="date"
          value={app.lastFundingDate ? app.lastFundingDate.slice(0, 10) : ''}
          onChange={(e) =>
            handleChange('lastFundingDate', e.target.value ? new Date(e.target.value).toISOString() : '')
          }
          aria-label={`Last funding date for ${app.company}`}
        />
      </td>
      <td className="company-table__cell company-table__cell--amount">
        <input
          className="company-table__input company-table__input--number"
          type="number"
          min="0"
          step="0.1"
          placeholder="—"
          value={app.lastFundingAmount ?? ''}
          onChange={(e) => handleChange('lastFundingAmount', e.target.value)}
          aria-label={`Funding amount for ${app.company}`}
        />
      </td>
      <td className="company-table__cell">
        <span
          className="company-table__standing"
          style={{ '--standing-color': standingColor }}
        >
          {FINANCE_STANDING_LABELS[financeStanding]}
        </span>
      </td>
      <td className="company-table__cell company-table__cell--muted company-table__cell--notes">
        {app.lastFundingDate
          ? `${formatDate(app.lastFundingDate)} · ${formatFundingAmount(app.lastFundingAmount)}`
          : '—'}
      </td>
    </tr>
  );
}

export default function CompanyBrowser({ applications, onUpdate }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [groupBy, setGroupBy] = useState('');

  const filtered = useMemo(
    () => filterCompanies(applications, filters),
    [applications, filters]
  );

  const groups = useMemo(() => buildGroups(filtered, groupBy), [filtered, groupBy]);

  const hideColumn = groupBy ? { [groupBy]: true } : {};
  const visibleColumns = COLUMN_COUNT - (groupBy ? 1 : 0);

  const hasFilters = Object.values(filters).some(Boolean);

  const standingCounts = applications.reduce((acc, app) => {
    const s = getFinanceStanding(app);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return (
    <section className="company-browser">
      <div className="company-browser__header">
        <div>
          <h2>Browse companies</h2>
          <p>Compare all companies side by side — scroll horizontally if needed</p>
        </div>
        <div className="company-browser__summary">
          {FINANCE_STANDINGS.filter((s) => standingCounts[s]).map((s) => (
            <button
              key={s}
              type="button"
              className={`standing-pill ${filters.financeStanding === s ? 'standing-pill--active' : ''}`}
              style={{ '--standing-color': FINANCE_STANDING_COLORS[s] }}
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  financeStanding: f.financeStanding === s ? '' : s,
                }))
              }
            >
              <span className="standing-pill__count">{standingCounts[s]}</span>
              {FINANCE_STANDING_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="company-browser__filters">
        <div className="company-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search companies…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>

        <FilterSelect
          label="Industry"
          value={filters.industry}
          onChange={(v) => setFilters((f) => ({ ...f, industry: v }))}
          options={INDUSTRIES}
          labels={INDUSTRY_LABELS}
        />
        <FilterSelect
          label="Business model"
          value={filters.businessModel}
          onChange={(v) => setFilters((f) => ({ ...f, businessModel: v }))}
          options={BUSINESS_MODELS}
          labels={BUSINESS_MODEL_LABELS}
        />
        <FilterSelect
          label="Fundraising stage"
          value={filters.fundingStage}
          onChange={(v) => setFilters((f) => ({ ...f, fundingStage: v }))}
          options={FUNDING_STAGES}
          labels={FUNDING_STAGE_LABELS}
        />
        <FilterSelect
          label="Finance standing"
          value={filters.financeStanding}
          onChange={(v) => setFilters((f) => ({ ...f, financeStanding: v }))}
          options={FINANCE_STANDINGS}
          labels={FINANCE_STANDING_LABELS}
        />

        {hasFilters && (
          <button
            type="button"
            className="clear-filters-btn"
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      <div className="company-browser__group-bar">
        <span className="company-browser__group-label">Group by</span>
        <div className="group-tabs" role="tablist" aria-label="Group companies by">
          {GROUP_BY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={groupBy === opt.value}
              className={`group-tab ${groupBy === opt.value ? 'group-tab--active' : ''}`}
              onClick={() => setGroupBy(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <p className="company-browser__count">
        Showing {filtered.length} of {applications.length} companies
        {groupBy
          ? ` · grouped by ${GROUP_BY_OPTIONS.find((o) => o.value === groupBy)?.label.toLowerCase()}`
          : ''}
        {' · '}sorted by recency
      </p>

      <div className="company-table-wrap">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>No companies match your filters.</p>
            <p>Try adjusting filters or add companies via voice dump.</p>
          </div>
        ) : (
          <table className="company-table">
            <thead>
              <tr>
                <th className="company-table__th company-table__th--company">Company</th>
                <th className="company-table__th">Role</th>
                {!hideColumn.status && <th className="company-table__th">Status</th>}
                {!hideColumn.industry && <th className="company-table__th">Industry</th>}
                {!hideColumn.businessModel && <th className="company-table__th">Model</th>}
                <th className="company-table__th">Stage</th>
                <th className="company-table__th">Last round</th>
                <th className="company-table__th">$M raised</th>
                <th className="company-table__th">Finance</th>
                <th className="company-table__th">Funding summary</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <Fragment key={group.key ?? 'all'}>
                  {group.label && (
                    <tr className="company-table__group-row">
                      <td colSpan={visibleColumns}>
                        <span className="company-table__group-label">{group.label}</span>
                        <span className="company-table__group-count">
                          {group.items.length} {group.items.length === 1 ? 'company' : 'companies'}
                        </span>
                      </td>
                    </tr>
                  )}
                  {group.items.map((app) => (
                    <CompanyTableRow
                      key={app.id}
                      app={app}
                      onUpdate={onUpdate}
                      hideColumn={hideColumn}
                    />
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
