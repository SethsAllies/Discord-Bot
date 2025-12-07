const express = require('express');
const router = express.Router();
const db = require('../db');
const axios = require('axios');

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
}

router.get('/user', isAuthenticated, (req, res) => {
    res.json({
        id: req.user.id,
        username: req.user.username,
        avatar: req.user.avatar,
        discriminator: req.user.discriminator,
        guilds: req.user.guilds?.filter(g => (g.permissions & 0x20) === 0x20)
    });
});

router.get('/guilds', isAuthenticated, (req, res) => {
    const adminGuilds = req.user.guilds?.filter(g => (g.permissions & 0x20) === 0x20) || [];
    res.json(adminGuilds);
});

router.get('/guild/:id', isAuthenticated, async (req, res) => {
    try {
        const guild = req.user.guilds?.find(g => g.id === req.params.id);
        if (!guild || !((guild.permissions & 0x20) === 0x20)) {
            return res.status(403).json({ error: 'No access to this server' });
        }

        const settings = await db.getGuildSettings(req.params.id);
        res.json({ guild, settings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/guild/:id/settings', isAuthenticated, async (req, res) => {
    try {
        const guild = req.user.guilds?.find(g => g.id === req.params.id);
        if (!guild || !((guild.permissions & 0x20) === 0x20)) {
            return res.status(403).json({ error: 'No access to this server' });
        }

        const allowedFields = [
            'prefix', 'welcome_channel_id', 'welcome_message',
            'leave_channel_id', 'leave_message', 'log_channel_id',
            'modmail_enabled', 'modmail_category_id', 'leveling_enabled',
            'automod_enabled'
        ];

        const settings = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                settings[field] = req.body[field];
            }
        }

        await db.updateGuildSettings(req.params.id, settings);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/status', async (req, res) => {
    try {
        const mainBot = await db.getBotStatus('main');
        const modmailBot = await db.getBotStatus('modmail');

        const uptimeStatus = await getUptimeRobotStatus();

        res.json({
            mainBot: mainBot || { status: 'unknown' },
            modmailBot: modmailBot || { status: 'unknown' },
            uptime: uptimeStatus
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

async function getUptimeRobotStatus() {
    const apiKey = process.env.UPTIMEROBOT_API_KEY;
    if (!apiKey) {
        return { available: false };
    }

    try {
        const response = await axios.post('https://api.uptimerobot.com/v2/getMonitors', {
            api_key: apiKey,
            format: 'json'
        });

        if (response.data.stat === 'ok') {
            return {
                available: true,
                monitors: response.data.monitors.map(m => ({
                    id: m.id,
                    name: m.friendly_name,
                    status: m.status,
                    uptime: m.custom_uptime_ratio,
                    url: m.url
                }))
            };
        }
    } catch (error) {
        console.error('UptimeRobot API error:', error.message);
    }

    return { available: false };
}

router.get('/stats', async (req, res) => {
    try {
        const mainBot = await db.getBotStatus('main');
        const modmailBot = await db.getBotStatus('modmail');

        res.json({
            servers: (mainBot?.guilds_count || 0),
            users: (mainBot?.users_count || 0),
            commands: 400,
            uptime: '99.9%'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
