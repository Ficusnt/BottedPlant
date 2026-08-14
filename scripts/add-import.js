const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Src', 'bpCommand.js');
let content = fs.readFileSync(filePath, 'utf8');

const importLine = "const { cmdLeave } = require('./cmdLeave');";

if (!content.includes(importLine)) {
  content = content.replace(
    /const { queueEmbed, formatDuration } = require\('\.\/embeds'\);/,
    "const { queueEmbed, formatDuration } = require('./embeds');\nconst { cmdLeave } = require('./cmdLeave');"
  );
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Import added successfully');
} else {
  console.log('Import already exists');
}