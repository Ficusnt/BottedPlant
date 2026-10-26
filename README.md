# BottedPlant

Discord bot for YouTube, SoundCloud, and Bandcamp audio — with a native slash command menu, reminders, economy, and dynamic phrase responses.

![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Discord.js](https://img.shields.io/badge/discord.js-14.27-blue)

---

## Features

- **Multi-source audio**: YouTube, SoundCloud, Bandcamp via yt-dlp (no API keys needed)
- **Slash command menu**: Native Discord UI — `/bp play`, `/bp queue`, `/bp remind`, `/bp economy`, etc.
- **YouTube bot-detection bypass**: Automatic cookie detection + embed fallback
- **Reminders**: One-time and recurring with natural-language parsing (`in 10m`, `every friday 18:00`)
- **Economy system**: Balance, daily, leaderboard, transfers, gambling
- **Dynamic phrases**: Template-based responses with slots, synonyms, and mannerisms
- **Seasonal content**: Automatic holiday/event phrase rotations
- **Shitpost mode**: Configurable random replies with cooldowns

---

## Prerequisites

- **Node.js** ≥ 18.0.0
- **FFmpeg** (bundled via `ffmpeg-static` — no system install required)
- A **Discord bot token** from the [Developer Portal](https://discord.com/developers/applications)

---

## Installation

```bash
# Clone the repository
git clone https://github.com/Ficusnt/BottedPlant
cd BottedPlant

# Install dependencies (auto-runs yt-dlp config setup)
npm install
```

The `postinstall` script runs `scripts/setup-ytdlp-conf.js` which configures `@distube/yt-dlp` to use the bundled binary.

---

## Configuration

Create a `.env` file in the project root (copy from `.env.example`):

```env
# Required
DISCORD_TOKEN=your_bot_token_here

# Optional
BOT_PREFIX=/bp              # Default: /bp
BOT_NAME=BottedPlant        # Default: BottedPlant

# YouTube bot-detection bypass (see COOKIES-SETUP.md for details)
# Option A: Custom cookie file (recommended)
YTDLP_COOKIES_FILE=data/cookies-yt.txt

# Option B: Browser extraction (browser MUST be closed)
# COOKIE_BROWSER=chrome      # or firefox, edge, opera, brave, vivaldi, safari
# Note: Brave/Chrome DPAPI encryption is NOT supported by yt-dlp
```

### Cookie Priority

1. `YTDLP_COOKIES_FILE` — explicit file path (highest priority)
2. `COOKIE_BROWSER` — extract from browser profile
3. **Embed fallback** — no cookies, less reliable (used automatically if neither above works)

---

## Usage

### Slash Commands (Primary)

| Command | Description |
|---------|-------------|
| `/bp play <query>` | Play from YouTube, SoundCloud, Bandcamp, or direct URL |
| `/bp queue` | Show current queue |
| `/bp skip` | Skip current track |
| `/bp pause` / `/bp resume` | Pause/resume playback |
| `/bp stop` | Stop and clear queue |
| `/bp leave` | Disconnect from voice |
| `/bp volume <0-200>` | Set volume |
| `/bp remind <time> <message>` | Set a reminder (e.g., `in 10m`, `every friday 18:00`) |
| `/bp remind list` | List your reminders |
| `/bp remind cancel <id>` | Cancel a reminder |
| `/bp balance` | Check your economy balance |
| `/bp daily` | Claim daily reward |
| `/bp leaderboard` | Show top balances |
| `/bp pay @user <amount>` | Transfer credits |
| `/bp gamble <amount>` | Gamble your credits |
| `/bp phrase <trigger>` | Test a phrase response |
| `/bp shitpost` | Toggle shitpost mode |

### Prefix Fallback

All slash commands also work with the prefix (default `/bp`):

```
/bp play never gonna give you up
/bp remind in 1h take a break
/bp balance
```

---

## Project Structure

```
BottedPlant/
├── src/
│   ├── index.js              # Entry point, Discord client, event handlers
│   ├── config.js             # Configuration loader (dotenv + defaults)
│   ├── logger.js             # Pino logger setup
│   ├── phraseManager.js      # Phrase templates, slots, synonyms, seasonal rotation
│   ├── dataStore.js          # JSON persistence (reminders, economy, phrases)
│   ├── economy.js            # Economy logic (balance, daily, gamble, leaderboard)
│   ├── embeds.js             # Discord embed builders
│   ├── cooldowns.js          # Command/user cooldown tracking
│   ├── contextSelector.js    # Smart context detection for phrases
│   ├── synonymEngine.js      # Synonym/mannerism expansion
│   ├── seasonalRotator.js    # Holiday/event phrase activation
│   ├── shitpost.js           # Random reply logic
│   ├── cmdLeave.js           # Voice disconnect handler
│   ├── bpCommand.js          # Legacy prefix command router
│   └── commands/
│       ├── commandFactory.js # Slash command definitions + registration
│       ├── musicCommands.js  # Audio playback handlers
│       ├── economyCommands.js
│       ├── funCommands.js
│       └── rememberCommands.js
├── data/
│   ├── phrases.json          # Phrase templates (source of truth)
│   ├── reminders.json        # Persisted reminders
│   ├── economy.json          # Economy balances
│   ├── cookies.txt           # Generic cookies (yt-dlp fallback)
│   └── cookies-yt.txt        # YouTube-specific cookies (recommended)
├── scripts/
│   ├── generate-cookies.js   # Extract/filter cookies from browser via yt-dlp
│   └── setup-ytdlp-conf.js   # Configure @distube/yt-dlp binary path
├── .env.example              # Template for .env
├── package.json
├── tsconfig.json             # TypeScript type-checking (jsdoc annotations)
├── jest.config.js            # Unit tests
└── babel.config.json         # Babel for Jest
```

---

## Development

```bash
# Start the bot
npm start

# Regenerate yt-dlp config (run after yt-dlp updates)
npm run setup

# Extract/filter cookies from browser for YouTube bypass
npm run generate-cookies
```

### Adding Phrases

Edit `data/phrases.json` — the bot hot-reloads on change. Structure:

```json
{
  "_global": {
    "synonyms": { "hello": ["hi", "hey", "hola"] },
    "mannerisms": { "greeting": ["*waves*", "*nods*"] }
  },
  "greeting": {
    "template": "Hello {user}! {mannerism:greeting}",
    "slots": { "user": ["there", "friend", "stranger"] },
    "contexts": ["dm", "mention", "join"]
  }
}
```

See `src/phraseManager.js` for full schema (templates, slots, synonyms, contexts, weights, cooldowns).

---

## Troubleshooting

### "Sign in to confirm you're not a bot" / YouTube errors
- Ensure cookies are configured (see **COOKIES-SETUP.md**)
- Run `npm run generate-cookies` with browser **closed**
- Verify `data/cookies-yt.txt` has recent YouTube cookies (check expiration timestamps)

### Voice connection fails
- Bot needs `CONNECT` and `SPEAK` permissions in the voice channel
- Check firewall/NAT if self-hosted (Discord voice uses UDP)

### yt-dlp extraction fails
- Run `npm run setup` to refresh the bundled binary
- Check `@distube/yt-dlp` version in `package.json`

### Slash commands not appearing
- Run `npm start` — commands auto-register on startup
- Ensure `DISCORD_TOKEN` is valid and bot has `applications.commands` scope

---

## License

MIT — see `LICENSE` for details.

---

## Credits

- [discord.js](https://discord.js.org/)
- [DisTube](https://distube.js.org/) + [@distube/yt-dlp](https://github.com/distube/yt-dlp)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — the real MVP
- [pino](https://getpino.io/) for logging