import { SlashCommandBuilder } from 'discord.js';

export function stringOption(name, description, required = true, choices = null) {
  const opt = { name, description, required, type: 'string' };
  if (choices) opt.choices = choices;
  return opt;
}

export function integerOption(name, description, required = true, min = null, max = null) {
  const opt = { name, description, required, type: 'integer' };
  if (min !== null) opt.min = min;
  if (max !== null) opt.max = max;
  return opt;
}

export function userOption(name, description, required = false) {
  return { name, description, required, type: 'user' };
}

export function numberOption(name, description, required = true, min = null, max = null) {
  const opt = { name, description, required, type: 'number' };
  if (min !== null) opt.min = min;
  if (max !== null) opt.max = max;
  return opt;
}

export function booleanOption(name, description, required = false) {
  return { name, description, required, type: 'boolean' };
}

export function channelOption(name, description, required = false, types = null) {
  const opt = { name, description, required, type: 'channel' };
  if (types) opt.channelTypes = types;
  return opt;
}

export function roleOption(name, description, required = false) {
  return { name, description, required, type: 'role' };
}

export function buildSubcommand(name, description, options = []) {
  return (sub) => {
    sub.setName(name).setDescription(description);
    for (const opt of options) {
      if (opt.type === 'string') {
        sub.addStringOption((o) => {
          o.setName(opt.name).setDescription(opt.description).setRequired(opt.required ?? true);
          if (opt.choices) o.addChoices(...opt.choices);
          return o;
        });
      } else if (opt.type === 'integer') {
        sub.addIntegerOption((o) => {
          o.setName(opt.name).setDescription(opt.description).setRequired(opt.required ?? true);
          if (opt.min !== undefined) o.setMinValue(opt.min);
          if (opt.max !== undefined) o.setMaxValue(opt.max);
          return o;
        });
      } else if (opt.type === 'user') {
        sub.addUserOption((o) => o.setName(opt.name).setDescription(opt.description).setRequired(opt.required ?? false));
      } else if (opt.type === 'number') {
        sub.addNumberOption((o) => {
          o.setName(opt.name).setDescription(opt.description).setRequired(opt.required ?? true);
          if (opt.min !== undefined) o.setMinValue(opt.min);
          if (opt.max !== undefined) o.setMaxValue(opt.max);
          return o;
        });
      } else if (opt.type === 'boolean') {
        sub.addBooleanOption((o) => o.setName(opt.name).setDescription(opt.description).setRequired(opt.required ?? false));
      } else if (opt.type === 'channel') {
        sub.addChannelOption((o) => {
          o.setName(opt.name).setDescription(opt.description).setRequired(opt.required ?? false);
          if (opt.channelTypes) o.addChannelTypes(...opt.channelTypes);
          return o;
        });
      } else if (opt.type === 'role') {
        sub.addRoleOption((o) => o.setName(opt.name).setDescription(opt.description).setRequired(opt.required ?? false));
      }
    }
    return sub;
  };
}

export function buildSubcommandGroup(name, description, subcommands = []) {
  return (group) => {
    group.setName(name).setDescription(description);
    for (const subcmd of subcommands) {
      group.addSubcommand(subcmd);
    }
    return group;
  };
}

export const commonOptions = {
  musicUrl: () => ({ type: 'string', ...stringOption('url', 'URL o búsqueda', true) }),
  musicPlaylistUrl: () => ({ type: 'string', ...stringOption('url', 'URL de la playlist', true) }),
  musicTitle: () => ({ type: 'string', ...stringOption('title', 'Título a buscar', true) }),
  musicPlace: () => ({ type: 'string', ...stringOption('place', 'Dónde buscar', true, [
    { name: 'YouTube', value: 'youtube' },
    { name: 'SoundCloud', value: 'soundcloud' },
    { name: 'Bandcamp', value: 'bandcamp' },
  ]) }),
  musicQuery: () => ({ type: 'string', ...stringOption('query', 'Término de búsqueda', true) }),
  
  reminderTime: () => ({ type: 'string', ...stringOption('tiempo', 'Cuándo (ej: 10m, 1h, 2024-12-25 15:30)', true) }),
  reminderText: () => ({ type: 'string', ...stringOption('texto', 'De qué te aviso', true) }),
  reminderId: () => ({ type: 'string', ...stringOption('id', 'ID del recordatorio', true) }),
  reminderRepeat: () => ({ type: 'string', ...stringOption('repetir', 'Repetir (diario, semanal, mensual, personalizado)', false, [
    { name: 'Diario', value: 'daily' },
    { name: 'Semanal', value: 'weekly' },
    { name: 'Mensual', value: 'monthly' },
    { name: 'Personalizado (cron)', value: 'custom' },
  ]) }),
  reminderCron: () => ({ type: 'string', ...stringOption('cron', 'Expresión cron (ej: 0 9 * * 1-5)', false) }),
  
  birthdayDate: () => ({ type: 'string', ...stringOption('fecha', 'Fecha (DD/MM o DD/MM/YYYY)', true) }),
  birthdayUser: () => ({ type: 'user', ...userOption('usuario', 'Usuario (por defecto vos)', false) }),
  birthdayTimezone: () => ({ type: 'string', ...stringOption('timezone', 'Zona horaria (ej: America/Argentina/Buenos_Aires)', false) }),
  birthdayId: () => ({ type: 'string', ...stringOption('id', 'ID del cumpleaños', true) }),
  birthdayList: () => ({ type: 'user', ...userOption('usuario', 'Usuario a ver (por defecto el servidor)', false) }),
  
  configKey: () => ({ type: 'string', ...stringOption('clave', 'Clave de configuración', true, [
    { name: 'Prefix', value: 'prefix' },
    { name: 'Language', value: 'language' },
    { name: 'Timezone', value: 'timezone' },
    { name: 'Welcome Channel', value: 'welcomeChannel' },
    { name: 'Leave Channel', value: 'leaveChannel' },
    { name: 'DJ Role', value: 'djRole' },
    { name: 'Volume', value: 'volume' },
    { name: 'Auto-play', value: 'autoplay' },
    { name: 'Music Quality', value: 'musicQuality' },
    { name: 'Announcement Channel', value: 'announcementChannel' },
  ]) }),
  configValue: () => ({ type: 'string', ...stringOption('valor', 'Nuevo valor', true) }),
  
  diceSides: () => ({ type: 'integer', ...integerOption('caras', 'Número de caras', false, 2, 100) }),
  diceRolls: () => ({ type: 'integer', ...integerOption('tiradas', 'Cuántas veces tirar', false, 1, 20) }),
  chooseOptions: () => ({ type: 'string', ...stringOption('opciones', 'Opciones separadas por comas', true) }),
  eightBallQuestion: () => ({ type: 'string', ...stringOption('pregunta', 'Tu pregunta', true) }),
  
  leavesUser: () => ({ type: 'user', ...userOption('usuario', 'Usuario (por defecto vos)', false) }),
  gambleText: () => ({ type: 'string', ...stringOption('texto', 'Formato: enunciado | opcion1 | opcion2 | ...', true) }),
  betId: () => ({ type: 'string', ...stringOption('id', 'ID de la apuesta', true) }),
  betChoice: () => ({ type: 'integer', ...integerOption('opcion', 'Número de opción (1-10)', true, 1, 10) }),
  betAmount: () => ({ type: 'integer', ...integerOption('cantidad', 'Cantidad de hojas a apostar', true, 1, 10000) }),
  redeemId: () => ({ type: 'string', ...stringOption('id', 'ID de la apuesta', true) }),
  redeemChoice: () => ({ type: 'integer', ...integerOption('opcion', 'Opción ganadora (1-10)', true, 1, 10) }),
  
  queryText: () => ({ type: 'string', ...stringOption('texto', 'Texto a procesar', true) }),
  latexExpr: () => ({ type: 'string', ...stringOption('expresión', 'Expresión LaTeX', true) }),
  avatarUser: () => ({ type: 'user', ...userOption('usuario', 'Usuario (por defecto vos)', false) }),
  serverIcon: () => ({ type: 'boolean', ...booleanOption('servidor', 'Mostrar icono del servidor', false) }),
  serverBanner: () => ({ type: 'boolean', ...booleanOption('servidor', 'Mostrar banner del servidor', false) }),
  userId: () => ({ type: 'string', ...stringOption('userid', 'ID de usuario', true) }),
  userTag: () => ({ type: 'user', ...userOption('usuario', 'Usuario', false) }),
  
  volumeLevel: () => ({ type: 'integer', ...integerOption('volumen', 'Volumen (0-200)', true, 0, 200) }),
  seekPosition: () => ({ type: 'string', ...stringOption('posicion', 'Posición (ej: 1:30, 90s, 10%)', true) }),
  loopMode: () => ({ type: 'string', ...stringOption('modo', 'Modo de repetición', true, [
    { name: 'Desactivado', value: 'off' },
    { name: 'Canción', value: 'track' },
    { name: 'Cola', value: 'queue' },
    { name: 'Autoplay', value: 'autoplay' },
  ]) }),
  skipAmount: () => ({ type: 'integer', ...integerOption('cantidad', 'Cuántas saltar (default 1)', false, 1, 100) }),
  clearConfirm: () => ({ type: 'boolean', ...booleanOption('confirmar', 'Confirmar limpieza', false) }),
  shuffleConfirm: () => ({ type: 'boolean', ...booleanOption('confirmar', 'Confirmar aleatorizado', false) }),
  moveFrom: () => ({ type: 'integer', ...integerOption('desde', 'Posición origen (1-based)', true, 1) }),
  moveTo: () => ({ type: 'integer', ...integerOption('hasta', 'Posición destino (1-based)', true, 1) }),
  removePosition: () => ({ type: 'integer', ...integerOption('posicion', 'Posición a eliminar (1-based)', true, 1) }),
  filterName: () => ({ type: 'string', ...stringOption('filtro', 'Filtro de audio', true, [
    { name: 'Ninguno', value: 'none' },
    { name: 'Bass Boost', value: 'bassboost' },
    { name: 'Nightcore', value: 'nightcore' },
    { name: 'Vaporwave', value: 'vaporwave' },
    { name: '8D Audio', value: '8d' },
    { name: 'Karaoke', value: 'karaoke' },
    { name: 'Tremolo', value: 'tremolo' },
    { name: 'Vibrato', value: 'vibrato' },
    { name: 'Reverse', value: 'reverse' },
  ]) }),
userId: () => ({ type: 'string', ...stringOption('userid', 'ID de usuario', true) }),
  userTag: () => ({ type: 'user', ...userOption('usuario', 'Usuario', false) }),
  
  volumeLevel: () => ({ type: 'integer', ...integerOption('volumen', 'Volumen (0-200)', true, 0, 200) }),
  seekPosition: () => ({ type: 'string', ...stringOption('posicion', 'Posición (ej: 1:30, 90s, 10%)', true) }),
  loopMode: () => stringOption('modo', 'Modo de repetición', true, [
    { name: 'Desactivado', value: 'off' },
    { name: 'Canción', value: 'track' },
    { name: 'Cola', value: 'queue' },
    { name: 'Autoplay', value: 'autoplay' },
  ]),
  skipAmount: () => integerOption('cantidad', 'Cuántas saltar (default 1)', false, 1, 100),
  clearConfirm: () => booleanOption('confirmar', 'Confirmar limpieza', false),
  shuffleConfirm: () => booleanOption('confirmar', 'Confirmar aleatorizado', false),
  moveFrom: () => integerOption('desde', 'Posición origen (1-based)', true, 1),
  moveTo: () => integerOption('hasta', 'Posición destino (1-based)', true, 1),
  removePosition: () => integerOption('posicion', 'Posición a eliminar (1-based)', true, 1),
  filterName: () => stringOption('filtro', 'Filtro de audio', true, [
    { name: 'Ninguno', value: 'none' },
    { name: 'Bass Boost', value: 'bassboost' },
    { name: 'Nightcore', value: 'nightcore' },
    { name: 'Vaporwave', value: 'vaporwave' },
    { name: '8D Audio', value: '8d' },
    { name: 'Karaoke', value: 'karaoke' },
    { name: 'Tremolo', value: 'tremolo' },
    { name: 'Vibrato', value: 'vibrato' },
    { name: 'Reverse', value: 'reverse' },
  ]),
};

export function buildBpCommand() {
  const cmd = new SlashCommandBuilder()
    .setName('bp')
    .setDescription('BottedPlant — música, recordatorios y diversión');

  cmd.addSubcommandGroup(buildSubcommandGroup('music', 'Comandos de música', [
    buildSubcommand('play', 'Reproducir audio (YouTube, SoundCloud, Bandcamp, radio)', [
      { type: 'string', ...commonOptions.musicUrl() },
    ]),
    buildSubcommand('playlist', 'Agregar una playlist completa a la cola', [
      { type: 'string', ...commonOptions.musicPlaylistUrl() },
    ]),
    buildSubcommand('query', 'Buscar un título en YouTube, SoundCloud o Bandcamp y reproducirlo', [
      { type: 'string', ...commonOptions.musicPlace() },
      { type: 'string', ...commonOptions.musicTitle() },
    ]),
    buildSubcommand('search', 'Buscar y elegir de una lista', [
      { type: 'string', ...commonOptions.musicQuery() },
    ]),
    buildSubcommand('queue', 'Ver la cola de reproducción', []),
    buildSubcommand('nowplaying', 'Ver qué se está reproduciendo', []),
    buildSubcommand('pause', 'Pausar la reproducción', []),
    buildSubcommand('resume', 'Reanudar la reproducción', []),
    buildSubcommand('skip', 'Saltar la canción actual', [
      { type: 'integer', ...commonOptions.skipAmount() },
    ]),
    buildSubcommand('stop', 'Detener y limpiar la cola', []),
    buildSubcommand('leave', 'Salir del canal de voz', []),
    buildSubcommand('volume', 'Cambiar el volumen', [
      { type: 'integer', ...commonOptions.volumeLevel() },
    ]),
    buildSubcommand('seek', 'Avanzar/retroceder en la canción', [
      { type: 'string', ...commonOptions.seekPosition() },
    ]),
    buildSubcommand('loop', 'Configurar repetición', [
      { type: 'string', ...commonOptions.loopMode() },
    ]),
    buildSubcommand('clear', 'Limpiar la cola', [
      { type: 'boolean', ...commonOptions.clearConfirm() },
    ]),
    buildSubcommand('shuffle', 'Aleatorizar la cola', [
      { type: 'boolean', ...commonOptions.shuffleConfirm() },
    ]),
    buildSubcommand('move', 'Mover canción en la cola', [
      { type: 'integer', ...commonOptions.moveFrom() },
      { type: 'integer', ...commonOptions.moveTo() },
    ]),
    buildSubcommand('remove', 'Eliminar canción de la cola', [
      { type: 'integer', ...commonOptions.removePosition() },
    ]),
    buildSubcommand('filter', 'Aplicar filtro de audio', [
      { type: 'string', ...commonOptions.filterName() },
    ]),
    buildSubcommand('lyrics', 'Obtener letra de la canción actual', []),
    buildSubcommand('radio', 'Reproducir radio', [
      { type: 'string', ...commonOptions.musicUrl() },
    ]),
  ]));

  cmd.addSubcommandGroup(buildSubcommandGroup('remember', 'Recordatorios', [
    buildSubcommand('add', 'Agregar un recordatorio', [
      { type: 'string', ...commonOptions.reminderTime() },
      { type: 'string', ...commonOptions.reminderText() },
      { type: 'string', ...commonOptions.reminderRepeat() },
      { type: 'string', ...commonOptions.reminderCron() },
    ]),
    buildSubcommand('list', 'Listar tus recordatorios', []),
    buildSubcommand('remove', 'Eliminar un recordatorio', [
      { type: 'string', ...commonOptions.reminderId() },
    ]),
    buildSubcommand('clear', 'Limpiar todos tus recordatorios', []),
  ]));

  cmd.addSubcommandGroup(buildSubcommandGroup('birthday', 'Cumpleaños', [
    buildSubcommand('add', 'Agregar un cumpleaños', [
      { type: 'string', ...commonOptions.birthdayDate() },
      { type: 'user', ...commonOptions.birthdayUser() },
      { type: 'string', ...commonOptions.birthdayTimezone() },
    ]),
    buildSubcommand('remove', 'Eliminar un cumpleaños', [
      { type: 'string', ...commonOptions.birthdayId() },
    ]),
    buildSubcommand('list', 'Listar cumpleaños', [
      { type: 'user', ...commonOptions.birthdayList() },
    ]),
    buildSubcommand('next', 'Próximos cumpleaños', []),
    buildSubcommand('today', 'Cumpleaños de hoy', []),
  ]));

  cmd.addSubcommandGroup(buildSubcommandGroup('config', 'Configuración del bot', [
    buildSubcommand('set', 'Establecer una configuración', [
      { type: 'string', ...commonOptions.configKey() },
      { type: 'string', ...commonOptions.configValue() },
    ]),
    buildSubcommand('get', 'Ver una configuración', [
      { type: 'string', ...commonOptions.configKey() },
    ]),
    buildSubcommand('list', 'Ver todas las configuraciones', []),
    buildSubcommand('reset', 'Resetear configuración a defaults', [
      { type: 'string', ...commonOptions.configKey() },
    ]),
  ]));

  cmd.addSubcommandGroup(buildSubcommandGroup('fun', 'Diversión', [
    buildSubcommand('roll', 'Tirar dados', [
      { type: 'integer', ...commonOptions.diceSides() },
      { type: 'integer', ...commonOptions.diceRolls() },
    ]),
    buildSubcommand('choose', 'Elegir entre opciones', [
      { type: 'string', ...commonOptions.chooseOptions() },
    ]),
    buildSubcommand('8ball', 'Preguntarle a la bola mágica', [
      { type: 'string', ...commonOptions.eightBallQuestion() },
    ]),
  ]));

  cmd.addSubcommandGroup(buildSubcommandGroup('leaves', 'Sistema de hojas (economía)', [
    buildSubcommand('daily', 'Reclamar tus hojas diarias', []),
    buildSubcommand('points', 'Ver tus hojas', [
      { type: 'user', ...commonOptions.leavesUser() },
    ]),
    buildSubcommand('leaderboard', 'Ver el top de hojas del servidor', []),
    buildSubcommand('gamble', 'Crear una apuesta', [
      { type: 'string', ...commonOptions.gambleText() },
    ]),
    buildSubcommand('bet', 'Apostar en una apuesta', [
      { type: 'string', ...commonOptions.betId() },
      { type: 'integer', ...commonOptions.betChoice() },
      { type: 'integer', ...commonOptions.betAmount() },
    ]),
    buildSubcommand('redeem', 'Canjear una apuesta (creador/admin)', [
      { type: 'string', ...commonOptions.redeemId() },
      { type: 'integer', ...commonOptions.redeemChoice() },
    ]),
  ]));

  cmd.addSubcommandGroup(buildSubcommandGroup('utility', 'Utilidades', [
    buildSubcommand('query', 'Consultar info', [
      { type: 'string', ...commonOptions.queryText() },
    ]),
    buildSubcommand('latex', 'Renderizar LaTeX', [
      { type: 'string', ...commonOptions.latexExpr() },
    ]),
    buildSubcommand('avatar', 'Ver avatar', [
      { type: 'user', ...commonOptions.avatarUser() },
    ]),
    buildSubcommand('servericon', 'Ver icono del servidor', [
      { type: 'boolean', ...commonOptions.serverIcon() },
    ]),
    buildSubcommand('serverbanner', 'Ver banner del servidor', [
      { type: 'boolean', ...commonOptions.serverBanner() },
    ]),
    buildSubcommand('userid', 'Obtener ID de usuario', [
      { type: 'string', ...commonOptions.userId() },
      { type: 'user', ...commonOptions.userTag() },
    ]),
    buildSubcommand('serverid', 'Obtener ID del servidor', []),
    buildSubcommand('channelid', 'Obtener ID del canal', []),
    buildSubcommand('roleid', 'Obtener ID de rol', [
      { type: 'role', name: 'rol', description: 'Rol a consultar', required: true },
    ]),
    buildSubcommand('ping', 'Latencia del bot', []),
    buildSubcommand('uptime', 'Tiempo de actividad', []),
    buildSubcommand('invite', 'Enlace de invitación del bot', []),
    buildSubcommand('support', 'Enlace de soporte', []),
  ]));

  return cmd;
}

export default {
  buildBpCommand,
  buildSubcommand,
  buildSubcommandGroup,
  stringOption,
  integerOption,
  userOption,
  numberOption,
  booleanOption,
  channelOption,
  roleOption,
  commonOptions,
};