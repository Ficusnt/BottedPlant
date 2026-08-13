#!/usr/bin/env node

const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execFileAsync = promisify(execFile);

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

  const cookieFile = path.join(dataDir, 'cookies.txt');

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