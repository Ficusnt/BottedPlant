/**
 * funCommands.js - Fun/random slash command handlers
 * Extracted from bpCommand.js for modularity
 */

import { MessageFlags } from 'discord.js';
import * as phraseManager from '../phraseManager.js';
import { sendShitpost, hasShitpostTrigger, getShitpostResponse } from '../shitpost.js';
import { isOnCooldown, getRemainingCooldown, setCooldown } from '../cooldowns.js';

/**
 * Handle /bp fun uwu
 */
async function handleFunUwu(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const text = interaction.options.getString('texto');
  if (!text) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('fun', 'uwuUsage')
    });
  }

  const uwuText = text
    .replace(/r|l/gi, 'w')
    .replace(/R|L/gi, 'W')
    .replace(/ove/gi, 'uv')
    .replace(/OVE/gi, 'UV')
    .replace(/ove/gi, 'uv');

  const endings = [' uwu', ' owo', ' :3', ' c:', ' leaf', ''];
  const ending = endings[Math.floor(Math.random() * endings.length)];

  return interaction.editReply({ content: uwuText + ending });
}

/**
 * Handle /bp fun shitpost (manual trigger)
 */
async function handleFunShitpost(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const uid = interaction.user.id;
  if (isOnCooldown(uid, 'shitpost')) {
    const remaining = Math.ceil(getRemainingCooldown(uid, 'shitpost') / 1000);
    return interaction.editReply({ 
      content: `⏳ Espera ${remaining}s antes de usar shitpost de nuevo.`
    });
  }

  const trigger = interaction.options.getString('trigger');
  if (!trigger) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('fun', 'shitpostUsage')
    });
  }

  const response = await getShitpostResponse(trigger, interaction.channelId);
  
  // Set cooldown on successful execution
  setCooldown(uid, 'shitpost');
  if (!response) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('fun', 'shitpostNotFound')
    });
  }

  return interaction.editReply(response);
}

/**
 * Handle /bp fun roll
 */
async function handleFunRoll(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const sides = interaction.options.getInteger('caras') || 20;
  const rolls = interaction.options.getInteger('tiradas') || 1;

  if (sides < 2 || sides > 1000) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('fun', 'rollRange')
    });
  }
  if (rolls < 1 || rolls > 20) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('fun', 'rollCountRange')
    });
  }

  const results = [];
  let total = 0;
  for (let i = 0; i < rolls; i++) {
    const roll = Math.floor(Math.random() * sides) + 1;
    results.push(roll);
    total += roll;
  }

  const resultText = rolls === 1
    ? '**' + results[0] + '**'
    : results.join(', ') + ' (Total: **' + total + '**)';

  return interaction.editReply(await phraseManager.getPhrase('fun', 'rollResult', {
    sides,
    rolls,
    result: resultText
  }));
}

/**
 * Handle /bp fun choose
 */
async function handleFunChoose(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const options = interaction.options.getString('opciones');
  if (!options) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('fun', 'chooseUsage')
    });
  }

  const choices = options.split(',').map(s => s.trim()).filter(Boolean);
  if (choices.length < 2) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('fun', 'chooseMin')
    });
  }

  const chosen = choices[Math.floor(Math.random() * choices.length)];
  return interaction.editReply(await phraseManager.getPhrase('fun', 'chooseResult', {
    chosen,
    options: choices.join(', ')
  }));
}

/**
 * Handle /bp fun 8ball
 */
async function handleFun8ball(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const question = interaction.options.getString('pregunta');
  if (!question) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('fun', '8ballUsage')
    });
  }

  const responses = [
    'Sí, definitivamente 🌿',
    'Es decididamente así 🍃',
    'Sin duda 🌱',
    'Sí, definitivamente 🍀',
    'Puedes confiar en ello 🌿',
    'Como yo lo veo, sí 🍃',
    'Lo más probable 🌱',
    'Perspectiva buena 🍀',
    'Sí 🌿',
    'Las señales apuntan a sí 🍃',
    'Respuesta confusa, intenta de nuevo 🌱',
    'Pregunta de nuevo más tarde 🍀',
    'Mejor no decirte ahora 🌿',
    'No puedo predecirlo ahora 🍃',
    'Concéntrate y pregunta de nuevo 🌱',
    'No cuentes con ello 🍀',
    'Mi respuesta es no 🌿',
    'Mis fuentes dicen que no 🍃',
    'Las perspectivas no son tan buenas 🌱',
    'Muy dudoso 🍀'
  ];

  const answer = responses[Math.floor(Math.random() * responses.length)];
  return interaction.editReply(await phraseManager.getPhrase('fun', '8ballResult', {
    question,
    answer
  }));
}

export {
  handleFunUwu,
  handleFunShitpost,
  handleFunRoll,
  handleFunChoose,
  handleFun8ball,
};
