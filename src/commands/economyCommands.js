/**
 * @typedef {import('discord.js').ChatInputCommandInteraction} ChatInputCommandInteraction
 */

import { EmbedBuilder, MessageFlags } from 'discord.js';
import * as dataStore from '../dataStore.js';
import * as phraseManager from '../phraseManager.js';

/**
 * Handle /bp leaves daily
 * @param {ChatInputCommandInteraction} interaction
 */
async function handleLeavesDaily(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const gid = interaction.guildId;
  const uid = interaction.user.id;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entry = await dataStore.getPointsEntry(gid, uid);

  let streak = 1;
  if (entry.lastDaily) {
    const last = new Date(entry.lastDaily);
    /** @type {Date} */
    const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    /** @type {Date} */
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((todayDate.getTime() - lastDay.getTime()) / 86400000);
    if (diffDays === 0) {
      return interaction.editReply({ 
        content: await phraseManager.getPhrase('economy', 'dailyAlready')
      });
    }
    if (diffDays === 1) {
      streak = (entry.streak || 0) + 1;
    }
  }

  const baseGain = 50;
  const bonusPct = Math.min(streak * 5, 50);
  const gained = Math.floor(baseGain * (1 + bonusPct / 100));
  const total = await dataStore.addPoints(gid, uid, gained);
  
  await dataStore.updatePointsEntry(gid, uid, { 
    lastDaily: today.toISOString(), 
    streak 
  });

  return interaction.editReply(await phraseManager.getPhrase('economy', 'dailySuccess', {
    gained,
    bonusPct: bonusPct > 0 ? bonusPct : null,
    streak,
    total
  }));
}

/**
 * Handle /bp leaves points
 */
async function handleLeavesPoints(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const gid = interaction.guildId;
  const target = interaction.options.getUser('usuario') || interaction.user;
  const entry = await dataStore.getPointsEntry(gid, target.id);

  if (!entry || entry.points === 0) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('economy', 'pointsEmpty')
    });
  }

  return interaction.editReply(await phraseManager.getPhrase('economy', 'pointsSuccess', {
    user: target.toString(),
    points: entry.points.toLocaleString('es-AR'),
    streak: entry.streak || 0
  }));
}

/**
 * Handle /bp leaves leaderboard
 */
async function handleLeavesLeaderboard(interaction) {
  await interaction.deferReply();

  const gid = interaction.guildId;
  const leaderboard = await dataStore.getLeaderboard(gid, 10);

  if (!leaderboard || leaderboard.length === 0) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('economy', 'leaderboardEmpty')
    });
  }

  const lines = leaderboard.map((entry, i) => 
    `**${i + 1}.** <@${entry.userId}> -- **${entry.points.toLocaleString('es-AR')}** hojas${entry.streak ? ` (🔥 ${entry.streak})` : ''}`
  ).join('\n');

  return interaction.editReply(await phraseManager.getPhrase('economy', 'leaderboardSuccess',  { list: lines }));
}

/**
 * Handle /bp leaves gamble
 */
async function handleLeavesGamble(interaction) {
  await interaction.deferReply();

  const text = interaction.options.getString('texto');
  if (!text) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('economy', 'gambleUsage')
    });
  }
  
  const parts = text.split('|').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 3) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('economy', 'gambleUsage')
    });
  }

  const statement = parts[0];
  const choices = parts.slice(1);
  if (choices.length < 2 || choices.length > 10) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('economy', 'gambleChoices')
    });
  }

  const id = Math.random().toString(36).substring(2, 8);
  const gamble = {
    id,
    guildId: interaction.guildId,
    creator: interaction.user.id,
    statement,
    choices,
    bets: {},
    closed: false,
    createdAt: Date.now()
  };

  await dataStore.saveGamble(id, gamble);
  
  const lines = choices.map((c, i) => `**${i + 1}.** ${c}`).join('\n');
  return interaction.editReply(await phraseManager.getPhrase('economy', 'gambleCreated',  {
    id,
    statement,
    lines
  }));
}

/**
 * Handle /bp leaves bet
 */
async function handleLeavesBet(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const id = interaction.options.getString('id');
  const choice = interaction.options.getInteger('opcion');
  const amount = interaction.options.getInteger('cantidad');

  if (!id || !choice || !amount) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('economy', 'gambleBetUsage')
    });
  }

  if (amount < 1) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('economy', 'gambleBetAmount')
    });
  }

  const gid = interaction.guildId;
  const uid = interaction.user.id;
  const entry = await dataStore.getPointsEntry(gid, uid);
  const points = entry?.points || 0;

  if (points < amount) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('economy', 'gambleBetNoPoints',  { amount, points })
    });
  }

  const gamble = await dataStore.getGamble(id);
  if (!gamble) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('economy', 'gambleBetNotFound')
    });
  }
  if (gamble.closed) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('economy', 'gambleBetClosed')
    });
  }
  if (choice < 1 || choice > gamble.choices.length) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('economy', 'gambleBetBadChoice')
    });
  }

  await dataStore.addPoints(gid, uid, -amount);

  const key = String(choice);
  gamble.bets[key] = gamble.bets[key] || {};
  const current = gamble.bets[key][uid] || 0;
  gamble.bets[key][uid] = current + amount;
  await dataStore.saveGamble(id, gamble);

  const totalOnChoice = Object.values(gamble.bets[key]).reduce((a, b) => a + b, 0);
  return interaction.editReply(await phraseManager.getPhrase('economy', 'gambleBetPlaced',  {
    amount,
    choice,
    choiceText: gamble.choices[choice - 1],
    totalOnChoice
  }));
}

/**
 * Handle /bp leaves redeem
 */
async function handleLeavesRedeem(interaction) {
  await interaction.deferReply();

  const id = interaction.options.getString('id');
  const winning = interaction.options.getInteger('opcion');

  // Validate required parameters
  if (!id || !winning) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('economy', 'gambleRedeemUsage')
    });
  }

  const gamble = await dataStore.getGamble(id);
  if (!gamble) {return interaction.editReply({ 
    content: await phraseManager.getPhrase('economy', 'gambleRedeemNotFound')
  });}
  if (gamble.closed) {return interaction.editReply({ 
    content: await phraseManager.getPhrase('economy', 'gambleRedeemClosed')
  });}
  if (winning < 1 || winning > gamble.choices.length) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('economy', 'gambleRedeemBadChoice')
    });
  }

  const isCreator = gamble.creator === interaction.user.id;
  const isAdmin = interaction.memberPermissions.has('ManageMessages') || false;
  if (!isCreator && !isAdmin) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('economy', 'gambleRedeemNoPerm')
    });
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
  if (creatorCut > 0) {await dataStore.addPoints(interaction.guildId, gamble.creator, creatorCut);}

  if (winTotal === 0) {
    msg = await phraseManager.getPhrase('economy', 'gambleRedeemNoWinners',  {
      statement: gamble.statement,
      winning,
      choiceText: gamble.choices[winning - 1],
      creatorCut
    });
  } else {
    // Distribute pool proportionally
    for (const [betUserId, betAmount] of Object.entries(winBets)) {
      const share = Math.floor((betAmount / winTotal) * pool);
      if (share > 0) {await dataStore.addPoints(interaction.guildId, betUserId, betAmount + share);}
    }
    msg = await phraseManager.getPhrase('economy', 'gambleRedeemWinners',  {
      statement: gamble.statement,
      winning,
      choiceText: gamble.choices[winning - 1],
      total,
      creatorCut,
      pool
    });
  }

  await dataStore.saveGamble(id, gamble);
  return interaction.editReply(msg);
}

export {
  handleLeavesDaily,
  handleLeavesPoints,
  handleLeavesLeaderboard,
  handleLeavesGamble,
  handleLeavesBet,
  handleLeavesRedeem,
};
