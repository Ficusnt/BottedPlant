const fs = require('fs');

let content = fs.readFileSync('src/commands/rememberCommands.js', 'utf8');

// Based on the bytes: 27 60 ... 60 0d 0a (single quote, backtick, content, backtick, CRLF)
// The actual line is: '`**${i + 1}.** ... ` (NO closing single quote!)
// That's why my search with closing single quote didn't match

const searchStr = "'`**${i + 1}.** ${r.text} -- <t:${Math.floor(new Date(r.when).getTime() / 1000)}:R> (ID: ${r.id})`\r\n";
const replaceStr = "`**${i + 1}.** ${r.text} -- <t:${Math.floor(new Date(r.when).getTime() / 1000)}:R> (ID: ${r.id})`\r\n";

console.log('Search string found:', content.includes(searchStr));

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync('src/commands/rememberCommands.js', content);
  console.log('Fixed!');
} else {
  console.log('Search string not found');
}