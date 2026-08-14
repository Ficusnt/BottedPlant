const reactions = require('./reactions');

async function cmdLeave(interaction) {
  const voiceState = interaction.guild.members.me.voice;
  if (!voiceState.channel) {
    return interaction.reply({ content: reactions.music.leaveNotInVoice, ephemeral: true });
  }
  const userChannel = getVoiceChannel(interaction);
  if (userChannel && userChannel.id !== voiceState.channel.id) {
    return interaction.reply({ content: reactions.music.leaveUserNotInVoice, ephemeral: true });
  }
  const queue = getQueue(interaction);
  if (queue) interaction.client.distube.stop(interaction.guildId);
  try {
    await voiceState.disconnect();
    await interaction.reply(reactions.music.leaveSuccess);
  } catch (err) {
    console.error('Error disconnecting from voice:', err);
    await interaction.reply(reactions.music.leaveError);
  }
}
