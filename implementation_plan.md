# Implementation Plan

## Overview

This plan addresses six major improvements for BottedPlant: (1) ESBuild integration for fast bundling, (2) low-memory Node.js optimizations per Tom Spencer's guide, (3) completing the ESM migration, (4) pnpm-compliant architecture, (5) fixing Distube/FFmpeg YouTube playback issues and evaluating alternatives, and (6) a full code audit for bugs and errors.

## Types

- **BuildConfig**: ESBuild configuration type (entryPoints, bundle, platform, target, outdir, format, external, plugins)
- **MemoryConfig**: Node.js flags for low-memory environments (`--max-old-space-size`, `--optimize-for-size`, `--gc-interval`)
- **AudioBackend**: Abstract interface for audio extraction (search, extractInfo, getStream) to enable Distube alternatives
- **PnpmWorkspaceConfig**: pnpm-workspace.yaml structure for monorepo-ready layout

## Files

### New Files
- `esbuild.config.js` — ESBuild configuration for production bundling
- `esbuild.dev.config.js` — ESBuild configuration for development (watch mode, sourcemaps)
- `pnpm-workspace.yaml` — pnpm workspace configuration
- `scripts/build.js` — Build script using ESBuild
- `scripts/dev.js` — Development script with ESBuild watch mode
- `.npmrc` — pnpm configuration (shamefully-hoist, auto-install-peers)
- `Dockerfile.lowmem` — Dockerfile optimized for low-memory environments
- `src/audio/backends/` — Audio backend abstraction layer
  - `index.js` — Backend registry and factory
  - `distube-backend.js` — Current Distube implementation
  - `yt-dlp-backend.js` — Direct yt-dlp implementation (alternative)
  - `lavalink-backend.js` — Lavalink client implementation (alternative)
- `src/audio/types.js` — TypeScript/JSDoc types for audio backend interface

### Modified Files
- `package.json` — Update scripts, add pnpm fields, update engines, move devDependencies appropriately
- `package-lock.json` — Regenerate via `pnpm install` (or remove and let pnpm create pnpm-lock.yaml)
- `src/index.js` — Use audio backend abstraction; apply low-memory flags
- `src/ffmpeg.js` — Improve FFmpeg detection, add better error reporting for YouTube playback
- `src/config.js` — Add audio backend selection config
- `babel.config.json` — Remove (replaced by ESBuild)
- `jest.config.js` — Update for ESBuild-transformed code
- `tsconfig.json` — Update for ESBuild compatibility
- `.gitignore` — Add build artifacts, pnpm-store
- `.env.example` — Add audio backend config options
- `README.md` — Document new build system, pnpm usage, audio backend options

### Files to Delete
- `babel.config.json` (replaced by ESBuild)
- Any `.bak` files in src/
## Functions

### New Functions
- `build()` in `scripts/build.js` — ESBuild production build
- `dev()` in `scripts/dev.js` — ESBuild watch mode dev server
- `createAudioBackend(type, config)` in `src/audio/backends/index.js` — Factory function
- `search()`, `extractInfo()`, `getStream()` in each backend implementation
- `detectFfmpegPath()` enhancements in `src/ffmpeg.js` — Better Windows support, version validation
- `validateAudioBackend()` in `src/index.js` — Startup validation

### Modified Functions
- `main()` in `src/index.js` — Initialize audio backend from config, apply memory flags early
- `getFfmpegPath()` in `src/ffmpeg.js` — More robust detection, log actionable errors
- Distube event handlers in `src/index.js` — Migrate to backend-agnostic events
- `setup-ytdlp-conf.js` — Make backend-agnostic

### Removed Functions
- Direct Distube imports from command handlers (migrate to backend interface)

## Classes

### New Classes
- `AudioBackend` (abstract base) in `src/audio/types.js` — Interface definition
- `DistubeBackend` in `src/audio/backends/distube-backend.js` — Wraps current Distube
- `YtDlpBackend` in `src/audio/backends/yt-dlp-backend.js` — Direct yt-dlp CLI wrapper
- `LavalinkBackend` in `src/audio/backends/lavalink-backend.js` — Lavalink WebSocket client
## Dependencies

### Add
- `esbuild` — Fast bundler (devDependency)
- `esbuild-plugin-copy` — Copy static assets (devDependency)
- `pnpm` — Package manager (not a runtime dependency)
- `@lavalink/client` — Lavalink client (optional, for LavalinkBackend)
- `ws` — WebSocket for Lavalink (optional)

### Update
- `distube` — Keep for DistubeBackend, but make optional
- `@distube/yt-dlp` — Keep for yt-dlp backend
- `@distube/soundcloud` — Keep for DistubeBackend
- `ffmpeg-static` — Keep as fallback
- Remove `@babel/*`, `babel-jest` (replaced by ESBuild)

### pnpm-Specific
- `pnpm-workspace.yaml` defines workspace
- `.npmrc` configures `shamefully-hoist=true`, `auto-install-peers=true`, `prefer-offline=true`
- All dependencies hoisted to root `node_modules` for Discord.js compatibility

## Testing

- **Unit tests**: Existing Jest tests updated to work with ESBuild-transformed output
- **Integration tests**: Audio backend contract tests (each backend implements same interface)
- **Smoke test**: `pnpm run build && node dist/index.js --version` validates build
- **Memory test**: Run with `--max-old-space-size=128` to verify low-memory config
- **Audio backend test**: Test each backend with YouTube/SoundCloud/Bandcamp URLs

## Implementation Order

1. **ESBuild Integration** (foundational)
   - Create `esbuild.config.js` and `esbuild.dev.config.js`
   - Add build/dev scripts to package.json
   - Test build output runs correctly
   - Remove babel.config.json

2. **Complete ESM Migration**
   - Ensure all imports use `.js` extensions
   - Verify no CommonJS `require()` remains
   - Update package.json `type: module` (already set)
   - Regenerate lockfile with pnpm

3. **pnpm-Compliant Architecture**
   - Create `pnpm-workspace.yaml`
   - Create `.npmrc` with hoisting config
   - Run `pnpm install` to generate `pnpm-lock.yaml`
   - Remove `package-lock.json`
   - Update CI/docs for pnpm

4. **Low-Memory Node.js Optimizations**
   - Add `--max-old-space-size=256` (configurable) to start scripts
   - Add `--optimize-for-size` flag
   - Configure V8 heap limits in Dockerfile
   - Document memory profiling approach

5. **Audio Backend Abstraction & Distube Fixes**
   - Create `src/audio/backends/` with interface and DistubeBackend
   - Refactor `src/index.js` to use backend factory
   - Improve `src/ffmpeg.js` detection and error messages
   - Fix yt-dlp config for YouTube bot detection
   - Implement `YtDlpBackend` as lighter alternative
   - Document LavalinkBackend as future option

6. **Full Code Audit**
   - Run `eslint --ext .js src/` (add eslint if needed)
   - Check for: unhandled rejections, memory leaks, race conditions in dataStore
   - Audit reminder scheduling (setInterval leak potential)
   - Validate all Discord.js interactions have proper error handling
   - Check phraseManager for XSS/injection via template slots
   - Verify economy commands for race conditions (balance updates)
   - Review shitpost cooldown logic for bypass potential

## Validation Steps

After each phase:
1. `pnpm run build` succeeds
2. `pnpm run start` launches bot without errors
3. `/bp play` works with YouTube URL
4. `pnpm test` passes
5. Memory usage < 300MB under load