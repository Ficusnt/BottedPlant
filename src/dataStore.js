const fs = require('fs').promises;
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const storeFile = path.join(dataDir, 'store.json');

let cache = null;
let saveQueue = Promise.resolve();

async function ensureDataDir() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function load() {
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
    console.error('[dataStore] Error loading store:', err);
    cache = { reminders: {}, birthdays: {}, points: {}, gambles: {} };
    return cache;
  }
}

async function save() {
  saveQueue = saveQueue.then(async () => {
    try {
      await ensureDataDir();
      await fs.writeFile(storeFile, JSON.stringify(cache, null, 2), 'utf8');
    } catch (err) {
      console.error('[dataStore] Error saving store:', err);
    }
  });
  return saveQueue;
}

async function getReminders() {
  const store = await load();
  return store.reminders;
}

async function getBirthdays() {
  const store = await load();
  return store.birthdays;
}

async function addReminder(id, reminder) {
  const store = await load();
  store.reminders[id] = reminder;
  await save();
  return reminder;
}

async function removeReminder(id) {
  const store = await load();
  const deleted = store.reminders[id];
  delete store.reminders[id];
  await save();
  return deleted;
}

async function setBirthday(userId, birthday) {
  const store = await load();
  store.birthdays[userId] = birthday;
  await save();
  return birthday;
}

async function getBirthday(userId) {
  const store = await load();
  return store.birthdays[userId] || null;
}

async function removeBirthday(userId) {
  const store = await load();
  const deleted = store.birthdays[userId];
  delete store.birthdays[userId];
  await save();
  return deleted;
}

async function markBirthdayAnnounced(userId, year) {
  const store = await load();
  if (store.birthdays[userId]) {
    store.birthdays[userId].lastAnnounced = year;
    await save();
  }
}

async function wasBirthdayAnnounced(userId, year) {
  const store = await load();
  return store.birthdays[userId]?.lastAnnounced === year;
}

// ---------------- Points ----------------

async function getPointsEntry(guildId, userId) {
  const store = await load();
  const g = store.points[guildId] || {};
  return g[userId] || { points: 0, streak: 0, lastDaily: null };
}

async function getUserPoints(guildId, userId) {
  const entry = await getPointsEntry(guildId, userId);
  return entry.points;
}

async function addPoints(guildId, userId, amount) {
  const store = await load();
  const entry = await getPointsEntry(guildId, userId);
  entry.points += amount;
  store.points[guildId] = store.points[guildId] || {};
  store.points[guildId][userId] = entry;
  await save();
}

async function deductPoints(guildId, userId, amount) {
  const store = await load();
  const entry = await getPointsEntry(guildId, userId);
  if (entry.points < amount) return false;
  entry.points -= amount;
  store.points[guildId] = store.points[guildId] || {};
  store.points[guildId][userId] = entry;
  await save();
  return true;
}

async function setDailyState(guildId, userId, streak, totalPoints) {
  const store = await load();
  store.points[guildId] = store.points[guildId] || {};
  store.points[guildId][userId] = {
    points: totalPoints,
    streak,
    lastDaily: new Date().toISOString(),
  };
  await save();
}

async function getTopUsers(guildId, limit = 10) {
  const store = await load();
  const g = store.points[guildId] || {};
  return Object.entries(g)
    .map(([userId, entry]) => ({ userId: Number(userId), points: entry.points, streak: entry.streak || 0 }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}

// ---------------- Gambles ----------------

async function getGamble(id) {
  const store = await load();
  return store.gambles[id] || null;
}

async function createGamble(id, gamble) {
  const store = await load();
  store.gambles[id] = gamble;
  await save();
  return gamble;
}

async function saveGamble(id, gamble) {
  const store = await load();
  store.gambles[id] = gamble;
  await save();
  return gamble;
}

module.exports = {
  getReminders,
  getBirthdays,
  addReminder,
  removeReminder,
  setBirthday,
  getBirthday,
  removeBirthday,
  getPointsEntry,
  getUserPoints,
  addPoints,
  deductPoints,
  setDailyState,
  getTopUsers,
  getGamble,
  createGamble,
  saveGamble,
  markBirthdayAnnounced,
  wasBirthdayAnnounced,
};