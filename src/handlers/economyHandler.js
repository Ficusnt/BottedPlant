import {
  handleLeavesDaily,
  handleLeavesPoints,
  handleLeavesLeaderboard,
  handleLeavesGamble,
  handleLeavesBet,
  handleLeavesRedeem,
} from '../commands/economyCommands.js';

async function handleEconomyInteraction(sub, interaction) {
  switch (sub) {
    case 'daily': await handleLeavesDaily(interaction); break;
    case 'points': await handleLeavesPoints(interaction); break;
    case 'leaderboard': await handleLeavesLeaderboard(interaction); break;
    case 'gamble': await handleLeavesGamble(interaction); break;
    case 'bet': await handleLeavesBet(interaction); break;
    case 'redeem': await handleLeavesRedeem(interaction); break;
    default: return false;
  }
  return true;
}

export { handleEconomyInteraction };