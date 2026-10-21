/**
 * musicCommands.js - Music-related slash command handlers
 * Extracted from bpCommand.js for modularity
 */

const { EmbedBuilder, MessageFlags } = require('discord.js');
const { queueEmbed, formatDuration } = require('../embeds');
const { cmdLeave } = require('../cmdLeave');
const dataStore = require('../dataStore');
const phraseManager = require('../phraseManager');
const config = require('../config');

/**
 * Handle /bp music play
 */
async function handleMusicPlay(interaction) {
  await interaction.deferReply();

  const url = interaction.options.getString('url');
  const voiceChannel = interaction.member.voice.channel;

  if (!voiceChannel) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'playNoVoice')
    });
  }

  try {
    const distube = interaction.client.distube;
    await distube.play(voiceChannel, url, {
      member: interaction.member,
      textChannel: interaction.channel,
    });
  } catch (error) {
    console.error('[Music] Play error:', error);
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'playError')
    });
  }
}

/**
 * Handle /bp music playlist
 */
async function handleMusicPlaylist(interaction) {
  await interaction.deferReply();

  const url = interaction.options.getString('url');
  const voiceChannel = interaction.member.voice.channel;

  if (!voiceChannel) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'playNoVoice')
    });
  }

  try {
    const distube = interaction.client.distube;
    await distube.play(voiceChannel, url, {
      member: interaction.member,
      textChannel: interaction.channel,
    });
  } catch (error) {
    console.error('[Music] Playlist error:', error);
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'playError')
    });
  }
}

/**
 * Handle /bp music query
 */
async function handleMusicQuery(interaction, client) {
  await interaction.deferReply();

  const query = interaction.options.getString('query');
  const voiceChannel = interaction.member.voice.channel;

  if (!voiceChannel) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'playNoVoice')
    });
  }

  try {
    const { play } = require('../index');
    await play(interaction, query, voiceChannel);
  } catch (error) {
    console.error('[Music] Query error:', error);
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'playError') 
    });
  }
}

/**
 * Handle /bp music skip
 */
async function handleMusicSkip(interaction, client) {
  await interaction.deferReply();

  const { distube } = require('../index');
  const queue = distube.getQueue(interaction.guildId);

  if (!queue) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'skipNoQueue')
    });
  }

  try {
    const song = queue.songs[0];
    queue.skip();
    return interaction.editReply(await phraseManager.getPhrase('music', 'skip', 'hits', { 
      songName: song.name 
    }));
  } catch (error) {
    console.error('[Music] Skip error:', error);
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'skipError'),
    });
  }
}

/**
 * Handle /bp music stop
 */
async function handleMusicStop(interaction, client) {
  await interaction.deferReply();

  const { distube } = require('../index');
  const queue = distube.getQueue(interaction.guildId);

  if (!queue) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'stopNoQueue')
    });
  }

  try {
    queue.stop();
    return interaction.editReply(await phraseManager.getPhrase('music', 'stop'));
  } catch (error) {
    console.error('[Music] Stop error:', error);
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'stopError'),
    });
  }
}

/**
 * Handle /bp music pause
 */
async function handleMusicPause(interaction, client) {
  await interaction.deferReply();

  const { distube } = require('../index');
  const queue = distube.getQueue(interaction.guildId);

  if (!queue) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'pauseNoQueue')
    });
  }

  try {
    queue.pause();
    return interaction.editReply(await phraseManager.getPhrase('music', 'pause'));
  } catch (error) {
    console.error('[Music] Pause error:', error);
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'pauseError'),
    });
  }
}

/**
 * Handle /bp music resume
 */
async function handleMusicResume(interaction, client) {
  await interaction.deferReply();

  const { distube } = require('../index');
  const queue = distube.getQueue(interaction.guildId);

  if (!queue) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'resumeNoQueue')
    });
  }

  try {
    queue.resume();
    return interaction.editReply(await phraseManager.getPhrase('music', 'resume'));
  } catch (error) {
    console.error('[Music] Resume error:', error);
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'resumeError'),
    });
  }
}

/**
 * Handle /bp music queue
 */
async function handleMusicQueue(interaction, client) {
  await interaction.deferReply();

  const { distube } = require('../index');
  const queue = distube.getQueue(interaction.guildId);

  if (!queue || !queue.songs.length) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'queueEmpty')
    });
  }

  try {
    const embed = queueEmbed(queue);
    return interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[Music] Queue error:', error);
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'queueError')
    });
  }
}

/**
 * Handle /bp music nowplaying
 */
async function handleMusicNowPlaying(interaction, client) {
  await interaction.deferReply();

  const { distube } = require('../index');
  const queue = distube.getQueue(interaction.guildId);

  if (!queue || !queue.songs.length) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'nowplayingEmpty')
    });
  }

  try {
    const song = queue.songs[0];
    const embed = new EmbedBuilder()
      .setTitle('🎵 Reproduciendo ahora')
      .setDescription(`**[${song.name}](${song.url})**\n${song.uploader?.name || song.uploader || 'Autor desconocido'}\n\n*¡Qué temazo! Se me tiemblan las hojas. c: 🍃*`)
      .addFields(
        { name: '⏱ Duración', value: formatDuration(song.duration), inline: true },
        { name: '🔊 Pedida por', value: `${song.member?.displayName || 'Alguien'}`, inline: true }
      )
      .setThumbnail(song.thumbnail || null)
      .setColor(0x57f287);
    
    return interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[Music] NowPlaying error:', error);
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'nowplayingError')
    });
  }
}

/**
 * Handle /bp music volume
 */
async function handleMusicVolume(interaction, client) {
  await interaction.deferReply();

  const { distube } = require('../index');
  const queue = distube.getQueue(interaction.guildId);
  const volume = interaction.options.getInteger('volume');

  if (!queue) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'volNoQueue')
    });
  }

  if (volume < 1 || volume > 200) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'volInvalid')
    });
  }

  try {
    queue.setVolume(volume);
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'volSet', 'hits', { volume })
    });
  } catch (error) {
    console.error('[Music] Volume error:', error);
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'volError'),
    });
  }
}

/**
 * Handle /bp music loop
 */
async function handleMusicLoop(interaction, client) {
  await interaction.deferReply();

  const { distube } = require('../index');
  const queue = distube.getQueue(interaction.guildId);
  const mode = interaction.options.getString('mode');

  if (!queue) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'loopNoQueue')
    });
  }

  try {
    let modeNum = 0;
    switch (mode) {
      case 'off': modeNum = 0; break;
      case 'song': modeNum = 1; break;
      case 'queue': modeNum = 2; break;
    }
    
    queue.setRepeatMode(modeNum);
    const modeText = { 0: 'apagado', 1: 'canción', 2: 'cola' }[modeNum];
    return interaction.editReply(await phraseManager.getPhrase('music', 'loopSet', 'hits', { mode: modeText }));
  } catch (error) {
    console.error('[Music] Loop error:', error);
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'loopError'),
    });
  }
}

/**
 * Handle /bp music shuffle
 */
async function handleMusicShuffle(interaction, client) {
  await interaction.deferReply();

  const { distube } = require('../index');
  const queue = distube.getQueue(interaction.guildId);

  if (!queue || queue.songs.length <= 1) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'shuffleNoQueue')
    });
  }

  try {
    queue.shuffle();
    return interaction.editReply(await phraseManager.getPhrase('music', 'shuffle'));
  } catch (error) {
    console.error('[Music] Shuffle error:', error);
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'shuffleError'),
    });
  }
}

/**
 * Handle /bp music rewind
 */
async function handleMusicRewind(interaction, client) {
  await interaction.deferReply();

  const { distube } = require('../index');
  const queue = distube.getQueue(interaction.guildId);

  if (!queue || !queue.previousSongs.length) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'rewindNone')
    });
  }

  try {
    const song = queue.previousSongs[queue.previousSongs.length - 1];
    queue.previousSongs.pop();
    queue.songs.unshift(song);
    return interaction.editReply(await phraseManager.getPhrase('music', 'rewind', 'hits', { 
      songName: song.name 
    }));
  } catch (error) {
    console.error('[Music] Rewind error:', error);
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'rewindError'),
    });
  }
}

/**
 * Handle /bp music leave
 */
async function handleMusicLeave(interaction, client) {
  await interaction.deferReply();
  return cmdLeave(interaction);
}

module.exports = {
  handleMusicPlay,
  handleMusicPlaylist,
  handleMusicQuery,
  handleMusicSkip,
  handleMusicStop,
  handleMusicPause,
  handleMusicResume,
  handleMusicQueue,
  handleMusicNowPlaying,
  handleMusicVolume,
  handleMusicLoop,
  handleMusicShuffle,
  handleMusicRewind,
  handleMusicLeave,
};
