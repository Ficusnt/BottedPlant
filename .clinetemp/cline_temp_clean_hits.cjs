const fs = require('fs');
const content = fs.readFileSync('data/phrases.json', 'utf8');
const cleaned = content.replace(/\s*"hits": \[\],/g, '');
fs.writeFileSync('data/phrases.json', cleaned);
console.log('Done removing empty hits arrays');