// @ts-nocheck
/**
 * @typedef {import('discord.js').ChatInputCommandInteraction} ChatInputCommandInteraction
 * @typedef {import('distube').Queue} Queue
 * @typedef {import('distube').Song} Song
 * @typedef {import('distube').Playlist} Playlist
 * @typedef {import('discord.js').Guild} Guild
 * @typedef {import('discord.js').VoiceChannel} VoiceChannel
 * @typedef {import('discord.js').TextChannel} TextChannel
 * @typedef {import('discord.js').Collection} Collection
 * @typedef {import('distube').DisTubeEvents} DisTubeEvents
 */

import { Client, GatewayIntentBits, ActivityType } from 'discord.js';
import config from './config.js';
import { logger } from './logger.js';
import { registerSlashCommands, handleInteraction } from './bpCommand.js';
import { handleMessage } from './handlers/messageHandler.js';
import { scheduleReminders } from './handlers/reminders.js';
import * as dataStore from './dataStore.js';
import { loadShitposts, loadMedia } from './shitpost.js';
import * as phraseManager from './phraseManager.js';
import { formatDuration, trackEmbed, playlistEmbed } from './embeds.js';
import { getFfmpegPath } from './ffmpeg.js';
import { autoInitialize, getActiveBackend, shutdownAll } from './audio/backends/index.js';

/** @type {import('discord.js').Client & { distube: import('distube').DisTube }} */
let client;

/** @type {import('distube').DisTube} */
let distube;

if (!config.token) {
  logger.error('DISCORD_TOKEN is missing. Create a .env file from .env.example');
  process.exit(1);
}

// Initialize audio backend (defaults to Distube for backward compatibility)
const backendConfig = {
  ytdlpPath: config.ytdlpPath,
  cookiesFile: config.cookiesFile,
  ffmpegOptions: {},
  lavalink: config.lavalink,
};

client = /** @type {import('discord.js').Client & { distube: import('distube').DisTube }} */ (new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
  ],
}) /** @type {import('discord.js').Client & { distube: import('distube').DisTube }} */);

// Initialize audio backend after client is created
await autoInitialize(backendConfig);

// Set Discord client on Distube backend if using Distube
const activeBackend = getActiveBackend();
if (activeBackend.name === 'distube' && activeBackend.setClient) {
  distube = await activeBackend.setClient(client);
  client.distube = distube;
}

console.log(`[Audio] Using backend: ${activeBackend.name}`);

// ---- DisTube event handlers (only if using Distube backend) ----
if (distube) {
  // @ts-ignore
  distube
    .on('playSong', (queue, song) => {
      const duration = formatDuration(song.duration);
      const requester = song.member.displayName || 'Alguien';
      /** @type {import('discord.js').TextChannel} */
      const textChannel = queue.textChannel;
      textChannel
        .send(`🎵 **${song.name}** — pedida por **${requester}**`)
        .catch((e) => logger.error({ err: e }, '[distube] playSong send error'));
    })
    .on('addSong', (queue, song) => {
      const embed = trackEmbed(song, ' Añadida a la cola');
      /** @type {import('discord.js').TextChannel} */
      const textChannel = queue.textChannel;
      textChannel
        .send({ content: song.url, embeds: [embed] })
        .catch((e) => logger.error({ err: e }, '[distube] addSong send error'));
    })
    .on('addList', (queue, playlist) => {
      const embed = playlistEmbed(playlist);
      /** @type {import('discord.js').TextChannel} */
      const textChannel = queue.textChannel;
      textChannel
        .send({ content: playlist.url, embeds: [embed] })
        .catch((e) => logger.error({ err: e }, '[distube] addList send error'));
    })
    .on('error', (channel, error) => {
      logger.error({ err: error }, '[distube] error');
      if (channel && channel.send) {
        channel.send(`❌ Error al reproducir: ${error.message}`).catch(() => {});
      }
    })
    .on('empty', (channel) => {
      logger.info('[distube] Queue empty, leaving voice channel');
    })
    .on('finish', (queue) => {
      logger.info('[distube] Queue finished');
    });
}

// ---- Client events ----
client.once('clientReady', () => {
  logger.info('Fotosintesis lista!');
  registerSlashCommands(client);
  scheduleReminders(client);
  loadShitposts();
  loadMedia(client);
  client.user.setPresence({
    activities: [{ name: 'con la luz del sol ☀️', type: ActivityType.Playing }],
    status: 'online',
  });
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) {return;}
  await handleInteraction(interaction, client);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) {return;}
  await handleMessage(message, client);
});

// ---- Voice inactivity timeout ----
setInterval(() => {
  for (const guild of client.guilds.cache.values()) {
    if (distube) {
      const queue = distube.getQueue(guild.id);
      if (queue) {
        const now = Date.now();
        const lastActivity = queue.lastActivity || queue.playing?.timestamp || now;
        if (now - lastActivity > 10 * 60 * 1000) {
          logger.info(`[VoiceTimeout] Disconnecting from ${guild.name} (inactive)`);
          queue.stop();
        }
      }
    }
  }
}, 60 * 1000);

// ---- Birthday announcements ----
async function checkBirthdays() {
  const now = new Date();
  if (now.getHours() !== 10 || now.getMinutes() !== 0) {return;}

  const birthdays = await dataStore.getAllBirthdays();
  const today = { month: now.getMonth() + 1, day: now.getDate() };
  const todaysUsers = Object.entries(birthdays).filter(([, b]) => b.month === today.month && b.day === today.day);
  if (!todaysUsers.length) {return;}

  const year = now.getFullYear();
  const unannounced = [];
  for (const [uid] of todaysUsers) {
    if (!(await dataStore.wasBirthdayAnnounced(uid, year))) {unannounced.push([uid]);}
  }
  if (!unannounced.length) {return;}

  const guilds = [...client.guilds.cache.values()];
  for (let i = 0; i < guilds.length; i++) {
    const guild = guilds[i];
    try {
      let channel = null;
      const configuredChannelId = await dataStore.getAnnouncementChannelId(guild.id);
      if (configuredChannelId) {channel = guild.channels.cache.get(configuredChannelId);}
      if (!channel) {
        channel = guild.channels.cache.find(c => c.name === 'general' || c.name.includes('general')) ||
          guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(guild.members.me).has('SendMessages'));
      }
      if (!channel) {continue;}

      const mentions = unannounced.map(([uid]) => `<@${uid}>`).join(' ');
      const msg = await phraseManager.getPhrase('reminders', 'birthdayAnnouncement', { mentions });
      await channel.send(msg);
      for (const [uid] of unannounced) {await dataStore.markBirthdayAnnounced(uid, year);}
    } catch (err) {
      logger.error({ err }, `[BIRTHDAY] Error in guild ${guild.id}`);
    }
    if (i < guilds.length - 1) {await sleep(250);}
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const msToNextHour = (60 - new Date().getMinutes()) * 60 * 1000 - new Date().getSeconds() * 1000;
setTimeout(() => {
  checkBirthdays();
  setInterval(checkBirthdays, 60 * 60 * 1000);
}, msToNextHour > 0 ? msToNextHour : 60 * 60 * 1000);

// ---- Error handling ----
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled Rejection');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught Exception');
  shutdownAll().finally(() => process.exit(1));
});

process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await shutdownAll();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await shutdownAll();
  process.exit(0);
});

// Login
client.login(config.token);
export { client, distube };
