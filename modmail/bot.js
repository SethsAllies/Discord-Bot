const Discord = require('discord.js');
const chalk = require('chalk');
const db = require('../website/db');

const client = new Discord.Client({
    allowedMentions: {
        parse: ['users', 'roles'],
        repliedUser: true
    },
    partials: [
        Discord.Partials.Channel,
        Discord.Partials.Message,
        Discord.Partials.User,
        Discord.Partials.GuildMember
    ],
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMembers,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.DirectMessages,
        Discord.GatewayIntentBits.MessageContent
    ]
});

const activeTickets = new Map();
const config = {
    colors: {
        primary: 0x5865F2,
        success: 0x57F287,
        error: 0xED4245,
        warning: 0xFEE75C
    },
    categoryName: 'MODMAIL',
    logChannelName: 'modmail-logs'
};

client.once('ready', async () => {
    console.log(chalk.blue('Modmail Bot'), chalk.white('>>'), chalk.green(`Logged in as ${client.user.tag}`));
    
    client.user.setPresence({
        activities: [{ name: 'DM me for support!', type: Discord.ActivityType.Watching }],
        status: 'online'
    });

    try {
        await db.initializeDatabase();
        console.log(chalk.blue('Modmail Bot'), chalk.white('>>'), chalk.green('Database connected'));
    } catch (error) {
        console.log(chalk.red('Modmail Bot'), chalk.white('>>'), chalk.red('Database error:', error.message));
    }

    setInterval(() => {
        db.logBotStatus('modmail', 'online', client.ws.ping, client.guilds.cache.size, 
            client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0));
    }, 60000);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.channel.type === Discord.ChannelType.DM) {
        await handleDM(message);
    } else if (message.channel.name?.startsWith('ticket-')) {
        await handleTicketReply(message);
    }
});

async function handleDM(message) {
    const userId = message.author.id;
    
    let ticket = activeTickets.get(userId);
    
    if (!ticket) {
        const selectGuildEmbed = new Discord.EmbedBuilder()
            .setTitle('Support Request')
            .setDescription('Please select a server to contact:')
            .setColor(config.colors.primary);

        const mutualGuilds = client.guilds.cache.filter(guild => 
            guild.members.cache.has(userId) || guild.members.fetch(userId).catch(() => null)
        );

        if (mutualGuilds.size === 0) {
            return message.reply('You need to be in a server where I am also present to use modmail.');
        }

        if (mutualGuilds.size === 1) {
            const guild = mutualGuilds.first();
            ticket = await createTicket(message.author, guild, message.content);
            if (ticket) {
                activeTickets.set(userId, ticket);
            }
        } else {
            const options = mutualGuilds.map(guild => ({
                label: guild.name.substring(0, 100),
                value: guild.id,
                description: `${guild.memberCount} members`
            })).slice(0, 25);

            const selectMenu = new Discord.ActionRowBuilder()
                .addComponents(
                    new Discord.StringSelectMenuBuilder()
                        .setCustomId('select_guild')
                        .setPlaceholder('Select a server')
                        .addOptions(options)
                );

            const reply = await message.reply({ embeds: [selectGuildEmbed], components: [selectMenu] });
            
            const collector = reply.createMessageComponentCollector({ 
                componentType: Discord.ComponentType.StringSelect,
                time: 60000 
            });

            collector.on('collect', async (interaction) => {
                const guild = client.guilds.cache.get(interaction.values[0]);
                if (guild) {
                    ticket = await createTicket(message.author, guild, message.content);
                    if (ticket) {
                        activeTickets.set(userId, ticket);
                        await interaction.update({ 
                            content: 'Ticket created! Staff will respond shortly.', 
                            embeds: [], 
                            components: [] 
                        });
                    }
                }
            });

            return;
        }
    }

    if (ticket) {
        await forwardToTicket(ticket, message);
    }
}

async function createTicket(user, guild, initialMessage) {
    try {
        let category = guild.channels.cache.find(
            c => c.type === Discord.ChannelType.GuildCategory && c.name.toUpperCase() === config.categoryName
        );

        if (!category) {
            category = await guild.channels.create({
                name: config.categoryName,
                type: Discord.ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [Discord.PermissionFlagsBits.ViewChannel]
                    }
                ]
            });
        }

        const ticketId = `${Date.now()}-${user.id}`;
        const ticketChannel = await guild.channels.create({
            name: `ticket-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, ''),
            type: Discord.ChannelType.GuildText,
            parent: category.id,
            topic: `Modmail ticket for ${user.tag} (${user.id}) | Ticket ID: ${ticketId}`
        });

        const openEmbed = new Discord.EmbedBuilder()
            .setTitle('New Modmail Ticket')
            .setDescription(`**User:** ${user.tag}\n**User ID:** ${user.id}`)
            .addFields(
                { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
            )
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setColor(config.colors.primary)
            .setTimestamp();

        const closeButton = new Discord.ActionRowBuilder()
            .addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Close Ticket')
                    .setStyle(Discord.ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

        await ticketChannel.send({ embeds: [openEmbed], components: [closeButton] });

        if (initialMessage) {
            const messageEmbed = new Discord.EmbedBuilder()
                .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                .setDescription(initialMessage)
                .setColor(config.colors.primary)
                .setTimestamp();

            await ticketChannel.send({ embeds: [messageEmbed] });
        }

        const ticket = {
            id: ticketId,
            channelId: ticketChannel.id,
            guildId: guild.id,
            userId: user.id
        };

        try {
            await db.createModmailTicket({
                ticketId: ticket.id,
                userId: user.id,
                guildId: guild.id,
                channelId: ticketChannel.id,
                subject: initialMessage?.substring(0, 200)
            });

            if (initialMessage) {
                await db.addModmailMessage({
                    ticketId: ticket.id,
                    authorId: user.id,
                    authorName: user.tag,
                    content: initialMessage,
                    isStaff: false
                });
            }
        } catch (dbError) {
            console.error('Database error:', dbError);
        }

        const confirmEmbed = new Discord.EmbedBuilder()
            .setTitle('Ticket Created')
            .setDescription(`Your message has been sent to **${guild.name}**.\nStaff will respond as soon as possible.`)
            .setColor(config.colors.success)
            .setFooter({ text: 'Reply to this DM to add more messages' });

        await user.send({ embeds: [confirmEmbed] });

        return ticket;

    } catch (error) {
        console.error('Error creating ticket:', error);
        await user.send('An error occurred while creating your ticket. Please try again later.').catch(() => {});
        return null;
    }
}

async function forwardToTicket(ticket, message) {
    try {
        const guild = client.guilds.cache.get(ticket.guildId);
        if (!guild) return;

        const channel = guild.channels.cache.get(ticket.channelId);
        if (!channel) {
            activeTickets.delete(message.author.id);
            return message.reply('Your ticket has been closed or the channel no longer exists.');
        }

        const embed = new Discord.EmbedBuilder()
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setDescription(message.content || '*No text content*')
            .setColor(config.colors.primary)
            .setTimestamp();

        if (message.attachments.size > 0) {
            const attachmentList = message.attachments.map(a => `[${a.name}](${a.url})`).join('\n');
            embed.addFields({ name: 'Attachments', value: attachmentList });
        }

        await channel.send({ embeds: [embed] });
        await message.react('✅');

        try {
            await db.addModmailMessage({
                ticketId: ticket.id,
                authorId: message.author.id,
                authorName: message.author.tag,
                content: message.content,
                attachments: message.attachments.map(a => a.url),
                isStaff: false
            });
        } catch (dbError) {
            console.error('Database error:', dbError);
        }

    } catch (error) {
        console.error('Error forwarding message:', error);
    }
}

async function handleTicketReply(message) {
    if (!message.channel.topic) return;

    const topicMatch = message.channel.topic.match(/\((\d+)\)/);
    if (!topicMatch) return;

    const userId = topicMatch[1];
    
    try {
        const user = await client.users.fetch(userId);
        
        const embed = new Discord.EmbedBuilder()
            .setAuthor({ 
                name: `${message.author.tag} (Staff)`, 
                iconURL: message.author.displayAvatarURL({ dynamic: true }) 
            })
            .setDescription(message.content || '*No text content*')
            .setColor(config.colors.success)
            .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

        if (message.attachments.size > 0) {
            const files = message.attachments.map(a => a.url);
            embed.addFields({ name: 'Attachments', value: files.join('\n') });
        }

        await user.send({ embeds: [embed] });
        await message.react('✅');

        const ticketIdMatch = message.channel.topic.match(/Ticket ID: ([^\s]+)/);
        if (ticketIdMatch) {
            try {
                await db.addModmailMessage({
                    ticketId: ticketIdMatch[1],
                    authorId: message.author.id,
                    authorName: message.author.tag,
                    content: message.content,
                    attachments: message.attachments.map(a => a.url),
                    isStaff: true
                });
            } catch (dbError) {
                console.error('Database error:', dbError);
            }
        }

    } catch (error) {
        console.error('Error sending reply to user:', error);
        message.react('❌');
    }
}

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'close_ticket') {
        const topicMatch = interaction.channel.topic?.match(/\((\d+)\)/);
        if (!topicMatch) return;

        const userId = topicMatch[1];

        const confirmRow = new Discord.ActionRowBuilder()
            .addComponents(
                new Discord.ButtonBuilder()
                    .setCustomId('confirm_close')
                    .setLabel('Confirm Close')
                    .setStyle(Discord.ButtonStyle.Danger),
                new Discord.ButtonBuilder()
                    .setCustomId('cancel_close')
                    .setLabel('Cancel')
                    .setStyle(Discord.ButtonStyle.Secondary)
            );

        await interaction.reply({ 
            content: 'Are you sure you want to close this ticket?', 
            components: [confirmRow],
            ephemeral: true 
        });
    }

    if (interaction.customId === 'confirm_close') {
        const topicMatch = interaction.channel.topic?.match(/\((\d+)\)/);
        if (!topicMatch) return;

        const userId = topicMatch[1];
        activeTickets.delete(userId);

        try {
            const user = await client.users.fetch(userId);
            const closeEmbed = new Discord.EmbedBuilder()
                .setTitle('Ticket Closed')
                .setDescription(`Your ticket in **${interaction.guild.name}** has been closed by staff.`)
                .setColor(config.colors.error)
                .setTimestamp();

            await user.send({ embeds: [closeEmbed] });
        } catch (error) {
            console.error('Could not notify user:', error);
        }

        const ticketIdMatch = interaction.channel.topic.match(/Ticket ID: ([^\s]+)/);
        if (ticketIdMatch) {
            try {
                await db.closeModmailTicket(ticketIdMatch[1], interaction.user.id);
            } catch (dbError) {
                console.error('Database error:', dbError);
            }
        }

        await interaction.channel.delete();
    }

    if (interaction.customId === 'cancel_close') {
        await interaction.update({ content: 'Ticket close cancelled.', components: [] });
    }
});

client.on('error', error => {
    console.error('Client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled rejection:', error);
});

client.login(process.env.DISCORD_TOKEN1);

module.exports = client;
