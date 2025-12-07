-- Users table for Discord OAuth
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    discord_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    discriminator VARCHAR(10),
    avatar VARCHAR(255),
    email VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guilds/Servers table
CREATE TABLE IF NOT EXISTS guilds (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(255),
    owner_id VARCHAR(255) NOT NULL,
    prefix VARCHAR(10) DEFAULT '!',
    welcome_channel_id VARCHAR(255),
    welcome_message TEXT,
    leave_channel_id VARCHAR(255),
    leave_message TEXT,
    log_channel_id VARCHAR(255),
    modmail_enabled BOOLEAN DEFAULT false,
    modmail_category_id VARCHAR(255),
    leveling_enabled BOOLEAN DEFAULT true,
    automod_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Guild permissions (for dashboard access)
CREATE TABLE IF NOT EXISTS user_guilds (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    guild_id INTEGER REFERENCES guilds(id) ON DELETE CASCADE,
    permissions BIGINT DEFAULT 0,
    is_owner BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, guild_id)
);

-- Modmail tickets table
CREATE TABLE IF NOT EXISTS modmail_tickets (
    id SERIAL PRIMARY KEY,
    ticket_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    guild_id VARCHAR(255) NOT NULL,
    channel_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'normal',
    subject TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    closed_by VARCHAR(255)
);

-- Modmail messages table
CREATE TABLE IF NOT EXISTS modmail_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES modmail_tickets(id) ON DELETE CASCADE,
    author_id VARCHAR(255) NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    attachments TEXT[],
    is_staff BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bot status logs for uptime tracking
CREATE TABLE IF NOT EXISTS bot_status (
    id SERIAL PRIMARY KEY,
    bot_name VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    latency INTEGER,
    guilds_count INTEGER,
    users_count INTEGER,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session table for express-session with connect-pg-simple
CREATE TABLE IF NOT EXISTS "session" (
    "sid" VARCHAR NOT NULL COLLATE "default",
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,
    PRIMARY KEY ("sid")
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- Custom commands table
CREATE TABLE IF NOT EXISTS custom_commands (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    response TEXT NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guild_id, name)
);

-- Automod settings table
CREATE TABLE IF NOT EXISTS automod_settings (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(255) UNIQUE NOT NULL,
    anti_spam BOOLEAN DEFAULT false,
    anti_invite BOOLEAN DEFAULT false,
    anti_links BOOLEAN DEFAULT false,
    max_mentions INTEGER DEFAULT 5,
    max_lines INTEGER DEFAULT 10,
    ignored_channels TEXT[],
    ignored_roles TEXT[],
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
