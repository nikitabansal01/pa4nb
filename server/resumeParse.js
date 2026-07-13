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

const LINKEDIN_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

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

/** Normalize and validate a LinkedIn /in/ profile URL. */
export function normalizeLinkedInProfileUrl(input) {
  let raw = String(input || '').trim();
  if (!raw) return null;

  raw = raw.replace(/\s+/g, '');
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
  if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return null;

  const match = parsed.pathname.match(/^\/in\/([^/?#]+)\/?/i);
  if (!match) return null;

  let slug;
  try {
    slug = decodeURIComponent(match[1]).trim();
  } catch {
    slug = match[1].trim();
  }
  if (!slug || slug.length < 2 || /^(edit|detail|overlay)$/i.test(slug)) return null;

  return `https://www.linkedin.com/in/${encodeURIComponent(slug)}`;
}

function decodeHtmlEntities(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)));
}

function metaContent(html, nameOrProp) {
  const escaped = nameOrProp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["']`,
      'i'
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["']`,
      'i'
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1]).trim();
  }
  return '';
}

function stripTags(html) {
  return decodeHtmlEntities(
    String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
  ).trim();
}

function extractSectionHtml(html, sectionId) {
  const pattern = new RegExp(
    `<section[^>]*(?:id=["']${sectionId}["']|data-section=["']${sectionId}["'])[^>]*>([\\s\\S]*?)</section>`,
    'i'
  );
  return html.match(pattern)?.[1] || '';
}

function classText(html, className) {
  const pattern = new RegExp(
    `<[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)</(?:span|div|p|h3|h4|a)>`,
    'i'
  );
  const match = html.match(pattern);
  return match ? stripTags(match[1]).replace(/\s+/g, ' ').trim() : '';
}

function extractExperienceEntries(html) {
  const section = extractSectionHtml(html, 'experience');
  if (!section) return [];

  const items = section.match(
    /<li[^>]*class=["'][^"']*experience-item[^"']*["'][^>]*>[\s\S]*?<\/li>/gi
  ) || [];

  return items
    .map((item) => {
      const title = classText(item, 'experience-item__title');
      const company = classText(item, 'experience-item__subtitle');
      const meta = classText(item, 'experience-item__meta-item') || classText(item, 'date-range');
      const yearsMatch = meta.match(/(\d+)\s*years?/i);
      const durationYears = yearsMatch ? Number(yearsMatch[1]) : null;
      if (!title && !company) return null;
      return { title, company, meta, durationYears };
    })
    .filter(Boolean);
}

function formatExperienceBlock(entries) {
  if (!entries.length) return '';
  return entries
    .map((entry, index) => {
      const bits = [
        `${index + 1}. ${entry.title || 'Role'}`,
        entry.company && `@ ${entry.company}`,
        entry.meta && `(${entry.meta})`,
      ].filter(Boolean);
      return bits.join(' ');
    })
    .join('\n');
}

function headlineRole(title) {
  const cleaned = decodeHtmlEntities(title || '')
    .replace(/\s*\|\s*LinkedIn\s*$/i, '')
    .trim();
  // "Name - Role at Company" or "Name - Role"
  const dash = cleaned.match(/^[^-–—]+[-–—]\s*(.+)$/);
  return (dash?.[1] || cleaned).trim();
}

/** Pull readable profile signals from a public LinkedIn HTML page. */
export function extractLinkedInProfileText(html) {
  const title = (html.match(/<title>([^<]*)<\/title>/i)?.[1] || '')
    .replace(/\s*\|\s*LinkedIn\s*$/i, '')
    .trim();
  const description =
    metaContent(html, 'og:description') || metaContent(html, 'description');
  const experienceEntries = extractExperienceEntries(html);
  const experienceBlock = formatExperienceBlock(experienceEntries);

  const aboutHtml = extractSectionHtml(html, 'about');
  const about = aboutHtml ? stripTags(aboutHtml).slice(0, 4000) : '';
  const educationHtml = extractSectionHtml(html, 'education');
  const education = educationHtml ? stripTags(educationHtml).slice(0, 2000) : '';
  const skillsHtml = extractSectionHtml(html, 'skills');
  const skills = skillsHtml ? stripTags(skillsHtml).slice(0, 2000) : '';

  const parts = [
    title && `Name / headline: ${decodeHtmlEntities(title)}`,
    title && `Current role (from headline): ${headlineRole(title)}`,
    description && `Summary: ${description}`,
    about && `About:\n${about}`,
    experienceBlock && `Experience (most recent first):\n${experienceBlock}`,
    education && `Education:\n${education}`,
    skills && `Skills:\n${skills}`,
  ].filter(Boolean);

  return {
    text: parts.join('\n\n').trim(),
    experienceEntries,
    hasExperience: experienceEntries.length > 0,
    hasAbout: Boolean(about),
    hasSkills: Boolean(skills),
  };
}

/** Deterministic fallbacks when the public page only exposes experience. */
export function snapshotFromLinkedInExcerpt(excerpt, llmSnapshot = {}) {
  const snapshot = sanitizeSnapshot(llmSnapshot);
  const entries = excerpt?.experienceEntries || [];

  if (!snapshot.currentRole) {
    snapshot.currentRole =
      entries[0]?.title ||
      headlineRole(excerpt?.headline || '') ||
      '';
  }

  if (!snapshot.previousRoles && entries.length) {
    snapshot.previousRoles = entries
      .map((e) => e.title)
      .filter(Boolean)
      .filter((title, i, arr) => arr.indexOf(title) === i)
      .join(', ');
  }

  if (!snapshot.yearsExperience && entries.length) {
    const years = entries
      .map((e) => e.durationYears)
      .filter((n) => Number.isFinite(n));
    if (years.length) {
      snapshot.yearsExperience = String(Math.max(...years));
    }
  }

  if (!snapshot.leadership) {
    const leadish = entries.find((e) =>
      /\b(chair|founder|head|director|lead|manager|vp|chief|co-founder)\b/i.test(
        `${e.title} ${e.company}`
      )
    );
    if (leadish) {
      snapshot.leadership = [leadish.title, leadish.company].filter(Boolean).join(', ');
    }
  }

  return snapshot;
}

async function fetchLinkedInPublicProfile(profileUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(profileUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': LINKEDIN_UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`LinkedIn returned ${response.status}`);
    }

    const html = await response.text();
    const title = (html.match(/<title>([^<]*)<\/title>/i)?.[1] || '').trim();
    const excerpt = extractLinkedInProfileText(html);
    excerpt.headline = title;

    if (!excerpt.text || excerpt.text.length < 40) {
      throw new Error('Profile page had no readable public content');
    }

    return excerpt;
  } finally {
    clearTimeout(timer);
  }
}

const SYSTEM_PROMPT = `You extract a structured career snapshot from resume text or a LinkedIn profile excerpt.
Return JSON only with these string fields:
currentRole, yearsExperience, previousRoles, industries, skills, productsBuilt, leadership.

Rules:
- Ground every field in the provided text. Do not invent employers or metrics that are not supported.
- If a field is unknown, return an empty string.
- currentRole: use the headline role or most recent experience title.
- yearsExperience: prefer the longest duration shown in Experience (e.g. "8"). Do not sum overlapping roles.
- previousRoles: comma-separated job titles from Experience, most recent first.
- skills: only if explicitly listed.
- productsBuilt: only if the text mentions products, systems, or shipped work.
- leadership: titles like Chair/Founder/Head/Director/Lead count as leadership evidence.
- Public LinkedIn pages are often thin (headline + experience only). Fill what is evidenced; leave the rest empty.`;

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
  let cleanedText = String(text || '').trim();
  const url = String(linkedinUrl || '').trim();
  const isLinkedIn = source === 'linkedin';

  let normalizedUrl = null;
  let linkedInExcerpt = null;
  let linkedInFetchWarning = null;

  if (isLinkedIn || url) {
    normalizedUrl = normalizeLinkedInProfileUrl(url);
    if (isLinkedIn && !normalizedUrl) {
      return {
        mode: 'error',
        snapshot: EMPTY_SNAPSHOT,
        warning: 'That does not look like a LinkedIn profile URL (need linkedin.com/in/…).',
      };
    }
  }

  if (isLinkedIn && normalizedUrl && cleanedText.length < 40) {
    try {
      linkedInExcerpt = await fetchLinkedInPublicProfile(normalizedUrl);
      cleanedText = linkedInExcerpt.text;
      if (!linkedInExcerpt.hasExperience && !linkedInExcerpt.hasAbout) {
        linkedInFetchWarning =
          'LinkedIn only shared a public headline. Paste About + Experience for a fuller snapshot.';
      } else if (!linkedInExcerpt.hasAbout && !linkedInExcerpt.hasSkills) {
        linkedInFetchWarning =
          'Public LinkedIn view is thin (role history only). Paste resume text for skills and products.';
      }
    } catch (error) {
      console.error('LinkedIn profile fetch failed:', error.message);
      return {
        mode: 'error',
        snapshot: EMPTY_SNAPSHOT,
        warning:
          'Could not read that LinkedIn profile (private or blocked). Paste About + Experience text, then Import.',
      };
    }
  }

  const hasSubstance = cleanedText.length >= 40 || (!isLinkedIn && url.length >= 12);

  const fallback = () => ({
    mode: 'heuristic',
    snapshot: heuristicSnapshot(source),
    warning: hasSubstance
      ? linkedInFetchWarning
      : 'Limited input — using a demo snapshot. Paste resume text for grounded parsing.',
  });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    if (isLinkedIn && cleanedText.length >= 40) {
      return {
        mode: 'error',
        snapshot: EMPTY_SNAPSHOT,
        warning:
          'LinkedIn profile was fetched, but AI parsing is offline (missing OPENAI_API_KEY). Paste resume text or set the key.',
      };
    }
    return fallback();
  }

  if (!hasSubstance) {
    return fallback();
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            source,
            fileName: fileName || null,
            linkedinUrl: normalizedUrl || url || null,
            resumeText: cleanedText || null,
          }),
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0].message.content || '{}');
    let snapshot = sanitizeSnapshot(parsed);
    if (linkedInExcerpt) {
      snapshot = snapshotFromLinkedInExcerpt(linkedInExcerpt, snapshot);
    }
    const filled = Object.values(snapshot).filter(Boolean).length;

    if (filled === 0) {
      if (isLinkedIn) {
        return {
          mode: 'error',
          snapshot: EMPTY_SNAPSHOT,
          warning:
            'Could not extract a career snapshot from that profile. Paste About + Experience text instead.',
        };
      }
      return fallback();
    }

    return {
      mode: 'llm',
      snapshot,
      warning: linkedInFetchWarning,
    };
  } catch (error) {
    console.error('Resume parse LLM failed, using heuristic:', error.message);
    if (isLinkedIn) {
      if (linkedInExcerpt) {
        const snapshot = snapshotFromLinkedInExcerpt(linkedInExcerpt, {});
        if (Object.values(snapshot).some(Boolean)) {
          return {
            mode: 'heuristic',
            snapshot,
            warning:
              'AI parse failed — filled what was visible on the public profile. Paste resume text for more.',
          };
        }
      }
      return {
        mode: 'error',
        snapshot: EMPTY_SNAPSHOT,
        warning: 'AI parse failed for that LinkedIn profile. Paste resume text and try again.',
      };
    }
    return {
      ...fallback(),
      warning: 'AI parse failed — showing a demo snapshot. Try pasting resume text.',
    };
  }
}
