const fs = require('fs');
const content = fs.readFileSync('src/phraseManager.js', 'utf8');

const oldFn = `function renderTemplate(template, vars, slots) {
  if (!template) return '';
  
  // Pick template if array, then fill slots
  const pickedTemplate = pickTemplate(template);
  let result = pickedTemplate.replace(/\\{(\\w+)\\}/g, (match, key) => {
    if (slots && slots[key]) {
      return rollerWeightedPick(slots[key]);
    }
    return vars[key] !== undefined ? vars[key] : match;
  });
  
  result = interpolate(result, vars);
  return result;
}`;

const newFn = `function renderTemplate(template, vars, slots, data) {
  if (!template) return '';
  
  // Pick template if array, then fill slots
  const pickedTemplate = pickTemplate(template);
  let result = pickedTemplate.replace(/\\{(\\w+)\\}/g, (match, key) => {
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
    result = result.replace(/\\{mannerism\\}/g, replacement);
  }

  return result;
}`;

const updated = content.replace(oldFn, newFn);
fs.writeFileSync('src/phraseManager.js', updated);
console.log('Patched renderTemplate');