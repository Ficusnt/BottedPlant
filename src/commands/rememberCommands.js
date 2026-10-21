/**
 * rememberCommands.js - Reminder/birthday slash command handlers
 * Extracted from bpCommand.js for modularity
 */

const { EmbedBuilder, MessageFlags } = require('discord.js');
const dataStore = require('../dataStore');
const phraseManager = require('../phraseManager');

/**
 * Handle /bp remember add
 */
async function handleRememberAdd(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const text = interaction.options.getString('texto');
  const when = interaction.options.getString('cuando');
  const channel = interaction.options.getChannel('canal') || interaction.channel;

  if (!text || !when) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('reminders', 'addUsage')
    });
  }

  try {
    const id = await dataStore.addReminder(
      interaction.guildId,
      interaction.user.id,
      text,
      when,
      channel.id
    );
    return interaction.editReply(await phraseManager.getPhrase('reminders', 'addSuccess', 'hits', {
      id,
      when: new Date(when).toLocaleString('es-AR')
    }));
  } catch (error) {
    console.error('[Remember] Add error:', error);
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('reminders', 'addError')
    });
  }
}

/**
 * Handle /bp remember list
 */
async function handleRememberList(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const user = interaction.options.getUser('usuario') || interaction.user;
  const reminders = await dataStore.getReminders(interaction.guildId, user.id);

  if (!reminders || reminders.length === 0) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('reminders', 'listEmpty')
    });
  }

  const list = reminders.map((r, i) => 
    `**${i + 1}.** ${r.text} -- <t:${Math.floor(new Date(r.when).getTime() / 1000)}:R> (ID: ${r.id})`
  ).join('\n');

  return interaction.editReply({ 
    content: await phraseManager.getPhrase('reminders', 'listHeader', 'hits', {
      user: user.toString(),
      list
    })
  });
}

/**
 * Handle /bp remember cancel
 */
async function handleRememberCancel(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const id = interaction.options.getString('id');
  const success = await dataStore.cancelReminder(interaction.guildId, interaction.user.id, id);

  if (!success) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('reminders', 'cancelNotFound')
    });
  }

  return interaction.editReply(await phraseManager.getPhrase('reminders', 'cancelled', 'hits', { id }));
}

/**
 * Handle /bp birthday add
 */
async function handleBirthdayAdd(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const user = interaction.options.getUser('usuario');
  const date = interaction.options.getString('fecha');
  const channel = interaction.options.getChannel('canal') || interaction.channel;

  if (!user || !date) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('birthdays', 'addUsage')
    });
  }

  try {
    await dataStore.addBirthday(interaction.guildId, user.id, date, channel.id);
    return interaction.editReply(await phraseManager.getPhrase('birthdays', 'addSuccess', 'hits', {
      user: user.toString(),
      date
    }));
  } catch (error) {
    console.error('[Birthday] Add error:', error);
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('birthdays', 'addError')
    });
  }
}

/**
 * Handle /bp birthday list
 */
async function handleBirthdayList(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const birthdays = await dataStore.getBirthdays(interaction.guildId);

  if (!birthdays || birthdays.length === 0) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('birthdays', 'listEmpty')
    });
  }

  const list = birthdays.map((b, i) => 
    `**${i + 1}.** <@${b.userId}> -- ${b.date} (ID: ${b.id})`
  ).join('\n');

  return interaction.editReply({ 
    content: await phraseManager.getPhrase('birthdays', 'listHeader', 'hits', { list })
  });
}

/**
 * Handle /bp birthday remove
 */
async function handleBirthdayRemove(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const id = interaction.options.getString('id');
  const success = await dataStore.removeBirthday(interaction.guildId, id);

  if (!success) {
    return interaction.editReply({ 
      content: await phraseManager.getPhrase('birthdays', 'removeNotFound')
    });
  }

  return interaction.editReply(await phraseManager.getPhrase('birthdays', 'removed', 'hits', { id }));
}

module.exports = {
  handleRememberAdd,
  handleRememberList,
  handleRememberCancel,
  handleBirthdayAdd,
  handleBirthdayList,
  handleBirthdayRemove,
};
