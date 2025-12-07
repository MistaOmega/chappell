const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { getModerationConfig } = require('../database/db_tables');

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        try {
            // Ignore DM messages
            if (!message.guild) return;

            // Ignore bot messages
            if (message.author?.bot) return;

            const db = getModerationConfig(message.guild.id);

            db.get(`SELECT * FROM moderation_config WHERE guild_id = ?`, [message.guild.id], async (err, row) => {
                if (err) {
                    console.error('Error fetching moderation config:', err);
                    return;
                }

                // If no moderation channel is configured, do nothing
                if (!row || !row.moderation_channel_id) return;

                try {
                    // Check audit logs to see if a moderator deleted this message
                    const fetchedLogs = await message.guild.fetchAuditLogs({
                        limit: 1,
                        type: AuditLogEvent.MessageDelete,
                    });

                    const deletionLog = fetchedLogs.entries.first();

                    // If no audit log entry or the deletion is old, it's likely a self-deletion
                    if (!deletionLog) return;

                    const { executor, target, createdTimestamp } = deletionLog;

                    // Check if the deletion happened recently (within 2 seconds)
                    const timeDiff = Date.now() - createdTimestamp;
                    if (timeDiff > 2000) return;

                    // Check if the moderator deleted someone else's message
                    if (target.id !== message.author?.id) return;

                    // Don't log if user deleted their own message
                    if (executor.id === message.author?.id) return;

                    const logChannel = await message.guild.channels.fetch(row.moderation_channel_id);
                    if (!logChannel) return;

                    const embed = new EmbedBuilder()
                        .setTitle('🗑️ Message Deleted by Moderator')
                        .setColor(0xFF0000)
                        .setTimestamp()
                        .addFields(
                            { name: 'Deleted By', value: `${executor.tag} (${executor.id})`, inline: true },
                            { name: 'Message Author', value: message.author ? `${message.author.tag} (${message.author.id})` : 'Unknown User', inline: true },
                            { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
                            { name: 'Message ID', value: message.id, inline: true }
                        );

                    // Add message content if available
                    if (message.content) {
                        embed.addFields({ name: 'Content', value: message.content.length > 1024 ? message.content.substring(0, 1021) + '...' : message.content });
                    } else {
                        embed.addFields({ name: 'Content', value: '*No text content or not cached*' });
                    }

                    // Add attachment info if any
                    if (message.attachments.size > 0) {
                        const attachmentList = message.attachments.map(att => `[${att.name}](${att.url})`).join('\n');
                        embed.addFields({ name: 'Attachments', value: attachmentList.length > 1024 ? attachmentList.substring(0, 1021) + '...' : attachmentList });
                    }

                    // Add embed info if any
                    if (message.embeds.length > 0) {
                        embed.addFields({ name: 'Embeds', value: `${message.embeds.length} embed(s)` });
                    }

                    await logChannel.send({ embeds: [embed] });
                } catch (channelError) {
                    console.error('Error sending to moderation log channel:', channelError);
                }
            });
        } catch (error) {
            console.error('Error in messageDelete event:', error);
        }
    },
};