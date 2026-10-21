const fs = require('fs');

let content = fs.readFileSync('src/commands/rememberCommands.js', 'utf8');

// The exact pattern in the file: single quote (39), backtick (96), **, ${i + 1}, etc., backtick (96), single quote (39)
// Let's build the search string programmatically to avoid any escaping issues
const parts = [
  "'",           // single quote
  "`",           // backtick
  "**${i + 1}.** ${r.text} -- <t:${Math.floor(new Date(r.when).getTime() / 1000)}:R> (ID: ${r.id})",
  "`",           // backtick
  "'"            // single quote
];
const searchStr = parts.join("");
const replaceStr = "`**${i + 1}.** ${r.text} -- <t:${Math.floor(new Date(r.when).getTime() / 1000)}:R> (ID: ${r.id})`";

console.log('Search string bytes:', [...searchStr].map(c => c.charCodeAt(0).toString(16)).join(' '));
console.log('Search string found:', content.includes(searchStr));

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync('src/commands/rememberCommands.js', content);
  console.log('Fixed!');
} else {
  console.log('Search string not found');
  // Try finding just the inner part
  const inner = "**${i + 1}.** ${r.text} -- <t:${Math.floor(new Date(r.when).getTime() / 1000)}:R> (ID: ${r.id})";
  console.log('Inner found:', content.includes(inner));
}