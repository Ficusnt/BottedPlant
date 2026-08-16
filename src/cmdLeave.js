const phraseManager = require('./phraseManager');

function getVoiceChannel(interaction) {
  return interaction.member.voice.channel || null;
}

function getQueue(interaction) {
  return interaction.client.distube.getQueue(interaction.guildId);
}

async function cmdLeave(interaction) {
  const voiceState = interaction.guild.members.me.voice;
  if (!voiceState.channel) {
    return interaction.reply({ content: await phraseManager.getPhrase('music', 'leaveNotInVoice'), ephemeral: true });
  }
  const userChannel = getVoiceChannel(interaction);
  if (userChannel && userChannel.id !== voiceState.channel.id) {
    return interaction.reply({ content: await phraseManager.getPhrase('music', 'leaveUserNotInVoice'), ephemeral: true });
  }
  const queue = getQueue(interaction);
  if (queue) interaction.client.distube.stop(interaction.guildId);
  try {
    // Use voiceChannel.leave() instead of voiceState.disconnect() to avoid needing MoveMembers permission
    await voiceState.channel.leave();
    await interaction.reply(await phraseManager.getPhrase('music', 'leaveSuccess'));
  } catch (err) {
    console.error('Error disconnecting from voice:', err);
    await interaction.reply(await phraseManager.getPhrase('music', 'leaveError'));
  }
}

module.exports = { cmdLeave };