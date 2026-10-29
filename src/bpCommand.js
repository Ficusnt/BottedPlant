import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } from 'discord.js';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import * as dataStore from './dataStore.js';
import { queueEmbed, formatDuration } from './embeds.js';
import { cmdLeave } from './cmdLeave.js';
import * as phraseManager from './phraseManager.js';
import config from './config.js';

// Import handler modules
import { handleMusicInteraction } from './handlers/musicHandler.js';
import { handleFunInteraction } from './handlers/funHandler.js';
import { handleEconomyInteraction } from './handlers/economyHandler.js';
import { handleReminderInteraction } from './handlers/reminderHandler.js';
import { handleUtilityInteraction } from './handlers/utilityHandler.js';
import { handleQuerySelect } from './commands/musicCommands.js';

import { handleMessage } from './handlers/messageHandler.js';
import { logger } from './logger.js';
import { buildBpCommand } from './commands/commandFactory.js';

const execFileAsync = promisify(execFile);

// ---------------- Command definition ----------------

function bpCommandData() {
  return buildBpCommand();
}
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
      logger.info('Slash commands registered globally (fallback).');
    } catch (err) {
      logger.error({ err }, 'Error registering global commands');
    }
    return;
  }

  for (const guild of guilds) {
    try {
      await guild.commands.set([data]);
      logger.info({ guild: guild.name }, 'Registered /bp');
    } catch (err) {
      logger.error({ err, guild: guild.name }, 'Error registering commands');
    }
  }
}

// ---------------- Dispatcher ----------------

// Wraps any interaction handler so a thrown error can never crash the bot.
async function handleInteractionSafely(fn, interaction) {
  try {
    await fn();
  } catch (err) {
    logger.error({ err }, '[bp] Error handling interaction');
    const msg = `❌ ¡Uy! Se me enredaron las raíces: \`${(err.message || String(err)).slice(0, 300)}\``;
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: msg }).catch(() => {});
      } else {
        await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    } catch (replyErr) {
      logger.error({ err: replyErr }, '[bp] Could not reply to failed interaction');
    }
  }
}

async function handleInteraction(interaction) {
  // 🎶 Selection from /bp query → play the chosen result directly
  if (interaction.isStringSelectMenu() && interaction.customId === 'bp-query-select') {
    return handleInteractionSafely(() => handleQuerySelect(interaction), interaction);
  }

  if (!interaction.isChatInputCommand()) {return;}
  if (interaction.commandName !== 'bp') {return;}

  const group = interaction.options.getSubcommandGroup();
  const sub = interaction.options.getSubcommand();

  await handleInteractionSafely(async () => {
    let handled = false;

    // Route to appropriate handler based on subcommand group
    if (group === 'music') {
      handled = await handleMusicInteraction(sub, interaction);
    } else if (group === 'fun') {
      handled = await handleFunInteraction(sub, interaction);
    } else if (group === 'leaves') {
      handled = await handleEconomyInteraction(sub, interaction);
    } else if (group === 'remember' || group === 'birthday') {
      handled = await handleReminderInteraction(group, sub, interaction);
    } else if (group === 'config') {
      handled = await handleUtilityInteraction(sub, interaction);
    }

    // If not handled by a group handler, try utility handler (standalone subcommands)
    if (!handled) {
      handled = await handleUtilityInteraction(sub, interaction);
    }

    // Unknown command
    if (!handled) {
      await interaction.reply(await phraseManager.getPhrase('fun', 'unknownCommand'));
    }
  }, interaction);
}

export { bpCommandData, registerSlashCommands, handleInteraction, handleInteraction as bpCommandExecute };