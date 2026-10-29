/**
 * phraseManager.js - Centralized phrase dictionary system
 * Data-driven phrases loaded from data/phrases.json
 * Supports templates, weighted slots, global mannerisms, synonyms, seasonal rotation, and hot-reload
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger.js';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PHRASES_FILE = path.join(__dirname, '..', 'data', 'phrases.json');
const SEASONS_FILE = path.join(__dirname, '..', 'data', 'seasons.json');

// New module imports
import { buildContext, selectWithContext, getCurrentSeason, updateRecentPhrases } from './contextSelector.js';
import { rollD20, weightedPick as rollerWeightedPick, pickTemplate } from './phraseRoller.js';
import { applySynonyms as applySynonymsEngine, loadSynonyms } from './synonymEngine.js';
import { loadSeasons, getSeasonalPhrases, getSeasonalBoosts } from './seasonalRotator.js';

// Fallback returned when a requested phrase/key doesn't exist
const MISSING_PHRASE = '🌿 *frase extraviada entre mis raíces...*';

let phrasesData = null;
let lastLoaded = 0;

const mediaCooldowns = new Map();
const mediaHourlyCount = new Map();

// In-memory recent phrases tracking (per guild for anti-repeat)
const recentPhrasesByGuild = new Map();

// Keyword index for O(1) trigger lookup: keyword -> Set<triggerKey>
let keywordIndex = null;

// ============================================================================
// Weighted Random Selection
// ============================================================================

function weightedRandom(items) {
  if (!items || !items.length) {return '';}
  const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight || 1;
    if (random <= 0) {return item.text;}
  }
  return items[items.length - 1].text;
}

function rand(arr) {
  if (!arr || !arr.length) {return '';}
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================================
// Template Rendering
// ============================================================================

function interpolate(text, vars) {
  if (!text) {return '';}
  return text.replace(/\{(\w+)\}/g, (match, key) => vars[key] !== undefined ? vars[key] : match);
}

function renderTemplate(template, vars, slots, data) {
  if (!template) {return '';}
  
  // Pick template if array, then fill slots
  const pickedTemplate = pickTemplate(template);
  let result = pickedTemplate.replace(/\{(\w+)\}/g, (match, key) => {
    if (slots && slots[key]) {
      return rollerWeightedPick(slots[key]);
    }
    return vars[key] !== undefined ? vars[key] : match;
  });
  
  result = interpolate(result, vars);

  // Handle {mannerism} placeholder - replace with weighted random global mannerism
  // (7.5% chance to insert one, otherwise empty string)
  if (result.includes('{mannerism}') && data?._global?.mannerisms?.length) {
    const mannerisms = data._global.mannerisms;
    const replacement = Math.random() < 0.075
      ? weightedRandom(mannerisms)
      : '';
    result = result.replace(/\{mannerism\}/g, replacement);
  }

  return result;
}

// ============================================================================
// Global Mannerisms & Synonyms
// ============================================================================


function applySynonyms(text, data) {
  const synonyms = loadSynonyms(data);
  if (!synonyms || Object.keys(synonyms).length === 0) {return text;}
  
  return applySynonymsEngine(text, synonyms, { probability: 0.3, wholeWordOnly: true, maxReplacements: 3 });
}

function postProcessPhrase(text, data) {return applySynonyms(text, data);}

// ============================================================================
// Keyword Index for O(1) Trigger Lookup
// ============================================================================

function buildKeywordIndex() {
  keywordIndex = new Map();
  
  // Include both regular triggers and shitpost triggers
  const triggerSources = [
    phrasesData?.categories?.triggers,
    phrasesData?.categories?.shitpost
  ].filter(Boolean);
  
  if (triggerSources.length === 0) {return;}

  for (const source of triggerSources) {
    for (const [triggerKey, triggerData] of Object.entries(source)) {
      // Use keywords field or fall back to triggerKey
      const patterns = triggerData.keywords || triggerData.patterns || [triggerKey];
      for (const pattern of patterns) {
        // Extract meaningful keywords (words longer than 2 chars)
        const words = pattern.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        for (const word of words) {
          if (!keywordIndex.has(word)) {
            keywordIndex.set(word, new Set());
          }
          keywordIndex.get(word).add(triggerKey);
        }
      }
    }
  }
}

/**
 * Shared trigger matching helper.
 * Takes a message and an array of trigger objects (with keywords[] and/or text).
 * Returns array of matching trigger objects.
 * Uses the same keyword index logic as getTriggerResponse for consistency.
 */
export function checkTriggers(message, triggers) {
  if (!message || !triggers || triggers.length === 0) {return [];}
  const lower = message.toLowerCase();
  
  // Build a temporary keyword index for the provided triggers
  const tempIndex = new Map();
  for (const trigger of triggers) {
    const keywords = trigger.keywords || [];
    // Also index words from trigger.text as fallback
    // Split on whitespace, underscores, and other word separators
    const textWords = trigger.text ? trigger.text.toLowerCase().split(/[\s_]+/) : [];
    
    for (const kw of keywords) {
      const key = kw.toLowerCase();
      if (!tempIndex.has(key)) {
        tempIndex.set(key, []);
      }
      tempIndex.get(key).push(trigger);
    }
    for (const word of textWords) {
      if (word.length > 2) { // Only index words longer than 2 chars
        const key = word;
        if (!tempIndex.has(key)) {
          tempIndex.set(key, []);
        }
        tempIndex.get(key).push(trigger);
      }
    }
  }
  
  // Find candidate triggers by looking up message words in the temp index
  const words = lower.split(/[\s,.;:!?¿¡()[\]{}]+/).filter(w => w.length > 2);
  const candidates = new Map(); // trigger -> match count
  
  for (const word of words) {
    const matches = tempIndex.get(word);
    if (matches) {
      for (const trigger of matches) {
        candidates.set(trigger, (candidates.get(trigger) || 0) + 1);
      }
    }
  }
  
  // If we have indexed matches, return those triggers
  if (candidates.size > 0) {
    // Sort by match count (descending) and return
    return Array.from(candidates.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([trigger]) => trigger);
  }
  
  // Fallback: check if any trigger.text words are in message
  const fallback = [];
  for (const trigger of triggers) {
    const textWords = trigger.text ? trigger.text.toLowerCase().split(/[\s_]+/) : [];
    for (const word of textWords) {
      if (word.length > 2 && lower.includes(word)) {
        fallback.push(trigger);
        break;
      }
    }
  }
  
  return fallback;
}

// ============================================================================
// Core Functions
// ============================================================================

async function loadPhrases() {
  try {
    const content = await fs.readFile(PHRASES_FILE, 'utf8');
    phrasesData = JSON.parse(content);
    lastLoaded = Date.now();
    logger.info({ version: phrasesData.version }, '[PhraseManager] Loaded phrases.json');
    
    // Build keyword index for O(1) trigger lookup
    buildKeywordIndex();
    
    return phrasesData;
  } catch (err) {
    logger.error({ err }, '[PhraseManager] Error loading phrases');
    throw err;
  }
}

async function reloadPhrases() {
  phrasesData = null;
  keywordIndex = null;
  return loadPhrases();
}

async function getPhrases() {
  if (!phrasesData) {await loadPhrases();}
  return phrasesData;
}

/**
 * Original getPhrase - backward compatible
 * @param {string} category
 * @param {string} key
 * @param {Object} vars
 * @returns {Promise<string>}
 */
async function getPhrase(category, key, vars = {}) {
  const data = await getPhrases();
  const cat = data.categories?.[category];
  if (!cat) {return MISSING_PHRASE;}

  // Handle legacy format (hits/crits/fails arrays)
  const entry = cat[key];
  if (!entry) {return MISSING_PHRASE;}

  // New template/slot format
  if (entry.template) {
    const template = entry.template;
    const slots = entry.slots || {};
    const weight = entry.weight || 1;
    let text = renderTemplate(template, vars, slots, data);
    text = postProcessPhrase(text, data);
    return text;
  }

  // Legacy array format fallback
  let pool = [];
  if (entry.hits) {pool = pool.concat(entry.hits);}
  if (entry.crits) {pool = pool.concat(entry.crits);}
  if (entry.fails) {pool = pool.concat(entry.fails);}
  
  if (!pool.length) {return MISSING_PHRASE;}
  
  let text = rand(pool);
  text = postProcessPhrase(text, data);
  return text;
}

/**
 * NEW: Context-aware phrase selection with seasonal, synonym, and anti-repeat
 * @param {string} category
 * @param {string} key
 * @param {Object} vars - Template variables
 * @param {Object} contextOptions - Optional context overrides
 * @param {Object} contextOptions.interaction - Discord interaction/message
 * @param {string[]} contextOptions.recentPhrases - Override recent phrases
 * @returns {Promise<string>}
 */
async function getPhraseWithContext(category, key, vars = {}, contextOptions = {}) {
  const data = await getPhrases();
  const cat = data.categories?.[category];
  if (!cat) {return MISSING_PHRASE;}

  const entry = cat[key];
  if (!entry) {return MISSING_PHRASE;}

  const rollType = contextOptions.rollType || 'none';

  // Build context from interaction + overrides
  const interaction = contextOptions.interaction || null;
  const recentPhrases = contextOptions.recentPhrases ||
    (interaction?.guild ? recentPhrasesByGuild.get(interaction.guild.id) || [] : []);

  const context = buildContext(interaction, {
    recentPhrases,
    ...contextOptions
  });

  // Load seasonal config
  const seasons = await loadSeasons();
  const season = getCurrentSeason(new Date(), seasons);

  // d20 roll for triggers/shitposts - pick template bucket
  let template = entry.template;
  const entrySlots = entry.slots || {};
  
  if (rollType === 'd20' && entry.template) {
    const roll = rollD20();
    if (roll === 1 && entry.fails && entry.fails.length) {
      template = pickTemplate(entry.fails);
    } else if (roll === 20 && entry.crits && entry.crits.length) {
      template = pickTemplate(entry.crits);
    }
    // else use main template (hit)
  }

  // Get templates (with seasonal boost)
  let templates = [];
  if (template) {
    // Single template entry
    templates = [{
      text: template,
      weight: entry.weight || 1,
      slots: entrySlots,
      contexts: entry.contexts || {}
    }];
  } else if (entry.templates) {
    // Multiple templates
    templates = entry.templates.map(t => ({
      text: t.text || t.template,
      weight: t.weight || 1,
      slots: t.slots || {},
      contexts: t.contexts || {}
    }));
  }

  // Add seasonal templates
  const seasonalTemplates = getSeasonalPhrases(category, season, data);
  if (seasonalTemplates.length) {
    templates = [...seasonalTemplates, ...templates];
  }

  if (!templates.length) {
    // Legacy format fallback
    return getPhrase(category, key, vars);
  }

  // Select template with context weighting
  const selectedTemplate = selectWithContext(templates, context);
  if (!selectedTemplate) {return MISSING_PHRASE;}

  // Find the full template object to get slots
  const fullTemplate = templates.find(t => t.text === selectedTemplate);
  const templateSlots = fullTemplate?.slots || {};

  // Render with slots and variables
  let text = renderTemplate(selectedTemplate, vars, templateSlots, data);

  // Post-process (mannerisms + synonyms)
  text = postProcessPhrase(text, data);

  // Update recent phrases tracking
  if (interaction?.guild) {
    const updated = updateRecentPhrases(recentPhrases, text, 10);
    recentPhrasesByGuild.set(interaction.guild.id, updated);
  }

  return text;
}

// ============================================================================
// Trigger Response System (unchanged)
// ============================================================================

async function getTriggerResponse(message, vars = {}) {
  const data = await getPhrases();
  
  // Check both regular triggers and shitpost triggers
  const triggerSources = [
    data.categories?.triggers,
    data.categories?.shitpost
  ].filter(Boolean);
  
  if (triggerSources.length === 0) {return null;}

  const lowerMsg = message.toLowerCase();
  // Use same word splitting as buildKeywordIndex for consistency
  const words = lowerMsg.split(/\s+/).filter(w => w.length > 2);

  // Use keyword index to find candidate triggers (only from main triggers for now)
  const candidateKeys = new Set();
  for (const word of words) {
    const keys = keywordIndex?.get(word);
    if (keys) {
      for (const key of keys) {
        candidateKeys.add(key);
      }
    }
  }

  // If no candidates found via index, fall back to checking all triggers
  const keysToCheck = candidateKeys.size > 0 
    ? candidateKeys 
    : new Set(triggerSources.flatMap(t => Object.keys(t)));

  for (const triggerKey of keysToCheck) {
    // Find the trigger in either source
    let triggerData = null;
    for (const source of triggerSources) {
      if (source[triggerKey]) {
        triggerData = source[triggerKey];
        break;
      }
    }
    if (!triggerData) {continue;}
    
    // Use triggerKey as pattern (since new format doesn't have patterns/keywords fields)
    const patterns = triggerData.patterns || triggerData.keywords || [triggerKey];

    for (const pattern of patterns) {
      if (lowerMsg.includes(pattern.toLowerCase())) {
        // Use the trigger entry directly (hits/crits/fails format)
        // Use context-aware selection for triggers too
        const interaction = vars._interaction || null;
        // Return the trigger data so caller can handle hit/crit/fail logic
        // Also return roll metadata if d20 is used
        return { triggerKey, triggerData, interaction, rollType: 'd20' };
      }
    }
  }

  return null;
}

// ============================================================================
// Category & Utility Functions
// ============================================================================

async function getCategory(category) {
  const data = await getPhrases();
  return data.categories?.[category] || {};
}

async function getUwuEnding() {
  const data = await getPhrases();
  const endings = data._global?.uwuEndings || [' uwu', ' >w<', ' :3', ' c:', ' ^w^'];
  return rand(endings);
}

async function listPhrases() {
  const data = await getPhrases();
  if (!data?.categories) {return {};}
  const result = {};
  for (const [catName, cat] of Object.entries(data.categories)) {
    result[catName] = Object.keys(cat).map(key => ({
      key,
      types: Object.keys(cat[key]).filter(k => 
        (Array.isArray(cat[key][k]) && cat[key][k].length) || 
        k === 'template' ||
        k === 'templates'
      )
    }));
  }
  return result;
}

async function addPhrase(category, key, type, text) {
  const data = await getPhrases();
  if (!data.categories[category]) {data.categories[category] = {};}
  if (!data.categories[category][key]) {data.categories[category][key] = { hits: [], crits: [], fails: [] };}
  if (!data.categories[category][key][type]) {data.categories[category][key][type] = [];}
  data.categories[category][key][type].push(text);
  await savePhrases(data);
  return true;
}

async function editPhrase(category, key, type, index, newText) {
  const data = await getPhrases();
  if (!data.categories[category]?.[key]?.[type]?.[index]) {return false;}
  data.categories[category][key][type][index] = newText;
  await savePhrases(data);
  return true;
}

async function deletePhrase(category, key, type, index) {
  const data = await getPhrases();
  if (!data.categories[category]?.[key]?.[type]?.[index]) {return false;}
  data.categories[category][key][type].splice(index, 1);
  if (data.categories[category][key][type].length === 0) {delete data.categories[category][key][type];}
  if (Object.keys(data.categories[category][key]).length === 0) {delete data.categories[category][key];}
  await savePhrases(data);
  return true;
}

async function savePhrases(data) {
  try {
    await fs.writeFile(PHRASES_FILE, JSON.stringify(data, null, 2), 'utf8');
    phrasesData = data;
    lastLoaded = Date.now();
    logger.info('[PhraseManager] Saved phrases.json');
    return true;
  } catch (err) {
    logger.error({ err }, '[PhraseManager] Error saving phrases');
    return false;
  }
}

async function getMediaFolder() {
  const data = await getPhrases();
  return path.join(__dirname, '..', data.media?.folder || 'data/media');
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

/**
 * @param {string} category
 * @param {string} key
 * @param {string} value
 * @returns {Promise<boolean>}
 */
async function setPhrase(category, key, value) {
  const data = await getPhrases();
  if (!data.categories[category]) {data.categories[category] = {};}
  if (!data.categories[category][key]) {data.categories[category][key] = { hits: [], crits: [], fails: [] };}
  data.categories[category][key].template = value;
  await savePhrases(data);
  return true;
}


export { loadPhrases, reloadPhrases, getPhrases, getPhrase, getPhraseWithContext, getTriggerResponse, getCategory, getUwuEnding, listPhrases, addPhrase, editPhrase, deletePhrase, savePhrases, setPhrase, getMediaFolder, listMedia, rand, interpolate, weightedRandom, renderTemplate, postProcessPhrase };