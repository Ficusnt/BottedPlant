/**
 * musicCommands.js - Music-related slash command handlers
 * Extracted from bpCommand.js for modularity
 */

import { EmbedBuilder, MessageFlags, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } from 'discord.js';
import { queueEmbed, formatDuration } from '../embeds.js';
import { cmdLeave } from '../cmdLeave.js';
import * as dataStore from '../dataStore.js';
import * as phraseManager from '../phraseManager.js';
import config from '../config.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { logger } from '../logger.js';
import { distube } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Runs yt-dlp search via @distube/yt-dlp's json() API (cross-platform)
async function searchWithYtDlp(prefix, query) {
  const { json } = await import('@distube/yt-dlp');
  const data = await json(`${prefix}:${query}`, {
    dumpSingleJson: true,
    noWarnings: true,
  });
  const entries = Array.isArray(data) ? data : data.entries || [];
  return entries.map((e) => ({
    name: e.title || e.fulltitle || e.id,
    url: e.webpage_url || e.url,
    uploader: { name: e.uploader || e.artist || e.channel || 'Desconocido' },
    duration: e.duration || 0,
  }));
}

// Bandcamp's web search is JS-protected and its JSON APIs are blocked, so we
// search via DuckDuckGo (site:bandcamp.com/track) and decode redirect URLs.
async function searchBandcamp(query) {
  const searchUrl =
    'https://html.duckduckgo.com/html/?q=' +
    encodeURIComponent('site:bandcamp.com/track ' + query);
  const res = await fetch(searchUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    },
  });
  if (!res.ok) throw new Error(`DuckDuckGo responded ${res.status}`);
  const html = await res.text();

  const results = [];
  const anchorRe = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = anchorRe.exec(html)) && results.length < 5) {
    let link = m[1];
    const uddg = /uddg=([^&]+)/.exec(link);
    if (uddg) link = decodeURIComponent(uddg[1]);
    if (!/\/\/[^.]*\.bandcamp\.com\/track\//.test(link)) continue;

    const name = m[2].replace(/<[^>]+>/g, '').trim();
    const uploader = (/\/\/([^.]+)\.bandcamp\.com\//.exec(link) || [])[1] || 'Desconocido';
    results.push({ name, url: link, uploader: { name: uploader }, duration: 0 });
  }
  return results;
}

async function searchTracks(place, query) {
  if (place === 'bandcamp') return searchBandcamp(query);
  const prefix = place === 'soundcloud' ? 'scsearch5' : 'ytsearch5';
  return searchWithYtDlp(prefix, query);
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
    const distube = interaction.client.distube;
    await distube.play(voiceChannel, url, {
      member: interaction.member,
      textChannel: interaction.channel,
    });
  } catch (error) {
    logger.error({ err: error }, '[Music]  error');
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
    logger.error({ err: error }, '[Music]  error');
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
    // Search using yt-dlp search prefixes based on 'place'
    const results = await searchTracks(place, title);

    if (!results || results.length === 0) {
      return interaction.editReply({
        content: await phraseManager.getPhrase('music', 'queryNoResults')
      });
    }

    // Create select menu options
    const options = results.slice(0, 10).map((song, index) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(song.name.substring(0, 100))
        .setDescription(song.uploader ? song.uploader.name.substring(0, 100) : 'Unknown')
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
      results,
      voiceChannelId: voiceChannel.id,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
    });
    // Auto-cleanup after 5 minutes
    setTimeout(() => global.queryResultsCache?.delete(interaction.user.id), 5 * 60 * 1000);

    return interaction.editReply({
      content: '🎵 **Resultados de búsqueda:** Elegí una opción:',
      components: [row],
    });
  } catch (error) {
    logger.error({ err: error }, '[Music] Play error');
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
    const client = interaction.client;
    const guild = client.guilds.cache.get(cached.guildId);
    if (!guild) {
      return interaction.editReply({ content: '❌ No pude encontrar el servidor.' });
    }
    const voiceChannel = guild.channels.cache.get(cached.voiceChannelId);
    if (!voiceChannel) {
      return interaction.editReply({ content: '❌ El canal de voz ya no existe.' });
    }

    const distube = client.distube;
    await distube.play(voiceChannel, selectedSong.url, {
      member: interaction.member,
      textChannel: interaction.channel,
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
    logger.error({ err: error }, '[Music]  error');
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
    logger.error({ err: error }, '[Music]  error');
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
    logger.error({ err: error }, '[Music]  error');
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
    logger.error({ err: error }, '[Music]  error');
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
    logger.error({ err: error }, '[Music]  error');
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
    logger.error({ err: error }, '[Music]  error');
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
    logger.error({ err: error }, '[Music]  error');
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
    logger.error({ err: error }, '[Music]  error');
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
    logger.error({ err: error }, '[Music]  error');
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
    logger.error({ err: error }, '[Music]  error');
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

