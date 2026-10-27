import { loadPhrases, getPhrases, renderTemplate } from '../src/phraseManager.js';
await loadPhrases();
const data = await getPhrases();

console.log('Testing {mannerism} placeholder:');
for(let i=0;i<20;i++) {
  const result = renderTemplate('Hello {mannerism}', {}, {}, data);
  console.log('  ' + JSON.stringify(result));
}