// @ts-nocheck
/**
 * @typedef {import('discord.js').ChatInputCommandInteraction} ChatInputCommandInteraction
 * @typedef {import('discord-player').GuildQueue} GuildQueue
 * @typedef {import('discord-player').Track} Track
 * @typedef {import('discord-player').Playlist} Playlist
 * @typedef {import('discord.js').Guild} Guild
 * @typedef {import('discord.js').VoiceChannel} VoiceChannel
 * @typedef {import('discord.js').TextChannel} TextChannel
 * @typedef {import('discord.js').Collection} Collection
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
import { createPlayer, registerExtractors, setupPlayerEvents } from './player.js';

/** @type {import('discord.js').Client & { player: import('discord-player').Player }} */
let client;

/** @type {import('discord-player').Player} */
let player;

if (!config.token) {
  logger.error('DISCORD_TOKEN is missing. Create a .env file from .env.example');
  process.exit(1);
}

// Detect best available FFmpeg (system preferred, bundled fallback)
const ffmpegPath = await getFfmpegPath();

client = /** @type {import('discord.js').Client & { player: import('discord-player').Player }} */ (new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
  ],
}) /** @type {import('discord.js').Client & { player: import('discord-player').Player }} */);

// Create and configure the player
player = await createPlayer(client);
client.player = player;

// Register extractors
await registerExtractors(player);

// Set up player event handlers
setupPlayerEvents(player);

// ---- Client events ----
// discord.js v14.27+ renames 'ready' → 'clientReady' (old name stops emitting in v15)
client.once('clientReady', () => {
  logger.info('Fotosintesis lista!');
  logger.info('La planta digital a su servicio!');
  client.user.setActivity('🍃 el unico bot que no te deja plantado — /bp help', {
    type: ActivityType.Listening,
  });

  scheduleReminders(client);
  loadShitposts().catch((err) => logger.error({ err }, '[SHITPOST] Error loading shitposts'));
  loadMedia().catch((err) => console.error('[SHITPOST] Error loading media:', err));
  // Initial birthday check
  checkBirthdays().catch((err) => console.error('[BIRTHDAY] Error in initial check:', err));

  // Schedule hourly checks aligned to :00 minute boundary
  const now = new Date();
  const msToNextHour = (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000 - now.getMilliseconds();
  setTimeout(() => {
    checkBirthdays().catch((err) => console.error('[BIRTHDAY] Error in scheduled check:', err));
    setInterval(() => {
      checkBirthdays().catch((err) => logger.error({ err }, '[BIRTHDAY] Error in scheduled check'));
    }, 60 * 60 * 1000);
  }, msToNextHour > 0 ? msToNextHour : 60 * 60 * 1000);
});

// Rate-limit helper: small delay between guild operations to avoid hitting global limits
const RATE_LIMIT_DELAY_MS = 250;
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- GigaSlothy port: automatic birthday announcements ----
async function checkBirthdays() {
  const now = new Date();
  const today = { month: now.getMonth() + 1, day: now.getDate() };
  const birthdays = await dataStore.getBirthdays();

  const todaysUsers = Object.entries(birthdays).filter(
    ([, b]) => b.month === today.month && b.day === today.day
  );

  if (!todaysUsers.length) return;

  const year = now.getFullYear();
  const unannounced = [];
  for (const [uid] of todaysUsers) {
    if (!(await dataStore.wasBirthdayAnnounced(uid, year))) unannounced.push([uid]);
  }
  if (!unannounced.length) return;

  const guilds = [...client.guilds.cache.values()];
  for (let i = 0; i < guilds.length; i++) {
    const guild = guilds[i];
    try {
      // Try configured announcement channel first
      let channel = null;
      const configuredChannelId = await dataStore.getAnnouncementChannelId(guild.id);
      if (configuredChannelId) {
        channel = guild.channels.cache.get(configuredChannelId);
      }
      // Fallback to auto-detect
      if (!channel) {
        channel =
          guild.channels.cache.find((c) => c.name === 'general' || c.name.includes('general')) ||
          guild.channels.cache.find(
            (c) => c.type === 0 && c.permissionsFor(guild.members.me).has('SendMessages')
          );
      }
      if (!channel) continue;

      const mentions = unannounced.map(([uid]) => `<@${uid}>`).join(' ');
      const msg = await phraseManager.getPhrase('reminders', 'birthdayAnnouncement', {
        mentions,
      });
      await channel.send(msg);
      for (const [uid] of unannounced) await dataStore.markBirthdayAnnounced(uid, year);
    } catch (err) {
      logger.error({ err }, `[BIRTHDAY] Error in guild ${guild.id}`);
    }
    // Rate-limit delay between guilds (skip after last)
    if (i < guilds.length - 1) await sleep(RATE_LIMIT_DELAY_MS);
  }
}
// ---- Voice inactivity timeout ----
// Disconnect from voice channels after 10 minutes of inactivity
setInterval(() => {
  for (const guild of client.guilds.cache.values()) {
    const queue = player.queues.get(guild.id);
    if (queue && queue.channel) {
      const members = queue.channel.members.filter((m) => !m.user.bot);
      if (members.size === 0) {
        logger.info(`[Voice] No users in ${guild.name}, disconnecting.`);
        queue.destroy();
        queue.channel.leave().catch((err) => logger.error({ err }, '[Voice] Error leaving channel'));
      }
    }
  }
}, 10 * 60 * 1000); // Check every 10 minutes

client.on('guildCreate', async (guild) => {
  // Auto-register commands in newly joined servers
  try {
    const { bpCommandData } = await import('./bpCommand.js');
    const data = bpCommandData().toJSON();
    await guild.commands.set([data]);
    logger.info(`Registered /bp in new guild: ${guild.name}`);
  } catch (err) {
    logger.error({ err }, 'Error registering commands in new guild');
  }
});

client.on('interactionCreate', (interaction) => {
  handleInteraction(interaction);
});

// Trigger words handler (GigaSlothy port)
client.on('messageCreate', (message) => {
  handleMessage(message).catch((err) => logger.error({ err }, '[messageCreate] Error'));
});

// ---- Process-level error guards (prevent crashes from unhandled async) ----
process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'Unhandled rejection');
});
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
});
process.on('warning', (warning) => {
  logger.warn({ message: warning.message }, '[node warning]');
});

client.login(config.token).catch((err) => {
  logger.error({ err }, 'Failed to login');
  process.exit(1);
});

export { client, player };