const fs = require('fs');

let content = fs.readFileSync('src/commands/rememberCommands.js', 'utf8');

// The exact pattern: single quote, backtick, content, backtick, CRLF (no closing single quote)
const searchStr = "'`**${i + 1}.** <@${b.userId}> -- ${b.date} (ID: ${b.id})`\r\n";
const replaceStr = "`**${i + 1}.** <@${b.userId}> -- ${b.date} (ID: ${b.id})`\r\n";

console.log('Search string found:', content.includes(searchStr));

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync('src/commands/rememberCommands.js', content);
  console.log('Fixed!');
} else {
  console.log('Search string not found');
}