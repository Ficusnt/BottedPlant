// economy.js — Hojas (leaves), betting, triggers, uwu (ported from GigaSlothy)
/**
 * @typedef {import('discord.js').ChatInputCommandInteraction} ChatInputCommandInteraction
 * @typedef {import('discord.js').Message} Message
 */

import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import * as dataStore from './dataStore.js';
import { hasShitpostTrigger, getShitpostResponse, getRandomMedia, sendShitpost } from './shitpost.js';
import * as phraseManager from './phraseManager.js';
import { isOnCooldown, getRemainingCooldown, setCooldown } from './cooldowns.js';
import config from './config.js';

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
  const uid = interaction.user.id;
  
  // Cooldown check for rate-limited commands
  const cooldownCommands = ['gamble', 'bet', 'redeem', 'leaderboard'];
  if (cooldownCommands.includes(sub) && isOnCooldown(uid, sub)) {
    const remaining = Math.ceil(getRemainingCooldown(uid, sub) / 1000);
    return interaction.reply({ 
      content: `⏳ Espera ${remaining}s antes de usar este comando de nuevo.`, 
      flags: MessageFlags.Ephemeral 
    });
  }

  let result;
  switch (sub) {
    case 'daily': result = await cmdDaily(interaction); break;
    case 'points': result = await cmdPoints(interaction); break;
    case 'leaderboard': result = await cmdLeaderboard(interaction); break;
    case 'gamble': result = await cmdGamble(interaction); break;
    case 'bet': result = await cmdBet(interaction); break;
    case 'redeem': result = await cmdRedeem(interaction); break;
    case 'uwu': result = await cmdUwu(interaction); break;
    default: return null;
  }
  
  // Set cooldown after successful execution
  if (result !== null && cooldownCommands.includes(sub)) {
    setCooldown(uid, sub);
  }
  return result;
}

// ---------------- Daily / Points ----------------

async function cmdDaily(interaction) {
  const gid = interaction.guildId;
  const uid = interaction.user.id;
  const now = new Date();
  /** @type {Date} */
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entry = await dataStore.getPointsEntry(gid, uid);

  let streak = 1;
  if (entry.lastDaily) {
    const last = new Date(entry.lastDaily);
    /** @type {Date} */
    const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    const diffDays = Math.round((today.getTime() - lastDay.getTime()) / 86400000);
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
    /** @type {Date} */
    const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    const now = new Date();
    /** @type {Date} */
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.round((today.getTime() - lastDay.getTime()) / 86400000);
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
  if (!text) {
    return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleUsage'), flags: MessageFlags.Ephemeral });
  }

  // Cooldown check for gamble creation
  const cooldownKey = `gamble-${interaction.user.id}-${interaction.guildId}`;
  if (await isOnCooldown(cooldownKey)) {
    const remaining = await getRemainingCooldown(cooldownKey);
    return interaction.reply({ content: `⏳ Espera ${Math.ceil(remaining / 1000)}s antes de crear otra apuesta.`, flags: MessageFlags.Ephemeral });
  }

  // Parse with escaped pipe support: \| is treated as literal pipe, not separator
  const parts = [];
  let current = '';
  let escaped = false;
  for (const char of text) {
    if (escaped) {
      current += char;
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === '|') {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim());

  // Filter empty parts
  const filteredParts = parts.filter(Boolean);
  
  if (filteredParts.length < 3) {
    return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleBadFormat'), flags: MessageFlags.Ephemeral });
  }

  const statement = filteredParts[0];
  const choices = filteredParts.slice(1);

  // Validate statement
  if (!statement || statement.length > 200) {
    return interaction.reply({ content: 'El enunciado debe tener entre 1 y 200 caracteres.', flags: MessageFlags.Ephemeral });
  }

  // Validate choices
  if (choices.length < 2 || choices.length > 10) {
    return interaction.reply({ content: 'Debe haber entre 2 y 10 opciones.', flags: MessageFlags.Ephemeral });
  }

  for (const choice of choices) {
    if (choice.length > 50) {
      return interaction.reply({ content: 'Cada opción debe tener máximo 50 caracteres.', flags: MessageFlags.Ephemeral });
    }
  }

  // Check for duplicate choices
  const uniqueChoices = new Set(choices);
  if (uniqueChoices.size !== choices.length) {
    return interaction.reply({ content: 'Las opciones no pueden repetirse.', flags: MessageFlags.Ephemeral });
  }

  const id = `${interaction.guildId}-${Date.now()}`;
  await dataStore.createGamble(id, {
    statement,
    creator: interaction.user.id,
    choices,
    bets: {},
    closed: false,
  });

  await setCooldown(cooldownKey, config.economy?.gambleCooldownMs || 5 * 60 * 1000);

  const list = choices.map((c, i) => `**${i + 1}.** ${c}`).join('\n');
  return interaction.reply(await phraseManager.getPhrase('economy', 'gambleCreated', 'hits', { id, statement, list }));
}

async function cmdBet(interaction) {
  const id = interaction.options.getString('id');
  const choice = interaction.options.getInteger('choice');
  const amount = interaction.options.getInteger('amount');
  const uid = interaction.user.id;
  const gid = interaction.guildId;

  // Validate required parameters
  if (!id || !choice || !amount) {
    return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleBetUsage'), flags: MessageFlags.Ephemeral });
  }

  // Validate amount
  if (amount < 1) {
    return interaction.reply({ content: 'La apuesta debe ser mayor a 0.', flags: MessageFlags.Ephemeral });
  }
  const maxBet = config.economy?.maxBetAmount || 10000;
  if (amount > maxBet) {
    return interaction.reply({ content: `La apuesta no puede exceder ${maxBet.toLocaleString()} hojas.`, flags: MessageFlags.Ephemeral });
  }

  // Cooldown check for betting
  const cooldownKey = `bet-${uid}-${gid}`;
  if (await isOnCooldown(cooldownKey)) {
    const remaining = await getRemainingCooldown(cooldownKey);
    return interaction.reply({ content: `⏳ Espera ${Math.ceil(remaining / 1000)}s antes de apostar de nuevo.`, flags: MessageFlags.Ephemeral });
  }

  const gamble = await dataStore.getGamble(id);
  if (!gamble) {
    return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleNotFound'), flags: MessageFlags.Ephemeral });
  }
  if (gamble.closed) {
    return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleClosed'), flags: MessageFlags.Ephemeral });
  }
  if (gamble.creator === interaction.user.id) {
    return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleSelfBet'), flags: MessageFlags.Ephemeral });
  }
  if (choice < 1 || choice > gamble.choices.length) {
    return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleBadChoice'), flags: MessageFlags.Ephemeral });
  }

  // Check user has enough points
  const userPoints = await dataStore.getUserPoints(gid, uid);
  if (userPoints < amount) {
    return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleNotEnough', 'hits', { userPoints }), flags: MessageFlags.Ephemeral });
  }

  // Deduct points
  const deducted = await dataStore.deductPoints(gid, uid, amount);
  if (!deducted) {
    return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleNotEnough', 'hits', { userPoints }), flags: MessageFlags.Ephemeral });
  }

  // Record bet
  const key = String(choice);
  gamble.bets[key] = gamble.bets[key] || {};
  const current = gamble.bets[key][uid] || 0;
  gamble.bets[key][uid] = current + amount;
  await dataStore.saveGamble(id, gamble);
  await setCooldown(cooldownKey, config.economy?.betCooldownMs || 30 * 1000);

  const totalOnChoice = Object.values(gamble.bets[key]).reduce((a, b) => a + b, 0);
  return interaction.reply(await phraseManager.getPhrase('economy', 'gambleBetPlaced', 'hits', { amount, choice, choiceText: gamble.choices[choice - 1], totalOnChoice }));
}

async function cmdRedeem(interaction) {
  const id = interaction.options.getString('id');
  const winning = interaction.options.getInteger('choice');

  // Validate required parameters
  if (!id || !winning) {
    return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleRedeemUsage'), flags: MessageFlags.Ephemeral });
  }

  const gamble = await dataStore.getGamble(id);
  if (!gamble) return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleRedeemNotFound'), flags: MessageFlags.Ephemeral });
  if (gamble.closed) return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleRedeemClosed'), flags: MessageFlags.Ephemeral });
  if (winning < 1 || winning > gamble.choices.length) {
    return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleRedeemBadChoice'), flags: MessageFlags.Ephemeral });
  }

  const isCreator = gamble.creator === interaction.user.id;
  const isAdmin = interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages);
  if (!isCreator && !isAdmin) {
    return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleRedeemNoPerm'), flags: MessageFlags.Ephemeral });
  }

  // Check if gamble has any bets
  if (!gamble.bets || Object.keys(gamble.bets).length === 0) {
    return interaction.reply({ content: await phraseManager.getPhrase('economy', 'gambleRedeemNoBets'), flags: MessageFlags.Ephemeral });
  }

  // Cooldown check for redeem
  const cooldownKey = `redeem-${interaction.user.id}-${interaction.guildId}`;
  if (await isOnCooldown(cooldownKey)) {
    const remaining = await getRemainingCooldown(cooldownKey);
    return interaction.reply({ content: `⏳ Espera ${Math.ceil(remaining / 1000)}s antes de canjear otra apuesta.`, flags: MessageFlags.Ephemeral });
  }

  gamble.closed = true;
  const total = Object.values(gamble.bets).reduce(
    (a, bets) => a + Object.values(bets).reduce((x, y) => x + y, 0),
    0
  );
  const creatorCutPercent = config.economy?.creatorCutPercent || 0.05;
  const creatorCut = Math.floor(total * creatorCutPercent);
  const winKey = String(winning);
  const winBets = gamble.bets[winKey] || {};
  const winTotal = Object.values(winBets).reduce((a, b) => a + b, 0);
  const pool = Math.max(0, total - creatorCut - winTotal);

  let msg;
  if (creatorCut > 0)
    msg = await phraseManager.getPhrase('economy', 'gambleRedeemWinners', 'hits', {
      winning: gamble.choices[winning - 1],
      pool,
      creatorCut,
      creator: `<@${gamble.creator}>`,
    });
  else
    msg = await phraseManager.getPhrase('economy', 'gambleRedeemWinners', 'hits', {
      winning: gamble.choices[winning - 1],
      pool,
      creatorCut: 0,
      creator: `<@${gamble.creator}>`,
    });

  // Distribute winnings
  const winners = [];
  for (const [userId, amount] of Object.entries(winBets)) {
    const share = winTotal > 0 ? Math.floor((amount / winTotal) * pool) : 0;
    if (share > 0) {
      await dataStore.addPoints(userId, interaction.guildId, share);
      winners.push(`<@${userId}> +${share}`);
    }
  }

  // Give creator cut
  if (creatorCut > 0) {
    await dataStore.addPoints(gamble.creator, interaction.guildId, creatorCut);
  }

  await dataStore.saveGamble(id, gamble);
  await setCooldown(cooldownKey, config.economy?.redeemCooldownMs || 60 * 1000);

  if (winners.length > 0) {
    msg += '\n\n' + winners.join(', ');
  }
  return interaction.reply({ content: msg });
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
    const response = getShitpostResponse('plant', message.channelId);
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
    const response = getShitpostResponse(content, message.channelId);
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
    const triggerMatch = await phraseManager.getTriggerResponse(content, {});
    if (triggerMatch && triggerMatch.triggerData) {
      const { triggerData, triggerKey } = triggerMatch;
      // Use d20 roll for hit/crit/fail (matching old behavior)
      const roll = Math.floor(Math.random() * 20) + 1;
      let response;
      if (roll === 1) {
        response = phraseManager.rand(triggerData.fails || triggerData.hits || []);
      } else if (roll === 20) {
        response = phraseManager.rand(triggerData.crits || triggerData.hits || []);
      } else {
        response = phraseManager.rand(triggerData.hits || []);
      }
      
      if (response) {
        // Interpolate and post-process
        response = phraseManager.postProcessPhrase(phraseManager.interpolate(response, {}), await phraseManager.getPhrases());
        
        // Check for media
        let mediaFile = null;
        if (triggerData.media && triggerData.media.length && Math.random() < (triggerData.mediaChance || 0.08)) {
          mediaFile = phraseManager.rand(triggerData.media);
        }
        
        if (mediaFile) {
          await sendShitpost(message, response, mediaFile);
        } else {
          await message.channel.send(response).catch(() => {});
        }
        return;
      }
    }
  }
}

export { runEconomyCommand, handleMessage, uwuify };