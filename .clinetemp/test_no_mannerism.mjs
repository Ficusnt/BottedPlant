import { loadPhrases, getPhrases, renderTemplate } from '../src/phraseManager.js';
await loadPhrases();
const data = await getPhrases();

console.log('Testing WITHOUT {mannerism} placeholder (should NEVER get mannerism):');
for(let i=0;i<20;i++) {
  const result = renderTemplate('Hello world', {}, {}, data);
  console.log('  ' + JSON.stringify(result));
}