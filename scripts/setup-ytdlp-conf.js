const fs = require('fs');
const path = require('path');
const conf = path.join(__dirname, '..', 'node_modules', '@distube', 'yt-dlp', 'bin', 'yt-dlp.conf');
const content = '# Embed hack to bypass YouTube bot detection without cookies\n--extractor-args "youtube:player_client=web_embedded"\n-f bestaudio/best\n';
try { fs.writeFileSync(conf, content, 'utf8'); console.log('[setup] Created yt-dlp.conf with embed hack'); } catch (e) { console.warn('[setup] Skipped:', e.message); }

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
