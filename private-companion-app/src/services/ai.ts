import type { PublicAiContext } from '@/domain/privacy';

const gatewayUrl = process.env.EXPO_PUBLIC_APP_GATEWAY_URL?.replace(/\/$/, '');

type AiResponse = { message: string };

export function isAiConfigured(): boolean {
  return Boolean(gatewayUrl);
}

export async function askFrontierModel(context: PublicAiContext): Promise<string> {
  if (!gatewayUrl) {
    return [
      'The AI gateway is not connected yet.',
      '',
      `I would send only this ${context.source === 'public-draft' ? 'public draft context' : 'chat message'}—never the private vault.`,
      '',
      'Add EXPO_PUBLIC_APP_GATEWAY_URL to connect a frontier model.',
    ].join('\n');
  }

  const response = await fetch(`${gatewayUrl}/v1/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context }),
  });
  if (!response.ok) throw new Error(`AI request failed (${response.status}).`);
  const payload = (await response.json()) as AiResponse;
  return payload.message;
}

