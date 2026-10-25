import {
  handleFunUwu,
  handleFunShitpost,
  handleFunRoll,
  handleFunChoose,
  handleFun8ball,
} from '../commands/funCommands.js';

async function handleFunInteraction(sub, interaction) {
  switch (sub) {
    case 'uwu': await handleFunUwu(interaction); break;
    case 'shitpost': await handleFunShitpost(interaction); break;
    case 'roll': await handleFunRoll(interaction); break;
    case 'choose': await handleFunChoose(interaction); break;
    case '8ball': await handleFun8ball(interaction); break;
    default: return false;
  }
  return true;
}

export { handleFunInteraction };