// phraseRoller.js - Pure dice rolling and weighted selection utilities
// No external dependencies, fully testable

/**
 * Roll a d20 (1-20 inclusive)
 * @returns {number}
 */
export function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * Pick a random item from a weighted array
 * @template T
 * @param {Array<T & {weight?: number}>} arr - Array of items with optional weight property
 * @param {string} [weightKey='weight'] - Property name for weight (default: 'weight')
 * @returns {T}
 */
export function weightedPick(arr, weightKey = 'weight') {
  if (!arr || !arr.length) {return null;}
  
  // Filter valid items with positive weight
  const valid = arr.filter(item => item && (item[weightKey] ?? 1) > 0);
  if (!valid.length) {return null;}
  
  // If all weights are equal or missing, simple random pick
  const allEqual = valid.every(item => (item[weightKey] ?? 1) === (valid[0][weightKey] ?? 1));
  if (allEqual) {
    return valid[Math.floor(Math.random() * valid.length)];
  }
  
  // Weighted selection
  const totalWeight = valid.reduce((sum, item) => sum + (item[weightKey] ?? 1), 0);
  let random = Math.random() * totalWeight;
  
  for (const item of valid) {
    random -= (item[weightKey] ?? 1);
    if (random <= 0) {return item;}
  }
  
  return valid[valid.length - 1]; // fallback
}

/**
 * Pick a random template from string or string array
 * @param {string | string[]} template
 * @returns {string}
 */
export function pickTemplate(template) {
  if (Array.isArray(template)) {
    return template[Math.floor(Math.random() * template.length)];
  }
  return template;
}