const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const dataStore = require('./dataStore');
const { queueEmbed, formatDuration } = require('./embeds');
const { cmdLeave } = require('./cmdLeave');
const { handleMessage, runEconomyCommand } = require('./economy');
const reactions = require('./reactions');
const { music, reminders, fun, rand } = reactions;

const execFileAsync = promisify(execFile);

// ---------------- Command definition ----------------

function bpCommandData() {
  return new SlashCommandBuilder()
    .setName('bp')
    .setDescription('BottedPlant — música, recordatorios y diversión')
    // 🎵 Music group
    .addSubcommandGroup((group) =>
      group
        .setName('music')
        .setDescription('Comandos de música')
        .addSubcommand((sub) =>
          sub
            .setName('play')
            .setDescription('Reproducir audio (YouTube, SoundCloud, Bandcamp, radio)')
            .addStringOption((opt) => opt.setName('url').setDescription('URL o búsqueda').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('playlist')
            .setDescription('Agregar una playlist completa a la cola')
            .addStringOption((opt) => opt.setName('url').setDescription('URL de la playlist').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('query')
            .setDescription('Buscar un título en YouTube, SoundCloud o Bandcamp y reproducirlo')
            .addStringOption((opt) =>
              opt
                .setName('place')
                .setDescription('Dónde buscar')
                .setRequired(true)
                .addChoices(
                  { name: 'YouTube', value: 'youtube' },
                  { name: 'SoundCloud', value: 'soundcloud' },
                  { name: 'Bandcamp', value: 'bandcamp' }
                )
            )
            .addStringOption((opt) => opt.setName('title').setDescription('Título a buscar').setRequired(true))
        )
        .addSubcommand((sub) => sub.setName('stop').setDescription('Detener y salir del canal de voz'))
        .addSubcommand((sub) => sub.setName('leave').setDescription('Salir del canal de voz'))
        .addSubcommand((sub) => sub.setName('skip').setDescription('Saltar la canción actual'))
        .addSubcommand((sub) => sub.setName('rewind').setDescription('Rebobinar la canción actual desde el principio'))
        .addSubcommand((sub) => sub.setName('queue').setDescription('Mostrar la cola de reproducción'))
        .addSubcommand((sub) => sub.setName('clear').setDescription('Vaciar la cola de reproducción'))
    )
    // ⏰ Remember group
    .addSubcommandGroup((group) =>
      group
        .setName('remember')
        .setDescription('Recordatorios y cumpleaños')
        .addSubcommand((sub) =>
          sub
            .setName('remind')
            .setDescription('Programar un recordatorio')
            .addStringOption((opt) => opt.setName('datetime').setDescription('Fecha y hora: YYYY-MM-DD HH:MM').setRequired(true))
            .addStringOption((opt) => opt.setName('message').setDescription('Mensaje del recordatorio').setRequired(true))
        )
        .addSubcommand((sub) => sub.setName('reminders').setDescription('Listar tus recordatorios pendientes'))
        .addSubcommand((sub) =>
          sub
            .setName('cancelremind')
            .setDescription('Cancelar un recordatorio')
            .addStringOption((opt) => opt.setName('id').setDescription('ID del recordatorio').setRequired(true))
        )
        // 🎂 Birthdays
        .addSubcommand((sub) =>
          sub
            .setName('birthday')
            .setDescription('Guardar tu cumpleaños')
            .addIntegerOption((opt) => opt.setName('month').setDescription('Mes (1-12)').setRequired(true).setMinValue(1).setMaxValue(12))
            .addIntegerOption((opt) => opt.setName('day').setDescription('Día (1-31)').setRequired(true).setMinValue(1).setMaxValue(31))
        )
        .addSubcommand((sub) => sub.setName('birthdays').setDescription('Listar todos los cumpleaños'))
    )
    // 🎮 Fun group
    .addSubcommandGroup((group) =>
      group
        .setName('fun')
        .setDescription('Comandos de diversión')
        .addSubcommand((sub) => sub.setName('status').setDescription('Cambiar el estado del bot'))
        .addSubcommand((sub) => sub.setName('hola').setDescription('Respondo con "ola"'))
        .addSubcommand((sub) => sub.setName('japish').setDescription('Basoooura.'))
        .addSubcommand((sub) => sub.setName('goodgirl').setDescription('¿Soy una buena chica?'))
        .addSubcommand((sub) => sub.setName('avatar').setDescription('Mostrar el avatar del bot'))
        .addSubcommand((sub) =>
          sub
            .setName('rola')
            .setDescription('Calificar la canción de Spotify (0-10)')
            .addUserOption((opt) => opt.setName('user').setDescription('Usuario (opcional, por defecto vos)'))
        )
        .addSubcommand((sub) =>
          sub
            .setName('latex')
            .setDescription('Renderizar una ecuación en LaTeX')
            .addStringOption((opt) => opt.setName('equation').setDescription('Ecuación (ej: x^2+y^2=z^2)').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('safebooru')
            .setDescription('Buscar imagen en Safebooru')
            .addStringOption((opt) => opt.setName('tags').setDescription('Tags (ej: ahegao)').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('8ball')
            .setDescription('Preguntale a la bola mágica')
            .addStringOption((opt) => opt.setName('question').setDescription('Tu pregunta').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('roll')
            .setDescription('Tirar dados (ej: d20, 2d6)')
            .addStringOption((opt) => opt.setName('dice').setDescription('Formato NdS').setRequired(true))
        )
        .addSubcommand((sub) => sub.setName('coinflip').setDescription('Tirar una moneda'))
        .addSubcommand((sub) =>
          sub
            .setName('uwu')
            .setDescription('Uwuificar un texto')
            .addStringOption((o) => o.setName('text').setDescription('Texto a uwuificar').setRequired(true))
        )
    )
    // 🍃 Leaves group
    .addSubcommandGroup((group) =>
      group
        .setName('leaves')
        .setDescription('Hojas — economía y apuestas')
        .addSubcommand((s) => s.setName('daily').setDescription('Regá a BottedPlant y ganá hojas (racha diaria)'))
        .addSubcommand((s) =>
          s
            .setName('points')
            .setDescription('Ver tus hojas')
            .addUserOption((o) => o.setName('user').setDescription('Usuario (opcional)'))
        )
        .addSubcommand((s) => s.setName('leaderboard').setDescription('Top 10 de hojas del servidor'))
        .addSubcommand((s) =>
          s
            .setName('gamble')
            .setDescription('Crear una apuesta')
            .addStringOption((o) => o.setName('text').setDescription('Afirmación | opción 1 | opción 2').setRequired(true))
        )
        .addSubcommand((s) =>
          s
            .setName('bet')
            .setDescription('Apostar hojas a una apuesta')
            .addStringOption((o) => o.setName('id').setDescription('ID de la apuesta').setRequired(true))
            .addIntegerOption((o) => o.setName('choice').setDescription('Número de opción').setRequired(true))
            .addIntegerOption((o) => o.setName('amount').setDescription('Cantidad de hojas').setRequired(true))
        )
        .addSubcommand((s) =>
          s
            .setName('redeem')
            .setDescription('Cerrar la apuesta y repartir ganancias')
            .addStringOption((o) => o.setName('id').setDescription('ID de la apuesta').setRequired(true))
            .addIntegerOption((o) => o.setName('choice').setDescription('Opción ganadora').setRequired(true))
        )
    )
    .addSubcommand((sub) => sub.setName('help').setDescription('Mostrar todos los comandos'));
}

// ---------------- Helpers ----------------

function getVoiceChannel(interaction) {
  return interaction.member?.voice?.channel || null;
}

function getQueue(interaction) {
  return interaction.client.distube.getQueue(interaction.guildId);
}

function isPlaylistUrl(url) {
  return /(youtube\.com\/(playlist|watch)|youtu\.be)[^ ]*[?&]list=|soundcloud\.com\/[^ ]+\/sets\/|bandcamp\.com\/[^ ]+\/album\//i.test(url);
}

// ---------------- Registro ----------------

async function registerSlashCommands(client) {
  const data = bpCommandData().toJSON();
  const guilds = [...client.guilds.cache.values()];

  if (guilds.length === 0) {
    // No servers yet: register globally for future guilds
    try {
      await client.application.commands.set([data]);
      console.log('Slash commands registered globally (fallback).');
    } catch (err) {
      console.error('Error registering global commands:', err);
    }
    return;
  }

  for (const guild of guilds) {
    try {
      await guild.commands.set([data]);
      console.log(`Registered /bp in ${guild.name}`);
    } catch (err) {
      console.error(`Error registering commands in ${guild.name}:`, err);
    }
  }
}

// ---------------- Dispatcher ----------------

// Wraps any interaction handler so a thrown error can never crash the bot.
// Replies gracefully depending on whether the interaction was already answered.
async function handleInteractionSafely(fn, interaction) {
  try {
    await fn();
  } catch (err) {
    console.error(`[bp] Error handling interaction:`, err);
    const msg = `❌ ¡Uy! Se me enredaron las raíces: \`${(err.message || String(err)).slice(0, 300)}\``;
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: msg }).catch(() => {});
      } else {
        await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
      }
    } catch (replyErr) {
      console.error('[bp] Could not reply to failed interaction:', replyErr);
    }
  }
}

async function handleInteraction(interaction) {
  // 🎶 Selection from /bp query → play the chosen result directly
  if (interaction.isStringSelectMenu() && interaction.customId === 'bp-query-select') {
    return handleInteractionSafely(() => handleQuerySelect(interaction), interaction);
  }

  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'bp') return;

  const sub = interaction.options.getSubcommand();

  await handleInteractionSafely(async () => {
    switch (sub) {
      // ----- Music -----
      case 'play':
        await cmdPlay(interaction);
        break;
      case 'playlist':
        await cmdPlaylist(interaction);
        break;
      case 'query':
        await cmdQuery(interaction);
        break;
      case 'stop':
        await cmdStop(interaction);
        break;
      case 'leave':
        await cmdLeave(interaction);
        break;
      case 'skip':
        await cmdSkip(interaction);
        break;
      case 'rewind':
        await cmdRewind(interaction);
        break;
      case 'queue':
        await cmdQueue(interaction);
        break;
      case 'clear':
        await cmdClear(interaction);
        break;
      // ----- Reminders -----
      case 'remind':
        await cmdRemind(interaction);
        break;
      case 'reminders':
        await cmdReminders(interaction);
        break;
      case 'cancelremind':
        await cmdCancelRemind(interaction);
        break;
      // ----- Birthdays -----
      case 'birthday':
        await cmdBirthday(interaction);
        break;
      case 'birthdays':
        await cmdBirthdays(interaction);
        break;
      // ----- Fun -----
      case 'status':
        await cmdStatus(interaction);
        break;
      case 'hola':
        await interaction.reply(rand(['¡ola! O sea... yo, la planta. c:', '¡olaaaa! ¿Me regás mientras hablamos? 🌿', '¡ola! Que soy de hoja... perdón, de onda. 🍃']));
        break;
      case 'japish':
        await interaction.reply(rand(['JAPISH JAPISH.', 'ARRRGH.', 'BASOOOURA.', '¡GRAGH! >:c', 'uwu', '¡JAPISH! (me lo dijo una abeja, no pregunten) 🐝']));
        break;
      case 'goodgirl':
        await interaction.reply(rand(['¡Yo! Siempre bien regada y al solcito c:', '¡La másss buena del jardín! ✨', '¿Yo? Soy planta... siempre soy buena chica, no puedo portarme mal. uwu', '¡Me esfuerzo en crecer derechita! 🌱']));
        break;
      case 'avatar':
        await interaction.reply(interaction.client.user.displayAvatarURL({ size: 1024 }));
        break;
      case 'rola':
        await cmdRola(interaction);
        break;
      case 'latex':
        await cmdLatex(interaction);
        break;
      case 'safebooru':
        await cmdSafebooru(interaction);
        break;
      case '8ball':
        await cmd8Ball(interaction);
        break;
      case 'roll':
        await cmdRoll(interaction);
        break;
      case 'coinflip':
        await interaction.reply(rand(['Cara', 'Ceca']) + `! (${rand(['a mí me saldría siempre "césped"', 'mis raíces no apuestan, no tienen piernas', 'cara de... hoja? 🍃', 'quién dijo que las plantas no tienen suerte? 🌿'])})`);
        break;
      case 'uwu':
        await runEconomyCommand('uwu', interaction);
        break;
      // ----- Economy (leaves) -----
      case 'daily':
      case 'points':
      case 'leaderboard':
      case 'gamble':
      case 'bet':
      case 'redeem':
        await runEconomyCommand(sub, interaction);
        break;
      case 'help':
        await cmdHelp(interaction);
        break;
      default:
        await interaction.reply(fun.unknownCommand);
    }
  }, interaction);
}

// ---------------- Music ----------------

async function cmdPlay(interaction) {
  const channel = getVoiceChannel(interaction);
  if (!channel) {
    return interaction.reply({ content: '🔇 ¡Che! Si no estás en un canal de voz, mis raíces no te oyen. Metete a uno y te pongo el tema. 🌱', ephemeral: true });
  }
  const query = interaction.options.getString('url');
  await interaction.deferReply();

  const distube = interaction.client.distube;
  await distube.play(channel, query, {
    member: interaction.member,
    textChannel: interaction.channel,
  });
  await interaction.editReply(`🔍 Buscando \`${query.slice(0, 100)}\`... ya va, que hasta las plantas tenemos nuestros tiempos. 🌿`);
}

async function cmdPlaylist(interaction) {
  const channel = getVoiceChannel(interaction);
  if (!channel) {
    return interaction.reply({ content: '🔇 Che, no te escucho desde acá... entrá a un canal de voz y regame con música. 🌿', ephemeral: true });
  }
  const url = interaction.options.getString('url');
  if (!isPlaylistUrl(url)) {
    return interaction.reply({
      content: '❌ Eso no parece una playlist, che. Usá `/bp music play <url>` para canciones sueltas... mi familia es toda una playlist de hojas, así que algo sé. 🍃',
      ephemeral: true,
    });
  }
  await interaction.deferReply();

  const distube = interaction.client.distube;
  await distube.play(channel, url, {
    member: interaction.member,
    textChannel: interaction.channel,
  });
  await interaction.editReply(`📃 Agregando playlist \`${url.slice(0, 100)}\` a la cola... ¡que crezca el repertorio! 🍃`);
}

async function cmdQuery(interaction) {
  const channel = getVoiceChannel(interaction);
  if (!channel) {
    return interaction.reply({ content: '🔇 ¡Che! Sin canal de voz no hay búsqueda... mis hojas no captan señales sin vos. 🌿', ephemeral: true });
  }
  const place = interaction.options.getString('place');
  const title = interaction.options.getString('title');
  await interaction.deferReply();

  try {
    const results = await searchTracks(place, title);

    if (!results.length) {
      return interaction.editReply(`🔍 No encontré nada para **"${title}"** en **${place}**... se me secaron las hojas de tanto buscar. :c`);
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('bp-query-select')
      .setPlaceholder('Elegí un resultado...')
      .addOptions(
        results.slice(0, 5).map((res) => ({
          label: res.name.slice(0, 100),
          value: res.url,
          description: `${res.uploader.name} · ${formatDuration(res.duration)}`.slice(0, 100),
        }))
      );

    await interaction.editReply({
      content: `🔍 Resultados de **"${title}"** en **${place}**: (elegí con cariño, que las plantas tenemos gustos) 🌱`,
      components: [new ActionRowBuilder().addComponents(menu)],
    });
  } catch (err) {
    console.error('Error in cmdQuery:', err);
    await interaction.editReply(`❌ No pude buscar en **${place}**: \`${err.message?.slice(0, 200) || err}\`... hasta mis raíces se enredaron.`).catch(() => {});
  }
}

async function handleQuerySelect(interaction) {
  const url = interaction.values[0];
  const channel = getVoiceChannel(interaction);
  if (!channel) {
    return interaction.reply({
      content: '🔇 Che, ya no estás en el canal de voz... enraizate de nuevo y usá `/bp music query` o `/bp music play <url>`. :P',
      ephemeral: true,
    });
  }

  await interaction.deferUpdate();
  try {
    await interaction.client.distube.play(channel, url, {
      member: interaction.member,
      textChannel: interaction.channel,
    });
    await interaction.editReply({ content: `▶️ ¡Dale! Eso me hace vibrar las hojas... 🎶🍃`, components: [] });
  } catch (err) {
    console.error('Error playing query selection:', err);
    await interaction
      .editReply({ content: `❌ No pude reproducir eso: \`${err.message?.slice(0, 200) || err}\`... se me cayó una hoja del disgusto. 🍂`, components: [] })
      .catch(() => {});
  }
}

// Entry point for /bp query — dispatches per platform.
async function searchTracks(place, query) {
  if (place === 'bandcamp') return searchBandcamp(query);
  const prefix = place === 'soundcloud' ? 'scsearch5' : 'ytsearch5';
  return searchWithYtDlp(prefix, query);
}

// Runs yt-dlp directly with a search prefix (ytsearch5 / scsearch5)
async function searchWithYtDlp(prefix, query) {
  const ytDlp = path.join(__dirname, '..', 'node_modules', '@distube', 'yt-dlp', 'bin', 'yt-dlp.exe');
  const dataDir = path.join(__dirname, '..', 'data');
  const cookieFile = path.join(dataDir, 'cookies.txt');
  const confFile = path.join(__dirname, '..', 'node_modules', '@distube', 'yt-dlp', 'bin', 'yt-dlp.conf');

  // Build arguments - use cookies if available
  const args = ['--dump-single-json', `${prefix}:${query}`];
  if (fs.existsSync(cookieFile) && fs.statSync(cookieFile).size > 0) {
    args.unshift('--cookies', cookieFile);
  }
  // Use yt-dlp.conf if available
  if (fs.existsSync(confFile)) {
    args.unshift('--config-location', confFile);
  }

  const { stdout } = await execFileAsync(ytDlp, args, {
    timeout: 45000,
    maxBuffer: 16 * 1024 * 1024,
  });
  const data = JSON.parse(stdout);
  const entries = Array.isArray(data) ? data : data.entries || [];
  return entries.map((e) => ({
    name: e.title || e.fulltitle || e.id,
    url: e.webpage_url || e.url,
    uploader: { name: e.uploader || e.artist || e.channel || 'Desconocido' },
    duration: e.duration || 0,
  }));
}

// Bandcamp's web search is JS-protected and its JSON APIs are blocked, so we
// search via DuckDuckGo (site:bandcamp.com/track) and decode the redirect URLs.
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
  if (!res.ok) throw new Error(`DuckDuckGo respondió ${res.status}`);
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

async function cmdStop(interaction) {
  const queue = getQueue(interaction);
  if (!queue) {
    return interaction.reply({ content: '❌ No estoy reproduciendo nada... ¿me perdí algo? Yo no me muevo de mi maceta, así que seguro escuché mal. :o', ephemeral: true });
  }
  const channel = getVoiceChannel(interaction);
  if (!channel || queue.voiceChannel.id !== channel.id) {
    return interaction.reply({ content: '🔇 Che, tenemos que estar en el mismo canal de voz... yo no me muevo de mi maceta, así que vení vos. :P', ephemeral: true });
  }
  interaction.client.distube.stop(interaction.guildId);
  await interaction.reply(music.stop);
}

async function cmdSkip(interaction) {
  const queue = getQueue(interaction);
  if (!queue) {
    return interaction.reply({ content: '❌ No estoy reproduciendo nada... ¿me perdí algo? A veces me quedo callado, como las plantas en invierno. ❄️ :o', ephemeral: true });
  }
  if (queue.songs.length <= 1) {
    return interaction.reply(music.skipNoMore);
  }
  const song = queue.songs[0];
  interaction.client.distube.skip(interaction.guildId);
  await interaction.reply(music.skip(song.name));
}

async function cmdRewind(interaction) {
  const queue = getQueue(interaction);
  if (!queue) {
    return interaction.reply({ content: '❌ No estoy reproduciendo nada... ¿me perdí algo? La melodía se me escapó entre las ramas. :o', ephemeral: true });
  }
  const channel = getVoiceChannel(interaction);
  if (!channel || queue.voiceChannel.id !== channel.id) {
    return interaction.reply({ content: '🔇 Che, mismo canal de voz o no hay rebobinado... yo no me muevo, soy planta, acordate. :P', ephemeral: true });
  }
  queue.seek(0);
  await interaction.reply(music.rewind(queue.songs[0].name));
}

async function cmdQueue(interaction) {
  const queue = getQueue(interaction);
  if (!queue || queue.songs.length === 0) {
    return interaction.reply({ content: '❌ La cola está vacía... ¡agregá algo con `/bp music play`! No me dejes sin música que hasta las plantas nos aburrimos. 🎵', ephemeral: true });
  }
  await interaction.reply({ embeds: [queueEmbed(queue)] });
}

async function cmdClear(interaction) {
  const queue = getQueue(interaction);
  if (!queue || queue.songs.length === 0) {
    return interaction.reply({ content: '❌ La cola ya está vacía... no se puede podar lo que no creció. :P', ephemeral: true });
  }
  const removed = queue.songs.length - 1;
  queue.songs.splice(1);
  await interaction.reply(
    `🗑 ¡Pum! Podé la cola: ${removed} canción${removed === 1 ? '' : 'es'} afuera. La actual sigue sonando. 🎵 (Yo solo pelo hojas cuando cambio de estación, mirá.)`
  );
}

// ---------------- Reminders ----------------

async function cmdRemind(interaction) {
  const datetime = interaction.options.getString('datetime');
  const message = interaction.options.getString('message');

  const parsed = new Date(datetime.replace(' ', 'T'));
  if (isNaN(parsed.getTime())) {
    return interaction.reply({ content: '❌ Formato de fecha inválido, che. Usá `YYYY-MM-DD HH:MM` (ej: 2026-12-25 20:30) — como el calendario de siembra.', ephemeral: true });
  }
  if (parsed.getTime() <= Date.now()) {
    return interaction.reply({ content: '❌ Che, el recordatorio tiene que ser en el futuro... ni las plantas vivimos en el pasado.', ephemeral: true });
  }

  const id = `${interaction.user.id}-${Date.now()}`;
  await dataStore.addReminder(id, {
    userId: interaction.user.id,
    username: interaction.user.tag,
    message,
    when: parsed.getTime(),
  });

  await interaction.reply(
    `⏰ Me quedó guardado como semilla: te recuerdo <t:${Math.floor(parsed.getTime() / 1000)}:F> (ID: \`${id}\`)\n📝 "${message}"`
  );
}

async function cmdReminders(interaction) {
  const all = await dataStore.getReminders();
  const mine = Object.entries(all).filter(([, r]) => r.userId === interaction.user.id);
  if (mine.length === 0) {
    return interaction.reply(reminders.listEmpty);
  }
  const lines = mine.map(([id, r]) => `• \`${id}\` — <t:${Math.floor(r.when / 1000)}:F> — "${r.message}"`);
  await interaction.reply({ embeds: [new EmbedBuilder().setTitle('⏰ Tus recordatorios').setDescription(lines.join('\n'))] });
}

async function cmdCancelRemind(interaction) {
  const id = interaction.options.getString('id');
  const reminder = (await dataStore.getReminders())[id];
  if (!reminder) {
    return interaction.reply({ content: '❌ No existe ese recordatorio... ni en mi jardín lo encuentro. 🌿', ephemeral: true });
  }
  if (reminder.userId !== interaction.user.id) {
    return interaction.reply({ content: '❌ Ese recordatorio no es tuyo, che... no lo arranques de la maceta ajena.', ephemeral: true });
  }
  await dataStore.removeReminder(id);
  await interaction.reply(reminders.cancelled(id));
}

// ---------------- Birthdays ----------------

async function cmdBirthday(interaction) {
  const month = interaction.options.getInteger('month');
  const day = interaction.options.getInteger('day');

  if (day > new Date(2024, month, 0).getDate()) {
    return interaction.reply({ content: '❌ Ese día no existe en ese mes... ni germinando.', ephemeral: true });
  }
  await dataStore.setBirthday(interaction.user.id, { month, day });
  const date = new Date(2024, month - 1, day);
  await interaction.reply(
    `🎂 Cumpleaños anotado: **${date.toLocaleDateString('es-ES', { month: 'long', day: 'numeric' })}** (lo marco en el calendario de riego) 🌱`
  );
}

async function cmdBirthdays(interaction) {
  const all = await dataStore.getBirthdays();
  const entries = Object.entries(all);
  if (entries.length === 0) {
    return interaction.reply(reminders.birthdaysEmpty);
  }
  const sorted = entries.sort(([, a], [, b]) => a.month - b.month || a.day - b.day);
  const lines = sorted.map(([userId, b]) => {
    const date = new Date(2024, b.month - 1, b.day);
    return `• <@${userId}> — **${date.toLocaleDateString('es-ES', { month: 'long', day: 'numeric' })}**`;
  });
  await interaction.reply({
    embeds: [new EmbedBuilder().setTitle('🎈 Cumpleaños').setDescription(lines.join('\n'))],
  });
}

// ---------------- Fun (ported from ADA) ----------------

async function cmdStatus(interaction) {
  const states = ['☀️ regandome', '🌱 fotosintetizando', '🍃 dejando caer hojas', '💧 esperando que me rieguen', '🌿 creciendo en silencio', '🌸 floreciendo', '🪴 plantado acá', '😴 en modo invernal'];
  const chosen = rand(states);
  await interaction.client.user.setActivity(chosen);
  await interaction.reply(fun.statusChanged(chosen));
}

async function cmdRola(interaction) {
  const target = interaction.options.getUser('user');
  const member = target
    ? await interaction.guild.members.fetch(target.id).catch(() => null)
    : interaction.member;

  if (!member) {
    return interaction.reply(fun.userNotFound);
  }

  const activity = member.presence?.activities?.find((a) => a.name === 'Spotify');

  if (!activity || !activity.details) {
    return interaction.reply(fun.noSpotify);
  }

  const title = activity.details;
  const artists = activity.state || 'Autor desconocido';
  const unicode = [...title].map((c) => c.codePointAt(0));
  const rests = unicode.map((n) => (n % 10) + 1);
  const score = rests.reduce((a, b) => a + b, 0) / rests.length;

  let opinion = ':grimacing:';
  if (score >= 6 && score < 8) opinion = ':grin:';
  if (score >= 8) opinion = ':sunglasses:';

  await interaction.reply(
    `**${member.displayName}:**\nRolando **${title}** de **${artists}**. c:\nPuntaje de la canción: ${score}\n${opinion}\n(Yo califico mejor las canciones que me recuerdan al agua de lluvia 💧)`
  );
}

async function cmdLatex(interaction) {
  const equation = interaction.options.getString('equation');
  const url =
    'https://s0.wp.com/latex.php?latex=' + encodeURIComponent(equation) + '&bg=transparent&fg=ffffff&s=4';
  const embed = new EmbedBuilder().setImage(url);
  await interaction.reply({ embeds: [embed] });
}

async function cmdSafebooru(interaction) {
  const tags = interaction.options.getString('tags');
  await interaction.deferReply();

  let url = '/';
  let attempt = 0;
  while (url.startsWith('/') && attempt < 9) {
    const res = await fetch(
      `https://safebooru.donmai.us/posts.json?limit=10000&random=true&tags=${encodeURIComponent(tags)}`
    );
    if (!res.ok) {
      return interaction.editReply(`❌ Safebooru respondió ${res.status}... se me secaron las hojas del drama.`);
    }
    const json = await res.json();
    if (!json || json.length === 0) {
      return interaction.editReply('🔍 Sin resultados... ni un yuyo encontré. 🌿');
    }
    url = json[0].file_url;
    attempt++;
  }

  if (attempt === 9) {
    return interaction.editReply('Explicitá tus subdominios, Safebooru... yo solo me enredo en mis raíces. >:c');
  }

  const embed = new EmbedBuilder().setImage(url);
  await interaction.editReply({ content: `Tags: \`${tags}\``, embeds: [embed] });
}

async function cmd8Ball(interaction) {
  const answers = [
    'Sí... sí como cuando me riegan. 💧',
    'No, ni a palos... como el sol en invierno. ❄️',
    'Puede ser... si hay agua y sol, todo es posible. 🌞',
    'Las hojas dicen que sí. 🍃',
    'No cuentes con ello... eso quedó más seco que mis raíces sin regar. 🥀',
    'Sin dudas... es algo que florece. 🌸',
    'Mejor no te digo ahora... dejame que haga la fotosíntesis primero. 🌿',
    'Muy probablemente... hasta mis ramas lo afirman. 🌳',
    'Preguntame de nuevo más tarde... estoy de siesta de raíces. 😴',
    'Concéntrate y volvé a preguntar... la respuesta se me cayó entre las hojas. 🍂',
  ];
  await interaction.reply(
    `🎱 ${interaction.user.username} preguntó: *"${interaction.options.getString('question')}"*\n> ${rand(answers)}`
  );
}

async function cmdRoll(interaction) {
  const input = interaction.options.getString('dice').toLowerCase().trim();
  const match = input.match(/^(\d*)d(\d+)$/);
  if (!match) {
    return interaction.reply({ content: '❌ Formato inválido, che. Usá `d20`, `2d6`, etc... los dados son como las semillas: hay que tirarlos bien. 🎲', ephemeral: true });
  }
  const count = match[1] ? parseInt(match[1], 10) : 1;
  const sides = parseInt(match[2], 10);
  if (count < 1 || count > 100 || sides < 2 || sides > 1000) {
    return interaction.reply({ content: '❌ Che, cantidad (1-100) o caras (2-1000) fuera de rango... no me hagas crecer un dado gigante.', ephemeral: true });
  }
  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
  const total = rolls.reduce((a, b) => a + b, 0);
  const detail = count > 1 ? ` (${rolls.join(' + ')})` : '';
  await interaction.reply(fun.diceRoll(interaction.user.username, count, sides, total, detail));
}

async function cmdHelp(interaction) {
  const help = new EmbedBuilder()
    .setTitle('🌿 BottedPlant — Ayuda')
    .setColor(0x57f287)
    .addFields(
      {
        name: '🎵 Música',
        value:
          '`/bp music play <url>` — Reproducir (YouTube, SoundCloud, Bandcamp, radio)\n' +
          '`/bp music query <lugar> <título>` — Buscar y reproducir sin pegar links\n' +
          '`/bp music playlist <url>` — Agregar playlist completa\n' +
          '`/bp music skip` — Saltar canción\n' +
          '`/bp music rewind` — Repetir la canción actual\n' +
          '`/bp music queue` — Ver cola\n' +
          '`/bp music clear` — Vaciar cola\n' +
          '`/bp music stop` — Detener y salir',
        inline: false,
      },
      {
        name: '⏰ Recordatorios y 🎂 Cumpleaños',
        value:
          '`/bp remember remind <YYYY-MM-DD HH:MM> <mensaje>` — Programar recordatorio\n' +
          '`/bp remember reminders` — Ver recordatorios\n' +
          '`/bp remember cancelremind <id>` — Cancelar recordatorio\n' +
          '`/bp remember birthday <mes> <día>` — Guardar cumpleaños\n' +
          '`/bp remember birthdays` — Ver cumpleaños',
        inline: false,
      },
      {
        name: '🎮 Diversión',
        value:
          '`/bp fun status` — Cambiar estado\n' +
          '`/bp fun hola` · `/bp fun japish` · `/bp fun goodgirl` · `/bp fun avatar`\n' +
          '`/bp fun rola [@user]` — Calificar Spotify\n' +
          '`/bp fun latex <ecuación>` — Renderizar LaTeX\n' +
          '`/bp fun safebooru <tags>` — Imágenes\n' +
          '`/bp fun 8ball <pregunta>` · `/bp fun roll <dados>` · `/bp fun coinflip`\n' +
          '`/bp fun uwu <texto>` — Uwuificar texto',
        inline: false,
      },
      {
        name: '🍃 Hojas',
        value:
          '`/bp leaves daily` — Regar a BottedPlant y ganar hojas\n' +
          '`/bp leaves points [@user]` — Ver hojas\n' +
          '`/bp leaves leaderboard` — Top 10 del servidor\n' +
          '`/bp leaves gamble <texto>` — Crear apuesta\n' +
          '`/bp leaves bet <id> <opción> <cantidad>` — Apostar hojas\n' +
          '`/bp leaves redeem <id> <opción>` — Cerrar apuesta',
        inline: false,
      }
    )
    .setFooter({ text: 'Soy una planta, no un bot... que me digan bot y me caigo de la maceta. Escribí /bp para el menú. 🌿' });
  await interaction.reply({ embeds: [help] });
}

module.exports = {
  bpCommandData,
  registerSlashCommands,
  handleInteraction,
  handleMessage,
};
