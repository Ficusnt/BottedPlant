require('dotenv').config();
const fs = require('fs');
const path = require('path');

const config = {
  token: process.env.DISCORD_TOKEN,
  prefix: process.env.BOT_PREFIX || '/bp',
  name: process.env.BOT_NAME || 'BottedPlant',
  cookieBrowser: process.env.COOKIE_BROWSER || null,
};

const dataDir = path.join(__dirname, '..', 'data');
const cookiesFile = path.join(dataDir, 'cookies.txt');

// Auto-detect data/cookies.txt (Option B from .env).
// This is a one-time synchronous check at module load — not a hot path — so
// it does not block the event loop during handling.
config.cookiesFile = fs.existsSync(cookiesFile) ? cookiesFile : null;

module.exports = config;