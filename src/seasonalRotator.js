/**
 * seasonalRotator.js - Seasonal/event phrase rotation
 * Determines active season from date and provides seasonal phrase boosting
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEASONS_FILE = path.join(__dirname, '..', 'data', 'seasons.json');

let seasonsCache = null;
let seasonsMtime = 0;

/**
 * Load seasonal configuration from JSON file
 * @returns {Promise<SeasonConfig[]>}
 */
export async function loadSeasons() {
  try {
    const stats = await fs.stat(SEASONS_FILE);
    if (seasonsCache && stats.mtimeMs === seasonsMtime) {
      return seasonsCache;
    }

    const content = await fs.readFile(SEASONS_FILE, 'utf8');
    const data = JSON.parse(content);
    seasonsCache = data.seasons || [];
    seasonsMtime = stats.mtimeMs;
    logger.info({ count: seasonsCache.length }, '[SeasonalRotator] Loaded seasons config');
    return seasonsCache;
  } catch (err) {
    if (err.code === 'ENOENT') {
      logger.warn('[SeasonalRotator] seasons.json not found, using defaults');
      return getDefaultSeasons();
    }
    logger.error({ err }, '[SeasonalRotator] Failed to load seasons');
    return getDefaultSeasons();
  }
}

/**
 * Get current active season based on date
 * @param {Date} date
 * @param {SeasonConfig[]} seasons
 * @returns {string} Season name
 */
export function getCurrentSeason(date = new Date(), seasons = null) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfYear = getDayOfYear(date);

  // Check custom seasons first (events like Christmas, Halloween)
  if (seasons) {
    for (const season of seasons) {
      if (isDateInRange(dayOfYear, season.start, season.end)) {
        return season.name;
      }
    }
  }

  // Fallback to natural seasons (Southern hemisphere - Argentina)
  if ((month === 12 && day >= 21) || month === 1 || month === 2 || (month === 3 && day < 21)) return 'summer';
  if ((month === 3 && day >= 21) || month === 4 || month === 5 || (month === 6 && day < 21)) return 'autumn';
  if ((month === 6 && day >= 21) || month === 7 || month === 8 || (month === 9 && day < 21)) return 'winter';
  return 'spring';
}

/**
 * Get day of year (1-366)
 * @param {Date} date
 * @returns {number}
 */
export function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Check if dayOfYear falls within range (handles year wraparound)
 * @param {number} dayOfYear
 * @param {string} start - MM-DD format
 * @param {string} end - MM-DD format
 * @returns {boolean}
 */
export function isDateInRange(dayOfYear, start, end) {
  const startDay = getDayOfYearFromMD(start);
  const endDay = getDayOfYearFromMD(end);

  if (startDay <= endDay) {
    return dayOfYear >= startDay && dayOfYear <= endDay;
  } else {
    // Range wraps around year end (e.g., Dec 20 - Jan 10)
    return dayOfYear >= startDay || dayOfYear <= endDay;
  }
}

/**
 * Convert MM-DD to day of year (non-leap year)
 * @param {string} md
 * @returns {number}
 */
export function getDayOfYearFromMD(md) {
  const [month, day] = md.split('-').map(Number);
  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let dayOfYear = day;
  for (let m = 1; m < month; m++) {
    dayOfYear += daysInMonth[m];
  }
  return dayOfYear;
}

/**
 * Get seasonal phrase templates for a category
 * @param {string} category
 * @param {string} season
 * @param {Object} phrasesData
 * @returns {PhraseTemplate[]}
 */
export function getSeasonalPhrases(category, season, phrasesData) {
  if (!phrasesData || !phrasesData[category]) return [];

  const templates = phrasesData[category].templates || [];

  // If category has seasonal overrides, apply them
  if (phrasesData[category].seasonal && phrasesData[category].seasonal[season]) {
    const seasonalTemplates = phrasesData[category].seasonal[season].templates || [];
    // Merge: seasonal templates get priority boost
    return [
      ...seasonalTemplates.map(t => ({ ...t, _seasonal: true, weight: (t.weight || 1) * 2 })),
      ...templates.map(t => ({ ...t, _seasonal: false }))
    ];
  }

  return templates;
}

/**
 * Get all active seasonal boosts for a category
 * @param {string} category
 * @param {string} season
 * @param {Object} phrasesData
 * @returns {Object}
 */
export function getSeasonalBoosts(category, season, phrasesData) {
  if (!phrasesData || !phrasesData[category] || !phrasesData[category].seasonal) {
    return { templates: [], boost: 1 };
  }

  const seasonal = phrasesData[category].seasonal[season];
  if (!seasonal) return { templates: [], boost: 1 };

  return {
    templates: seasonal.templates || [],
    boost: seasonal.boost || 1.5
  };
}

/**
 * Get default seasons configuration (built-in fallbacks)
 * @returns {SeasonConfig[]}
 */
export function getDefaultSeasons() {
  return [
    { name: 'christmas', start: '12-01', end: '12-31', boost: 2 },
    { name: 'newyear', start: '12-30', end: '01-05', boost: 2 },
    { name: 'halloween', start: '10-25', end: '10-31', boost: 2 },
    { name: 'valentine', start: '02-10', end: '02-14', boost: 1.5 },
    { name: 'spring_festival', start: '09-21', end: '09-23', boost: 1.5 },
    { name: 'independence_arg', start: '07-09', end: '07-09', boost: 1.5 }, // Argentina Independence Day
    { name: 'friendship_day', start: '07-20', end: '07-20', boost: 1.5 }, // Día del Amigo
    { name: 'carnaval', start: '02-01', end: '02-28', boost: 1.3 }
  ];
}

/**
 * Reload seasons config (call on hot-reload)
 * @returns {Promise<SeasonConfig[]>}
 */
export async function reloadSeasons() {
  seasonsCache = null;
  seasonsMtime = 0;
  return loadSeasons();
}