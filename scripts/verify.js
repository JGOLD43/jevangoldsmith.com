#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const http = require('node:http');
const net = require('node:net');
const { serve } = require('./_lib/static-server.js');

let serverPort = process.env.VERIFY_PORT || '';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...options.env },
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(String(port)));
    });
  });
}

function waitForServer(baseUrl, timeoutMs = 10_000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(baseUrl, (response) => {
        response.resume();
        resolve();
      });

      request.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${baseUrl}`));
          return;
        }
        setTimeout(check, 250);
      });
    };

    check();
  });
}

async function withDistServer(fn) {
  if (!serverPort) serverPort = await getFreePort();
  const baseUrl = `http://127.0.0.1:${serverPort}`;
  const server = await serve('dist', Number(serverPort));
  try {
    await waitForServer(baseUrl);
    await fn(baseUrl);
  } finally {
    server.close();
  }
}

async function main() {
  run('npm', ['run', 'lint']);
  run('npm', ['run', 'check']);
  run('npm', ['run', 'build:fast']);
  run('npm', ['run', 'assets:inventory']);

  await withDistServer(async (baseUrl) => {
    run('npm', ['run', 'smoke'], { env: { BASE_URL: baseUrl } });
  });

  run('npm', ['run', 'test:browser']);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
