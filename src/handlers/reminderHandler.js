import {
  handleRememberAdd,
  handleRememberList,
  handleRememberCancel,
  handleBirthdayAdd,
  handleBirthdayList,
  handleBirthdayRemove,
} from '../commands/rememberCommands.js';

async function handleReminderInteraction(group, sub, interaction) {
  // Remember subcommands are under 'remember' group
  if (group === 'remember') {
    switch (sub) {
      case 'add': await handleRememberAdd(interaction); break;
      case 'list': await handleRememberList(interaction); break;
      case 'cancel': await handleRememberCancel(interaction); break;
      default: return false;
    }
    return true;
  }

  // Birthday subcommands are under 'birthday' group
  if (group === 'birthday') {
    switch (sub) {
      case 'add': await handleBirthdayAdd(interaction); break;
      case 'list': await handleBirthdayList(interaction); break;
      case 'remove': await handleBirthdayRemove(interaction); break;
      default: return false;
    }
    return true;
  }

  return false;
}

export { handleReminderInteraction };