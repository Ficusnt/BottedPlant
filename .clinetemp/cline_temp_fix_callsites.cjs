const fs = require('fs');
const content = fs.readFileSync('src/phraseManager.js', 'utf8');

// Fix first call site (getPhrase legacy fallback) - line ~283
let updated = content.replace(
  'let text = renderTemplate(template, vars, slots);',
  'let text = renderTemplate(template, vars, slots, data);'
);

// Fix second call site (getPhraseWithContext) - line ~389
updated = updated.replace(
  'let text = renderTemplate(selectedTemplate, vars, templateSlots);',
  'let text = renderTemplate(selectedTemplate, vars, templateSlots, data);'
);

fs.writeFileSync('src/phraseManager.js', updated);
console.log('Patched call sites');