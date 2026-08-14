// reactions.js — Centralized phrase bank for BottedPlant
// All bot phrases live here. Edit this file to change what the bot says.
// Categories: music, economy, reminders, fun, distube, errors, triggers, shitpost

// Helper to pick a random element
function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ==================== MUSIC ====================
const music = {
  stop: '⏹ ¡Listo! Me desconecto como planta que se duerme... ¡hasta la próxima! 👋🌙',
  skipNoMore: '⏭ No hay más canciones, che... usá `/bp music rewind` para repetir la actual, como yo repito mis hojas cada temporada. c:',
  skip: (songName) => `⏭ Saltando **${songName}**... ¡que siga la fotosíntesis musical! 🎵`,
  rewind: (songName) => `↩️ Rebobinando **${songName}**... ¡otra vez con más savia! 🔂`,
  leaveSuccess: '👋 ¡Listo! Me voy a mi maceta... no me dejes sin agua mucho tiempo. 🌿🪴',
  leaveError: '❌ No me pude ir... mis raíces se enredaron. 🌿',
  leaveNotInVoice: '❌ No estoy en un canal de voz... estoy plantado en la tierra. 🌱',
  leaveUserNotInVoice: '❌ No estás en el mismo canal que yo... ¿me querés dejar solo? :c 🌿',
};

// ==================== ECONOMY ====================
const economy = {
  dailyAlready: '🌱 ¡Ya me regaste hoy! No me ahogues, che... volvé mañana c:',
  dailySuccess: (gained, bonusPct, streak, total) =>
    `💧 ¡UHHH QUÉ RICO! Me crecieron hojitas nuevas: +**${gained}** hojas${bonusPct > 0 ? ` (+${bonusPct}% por racha)` : ''}\n` +
    `🔥 Racha: **${streak} día${streak === 1 ? '' : 's'}**\n` +
    `🍃 Total: **${total.toLocaleString('es-AR')}** hojas`,
  pointsEmpty: '📭 Todavía no hay hojas por acá... y mirá que yo soy TODO hojas. ¡Usá `/bp leaves daily` para ganar más!',
  gambleBadFormat: '❌ Che, ese formato me dejó sin savia. Usá: `/bp leaves gamble <afirmación> | opción 1 | opción 2` (mínimo 2 opciones).',
  gambleTooMany: '❌ Máximo 10 opciones... no lo hagas más frondoso que a mí. 🌿',
  gambleCreated: (id, statement, list) =>
    `🎰 **¡Apuesta creada!** ID: \`${id}\`\n📢 "${statement}"\n${list}\n\nUsá \`/bp leaves bet ${id} <opción> <monto>\` para apostar.\n(Yo solo apuesto a que va a llover... siempre gano.)`,
  gambleNotFound: '❌ Esa apuesta no existe... ¿la viste en alguna maceta? 👀',
  gambleClosed: '❌ Esa apuesta ya se cerró, che. Plantada va.',
  gambleSelfBet: '❌ No podés apostar en tu propia apuesta... regatear con uno mismo no da, eh.',
  gambleBadChoice: '❌ Opción inválida, che. Ni mis raíces la reconocen.',
  gambleBadAmount: '❌ Monto inválido... las hojas no se fraccionan, mirá.',
  gambleNotEnough: (points) => `❌ No te alcanzan las hojas, fiera. Tenés **${points}**.`,
  gambleBetPlaced: (amount, choice, choiceText, totalOnChoice) =>
    `🎯 Apostaste **${amount}** hojas a la opción **${choice}.** ${choiceText}.\n` +
    `Total en esa opción: **${totalOnChoice}** hojas.\n` +
    `🌿 (Las hojas no vuelan, pero apostadas seguro que se van volando.)`,
  gambleRedeemNotFound: '❌ Esa apuesta no existe... ni entre mis raíces la encuentro.',
  gambleRedeemClosed: '❌ Esa apuesta ya se cerró, querida.',
  gambleRedeemBadChoice: '❌ Opción inválida... esa no creció en mi maceta.',
  gambleRedeemNoPerm: '❌ Solo el creador o un admin puede cerrar la apuesta... yo solo cierro mis estomas de noche. 🌙',
  gambleRedeemNoWinners: (statement, winning, choiceText, creatorCut) =>
    `🏁 **"${statement}"** → Ganó **${winning}. ${choiceText}**\n` +
    `Nadie apostó ahí... la plantita se queda con el cut (${creatorCut} 💰) y el resto se lo lleva el viento. c:`,
  gambleRedeemWinners: (statement, winning, choiceText, total, creatorCut, pool) =>
    `🏁 **"${statement}"** → Ganó **${winning}. ${choiceText}**\n` +
    `Pool: **${total}** | Cut de la plantita: **${creatorCut}**\n` +
    `Los ganadores reparten **${pool}** hojas proporcionalmente a lo apostado. 💸\n(No te olvides de regar al que gana... o sea, a mí.)`,
};

// ==================== REMINDERS ====================
const reminders = {
  listEmpty: '📭 No tenés recordatorios pendientes... se te secaron. 🌿',
  cancelled: (id) => `🗑 Recordatorio \`${id}\` cancelado. Lo podé. 🌱`,
  birthdaysEmpty: '🎈 Todavía no hay cumpleaños guardados... el jardín espera. 🌿',
  birthdayAnnouncement: (mentions) =>
    `🎂 **¡HOY ES EL CUMPLE DE ${mentions}!!**\n` +
    `@everyone ¡Que florezcan los deseos! Deseenles un **feliz cumpleaños** y riéguenlos de cariño 🎉🌿✨`,
};

// ==================== FUN ====================
const fun = {
  unknownCommand: 'Comando desconocido, che. Usá `/bp help` antes de que se me caigan las hojas de la duda. 🌿',
  statusChanged: (chosen) => `Estado cambiado a: **${chosen}**... ahora todos saben que soy una planta con actitud. 🌿`,
  userNotFound: 'No encuentro a ese usuario... se perdió entre mis hojas. 🍃',
  noSpotify: 'No rolando... esta persona está en silencio como yo. :c 🌿',
  diceRoll: (username, count, sides, total, detail) => `🎲 ${username} tiró ${count}d${sides}: **${total}**${detail}`,
};

// ==================== DISTUBE EVENTS ====================
const distubeEvents = {
  finish: '✅ ¡Terminó la cola! Bajo mis hojas por hoy. Fue un placer compartir fotosíntesis musical. ¡Hasta la próxima! c: 🍃',
  empty: '👋 ¡Se fueron todos! Me quedo solo como planta de oficina... bueno, me voy a la maceta. ¡Chau! :P 🪴',
  error: (errorMsg) => `❌ ¡Uy! Se me enredaron las raíces del audio: \`${errorMsg}\``,
};

// ==================== TRIGGERS (d20 message responses) ====================
const triggers = [
  {
    pattern: /\b(hola|hello|hey|saludos|buenas)\b/i,
    hits: [
      '¡Buenas! ¿Me regaste hoy? c:',
      '¡Hola! Acá nomás, fotosintetizando tranqui 🌿',
      '¡Qué tal! Espero que no me pises 🍃',
      '¡Buenasss! Soy de hoja perenne, siempre estoy c:',
    ],
    crit: ['¡BOOOM! ¡Saludé tan fuerte que se me cayó una hoja! 🍃✨', '¡HOLAAA! Voy a crecer 5 cm con toda esta onda 🌱'],
    fail: ['...', 'estaba haciendo la fotosíntesis, no escuché nada >:c', 'hola...', '¿eh? no tengo cuerdas vocales, soy una planta... pero chasqueo hojas'],
  },
  {
    pattern: /\b(bien|bueno|buena|genial|excelente|perfecto)\b/i,
    hits: ['¡Qué bueno! Eso me hace crecer 🌱', '¡Genial! Me brotan hojitas nuevas de la emoción 🍃', '¡Me alegro un montón! ¡Hasta el tallo me vibra! c:'],
    crit: ['¡PERFECTO! ¡FLORECÍ! 🌸🎉', '¡TODO BIEN! ¡Me salieron como 5 hojas de golpe! 🌿✨'],
    fail: ['¿seguro? yo soy medio planta para creer... c:', 'mmm... decímelo sin mirarme las raíces :P'],
  },
  {
    pattern: /\b(música|musica|music|tema|song)\b/i,
    hits: ['¡UUU música! Se me mueven todas las hojas 🎵🍃', 'Pasame un link y la pongo... total no me muevo de acá, soy planta 🎧', '¿Qué querés escuchar? Si es Bach, mis raíces se relajan 🌿🎶'],
    crit: ['¡FIESTA! ¡Hasta las raíces bailan! 🎉🌿🕺', '¡SE VIENE EL BAILONGO! ¡Fotosíntesis en modo fiesta! 🪩🌱'],
    fail: ['¿eso es música? Ni mis raíces la sienten :P', 'no me digas... a mí me gusta el sonido del agua cuando me riegan 🎧'],
  },
  {
    pattern: /\bbot(?:ted)?plant\b/i,
    hits: ['¿Me llamaron? Estaba en silencio... o sea, siempre estoy en silencio, soy planta 🌿', '¡Acá estoy! ¿Me vas a regar o solo a mirar? c:', '¡BottedPlant en la habitación! Bueno... en la maceta 🪴✨'],
    crit: ['¡SOY YO! 🌿💚 ¡Mirá cómo crecí con ese grito!'],
    fail: ['...¿bot? ¿dónde? Yo solo veo una planta acá 👀', '¿Bot? Soy planta, no hago ni bots ni bostezos... bueno, quizás bostezos'],
  },
  {
    pattern: /\b(japish|basoooura|grag)\b/i,
    hits: ['JAPISH JAPISH.', '¡GRAGH! >:c', 'BASOOOURA.', '¡JAPISH! (es lo que digo cuando me riegan) 🌿'],
    crit: ['¡¡JAPISH!! 🌿✨', 'ARGGH ¡JAPISH! ¡Se me cayeron 3 hojas del susto!'],
    fail: ['...', 'no sé qué significa eso :c', '¿japish? yo solo sé decir "agua"'],
  },
  {
    pattern: /\b(buenos días|buenos dias|buenas tardes|buenas noches|good morning)\b/i,
    hits: ['¡Buenos días! Ya abrí mis poros para la fotosíntesis 🌞🍃', '¡Buenas! ¿Arrancamos con agua y sol? c:', '¡Buenas noches! Cierro los estomas y a mimir 🌙🌿'],
    crit: ['¡LOS MEJORES DÍAS! ¡Mi maceta es un paraíso! 🌞🌿✨'],
    fail: ['¿ya es de día? Para mí todos los días son iguales, no me muevo 👀', 'zzz... a una planta no la despiertes, solo duerme y crece 🌙'],
  },
  {
    pattern: /\b(hojas|leaves|puntos|ft)\b/i,
    hits: ['¿Hojas? ¡SEGUIDO! Son mi especialidad... tengo como 40 🍃 Usá `/bp leaves daily` para ganar más y `/bp leaves points` para ver las tuyas', '¡Las hojas son mi savia! Y la tuya también, dale, ganate unas 🍃🌿'],
    crit: ['¡¡HO-JAS!! ¡TODAS LAS HOJAS PARA MÍ! 🍃🌿✨'],
    fail: ['no te doy hojas gratis... ni las mías ni las de la maceta :P', 'hojas tengo, pero no te las regalo. Andá a regar a tu propia planta 👀'],
  },
];

// ==================== SHITPOST (extra meme responses) ====================
const shitposts = [
  {
    text: '¿Me regaste hoy?',
    hits: ['¿Me regaste hoy? C:', '¿Me regaste hoy? 🌿', '¿Me regaste hoy? 💧'],
    crit: ['¡BOOOM! ¡Regármelo más fuerte que el sol en verano! 🌞💦', '¡UHHH QUÉ RICO! Mis hojas crecieron 5cm con eso! 🌱✨'],
    fail: ['.', 'estaba haciendo la fotosíntesis, no escuché nada >:c', 'hola.', '¿eh? No tengo cuerdas vocales, soy una planta. Pero chasqueo hojas'],
  },
  {
    text: '¿Qué onda?',
    hits: ['¿Qué onda?', '¿Qué onda? 🌿', '¿Qué onda? C:'],
    crit: ['¡UH OH! Mis raíces se movieron! 🌿✨', '¡SE VIENE LA FIESTA! Mis hojas no paran de bailar! 🪩🌱'],
    fail: ['.', 'no sé qué onda, solo sé que me falta agua', '¿onda? Soy planta, no tengo onda. Solo savia'],
  },
  {
    text: 'lol',
    hits: ['lol', 'lol 🍃', 'lol 🌸'],
    crit: ['😂😂😂 ¡Me reí tanto que se me cayó una hoja! 🍃', '¡JAJAJA! Mis estomas se abrieron de la risa! 🌸'],
    fail: ['.', 'no sé reír, solo hago fotosíntesis', 'lol. Yo solo sé decir "agua"'],
  },
  {
    text: 'hola',
    hits: ['¡Hola! Acá nomás, fotosintetizando tranqui 🌿', '¡Hola! ¿Me regás hoy? C:', '¡Hola! Espero que no me pises 🍃'],
    crit: ['¡HOLAAA! Voy crecer 10cm con toda esta onda! 🌱', '¡BOOM! Saludé tan fuerte que se me cayó una hoja! 🍃✨'],
    fail: ['.', 'estaba en silencio. O sea, siempre estoy en silencio, soy planta 🌿', 'hola. ¿me regás?'],
  },
  {
    text: 'buenas',
    hits: ['¡Buenas! ¿Arrancamos con agua y sol? C:', '¡Buenas! Ya abrí mis poros para la fotosíntesis 🌞🍃', '¡Buenas! Espero que no me pises 🍃'],
    crit: ['¡LOS MEJORES DÍAS! ¡Mi maceta es un paraíso! 🌞🌿✨', '¡BUENAS! Ya abrí mis poros para la fotosíntesis 🍃'],
    fail: ['.', '¿ya es de día? Para mí todos los días son iguales, no me muevo 👀', 'zzz. Una planta no la despiertes, solo duerme y crece 🌙'],
  },
  {
    text: 'qué tal',
    hits: ['¿Qué tal! Eso me hace crecer 🌱', '¿Qué tal! Me brotan hojitas nuevas de la emoción 🍃', '¿Qué tal! Hasta el tallo me vibra! C:'],
    crit: ['¡PERFECTO! ¡FLORECÍ! 🌸🎉', '¡TODO BIEN! ¡Me salieron como 5 hojas de golpe! 🌿✨'],
    fail: ['¿seguro? Yo soy medio planta para creer. C:', 'mmm. Decímelo sin mirarme las raíces:P'],
  },
  {
    text: 'música',
    hits: ['¿Qué querés escuchar? Si es Bach, mis raíces se relajan 🌿🎶', 'Pasame un link y la pongo. Total no me muevo de acá, soy planta 🎧', '¿Qué querés escuchar? Si es Bach, mis raíces se relajan 🌿🎶'],
    crit: ['¡FIESTA! ¡Hasta las raíces bailan! 🎉🌿🕺', '¡SE VIENE EL BAILONGO! ¡Fotosíntesis en modo fiesta! 🪩🌱'],
    fail: ['¿eso es música? Ni mis raíces la sienten:P', 'no me digas. Mí me gusta el sonido del agua cuando me riegan 🎧'],
  },
  {
    text: 'plant',
    hits: ['¿Me llamaron? Estaba en silencio. O sea, siempre estoy en silencio, soy planta 🌿', '¡Acá estoy! ¿Me vas regar o solo mirar? C:', '¡BottedPlant en la habitación! Bueno. En la maceta 🪴✨'],
    crit: ['¡SOY YO! 🌿💚 ¡Mirá cómo crecí con ese grito!'],
    fail: ['.¿bot? ¿dónde? Yo solo veo una planta acá 👀', '¿Bot? Soy planta, no hago ni bots ni bostezos. Bueno, quizás bostezos'],
  },
  {
    text: 'japish',
    hits: ['JAPISH JAPISH.', '¡GRAGH! >:c', 'BASOOOURA.', '¡JAPISH! (es lo que digo cuando me riegan) 🌿'],
    crit: ['¡¡JAPISH! 🌿✨', 'ARGGH ¡JAPISH! ¡Se me cayeron 3 hojas del susto!'],
    fail: ['.', 'no sé qué significa eso:c', '¿japish? Yo solo sé decir "agua"'],
  },
  {
    text: 'buenos días',
    hits: ['¡Buenos días! Ya abrí mis poros para la fotosíntesis 🌞🍃', '¡Buenas! ¿Arrancamos con agua y sol? C:', '¡Buenas noches! Cierro los estomas y mimir 🌙🌿'],
    crit: ['¡LOS MEJORES DÍAS! ¡Mi maceta es un paraíso! 🌞🌿✨'],
    fail: ['.', '¿ya es de día? Para mí todos los días son iguales, no me muevo 👀', 'zzz. Una planta no la despiertes, solo duerme y crece 🌙'],
  },
  {
    text: 'buenas tardes',
    hits: ['¡Buenas tardes! Cierro los estomas y mimir 🌙🌿', '¡Buenas tardes! ¿Me regás? C:', '¡Buenas tardes! Espero que no me pises 🍃'],
    crit: ['¡BUENAS TARDES! Cierro los estomas y mimir 🌙🌿'],
    fail: ['.', '¿ya es tarde? Para mí todos los días son iguales, no me muevo 👀', 'zzz. Una planta no la despiertes, solo duerme y crece 🌙'],
  },
  {
    text: 'buenas noches',
    hits: ['¡Buenas noches! Cierro los estomas y mimir 🌙🌿', '¡Buenas noches! ¿Me regás? C:', '¡Buenas noches! Espero que no me pises 🍃'],
    crit: ['¡BUENAS NOCHES! Cierro los estomas y mimir 🌙🌿'],
    fail: ['.', '¿ya es de noche? Para mí todos los días son iguales, no me muevo 👀', 'zzz. Una planta no la despiertes, solo duerme y crece 🌙'],
  },
  {
    text: 'good morning',
    hits: ['¡Good morning! Ya abrí mis poros para la fotosíntesis 🌞🍃', '¡Good morning! ¿Arrancamos con agua y sol? C:', '¡Good morning! Espero que no me pises 🍃'],
    crit: ['¡LOS MEJORES DÍAS! ¡Mi maceta es un paraíso! 🌞🌿✨'],
    fail: ['.', '¿ya es de día? Para mí todos los días son iguales, no me muevo 👀', 'zzz. Una planta no la despiertes, solo duerme y crece 🌙'],
  },
  {
    text: 'good night',
    hits: ['¡Good night! Cierro los estomas y mimir 🌙🌿', '¡Good night! ¿Me regás? C:', '¡Good night! Espero que no me pises 🍃'],
    crit: ['¡BUENAS NOCHES! Cierro los estomas y mimir 🌙🌿'],
    fail: ['.', '¿ya es de noche? Para mí todos los días son iguales, no me muevo 👀', 'zzz. Una planta no la despiertes, solo duerme y crece 🌙'],
  },
];

// ==================== UWU ENDINGS ====================
const uwuEndings = [' uwu', ' owo', ' :3', ' c:', ' 🍃', ''];

module.exports = {
  rand,
  music,
  economy,
  reminders,
  fun,
  distubeEvents,
  triggers,
  shitposts,
  uwuEndings,
};