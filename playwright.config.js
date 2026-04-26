module.exports = {
  testDir: './tests',
  webServer: {
    command: 'npm run build && npx http-server dist -p 4173 -s',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    channel: process.env.PLAYWRIGHT_CHROME_CHANNEL || undefined
  }
};
