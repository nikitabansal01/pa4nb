import OpenAI from 'openai';

const DOUBT_RE =
  /\b(not sure|don'?t know|do not know|no idea|unclear|confused|i'?m guessing|guessing|unsure|not clear|haven'?t researched|didn'?t research|what (exactly )?does|who (are|is) (the )?(end[- ]?)?users?|who (do|does) they (sell|serve)|what('?s| is) their product|i forget|need (more )?context|can you (tell|remind|clarify)|help me understand)\b/i;

/**
 * Fast heuristic: candidate seems stuck on company/product/user facts.
 */
export function looksDoubtful(text = '') {
  const t = String(text || '').trim();
  if (!t) return false;
  if (t.length < 12 && /^(idk|dunno|n\/a|\?+|no)$/i.test(t)) return true;
  return DOUBT_RE.test(t);
}

/**
 * Classify doubt with OpenAI when available; falls back to heuristic.
 * @returns {{ doubtful: boolean, topics: string[], query: string, reason: string }}
 */
export async function assessCandidateDoubt({
  userMessage,
  company,
  role,
  lastInterviewerPrompt = '',
}) {
  const base = {
    doubtful: looksDoubtful(userMessage),
    topics: [],
    query: `${company} product customers what they do`,
    reason: '',
  };

  if (!userMessage?.trim()) {
    return { ...base, doubtful: false };
  }

  if (!process.env.OPENAI_API_KEY) {
    if (base.doubtful) {
      base.topics = ['product', 'end_users'];
      base.reason = 'Candidate signaled uncertainty about company/product context.';
    }
    return base;
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You detect when a mock-interview candidate is uncertain about the COMPANY/PRODUCT/USERS (not normal interview hesitation about their own answer quality).
Return ONLY JSON:
{
  "doubtful": boolean,
  "topics": ["product"|"end_users"|"business_model"|"market"|"competitors"|"other"],
  "query": "short web search query to help them",
  "reason": "one short sentence"
}
Mark doubtful=true if they admit not knowing who the end user is, what the product does/solves, the business model, market, or ask for that context.
Mark doubtful=false for normal short answers, tradeoff uncertainty, or "I'm not sure which metric" when they still show company understanding.`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            company,
            role,
            lastInterviewerPrompt,
            candidateMessage: userMessage,
          }),
        },
      ],
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    const topics = Array.isArray(parsed.topics)
      ? parsed.topics.map((t) => String(t)).filter(Boolean).slice(0, 4)
      : [];
    return {
      doubtful: Boolean(parsed.doubtful) || base.doubtful,
      topics: topics.length ? topics : (base.doubtful ? ['product', 'end_users'] : []),
      query: String(parsed.query || base.query).trim() || base.query,
      reason: String(parsed.reason || '').trim(),
    };
  } catch (error) {
    console.error('Doubt assessment failed:', error.message);
    if (base.doubtful) {
      base.topics = ['product', 'end_users'];
      base.reason = 'Candidate signaled uncertainty about company/product context.';
    }
    return base;
  }
}

async function fetchDuckDuckGo(query) {
  const url = `https://api.duckduckgo.com/?${new URLSearchParams({
    q: query,
    format: 'json',
    no_html: '1',
    skip_disambig: '1',
  }).toString()}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const bits = [];
  if (data.AbstractText) bits.push(String(data.AbstractText).trim());
  if (data.Heading) bits.push(`Known as: ${data.Heading}`);
  const related = Array.isArray(data.RelatedTopics) ? data.RelatedTopics : [];
  for (const item of related.slice(0, 4)) {
    const text = item?.Text || item?.Topics?.[0]?.Text;
    if (text) bits.push(String(text).trim());
  }
  if (!bits.length) return null;
  return {
    source: 'duckduckgo',
    summary: bits.slice(0, 6).join('\n'),
    url: data.AbstractURL || null,
  };
}

async function fetchWikipediaSummary(company) {
  const title = encodeURIComponent(String(company || '').trim());
  if (!title) return null;
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'ObserveYourLifeMockInterview/1.0' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.extract) return null;
  return {
    source: 'wikipedia',
    summary: String(data.extract).trim(),
    url: data.content_urls?.desktop?.page || null,
  };
}

async function researchWithOpenAIWeb({ company, role, topics, query, briefing }) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const topicLine = (topics || []).join(', ') || 'product, end users, problem solved';
  const prompt = `Research the company "${company}" for a mock interview practice session.
Role in focus: ${role || 'n/a'}
Candidate needs help with: ${topicLine}
Search focus: ${query}

Return concise grounded facts only (no fluff). Prefer official positioning: what they sell, who buys vs who uses, problem solved, business model hints.
If sources conflict, say so briefly.
Keep under 180 words.
Also list 3 short bullet facts a candidate can reuse immediately.`;

  // Prefer Responses API + web_search; fall back to preview tool name if needed.
  let response;
  try {
    response = await openai.responses.create({
      model: 'gpt-5.4-mini',
      tools: [{ type: 'web_search' }],
      tool_choice: 'required',
      input: prompt,
    });
  } catch {
    response = await openai.responses.create({
      model: 'gpt-5.4-mini',
      tools: [{ type: 'web_search_preview' }],
      tool_choice: 'required',
      input: prompt,
    });
  }

  const text = String(response.output_text || '').trim();
  if (!text) return null;

  const known = [
    briefing?.company?.whatTheyDo,
    ...(briefing?.company?.products || []),
    briefing?.company?.customers,
  ].filter(Boolean).join(' · ');

  return {
    source: 'openai_web',
    summary: text,
    url: null,
    knownContext: known || null,
  };
}

/**
 * Look up company context to support a doubtful candidate.
 */
export async function researchCompanySupport({
  company,
  role,
  topics = [],
  query,
  briefing = null,
}) {
  const q = query || `${company} product customers what they do`;
  const pack = {
    company,
    query: q,
    topics,
    summary: '',
    bullets: [],
    sources: [],
    mode: null,
  };

  if (process.env.OPENAI_API_KEY) {
    try {
      const web = await researchWithOpenAIWeb({
        company,
        role,
        topics,
        query: q,
        briefing,
      });
      if (web?.summary) {
        pack.summary = web.summary;
        pack.mode = 'openai_web';
        pack.sources.push({ label: 'Web search', url: web.url });
        pack.bullets = extractBullets(web.summary);
        return pack;
      }
    } catch (error) {
      console.error('OpenAI web research failed:', error.message);
    }
  }

  // Public fallbacks (no key).
  const settled = await Promise.allSettled([
    fetchDuckDuckGo(q),
    fetchDuckDuckGo(`${company} AI company product`),
    fetchWikipediaSummary(company),
  ]);

  const chunks = [];
  for (const item of settled) {
    if (item.status !== 'fulfilled' || !item.value?.summary) continue;
    chunks.push(item.value.summary);
    pack.sources.push({
      label: item.value.source,
      url: item.value.url || null,
    });
  }

  if (!chunks.length) {
    // Last resort: compress briefing we already have into support text.
    const fallback = [
      briefing?.company?.whatTheyDo,
      (briefing?.company?.products || []).join('; '),
      briefing?.company?.customers
        ? `Customers: ${briefing.company.customers}`
        : '',
      briefing?.company?.businessModel
        ? `Business model: ${briefing.company.businessModel}`
        : '',
    ].filter(Boolean);
    if (!fallback.length) return null;
    pack.summary = fallback.join('\n');
    pack.mode = 'briefing_only';
    pack.bullets = fallback.slice(0, 3);
    return pack;
  }

  pack.summary = chunks.join('\n\n').slice(0, 1600);
  pack.mode = 'public_web';
  pack.bullets = extractBullets(pack.summary);
  return pack;
}

function extractBullets(text = '') {
  const lines = String(text).split('\n').map((l) => l.trim()).filter(Boolean);
  const bullets = lines
    .filter((l) => /^([-*•]|\d+\.)\s+/.test(l))
    .map((l) => l.replace(/^([-*•]|\d+\.)\s+/, ''))
    .slice(0, 5);
  if (bullets.length) return bullets;
  return lines.slice(0, 3);
}

export function formatResearchForPrompt(research) {
  if (!research?.summary) return '';
  return [
    'LIVE COMPANY RESEARCH (candidate seemed unsure — coach with this, then continue the exercise):',
    `Query: ${research.query}`,
    `Topics: ${(research.topics || []).join(', ') || 'general'}`,
    research.summary,
    research.bullets?.length ? `Reusable bullets:\n- ${research.bullets.join('\n- ')}` : '',
  ].filter(Boolean).join('\n');
}
