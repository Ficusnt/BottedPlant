import { EmbedBuilder } from 'discord.js';

export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return 'En vivo';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Parse duration string (e.g., "3:45" or "1:23:45") to seconds
 * @param {string} durationStr - Duration string
 * @returns {number} Duration in seconds
 */
export function parseDuration(durationStr) {
  if (!durationStr) return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

/**
 * Convert discord-player Track to embed-compatible format
 * @param {import('discord-player').Track} track - discord-player track
 * @returns {Object} Embed-compatible track object
 */
function toEmbedTrack(track) {
  return {
    name: track.title,
    url: track.url,
    uploader: { name: track.author || 'Desconocido' },
    duration: parseDuration(track.duration) || 0,
    thumbnail: track.thumbnail,
    member: track.requestedBy ? { displayName: track.requestedBy.displayName || track.requestedBy.username } : null,
  };
}

export function trackEmbed(track, title = '🎵 Canción') {
  const embedTrack = toEmbedTrack(track);
  const emotions = [
    '¡Qué temazo! Se me tiemblan las hojas. c: 🍃',
    '¡Suena! Esto riega mi alma vegetal. 🎧',
    '¡A gozar! Hasta las raíces se mueven. ✨',
    '¡Épico! Voy a crecer 10 cm con este tema. 🔥',
    '¡Dale dale! Si esto no me hace florecer, nada lo hará. 💃🌸',
  ];
  const reaction = emotions[Math.floor(Math.random() * emotions.length)];
  
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(`**[${embedTrack.name}](${embedTrack.url})**\n${embedTrack.uploader?.name || embedTrack.uploader || 'Autor desconocido'}\n\n*${reaction}*`)
    .addFields(
      { name: '⏱ Duración', value: formatDuration(embedTrack.duration), inline: true },
      { name: '🔊 Pedida por', value: `${embedTrack.member?.displayName || 'Alguien'}`, inline: true }
    )
    .setThumbnail(embedTrack.thumbnail || null)
    .setColor(0x57f287);
}

export function playlistEmbed(playlist) {
  const reactions = [
    '¡Se viene la fiesta! Mi maceta tiembla de emoción. 🎉🪴',
    '¡Pila de música! Más canciones que hojas en primavera. 🎧🍃',
    '¡Esto va a estar bueno! Hasta el pasto se pone contento. ✨🌱',
    '¡Sesión iniciada! Las raíces ya están en modo festejo. 🔥',
  ];
  const reaction = reactions[Math.floor(Math.random() * reactions.length)];
  
  return new EmbedBuilder()
    .setTitle('📃 Playlist añadida')
    .setDescription(
      `**[${playlist.title}](${playlist.url})**\n> **${playlist.tracks.length} canciones**\n\n*${reaction}*`
    )
    .addFields({ name: '🔊 Pedida por', value: `${playlist.requestedBy?.displayName || playlist.requestedBy?.user?.username || 'Alguien'}`, inline: true })
    .setColor(0x5865f2);
}

export function queueEmbed(queue, page = 1) {
  const tracksPerPage = 10;
  const start = (page - 1) * tracksPerPage;
  const end = start + tracksPerPage;
  const tracksToShow = queue.tracks.slice(start, end);
  
  const tracks = tracksToShow
    .map((track, i) => {
      const pos = (start + i) === 0 && queue.currentTrack ? '▶️' : `${start + i + 1}.`;
      return `${pos} **[${track.title}](${track.url})** \`${formatDuration(parseDuration(track.duration))}\``;
    })
    .join('\n');

  const extra = queue.tracks.length > end ? `\n... y **${queue.tracks.length - end}** más.` : '';
  
  const totalDuration = queue.tracks.reduce((acc, t) => acc + parseDuration(t.duration), 0);
  const mood = queue.tracks.length > 5 ? '¡La fiesta sigue! Mis hojas no paran de bailar. 🎉🍃' : queue.tracks.length > 1 ? '¡Vamos! Esto crece como yo en verano. c: 🌱' : 'Solo una... ¡agregá más que soy planta de poca compañía! :o';

  const repeatModeText = queue.repeatMode === 0 ? 'Off' : queue.repeatMode === 1 ? 'Canción' : queue.repeatMode === 2 ? 'Cola' : 'Autoplay';

  return new EmbedBuilder()
    .setTitle('🎶 Cola de reproducción')
    .setDescription(tracks + extra + `\n\n*${mood}*`)
    .addFields(
      { name: '⏱ Duración total', value: formatDuration(totalDuration), inline: true },
      { name: '📝 Canciones', value: `${queue.tracks.length}`, inline: true },
      { name: '🔁 Repetir', value: repeatModeText, inline: true }
    )
    .setColor(0xfee75c);
}