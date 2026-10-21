const fs = require('fs');

let content = fs.readFileSync('src/commands/rememberCommands.js', 'utf8');

// The exact line to replace (line 62)
const oldLine = "    '`**${i + 1}.** ${r.text} -- <t:${Math.floor(new Date(r.when).getTime() / 1000)}:R> (ID: ${r.id})`'";

const newLine = "    `\`**${i + 1}.** ${r.text} -- <t:${Math.floor(new Date(r.when).getTime() / 1000)}:R> (ID: ${r.id})\``";

console.log('Old line found:', content.includes(oldLine));

if (content.includes(oldLine)) {
  content = content.replace(oldLine, newLine);
  fs.writeFileSync('src/commands/rememberCommands.js', content);
  console.log('Fixed!');
} else {
  console.log('Old line not found');
  // Try without the trailing \r
  const oldLine2 = "    '`**${i + 1}.** ${r.text} -- <t:${Math.floor(new Date(r.when).getTime() / 1000)}:R> (ID: ${r.id})`'";
  console.log('Old line2 found:', content.includes(oldLine2));
  if (content.includes(oldLine2)) {
    content = content.replace(oldLine2, newLine);
    fs.writeFileSync('src/commands/rememberCommands.js', content);
    console.log('Fixed with alt!');
  }
}