const fs = require('fs');

let content = fs.readFileSync('src/commands/rememberCommands.js', 'utf8');

// The exact pattern - single quote, backtick, then template, then backtick, single quote
// Let's just replace the outer quotes
const searchStr = "'`**${i + 1}.** ${r.text} -- <t:${Math.floor(new Date(r.when).getTime() / 1000)}:R> (ID: ${r.id})`'";
const replaceStr = "`**${i + 1}.** ${r.text} -- <t:${Math.floor(new Date(r.when).getTime() / 1000)}:R> (ID: ${r.id})`";

console.log('Search string found:', content.includes(searchStr));

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync('src/commands/rememberCommands.js', content);
  console.log('Fixed!');
} else {
  console.log('Search string not found');
  // Debug: find the exact characters
  const idx = content.indexOf('i + 1');
  console.log('Context around i+1:', JSON.stringify(content.slice(idx-30, idx+100)));
}