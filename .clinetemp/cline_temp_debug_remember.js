const fs = require('fs');

let content = fs.readFileSync('src/commands/rememberCommands.js', 'utf8');

// Find by line
const lines = content.split('\n');
for(let i=0; i<lines.length; i++) {
  if(lines[i].includes('r.text')) {
    console.log('Line', i+1, ':', JSON.stringify(lines[i]));
    console.log('Line', i, ':', JSON.stringify(lines[i-1]));
    console.log('Line', i+2, ':', JSON.stringify(lines[i+1]));
  }
}