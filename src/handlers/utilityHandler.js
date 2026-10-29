/**
 * @typedef {import('discord.js').ChatInputCommandInteraction} ChatInputCommandInteraction
 * @typedef {import('discord.js').GuildChannel} GuildChannel
 * @typedef {import('discord.js').PermissionsBitField} PermissionsBitField
 */

import { queueEmbed, formatDuration } from '../embeds.js';
import { cmdLeave } from '../cmdLeave.js';
import * as phraseManager from '../phraseManager.js';
import config from '../config.js';
import * as dataStore from '../dataStore.js';
import { logger } from '../logger.js';
import { MessageFlags } from 'discord.js';

// Utility handlers that were inline in bpCommand.js
async function cmdHelp(interaction) {
  const helpText = await phraseManager.getPhrase('fun', 'helpText');
  await interaction.reply(helpText);
}

async function cmdStatus(interaction) {
  const states = ['☀️ regándome', '🌱 fotosintetizando', '🍃 dejando caer hojas', '💧 esperando que me rieguen', '🌿 creciendo derechita'];
  const chosen = states[Math.floor(Math.random() * states.length)];
  await interaction.reply(await phraseManager.getPhrase('fun', 'statusChanged', { chosen }));
}

async function cmdLatex(interaction) {
  const expr = interaction.options.getString('expresion');
  if (!expr) {return interaction.reply({ content: '❌ Faltá la expresión LaTeX.', flags: MessageFlags.Ephemeral });}
  const encoded = encodeURIComponent(expr);
  const url = `https://latex.codecogs.com/svg.latex?\\dpi{200}\\bg_white\\Large\\color{black}${encoded}`;
  await interaction.reply({ content: `${interaction.user.username} pidió:\n${expr}\n\n${url}` });
}

async function cmdSafebooru(interaction) {
  const tag = interaction.options.getString('tag');
  const url = `https://safebooru.org/index.php?page=dapi&s=post&q=index&tags=${encodeURIComponent(tag || '')}&limit=1&json=1`;
  try {
    const res = await fetch(url);
    /** @type {unknown} */
    const rawData = await res.json();
    /** @type {any[]} */
    const data = Array.isArray(rawData) ? rawData : [];
    if (!data.length) {return interaction.reply('🌿 No encontré nada con ese tag.');}
    const post = data[0];
    const imgUrl = `https://safebooru.org/images/${post.directory}/${post.image}`;
    await interaction.reply({ content: `${interaction.user.username} buscó: *${tag || 'random'}*\n${imgUrl}` });
  } catch (err) {
    logger.error({ err }, '[safebooru] Error');
    await interaction.reply('🌿 Algo falló buscando en Safebooru.');
  }
}

async function cmdPhrase(interaction) {
  const action = interaction.options.getString('action');
  const category = interaction.options.getString('categoria');
  const key = interaction.options.getString('clave');
  const value = interaction.options.getString('valor');
  if (action === 'get') {
    if (!category || !key) {return interaction.reply({ content: '❌ Faltan categoría y/o clave.', flags: MessageFlags.Ephemeral });}
    const phrase = await phraseManager.getPhrase(category, key);
    if (!phrase) {return interaction.reply({ content: `❌ No existe \`${category}.${key}\``, flags: MessageFlags.Ephemeral });}
    return interaction.reply({ content: `\`${category}.${key}\` = \`${phrase}\`` });
  }
  if (action === 'set') {
    if (!category || !key || !value) {return interaction.reply({ content: '❌ Faltan categoría, clave y/o valor.', flags: MessageFlags.Ephemeral });}
    await phraseManager.setPhrase(category, key, value);
    return interaction.reply({ content: `✅ \`${category}.${key}\` actualizado.` });
  }
  if (action === 'list') {
    const cat = await phraseManager.getCategory(category);
    if (!cat) {return interaction.reply({ content: `❌ Categoría \`${category}\` no existe.`, flags: MessageFlags.Ephemeral });}
    const keys = Object.keys(cat).slice(0, 25).join(', ');
    return interaction.reply({ content: `Categoría \`${category}\` (${Object.keys(cat).length} claves): ${keys}${Object.keys(cat).length > 25 ? '...' : ''}` });
  }
  await interaction.reply({ content: '❌ Acción inválida.', flags: MessageFlags.Ephemeral });
}

async function handleUtilityInteraction(sub, interaction) {
  switch (sub) {
    case 'help': await cmdHelp(interaction); break;
    case 'status': await cmdStatus(interaction); break;
    case 'hola': await interaction.reply(await phraseManager.getPhrase('fun', 'hola')); break;
    case 'japish': await interaction.reply(await phraseManager.getPhrase('fun', 'japish')); break;
    case 'goodgirl': await interaction.reply(await phraseManager.getPhrase('fun', 'goodgirl')); break;
    case 'avatar': await interaction.reply(interaction.client.user.displayAvatarURL({ size: 1024 })); break;
    case 'latex': await cmdLatex(interaction); break;
    case 'safebooru': await cmdSafebooru(interaction); break;
    case 'coinflip': await interaction.reply(await phraseManager.getPhrase('fun', 'coinflip')); break;
    case 'phrase': await cmdPhrase(interaction); break;
    case 'announcements': await cmdConfigAnnouncements(interaction); break;
    default: return false;
  }
  return true;
}

// Config handlers
/**
 * @param {ChatInputCommandInteraction & { guildId: string }} interaction
 */
async function cmdConfigAnnouncements(interaction) {
  /** @type {import("discord.js").GuildChannel | null} */
  const channel = interaction.options.getChannel('canal');
  if (!channel) {
    // Clear the announcement channel
    await dataStore.setAnnouncementChannelId(interaction.guildId, null);
    return interaction.reply({ content: '✅ Canal de anuncios de cumpleaños desactivado.', flags: MessageFlags.Ephemeral });
  }
  
  // Verify bot can send messages in the channel
  /** @type {import("discord.js").GuildChannel} */
  const guildChannel = channel;
  const perms = guildChannel.permissionsFor(interaction.client.user);
  if (!perms.has('SendMessages')) {
    return interaction.reply({ content: '❌ No tengo permisos para enviar mensajes en ese canal.', flags: MessageFlags.Ephemeral });
  }
  
  await dataStore.setAnnouncementChannelId(interaction.guildId, channel.id);
  return interaction.reply({ content: `✅ Canal de anuncios de cumpleaños configurado a ${channel}.`, flags: MessageFlags.Ephemeral });
}

export { handleUtilityInteraction, cmdConfigAnnouncements };

