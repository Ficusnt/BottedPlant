import { loadPhrases, getPhrases, renderTemplate, postProcessPhrase } from '../src/phraseManager.js';
await loadPhrases();
const data = await getPhrases();

console.log('Testing synonyms post-processing:');
for(let i=0;i<10;i++) {
  const result = postProcessPhrase('hola como estas', data);
  console.log('  ' + JSON.stringify(result));
}