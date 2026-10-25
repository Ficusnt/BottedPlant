/**
 * contextSelector.js - Context-aware phrase weighting
 * Builds context from Discord interactions and applies contextual boosts to phrase selection
 */

import { logger } from './logger.js';

/**
 * Build context object from Discord interaction and optional overrides
 * @param {import('discord.js').Interaction|import('discord.js').Message|null} interaction
 * @param {Object} overrides
 * @returns {PhraseContext}
 */
export function buildContext(interaction, overrides = {}) {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0 = Sunday

  let context = {
    hour,
    timeOfDay: hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 17 ? 'afternoon' : hour >= 17 && hour < 22 ? 'evening' : 'night',
    dayOfWeek,
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    season: getCurrentSeason(now),
    ...overrides
  };

  if (interaction) {
    if (interaction.guild) {
      context.guildSize = interaction.guild.memberCount;
      context.guildId = interaction.guild.id;
    }

    if (interaction.user) {
      context.userId = interaction.user.id;
      context.username = interaction.user.username;
    }

    if (interaction.member) {
      context.userRole = getUserRole(interaction.member);
      context.isBotOwner = interaction.user.id === process.env.OWNER_ID;
    }

    if (interaction.commandName) {
      context.commandType = interaction.commandName;
    } else if (interaction.customId) {
      context.commandType = interaction.customId.split('-')[0];
    }
  }

  return context;
}

/**
 * Determine user role from GuildMember
 * @param {import('discord.js').GuildMember} member
 * @returns {string}
 */
export function getUserRole(member) {
  if (member.permissions.has('Administrator')) return 'admin';
  if (member.permissions.has('ManageGuild')) return 'moderator';
  if (member.roles.cache.some(r => r.name.toLowerCase().includes('mod'))) return 'moderator';
  if (member.roles.cache.some(r => r.name.toLowerCase().includes('vip') || r.name.toLowerCase().includes('premium'))) return 'vip';
  const daysSinceJoin = (Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24);
  return daysSinceJoin < 7 ? 'new' : 'member';
}

/**
 * Get current season based on date
 * @param {Date} date
 * @returns {string}
 */
export function getCurrentSeason(date = new Date()) {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if ((month === 12 && day >= 21) || month === 1 || month === 2 || (month === 3 && day < 21)) return 'summer';
  if ((month === 3 && day >= 21) || month === 4 || month === 5 || (month === 6 && day < 21)) return 'autumn';
  if ((month === 6 && day >= 21) || month === 7 || month === 8 || (month === 9 && day < 21)) return 'winter';
  return 'spring';
}

/**
 * Select a template based on context weights
 * @param {Array<{text: string, weight: number, contexts: Object}>} templates
 * @param {Object} context
 * @returns {string|null}
 */
export function selectWithContext(templates, context) {
  if (!templates || !templates.length) return null;
  
  // Calculate effective weight for each template based on context
  const weighted = templates.map(t => {
    let weight = t.weight || 1;
    const ctx = t.contexts || {};
    
    // Time of day boost
    if (ctx.timeOfDay && ctx.timeOfDay === context.timeOfDay) weight *= 1.5;
    if (ctx.timeOfDay && Array.isArray(ctx.timeOfDay) && ctx.timeOfDay.includes(context.timeOfDay)) weight *= 1.3;
    
    // Season boost
    if (ctx.season && ctx.season === context.season) weight *= 1.5;
    if (ctx.season && Array.isArray(ctx.season) && ctx.season.includes(context.season)) weight *= 1.3;
    
    // Weekend boost
    if (ctx.isWeekend === true && context.isWeekend) weight *= 1.2;
    if (ctx.isWeekend === false && !context.isWeekend) weight *= 1.1;
    
    // User role boost
    if (ctx.userRole && ctx.userRole === context.userRole) weight *= 1.3;
    if (ctx.userRole && Array.isArray(ctx.userRole) && ctx.userRole.includes(context.userRole)) weight *= 1.2;
    
    // Command type boost
    if (ctx.commandType && ctx.commandType === context.commandType) weight *= 1.4;
    
    // Guild size boost (larger servers get slightly higher weights for "social" templates)
    if (ctx.guildSize && context.guildSize) {
      if (ctx.guildSize === 'large' && context.guildSize > 1000) weight *= 1.1;
      if (ctx.guildSize === 'small' && context.guildSize < 100) weight *= 1.1;
    }
    
    // Anti-repeat: if recentPhrases provided, reduce weight for recently used
    if (context.recentPhrases && context.recentPhrases.includes(t.text)) {
      weight *= 0.1; // Heavily penalize recent repeats
    }
    
    return { text: t.text, weight, original: t };
  });
  
  // Weighted random selection
  const totalWeight = weighted.reduce((sum, t) => sum + t.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const t of weighted) {
    random -= t.weight;
    if (random <= 0) return t.text;
  }
  
  return weighted[weighted.length - 1].text;
}

/**
 * Update recent phrases list for anti-repeat
 * @param {string[]} recentPhrases
 * @param {string} newPhrase
 * @param {number} maxLength
 * @returns {string[]}
 */
export function updateRecentPhrases(recentPhrases, newPhrase, maxLength = 10) {
  const updated = [newPhrase, ...recentPhrases.filter(p => p !== newPhrase)];
  return updated.slice(0, maxLength);
}