const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const dataStore = require('./dataStore');
const { queueEmbed, formatDuration } = require('./embeds');
const { cmdLeave } = require('./cmdLeave');
const { handleMessage, runEconomyCommand } = require('./economy');
const phraseManager = require('./phraseManager');

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
        .addSubcommand((sub) =>
          sub
            .setName('phrase')
            .setDescription('Gestionar frases del bot (listar, agregar, editar, borrar)')
            .addStringOption((opt) =>
              opt
                .setName('action')
                .setDescription('Acción a realizar')
                .setRequired(true)
                .addChoices(
                  { name: 'listar', value: 'list' },
                  { name: 'agregar', value: 'add' },
                  { name: 'editar', value: 'edit' },
                  { name: 'borrar', value: 'delete' }
                )
            )
            .addStringOption((opt) =>
              opt
                .setName('categoria')
                .setDescription('Categoría de la frase')
                .setRequired(false)
            )
            .addStringOption((opt) => opt.setName('clave').setDescription('Clave de la frase').setRequired(false))
            .addStringOption((opt) => opt.setName('tipo').setDescription('Tipo de respuesta (hits, crits, fails)').setRequired(false).addChoices(
              { name: 'hit (respuesta normal)', value: 'hits' },
              { name: 'crit (crítico - 5%)', value: 'crits' },
              { name: 'fail (fallo - 5%)', value: 'fails' }
            ))
            .addStringOption((opt) => opt.setName('texto').setDescription('Texto de la frase').setRequired(false))
            .addIntegerOption((opt) => opt.setName('indice').setDescription('Índice de la frase a editar/borrar').setRequired(false))
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
  return interaction.member.voice.channel || null;
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
      case 'play': await cmdPlay(interaction); break;
      case 'playlist': await cmdPlaylist(interaction); break;
      case 'query': await cmdQuery(interaction); break;
      case 'stop': await cmdStop(interaction); break;
      case 'leave': await cmdLeave(interaction); break;
      case 'skip': await cmdSkip(interaction); break;
      case 'rewind': await cmdRewind(interaction); break;
      case 'queue': await cmdQueue(interaction); break;
      case 'clear': await cmdClear(interaction); break;
      // ----- Reminders -----
      case 'remind': await cmdRemind(interaction); break;
      case 'reminders': await cmdReminders(interaction); break;
      case 'cancelremind': await cmdCancelRemind(interaction); break;
      // ----- Birthdays -----
      case 'birthday': await cmdBirthday(interaction); break;
      case 'birthdays': await cmdBirthdays(interaction); break;
      // ----- Fun -----
      case 'status': await cmdStatus(interaction); break;
      case 'hola': await interaction.reply(await phraseManager.getPhrase('fun', 'hola')); break;
      case 'japish': await interaction.reply(await phraseManager.getPhrase('fun', 'japish')); break;
      case 'goodgirl': await interaction.reply(await phraseManager.getPhrase('fun', 'goodgirl')); break;
      case 'avatar': await interaction.reply(interaction.client.user.displayAvatarURL({ size: 1024 })); break;
      case 'rola': await cmdRola(interaction); break;
      case 'latex': await cmdLatex(interaction); break;
      case 'safebooru': await cmdSafebooru(interaction); break;
      case '8ball': await cmd8Ball(interaction); break;
      case 'roll': await cmdRoll(interaction); break;
      case 'coinflip': await interaction.reply(await phraseManager.getPhrase('fun', 'coinflip')); break;
      case 'uwu': await runEconomyCommand('uwu', interaction); break;
      case 'phrase': await cmdPhrase(interaction); break;
      // ----- Economy (leaves) -----
      case 'daily':
      case 'points':
      case 'leaderboard':
      case 'gamble':
      case 'bet':
      case 'redeem':
        await runEconomyCommand(sub, interaction);
        break;
      case 'help': await cmdHelp(interaction); break;
      default:
        await interaction.reply(await phraseManager.getPhrase('fun', 'unknownCommand'));
    }
  }, interaction);
}

// ---------------- Music ----------------

async function cmdPlay(interaction) {
  const channel = getVoiceChannel(interaction);
  if (!channel) {
    return interaction.reply({ content: '🔇 Che! Si no estás en un canal de voz, mis raíces no te oyen. Metete a uno y te pongo el tema. 🌿', ephemeral: true });
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

// Runs yt-dlp directly with search prefix (ytsearch5 / scsearch5)
async function searchWithYtDlp(prefix, query) {
  // Go up one level from src/ to project root for node_modules
  const projectRoot = path.join(__dirname, '..');
  const ytDlp = path.join(projectRoot, 'node_modules', '@distube', 'yt-dlp', 'bin', 'yt-dlp.exe');
  const dataDir = path.join(projectRoot, 'data');
  const cookieFile = path.join(dataDir, 'cookies.txt');
  const confFile = path.join(projectRoot, 'node_modules', '@distube', 'yt-dlp', 'bin', 'yt-dlp.conf');

  const args = ['--dump-single-json', `${prefix}:${query}`];
  if (fs.existsSync(cookieFile) && fs.statSync(cookieFile).size > 0) {
    args.unshift('--cookies', cookieFile);
  }
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
    return interaction.reply({ content: '❌ No estoy reproduciendo nada. ¿me perdí algo? Yo no me muevo de mi maceta, así que seguro escuché mal.:o', ephemeral: true });
  }
  const channel = getVoiceChannel(interaction);
  if (!channel || queue.voiceChannel.id !== channel.id) {
    return interaction.reply({ content: '🔇 Che, tenemos que estar en el mismo canal de voz. Yo no me muevo de mi maceta, así que vení vos.:P', ephemeral: true });
  }
  interaction.client.distube.stop(interaction.guildId);
  await interaction.reply(await phraseManager.getPhrase('music', 'stop'));
}

async function cmdSkip(interaction) {
  const queue = getQueue(interaction);
  if (!queue) {
    return interaction.reply({ content: '❌ No estoy reproduciendo nada. ¿me perdí algo? Veces me quedo callado, como las plantas en invierno. ❄️:o', ephemeral: true });
  }
  if (queue.songs.length <= 1) {
    return interaction.reply(await phraseManager.getPhrase('music', 'skipNoMore'));
  }
  const song = queue.songs[0];
  interaction.client.distube.skip(interaction.guildId);
  await interaction.reply(await phraseManager.getPhrase('music', 'skip', 'hits', { songName: song.name }));
}

async function cmdRewind(interaction) {
  const queue = getQueue(interaction);
  if (!queue) {
    return interaction.reply({ content: '❌ No estoy reproduciendo nada. ¿me perdí algo? La melodía se me escapó entre las ramas.:o', ephemeral: true });
  }
  const channel = getVoiceChannel(interaction);
  if (!channel || queue.voiceChannel.id !== channel.id) {
    return interaction.reply({ content: '🔇 Che, tenemos que estar en el mismo canal de voz. Mis hojas no se estiran tanto. 🍃', ephemeral: true });
  }
  interaction.client.distube.seek(interaction.guildId, 0);
  await interaction.reply(await phraseManager.getPhrase('music', 'rewind', 'hits', { songName: queue.songs[0].name }));
}

async function cmdQueue(interaction) {
  const queue = getQueue(interaction);
  if (!queue || !queue.songs.length) {
    return interaction.reply({ content: '❌ La cola está vacía. ¡agregá algo con `/bp music play`! No me dejes sin música que me pongo triste. 🌿', ephemeral: true });
  }
  const embed = queueEmbed(queue);
  await interaction.reply({ embeds: [embed] });
}

async function cmdClear(interaction) {
  const queue = getQueue(interaction);
  if (!queue || !queue.songs.length) {
    return interaction.reply({ content: '❌ La cola ya está vacía, che. No hay nada que limpiar. 🍃', ephemeral: true });
  }
  queue.songs = [queue.songs[0]]; // keep current song
  await interaction.reply('🗑 Cola vaciada. Solo queda la canción actual. 🌿');
}

// ---------------- Reminders ----------------

async function cmdRemind(interaction) {
  const dtStr = interaction.options.getString('datetime');
  const msg = interaction.options.getString('message');
  const dt = new Date(dtStr.replace(' ', 'T'));
  if (isNaN(dt.getTime()) || dt < new Date()) {
    return interaction.reply({ content: '❌ Fecha inválida o en el pasado. Formato: YYYY-MM-DD HH:MM', ephemeral: true });
  }
  const delay = dt.getTime() - Date.now();
  const id = await require('./handlers/reminders').createReminder(
    interaction.guildId,
    interaction.user.id,
    interaction.channelId,
    msg,
    delay
  );
  await interaction.reply(`⏰ Recordatorio programado para **${dt.toLocaleString('es-AR')}** (ID: \`${id}\`). Te aviso cuando toque, ¡no te olvides de regarme! 🌱`);
}

async function cmdReminders(interaction) {
  const reminders = await require('./handlers/reminders').listReminders(interaction.guildId, interaction.user.id);
  if (!reminders.length) {
    return interaction.reply(await phraseManager.getPhrase('reminders', 'listEmpty'));
  }
  const lines = reminders.map((r) => `\`${r.id}\` — ${new Date(r.time).toLocaleString('es-AR')} — ${r.message.slice(0, 80)}`);
  await interaction.reply({ content: `📋 **Tus recordatorios:**\n${lines.join('\n')}`, ephemeral: true });
}

async function cmdCancelRemind(interaction) {
  const id = interaction.options.getString('id');
  const ok = await require('./handlers/reminders').cancelReminder(interaction.guildId, interaction.user.id, id);
  if (!ok) {
    return interaction.reply({ content: '❌ No se encontró ese recordatorio. ¿Seguro que es tuyo? 👀', ephemeral: true });
  }
  await interaction.reply(await phraseManager.getPhrase('reminders', 'cancelled', 'hits', { id }));
}

// ---------------- Birthdays ----------------

async function cmdBirthday(interaction) {
  const month = interaction.options.getInteger('month');
  const day = interaction.options.getInteger('day');
  const gid = interaction.guildId;
  const uid = interaction.user.id;
  await dataStore.setBirthday(gid, uid, month, day, interaction.user.username);
  await interaction.reply(`🎂 ¡Cumpleaños guardado! ${day}/${month} — te voy a regar de notificaciones ese día. 🌿`);
}

async function cmdBirthdays(interaction) {
  const birthdays = await dataStore.getBirthdays();
  const guildBirthdays = Object.entries(birthdays)
    .filter(([uid, b]) => {
      return interaction.guild.members.cache.has(uid);
    })
    .sort((a, b) => a[1].month - b[1].month || a[1].day - b[1].day);

  if (!guildBirthdays.length) {
    return interaction.reply(await phraseManager.getPhrase('reminders', 'birthdaysEmpty'));
  }
  const lines = guildBirthdays.map(([uid, b]) => `<@${uid}> — ${b.day}/${b.month}`);
  await interaction.reply({ content: `🎂 **Cumpleaños del servidor:**\n${lines.join('\n')}`, ephemeral: true });
}

// ---------------- Fun ----------------

async function cmdStatus(interaction) {
  const states = ['☀️ regándome', '🌱 fotosintetizando', '🍃 dejando caer hojas', '💧 esperando que me rieguen', '🌿 creciendo derechita'];
  const chosen = states[Math.floor(Math.random() * states.length)];
  await interaction.reply(await phraseManager.getPhrase('fun', 'statusChanged', 'hits', { chosen }));
}

async function cmdRola(interaction) {
  const target = interaction.options.getUser('user') || interaction.user;
  const presence = target.presence;
  if (!presence || !presence.activities) {
    return interaction.reply(await phraseManager.getPhrase('fun', 'noSpotify'));
  }
  const spotify = presence.activities.find((a) => a.type === 2 && a.name === 'Spotify');
  if (!spotify) {
    return interaction.reply(await phraseManager.getPhrase('fun', 'userNotFound'));
  }
  const score = Math.floor(Math.random() * 11);
  const emoji = score >= 8 ? '🌿✨' : score >= 5 ? '🍃' : '🌱';
  await interaction.reply(
    `🎵 **${target.username}** está escuchando: **${spotify.details}** — *${spotify.state}*\n` +
      `💚 BottedPlant califica: **${score}/10** ${emoji}`
  );
}

async function cmdLatex(interaction) {
  const equation = interaction.options.getString('equation');
  const encoded = encodeURIComponent(equation);
  const url = `https://latex.codecogs.com/svg.latex?\inline&space;${encoded}`;
  await interaction.reply(url);
}

async function cmdSafebooru(interaction) {
  const tags = interaction.options.getString('tags');
  await interaction.deferReply();
  try {
    const url = `https://safebooru.donmai.us/posts.json?limit=10000&random=true&tags=${encodeURIComponent(tags)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Safebooru respondió ${res.status}`);
    const posts = await res.json();
    if (!posts.length) {
      return interaction.editReply('🔍 No encontré nada con esos tags... mis hojas no captan esa búsqueda. :c');
    }
    const post = posts[Math.floor(Math.random() * posts.length)];
    const imgUrl = post.file_url || post.large_file_url || post.preview_file_url;
    await interaction.editReply({ content: imgUrl || '❌ No hay imagen disponible :c' });
  } catch (err) {
    console.error('Error in cmdSafebooru:', err);
    await interaction.editReply(`❌ Error: \`${err.message?.slice(0, 200) || err}\``);
  }
}

async function cmd8Ball(interaction) {
  const answers = [
    'Sí, definitivamente 🌿',
    'Así es, sin duda 🍃',
    'Puedes contar con ello 🌱',
    'Sin duda 🌿',
    'Mis raíces dicen que sí c:',
    'Como yo lo veo, sí 🌿',
    'Lo más probable 🍃',
    'Las perspectivas son buenas 🌱',
    'Sí 🌿',
    'Las señales apuntan a que sí 🍃',
    'Respuesta confusa, intentá de nuevo 🌱',
    'Preguntá de nuevo más tarde 🌿',
    'Mejor no te lo digo ahora 🍃',
    'No puedo predecirlo ahora 🌱',
    'Concéntrate y preguntá de nuevo 🌿',
    'No cuentes con ello 🍂',
    'Mi respuesta es no 🌿',
    'Mis fuentes dicen que no 🍂',
    'Las perspectivas no son tan buenas 🌿',
    'Muy dudoso 🍂',
  ];
  const answer = answers[Math.floor(Math.random() * answers.length)];
  await interaction.reply(
    `🎱 ${interaction.user.username} preguntó: *"${interaction.options.getString('question')}"*\n> ${answer}`
  );
}

async function cmdRoll(interaction) {
  const dice = interaction.options.getString('dice');
  const match = dice.match(/^(\d*)d(\d+)$/i);
  if (!match) {
    return interaction.reply({ content: '❌ Formato inválido. Usá NdS (ej: d20, 2d6, 1d100).', ephemeral: true });
  }
  const count = Math.min(parseInt(match[1]) || 1, 100);
  const sides = Math.min(parseInt(match[2]), 10000);
  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
  const total = rolls.reduce((a, b) => a + b, 0);
  const detail = count > 1 ? ` (${rolls.join(' + ')})` : '';
  await interaction.reply(await phraseManager.getPhrase('fun', 'diceRoll', 'hits', {
    username: interaction.user.username,
    count,
    sides,
    total,
    detail
  }));
}

async function cmdPhrase(interaction) {
  const action = interaction.options.getString('action');
  const category = interaction.options.getString('categoria');
  const key = interaction.options.getString('clave');
  const type = interaction.options.getString('tipo') || 'hits';
  const text = interaction.options.getString('texto');
  const index = interaction.options.getInteger('indice');

  if (action === 'list') {
    const phrases = await phraseManager.listPhrases(category);
    if (!phrases || (category && phrases.length === 0)) {
      return interaction.reply({ content: category ? `❌ No hay frases en la categoría \`${category}\`.` : '❌ No hay frases guardadas.', ephemeral: true });
    }
    let reply = category ? `📋 **Frases en \`${category}\`:**` : '📋 **Todas las frases:**';
    if (category) {
      for (const { key: k, types } of phrases) {
        reply += `\n  • \`${k}\`: [${types.join(', ')}]`;
      }
    } else {
      for (const [cat, entries] of Object.entries(phrases)) {
        reply += `\n**${cat}:**`;
        for (const { key: k, types } of entries) {
          reply += `\n  • \`${k}\`: [${types.join(', ')}]`;
        }
      }
    }
    return interaction.reply({ content: reply.slice(0, 2000), ephemeral: true });
  }

  if (action === 'add') {
    if (!category || !key || !text) {
      return interaction.reply({ content: '❌ Faltan parámetros: categoría, clave y texto son requeridos.', ephemeral: true });
    }
    await phraseManager.addPhrase(category, key, type, text);
    return interaction.reply({ content: `✅ Frase agregada a \`${category}.${key}.${type}\`.`, ephemeral: true });
  }

  if (action === 'edit') {
    if (!category || !key || index === null || !text) {
      return interaction.reply({ content: '❌ Faltan parámetros: categoría, clave, índice y texto son requeridos.', ephemeral: true });
    }
    const ok = await phraseManager.editPhrase(category, key, type, index, text);
    return interaction.reply({ content: ok ? `✅ Frase editada.` : `❌ No se encontró esa frase.`, ephemeral: true });
  }

  if (action === 'delete') {
    if (!category || !key || index === null) {
      return interaction.reply({ content: '❌ Faltan parámetros: categoría, clave e índice son requeridos.', ephemeral: true });
    }
    const ok = await phraseManager.deletePhrase(category, key, type, index);
    return interaction.reply({ content: ok ? `✅ Frase borrada.` : `❌ No se encontró esa frase.`, ephemeral: true });
  }
}

async function cmdHelp(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🌿 BottedPlant — Comandos')
    .setColor(0x57f287)
    .setDescription('Todos los comandos usan `/bp <grupo> <subcomando>`')
    .addFields(
      { name: '🎵 Música', value: '`/bp music play <url>` — Reproducir (YouTube, SoundCloud, Bandcamp, radio)\n' +
          '`/bp music query <lugar> <título>` — Buscar y reproducir sin pegar links\n' +
          '`/bp music playlist <url>` — Agregar playlist completa\n' +
          '`/bp music skip` — Saltar canción\n' +
          '`/bp music rewind` — Repetir la canción actual\n' +
          '`/bp music queue` — Ver cola\n' +
          '`/bp music clear` — Vaciar cola\n' +
          '`/bp music stop` — Detener y salir', inline: false },
      { name: '⏰ Recordatorios', value: '`/bp remember remind <fecha> <mensaje>` — Programar recordatorio\n' +
          '`/bp remember reminders` — Ver recordatorios\n' +
          '`/bp remember cancelremind <id>` — Cancelar recordatorio', inline: false },
      { name: '🎂 Cumpleaños', value: '`/bp remember birthday <mes> <día>` — Guardar tu cumpleaños\n' +
          '`/bp remember birthdays` — Listar todos', inline: false },
      { name: '🎮 Diversión', value: '`/bp fun status` — Cambiar estado\n' +
          '`/bp fun hola` · `/bp fun japish` · `/bp fun goodgirl` · `/bp fun avatar`\n' +
          '`/bp fun rola [@user]` — Calificar Spotify\n' +
          '`/bp fun latex <ecuación>` — Renderizar LaTeX\n' +
          '`/bp fun safebooru <tags>` — Imágenes\n' +
          '`/bp fun 8ball <pregunta>` · `/bp fun roll <dados>` · `/bp fun coinflip`\n' +
          '`/bp fun uwu <texto>` — Uwuificar texto\n' +
          '`/bp fun phrase` — Gestionar frases del bot', inline: false },
      { name: '🍃 Hojas (Economía)', value: '`/bp leaves daily` — Regar y ganar hojas\n' +
          '`/bp leaves points [@user]` — Ver hojas\n' +
          '`/bp leaves leaderboard` — Top 10\n' +
          '`/bp leaves gamble <afirmación | opción1 | opción2>` — Crear apuesta\n' +
          '`/bp leaves bet <id> <opción> <monto>` — Apostar\n' +
          '`/bp leaves redeem <id> <opción_ganadora>` — Cerrar apuesta', inline: false }
    )
    .setFooter({ text: '¡Regame y creceré fuerte! 🌱' });
  await interaction.reply({ embeds: [embed] });
}

module.exports = { bpCommandData, registerSlashCommands, handleInteraction, handleMessage, runEconomyCommand };
