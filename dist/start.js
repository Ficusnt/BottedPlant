#!/usr/bin/env node
// Auto-generated startup script with low-memory optimizations
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up require for CommonJS interop
const require = createRequire(import.meta.url);

// Load environment variables
import('dotenv/config');

// Low-memory V8 settings (can be overridden by NODEJS_V8_ARGS env var)
// --optimize_for_size: Tell V8 to optimize for memory usage over speed
// --max_old_space_size: Can be set at runtime via WEB_MEMORY env var (see startup.sh/startup.cmd)
const defaultV8Args = '--optimize_for_size';

const v8Args = process.env.NODEJS_V8_ARGS || defaultV8Args;

// Parse WEB_MEMORY if provided and calculate max_old_space_size
let memoryArgs = '';
if (process.env.WEB_MEMORY) {
  const webMemory = parseInt(process.env.WEB_MEMORY, 10);
  if (!isNaN(webMemory) && webMemory > 0) {
    // 4/5 (80%) of available memory - optimum value to ensure V8 uses all available memory without OOM
    const maxOldSpaceSize = Math.floor((webMemory * 4) / 5);
    memoryArgs = `--max_old_space_size=${maxOldSpaceSize}`;
    console.log(`[startup] WEB_MEMORY=${webMemory}MB -> max_old_space_size=${maxOldSpaceSize}MB`);
  }
}

// Combine all V8 flags
const allV8Args = [v8Args, memoryArgs].filter(Boolean).join(' ');

// Start the bot with V8 flags
// Note: V8 flags must be passed before the script name
if (allV8Args) {
  console.log(`[startup] Starting with V8 args: ${allV8Args}`);
  // We need to re-exec node with the V8 flags pointing to the ACTUAL entry point (index.js), not this start script
  const { spawn } = await import('child_process');
  const mainEntry = resolve(__dirname, 'index.js');
  const child = spawn(process.execPath, [...allV8Args.split(' '), mainEntry], {
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code) => process.exit(code));
  child.on('error', (err) => {
    console.error('[startup] Failed to spawn:', err);
    process.exit(1);
  });
} else {
  // No V8 flags needed, import directly
  import('./index.js').catch(console.error);
}
