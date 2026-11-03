/**
 * musicCommands.js - Music-related slash command handlers
 * Extracted from bpCommand.js for modularity
 * Migrated to discord-player v7
 */

import { EmbedBuilder, MessageFlags, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } from 'discord.js';
import { queueEmbed, formatDuration, trackEmbed, playlistEmbed, parseDuration } from '../embeds.js';
import { cmdLeave } from '../cmdLeave.js';
import * as dataStore from '../dataStore.js';
import * as phraseManager from '../phraseManager.js';
import config from '../config.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { logger } from '../logger.js';
import { useQueue, QueueRepeatMode } from 'discord-player';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get queue for a guild with error handling
 * @param {string} guildId - Guild ID
 * @returns {import('discord-player').GuildQueue|null}
 */
function getQueue(guildId) {
  return useQueue(guildId);
}

/**
 * Format track for embed display
 * @param {import('discord-player').Track} track - Track object
 * @returns {Object} Formatted track info
 */
function formatTrackForEmbed(track) {
  return {
    name: track.title,
    url: track.url,
    uploader: { name: track.author || 'Desconocido' },
    duration: parseDuration(track.duration) || 0,
    thumbnail: track.thumbnail,
    requestedBy: track.requestedBy,
  };
}

/**
 * Format queue for embed display
 * @param {import('discord-player').GuildQueue} queue - Queue object
 * @param {number} page - Page number
 * @returns {Object} Formatted queue info
 */
function formatQueueForEmbed(queue, page) {
  const tracks = queue.tracks.map((t, i) => ({
    name: t.title,
    url: t.url,
    duration: parseDuration(t.duration) || 0,
    requestedBy: t.requestedBy,
  }));
  
  return {
    tracks,
    currentTrack: queue.currentTrack ? formatTrackForEmbed(queue.currentTrack) : null,
    volume: queue.node.volume,
    paused: queue.node.isPaused(),
    repeatMode: queue.repeatMode,
  };
}

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
    const player = interaction.client.player;
    await player.play(voiceChannel, url, {
      requestedBy: interaction.member,
      nodeOptions: {
        metadata: {
          channel: interaction.channel,
          requestedBy: interaction.member,
        },
        volume: 50,
        leaveOnEnd: false,
        leaveOnStop: false,
        leaveOnEmpty: true,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[Music] play error');
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
    const player = interaction.client.player;
    await player.play(voiceChannel, url, {
      requestedBy: interaction.member,
      nodeOptions: {
        metadata: {
          channel: interaction.channel,
          requestedBy: interaction.member,
        },
        volume: 50,
        leaveOnEnd: false,
        leaveOnStop: false,
        leaveOnEmpty: true,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[Music] playlist error');
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'playError')
    });
  }
}

/**
 * Handle /bp music query - search and show select menu
 */
async function handleMusicQuery(interaction) {
  await interaction.deferReply();

  const place = interaction.options.getString('place');
  const title = interaction.options.getString('title');
  const voiceChannel = interaction.member.voice.channel;

  if (!voiceChannel) {
    return interaction.editReply({
      content: await phraseManager.getPhrase('music', 'playNoVoice')
    });
  }

  try {
    // Search using the player's search method
    const query = `${title} ${place === 'youtube' ? 'youtube' : place === 'soundcloud' ? 'soundcloud' : ''}`.trim();
    const player = interaction.client.player;
    const searchResult = await player.search(query, {
      requestedBy: interaction.user,
      searchEngine: place === 'youtube' ? 'youtubeSearch' : place === 'soundcloud' ? 'soundcloudSearch' : 'autoSearch',
    });

    const results = searchResult.tracks;

    if (!results || results.length === 0) {
      return interaction.editReply({
        content: await phraseManager.getPhrase('music', 'queryNoResults')
      });
    }

    // Create select menu options
    const options = results.slice(0, 10).map((song, index) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(song.title.substring(0, 100))
        .setDescription(song.author ? song.author.substring(0, 100) : 'Unknown')
        .setValue(index.toString())
    );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('bp-query-select')
      .setPlaceholder(await phraseManager.getPhrase('music', 'querySelect'))
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    // Store search results in memory for the selection handler
    if (!global.queryResultsCache) global.queryResultsCache = new Map();
    global.queryResultsCache.set(interaction.user.id, {
      results: results,
      guildId: interaction.guildId,
      voiceChannelId: voiceChannel.id,
      timestamp: Date.now(),
    });
    // Auto-cleanup after 5 minutes
    setTimeout(() => {
      if (global.queryResultsCache?.has(interaction.user.id)) {
        global.queryResultsCache.delete(interaction.user.id);
      }
    }, 60000);

    return interaction.editReply({
      content: await phraseManager.getPhrase('music', 'queryResults'),
      components: [row],
    });
  } catch (error) {
    logger.error({ err: error }, '[Music] Query error');
    return interaction.editReply({
      content: await phraseManager.getPhrase('music', 'playError')
    });
  }
}

/**
 * Handle /bp music query select
 */
async function handleQuerySelect(interaction) {
  await interaction.deferReply();

  if (!global.queryResultsCache || !global.queryResultsCache.has(interaction.user.id)) {
    return interaction.editReply({
      content: '❌ Esta búsqueda ha expirado. Probá de nuevo con /bp music query.'
    });
  }

  const cached = global.queryResultsCache.get(interaction.user.id);
  const selectedIndex = parseInt(interaction.values[0], 10);
  const selectedSong = cached.results[selectedIndex];

  if (!selectedSong) {
    return interaction.editReply({
      content: '❌ Opción inválida. Probá de nuevo.'
    });
  }

  try {
    const player = interaction.client.player;
    const guild = interaction.client.guilds.cache.get(cached.guildId);
    if (!guild) {
      return interaction.editReply({ content: '❌ No pude encontrar el servidor.' });
    }
    const voiceChannel = guild.channels.cache.get(cached.voiceChannelId);
    if (!voiceChannel) {
      return interaction.editReply({ content: '❌ El canal de voz ya no existe.' });
    }

    await player.play(voiceChannel, selectedSong.url, {
      nodeOptions: {
        metadata: {
          channel: interaction.channel,
          requestedBy: interaction.member,
        },
        volume: 50,
        leaveOnEnd: false,
        leaveOnStop: false,
        leaveOnEmpty: true,
      },
      requestedBy: interaction.member,
    });

    // Clean up
    global.queryResultsCache.delete(interaction.user.id);

    return interaction.editReply({
      content: '🎵 Agregando **' + selectedSong.name + '** a la cola...',
      components: [],
    });
  } catch (error) {
    logger.error({ err: error }, '[Music] Query select error');
    return interaction.editReply({
      content: await phraseManager.getPhrase('music', 'playError'),
      components: [],
    });
  }
}

/**
 * Handle /bp music skip
 */
async function handleMusicSkip(interaction, client) {
  await interaction.deferReply();

  const queue = getQueue(interaction.guildId);

  if (!queue) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'skipNoQueue')
    });
  }

  try {
    // Check if only one song - skip will stop playback
    if (queue.tracks.size <= 1) {
      const song = queue.currentTrack;
      queue.node.stop(); // Stop clears queue and disconnects
      return interaction.editReply(await phraseManager.getPhrase('music', 'skipLastSong', {
        songName: song?.title || 'desconocida'
      }));
    }
    
    const song = queue.currentTrack;
    queue.node.skip();
    return interaction.editReply(await phraseManager.getPhrase('music', 'skip', {
      songName: song.title
    }));
  } catch (error) {
    logger.error({ err: error }, '[Music] skip error');
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

  const queue = getQueue(interaction.guildId);

  if (!queue) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'stopNoQueue')
    });
  }

  try {
    queue.node.stop();
    return interaction.editReply(await phraseManager.getPhrase('music', 'stop'));
  } catch (error) {
    logger.error({ err: error }, '[Music] stop error');
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

  const queue = getQueue(interaction.guildId);

  if (!queue) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'pauseNoQueue')
    });
  }

  try {
    queue.node.setPaused(true);
    return interaction.editReply(await phraseManager.getPhrase('music', 'pause'));
  } catch (error) {
    logger.error({ err: error }, '[Music] pause error');
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

  const queue = getQueue(interaction.guildId);

  if (!queue) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'resumeNoQueue')
    });
  }

  try {
    queue.node.setPaused(false);
    return interaction.editReply(await phraseManager.getPhrase('music', 'resume'));
  } catch (error) {
    logger.error({ err: error }, '[Music] resume error');
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

  const queue = getQueue(interaction.guildId);

  if (!queue || !queue.tracks.size) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'queueEmpty')
    });
  }

  const page = interaction.options.getInteger('page') || 1;
  const embed = queueEmbed(queue, page);
  return interaction.editReply({ embeds: [embed] });
}

/**
 * Handle /bp music nowplaying
 */
async function handleMusicNowPlaying(interaction, client) {
  await interaction.deferReply();

  const queue = getQueue(interaction.guildId);

  if (!queue || !queue.currentTrack) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'nowplayingEmpty')
    });
  }

  const track = queue.currentTrack;
  const embed = trackEmbed(track, 'Reproduciendo ahora');
  return interaction.editReply({ embeds: [embed] });
}

/**
 * Handle /bp music volume
 */
async function handleMusicVolume(interaction, client) {
  await interaction.deferReply();

  const queue = getQueue(interaction.guildId);
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
    queue.node.setVolume(volume);
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'volSet',  { volume })
    });
  } catch (error) {
    logger.error({ err: error }, '[Music] volume error');
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

  const queue = getQueue(interaction.guildId);
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
    
    queue.setRepeatMode(/** @type {import("discord-player").QueueRepeatMode} */ (modeNum));
    const modeText = { 0: 'apagado', 1: 'canción', 2: 'cola' }[modeNum];
    return interaction.editReply(await phraseManager.getPhrase('music', 'loopSet',  { mode: modeText }));
  } catch (error) {
    logger.error({ err: error }, '[Music] loop error');
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

  const queue = getQueue(interaction.guildId);

  if (!queue || queue.tracks.size <= 1) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'shuffleNoQueue')
    });
  }

  try {
    queue.tracks.shuffle();
    return interaction.editReply(await phraseManager.getPhrase('music', 'shuffle'));
  } catch (error) {
    logger.error({ err: error }, '[Music] shuffle error');
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

  const queue = getQueue(interaction.guildId);

  if (!queue || !queue.history.size) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('music', 'rewindNone')
    });
  }

  try {
    const track = queue.history[queue.history.size - 1];
    // queue.history.remove(queue.history.size - 1) // TODO: fix history removal;
    queue.tracks.add(track);
    return interaction.editReply(await phraseManager.getPhrase('music', 'rewind',  { 
      songName: track.title 
    }));
  } catch (error) {
    logger.error({ err: error }, '[Music] rewind error');
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

export {
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
  handleQuerySelect,
};


