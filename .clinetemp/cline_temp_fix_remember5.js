const fs = require('fs');

let content = fs.readFileSync('src/commands/rememberCommands.js', 'utf8');

// The exact block to replace - from "reminders.map" to "}).join('\\n');"
const oldBlock = "reminders.map((r, i) => \r\n    '`**${i + 1}.** ${r.text} -- <t:${Math.floor(new Date(r.when).getTime() / 1000)}:R> (ID: ${r.id})`'\r\n  ).join('\\n');";

const newBlock = "reminders.map((r, i) => \r\n    `\`**${i + 1}.** ${r.text} -- <t:${Math.floor(new Date(r.when).getTime() / 1000)}:R> (ID: ${r.id})\``\r\n  ).join('\\n');";

console.log('Old block found:', content.includes(oldBlock));

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync('src/commands/rememberCommands.js', content);
  console.log('Fixed!');
} else {
  console.log('Old block not found');
  // Try without the escaped backslashes
  const oldBlock2 = "reminders.map((r, i) => \r\n    '`**${i + 1}.** ${r.text} -- <t:${Math.floor(new Date(r.when).getTime() / 1000)}:R> (ID: ${r.id})`'\r\n  ).join('\\n');";
  console.log('Old block2 found:', content.includes(oldBlock2));
}