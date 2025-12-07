const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initializeDatabase() {
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schema);
        console.log('Database schema initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

async function query(text, params) {
    const client = await pool.connect();
    try {
        return await client.query(text, params);
    } finally {
        client.release();
    }
}

async function findOrCreateUser(profile, tokens) {
    const existingUser = await query(
        'SELECT * FROM users WHERE discord_id = $1',
        [profile.id]
    );

    if (existingUser.rows.length > 0) {
        await query(
            `UPDATE users SET 
                username = $1, 
                discriminator = $2, 
                avatar = $3, 
                email = $4,
                access_token = $5,
                refresh_token = $6,
                updated_at = CURRENT_TIMESTAMP
            WHERE discord_id = $7`,
            [
                profile.username,
                profile.discriminator,
                profile.avatar,
                profile.email,
                tokens.accessToken,
                tokens.refreshToken,
                profile.id
            ]
        );
        return { ...existingUser.rows[0], ...profile };
    }

    const newUser = await query(
        `INSERT INTO users (discord_id, username, discriminator, avatar, email, access_token, refresh_token)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
            profile.id,
            profile.username,
            profile.discriminator,
            profile.avatar,
            profile.email,
            tokens.accessToken,
            tokens.refreshToken
        ]
    );

    return newUser.rows[0];
}

async function getUserByDiscordId(discordId) {
    const result = await query('SELECT * FROM users WHERE discord_id = $1', [discordId]);
    return result.rows[0];
}

async function getGuildSettings(guildId) {
    const result = await query('SELECT * FROM guilds WHERE guild_id = $1', [guildId]);
    return result.rows[0];
}

async function updateGuildSettings(guildId, settings) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(settings)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
    }

    values.push(guildId);

    await query(
        `UPDATE guilds SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE guild_id = $${paramCount}`,
        values
    );
}

async function createOrUpdateGuild(guild) {
    const existing = await query('SELECT * FROM guilds WHERE guild_id = $1', [guild.id]);

    if (existing.rows.length > 0) {
        await query(
            `UPDATE guilds SET name = $1, icon = $2, updated_at = CURRENT_TIMESTAMP WHERE guild_id = $3`,
            [guild.name, guild.icon, guild.id]
        );
        return existing.rows[0];
    }

    const result = await query(
        `INSERT INTO guilds (guild_id, name, icon, owner_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [guild.id, guild.name, guild.icon, guild.ownerId]
    );

    return result.rows[0];
}

async function logBotStatus(botName, status, latency, guildsCount, usersCount) {
    await query(
        `INSERT INTO bot_status (bot_name, status, latency, guilds_count, users_count)
         VALUES ($1, $2, $3, $4, $5)`,
        [botName, status, latency, guildsCount, usersCount]
    );
}

async function getBotStatus(botName) {
    const result = await query(
        `SELECT * FROM bot_status WHERE bot_name = $1 ORDER BY recorded_at DESC LIMIT 1`,
        [botName]
    );
    return result.rows[0];
}

async function createModmailTicket(ticketData) {
    const result = await query(
        `INSERT INTO modmail_tickets (ticket_id, user_id, guild_id, channel_id, subject)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [ticketData.ticketId, ticketData.userId, ticketData.guildId, ticketData.channelId, ticketData.subject]
    );
    return result.rows[0];
}

async function addModmailMessage(messageData) {
    await query(
        `INSERT INTO modmail_messages (ticket_id, author_id, author_name, content, attachments, is_staff)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
            messageData.ticketId,
            messageData.authorId,
            messageData.authorName,
            messageData.content,
            messageData.attachments || [],
            messageData.isStaff || false
        ]
    );
}

async function closeModmailTicket(ticketId, closedBy) {
    await query(
        `UPDATE modmail_tickets SET status = 'closed', closed_at = CURRENT_TIMESTAMP, closed_by = $1 WHERE id = $2`,
        [closedBy, ticketId]
    );
}

module.exports = {
    pool,
    query,
    initializeDatabase,
    findOrCreateUser,
    getUserByDiscordId,
    getGuildSettings,
    updateGuildSettings,
    createOrUpdateGuild,
    logBotStatus,
    getBotStatus,
    createModmailTicket,
    addModmailMessage,
    closeModmailTicket
};
