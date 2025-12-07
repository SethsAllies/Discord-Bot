# Discord Bot Ecosystem

## Overview
A comprehensive Discord bot ecosystem featuring:
- **All-in-One Discord Bot** - 400+ commands including moderation, music, leveling, economy, games, and more
- **Modmail Bot** - Dedicated DM-based ticket system for user support
- **Dashboard Website** - Beautiful web interface with Discord OAuth login, server management, and real-time status

## Project Structure
```
/
├── src/                    # Main Discord bot
│   ├── commands/           # Bot commands organized by category
│   ├── events/             # Discord.js event handlers
│   ├── handlers/           # Various handlers (music, games, etc.)
│   ├── database/           # MongoDB models and connection
│   └── bot.js              # Main bot entry point
├── modmail/                # Modmail bot
│   └── bot.js              # Modmail bot entry point
├── website/                # Dashboard website
│   ├── public/             # Static assets (CSS, JS)
│   ├── views/              # EJS templates
│   ├── routes/             # Express routes
│   ├── db/                 # PostgreSQL database layer
│   └── server.js           # Express server entry point
└── index.js                # Main entry point (runs all services)
```

## Technology Stack
- **Runtime**: Node.js 20
- **Discord Library**: discord.js v14
- **Web Framework**: Express.js
- **Template Engine**: EJS
- **Databases**: 
  - MongoDB (bot data)
  - PostgreSQL (website/dashboard)
- **Authentication**: Passport.js with Discord OAuth2

## Required Environment Variables

### Discord Bot Secrets
- `DISCORD_TOKEN` - Main bot token
- `DISCORD_TOKEN1` - Modmail bot token
- `MONGO_TOKEN` - MongoDB connection string

### OAuth & Website
- `DISCORD_CLIENT_ID` - Discord application client ID
- `DISCORD_CLIENT_SECRET` - Discord application client secret
- `SESSION_SECRET` - Express session secret

### Optional
- `UPTIMEROBOT_API_KEY` - UptimeRobot API key for status monitoring
- `SPOTIFY_CLIENT_ID` - Spotify API client ID
- `SPOTIFY_CLIENT_SECRET` - Spotify API client secret
- `WEBHOOK_ID` - Discord webhook ID for logging
- `WEBHOOK_TOKEN` - Discord webhook token

## Running the Project
The project runs three services:
1. **Website** (Port 5000) - Dashboard and API
2. **Main Bot** - Discord bot with all features
3. **Modmail Bot** - Separate modmail system

All services start from `index.js`.

## Key Features

### Main Bot
- Moderation (ban, kick, timeout, warn, etc.)
- Music (YouTube, Spotify, Deezer, Apple Music)
- Leveling system with role rewards
- Economy with shops and gambling
- Giveaways and tickets
- Reaction roles
- Server statistics
- Fun commands and games
- Image generation
- And 400+ more commands!

### Modmail Bot
- DM-based ticket creation
- Staff replies through ticket channels
- Ticket transcripts stored in database
- Multi-server support

### Dashboard Website
- Blue/black gradient design with animations
- Discord OAuth2 login
- Server management
- Real-time bot status
- UptimeRobot integration

## Recent Changes
- 2024-12-07: Added modmail bot
- 2024-12-07: Created dashboard website
- 2024-12-07: Added PostgreSQL database for website
- 2024-12-07: Integrated UptimeRobot status monitoring
