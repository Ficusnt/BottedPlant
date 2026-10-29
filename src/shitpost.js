// shitpost.js - Random meme responses with media support 
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as phraseManager from './phraseManager.js';
import { checkTriggers } from './phraseManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mediaDir = path.join(__dirname, '..', 'data', 'media');

// Load shitpost phrases from phraseManager
const SHITPOSTS = [];

async function loadShitposts() {
  if (SHITPOSTS.length > 0) {return;}
  const cat = await phraseManager.getCategory('shitpost');
  if (cat) {
    for (const key of Object.keys(cat)) {
      const entry = cat[key];
      SHITPOSTS.push({
        text: key,
        keywords: entry.keywords || [],
        hits: entry.hits || [],
        crits: entry.crits || [],
        fails: entry.fails || [],
      });
    }
  }
}

// Load media files from data/media directory
let mediaFiles = [];
let mediaLoaded = false;

async function loadMedia() {
  if (mediaLoaded) {return;}
  try {
    await fs.mkdir(mediaDir, { recursive: true });
    const files = await fs.readdir(mediaDir);
    mediaFiles = files.filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm'].includes(ext);
    });
    mediaLoaded = true;
    console.log(`[Shitpost] Loaded ${mediaFiles.length} media files from ${mediaDir}`);
  } catch (err) {
    console.error('[Shitpost] Error loading media:', err);
    mediaFiles = [];
    mediaLoaded = true;
  }
}

// Cooldown & deduplication state
const SHITPOST_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes
const SHITPOST_HISTORY_SIZE = 5; // Track last 5 responses per channel
const channelCooldowns = new Map(); // channelId -> timestamp
const channelHistory = new Map();   // channelId -> array of recent responses

// Find all matching shitpost entries for given content
// Uses shared checkTriggers from phraseManager.js
function findMatchingShitposts(content) {
  if (!content) {return [];}
  return checkTriggers(content, SHITPOSTS);
}

// Check if message contains any shitpost trigger (no cooldown check - fast path)
function hasShitpostTrigger(content) {
  return findMatchingShitposts(content).length > 0;
}

// Check if channel is on cooldown
function isOnCooldown(channelId) {
  const lastTime = channelCooldowns.get(channelId);
  if (!lastTime) {return false;}
  return Date.now() - lastTime < SHITPOST_COOLDOWN_MS;
}

// Mark channel as having sent a shitpost (starts cooldown)
function markShitpostSent(channelId) {
  channelCooldowns.set(channelId, Date.now());
}

// Get random shitpost response with cooldown + deduplication
// Uses phraseManager's d20 roll system for hit/crit/fail
async function getShitpostResponse(content, channelId) {
  if (!content) {return null;}

  // Cooldown check (per channel)
  if (channelId && isOnCooldown(channelId)) {
    return null;
  }

  const triggers = findMatchingShitposts(content);
  if (triggers.length === 0) {return null;}

  const trigger = triggers[Math.floor(Math.random() * triggers.length)];
  
  // Use phraseManager's getPhraseWithContext with rollType: 'd20' for hit/crit/fail
  let response = await phraseManager.getPhraseWithContext(
    'shitpost',
    trigger.text,
    {},
    { rollType: 'd20' }
  );

  // Deduplication: avoid repeating recent responses in this channel
  if (channelId && response && response !== phraseManager.MISSING_PHRASE) {
    const history = channelHistory.get(channelId) || [];
    if (history.includes(response)) {
      // Try to pick a different response from the same trigger (max 3 attempts)
      let attempts = 3;
      while (attempts-- > 0) {
        const altResponse = await phraseManager.getPhraseWithContext(
          'shitpost',
          trigger.text,
          {},
          { rollType: 'd20' }
        );
        if (altResponse !== phraseManager.MISSING_PHRASE && !history.includes(altResponse)) {
          response = altResponse;
          break;
        }
      }
    }
    // Update history
    history.push(response);
    if (history.length > SHITPOST_HISTORY_SIZE) {history.shift();}
    channelHistory.set(channelId, history);
  }

  // Mark cooldown
  if (channelId) {markShitpostSent(channelId);}

  return response;
}

// Get random media file
async function getRandomMedia() {
  await loadMedia();
  if (mediaFiles.length === 0) {return null;}
  return mediaFiles[Math.floor(Math.random() * mediaFiles.length)];
}

// Send shitpost response with optional media
async function sendShitpost(message, text, mediaFile = null) {
  try {
    if (mediaFile) {
      const filePath = path.join(mediaDir, mediaFile);
      await message.channel.send({ content: text, files: [filePath] });
    } else {
      await message.channel.send(text);
    }
  } catch (err) {
    console.error('[Shitpost] Error sending response:', err);
  }
}

export {
  SHITPOSTS,
  findMatchingShitposts,
  hasShitpostTrigger,
  getShitpostResponse,
  getRandomMedia,
  sendShitpost,
  loadMedia,
  loadShitposts,
};
