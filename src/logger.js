/**
 * logger.js - Structured logging with pino
 * Redacts sensitive data (tokens, user IDs)
 */
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV !== 'production';

// Ensure logs directory exists
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Redaction rules
const redact = {
  paths: [
    '*.token',
    '*.password',
    '*.secret',
    '*.cookie',
    '*.cookiesFile',
    '*.authorization',
    'req.headers.authorization',
    'req.headers.cookie',
    'user.id',
    'guild.id',
    'channel.id',
    'message.id',
  ],
  censor: '**REDACTED**',
};

const transport = isDev
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
        singleLine: true,
      },
    }
  : {
      target: 'pino/file',
      options: { destination: path.join(logDir, 'bot.log') },
    };

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  redact,
  transport,
  base: {
    service: 'bottedplant',
    pid: process.pid,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Child logger factory for modules
export function childLogger(moduleName, meta = {}) {
  return logger.child({ module: moduleName, ...meta });
}