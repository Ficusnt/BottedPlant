const fs = require('fs');
const path = require('path');

// Check if cookies file exists
const dataDir = path.join(__dirname, '..', 'data');
const cookieFile = path.join(dataDir, 'cookies.txt');
let hasCookies = false;

if (fs.existsSync(cookieFile) && fs.statSync(cookieFile).size > 0) {
  hasCookies = true;
  console.log('[setup] Detected cookies file - using cookie-based authentication');
}

const conf = path.join(__dirname, '..', 'node_modules', '@distube', 'yt-dlp', 'bin', 'yt-dlp.conf');

let content;
if (hasCookies) {
  content = `# YouTube cookie-based authentication (recommended)
# This bypasses bot detection by using authenticated browser cookies
--cookies "${cookieFile}"
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
