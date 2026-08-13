const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { DisTube } = require('distube');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const config = require('./config');
const { registerSlashCommands, handleInteraction, handleMessage } = require('./bpCommand');
const { scheduleReminders } = require('./handlers/reminders');
const dataStore = require('./dataStore');

if (!config.token) {
  console.error('DISCORD_TOKEN is missing. Create a .env file from .env.example');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
  ],
});

const disTubeOptions = {
  plugins: [new SoundCloudPlugin(), new YtDlpPlugin({ update: false })],
  emitNewSongOnly: true,
  savePreviousSongs: true,
};

const distube = new DisTube(client, disTubeOptions);

// Store distube on client for handler access
client.distube = distube;

// ---- DisTube event handlers ----
distube
  .on('playSong', (queue, song) => {
    const embed = require('./embeds').trackEmbed(song, '▶️ Sonando ahora');
    // URL alone → Discord renders native YouTube/SoundCloud video player embed
    queue.textChannel.send({ content: song.url, embeds: [embed] }).catch((e) => console.error('[distube] playSong send error:', e));
  })
  .on('addSong', (queue, song) => {
    const embed = require('./embeds').trackEmbed(song, '➕ Añadida a la cola');
    queue.textChannel.send({ content: song.url, embeds: [embed] }).catch((e) => console.error('[distube] addSong send error:', e));
  })
  .on('addList', (queue, playlist) => {
    const embed = require('./embeds').playlistEmbed(playlist);
    queue.textChannel?.send({ embeds: [embed] }).catch((e) => console.error('[distube] addList send error:', e));
  })
  .on('finish', (queue) => {
    queue.textChannel?.send('✅ ¡Terminó la cola! Bajo mis hojas por hoy. Fue un placer compartir fotosíntesis musical. ¡Hasta la próxima! c: 🍃').catch(() => {});
  })
  .on('empty', (queue) => {
    queue.textChannel?.send('👋 ¡Se fueron todos! Me quedo solo como planta de oficina... bueno, me voy a la maceta. ¡Chau! :P 🪴').catch(() => {});
  })
  .on('error', (channel, error) => {
    console.error('DisTube error:', error);
    channel?.send(`❌ ¡Uy! Se me enredaron las raíces del audio: \`${error.message.slice(0, 400)}\``).catch(() => {});
  });

// ---- Client events ----
// discord.js v14.27+ renames 'ready' → 'clientReady' (the old name stops emitting in v15)
client.once('clientReady', () => {
  console.log(`¡Me conecté a Discord! Soy una planta digital ^_^`);
  console.log(`Soy ${client.user.tag} (${client.user.id})`);
  client.user.setActivity(`🍃 el unico bot que no te deja plantado — /bp help`, { type: ActivityType.Listening });

  registerSlashCommands(client).catch((err) => console.error('Error registering slash commands:', err));
  scheduleReminders(client);
  checkBirthdays().catch((err) => console.error('[BIRTHDAY] Error in initial check:', err));
  setInterval(() => {
    checkBirthdays().catch((err) => console.error('[BIRTHDAY] Error in scheduled check:', err));
  }, 60 * 60 * 1000);
});

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

  for (const guild of client.guilds.cache.values()) {
    try {
      const channel =
        guild.channels.cache.find((c) => c.name === 'general' || c.name.includes('general')) ||
        guild.channels.cache.find((c) => c.type === 0 && c.permissionsFor(guild.members.me)?.has('SendMessages'));
      if (!channel) continue;

      const mentions = unannounced
        .map(([uid]) => `<@${uid}>`)
        .join(' ');
      await channel.send(
        `🎂 **¡HOY ES EL CUMPLE DE ${mentions}!!**\n` +
        `@everyone ¡Que florezcan los deseos! Deseenles un **feliz cumpleaños** y riéguenlos de cariño 🎉🌿✨`
      );
      for (const [uid] of unannounced) await dataStore.markBirthdayAnnounced(uid, year);
      console.log(`[BIRTHDAY] Announced ${unannounced.length} birthday(s) in ${guild.name}`);
    } catch (err) {
      console.error('Error announcing birthdays in', guild.name, err);
    }
  }
}

client.on('guildCreate', (guild) => {
  // Auto-register commands in newly joined servers
  guild.commands
    .set(require('./bpCommand').bpCommandData().toJSON())
    .then(() => console.log(`Registered /bp in new guild: ${guild.name}`))
    .catch((err) => console.error('Error registering commands in new guild:', err));
});

client.on('interactionCreate', (interaction) => {
  handleInteraction(interaction);
});

// Trigger words handler (GigaSlothy port)
client.on('messageCreate', (message) => {
  handleMessage(message).catch((err) => console.error('[messageCreate] Error:', err));
});

// ---- Process-level error guards (prevent crashes from unhandled async) ----
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
process.on('warning', (warning) => {
  console.warn('[node warning]', warning.message);
});

client.login(config.token).catch((err) => {
  console.error('Failed to login:', err);
  process.exit(1);
});