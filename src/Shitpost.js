// shitpost.js - Random meme responses with media support
const fs = require('fs').promises;
const path = require('path');
const reactions = require('./reactions');

const mediaDir = path.join(__dirname, '.', 'data', 'media');

// Use shitpost phrases from centralized reactions file
const SHITPOSTS = reactions.shitposts;

// Load media files from data/media directory
let mediaFiles = [];
let mediaLoaded = false;

async function loadMedia() {
  if (mediaLoaded) return;
  try {
    await fs.mkdir(mediaDir, { recursive: true });
    const files = await fs.readdir(mediaDir);
    mediaFiles = files.filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm'].includes(ext);
    });
    mediaLoaded = true;
    console.log('[Shitpost] Loaded ' + mediaFiles.length + ' media files from ' + mediaDir);
  } catch (err) {
    console.error('[Shitpost] Error loading media:', err);
    mediaFiles = [];
    mediaLoaded = true;
  }
}

// Check if message contains any shitpost trigger
function hasShitpostTrigger(content) {
  if (!content) return false;
  const lower = content.toLowerCase();
  return SHITPOSTS.some((s) => s.text.toLowerCase().split(' ').some((word) => lower.includes(word)))
}

// Get random shitpost response
function getShitpostResponse(content) {
  const lower = content.toLowerCase();
  const triggers = SHITPOSTS.filter((s) => s.text.toLowerCase().split(' ').some((word) => lower.includes(word)))
  if (triggers.length === 0) return null;
  const trigger = triggers[Math.floor(Math.random() * triggers.length)];
  const roll = Math.floor(Math.random()*20)+1;
  if (roll === 1) return reactions.rand(trigger.fail);
  if (roll === 20) return reactions.rand(trigger.crit);
  return reactions.rand(trigger.hits);
}

// Get random media file
async function getRandomMedia() {
  await loadMedia();
  if (mediaFiles.length === 0) return null;
  return mediaFiles[Math.floor(Math.random()*mediaFiles.length)];
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

module.exports = {
  hasShitpostTrigger,
  getShitpostResponse,
  getRandomMedia,
  sendShitpost,
  loadMedia,
};
