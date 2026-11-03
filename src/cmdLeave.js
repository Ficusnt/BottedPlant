import * as phraseManager from './phraseManager.js';
import { MessageFlags } from 'discord.js';
import { logger } from './logger.js';
import { useQueue } from 'discord-player';

function getVoiceChannel(interaction) {
  return interaction.member.voice.channel || null;
}

function getQueue(interaction) {
  return useQueue(interaction.guildId);
}

async function cmdLeave(interaction) {
  const voiceState = interaction.guild.members.me.voice;
  if (!voiceState.channel) {
    return interaction.editReply({ content: await phraseManager.getPhrase('music', 'leaveNotInVoice'), flags: MessageFlags.Ephemeral });
  }
  const userChannel = getVoiceChannel(interaction);
  if (userChannel && userChannel.id !== voiceState.channel.id) {
    return interaction.editReply({ content: await phraseManager.getPhrase('music', 'leaveUserNotInVoice'), flags: MessageFlags.Ephemeral });
  }
  const queue = getQueue(interaction);
  if (queue) queue.delete();
  try {
    // Use voiceChannel.leave() instead of voiceState.disconnect() to avoid needing MoveMembers permission
    await voiceState.channel.leave();
    await interaction.editReply(await phraseManager.getPhrase('music', 'leaveSuccess'));
  } catch (err) {
    logger.error({ err }, 'Error disconnecting from voice');
    await interaction.editReply(await phraseManager.getPhrase('music', 'leaveError'));
  }
}

export { cmdLeave };
