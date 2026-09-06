import { resolve } from 'node:path';
import studioApi from '../../../../../scripts/lib/studio-api.js';

export function GET() {
  return new Response(JSON.stringify(studioApi.buildStudioApi(resolve(process.cwd(), '..'))), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
