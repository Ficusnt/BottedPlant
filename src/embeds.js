const { EmbedBuilder } = require('discord.js');

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return 'En vivo';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function trackEmbed(song, title = '🎵 Canción') {
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
    .setDescription(`**[${song.name}](${song.url})**\n${song.uploader?.name || song.uploader || 'Autor desconocido'}\n\n*${reaction}*`)
    .addFields(
      { name: '⏱ Duración', value: formatDuration(song.duration), inline: true },
      { name: '🔊 Pedida por', value: `${song.member?.displayName || 'Alguien'}`, inline: true }
    )
    .setThumbnail(song.thumbnail || null)
    .setColor(0x57f287);
}

function playlistEmbed(playlist) {
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
      `**[${playlist.name}](${playlist.url})**\n> **${playlist.songs.length} canciones**\n\n*${reaction}*`
    )
    .addFields({ name: '🔊 Pedida por', value: `${playlist.member?.displayName || 'Alguien'}`, inline: true })
    .setColor(0x5865f2);
}

function queueEmbed(queue) {
  const tracks = queue.songs
    .slice(0, 10)
    .map((song, i) => {
      const pos = i === 0 ? '▶️' : `${i}.`;
      return `${pos} **[${song.name}](${song.url})** \`${formatDuration(song.duration)}\``;
    })
    .join('\n');

  const extra = queue.songs.length > 10 ? `\n... y **${queue.songs.length - 10}** más.` : '';
  
  const totalDuration = queue.songs.reduce((acc, s) => acc + (s.duration || 0), 0);
  const mood = queue.songs.length > 5 ? '¡La fiesta sigue! Mis hojas no paran de bailar. 🎉🍃' : queue.songs.length > 1 ? '¡Vamos! Esto crece como yo en verano. c: 🌱' : 'Solo una... ¡agregá más que soy planta de poca compañía! :o';

  return new EmbedBuilder()
    .setTitle('🎶 Cola de reproducción')
    .setDescription(tracks + extra + `\n\n*${mood}*`)
    .addFields(
      { name: '⏱ Duración total', value: formatDuration(totalDuration), inline: true },
      { name: '📝 Canciones', value: `${queue.songs.length}`, inline: true },
      { name: '🔁 Repetir', value: queue.repeatMode === 0 ? 'Off' : queue.repeatMode === 1 ? 'Canción' : 'Cola', inline: true }
    )
    .setColor(0xfee75c);
}

module.exports = {
  formatDuration,
  trackEmbed,
  playlistEmbed,
  queueEmbed,
};