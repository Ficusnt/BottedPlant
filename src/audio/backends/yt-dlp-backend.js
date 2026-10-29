/**
 * Yt-dlp Direct Backend
 * 
 * Lightweight alternative using yt-dlp directly without Distube overhead.
 * Uses child_process to spawn yt-dlp for extraction.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from '../../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('../types.js').BackendConfig} */
let config = {};

/** @type {string} */
let ytdlpPath = 'yt-dlp';

/**
 * @type {import('../types.js').AudioBackend}
 */
export const YtDlpBackend = {
  name: 'ytdlp',
  
  /**
   * Initialize yt-dlp backend
   * @param {import('../types.js').BackendConfig} cfg
   */
  async initialize(cfg = {}) {
    config = cfg;
    ytdlpPath = cfg.ytdlpPath || join(__dirname, '..', '..', '..', 'node_modules', '.bin', 'yt-dlp');
    console.log('[YtDlpBackend] Initialized with yt-dlp at:', ytdlpPath);
  },
  
  /**
   * Run yt-dlp command and return parsed JSON
   * @param {string[]} args
   * @returns {Promise<Object>}
   */
  async runYtDlp(args) {
    return new Promise((resolve, reject) => {
      const proc = spawn(ytdlpPath, ['--no-cache-dir', '--flat-playlist', ...args], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      
      let stdout = '';
      let stderr = '';
      
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });
      
      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(new Error(`Failed to parse yt-dlp output: ${e.message}\nOutput: ${stdout}`));
        }
      });
      
      proc.on('error', (err) => reject(err));
    });
  },
  
  /**
   * Search for tracks
   * @param {string} query
   * @param {Object} options
   * @returns {Promise<import('../types.js').AudioSearchResult[]>}
   */
  async search(query, options = {}) {
    const isUrl = query.startsWith('http://') || query.startsWith('https://');
    const searchQuery = isUrl ? query : `ytsearch${options.limit || 10}:${query}`;
    
    const data = await this.runYtDlp([
      '--dump-json',
      '--no-playlist',
      searchQuery,
    ]);
    
    const entries = data.entries || [data];
    
    return entries.map((entry) => ({
      title: entry.title,
      url: entry.webpage_url || entry.url,
      thumbnail: entry.thumbnail,
      duration: entry.duration,
      platform: this.detectPlatform(entry.webpage_url || entry.url),
      id: entry.id,
      raw: entry,
    }));
  },
  
  /**
   * Get stream URL for playback
   * @param {string} url
   * @returns {Promise<import('../types.js').AudioStreamInfo>}
   */
  async getStream(url) {
    const data = await this.runYtDlp([
      '--dump-json',
      '--no-playlist',
      '-f', 'bestaudio[ext=webm+codecs=opus]/bestaudio/best',
      '--get-url',
      url,
    ]);
    
    const entry = data.entries?.[0] || data;
    
    return {
      url: entry.url,
      protocol: 'https',
      mimeType: entry.acodec?.includes('opus') ? 'audio/ogg; codecs=opus' : 'audio/mpeg',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
      },
    };
  },
  
  /**
   * Get track info without streaming
   * @param {string} url
   * @returns {Promise<import('../types.js').AudioInfo>}
   */
  async getInfo(url) {
    const data = await this.runYtDlp([
      '--dump-json',
      '--no-playlist',
      url,
    ]);
    
    const entry = data.entries?.[0] || data;
    
    return {
      title: entry.title,
      url: entry.webpage_url || entry.url,
      thumbnail: entry.thumbnail,
      duration: entry.duration,
      platform: this.detectPlatform(entry.webpage_url || entry.url),
      formats: entry.formats,
      raw: entry,
    };
  },
  
  /**
   * Detect platform from URL
   * @param {string} url
   * @returns {string}
   */
  detectPlatform(url) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {return 'youtube';}
    if (url.includes('soundcloud.com')) {return 'soundcloud';}
    if (url.includes('bandcamp.com')) {return 'bandcamp';}
    if (url.includes('vimeo.com')) {return 'vimeo';}
    if (url.includes('twitch.tv')) {return 'twitch';}
    return 'unknown';
  },
  
  /**
   * Check if platform is supported
   * @param {string} platform
   * @returns {boolean}
   */
  supportsPlatform(platform) {
    const supported = ['youtube', 'soundcloud', 'bandcamp', 'vimeo', 'twitch', 'bilibili', 'twitter', 'tiktok'];
    return supported.includes(platform.toLowerCase());
  },
  
  /**
   * Cleanup
   */
  async destroy() {
    // No persistent connections to clean up
  },
};

export default YtDlpBackend;