import {
  handleMusicPlay,
  handleMusicPlaylist,
  handleMusicQuery,
  handleMusicSkip,
  handleMusicStop,
  handleMusicPause,
  handleMusicResume,
  handleMusicQueue,
  handleMusicNowPlaying,
  handleMusicVolume,
  handleMusicLoop,
  handleMusicShuffle,
  handleMusicRewind,
  handleMusicLeave,
} from '../commands/musicCommands.js';

async function handleMusicInteraction(sub, interaction) {
  switch (sub) {
    case 'play': await handleMusicPlay(interaction); break;
    case 'playlist': await handleMusicPlaylist(interaction); break;
    case 'query': await handleMusicQuery(interaction); break;
    case 'skip': await handleMusicSkip(interaction); break;
    case 'stop': await handleMusicStop(interaction); break;
    case 'pause': await handleMusicPause(interaction); break;
    case 'resume': await handleMusicResume(interaction); break;
    case 'queue': await handleMusicQueue(interaction); break;
    case 'nowplaying': await handleMusicNowPlaying(interaction); break;
    case 'volume': await handleMusicVolume(interaction); break;
    case 'loop': await handleMusicLoop(interaction); break;
    case 'shuffle': await handleMusicShuffle(interaction); break;
    case 'rewind': await handleMusicRewind(interaction); break;
    case 'leave': await handleMusicLeave(interaction); break;
    default: return false;
  }
  return true;
}

export { handleMusicInteraction };