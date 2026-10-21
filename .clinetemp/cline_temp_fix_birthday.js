const fs = require('fs');

let content = fs.readFileSync('src/commands/rememberCommands.js', 'utf8');

// Find the birthday list line with em dash
const idx = content.indexOf('b.userId');
const snippet = content.slice(idx-50, idx+100);
console.log('Context:');
console.log(snippet);

// The problematic line
const oldLine = "**' + (i + 1) + '.** <@' + b.userId + '> — ' + b.date + ' (ID: ' + b.id + ')";
console.log('\nOld line found:', content.includes(oldLine));

if (content.includes(oldLine)) {
  const newLine = "\`**${i + 1}.** <@${b.userId}> -- ${b.date} (ID: ${b.id})\`";
  content = content.replace(oldLine, newLine);
  fs.writeFileSync('src/commands/rememberCommands.js', content);
  console.log('Fixed!');
} else {
  console.log('Old line not found');
}