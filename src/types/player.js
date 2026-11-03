/**
 * @file types/player.js
 * @description JSDoc type definitions for discord-player v7 types
 * Provides IDE support for TypeScript-style type checking with JSDoc
 */

/**
 * @typedef {import('discord-player').Player} Player
 * @typedef {import('discord-player').GuildQueue} GuildQueue
 * @typedef {import('discord-player').Track} Track
 * @typedef {import('discord-player').Playlist} Playlist
 * @typedef {import('discord-player').SearchResult} SearchResult
 * @typedef {import('discord-player').ExtractorInfo} ExtractorInfo
 * @typedef {import('discord-player').QueueFilters} QueueFilters
 * @typedef {import('discord-player').PlayerEvents} PlayerEvents
 * @typedef {import('discord-player').GuildQueueEvents} GuildQueueEvents
 * @typedef {import('discord-player').QueryType} QueryType
 * @typedef {import('discord-player').PlayOptions} PlayOptions
 */

/**
 * RepeatMode enum values (discord-player v7)
 * @readonly
 * @enum {number}
 */
const RepeatMode = {
  /** Repeat disabled */
  Off: 0,
  /** Repeat current track */
  Track: 1,
  /** Repeat entire queue */
  Queue: 2,
};

export { RepeatMode };

/**
 * Queue node type (discord-player v7: queue.node)
 * @typedef {GuildQueue['node']} QueueNode
 */

/**
 * Node options for playback
 * @typedef {object} NodeOptions
 */