const fs = require('fs');

let content = fs.readFileSync('src/commands/rememberCommands.js', 'utf8');

// The exact pattern with single quotes around backticks
const searchStr = "'`**${i + 1}.** <@${b.userId}> -- ${b.date} (ID: ${b.id})`'";
const replaceStr = "`**${i + 1}.** <@${b.userId}> -- ${b.date} (ID: ${b.id})`";

console.log('Search string found:', content.includes(searchStr));

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync('src/commands/rememberCommands.js', content);
  console.log('Fixed!');
} else {
  console.log('Search string not found');
  const idx = content.indexOf('b.userId');
  console.log('Context:', JSON.stringify(content.slice(idx-20, idx+80)));
}