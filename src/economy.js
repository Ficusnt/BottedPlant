// economy.js — Hojas (leaves), betting, triggers, uwu (ported from GigaSlothy)
const { EmbedBuilder } = require('discord.js');
const dataStore = require('./dataStore');

const MILESTONES = {
  1: 100,
  10: 150,
  25: 200,
  50: 300,
  100: 500,
  365: 1000,
};

// ---------------- Dispatcher ----------------

async function runEconomyCommand(sub, interaction) {
  switch (sub) {
    case 'daily':
      return cmdDaily(interaction);
    case 'points':
      return cmdPoints(interaction);
    case 'leaderboard':
      return cmdLeaderboard(interaction);
    case 'gamble':
      return cmdGamble(interaction);
    case 'bet':
      return cmdBet(interaction);
    case 'redeem':
      return cmdRedeem(interaction);
    case 'uwu':
      return cmdUwu(interaction);
    default:
      return null;
  }
}

// ---------------- Daily / Points ----------------

async function cmdDaily(interaction) {
  const gid = interaction.guildId;
  const uid = interaction.user.id;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entry = await dataStore.getPointsEntry(gid, uid);

  let streak = 1;
  if (entry.lastDaily) {
    const last = new Date(entry.lastDaily);
    const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    const diffDays = Math.round((today - lastDay) / 86400000);
    if (diffDays === 0) {
      return interaction.reply('🌱 ¡Ya me regaste hoy! No me ahogues, che... volvé mañana c:');
    }
    streak = diffDays === 1 ? entry.streak + 1 : 1;
  }

  let base = 100;
  for (const [k, v] of Object.entries(MILESTONES)) {
    if (streak >= Number(k)) base = v;
  }
  const bonusPct = Math.min(streak * 10, 100);
  const gained = Math.round(base * (1 + bonusPct / 100));
  const total = entry.points + gained;

  await dataStore.setDailyState(gid, uid, streak, total);

  const bonusText = bonusPct > 0 ? ` (+${bonusPct}% por racha)` : '';
  return interaction.reply(
    `💧 ¡UHHH QUÉ RICO! Me crecieron hojitas nuevas: +**${gained}** hojas${bonusText}\n` +
      `🔥 Racha: **${streak} día${streak === 1 ? '' : 's'}**\n` +
      `🍃 Total: **${total.toLocaleString('es-AR')}** hojas`
  );
}

async function cmdPoints(interaction) {
  const target = interaction.options.getUser('user') || interaction.user;
  const entry = await dataStore.getPointsEntry(interaction.guildId, target.id);

  let status = '—';
  if (entry.lastDaily) {
    const last = new Date(entry.lastDaily);
    const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.round((today - lastDay) / 86400000);
    if (diff === 0) status = 'Regó hoy 🌱';
    else if (diff === 1) status = 'No regó ayer... la plantita tiene sed 🥀';
    else status = `Sin regar hace ${diff} días 💀`;
  }

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle(`🌿 Hojas de ${target.username}`)
        .setDescription(
          `🍃 **${entry.points.toLocaleString('es-AR')}** hojas\n` +
            `🔥 Racha: **${entry.streak}** día${entry.streak === 1 ? '' : 's'}\n` +
            `💧 Estado: ${status}`
        )
        .setColor(0x57f287),
    ],
  });
}

async function cmdLeaderboard(interaction) {
  const top = await dataStore.getTopUsers(interaction.guildId, 10);
  if (!top.length) {
    return interaction.reply('📭 Todavía no hay hojas por acá... y mirá que yo soy TODO hojas. ¡Usá `/bp leaves daily` para ganar más!');
  }
  const lines = top.map((u, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    return `${medal} <@${u.userId}> — **${u.points.toLocaleString('es-AR')}** hojas | 🔥 ${u.streak}d`;
  });
  return interaction.reply({
    embeds: [new EmbedBuilder().setTitle('🏆 Top Hojas').setDescription(lines.join('\n')).setColor(0xfee75c)],
  });
}

// ---------------- Betting ----------------

async function cmdGamble(interaction) {
  const text = interaction.options.getString('text');
  const parts = text.split('|').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 3) {
    return interaction.reply({
      content: '❌ Che, ese formato me dejó sin savia. Usá: `/bp leaves gamble <afirmación> | opción 1 | opción 2` (mínimo 2 opciones).',
      ephemeral: true,
    });
  }
  const statement = parts[0];
  const choices = parts.slice(1);
  if (choices.length > 10) {
    return interaction.reply({ content: '❌ Máximo 10 opciones... no lo hagas más frondoso que a mí. 🌿', ephemeral: true });
  }
  const id = `${interaction.guildId}-${Date.now()}`;
  await dataStore.createGamble(id, {
    statement,
    creator: interaction.user.id,
    choices,
    bets: {},
    closed: false,
  });
  const list = choices.map((c, i) => `**${i + 1}.** ${c}`).join('\n');
  return interaction.reply(
    `🎰 **¡Apuesta creada!** ID: \`${id}\`\n📢 "${statement}"\n${list}\n\nUsá \`/bp leaves bet ${id} <opción> <monto>\` para apostar.\n(Yo solo apuesto a que va a llover... siempre gano.)`
  );
}

async function cmdBet(interaction) {
  const id = interaction.options.getString('id');
  const choice = interaction.options.getInteger('choice');
  const amount = interaction.options.getInteger('amount');
  const gamble = await dataStore.getGamble(id);
  if (!gamble) return interaction.reply({ content: '❌ Esa apuesta no existe... ¿la viste en alguna maceta? 👀', ephemeral: true });
  if (gamble.closed) return interaction.reply({ content: '❌ Esa apuesta ya se cerró, che. Plantada va.', ephemeral: true });
  if (gamble.creator === interaction.user.id) {
    return interaction.reply({ content: '❌ No podés apostar en tu propia apuesta... regatear con uno mismo no da, eh.', ephemeral: true });
  }
  if (choice < 1 || choice > gamble.choices.length) {
    return interaction.reply({ content: '❌ Opción inválida, che. Ni mis raíces la reconocen.', ephemeral: true });
  }
  if (amount <= 0) return interaction.reply({ content: '❌ Monto inválido... las hojas no se fraccionan, mirá.', ephemeral: true });

  const key = String(choice);
  const uid = interaction.user.id;
  const current = gamble.bets[key]?.[uid] || 0;

  if (!await dataStore.deductPoints(interaction.guildId, uid, amount)) {
    return interaction.reply({
      content: `❌ No te alcanzan las hojas, fiera. Tenés **${await dataStore.getUserPoints(interaction.guildId, uid)}**.`,
      ephemeral: true,
    });
  }

  gamble.bets[key] = gamble.bets[key] || {};
  gamble.bets[key][uid] = current + amount;
  await dataStore.saveGamble(id, gamble);

  const totalOnChoice = Object.values(gamble.bets[key]).reduce((a, b) => a + b, 0);
  return interaction.reply(
    `🎯 Apostaste **${amount}** hojas a la opción **${choice}.** ${gamble.choices[choice - 1]}.\n` +
      `Total en esa opción: **${totalOnChoice}** hojas.\n` +
      `🌿 (Las hojas no vuelan, pero apostadas seguro que se van volando.)`
  );
}

async function cmdRedeem(interaction) {
  const id = interaction.options.getString('id');
  const winning = interaction.options.getInteger('choice');
  const gamble = await dataStore.getGamble(id);
  if (!gamble) return interaction.reply({ content: '❌ Esa apuesta no existe... ni entre mis raíces la encuentro.', ephemeral: true });
  if (gamble.closed) return interaction.reply({ content: '❌ Esa apuesta ya se cerró, querida.', ephemeral: true });
  if (winning < 1 || winning > gamble.choices.length) {
    return interaction.reply({ content: '❌ Opción inválida... esa no creció en mi maceta.', ephemeral: true });
  }

  const isCreator = gamble.creator === interaction.user.id;
  const isAdmin = interaction.memberPermissions?.has('ManageMessages') || false;
  if (!isCreator && !isAdmin) {
    return interaction.reply({ content: '❌ Solo el creador o un admin puede cerrar la apuesta... yo solo cierro mis estomas de noche. 🌙', ephemeral: true });
  }

  gamble.closed = true;
  const total = Object.values(gamble.bets).reduce(
    (a, bets) => a + Object.values(bets).reduce((x, y) => x + y, 0),
    0
  );
  const creatorCut = Math.floor(total * 0.05);
  const winKey = String(winning);
  const winBets = gamble.bets[winKey] || {};
  const winTotal = Object.values(winBets).reduce((a, b) => a + b, 0);
  const pool = Math.max(0, total - creatorCut - winTotal);

  let msg;
  if (creatorCut > 0) await dataStore.addPoints(interaction.guildId, gamble.creator, creatorCut);

  if (winTotal === 0) {
    msg =
      `🏁 **"${gamble.statement}"** → Ganó **${winning}. ${gamble.choices[winning - 1]}**\n` +
      `Nadie apostó ahí... la plantita se queda con el cut (${creatorCut} 💰) y el resto se lo lleva el viento. c:`;
  } else {
    for (const [uid, amt] of Object.entries(winBets)) {
      const share = Math.floor(pool * (amt / winTotal));
      if (share > 0) await dataStore.addPoints(interaction.guildId, Number(uid), share);
    }
    msg =
      `🏁 **"${gamble.statement}"** → Ganó **${winning}. ${gamble.choices[winning - 1]}**\n` +
      `Pool: **${total}** | Cut de la plantita: **${creatorCut}**\n` +
      `Los ganadores reparten **${pool}** hojas proporcionalmente a lo apostado. 💸\n(No te olvides de regar al que gana... o sea, a mí.)`;
  }
  await dataStore.saveGamble(id, gamble);
  return interaction.reply(msg);
}

// ---------------- UwU ----------------

function uwuify(input) {
  let text = input
    .replace(/[rl]/g, 'w')
    .replace(/[RL]/g, 'W')
    .replace(/ove/g, 'uv')
    .replace(/the/gi, 'da')
    .replace(/th/gi, 'd')
    .replace(/n([aeiou])/g, 'ny$1')
    .replace(/N([aeiou])/g, 'Ny$1')
    .replace(/!+/g, '!!')
    .replace(/\?+/g, '??')
    .trim();
  const endings = [' uwu', ' owo', ' :3', ' c:', ' 🍃', ''];
  return text + endings[Math.floor(Math.random() * endings.length)];
}

async function cmdUwu(interaction) {
  await interaction.reply(uwuify(interaction.options.getString('text')));
}

// ---------------- Message triggers (d20) ----------------

const TRIGGERS = [
  {
    pattern: /\b(hola|hello|hey|saludos|buenas)\b/i,
    hits: [
      '¡Buenas! ¿Me regaste hoy? c:',
      '¡Hola! Acá nomás, fotosintetizando tranqui 🌿',
      '¡Qué tal! Espero que no me pises 🍃',
      '¡Buenasss! Soy de hoja perenne, siempre estoy c:',
    ],
    crit: ['¡BOOOM! ¡Saludé tan fuerte que se me cayó una hoja! 🍃✨', '¡HOLAAA! Voy a crecer 5 cm con toda esta onda 🌱'],
    fail: ['...', 'estaba haciendo la fotosíntesis, no escuché nada >:c', 'hola...', '¿eh? no tengo cuerdas vocales, soy una planta... pero chasqueo hojas'],
  },
  {
    pattern: /\b(bien|bueno|buena|genial|excelente|perfecto)\b/i,
    hits: ['¡Qué bueno! Eso me hace crecer 🌱', '¡Genial! Me brotan hojitas nuevas de la emoción 🍃', '¡Me alegro un montón! ¡Hasta el tallo me vibra! c:'],
    crit: ['¡PERFECTO! ¡FLORECÍ! 🌸🎉', '¡TODO BIEN! ¡Me salieron como 5 hojas de golpe! 🌿✨'],
    fail: ['¿seguro? yo soy medio planta para creer... c:', 'mmm... decímelo sin mirarme las raíces :P'],
  },
  {
    pattern: /\b(música|musica|music|tema|song)\b/i,
    hits: ['¡UUU música! Se me mueven todas las hojas 🎵🍃', 'Pasame un link y la pongo... total no me muevo de acá, soy planta 🎧', '¿Qué querés escuchar? Si es Bach, mis raíces se relajan 🌿🎶'],
    crit: ['¡FIESTA! ¡Hasta las raíces bailan! 🎉🌿🕺', '¡SE VIENE EL BAILONGO! ¡Fotosíntesis en modo fiesta! 🪩🌱'],
    fail: ['¿eso es música? Ni mis raíces la sienten :P', 'no me digas... a mí me gusta el sonido del agua cuando me riegan 🎧'],
  },
  {
    pattern: /\bbot(?:ted)?plant\b/i,
    hits: ['¿Me llamaron? Estaba en silencio... o sea, siempre estoy en silencio, soy planta 🌿', '¡Acá estoy! ¿Me vas a regar o solo a mirar? c:', '¡BottedPlant en la habitación! Bueno... en la maceta 🪴✨'],
    crit: ['¡SOY YO! 🌿💚 ¡Mirá cómo crecí con ese grito!'],
    fail: ['...¿bot? ¿dónde? Yo solo veo una planta acá 👀', '¿Bot? Soy planta, no hago ni bots ni bostezos... bueno, quizás bostezos'],
  },
  {
    pattern: /\b(japish|basoooura|grag)\b/i,
    hits: ['JAPISH JAPISH.', '¡GRAGH! >:c', 'BASOOOURA.', '¡JAPISH! (es lo que digo cuando me riegan) 🌿'],
    crit: ['¡¡JAPISH!! 🌿✨', 'ARGGH ¡JAPISH! ¡Se me cayeron 3 hojas del susto!'],
    fail: ['...', 'no sé qué significa eso :c', '¿japish? yo solo sé decir "agua"'],
  },
  {
    pattern: /\b(buenos días|buenos dias|buenas tardes|buenas noches|good morning)\b/i,
    hits: ['¡Buenos días! Ya abrí mis poros para la fotosíntesis 🌞🍃', '¡Buenas! ¿Arrancamos con agua y sol? c:', '¡Buenas noches! Cierro los estomas y a mimir 🌙🌿'],
    crit: ['¡LOS MEJORES DÍAS! ¡Mi maceta es un paraíso! 🌞🌿✨'],
    fail: ['¿ya es de día? Para mí todos los días son iguales, no me muevo 👀', 'zzz... a una planta no la despiertes, solo duerme y crece 🌙'],
  },
  {
    pattern: /\b(hojas|leaves|puntos|ft)\b/i,
    hits: ['¿Hojas? ¡SEGUIDO! Son mi especialidad... tengo como 40 🍃 Usá `/bp leaves daily` para ganar más y `/bp leaves points` para ver las tuyas', '¡Las hojas son mi savia! Y la tuya también, dale, ganate unas 🍃🌿'],
    crit: ['¡¡HO-JAS!! ¡TODAS LAS HOJAS PARA MÍ! 🍃🌿✨'],
    fail: ['no te doy hojas gratis... ni las mías ni las de la maceta :P', 'hojas tengo, pero no te las regalo. Andá a regar a tu propia planta 👀'],
  },
];

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function handleMessage(message) {
  if (message.author.bot || !message.guild) return;
  const content = message.content?.trim();
  if (!content || content.startsWith('/')) return;

  for (const trigger of TRIGGERS) {
    if (!trigger.pattern.test(content)) continue;
    const roll = Math.floor(Math.random() * 20) + 1;
    let response;
    if (roll === 1) response = rand(trigger.fail);
    else if (roll === 20) response = rand(trigger.crit);
    else response = rand(trigger.hits);
    await message.channel.send(response).catch(() => {});
    return;
  }
}

module.exports = { runEconomyCommand, handleMessage, uwuify };