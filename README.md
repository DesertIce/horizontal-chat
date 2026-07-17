# Horizontal Chat

Horizontal Chat is a browser-source widget for [Streamer.bot](https://streamer.bot/) that displays Twitch and YouTube chat in a compact, single-line layout. It can also surface subscriptions, raids, channel point redemptions, memberships, tips, and other stream events.

## Features

- Twitch chat, cheers, announcements, subscriptions, raids, channel point redemptions, and shared chat
- YouTube chat, Super Chats, Super Stickers, and memberships
- Streamlabs, StreamElements, Patreon, Ko-fi, TipeeeStream, and Fourthwall events
- Optional platform icons, avatars, timestamps, badges, pronouns, and Twitch user flags
- Configurable colors, opacity, font, message lifetime, ignored users, and command filtering
- Consecutive-message grouping and automatic handling of chat moderation events
- Static HTML, CSS, and JavaScript with no build step

## Requirements

- [Streamer.bot](https://streamer.bot/) with the WebSocket server enabled
- Twitch, YouTube, and any desired donation services connected in Streamer.bot
- OBS Studio or another application that supports browser sources

The widget connects to Streamer.bot at `127.0.0.1:8080` by default. The address and port can be changed in the advanced settings.

## Setup

1. Enable the WebSocket server in Streamer.bot.
2. Open the [hosted settings page](https://desertice.github.io/horizontal-chat/settings/).
3. Choose which events and visual elements to display.
4. Copy the generated widget URL.
5. Add a Browser Source in OBS and use the generated URL.

Keep Streamer.bot running while the browser source is active. A connection status message is shown when the widget cannot reach Streamer.bot.

## Configuration

Settings are stored in the widget URL as query parameters, so no account or server-side configuration is required. The settings page exposes options for:

- Appearance, including font, size, background, and visible user metadata
- Message filtering and automatic hiding
- Twitch and YouTube event types
- Donation and membership integrations
- Streamer.bot's WebSocket address and port

For example, this local URL enables pronouns and hides messages after 15 seconds:

```text
http://localhost:8000/?showPronouns=true&hideAfter=15
```

## Local development

There is no dependency installation or build step. Serve the repository with any static file server; for example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/` and supply any desired settings as query parameters. The widget loads its Streamer.bot client, pronoun support, and Twitch flag support from their hosted scripts.

Run the test suite with a current version of Node.js:

```bash
node --test
```

Pushing to `main` deploys the repository to GitHub Pages through the included workflow. Forks must configure GitHub Pages to use GitHub Actions.

## Credits

This project is based on [nuttylmao/horizontal-chat](https://github.com/nuttylmao/horizontal-chat) and uses [BetterPronounsJS](https://github.com/DesertIce/BetterPronounsJS) and [TwitchFlagsJS](https://github.com/DesertIce/TwitchFlagsJS).

## License

Horizontal Chat is licensed under the [GNU General Public License v3.0](LICENSE).
