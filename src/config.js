/**
 * @typedef {Object} Config
 * @property {string|undefined} token
 * @property {string} prefix
 * @property {string} name
 * @property {string|null} cookiesFile
 * @property {Object} economy
 * @property {number} economy.maxBetAmount
 * @property {number} economy.gambleCooldownMs
 * @property {number} economy.betCooldownMs
 * @property {number} economy.redeemCooldownMs
 * @property {number} economy.creatorCutPercent
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @type {Config}
 */
const config = {
  token: process.env.DISCORD_TOKEN,
  prefix: process.env.BOT_PREFIX || '/bp',
  name: process.env.BOT_NAME || 'BottedPlant',
  cookiesFile: null,
  economy: {
    maxBetAmount: parseInt(process.env.ECONOMY_MAX_BET) || 10000,
    gambleCooldownMs: parseInt(process.env.ECONOMY_GAMBLE_COOLDOWN_MS) || 5 * 60 * 1000, // 5 min
    betCooldownMs: parseInt(process.env.ECONOMY_BET_COOLDOWN_MS) || 30 * 1000, // 30 sec
    redeemCooldownMs: parseInt(process.env.ECONOMY_REDEEM_COOLDOWN_MS) || 60 * 1000, // 1 min
    creatorCutPercent: parseFloat(process.env.ECONOMY_CREATOR_CUT) || 0.05, // 5%
  },
};

const dataDir = path.join(__dirname, '..', 'data');
const defaultCookiesFile = path.join(dataDir, 'cookies.txt');

// Custom cookie file support: check env var first, then fallback to auto-detect data/cookies.txt
let cookiesFile = null;
if (process.env.YTDLP_COOKIES_FILE) {
  const customPath = path.resolve(process.env.YTDLP_COOKIES_FILE);
  if (fs.existsSync(customPath)) {
    cookiesFile = customPath;
    logger.info({ customPath }, '[Config] Using custom cookies file');
  } else {
    logger.warn({ customPath }, '[Config] YTDLP_COOKIES_FILE is set but file not found');
  }
}

// Fallback to auto-detect data/cookies.txt if no custom file was set
if (!cookiesFile && fs.existsSync(defaultCookiesFile)) {
  cookiesFile = defaultCookiesFile;
}

config.cookiesFile = cookiesFile;

export default config;