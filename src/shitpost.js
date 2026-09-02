// shitpost.js - Random meme responses with media support 
const fs = require('fs').promises;
const path = require('path');
const phraseManager = require('./phraseManager');

const mediaDir = path.join(__dirname, '.', 'data', 'media');

// Load shitpost phrases from phraseManager
let SHITPOSTS = [];

async function loadShitposts() {
  if (SHITPOSTS.length > 0) return;
  const cat = await phraseManager.getCategory('shitposts');
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
  if (SHITPOSTS.length === 0) {
    // Fallback defaults
    SHITPOSTS = [
      { text: 'bien', hits: ['Bien ahí 🌿', 'Sí, che 🍃', 'Dale que va 🌱'], crits: ['¡BIEN ALLÁ CARAJO! 🌿✨'], fails: ['...¿qué? 🌱'] },
      { text: 'mal', hits: ['Mal ahí 🌱', 'No che 🍂', 'Qué sé yo 🌿'], crits: ['¡MAL PERO MUY MAL! 🌿✨'], fails: ['...quizás sí 🌱'] },
      { text: 'planta', hits: ['🌿 *fotosintetiza*', 'Soy una planta, no me hables 🍃', 'Regame y hablamos 🌱'], crits: ['¡SOY LA REINA DEL JARDÍN! 🌿✨'], fails: ['*se seca* 🌵'] },
    ];
  }
}

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
  return SHITPOSTS.some((s) => (s.keywords && s.keywords.some((k) => lower.includes(k.toLowerCase()))) || (s.text && s.text.toLowerCase().split(' ').some((word) => lower.includes(word))));
}

// Get random shitpost response
function getShitpostResponse(content) {
  const lower = content.toLowerCase();
  const triggers = SHITPOSTS.filter((s) => (s.keywords && s.keywords.some((k) => lower.includes(k.toLowerCase()))) || (s.text && s.text.toLowerCase().split(' ').some((word) => lower.includes(word))));
  if (triggers.length === 0) return null;
  const trigger = triggers[Math.floor(Math.random() * triggers.length)];
  const roll = Math.floor(Math.random() * 20) + 1;
  if (roll === 1) return phraseManager.rand(trigger.fails);
  if (roll === 20) return phraseManager.rand(trigger.crits);
  return phraseManager.rand(trigger.hits);
}

// Get random media file
async function getRandomMedia() {
  await loadMedia();
  if (mediaFiles.length === 0) return null;
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

module.exports = {
  hasShitpostTrigger,
  getShitpostResponse,
  getRandomMedia,
  sendShitpost,
  loadMedia,
  loadShitposts,
};
