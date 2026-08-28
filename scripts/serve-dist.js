#!/usr/bin/env node
const { distDir } = require('./_lib/paths');
const { serve } = require('./_lib/static-server');

const port = Number(process.env.PORT || 5000);
serve(distDir(), port).then(() => {
  console.log(`[serve] http://127.0.0.1:${port}`);
});
