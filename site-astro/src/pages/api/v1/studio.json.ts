import { resolve } from 'node:path';
import { createRequire } from 'node:module';

export function GET() {
  const root = resolve(process.cwd(), '..');
  const { buildStudioApi } = createRequire(import.meta.url)(resolve(root, 'scripts/lib/studio-api.js'));
  return new Response(JSON.stringify(buildStudioApi(root)), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
