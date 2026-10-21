const fs = require('fs');

let content = fs.readFileSync('src/commands/rememberCommands.js', 'utf8');

// The exact line to replace (line 62) - with the \r at the end
const oldLine = "    '`**${i + 1}.** ${r.text} -- <t:${Math.floor(new Date(r.when).getTime() / 1000)}:R> (ID: ${r.id})`'\\r";

const newLine = "    `\`**${i + 1}.** ${r.text} -- <t:${Math.floor(new Date(r.when).getTime() / 1000)}:R> (ID: ${r.id})\``";

console.log('Old line found:', content.includes(oldLine));

if (content.includes(oldLine)) {
  content = content.replace(oldLine, newLine);
  fs.writeFileSync('src/commands/rememberCommands.js', content);
  console.log('Fixed!');
} else {
  console.log('Old line not found');
  // Try a different approach - just replace the single quote template with backtick template
  const searchPattern = /'`\*\*\$\{i \+ 1\}\.\*\* \$\{r\.text\} -- <t:\$\{Math\.floor\(new Date\(r\.when\)\.getTime\(\) \/ 1000\)\}:R> \(ID: \$\{r\.id\}\)`'/;
  const match = content.match(searchPattern);
  console.log('Regex match:', match);
}