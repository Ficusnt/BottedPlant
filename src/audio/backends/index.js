/**
 * Audio Backend Registry & Factory
 * 
 * Manages multiple audio backends with a unified interface.
 * Supports: Distube, yt-dlp direct, Lavalink
 */

import { EventEmitter } from 'events';

/** @type {Map<string, import('./types.js').AudioBackend>} */
const backends = new Map();

/** @type {import('./types.js').AudioBackend | null} */
let activeBackend = null;

/**
 * Register an audio backend
 * @param {import('./types.js').AudioBackend} backend
 */
export function registerBackend(backend) {
  if (!backend.name || !backend.initialize || !backend.search || !backend.getStream) {
    throw new Error('Invalid backend: must implement name, initialize, search, getStream');
  }
  backends.set(backend.name, backend);
  console.log(`[AudioBackend] Registered: ${backend.name}`);
}

/**
 * Get a backend by name
 * @param {string} name
 * @returns {import('./types.js').AudioBackend | undefined}
 */
export function getBackend(name) {
  return backends.get(name);
}

/**
 * Get all registered backends
 * @returns {import('./types.js').AudioBackend[]}
 */
export function getAllBackends() {
  return Array.from(backends.values());
}

/**
 * Set the active backend
 * @param {string} name
 * @returns {Promise<import('./types.js').AudioBackend>}
 */
export async function setActiveBackend(name) {
  const backend = backends.get(name);
  if (!backend) {
    throw new Error(`Backend not found: ${name}`);
  }
  
  if (activeBackend && activeBackend.destroy) {
    await activeBackend.destroy().catch(console.error);
  }
  
  await backend.initialize();
  activeBackend = backend;
  console.log(`[AudioBackend] Active backend: ${name}`);
  return backend;
}

/**
 * Get the active backend
 * @returns {import('./types.js').AudioBackend}
 */
export function getActiveBackend() {
  if (!activeBackend) {
    throw new Error('No active backend. Call setActiveBackend() first.');
  }
  return activeBackend;
}

/**
 * Create backend from config
 * @param {string} type - Backend type: 'distube', 'ytdlp', 'lavalink'
 * @param {import('./types.js').BackendConfig} config
 * @returns {Promise<import('./types.js').AudioBackend>}
 */
export async function createBackend(type, config = {}) {
  let backend;
  
  switch (type) {
    case 'distube':
      const { DistubeBackend } = await import('./distube-backend.js');
      backend = DistubeBackend;
      await backend.initialize(config);
      break;
    case 'ytdlp':
      const { YtDlpBackend } = await import('./yt-dlp-backend.js');
      backend = YtDlpBackend;
      await backend.initialize(config);
      break;
    case 'lavalink':
      const { LavalinkBackend } = await import('./lavalink-backend.js');
      backend = LavalinkBackend;
      await backend.initialize(config);
      break;
    default:
      throw new Error(`Unknown backend type: ${type}`);
  }
  
  registerBackend(backend);
  return backend;
}

/**
 * Auto-detect and initialize best available backend
 * @param {import('./types.js').BackendConfig} config
 * @returns {Promise<import('./types.js').AudioBackend>}
 */
export async function autoInitialize(config = {}) {
  // Priority: Lavalink (if configured) > Distube > yt-dlp
  if (config.lavalink?.host) {
    try {
      const backend = await createBackend('lavalink', config);
      await setActiveBackend('lavalink');
      return backend;
    } catch (e) {
      console.warn('[AudioBackend] Lavalink init failed, falling back:', e.message);
    }
  }
  
  try {
    const backend = await createBackend('distube', config);
    await setActiveBackend('distube');
    return backend;
  } catch (e) {
    console.warn('[AudioBackend] Distube init failed, falling back to yt-dlp:', e.message);
  }
  
  const backend = await createBackend('ytdlp', config);
  await setActiveBackend('ytdlp');
  return backend;
}

/**
 * Shutdown all backends
 */
export async function shutdownAll() {
  for (const [name, backend] of backends) {
    if (backend.destroy) {
      try {
        await backend.destroy();
        console.log(`[AudioBackend] Shutdown: ${name}`);
      } catch (e) {
        console.error(`[AudioBackend] Error shutting down ${name}:`, e);
      }
    }
  }
  backends.clear();
  activeBackend = null;
}

// Graceful shutdown
process.on('SIGINT', shutdownAll);
process.on('SIGTERM', shutdownAll);

export default {
  registerBackend,
  getBackend,
  getAllBackends,
  setActiveBackend,
  getActiveBackend,
  createBackend,
  autoInitialize,
  shutdownAll,
};