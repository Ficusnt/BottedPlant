/**
 * messageHandler.js - Passive message reactions (triggers, shitposts, phrases)
 * Handles all non-command message interactions
 */

import { logger } from '../logger.js';
import { hasShitpostTrigger, getShitpostResponse, getRandomMedia, sendShitpost } from '../shitpost.js';
import * as phraseManager from '../phraseManager.js';

/**
 * Check if message matches "planta" or "hola planta" patterns for 100% response
 * @param {string} content - Lowercase message content
 * @returns {string|null} - Trigger key if matched, null otherwise
 */
function getGuaranteedTrigger(content) {
  const lower = content.toLowerCase().trim();
  
  // Exact matches first - check hola_planta variants first
  if (lower === 'hola planta' || lower === 'hola, planta') {
    return 'hola_planta';
  }
  if (lower === 'planta') {
    return 'planta';
  }
  
  // "hola planta" with variations (punctuation, extra spaces)
  if (lower.startsWith('hola ') && lower.includes('planta')) {
    return 'hola_planta';
  }
  
  // "planta" as standalone word or at boundaries
  if (lower.includes('planta')) {
    // Check if it's a standalone mention (word boundary)
    const words = lower.split(/\s+/);
    if (words.includes('planta') || words.some(w => w === 'planta' || w === 'planta?' || w === 'planta!')) {
      return 'planta';
    }
  }
  
  return null;
}

/**
 * Process a trigger response using phraseManager's d20 system
 * @param {import('discord.js').Message} message
 * @param {string} triggerKey
 * @param {Object} triggerData
 */
async function processTriggerResponse(message, triggerKey, triggerData) {
  // Use phraseManager's getPhraseWithContext with rollType: 'd20' for hit/crit/fail
  const response = await phraseManager.getPhraseWithContext(
    'triggers',
    triggerKey,
    {},
    { interaction: message, rollType: 'd20' }
  );

  if (!response || response === phraseManager.MISSING_PHRASE) return false;

  // Check for media (same logic as phraseManager fallback)
  let mediaFile = null;
  if (triggerData.media && triggerData.media.length && Math.random() < (triggerData.mediaChance || 0.08)) {
    mediaFile = phraseManager.rand(triggerData.media);
  }

  if (mediaFile) {
    await sendShitpost(message, response, mediaFile);
  } else {
    await message.channel.send(response).catch(() => {});
  }

  return true;
}

/**
 * Main message handler - called on every messageCreate event
 * @param {import('discord.js').Message} message
 */
export async function handleMessage(message) {
  if (message.author.bot || !message.guild) return;
  const content = message.content.trim();
  if (!content || content.startsWith('/')) return;
  
  try {
    const lowerContent = content.toLowerCase();
    
    // 1. Check for guaranteed triggers first (100% response rate)
    const guaranteedTrigger = getGuaranteedTrigger(lowerContent);
    if (guaranteedTrigger) {
      const data = await phraseManager.getPhrases();
      // Check both triggers and shitpost for the guaranteed trigger
      let triggerData = data.categories?.triggers?.[guaranteedTrigger];
      if (!triggerData) {
        triggerData = data.categories?.shitpost?.[guaranteedTrigger];
      }
      if (triggerData) {
        await processTriggerResponse(message, guaranteedTrigger, triggerData);
        return;
      }
    }
    
    // 2. Check for shitpost triggers - 25% random trigger chance
    if (hasShitpostTrigger(content) && Math.random() < 0.25) {
      const response = getShitpostResponse(content, message.channelId);
      if (response) {
        // 30% chance to send media with response if available
        if (Math.random() < 0.3) {
          const mediaFile = await getRandomMedia();
          if (mediaFile) {
            await sendShitpost(message, response, mediaFile);
            return;
          }
        }
        await sendShitpost(message, response);
        return;
      }
    }
    
    // 3. Fall back to regular phrase triggers - 25% random trigger chance
    if (Math.random() <= 0.25) {
      const triggerMatch = await phraseManager.getTriggerResponse(content, {});
      if (triggerMatch && triggerMatch.triggerData) {
        const { triggerData, triggerKey } = triggerMatch;
        await processTriggerResponse(message, triggerKey, triggerData);
        return;
      }
    }
  } catch (err) {
    logger.error({ err }, '[messageHandler] Error processing message');
  }
}