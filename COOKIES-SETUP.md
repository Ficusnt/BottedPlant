# YouTube/SoundCloud Cookie Setup for BottedPlant

## Why Cookies Are Needed

YouTube aggressively blocks automated requests that don't appear to come from a real browser. Without cookies, yt-dlp hits the **"Sign in to confirm you're not a bot"** wall, causing extraction failures for:

- Age-restricted content
- Region-locked videos
- High-traffic searches
- Any request that triggers bot detection

Cookies from your logged-in browser session prove to YouTube that the request comes from a real user, bypassing most blocks.

---

## Cookie Priority (Highest → Lowest)

| Method | Env Variable | Description |
|--------|--------------|-------------|
| **1. Custom cookie file** | `YTDLP_COOKIES_FILE` | Explicit Netscape-format file (recommended) |
| **2. Browser extraction** | `COOKIE_BROWSER` | Auto-extract from browser profile |
| **3. Embed fallback** | *(none)* | No cookies — uses yt-dlp's embed hack (unreliable) |

The bot automatically detects and uses the highest-priority available method.

---

## Method 1: Browser Extension Export (Recommended)

**Most reliable — works with any browser, no DPAPI issues.**

### Steps

1. **Install a cookie editor extension:**
   - Chrome/Edge/Brave/Vivaldi: [Cookie Editor](https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm) or [EditThisCookie](https://chromewebstore.google.com/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg)
   - Firefox: [Cookie Editor](https://addons.mozilla.org/en-US/firefox/addon/cookie-editor/) or [Cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/)

2. **Log into YouTube** in that browser (and SoundCloud/Bandcamp if desired)

3. **Export cookies** in **Netscape format** (`.txt`):
   - Cookie Editor: Click extension → "Export" → choose "Netscape" format
   - EditThisCookie: Click extension → "Export" → "Netscape"
   - Cookies.txt: Click extension → "Export" → saves as `cookies.txt`

4. **Save the file** to the project's `data/` folder:
   ```
   BottedPlant/
   └── data/
       └── cookies-yt.txt    # <-- your exported file
   ```

5. **Configure `.env`:**
   ```env
   YTDLP_COOKIES_FILE=data/cookies-yt.txt
   ```

6. **Restart the bot** — it will pick up the new file automatically.

### Pro Tips

- Export **only** the domains you need (`.youtube.com`, `.soundcloud.com`, `.bandcamp.com`) to keep the file clean
- The `generate-cookies` script (Method 3) can filter an exported file for you
- Cookies expire — re-export every few weeks or when YouTube errors return

---

## Method 2: yt-dlp Browser Extraction

**Convenient but has significant caveats.**

### How It Works

Set `COOKIE_BROWSER` in `.env` to one of:
```env
COOKIE_BROWSER=firefox      # or chrome, edge, opera, brave, vivaldi, safari
```

yt-dlp will locate the browser's cookie database, decrypt it, and extract YouTube/SoundCloud/Bandcamp cookies on each request.

### ⚠️ Critical Caveats

| Issue | Details |
|-------|---------|
| **Browser MUST be closed** | Browsers lock their SQLite cookie DB while running. yt-dlp will fail with "database is locked" if the browser is open. |
| **Brave/Chrome DPAPI unsupported** | On Windows, Chrome and Brave encrypt cookies with DPAPI. yt-dlp **cannot decrypt them**. This method **will not work** for Brave/Chrome on Windows. Firefox, Edge (non-DPAPI), and Safari work fine. |
| **Profile selection** | yt-dlp uses the default profile. If you have multiple profiles, it may pick the wrong one. |
| **Slower startup** | Cookie extraction runs on every yt-dlp invocation, adding latency. |

### When to Use This Method

- Firefox on any OS
- Safari on macOS
- Edge (Chromium) on Windows — *may* work if not using DPAPI
- Quick testing only — not recommended for production

---

## Method 3: Automated Generation Script

**Runs yt-dlp's browser extraction once, filters to relevant domains, saves to file.**

### Usage

```bash
# 1. CLOSE YOUR BROWSER completely (all windows)
# 2. Run:
npm run generate-cookies
```

This executes `scripts/generate-cookies.js` which:
1. Uses `@distube/yt-dlp` to extract cookies from the browser specified in `COOKIE_BROWSER` (or auto-detects)
2. Filters to only `youtube.com`, `soundcloud.com`, `bandcamp.com` domains
3. Writes filtered cookies to `data/cookies-yt.txt` (overwrites)
4. Sets `YTDLP_COOKIES_FILE=data/cookies-yt.txt` as the active method

### Requirements

- `COOKIE_BROWSER` must be set in `.env` (or the script will attempt auto-detection)
- Target browser **must be closed**
- Same DPAPI limitation applies — won't work for Brave/Chrome on Windows

### Output Example

```
🍪 Generating YouTube cookies for yt-dlp...
[generate] Using browser: firefox
[generate] Extracted 47 cookies from firefox
[generate] Filtered cookies in-place: 12 relevant cookies kept (youtube/soundcloud/bandcamp)
✅ Cookies saved to data/cookies-yt.txt
💡 Add to .env: YTDLP_COOKIES_FILE=data/cookies-yt.txt
```

---

## Cookie File Format (Netscape)

The bot expects **Netscape HTTP Cookie File** format (tab-separated, 7 fields):

```
# Netscape HTTP Cookie File
# This file is generated by yt-dlp.  Do not edit.

.youtube.com	TRUE	/	TRUE	1792904276	GPS	1
.youtube.com	TRUE	/	FALSE	0	PREF	hl=en&tz=UTC
.youtube.com	TRUE	/	TRUE	1808454485	VISITOR_INFO1_LIVE	isc3hw2oo1U
```

| Field | Description |
|-------|-------------|
| 1 | Domain (`.youtube.com` = all subdomains) |
| 2 | Include subdomains (`TRUE`/`FALSE`) |
| 3 | Path (`/` = all paths) |
| 4 | Secure only (`TRUE` = HTTPS only) |
| 5 | Expiration (Unix timestamp, `0` = session) |
| 6 | Cookie name |
| 7 | Cookie value |

Lines starting with `#` are comments. Blank lines are ignored.

### Required Cookies for YouTube

At minimum, you need these cookies (names may vary):
- `VISITOR_INFO1_LIVE` — session identifier
- `VISITOR_PRIVACY_METADATA` — privacy consent
- `YSC` — session token
- `__Secure-ROLLOUT_TOKEN` / `__Secure-YNID` — anti-bot tokens

The `generate-cookies` script and browser extensions handle this automatically.

---

## Configuration Reference

### `.env` Variables

```env
# Option A: Custom cookie file (recommended)
YTDLP_COOKIES_FILE=data/cookies-yt.txt

# Option B: Browser extraction
COOKIE_BROWSER=firefox      # chrome, firefox, edge, opera, brave, vivaldi, safari
```

### In Code (`src/config.js`)

```javascript
// Loaded automatically at startup
const cookiesFile = process.env.YTDLP_COOKIES_FILE;
const cookieBrowser = process.env.COOKIE_BROWSER;

// Passed to yt-dlp options in musicCommands.js
const ytdlpOptions = {
  cookies: cookiesFile,           // if YTDLP_COOKIES_FILE set
  cookiesFromBrowser: cookieBrowser,  // if COOKIE_BROWSER set
};
```

---

## Troubleshooting

### "Sign in to confirm you're not a bot" still appears

1. **Cookies expired** — Re-export (Method 1) or re-run `npm run generate-cookies`
2. **Wrong domain** — Ensure file contains `.youtube.com` cookies (not `www.youtube.com` only)
3. **Browser still open** — Close **all** browser windows before Method 2/3
4. **DPAPI encryption** — Switch to Firefox or use Method 1 (extension export)
5. **File not found** — Verify path in `.env` matches actual file location (relative to project root)

### Verify cookies are working

```bash
# Test yt-dlp directly with your cookies
npx yt-dlp --cookies data/cookies-yt.txt -j "https://www.youtube.com/watch?v=dQw4w9WgXcQ" | head -20
```

Should return JSON with video info, not an error.

### Check cookie expiration

```bash
# View expiration timestamps in human-readable format
awk -F'\t' '!/^#/ && $5 > 0 {print $1, $6, strftime("%Y-%m-%d %H:%M:%S", $5)}' data/cookies-yt.txt
```

Expired cookies (timestamp in past) will be ignored by yt-dlp.

---

## Security Considerations

| Risk | Mitigation |
|------|------------|
| **Cookie theft** = account access | Never commit `cookies*.txt` to git (`.gitignore` excludes them) |
| **Shared machine** | Use a dedicated browser profile for bot cookies |
| **Long-lived sessions** | Re-export monthly; YouTube rotates tokens |
| **Accidental exposure** | Don't share screenshots/logs containing cookie values |

### `.gitignore` (already configured)

```
data/cookies*.txt
.env
```

---

## Quick Checklist

- [ ] Choose method: Extension export (Method 1) recommended
- [ ] Export cookies from logged-in YouTube session
- [ ] Save as `data/cookies-yt.txt` (Netscape format)
- [ ] Set `YTDLP_COOKIES_FILE=data/cookies-yt.txt` in `.env`
- [ ] Restart bot: `npm start`
- [ ] Test: `/bp play never gonna give you up`
- [ ] If errors persist → check expiration, re-export

---

## Related Files

- `scripts/generate-cookies.js` — Automated extraction + filtering
- `src/config.js` — Loads cookie config from `.env`
- `src/commands/musicCommands.js` — Passes cookies to yt-dlp
- `.env.example` — Template with cookie options documented