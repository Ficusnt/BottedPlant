const fs = require('fs');

let content = fs.readFileSync('src/commands/rememberCommands.js', 'utf8');

// Find the problematic line with the em dash
const idx = content.indexOf('r.text + ');
const snippet = content.slice(idx, idx + 200);
console.log('Found at index:', idx);
console.log('Snippet:');
console.log(snippet);

// The problematic em dash character
const oldLine = "**' + (i + 1) + '.** ' + r.text + ' — <t:' + Math.floor(new Date(r.when).getTime() / 1000) + ':R> (ID: ' + r.id + ')";

console.log('\nLooking for old line...');
console.log('Found:', content.includes(oldLine));

if (content.includes(oldLine)) {
  // Replace with template literal
  const newLine = "\`**${i + 1}.** ${r.text} -- <t:${Math.floor(new Date(r.when).getTime() / 1000)}:R> (ID: ${r.id})\`";
  
  content = content.replace(oldLine, newLine);
  fs.writeFileSync('src/commands/rememberCommands.js', content);
  console.log('Fixed!');
} else {
  console.log('Old line not found, trying alternative...');
  // Try with different dash
  const oldLine2 = "**' + (i + 1) + '.** ' + r.text + ' - <t:' + Math.floor(new Date(r.when).getTime() / 1000) + ':R> (ID: ' + r.id + ')";
  console.log('Found alt:', content.includes(oldLine2));
}