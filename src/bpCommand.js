const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const dataStore = require('./dataStore');
const { queueEmbed, formatDuration } = require('./embeds');
const { cmdLeave } = require('./cmdLeave');
const phraseManager = require('./phraseManager');
const config = require('./config');

// Import modular command handlers
const {
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
} = require('./commands/musicCommands');

const {
  handleRememberAdd,
  handleRememberList,
  handleRememberCancel,
  handleBirthdayAdd,
  handleBirthdayList,
  handleBirthdayRemove,
} = require('./commands/rememberCommands');

const {
  handleFunUwu,
  handleFunShitpost,
  handleFunRoll,
  handleFunChoose,
  handleFun8ball,
} = require('./commands/funCommands');

const {
  handleLeavesDaily,
  handleLeavesPoints,
  handleLeavesLeaderboard,
  handleLeavesGamble,
  handleLeavesBet,
  handleLeavesRedeem,
} = require('./commands/economyCommands');

const { handleMessage } = require('./economy');

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
            .setDescription('Buscar y elegir qué reproducir')
            .addStringOption((opt) => opt.setName('query').setDescription('Qué buscar').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub.setName('skip').setDescription('Saltar la canción actual')
        )
        .addSubcommand((sub) =>
          sub.setName('stop').setDescription('Detener la reproducción y limpiar la cola')
        )
        .addSubcommand((sub) =>
          sub.setName('pause').setDescription('Pausar la reproducción')
        )
        .addSubcommand((sub) =>
          sub.setName('resume').setDescription('Reanudar la reproducción')
        )
        .addSubcommand((sub) =>
          sub
            .setName('queue')
            .setDescription('Ver la cola de reproducción')
            .addIntegerOption((opt) => opt.setName('page').setDescription('Página (por defecto 1)').setMinValue(1))
        )
        .addSubcommand((sub) =>
          sub.setName('nowplaying').setDescription('Ver la canción actual')
        )
        .addSubcommand((sub) =>
          sub
            .setName('volume')
            .setDescription('Cambiar el volumen (0-200)')
            .addIntegerOption((opt) => opt.setName('level').setDescription('Nivel de volumen').setRequired(true).setMinValue(0).setMaxValue(200))
        )
        .addSubcommand((sub) =>
          sub
            .setName('loop')
            .setDescription('Cambiar modo de repetición')
            .addStringOption((opt) =>
              opt
                .setName('mode')
                .setDescription('Modo: off, song, queue')
                .setRequired(true)
                .addChoices(
                  { name: 'Apagado', value: 'off' },
                  { name: 'Canción', value: 'song' },
                  { name: 'Cola', value: 'queue' }
                )
            )
        )
        .addSubcommand((sub) =>
          sub.setName('shuffle').setDescription('Mezclar la cola aleatoriamente')
        )
        .addSubcommand((sub) =>
          sub.setName('rewind').setDescription('Volver a la canción anterior')
        )
        .addSubcommand((sub) =>
          sub.setName('leave').setDescription('Salir del canal de voz')
        )
    )
    // 🔔 Reminders group
    .addSubcommandGroup((group) =>
      group
        .setName('remember')
        .setDescription('Recordatorios personales')
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Crear un recordatorio')
            .addStringOption((opt) => opt.setName('texto').setDescription('Qué recordar').setRequired(true))
            .addStringOption((opt) => opt.setName('cuando').setDescription('Cuándo (ISO 8601 o relativo, ej: 2025-12-25T10:00, en 1 hora)').setRequired(true))
            .addChannelOption((opt) => opt.setName('canal').setDescription('Canal donde avisar (por defecto este)'))
        )
        .addSubcommand((sub) =>
          sub
            .setName('list')
            .setDescription('Ver tus recordatorios')
            .addUserOption((opt) => opt.setName('usuario').setDescription('Ver recordatorios de otro usuario'))
        )
        .addSubcommand((sub) =>
          sub
            .setName('cancel')
            .setDescription('Cancelar un recordatorio')
            .addStringOption((opt) => opt.setName('id').setDescription('ID del recordatorio').setRequired(true))
        )
    )
    // 🎂 Birthdays group
    .addSubcommandGroup((group) =>
      group
        .setName('birthday')
        .setDescription('Cumpleaños')
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Agregar un cumpleaños')
            .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario').setRequired(true))
            .addStringOption((opt) => opt.setName('fecha').setDescription('Fecha (DD/MM)').setRequired(true))
            .addChannelOption((opt) => opt.setName('canal').setDescription('Canal para anunciar (por defecto este)'))
        )
        .addSubcommand((sub) =>
          sub.setName('list').setDescription('Ver todos los cumpleaños del servidor')
        )
        .addSubcommand((sub) =>
          sub
            .setName('remove')
            .setDescription('Eliminar un cumpleaños')
            .addStringOption((opt) => opt.setName('id').setDescription('ID del cumpleaños').setRequired(true))
        )
    )
    // 🎮 Fun group
    .addSubcommandGroup((group) =>
      group
        .setName('fun')
        .setDescription('Comandos de diversión')
        .addSubcommand((sub) =>
          sub
            .setName('uwu')
            .setDescription('Uwuficar un texto')
            .addStringOption((opt) => opt.setName('texto').setDescription('Texto a uwuficar').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('shitpost')
            .setDescription('Activar shitpost manualmente')
            .addStringOption((opt) => opt.setName('trigger').setDescription('Trigger a buscar').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('roll')
            .setDescription('Tirar dados')
            .addIntegerOption((opt) => opt.setName('caras').setDescription('Caras del dado (default 20)').setMinValue(2).setMaxValue(1000))
            .addIntegerOption((opt) => opt.setName('tiradas').setDescription('Cuántas veces tirar (default 1)').setMinValue(1).setMaxValue(20))
        )
        .addSubcommand((sub) =>
          sub
            .setName('choose')
            .setDescription('Elegir entre opciones')
            .addStringOption((opt) => opt.setName('opciones').setDescription('Opciones separadas por comas').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('8ball')
            .setDescription('Preguntarle a la bola mágica')
            .addStringOption((opt) => opt.setName('pregunta').setDescription('Tu pregunta').setRequired(true))
        )
    )
    // 💰 Economy group (leaves)
    .addSubcommandGroup((group) =>
      group
        .setName('leaves')
        .setDescription('Sistema de hojas (economía)')
        .addSubcommand((sub) =>
          sub.setName('daily').setDescription('Reclamar tus hojas diarias')
        )
        .addSubcommand((sub) =>
          sub
            .setName('points')
            .setDescription('Ver tus hojas')
            .addUserOption((opt) => opt.setName('usuario').setDescription('Usuario (por defecto vos)'))
        )
        .addSubcommand((sub) =>
          sub.setName('leaderboard').setDescription('Ver el top de hojas del servidor')
        )
        .addSubcommand((sub) =>
          sub
            .setName('gamble')
            .setDescription('Crear una apuesta')
            .addStringOption((opt) => opt.setName('texto').setDescription('Formato: enunciado | opción1 | opción2 | ...').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('bet')
            .setDescription('Apostar en una apuesta existente')
            .addStringOption((opt) => opt.setName('id').setDescription('ID de la apuesta').setRequired(true))
            .addIntegerOption((opt) => opt.setName('opcion').setDescription('Número de opción (1, 2, 3...)').setRequired(true).setMinValue(1))
            .addIntegerOption((opt) => opt.setName('cantidad').setDescription('Cantidad de hojas a apostar').setRequired(true).setMinValue(1))
        )
        .addSubcommand((sub) =>
          sub
            .setName('redeem')
            .setDescription('Resolver una apuesta (solo creador o admin)')
            .addStringOption((opt) => opt.setName('id').setDescription('ID de la apuesta').setRequired(true))
            .addIntegerOption((opt) => opt.setName('opcion').setDescription('Opción ganadora').setRequired(true).setMinValue(1))
        )
    )
    // 📖 Help
    .addSubcommand((sub) =>
      sub.setName('help').setDescription('Mostrar ayuda del bot')
    );
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
        await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral }).catch(() => {});
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

  const group = interaction.options.getSubcommandGroup();
  const sub = interaction.options.getSubcommand();

  await handleInteractionSafely(async () => {
    // ----- Music -----
    if (group === 'music') {
      switch (sub) {
        case 'play': await handleMusicPlay(interaction); break;
        case 'playlist': await handleMusicPlaylist(interaction); break;
        case 'query': await handleMusicQuery(interaction); break;
        case 'skip': await handleMusicSkip(interaction); break;
        case 'stop': await handleMusicStop(interaction); break;
        case 'pause': await handleMusicPause(interaction); break;
        case 'resume': await handleMusicResume(interaction); break;
        case 'queue': await handleMusicQueue(interaction); break;
        case 'nowplaying': await handleMusicNowPlaying(interaction); break;
        case 'volume': await handleMusicVolume(interaction); break;
        case 'loop': await handleMusicLoop(interaction); break;
        case 'shuffle': await handleMusicShuffle(interaction); break;
        case 'rewind': await handleMusicRewind(interaction); break;
        case 'leave': await handleMusicLeave(interaction); break;
      }
      return;
    }

    // ----- Reminders -----
    if (group === 'remember') {
      switch (sub) {
        case 'add': await handleRememberAdd(interaction); break;
        case 'list': await handleRememberList(interaction); break;
        case 'cancel': await handleRememberCancel(interaction); break;
      }
      return;
    }

    // ----- Birthdays -----
    if (group === 'birthday') {
      switch (sub) {
        case 'add': await handleBirthdayAdd(interaction); break;
        case 'list': await handleBirthdayList(interaction); break;
        case 'remove': await handleBirthdayRemove(interaction); break;
      }
      return;
    }

    // ----- Fun -----
    if (group === 'fun') {
      switch (sub) {
        case 'uwu': await handleFunUwu(interaction); break;
        case 'shitpost': await handleFunShitpost(interaction); break;
        case 'roll': await handleFunRoll(interaction); break;
        case 'choose': await handleFunChoose(interaction); break;
        case '8ball': await handleFun8ball(interaction); break;
      }
      return;
    }

    // ----- Economy (leaves) -----
    if (group === 'leaves') {
      switch (sub) {
        case 'daily': await handleLeavesDaily(interaction); break;
        case 'points': await handleLeavesPoints(interaction); break;
        case 'leaderboard': await handleLeavesLeaderboard(interaction); break;
        case 'gamble': await handleLeavesGamble(interaction); break;
        case 'bet': await handleLeavesBet(interaction); break;
        case 'redeem': await handleLeavesRedeem(interaction); break;
      }
      return;
    }

    // ----- Standalone subcommands (no group) -----
    switch (sub) {
      case 'help': await cmdHelp(interaction); break;
      case 'status': await cmdStatus(interaction); break;
      case 'hola': await interaction.reply(await phraseManager.getPhrase('fun', 'hola')); break;
      case 'japish': await interaction.reply(await phraseManager.getPhrase('fun', 'japish')); break;
      case 'goodgirl': await interaction.reply(await phraseManager.getPhrase('fun', 'goodgirl')); break;
      case 'avatar': await interaction.reply(interaction.client.user.displayAvatarURL({ size: 1024 })); break;
      case 'rola': await cmdRola(interaction); break;
      case 'latex': await cmdLatex(interaction); break;
      case 'safebooru': await cmdSafebooru(interaction); break;
      case 'coinflip': await interaction.reply(await phraseManager.getPhrase('fun', 'coinflip')); break;
      case 'phrase': await cmdPhrase(interaction); break;
      default:
        await interaction.reply(await phraseManager.getPhrase('fun', 'unknownCommand'));
    }
  }, interaction);
}

// ---------------- Music ----------------

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
    const url = `https://safebooru.donmai.us/posts.json?limit=100&random=true&tags=${encodeURIComponent(tags)}`;
    const res = await fetch(url, { headers: { "User-Agent": "BottedPlant/1.0" } });
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
    return interaction.reply({ content: '❌ Formato inválido. Usá NdS (ej: d20, 2d6, 1d100).', flags: MessageFlags.Ephemeral });
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
      return interaction.reply({ content: category ? `❌ No hay frases en la categoría \`${category}\`.` : '❌ No hay frases guardadas.', flags: MessageFlags.Ephemeral });
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
    return interaction.reply({ content: reply.slice(0, 2000), flags: MessageFlags.Ephemeral });
  }

  if (action === 'add') {
    if (!category || !key || !text) {
      return interaction.reply({ content: '❌ Faltan parámetros: categoría, clave y texto son requeridos.', flags: MessageFlags.Ephemeral });
    }
    await phraseManager.addPhrase(category, key, type, text);
    return interaction.reply({ content: `✅ Frase agregada a \`${category}.${key}.${type}\`.`, flags: MessageFlags.Ephemeral });
  }

  if (action === 'edit') {
    if (!category || !key || index === null || !text) {
      return interaction.reply({ content: '❌ Faltan parámetros: categoría, clave, índice y texto son requeridos.', flags: MessageFlags.Ephemeral });
    }
    const ok = await phraseManager.editPhrase(category, key, type, index, text);
    return interaction.reply({ content: ok ? `✅ Frase editada.` : `❌ No se encontró esa frase.`, flags: MessageFlags.Ephemeral });
  }

  if (action === 'delete') {
    if (!category || !key || index === null) {
      return interaction.reply({ content: '❌ Faltan parámetros: categoría, clave e índice son requeridos.', flags: MessageFlags.Ephemeral });
    }
    const ok = await phraseManager.deletePhrase(category, key, type, index);
    return interaction.reply({ content: ok ? `✅ Frase borrada.` : `❌ No se encontró esa frase.`, flags: MessageFlags.Ephemeral });
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

module.exports = { bpCommandData, registerSlashCommands, handleInteraction, handleMessage };
