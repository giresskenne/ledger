// OpenAI client (optional)
// Used for “AI Snapshot” insights. Sends only aggregated portfolio summary (no PII).

export type OpenAIResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: string; error?: unknown };

export type PortfolioAISnapshot = {
  bullets: string[];
  generatedAt: string;
  model: string;
};

function getApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY as string | undefined;
  return key || null;
}

export function isOpenAIConfigured() {
  return getApiKey() !== null;
}

function safeParseJSON<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function coerceBullets(text: string) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-•]\s*/, ''))
    .slice(0, 6);
}

export async function generatePortfolioAISnapshot(input: {
  baseCurrency: string;
  totalValue: number;
  topCategories: { name: string; percentage: number }[];
  topSectors: { name: string; percentage: number }[];
  topCountries: { name: string; percentage: number }[];
  concentrationAlertsCount?: number;
}): Promise<OpenAIResult<PortfolioAISnapshot>> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { ok: false, reason: 'OpenAI API key not configured' };
  }

  const model =
    (process.env.EXPO_PUBLIC_VIBECODE_OPENAI_MODEL as string | undefined) ??
    'gpt-4o-mini';

  const system = [
    'You are a helpful assistant for an investment tracking app.',
    'Provide observational insights only — no investment advice, no buy/sell/allocate recommendations, no target percentages.',
    'Use cautious language (may/could/looks like). Keep it calm and non-alarmist.',
    'Output MUST be valid JSON: {"bullets": ["...","..."]} with 3–5 short bullets.',
  ].join(' ');

  const user = {
    baseCurrency: input.baseCurrency,
    totalValue: input.totalValue,
    topCategories: input.topCategories,
    topSectors: input.topSectors,
    topCountries: input.topCountries,
    concentrationAlertsCount: input.concentrationAlertsCount ?? 0,
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 350,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `Portfolio summary:\n${JSON.stringify(user)}` },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { ok: false, reason: `OpenAI request failed (HTTP ${response.status})`, error: body };
    }

    const json = (await response.json()) as any;
    const text = json?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) {
      return { ok: false, reason: 'OpenAI returned an empty response' };
    }

    const parsed = safeParseJSON<{ bullets?: unknown }>(text);
    const bullets = Array.isArray(parsed?.bullets)
      ? (parsed!.bullets as unknown[])
          .filter((b) => typeof b === 'string')
          .map((b) => (b as string).trim())
          .filter(Boolean)
          .slice(0, 6)
      : coerceBullets(text);

    if (bullets.length === 0) {
      return { ok: false, reason: 'Could not parse AI insights' };
    }

    return {
      ok: true,
      data: {
        bullets,
        generatedAt: new Date().toISOString(),
        model,
      },
    };
  } catch (error) {
    return { ok: false, reason: 'Network error calling OpenAI', error };
  }
}

