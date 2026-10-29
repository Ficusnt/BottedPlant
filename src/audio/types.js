/**
 * @typedef {Object} AudioBackend
 * @property {string} name - Backend identifier
 * @property {Promise<void>} initialize - Initialize the backend
 * @property {Promise<AudioSearchResult[]>} search - Search for tracks
 * @property {Promise<AudioStreamInfo>} getStream - Get playable stream URL
 * @property {Promise<AudioInfo>} getInfo - Get track info without streaming
 * @property {boolean} supportsPlatform - Check if platform is supported
 * @property {Promise<void>} destroy - Cleanup resources
 */

/**
 * @typedef {Object} AudioSearchResult
 * @property {string} title - Track title
 * @property {string} url - Track URL
 * @property {string} thumbnail - Thumbnail URL
 * @property {number} duration - Duration in seconds
 * @property {string} platform - Source platform (youtube, soundcloud, bandcamp, etc.)
 * @property {string} [id] - Platform-specific ID
 * @property {Object} [raw] - Raw platform response
 */

/**
 * @typedef {Object} AudioStreamInfo
 * @property {string} url - Direct stream URL
 * @property {string} [protocol] - Stream protocol (https, m3u8, etc.)
 * @property {Object} [headers] - HTTP headers for stream
 * @property {string} [mimeType] - MIME type
 */

/**
 * @typedef {Object} AudioInfo
 * @property {string} title
 * @property {string} url
 * @property {string} thumbnail
 * @property {number} duration
 * @property {string} platform
 * @property {Object} [formats] - Available formats
 * @property {Object} [raw] - Raw platform response
 */

/**
 * @typedef {Object} BackendConfig
 * @property {string} ytdlpPath - Path to yt-dlp binary
 * @property {string} cookiesFile - Optional cookies file
 * @property {Object} ffmpegOptions - FFmpeg options
 * @property {Object} lavalink - Lavalink connection config
 */