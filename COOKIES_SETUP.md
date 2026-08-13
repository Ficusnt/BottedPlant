# YouTube Cookie Setup for BottedPlant

This guide explains how to set up YouTube cookies to bypass bot detection when using BottedPlant.

## Why Cookies?

YouTube has become more aggressive with bot detection, and the old "embed hack" approach is no longer reliable. Using authenticated cookies from your browser allows yt-dlp to access YouTube as a logged-in user, bypassing most bot detection mechanisms.

## Setup Instructions

### Option 1: Automatic Cookie Generation (Recommended)

1. **Close your browser completely** (this is important!)
2. Run the cookie generation script:
   ```bash
   npm run generate-cookies
   ```
3. The script will try different browsers automatically
4. If successful, cookies will be saved to `data/cookies.txt`

### Option 2: Manual Cookie Export

1. **Close your browser completely**
2. Run the following command (replace `edge` with your browser):
   ```bash
   npx yt-dlp --cookies-from-browser edge --cookies data/cookies.txt
   ```
   Supported browsers: `chrome`, `firefox`, `edge`, `opera`, `brave`, `vivaldi`, `safari`

3. Recommended browsers:
   - **Firefox** or **Edge** (best compatibility)
   - Avoid Chrome/Brave on Windows (cookies are DPAPI encrypted)

## Troubleshooting

### Common Issues

1. **"Browser is locked" error**
   - Make sure your browser is completely closed
   - No background processes should be running

2. **"No cookies found" error**
   - Make sure you're logged in to YouTube in your browser
   - Try visiting https://www.youtube.com and ensure you can see your account

3. **DPAPI encryption issues (Chrome/Brave on Windows)**
   - Chrome and Brave on Windows encrypt cookies with DPAPI
   - yt-dlp cannot decrypt these cookies
   - Use Firefox or Edge instead

### Verifying Cookies

To check if your cookies are working:
```bash
npx yt-dlp --cookies data/cookies.txt -f bestaudio "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

## How It Works

- The bot automatically detects `data/cookies.txt`
- If cookies are found, it uses cookie-based authentication
- If no cookies are found, it falls back to the embed hack
- The setup script runs automatically after `npm install`

## Security Notes

- Cookies are stored in plain text in `data/cookies.txt`
- Anyone with access to this file can impersonate you on YouTube
- Do not share this file with others
- Consider adding `data/cookies.txt` to your `.gitignore`