// Public identifier only. Device authorization never needs an application secret.
export const PUBLISHING_CLIENT_ID = 'Iv23li7mN75GNJ5pR3Ud';
export const PUBLISHING_INSTALLATION_ID = 159950539;
export type PublishingSession = { accessToken: string; refreshToken: string; expiresAt: number; refreshExpiresAt: number };
export type DeviceAuthorization = { deviceCode: string; userCode: string; expiresAt: number; interval: number; session?: PublishingSession };

type OAuthResponse = Record<string, unknown>;
async function oauth(path: string, values: Record<string, string>): Promise<OAuthResponse> {
  const response = await fetch(`https://github.com/login/${path}`, {
    method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: PUBLISHING_CLIENT_ID, ...values }).toString(), signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error('GitHub could not be reached. Check your connection and try again.');
  return response.json();
}
function sessionFromResponse(data: OAuthResponse): PublishingSession {
  if (typeof data.access_token !== 'string' || !/^ghu_[A-Za-z0-9]+$/.test(data.access_token)
    || typeof data.refresh_token !== 'string' || !/^ghr_[A-Za-z0-9]+$/.test(data.refresh_token)
    || typeof data.expires_in !== 'number' || data.expires_in <= 0
    || typeof data.refresh_token_expires_in !== 'number' || data.refresh_token_expires_in <= 0) {
    throw new Error('GitHub sign-in could not be completed. Please connect again in Settings.');
  }
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: Date.now() + data.expires_in * 1000, refreshExpiresAt: Date.now() + data.refresh_token_expires_in * 1000 };
}
export async function beginDeviceAuthorization(): Promise<DeviceAuthorization> {
  const data = await oauth('device/code', {});
  if (typeof data.device_code !== 'string' || typeof data.user_code !== 'string' || !/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(data.user_code)
    || typeof data.expires_in !== 'number' || data.expires_in <= 0) throw new Error('GitHub sign-in is unavailable. Please try again.');
  return { deviceCode: data.device_code, userCode: data.user_code, expiresAt: Date.now() + data.expires_in * 1000, interval: Math.max(5, Number(data.interval) || 5) };
}
export async function pollDeviceAuthorization(device: DeviceAuthorization): Promise<{ session?: PublishingSession; interval: number }> {
  if (device.session) return { session: device.session, interval: device.interval };
  if (device.expiresAt <= Date.now()) throw new Error('The sign-in code expired. Start again to get a new code.');
  const data = await oauth('oauth/access_token', { device_code: device.deviceCode, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' });
  if (data.error === 'authorization_pending') return { interval: device.interval };
  if (data.error === 'slow_down') return { interval: Math.max(device.interval + 5, Number(data.interval) || 0) };
  if (data.error === 'access_denied') throw new Error('GitHub sign-in was cancelled. Your drafts are still saved.');
  if (data.error === 'expired_token') throw new Error('The sign-in code expired. Start again to get a new code.');
  return { session: sessionFromResponse(data), interval: device.interval };
}
export async function renewPublishingSession(session: PublishingSession): Promise<PublishingSession> {
  if (session.refreshExpiresAt <= Date.now()) throw new Error('Please sign in again in Settings to reconnect publishing.');
  return sessionFromResponse(await oauth('oauth/access_token', { grant_type: 'refresh_token', refresh_token: session.refreshToken }));
}
export async function verifyPublishingSession(token: string): Promise<void> {
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' };
  const userResponse = await fetch('https://api.github.com/user', { headers, signal: AbortSignal.timeout(30000) });
  if (!userResponse.ok) throw new Error('GitHub sign-in has expired. Please connect again.');
  const user = await userResponse.json();
  if (user.id !== 96007276) throw new Error('Sign in with JGOLD43, the account that owns your website.');
  const response = await fetch(`https://api.github.com/user/installations/${PUBLISHING_INSTALLATION_ID}/repositories`, { headers, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error('JGOLD cannot access the publishing inbox. Check the JGOLD Studio Publishing installation in GitHub.');
  const data = await response.json();
  if (!data.repositories?.some((repo: { full_name?: string; private?: boolean }) => repo.full_name?.toLowerCase() === 'jgold43/jgold-publishing-inbox' && repo.private === true)) {
    throw new Error('The private publishing inbox is not available to this connection.');
  }
}
