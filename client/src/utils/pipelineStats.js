const STAGE_RANK = {
  offer: 8,
  onsite: 7,
  interview_completed: 6,
  interview_scheduled: 5,
  phone_screen: 4,
  recruiter_screen: 3,
  applied: 2,
  rejected: 1,
  withdrawn: 0,
};

function normalizeCompanyKey(company) {
  return (company || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function pickPrimaryApplication(apps) {
  return apps.reduce((best, app) => {
    const bestRank = STAGE_RANK[best.status] ?? 0;
    const appRank = STAGE_RANK[app.status] ?? 0;
    if (appRank > bestRank) return app;
    if (appRank < bestRank) return best;
    return new Date(app.updatedAt || 0) > new Date(best.updatedAt || 0) ? app : best;
  });
}

export function getUniqueCompanyApplications(applications) {
  const groups = new Map();

  for (const app of applications) {
    if (app.isExample || !app.company?.trim()) continue;
    const key = normalizeCompanyKey(app.company);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(app);
  }

  return [...groups.values()].map(pickPrimaryApplication);
}

export function getPipelineOverviewStats(applications) {
  const unique = getUniqueCompanyApplications(applications);

  return {
    applied: unique.length,
    recruiterCall: unique.filter((app) => app.status === 'recruiter_screen').length,
    hiringManager: unique.filter((app) => app.status === 'phone_screen').length,
    takeHomeOrOnsite: unique.filter((app) =>
      ['interview_scheduled', 'interview_completed', 'onsite'].includes(app.status)
    ).length,
    interviewDone: unique.filter((app) =>
      ['interview_completed', 'onsite'].includes(app.status)
    ).length,
    rejected: unique.filter((app) => app.status === 'rejected').length,
    offer: unique.filter((app) => app.status === 'offer').length,
    withdrawn: unique.filter((app) => app.status === 'withdrawn').length,
  };
}
