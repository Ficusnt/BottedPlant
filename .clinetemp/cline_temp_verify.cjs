const fs = require('fs');
const content = fs.readFileSync('data/phrases.json', 'utf8');
JSON.parse(content);
console.log('JSON valid');
console.log('Contains uwuEndings:', content.includes('uwuEndings'));
console.log('Has empty hits:', content.includes('"hits": []'));