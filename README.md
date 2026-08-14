# BottedPlant 🌿

A Discord bot for music, reminders, and fun. 🎵⏰🎮

The bot plays audio from YouTube, SoundCloud, and Bandcamp. It sends reminders and birthday messages. It runs a leaf economy with bets. It replies with plant jokes.

> The bot talks as if it is a plant. It uses Argentinian (Rioplatense) Spanish. It makes puns about plants.

## Requirements 📋

- Node.js 18 or a newer version.
- A Discord bot token.
- `ffmpeg` is supplied by `ffmpeg-static`.

## Setup 🛠️

Do these steps in order:

1. Install the dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env`.
3. Open `.env`. Put your Discord token after `DISCORD_TOKEN=`.
4. Start the bot:

   ```bash
   npm start
   ```

5. Add the bot to your server. Use the OAuth2 URL from the Developer Portal.

## Commands 🤖

Use the slash menu. Type `/` and pick **bp**. All commands are native slash commands.

### 🎵 Music — `/bp music`

- `/bp music play <url>` — Play audio (YouTube, SoundCloud, Bandcamp, radio).
- `/bp music query <place> <title>` — Search and pick from a list. `<place>` = `youtube`, `soundcloud`, or `bandcamp`.
- `/bp music playlist <url>` — Add a full playlist to the queue.
- `/bp music skip` — Skip the current song.
- `/bp music rewind` — Play the current song again from the start.
- `/bp music queue` — Show the queue.
- `/bp music clear` — Empty the queue.
- `/bp music stop` — Stop and leave the voice channel.

### ⏰ Reminders and 🎂 birthdays — `/bp remember`

- `/bp remember remind <YYYY-MM-DD HH:MM> <message>` — Set a reminder.
- `/bp remember reminders` — List your pending reminders.
- `/bp remember cancelremind <id>` — Cancel a reminder by its ID.
- `/bp remember birthday <month> <day>` — Save your birthday.
- `/bp remember birthdays` — List all birthdays.

### 🎮 Fun — `/bp fun`

- `/bp fun status` — Change the bot status.
- `/bp fun hola` · `japish` · `goodgirl` · `avatar` — Short fun replies.
- `/bp fun rola [@user]` — Rate the Spotify song a user plays.
- `/bp fun latex <equation>` — Render a LaTeX equation as an image.
- `/bp fun safebooru <tags>` — Search images on Safebooru. 🖼️
- `/bp fun 8ball <question>` — Ask the magic 8-ball.
- `/bp fun roll <dice>` — Roll dice. Use `d20`, `2d6`, etc.
- `/bp fun coinflip` — Flip a coin. 🪙
- `/bp fun uwu <text>` — Uwuify text.

### 🍃 Leaves (economy) — `/bp leaves`

Leaves are the bot's currency. You earn them each day. You bet them on wagers.

- `/bp leaves daily` — "Water" the plant and earn leaves. A streak gives more. 💧
- `/bp leaves points [@user]` — Show the leaf balance and the streak.
- `/bp leaves leaderboard` — Top 10 users with the most leaves. 🏆
- `/bp leaves gamble <text>` — Make a wager. Format: `<statement> | <option 1> | <option 2>`.
- `/bp leaves bet <id> <choice> <amount>` — Bet leaves on a wager.
- `/bp leaves redeem <id> <choice>` — Close a wager and pay the winners.

## Data storage 💾

The bot stores data in `data/store.json`. This file holds reminders, birthdays, leaves, and bets. Back up this file to keep your data.

## Slash command registration 📝

The bot registers `/bp` when it starts. It registers per guild for instant updates. It also registers in a new guild on `guildCreate`. Restart the bot after you change the command definition.

## YouTube and yt-dlp 🔧

- YouTube blocks bots. The bot uses an embed hack. A config sets `player_client=web_embedded`.
- A setup script writes this config. It runs after `npm install`.
- Cookies are not required. Brave and Chrome encrypt their cookie store on Windows.

