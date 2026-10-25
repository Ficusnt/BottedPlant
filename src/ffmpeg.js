/**
 * ffmpeg.js - FFmpeg detection utility
 * Detects system FFmpeg installation and verifies version compatibility
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { logger } from './logger.js';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Detect system FFmpeg path and verify version
 * @returns {Promise<string|null>} FFmpeg executable path or null if not found/incompatible
 */
export async function detectFfmpegPath() {
  const isWindows = process.platform === 'win32';
  const ffmpegCmd = isWindows ? 'ffmpeg.exe' : 'ffmpeg';
  
  try {
    // Try to find ffmpeg in PATH
    const { stdout } = await execFileAsync(isWindows ? 'where' : 'which', [ffmpegCmd]);
    const ffmpegPath = stdout.trim().split('\n')[0];
    
    if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
      logger.debug('[FFmpeg] System ffmpeg not found in PATH');
      return null;
    }
    
    // Verify version >= 5.0
    const { stdout: versionOutput } = await execFileAsync(ffmpegPath, ['-version']);
    const versionMatch = versionOutput.match(/ffmpeg version (\d+)\.(\d+)/);
    
    if (versionMatch) {
      const major = parseInt(versionMatch[1], 10);
      const minor = parseInt(versionMatch[2], 10);
      
      if (major > 5 || (major === 5 && minor >= 0)) {
        logger.info(`[FFmpeg] Found system ffmpeg ${major}.${minor} at ${ffmpegPath}`);
        return ffmpegPath;
      }
      
      logger.warn(`[FFmpeg] System ffmpeg ${major}.${minor} is too old (need >= 5.0), using bundled`);
      return null;
    }
    
    logger.warn('[FFmpeg] Could not parse system ffmpeg version, using bundled');
    return null;
  } catch (error) {
    logger.debug('[FFmpeg] System ffmpeg detection failed:', error.message);
    return null;
  }
}

/**
 * Get bundled ffmpeg-static path as fallback
 * @returns {Promise<string>} Bundled ffmpeg path
 */
export async function getBundledFfmpegPath() {
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const ffmpegStatic = await import('ffmpeg-static');
    const path = ffmpegStatic.default || ffmpegStatic;
    if (path && typeof path === 'string') return path;
  } catch {
    // ignore
  }
  
  // Fallback to common locations
  const candidates = [
    path.join(__dirname, '..', 'node_modules', 'ffmpeg-static', 'ffmpeg'),
    path.join(__dirname, '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
  ];
  
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  
  return 'ffmpeg'; // Last resort - rely on PATH
}

/**
 * Get the best available FFmpeg path (system if compatible, otherwise bundled)
 * @returns {Promise<string>} FFmpeg executable path
 */
export async function getFfmpegPath() {
  const systemPath = await detectFfmpegPath();
  if (systemPath) return systemPath;
  
  const bundledPath = await getBundledFfmpegPath();
  logger.info(`[FFmpeg] Using bundled ffmpeg: ${bundledPath}`);
  return bundledPath;
}