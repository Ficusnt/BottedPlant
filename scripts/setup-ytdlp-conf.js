const fs = require('fs');
const path = require('path');

// Load config to get the resolved cookies file (respects YTDLP_COOKIES_FILE env var)
const config = require('../src/config');

const conf = path.join(__dirname, '..', 'node_modules', '@distube', 'yt-dlp', 'bin', 'yt-dlp.conf');

let content;
if (config.cookiesFile && fs.existsSync(config.cookiesFile)) {
  // Use the cookie file directly (already filtered by generate-cookies.js)
  content = `# YouTube cookie-based authentication (recommended)
# This bypasses bot detection by using authenticated browser cookies
--cookies "${config.cookiesFile.replace(/\\/g, '\\\\')}"
--extractor-args "youtube:player_client=web"
--extractor-args "youtube:client=web"
-f bestaudio/best
`;
  console.log(`[setup] Using cookies: ${config.cookiesFile}`);
} else {
  content = `# Modern YouTube bot detection bypass without cookies
# Fallback to embed hack when cookies are not available
--extractor-args "youtube:player_client=web_embedded"
--extractor-args "youtube:client=web"
--extractor-args "youtube:skip=hls,dash"
--extractor-args "youtube:youtube_include_dash_manifest=0"
--extractor-args "youtube:youtube_include_hls_manifest=0"
--extractor-args "youtube:youtube_include_mp4_manifest=1"
--extractor-args "youtube:youtube_include_thumbnails=1"
-f bestaudio/best
`;
  if (config.cookiesFile) {
    console.log('[setup] Cookie file specified but not found:', config.cookiesFile);
  } else {
    console.log('[setup] No cookie file configured (YTDLP_COOKIES_FILE not set)');
  }
}

try {
  fs.writeFileSync(conf, content, 'utf8');
  console.log(`[setup] Created yt-dlp.conf`);
} catch (e) {
  console.warn('[setup] Skipped:', e.message);
}

// Also patch @distube/yt-dlp to remove deprecated --no-call-home flag
// (new yt-dlp prints deprecation to stdout, breaking JSON parsing)
const pluginFile = path.join(__dirname, '..', 'node_modules', '@distube', 'yt-dlp', 'dist', 'index.js');
if (fs.existsSync(pluginFile)) {
  let src = fs.readFileSync(pluginFile, 'utf8');
  if (src.includes('noCallHome: true')) {
    src = src.replace(/noCallHome: true,\s*/g, '');
    fs.writeFileSync(pluginFile, src, 'utf8');
    console.log('[setup] Patched @distube/yt-dlp (removed --no-call-home)');
  } else {
    console.log('[setup] @distube/yt-dlp already patched');
  }
}
