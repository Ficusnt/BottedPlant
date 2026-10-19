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
const defaultCookiesFile = path.join(dataDir, 'cookies.txt');

// Custom cookie file support: check env var first, then fallback to auto-detect data/cookies.txt
let cookiesFile = null;
if (process.env.YTDLP_COOKIES_FILE) {
  const customPath = path.resolve(process.env.YTDLP_COOKIES_FILE);
  if (fs.existsSync(customPath)) {
    cookiesFile = customPath;
    console.log(`[Config] Using custom cookies file: ${customPath}`);
  } else {
    console.warn(`[Config] YTDLP_COOKIES_FILE is set but file not found: ${customPath}`);
  }
}

// Fallback to auto-detect data/cookies.txt if no custom file was set
if (!cookiesFile && fs.existsSync(defaultCookiesFile)) {
  cookiesFile = defaultCookiesFile;
}

config.cookiesFile = cookiesFile;

module.exports = config;