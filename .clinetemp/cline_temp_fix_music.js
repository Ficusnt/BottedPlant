const fs = require('fs');

let content = fs.readFileSync('src/commands/musicCommands.js', 'utf8');

// Check what's actually in the file
const idx = content.indexOf('.setDescription');
const actualSnippet = content.slice(idx, idx + 250);
console.log('Actual content at .setDescription:');
console.log(actualSnippet);

// Find the end of the block we want to replace - the "return interaction.editReply({ embeds: [embed] });" line
// The broken block starts at .setDescription( and ends at the semicolon after embeds: [embed] });
const startIdx = idx;

// Find the return statement that ends the block
const returnIdx = content.indexOf('return interaction.editReply({ embeds: [embed] });', startIdx);
if (returnIdx === -1) {
  console.log('Could not find return statement');
  process.exit(1);
}

// The block to replace goes from startIdx to returnIdx + that statement's length
const endIdx = returnIdx + 'return interaction.editReply({ embeds: [embed] });'.length;

console.log('\nReplacing from index', startIdx, 'to', endIdx);
console.log('Block to replace:');
console.log(content.slice(startIdx, endIdx));

// Build the replacement
const replacement = 
  ".setDescription(`**[${song.name}](${song.url})**\\n${song.uploader?.name || song.uploader || 'Autor desconocido'}\\n\\n*¡Qué temazo! Se me tiemblan las hojas. c: 🍃*`)" + "\r\n" +
  "      .addFields(" + "\r\n" +
  "        { name: '⏱ Duración', value: formatDuration(song.duration), inline: true }," + "\r\n" +
  "        { name: '🔊 Pedida por', value: `${song.member?.displayName || 'Alguien'}`, inline: true }" + "\r\n" +
  "      )" + "\r\n" +
  "      .setThumbnail(song.thumbnail || null)" + "\r\n" +
  "      .setColor(0x57f287);\r\n" +
  "    \r\n" +
  "    return interaction.editReply({ embeds: [embed] });";

console.log('\nReplacement:');
console.log(replacement);

// Do the replacement
content = content.slice(0, startIdx) + replacement + content.slice(endIdx);
fs.writeFileSync('src/commands/musicCommands.js', content);
console.log('Fixed!');