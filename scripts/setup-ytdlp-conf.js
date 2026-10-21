const fs = require('fs');
const path = require('path');

// Load config to get the resolved cookies file (respects YTDLP_COOKIES_FILE env var)
const config = require('../src/config');

const dataDir = path.join(__dirname, '..', 'data');
const conf = path.join(__dirname, '..', 'node_modules', '@distube', 'yt-dlp', 'bin', 'yt-dlp.conf');

// Filter cookies to only keep .youtube.com and .soundcloud.com domains
function filterCookies(sourcePath, destPath) {
  if (!fs.existsSync(sourcePath)) return false;
  
  const content = fs.readFileSync(sourcePath, 'utf8');
  const lines = content.split('\n');
  const filtered = lines.filter(line => {
    // Keep comments and blank lines
    if (line.startsWith('#') || line.trim() === '') return true;
    // Keep only .youtube.com and .soundcloud.com cookies
    return line.includes('.youtube.com\t') || line.includes('.soundcloud.com\t');
  });
  
  if (filtered.length <= lines.filter(l => l.startsWith('#') || l.trim() === '').length) {
    console.log('[setup] No relevant cookies found after filtering');
    return false;
  }
  
  fs.writeFileSync(destPath, filtered.join('\n'), 'utf8');
  console.log(`[setup] Filtered cookies: ${filtered.length - lines.filter(l => l.startsWith('#') || l.trim() === '').length} relevant cookies kept`);
  return true;
}

// Derive filtered cookie file name from source file name (respects YTDLP_COOKIES_FILE naming)
let filteredCookieFile = path.join(dataDir, 'cookies-filtered.txt');
if (config.cookiesFile) {
  const sourceName = path.basename(config.cookiesFile);
  const parsed = path.parse(sourceName);
  filteredCookieFile = path.join(dataDir, `${parsed.name}-filtered${parsed.ext}`);
}

const hasCookies = config.cookiesFile && filterCookies(config.cookiesFile, filteredCookieFile);

let content;
if (hasCookies) {
  content = `# YouTube cookie-based authentication (recommended)
# This bypasses bot detection by using authenticated browser cookies
--cookies "${filteredCookieFile}"
--extractor-args "youtube:player_client=web"
--extractor-args "youtube:client=web"
-f bestaudio/best
`;
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
}

try {
  fs.writeFileSync(conf, content, 'utf8');
  console.log(`[setup] Created yt-dlp.conf with ${hasCookies ? 'cookie-based authentication' : 'embed hack'}`);
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
