const CAMPAIGN_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;
export interface SignupAttribution { [key: string]: string }

// Retain campaign labels and paths, never arbitrary queries, locations,
// email addresses, fragments or a full external referrer URL.
export function signupAttribution(url: string, referrer = ''): SignupAttribution {
  const page = new URL(url);
  const result: SignupAttribution = { landing_page: page.pathname };
  for (const key of CAMPAIGN_KEYS) {
    const value = page.searchParams.get(key);
    if (value && /^[a-zA-Z0-9_. -]{1,100}$/.test(value)) result[key] = value;
  }
  if (referrer) {
    try {
      const source = new URL(referrer);
      if (source.origin !== page.origin && /^https?:$/.test(source.protocol)) result.referrer_host = source.hostname;
    } catch { /* A malformed referrer should never block signup. */ }
  }
  return result;
}

export function isAcceptedSignup(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const success = (body as { success?: unknown }).success;
  return success === true || success === 'true';
}
