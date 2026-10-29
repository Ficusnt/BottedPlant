/**
 * Distube Backend
 * 
 * Wraps the existing Distube implementation with the AudioBackend interface.
 */

import { DisTube } from 'distube';
import { SoundCloudPlugin } from '@distube/soundcloud';
import { YtDlpPlugin } from '@distube/yt-dlp';
import { getFfmpegPath } from '../../ffmpeg.js';
import { logger } from '../../logger.js';

/** @type {DisTube | null} */
let distube = null;

/** @type {import('../types.js').BackendConfig} */
let config = {};

/**
 * @type {import('../types.js').AudioBackend}
 */
export const DistubeBackend = {
  name: 'distube',
  
  /**
   * Initialize Distube
   * @param {import('../types.js').BackendConfig} cfg
   */
  async initialize(cfg = {}) {
    config = cfg;
    
    // Distube requires a Discord client - this is set externally
    // We'll expose a method to set the client after Discord is ready
    console.log('[DistubeBackend] Initialized (waiting for Discord client)');
  },
  
  /**
   * Set the Discord client and initialize Distube
   * @param {import('discord.js').Client} client
   */
  async setClient(client) {
    if (distube) {
      return distube;
    }
    
    const ffmpegPath = await getFfmpegPath();
    
    distube = new DisTube(client, {
      
      
      
      
      
      
      plugins: [
        new SoundCloudPlugin(),
        new YtDlpPlugin({
          update: false,
          ytdlOptions: {
            format: 'bestaudio[ext=webm+codecs=opus]/bestaudio/best',
            quality: 'highestaudio',
            highWaterMark: 1 << 25,
          },
        }),
      ],
      ffmpeg: ffmpegPath ? { path: ffmpegPath } : undefined,
    });
    
    // Forward Distube events
    distube
      .on('playSong', (queue, song) => logger.info(`Playing: ${song.name}`))
      .on('addSong', (queue, song) => logger.info(`Added: ${song.name}`))
      .on('error', (channel, error) => logger.error('Distube error:', error))
      .on('finish', (queue) => logger.info('Queue finished'));
    
    console.log('[DistubeBackend] Distube initialized with Discord client');
    return distube;
  },
  
  /**
   * Search for tracks
   * @param {string} query
   * @param {Object} options
   * @returns {Promise<import('../types.js').AudioSearchResult[]>}
   */
  async search(query, options = {}) {
    if (!distube) {
      throw new Error('Distube not initialized - call setClient() first');
    }
    
    try {
      const results = await distube.search(query, options);
      return results.map((song) => ({
        title: song.name,
        url: song.url,
        thumbnail: song.thumbnail,
        duration: song.duration,
        platform: song.source || 'youtube',
        id: song.id,
        raw: song,
      }));
    } catch (error) {
      logger.error('[DistubeBackend] Search failed:', error);
      throw error;
    }
  },
  
  /**
   * Get stream info for a URL
   * @param {string} url
   * @returns {Promise<import('../types.js').AudioStreamInfo>}
   */
  async getStream(url) {
    if (!distube) {
      throw new Error('Distube not initialized');
    }
    
    try {
      const info = await distube.extractInfo(url);
      const format = info.formats.find((f) => f.hasAudio && !f.hasVideo) || info.formats[0];
      
      return {
        url: format.url,
        protocol: 'https',
        mimeType: format.mimeType,
        headers: {},
      };
    } catch (error) {
      logger.error('[DistubeBackend] Get stream failed:', error);
      throw error;
    }
  },
  
  /**
   * Get track info without streaming
   * @param {string} url
   * @returns {Promise<import('../types.js').AudioInfo>}
   */
  async getInfo(url) {
    if (!distube) {
      throw new Error('Distube not initialized');
    }
    
    try {
      const info = await distube.extractInfo(url);
      return {
        title: info.name,
        url: info.url,
        thumbnail: info.thumbnail,
        duration: info.duration,
        platform: info.source || 'youtube',
        formats: info.formats,
        raw: info,
      };
    } catch (error) {
      logger.error('[DistubeBackend] Get info failed:', error);
      throw error;
    }
  },
  
  /**
   * Check if platform is supported
   * @param {string} platform
   * @returns {boolean}
   */
  supportsPlatform(platform) {
    const supported = ['youtube', 'soundcloud', 'bandcamp', 'vimeo', 'twitch'];
    return supported.includes(platform.toLowerCase());
  },
  
  /**
   * Get the underlying DisTube instance
   * @returns {DisTube | null}
   */
  getDistube() {
    return distube;
  },
  
  /**
   * Cleanup
   */
  async destroy() {
    if (distube) {
      distube.removeAllListeners();
      distube = null;
    }
  },
};

export default DistubeBackend;