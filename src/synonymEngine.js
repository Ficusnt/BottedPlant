/**
 * synonymEngine.js - Runtime synonym/morphological variation
 * Replaces words with synonyms at configurable probability for lexical variety
 */

import { logger } from './logger.js';

/**
 * Apply synonym replacements to text
 * @param {string} text - Input text
 * @param {Object<string, string[]>} synonyms - Synonym dictionary {word: [synonym1, synonym2, ...]}
 * @param {Object} options
 * @param {number} options.probability - Probability of replacement per eligible word (0-1), default 0.3
 * @param {boolean} options.wholeWordOnly - Only replace whole words (default true)
 * @param {number} options.maxReplacements - Max replacements per text (default 3)
 * @returns {string} Text with synonyms applied
 */
export function applySynonyms(text, synonyms, options = {}) {
  if (!text || !synonyms || Object.keys(synonyms).length === 0) {return text;}

  const {
    probability = 0.3,
    wholeWordOnly = true,
    maxReplacements = 3
  } = options;

  let result = text;
  let replacements = 0;
  const words = Object.keys(synonyms);

  // Shuffle words to randomize which ones get considered first
  const shuffledWords = [...words].sort(() => Math.random() - 0.5);

  for (const word of shuffledWords) {
    if (replacements >= maxReplacements) {break;}

    const syns = synonyms[word];
    if (!syns || !syns.length) {continue;}

    // Build regex for this word
    const pattern = wholeWordOnly
      ? new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi')
      : new RegExp(escapeRegExp(word), 'gi');

    // Check if word exists in text
    if (!pattern.test(result)) {continue;}

    // Decide whether to replace this occurrence
    if (Math.random() > probability) {continue;}

    // Pick random synonym
    const replacement = syns[Math.floor(Math.random() * syns.length)];

    // Replace first occurrence only
    result = result.replace(pattern, replacement);
    replacements++;

    logger.debug({ word, replacement }, '[SynonymEngine] Applied synonym');
  }

  return result;
}

/**
 * Escape special regex characters
 * @param {string} str
 * @returns {string}
 */
export function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Load synonyms from phrases.json _global.synonyms
 * @param {Object} phrasesData
 * @returns {Object<string, string[]>}
 */
export function loadSynonyms(phrasesData) {
  if (!phrasesData || !phrasesData._global || !phrasesData._global.synonyms) {
    return {};
  }
  return phrasesData._global.synonyms;
}

/**
 * Build reverse lookup: synonym -> base word (for analytics/debugging)
 * @param {Object<string, string[]>} synonyms
 * @returns {Object<string, string>}
 */
export function buildReverseIndex(synonyms) {
  const reverse = {};
  for (const [base, syns] of Object.entries(synonyms)) {
    for (const syn of syns) {
      reverse[syn.toLowerCase()] = base;
    }
  }
  return reverse;
}