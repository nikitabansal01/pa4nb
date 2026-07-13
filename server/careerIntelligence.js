import OpenAI from 'openai';
import {
  CAREER_DIRECTIONS,
  TRACKS,
  inferCareerTrack,
  recommendCareerPaths,
} from '../client/src/careerDirections.js';

const RANK_LABELS = ['Best match', 'Worth exploring', 'Stretch option'];

function catalogForPrompt(track) {
  return CAREER_DIRECTIONS
    .filter((d) => d.track === track)
    .map((d) => ({
      id: d.id,
      title: d.title,
      category: d.category,
      focusAreas: d.focusAreas,
    }));
}

function directionById(id) {
  return CAREER_DIRECTIONS.find((d) => d.id === id) || null;
}

function hydrateRoute(raw, index, snapshot) {
  const direction = directionById(raw.id);
  if (!direction) return null;

  const strengths = Array.isArray(raw.strengths)
    ? raw.strengths.map((s) => String(s).trim()).filter(Boolean).slice(0, 3)
    : [];
  const buildNext = Array.isArray(raw.buildNext)
    ? raw.buildNext.map((s) => String(s).trim()).filter(Boolean).slice(0, 2)
    : direction.focusAreas.slice(0, 2);

  while (strengths.length < 3) {
    const fallback = direction.focusAreas[strengths.length];
    if (!fallback || strengths.includes(fallback)) break;
    strengths.push(fallback);
  }

  return {
    id: direction.id,
    title: direction.title,
    track: direction.track,
    trackLabel: TRACKS[direction.track]?.label || direction.track,
    category: direction.category,
    rank: index + 1,
    rankLabel: RANK_LABELS[index] || `Option ${index + 1}`,
    summary: String(raw.summary || direction.exciting || '').trim(),
    whyFits: String(raw.whyFits || '').trim(),
    strengths: strengths.slice(0, 3),
    buildNext: buildNext.slice(0, 2),
    exciting: direction.exciting,
    tradeoffs: String(raw.tradeoffs || direction.tradeoffs || '').trim(),
    deepen: direction.focusAreas.slice(0, 4),
    roles: direction.roles,
    dimensions: direction.dimensions,
    focusAreas: direction.focusAreas.slice(0, 4),
    whatItDoes: direction.focusAreas.slice(0, 4),
    evidence: strengths.slice(0, 3),
    matchScore: null,
    groundedIn: {
      role: snapshot?.currentRole || null,
      years: snapshot?.yearsExperience || null,
    },
  };
}

function buildSystemPrompt(trackLabel) {
  return `You are a career coach for ${trackLabel} professionals.
You recommend exactly 3 career directions from a fixed catalog.

Rules:
- Ground every claim in the provided resume snapshot and reflection answers. Do not invent employers, skills, or achievements that are not supported by the input.
- strengths must be concrete capabilities already evidenced in the resume/reflection (max 3, short phrases).
- buildNext must be gaps relative to that route (max 2, short phrases).
- summary: one sentence on what the role is.
- whyFits: one or two sentences tying THIS person's background + stated preferences to the route.
- rankLabel must be exactly: "Best match", "Worth exploring", "Stretch option" in that order.
- Pick three DISTINCT catalog ids. Prefer diversity across emerging vs core when the resume supports it.
- If the person is clearly PM/Eng/DS, stay in that track's catalog only.
- Return JSON only.`;
}

/**
 * Recommend top-3 career routes.
 * Uses OpenAI when OPENAI_API_KEY is set; otherwise heuristic ranking.
 */
export async function recommendCareerRoutes({
  snapshot = {},
  reflection = {},
  assumptions = {},
} = {}) {
  const trackInfo = inferCareerTrack(snapshot);
  const track = trackInfo.track;
  const trackLabel = TRACKS[track]?.label || 'Product Manager';
  const catalog = catalogForPrompt(track);

  const heuristic = () => ({
    mode: 'heuristic',
    track,
    trackLabel,
    paths: recommendCareerPaths(snapshot, assumptions, {
      answers: reflection,
      limit: 3,
    }),
  });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return heuristic();
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(trackLabel) },
        {
          role: 'user',
          content: JSON.stringify({
            task: 'Recommend exactly 3 career routes from catalog',
            inferredTrack: track,
            resumeSnapshot: snapshot,
            reflectionAnswers: reflection,
            preferenceAssumptions: assumptions,
            catalog,
            outputSchema: {
              routes: [
                {
                  id: 'catalog-id',
                  rankLabel: 'Best match | Worth exploring | Stretch option',
                  summary: 'one sentence',
                  whyFits: 'grounded explanation',
                  strengths: ['short', 'short', 'short'],
                  buildNext: ['short', 'short'],
                  tradeoffs: 'one sentence',
                },
              ],
            },
          }),
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0].message.content || '{}');
    const rawRoutes = Array.isArray(parsed.routes) ? parsed.routes : [];
    const seen = new Set();
    const paths = [];

    for (const raw of rawRoutes) {
      if (!raw?.id || seen.has(raw.id)) continue;
      const hydrated = hydrateRoute(raw, paths.length, snapshot);
      if (!hydrated) continue;
      seen.add(raw.id);
      paths.push(hydrated);
      if (paths.length === 3) break;
    }

    if (paths.length < 3) {
      const fallback = recommendCareerPaths(snapshot, assumptions, {
        answers: reflection,
        limit: 3,
      });
      for (const route of fallback) {
        if (seen.has(route.id)) continue;
        paths.push({
          ...route,
          rank: paths.length + 1,
          rankLabel: RANK_LABELS[paths.length] || route.rankLabel,
        });
        seen.add(route.id);
        if (paths.length === 3) break;
      }
    }

    if (paths.length === 0) {
      return heuristic();
    }

    return {
      mode: 'llm',
      track,
      trackLabel,
      paths: paths.slice(0, 3).map((p, i) => ({
        ...p,
        rank: i + 1,
        rankLabel: RANK_LABELS[i],
      })),
    };
  } catch (error) {
    console.error('Career recommend LLM failed, using heuristic:', error.message);
    return heuristic();
  }
}
