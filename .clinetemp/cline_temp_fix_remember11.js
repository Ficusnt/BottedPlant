const fs = require('fs');

let content = fs.readFileSync('src/commands/rememberCommands.js', 'utf8');

// Based on the debug output:
// Line starts with: ['] (char 39 = single quote) then backtick (char 96)
// Content: `**${i + 1}.** ${r.text} -- <t:${Math.floor(new Date(r.when).getTime() / 1000)}:R> (ID: ${r.id})`
// Ends with: backtick then ['] (single quote) then CRLF
// And the join is: .join('\n') with single quotes

// The exact search string:
const searchStr = "'`**${i + 1}.** ${r.text} -- <t:${Math.floor(new Date(r.when).getTime() / 1000)}:R> (ID: ${r.id})`'";
const replaceStr = "`**${i + 1}.** ${r.text} -- <t:${Math.floor(new Date(r.when).getTime() / 1000)}:R> (ID: ${r.id})`";

console.log('Search string:', JSON.stringify(searchStr));
console.log('Search string found:', content.includes(searchStr));

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync('src/commands/rememberCommands.js', content);
  console.log('Fixed!');
} else {
  console.log('Search string not found');
  // Let's try with the actual characters
  const idx = content.indexOf('i + 1');
  const before = content.slice(idx-15, idx-1);
  console.log('15 chars before i+1:', JSON.stringify(before));
}