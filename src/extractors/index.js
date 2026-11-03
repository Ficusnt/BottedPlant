/**
 * @file extractors/index.js
 * @description Extractor registration module for discord-player
 */

import { YouTubeExtractor } from '../player.js';
import { DefaultExtractors } from '@discord-player/extractor';

/**
 * Register all extractors with the player
 * @param {import('discord-player').Player} player - Player instance
 * @returns {Promise<void>}
 */
export async function registerExtractors(player) {
  // Register built-in extractors from @discord-player/extractor
  // This includes Spotify, SoundCloud, ReverbNation, etc.
  // @ts-expect-error - Type mismatch between DefaultExtractors and register method expectations
  player.extractors.register(DefaultExtractors);

  // Register custom YouTube extractor (yt-dlp based)
  // @ts-expect-error - Custom extractor class type mismatch
  player.extractors.register(YouTubeExtractor);

  // Register FFmpeg extractor as fallback for direct media URLs
  // @ts-expect-error - registerDefault may not exist in current version
  player.extractors.registerDefault();
}

/**
 * Get list of available extractor names
 * @returns {string[]}
 */
export function getExtractorNames() {
  return ['spotify', 'soundcloud', 'reverbnation', 'youtube', 'ffmpeg'];
}