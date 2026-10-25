import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
const storeFile = path.join(dataDir, 'store.json');

let cache = null;
let saveQueue = Promise.resolve();

export async function ensureDataDir() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

export async function load() {
  if (cache) return cache;
  try {
    await ensureDataDir();
    try {
      const data = await fs.readFile(storeFile, 'utf8');
      cache = JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        cache = { reminders: {}, birthdays: {}, points: {}, gambles: {} };
        await save();
      } else {
        throw err;
      }
    }
    cache.reminders = cache.reminders || {};
    cache.birthdays = cache.birthdays || {};
    cache.points = cache.points || {};
    cache.gambles = cache.gambles || {};
    return cache;
  } catch (err) {
    logger.error({ err }, '[dataStore] Error loading store');
    cache = { reminders: {}, birthdays: {}, points: {}, gambles: {} };
    return cache;
  }
}

export async function save() {
  saveQueue = saveQueue.then(async () => {
    try {
      await ensureDataDir();
      await fs.writeFile(storeFile, JSON.stringify(cache, null, 2), 'utf8');
    } catch (err) {
      logger.error({ err }, '[dataStore] Error saving store');
    }
  });
  return saveQueue;
}

export async function getReminders() {
  const store = await load();
  return store.reminders;
}

/**
 * @param {string} guildId
 * @param {string} userId
 * @returns {Promise<Array<Object>>}
 */
export async function getRemindersForUser(guildId, userId) {
  const store = await load();
  return Object.values(store.reminders).filter(r => r.guildId === guildId && r.userId === userId);
}

/**
 * @param {string} guildId
 * @param {string} userId
 * @param {string} text
 * @param {string} when
 * @param {string} channelId
 * @returns {Promise<string>}
 */
export async function addReminderForUser(guildId, userId, text, when, channelId) {
  const store = await load();
  const id = `${guildId}-${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  store.reminders[id] = {
    id,
    guildId,
    userId,
    text,
    when: new Date(when).toISOString(),
    channelId,
    createdAt: new Date().toISOString(),
  };
  await save();
  return id;
}

/**
 * @param {string} guildId
 * @param {string} userId
 * @param {string} reminderId
 * @returns {Promise<boolean>}
 */
export async function cancelReminder(guildId, userId, reminderId) {
  const store = await load();
  const reminder = store.reminders[reminderId];
  if (!reminder || reminder.guildId !== guildId || reminder.userId !== userId) {
    return false;
  }
  delete store.reminders[reminderId];
  await save();
  return true;
}

/**
 * @returns {Promise<Object<string, Object>>}
 */
export async function getBirthdays() {
  const store = await load();
  return store.birthdays;
}

/**
 * @param {string} guildId
 * @returns {Promise<Array<Object>>}
 */
export async function getBirthdaysForGuild(guildId) {
  const store = await load();
  return Object.entries(store.birthdays)
    .filter(([, b]) => b.guildId === guildId)
    .map(([userId, b]) => ({ userId, ...b }));
}

export async function removeReminder(id) {
  const store = await load();
  const deleted = store.reminders[id];
  delete store.reminders[id];
  await save();
  return deleted;
}

/**
 * @param {string} guildId
 * @param {string} userId
 * @param {string} text
 * @param {string} when
 * @param {string} channelId
 * @returns {Promise<string>}
 */
export async function addReminder(guildId, userId, text, when, channelId) {
  const store = await load();
  const id = `${guildId}-${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  store.reminders[id] = {
    id,
    guildId,
    userId,
    text,
    when: new Date(when).toISOString(),
    channelId,
    createdAt: new Date().toISOString(),
  };
  await save();
  return id;
}

/**
 * @param {string} guildId
 * @param {string} userId
 * @returns {Promise<Array<Object>>}
 */

/**
 * @param {string} guildId
 * @param {string} userId
 * @param {string} date
 * @param {string} channelId
 * @returns {Promise<Object>}
 */
export async function addBirthday(guildId, userId, date, channelId) {
  const store = await load();
  store.birthdays[userId] = {
    date,
    channelId,
    guildId,
    lastAnnounced: null,
  };
  await save();
  return store.birthdays[userId];
}

/**
 * @param {string} guildId
 * @param {string} userId
 * @param {Object} birthday
 * @returns {Promise<Object>}
 */
export async function setBirthday(guildId, userId, birthday) {
  const store = await load();
  store.birthdays[userId] = { ...birthday, guildId };
  await save();
  return store.birthdays[userId];
}

/**
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
export async function getBirthday(userId) {
  const store = await load();
  return store.birthdays[userId] || null;
}

/**
 * @param {string} guildId
 * @param {string} userId
 * @returns {Promise<Object|undefined>}
 */
export async function removeBirthday(guildId, userId) {
  const store = await load();
  if (store.birthdays[userId] && store.birthdays[userId].guildId === guildId) {
    const deleted = store.birthdays[userId];
    delete store.birthdays[userId];
    await save();
    return deleted;
  }
  return undefined;
}

export async function markBirthdayAnnounced(userId, year) {
  const store = await load();
  if (store.birthdays[userId]) {
    store.birthdays[userId].lastAnnounced = year;
    await save();
  }
}

export async function wasBirthdayAnnounced(userId, year) {
  const store = await load();
  return store.birthdays[userId]?.lastAnnounced === year;
}

// ---------------- Guild Config ----------------

export async function getGuildConfig(guildId) {
  const store = await load();
  store.guilds = store.guilds || {};
  return store.guilds[guildId] || {};
}

export async function setGuildConfig(guildId, config) {
  const store = await load();
  store.guilds = store.guilds || {};
  store.guilds[guildId] = { ...(store.guilds[guildId] || {}), ...config };
  await save();
  return store.guilds[guildId];
}

export async function getAnnouncementChannelId(guildId) {
  const config = await getGuildConfig(guildId);
  return config.announcementChannelId || null;
}

export async function setAnnouncementChannelId(guildId, channelId) {
  return setGuildConfig(guildId, { announcementChannelId: channelId });
}

// ---------------- Points ----------------

export async function getPointsEntry(guildId, userId) {
  const store = await load();
  const g = store.points[guildId] || {};
  return g[userId] || { points: 0, streak: 0, lastDaily: null };
}

export async function getUserPoints(guildId, userId) {
  const entry = await getPointsEntry(guildId, userId);
  return entry.points;
}

export async function addPoints(guildId, userId, amount) {
  const store = await load();
  const entry = await getPointsEntry(guildId, userId);
  entry.points += amount;
  store.points[guildId] = store.points[guildId] || {};
  store.points[guildId][userId] = entry;
  await save();
}

export async function deductPoints(guildId, userId, amount) {
  const store = await load();
  const entry = await getPointsEntry(guildId, userId);
  if (entry.points < amount) return false;
  entry.points -= amount;
  store.points[guildId] = store.points[guildId] || {};
  store.points[guildId][userId] = entry;
  await save();
  return true;
}

export async function setDailyState(guildId, userId, streak, totalPoints) {
  const store = await load();
  store.points[guildId] = store.points[guildId] || {};
  store.points[guildId][userId] = {
    points: totalPoints,
    streak,
    lastDaily: new Date().toISOString(),
  };
  await save();
}

export async function getTopUsers(guildId, limit = 10) {
  const store = await load();
  const g = store.points[guildId] || {};
  return Object.entries(g)
    .map(([userId, entry]) => ({ userId: Number(userId), points: entry.points, streak: entry.streak || 0 }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}

/**
 * @param {string} guildId
 * @param {string} userId
 * @param {Object} updates
 */
export async function updatePointsEntry(guildId, userId, updates) {
  const store = await load();
  store.points[guildId] = store.points[guildId] || {};
  const entry = store.points[guildId][userId] || { points: 0, streak: 0, lastDaily: null };
  store.points[guildId][userId] = { ...entry, ...updates };
  await save();
}

/**
 * @param {string} guildId
 * @param {number} limit
 * @returns {Promise<Array<{userId: number, points: number, streak: number}>>}
 */
export async function getLeaderboard(guildId, limit = 10) {
  return getTopUsers(guildId, limit);
}

// ---------------- Gambles ----------------

export async function getGamble(id) {
  const store = await load();
  return store.gambles[id] || null;
}

export async function createGamble(id, gamble) {
  const store = await load();
  store.gambles[id] = gamble;
  await save();
  return gamble;
}

export async function saveGamble(id, gamble) {
  const store = await load();
  store.gambles[id] = gamble;
  await save();
  return gamble;
}
