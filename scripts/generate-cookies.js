#!/usr/bin/env node

const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const execFileAsync = promisify(execFile);

// Filter cookies to only keep relevant domains
function filterCookies(cookieFile) {
  if (!fs.existsSync(cookieFile)) return false;
  
  const content = fs.readFileSync(cookieFile, 'utf8');
  const lines = content.split('\n');
  const filtered = lines.filter(line => {
    // Keep comments and blank lines
    if (line.startsWith('#') || line.trim() === '') return true;
    // Keep only relevant domain cookies
    return line.includes('.youtube.com\t') 
        || line.includes('.soundcloud.com\t') 
        || line.includes('.bandcamp.com\t');
  });
  
  const commentLines = lines.filter(l => l.startsWith('#') || l.trim() === '').length;
  if (filtered.length <= commentLines) {
    console.log('[generate] No relevant cookies found after filtering');
    return false;
  }
  
  // Write filtered cookies BACK to the same file
  fs.writeFileSync(cookieFile, filtered.join('\n'), 'utf8');
  console.log(`[generate] Filtered cookies in-place: ${filtered.length - commentLines} relevant cookies kept (youtube/soundcloud/bandcamp)`);
  return true;
}

async function generateCookies() {
  console.log('🍪 Generating YouTube cookies for yt-dlp...');

  // Check if yt-dlp is available
  const ytDlpPath = path.join(__dirname, '..', 'node_modules', '@distube', 'yt-dlp', 'bin', 'yt-dlp.exe');

  if (!fs.existsSync(ytDlpPath)) {
    console.error('❌ yt-dlp not found. Please run `npm install` first.');
    process.exit(1);
  }

  // Create data directory if it doesn't exist
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('📁 Created data directory');
  }

  // Use YTDLP_COOKIES_FILE from .env, fallback to data/cookies.txt
  const cookieFile = process.env.YTDLP_COOKIES_FILE 
    ? path.resolve(process.env.YTDLP_COOKIES_FILE)
    : path.join(dataDir, 'cookies.txt');

  try {
    // Try to get cookies from different browsers
    const browsers = ['edge', 'firefox', 'chrome', 'brave', 'vivaldi', 'opera', 'safari'];

    for (const browser of browsers) {
      try {
        console.log(`🔍 Trying to get cookies from ${browser}...`);
        await execFileAsync(ytDlpPath, [
          '--cookies-from-browser', browser,
          '--cookies', cookieFile,
          '--dump-single-json',
          'https://www.youtube.com'
        ], {
          timeout: 30000,
          maxBuffer: 10 * 1024 * 1024
        });

        if (fs.existsSync(cookieFile) && fs.statSync(cookieFile).size > 0) {
          console.log(`✅ Successfully generated cookies from ${browser}`);
          console.log(`📄 Cookies saved to: ${cookieFile}`);
          
          // Filter to keep only relevant domains
          filterCookies(cookieFile);
          
          console.log('💡 You can now use YouTube without bot detection issues!');
          return;
        }
      } catch (error) {
        console.log(`❌ Failed to get cookies from ${browser}: ${error.message}`);
        // Continue to next browser
      }
    }

    console.error('❌ Failed to generate cookies from any browser');
    console.log('💡 Please make sure:');
    console.log('  1. Your browser is CLOSED completely');
    console.log('  2. You are logged in to YouTube in your browser');
    console.log('  3. Try running with administrator privileges');
    console.log('  4. For Brave/Chrome on Windows, cookies are DPAPI encrypted and may not work');
    console.log('  5. Firefox/Edge are recommended for cookie export');

  } catch (error) {
    console.error('❌ Error generating cookies:', error);
    process.exit(1);
  }
}

generateCookies();