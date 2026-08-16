// economy.js — Hojas (leaves), betting, triggers, uwu (ported from GigaSlothy)
const { EmbedBuilder } = require('discord.js');
const dataStore = require('./dataStore');
const { hasShitpostTrigger, getShitpostResponse, getRandomMedia, sendShitpost } = require('./shitpost');
const phraseManager = require('./phraseManager');

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
    case 'daily': return cmdDaily(interaction);
    case 'points': return cmdPoints(interaction);
    case 'leaderboard': return cmdLeaderboard(interaction);
    case 'gamble': return cmdGamble(interaction);
    case 'bet': return cmdBet(interaction);
    case 'redeem': return cmdRedeem(interaction);
    case 'uwu': return cmdUwu(interaction);
    default: return null;
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
      return interaction.reply(await phraseManager.getPhrase('economy', 'dailyAlready'));
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

  return interaction.reply(await phraseManager.getPhrase('economy', 'dailySuccess', 'hits', { gained, bonusPct, streak, total }));
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
    return interaction.reply(await phraseManager.getPhrase('economy', 'pointsEmpty'));
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
      content: await phraseManager.getPhrase('economy', 'gambleBadFormat'),
      ephemeral: true,
    });
  }
  const statement = parts[0];
  const choices = parts.slice(1);
  if (choices.length > 10) {
    return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleTooMany'), ephemeral: true });
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
  return interaction.reply(await phraseManager.getPhrase('economy', 'gambleCreated', 'hits', { id, statement, list }));
}

async function cmdBet(interaction) {
  const id = interaction.options.getString('id');
  const choice = interaction.options.getInteger('choice');
  const amount = interaction.options.getInteger('amount');
  const gamble = await dataStore.getGamble(id);
  if (!gamble) return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleNotFound'), ephemeral: true });
  if (gamble.closed) return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleClosed'), ephemeral: true });
  if (gamble.creator === interaction.user.id) {
    return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleSelfBet'), ephemeral: true });
  }
  if (choice < 1 || choice > gamble.choices.length) {
    return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleBadChoice'), ephemeral: true });
  }
  if (amount <= 0) return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleBadAmount'), ephemeral: true });

  const key = String(choice);
  const uid = interaction.user.id;
  const current = gamble.bets[key]?.[uid] || 0;

  const userPoints = await dataStore.getUserPoints(interaction.guildId, uid);
  if (!await dataStore.deductPoints(interaction.guildId, uid, amount)) {
    return interaction.reply({
      content: await phraseManager.getPhrase('economy', 'gambleNotEnough', 'hits', { userPoints }),
      ephemeral: true,
    });
  }

  gamble.bets[key] = gamble.bets[key] || {};
  gamble.bets[key][uid] = current + amount;
  await dataStore.saveGamble(id, gamble);

  const totalOnChoice = Object.values(gamble.bets[key]).reduce((a, b) => a + b, 0);
  return interaction.reply(await phraseManager.getPhrase('economy', 'gambleBetPlaced', 'hits', { amount, choice, choiceText: gamble.choices[choice - 1], totalOnChoice }));
}

async function cmdRedeem(interaction) {
  const id = interaction.options.getString('id');
  const winning = interaction.options.getInteger('choice');
  const gamble = await dataStore.getGamble(id);
  if (!gamble) return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleRedeemNotFound'), ephemeral: true });
  if (gamble.closed) return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleRedeemClosed'), ephemeral: true });
  if (winning < 1 || winning > gamble.choices.length) {
    return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleRedeemBadChoice'), ephemeral: true });
  }

  const isCreator = gamble.creator === interaction.user.id;
  const isAdmin = interaction.memberPermissions.has('ManageMessages') || false;
  if (!isCreator && !isAdmin) {
    return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleRedeemNoPerm'), ephemeral: true });
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
    msg = await phraseManager.getPhrase('economy', 'gambleRedeemNoWinners', 'hits', { statement: gamble.statement, winning, choiceText: gamble.choices[winning - 1], creatorCut });
  } else {
    for (const [uid, amt] of Object.entries(winBets)) {
      const share = Math.floor(pool * (amt / winTotal));
      if (share > 0) await dataStore.addPoints(interaction.guildId, Number(uid), share);
    }
    msg = await phraseManager.getPhrase('economy', 'gambleRedeemWinners', 'hits', { statement: gamble.statement, winning, choiceText: gamble.choices[winning - 1], total, creatorCut, pool });
  }
  await dataStore.saveGamble(id, gamble);
  return interaction.reply(msg);
}

// ---------------- UwU ----------------

async function uwuify(input) {
  let text = input
    .replace(/[rl]/g, 'w')
    .replace(/[RL]/g, 'W')
    .replace(/ove/g, 'uv')
    .replace(/the/gi, 'da')
    .replace(/th/gi, 'd')
    .replace(/n([aeiou])/g, 'ny$1')
    .replace(/N([aeiou])/g, 'Ny$1')
    .replace(/!+/g, '!')
    .replace(/\?+/g, '?')
    .trim();
  return text + phraseManager.rand(await phraseManager.getUwuEnding());
}

async function cmdUwu(interaction) {
  await interaction.reply(uwuify(interaction.options.getString('text')));
}

// ---------------- Message triggers (d20) ----------------

async function handleMessage(message) {
  if (message.author.bot || !message.guild) return;
  const content = message.content.trim();
  if (!content || content.startsWith('/')) return;

  // Check for "planta" trigger first - 100% trigger chance
  const lowerContent = content.toLowerCase();
  if (lowerContent.includes('planta')) {
    const response = getShitpostResponse('plant');
    if (response) {
      if (Math.random() < 0.3) {
        const mediaFile = await getRandomMedia();
        if (mediaFile) {
          await sendShitpost(message, response, mediaFile);
          return;
        }
      }
      await sendShitpost(message, response);
      return;
    }
  }

  // Check for shitpost triggers - 25% random trigger chance
  if (hasShitpostTrigger(content) && Math.random() < 0.25) {
    const response = getShitpostResponse(content);
    if (response) {
      // 30% chance to send media with response if available
      if (Math.random() < 0.3) {
        const mediaFile = await getRandomMedia();
        if (mediaFile) {
          await sendShitpost(message, response, mediaFile);
          return;
        }
      }
      await sendShitpost(message, response);
      return;
    }
  }

  // Fall back to regular triggers using phraseManager - 25% random trigger chance
  if (Math.random() <= 0.25) {
    const triggerResponse = await phraseManager.getTriggerResponse('triggers', content);
    if (triggerResponse && triggerResponse.text) {
      await message.channel.send(triggerResponse.text).catch(() => {});
      return;
    }
  }
}

module.exports = { runEconomyCommand, handleMessage, uwuify };