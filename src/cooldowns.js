// Simple per-user command cooldown manager
const cooldowns = new Map();

const DEFAULT_COOLDOWN_MS = {
  gamble: 5000,    // 5 seconds
  bet: 3000,       // 3 seconds
  redeem: 3000,    // 3 seconds
  daily: 1000,     // 1 second (already has daily logic)
  points: 1000,    // 1 second
  leaderboard: 5000, // 5 seconds
  shitpost: 10000, // 10 seconds
};

export function getCooldownKey(userId, command) {
  return `${userId}:${command}`;
}

export function isOnCooldown(userId, command) {
  const key = getCooldownKey(userId, command);
  const now = Date.now();
  const expires = cooldowns.get(key);
  if (!expires) return false;
  if (now >= expires) {
    cooldowns.delete(key);
    return false;
  }
  return true;
}

export function getRemainingCooldown(userId, command) {
  const key = getCooldownKey(userId, command);
  const expires = cooldowns.get(key);
  if (!expires) return 0;
  const remaining = expires - Date.now();
  return remaining > 0 ? remaining : 0;
}

export function setCooldown(userId, command, customMs = null) {
  const key = getCooldownKey(userId, command);
  const duration = customMs ?? DEFAULT_COOLDOWN_MS[command] ?? 3000;
  cooldowns.set(key, Date.now() + duration);
}

export function clearCooldown(userId, command) {
  const key = getCooldownKey(userId, command);
  cooldowns.delete(key);
}

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, expires] of cooldowns.entries()) {
    if (now >= expires) cooldowns.delete(key);
  }
}, 5 * 60 * 1000);