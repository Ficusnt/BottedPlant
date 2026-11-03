/**
 * @file player.js
 * @description Discord Player initialization, extractor registration, and event handlers
 */

import { Player, BaseExtractor } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';
import { onBeforeCreateStream, useQueue, onStreamExtracted, FFMPEG_ARGS_PIPED, createFFmpegStream } from 'discord-player';
import { Client } from 'discord.js';
import { getFfmpegPath } from './ffmpeg.js';
import { logger } from './logger.js';
import { spawn } from 'child_process';
import { Duplex } from 'stream';

/**
 * Create and configure the Player instance
 * @param {Client<boolean>} client - Discord.js client
 * @returns {Promise<Player>} Configured Player instance
 */
export async function createPlayer(client) {
  const ffmpegPath = await getFfmpegPath();
  // @ts-expect-error - discord.js Client type mismatch with discord-player
  const player = new Player(client, {
    skipFFmpeg: false,
    ffmpegPath: ffmpegPath,
  });

  onBeforeCreateStream(async (track, queryType, queue) => {
    const isYouTubeSabr = track.extractor?.identifier === 'com.github.xxczaki.youtube-sabr';
    // @ts-expect-error - pino logger overload mismatch
    logger.info('[StreamHook] onBeforeCreateStream called', {
      service: 'bottedplant',
      extractor: track.extractor?.identifier,
      isYouTubeSabr,
      queryType,
      trackTitle: track.title
    });

    if (!isYouTubeSabr) {
      return undefined;
    }

    logger.debug('[StreamHook] Detected YouTube SABR track, creating custom FFmpeg stream with -f webm -i -');

    return undefined;
  });

  onStreamExtracted(async (stream, track, queue) => {
    const isYouTubeSabr = track.extractor?.identifier === 'com.github.xxczaki.youtube-sabr';
    // @ts-expect-error - pino logger overload mismatch
    logger.info('[StreamExtracted] Hook called', {
      service: 'bottedplant',
      extractor: track.extractor?.identifier,
      isYouTubeSabr,
      trackTitle: track.title
    });

    if (!isYouTubeSabr) {
      return stream;
    }
    // @ts-expect-error - pino logger overload mismatch
    logger.info('[StreamExtracted] Source stream type', { service: 'bottedplant', streamType: stream.constructor.name, isStream: stream instanceof Duplex });

    let sourceBytes = 0;
    if (stream instanceof Duplex) {
      stream.on('data', (chunk) => {
        sourceBytes += chunk.length;
        // @ts-expect-error - pino logger overload mismatch
        logger.debug('[StreamExtracted] Source stream data', { service: 'bottedplant', totalBytes: sourceBytes });
      });
      stream.on('end', () => {
        // @ts-expect-error - pino logger overload mismatch
        logger.info('[StreamExtracted] Source stream ended', { service: 'bottedplant', totalBytes: sourceBytes });
      });
      stream.on('error', (err) => {
        logger.error({ err }, '[StreamExtracted] Source stream error', { service: 'bottedplant' });
      });
    }
    // @ts-expect-error - pino logger overload mismatch
    logger.info('[CustomFFmpeg] baseArgs from FFMPEG_ARGS_PIPED', { baseArgs: FFMPEG_ARGS_PIPED });

    const baseArgs = FFMPEG_ARGS_PIPED();
    const customArgs = [...baseArgs, '-f', 'webm', '-i', '-'];
    // @ts-expect-error - pino logger overload mismatch
    logger.debug('[CustomFFmpeg] Creating stream with args', { service: 'bottedplant', args: customArgs.join(' ') });
    // @ts-expect-error - pino logger overload mismatch
    logger.info('[CustomFFmpeg] Spawning FFmpeg', { service: 'bottedplant', args: customArgs.join(' ') });

    const ffmpegProcess = spawn('ffmpeg', customArgs, { stdio: ['pipe', 'pipe', 'pipe'] });

    const output = new Duplex({
      read() {},
    });

    let ffmpegBytes = 0;
    ffmpegProcess.stdout.on('data', (chunk) => {
      ffmpegBytes += chunk.length;
      // @ts-expect-error - pino logger overload mismatch
      logger.debug('[CustomFFmpeg] FFmpeg output data', { service: 'bottedplant', totalBytes: ffmpegBytes });
      output.push(chunk);
    });
    ffmpegProcess.stdout.on('end', () => {
      // @ts-expect-error - pino logger overload mismatch
      logger.info('[CustomFFmpeg] FFmpeg stdout ended', { service: 'bottedplant', totalBytes: ffmpegBytes });
      output.push(null);
    });
    ffmpegProcess.stderr.on('data', (data) => {
      // @ts-expect-error - pino logger overload mismatch
      logger.warn('[CustomFFmpeg] FFmpeg stderr', { service: 'bottedplant', stderr: data.toString() });
    });
    ffmpegProcess.on('error', (err) => {
      logger.error({ err }, '[CustomFFmpeg] FFmpeg process error', { service: 'bottedplant' });
      output.destroy(err);
    });
    ffmpegProcess.on('close', (code) => {
      // @ts-expect-error - pino logger overload mismatch
      logger.info('[CustomFFmpeg] FFmpeg process closed', { service: 'bottedplant', code });
      if (!output.destroyed) {
        output.push(null);
      }
    });

    // Pipe source stream to FFmpeg stdin
    if (stream instanceof Duplex) {
      stream.pipe(ffmpegProcess.stdin, { end: true });
      stream.on('error', (err) => {
        logger.error({ err }, '[CustomFFmpeg] Source stream error', { service: 'bottedplant' });
        ffmpegProcess.stdin?.end();
      });
    }

    return output;
  });

  return player;
}

/**
 * YouTube SABR Extractor class for handling YouTube SABR format
 */
export class YouTubeExtractor extends BaseExtractor {
  static identifier = 'com.github.xxczaki.youtube-sabr';

  async handle(query) {
    // Implementation for YouTube SABR
    return { tracks: [], playlist: null };
  }

  async search(query) {
    const searchOutput = '';
    const tracks = [];
    
    for (const line of searchOutput.trim().split('\n')) {
      if (!line.trim()) continue;
      if (!line.trim()) continue;
      const [title, author, duration, thumbnail, videoId, url] = line.split('|');
      tracks.push({
        title,
        author,
        duration: parseInt(duration) || 0,
        thumbnail,
        videoId,
        url,
        extractor: YouTubeExtractor.identifier,
      });
    }
    
    return { tracks, playlist: null };
  }
}

// Register extractors
export function registerExtractors(player) {
  player.extractors.register(DefaultExtractors);
  player.extractors.register(YouTubeExtractor);
  // @ts-expect-error - pino logger overload mismatch
  logger.info('[Player] Extractors registered', { 
    service: 'bottedplant',
    extractors: [...player.extractors.store.values()].map(e => e.identifier) 
  });
}

/**
 * Set up additional player event handlers
 * @param {import('discord-player').Player} player - The Player instance
 */
export function setupPlayerEvents(player) {
  // Queue events
  player.events.on('playerStart', (queue, track) => {
    // @ts-expect-error - pino logger overload mismatch
    logger.info('[Player] Track started', {
      service: 'bottedplant',
      guildId: queue.guild.id,
      track: track.title,
      url: track.url
    });
  });

  player.events.on('playerFinish', (queue, track) => {
    // @ts-expect-error - pino logger overload mismatch
    logger.info('[Player] Track finished', {
      service: 'bottedplant',
      guildId: queue.guild.id,
      track: track.title
    });
  });

  player.events.on('playerError', (queue, error) => {
    logger.error({ err: error }, '[Player] Player error', {
      service: 'bottedplant',
      guildId: queue.guild.id
    });
  });

  player.events.on('emptyQueue', (queue) => {
    // @ts-expect-error - pino logger overload mismatch
    logger.info('[Player] Queue empty', {
      service: 'bottedplant',
      guildId: queue.guild.id
    });
  });

  player.events.on('emptyChannel', (queue) => {
    // @ts-expect-error - pino logger overload mismatch
    logger.info('[Player] Voice channel empty', {
      service: 'bottedplant',
      guildId: queue.guild.id
    });
  });

  player.events.on('disconnect', (queue) => {
    // @ts-expect-error - pino logger overload mismatch
    logger.info('[Player] Disconnected', {
      service: 'bottedplant',
      guildId: queue.guild.id
    });
  });
  // @ts-expect-error - pino logger overload mismatch
  logger.info('[Player] Event handlers registered', {
    service: 'bottedplant'
  });
}
