/**
 * phraseManager.js - Centralized phrase dictionary system
 * Data-driven phrases loaded from data/phrases.json
 * Supports templates, weighted slots, global mannerisms, synonyms, and hot-reload
 */

const fs = require('fs').promises;
const path = require('path');

const PHRASES_FILE = path.join(__dirname, 'data', 'phrases.json');

// Fallback returned when a requested phrase/key doesn't exist
const MISSING_PHRASE = '🌿 *frase extraviada entre mis raíces...*';

let phrasesData = null;
let lastLoaded = 0;

const mediaCooldowns = new Map();
const mediaHourlyCount = new Map();

// ============================================================================
// Weighted Random Selection
// ============================================================================

function weightedRandom(items) {
  if (!items || !items.length) return '';
  const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight || 1;
    if (random <= 0) return item.text;
  }
  return items[items.length - 1].text;
}

function rand(arr) {
  if (!arr || !arr.length) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================================
// Template Rendering
// ============================================================================

function interpolate(text, vars) {
  if (!text) return '';
  return text.replace(/\{(\w+)\}/g, (match, key) => vars[key] !== undefined ? vars[key] : match);
}

function renderTemplate(template, vars, slots) {
  if (!template) return '';
  
  let result = template.replace(/\{(\w+)\}/g, (match, key) => {
    if (slots && slots[key]) {
      return weightedRandom(slots[key]);
    }
    return vars[key] !== undefined ? vars[key] : match;
  });
  
  result = interpolate(result, vars);
  return result;
}

// ============================================================================
// Global Mannerisms & Synonyms
// ============================================================================

function applyGlobalMannerisms(text, data) {
  const mannerisms = data._global?.mannerisms;
  if (!mannerisms || !mannerisms.length) return text;
  
  if (Math.random() < 0.075) {
    const mannerism = weightedRandom(mannerisms);
    if (mannerism) {
      const separator = /[.!?👋🌿🌱🌙💤✨🎵🔂🪴]$/.test(text.trim()) ? ' ' : ' ';
      text = text.trim() + separator + mannerism;
    }
  }
  return text;
}

function applySynonyms(text, data) {
  const synonyms = data._global?.synonyms;
  if (!synonyms) return text;
  
  let result = text;
  for (const [original, alternatives] of Object.entries(synonyms)) {
    const regex = new RegExp(`\\b${original}\\b`, 'gi');
    result = result.replace(regex, (match) => {
      if (Math.random() < 0.3 && alternatives.length > 0) {
        const replacement = rand(alternatives);
        return match[0] === match[0].toUpperCase() 
          ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
          : replacement;
      }
      return match;
    });
  }
  return result;
}

function postProcessPhrase(text, data) {
  let result = applyGlobalMannerisms(text, data);
  result = applySynonyms(result, data);
  return result;
}

// ============================================================================
// Core Functions
// ============================================================================

async function loadPhrases() {
  try {
    const content = await fs.readFile(PHRASES_FILE, 'utf8');
    phrasesData = JSON.parse(content);
    lastLoaded = Date.now();
    console.log('[PhraseManager] Loaded phrases.json v' + phrasesData.version);
    return phrasesData;
  } catch (err) {
    console.error('[PhraseManager] Error loading phrases:', err);
    phrasesData = { 
      version: 0, 
      categories: {}, 
      _global: {
        mannerisms: [
          {text: 'c:', weight: 15},
          {text: 'uwu', weight: 10},
          {text: 'owo', weight: 10},
          {text: ':3', weight: 10},
          {text: 'leaf', weight: 15},
          {text: '', weight: 40}
        ],
        synonyms: {}
      },
      media: { folder: 'data/media', globalChance: 0.08, minIntervalMinutes: 30, maxPerHour: 5 }
    };
    return phrasesData;
  }
}

async function getPhrases() { 
  if (!phrasesData) await loadPhrases(); 
  return phrasesData; 
}

async function getCategory(category) { 
  const data = await getPhrases(); 
  return data.categories[category] || null; 
}

async function reloadPhrases() { 
  console.log('[PhraseManager] Hot-reloading phrases...'); 
  await loadPhrases(); 
  return phrasesData; 
}

async function getPhrase(category, key, type = 'hits', vars = {}) {
  const data = await getPhrases();
  const cat = data.categories[category];
  if (!cat) {
    console.warn('[PhraseManager] Category not found: ' + category);
    return postProcessPhrase(interpolate(MISSING_PHRASE, vars), data);
  }
  
  const entry = cat[key];
  if (!entry) {
    console.warn('[PhraseManager] Key not found: ' + category + '.' + key);
    return postProcessPhrase(interpolate(MISSING_PHRASE, vars), data);
  }
  
  // Support both old format (hits: []) and new format (template + slots)
  let responseText = '';
  
  if (entry.template) {
    // New format: template + slots
    responseText = renderTemplate(entry.template, vars, entry.slots);
  } else if (entry[type] && entry[type].length) {
    // Old format: array of hits/crits/fails
    responseText = rand(entry[type]);
    responseText = interpolate(responseText, vars);
  } else if (entry.hits && entry.hits.length) {
    // Fallback to hits
    responseText = rand(entry.hits);
    responseText = interpolate(responseText, vars);
  } else {
    console.warn('[PhraseManager] No ' + type + ' responses for ' + category + '.' + key);
    return postProcessPhrase(interpolate(MISSING_PHRASE, vars), data);
  }
  
  return postProcessPhrase(responseText, data);
}

// ============================================================================
// Trigger Response
// ============================================================================

async function getTriggerResponse(category, content) {
  const data = await getPhrases();
  const cat = data.categories[category];
  if (!cat) return null;
  
  const lower = content.toLowerCase();
  let match = null, matchKey = null;
  
  for (const [key, entry] of Object.entries(cat)) {
    const patterns = entry.patterns || entry.keywords;
    if (!patterns || !patterns.length) continue;
    if (patterns.some(p => lower.includes(p.toLowerCase()))) {
      match = entry;
      matchKey = key;
      break;
    }
  }
  
  if (!match) return null;
  
  const roll = Math.floor(Math.random() * 20) + 1;
  let responseType, responseText;
  
  if (roll === 1) {
    responseType = 'fail';
    responseText = rand(match.fails || match.hits || []);
  } else if (roll === 20) {
    responseType = 'crit';
    responseText = rand(match.crits || match.hits || []);
  } else {
    responseType = 'hit';
    responseText = rand(match.hits || []);
  }
  
  responseText = postProcessPhrase(interpolate(responseText, {}), data);
  
  let mediaFile = null;
  if (match.media && match.media.length && Math.random() < (match.mediaChance || data.media?.globalChance || 0.08)) {
    const canSend = await checkMediaCooldown(content);
    if (canSend) {
      mediaFile = rand(match.media);
      await updateMediaCooldown(content);
    }
  }
  
  return { text: responseText, type: responseType, roll: roll, key: matchKey, mediaFile: mediaFile };
}

// ============================================================================
// Media Cooldowns
// ============================================================================

async function checkMediaCooldown(content) {
  const data = await getPhrases();
  const now = Date.now();
  const minInterval = (data.media?.minIntervalMinutes || 30) * 60 * 1000;
  const maxPerHour = data.media?.maxPerHour || 5;
  const hourKey = Math.floor(now / (60 * 60 * 1000));
  const hourly = mediaHourlyCount.get(hourKey) || { count: 0, hourStart: hourKey };
  if (hourly.count >= maxPerHour) return false;
  const lastMedia = mediaCooldowns.get('global') || 0;
  if (now - lastMedia < minInterval) return false;
  return true;
}

async function updateMediaCooldown(content) {
  const now = Date.now();
  mediaCooldowns.set('global', now);
  const hourKey = Math.floor(now / (60 * 60 * 1000));
  const hourly = mediaHourlyCount.get(hourKey) || { count: 0, hourStart: hourKey };
  hourly.count++;
  mediaHourlyCount.set(hourKey, hourly);
  for (const [key, val] of mediaHourlyCount.entries()) {
    if (key < hourKey - 1) mediaHourlyCount.delete(key);
  }
}

// ============================================================================
// Utility Exports
// ============================================================================

async function getUwuEnding() {
  const data = await getPhrases();
  return weightedRandom(data._global?.mannerisms || [{text: ' uwu', weight: 1}]);
}

async function listPhrases(category = null) {
  const data = await getPhrases();
  if (category) {
    const cat = data.categories[category];
    if (!cat) return null;
    return Object.keys(cat).map(key => ({
      key,
      types: Object.keys(cat[key]).filter(k => 
        (Array.isArray(cat[key][k]) && cat[key][k].length) || 
        k === 'template'
      )
    }));
  }
  const result = {};
  for (const [catName, cat] of Object.entries(data.categories)) {
    result[catName] = Object.keys(cat).map(key => ({
      key,
      types: Object.keys(cat[key]).filter(k => 
        (Array.isArray(cat[key][k]) && cat[key][k].length) || 
        k === 'template'
      )
    }));
  }
  return result;
}

async function addPhrase(category, key, type, text) {
  const data = await getPhrases();
  if (!data.categories[category]) data.categories[category] = {};
  if (!data.categories[category][key]) data.categories[category][key] = { hits: [], crits: [], fails: [] };
  if (!data.categories[category][key][type]) data.categories[category][key][type] = [];
  data.categories[category][key][type].push(text);
  await savePhrases(data);
  return true;
}

async function editPhrase(category, key, type, index, newText) {
  const data = await getPhrases();
  if (!data.categories[category]?.[key]?.[type]?.[index]) return false;
  data.categories[category][key][type][index] = newText;
  await savePhrases(data);
  return true;
}

async function deletePhrase(category, key, type, index) {
  const data = await getPhrases();
  if (!data.categories[category]?.[key]?.[type]?.[index]) return false;
  data.categories[category][key][type].splice(index, 1);
  if (data.categories[category][key][type].length === 0) delete data.categories[category][key][type];
  if (Object.keys(data.categories[category][key]).length === 0) delete data.categories[category][key];
  await savePhrases(data);
  return true;
}

async function savePhrases(data) {
  try {
    await fs.writeFile(PHRASES_FILE, JSON.stringify(data, null, 2), 'utf8');
    phrasesData = data;
    lastLoaded = Date.now();
    console.log('[PhraseManager] Saved phrases.json');
    return true;
  } catch (err) {
    console.error('[PhraseManager] Error saving phrases:', err);
    return false;
  }
}

async function getMediaFolder() {
  const data = await getPhrases();
  return path.join(__dirname, data.media?.folder || 'data/media');
}

async function listMedia() {
  const mediaDir = await getMediaFolder();
  try {
    const files = await fs.readdir(mediaDir);
    return files.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm'].includes(ext);
    });
  } catch (err) {
    console.error('[PhraseManager] Error listing media:', err);
    return [];
  }
}

loadPhrases().catch(err => console.error('[PhraseManager] Initial load failed:', err));

module.exports = {
  loadPhrases,
  reloadPhrases,
  getPhrase,
  getTriggerResponse,
  getCategory,
  getUwuEnding,
  listPhrases,
  addPhrase,
  editPhrase,
  deletePhrase,
  savePhrases,
  getMediaFolder,
  listMedia,
  rand,
  interpolate,
  weightedRandom,
  renderTemplate
};