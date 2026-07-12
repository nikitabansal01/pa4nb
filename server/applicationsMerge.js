export function stripExamples(applications) {
  return Array.isArray(applications) ? applications.filter((app) => !app.isExample) : [];
}

export function mergeApplicationLists(...lists) {
  const byId = new Map();
  const byCompany = new Map();

  const companyKey = (company) =>
    String(company || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

  for (const list of lists) {
    for (const app of stripExamples(list)) {
      if (!app?.id) continue;
      const key = companyKey(app.company);
      const existingByCompany = key ? byCompany.get(key) : null;
      if (existingByCompany) {
        const merged = {
          ...existingByCompany,
          ...app,
          id: existingByCompany.id,
          isExample: false,
          interviewDates: [...new Set([
            ...(existingByCompany.interviewDates || []),
            ...(app.interviewDates || []),
          ])],
          googleEventIds: [...new Set([
            ...(existingByCompany.googleEventIds || []),
            ...(app.googleEventIds || []),
          ])],
          notes: [existingByCompany.notes, app.notes].filter(Boolean).join('\n').trim()
            || existingByCompany.notes
            || app.notes
            || '',
        };
        byId.delete(existingByCompany.id);
        byId.set(merged.id, merged);
        byCompany.set(key, merged);
      } else {
        byId.set(app.id, { ...app, isExample: false });
        if (key) byCompany.set(key, byId.get(app.id));
      }
    }
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
  );
}

export function applyVoiceDumpResult(existingApps, result) {
  const map = new Map(stripExamples(existingApps).map((app) => [app.id, app]));

  for (const app of result.applications || []) {
    if (!app?.id) continue;
    map.set(app.id, app);
  }

  return [...map.values()].sort(
    (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
  );
}
