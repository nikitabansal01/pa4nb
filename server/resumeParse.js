import OpenAI from 'openai';

export const EMPTY_SNAPSHOT = {
  currentRole: '',
  yearsExperience: '',
  previousRoles: '',
  industries: '',
  skills: '',
  productsBuilt: '',
  leadership: '',
};

const HEURISTIC_RESUME = {
  currentRole: 'Senior Product Manager',
  yearsExperience: '8',
  previousRoles: 'Product Manager, Associate PM, Business Analyst',
  industries: 'SaaS, Fintech, Marketplace',
  skills: 'Roadmapping, discovery, experimentation, stakeholder alignment, SQL',
  productsBuilt: 'B2B analytics dashboard, onboarding funnel, internal ops tooling',
  leadership: 'Led a cross-functional squad of 7; mentored 2 PMs',
};

const HEURISTIC_LINKEDIN = {
  currentRole: 'Senior Product Manager',
  yearsExperience: '8',
  previousRoles: 'Product Manager · Associate PM · Business Analyst',
  industries: 'SaaS, Fintech',
  skills: 'Product management, roadmapping, stakeholder management',
  productsBuilt: 'Analytics and onboarding products',
  leadership: 'Managed cross-functional partners',
};

function sanitizeSnapshot(raw = {}) {
  const next = { ...EMPTY_SNAPSHOT };
  for (const key of Object.keys(EMPTY_SNAPSHOT)) {
    const value = raw[key];
    next[key] = value == null ? '' : String(value).trim();
  }
  return next;
}

function heuristicSnapshot(source) {
  return sanitizeSnapshot(source === 'linkedin' ? HEURISTIC_LINKEDIN : HEURISTIC_RESUME);
}

const SYSTEM_PROMPT = `You extract a structured career snapshot from resume text or a LinkedIn URL.
Return JSON only with these string fields:
currentRole, yearsExperience, previousRoles, industries, skills, productsBuilt, leadership.

Rules:
- Ground every field in the provided text/URL. Do not invent employers or metrics that are not supported.
- If a field is unknown, return an empty string.
- yearsExperience should be a number-like string when possible (e.g. "8").
- previousRoles: concise comma-separated titles.
- skills: concise comma-separated skills evidenced in the text.
- productsBuilt: what they shipped or owned, concise.
- leadership: teams led, mentoring, influence — only if evidenced.
- For LinkedIn URL-only input with little text, leave thin fields empty rather than guessing.`;

/**
 * Parse resume text or LinkedIn URL into a career snapshot.
 * Uses OpenAI when OPENAI_API_KEY is set; otherwise heuristic demo snapshot.
 */
export async function parseCareerResume({
  source = 'upload',
  text = '',
  linkedinUrl = '',
  fileName = '',
} = {}) {
  const cleanedText = String(text || '').trim();
  const url = String(linkedinUrl || '').trim();
  const hasSubstance = cleanedText.length >= 40 || url.length >= 12;

  const fallback = () => ({
    mode: 'heuristic',
    snapshot: heuristicSnapshot(source),
    warning: hasSubstance
      ? null
      : 'Limited input — using a demo snapshot. Paste resume text for grounded parsing.',
  });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallback();
  }

  if (!hasSubstance) {
    return fallback();
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            source,
            fileName: fileName || null,
            linkedinUrl: url || null,
            resumeText: cleanedText || null,
          }),
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0].message.content || '{}');
    const snapshot = sanitizeSnapshot(parsed);
    const filled = Object.values(snapshot).filter(Boolean).length;

    if (filled === 0) {
      return fallback();
    }

    return {
      mode: 'llm',
      snapshot,
      warning: null,
    };
  } catch (error) {
    console.error('Resume parse LLM failed, using heuristic:', error.message);
    return {
      ...fallback(),
      warning: 'AI parse failed — showing a demo snapshot. Try pasting resume text.',
    };
  }
}
