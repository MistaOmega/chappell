const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { getModerationConfig } = require('../database/db_tables');

// Track how many times we've used each audit log entry (for bulk deletions)
// Key: audit log entry ID, Value: number of times used
const auditLogUsage = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
    auditLogUsage.clear();
}, 5 * 60 * 1000);

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
                    // Wait 500ms for Discord to create the audit log entry
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Check audit logs to see if a moderator deleted this message
                    const fetchedLogs = await message.guild.fetchAuditLogs({
                        limit: 10,
                        type: AuditLogEvent.MessageDelete,
                    });

                    // Find the most recent audit log entry that matches this deletion
                    let deletionLog = null;
                    const now = Date.now();

                    for (const entry of fetchedLogs.entries.values()) {
                        const timeDiff = now - entry.createdTimestamp;
                        const channelId = entry.extra?.channel?.id || entry.extra?.channelId;
                        const count = entry.extra?.count || 1;
                        const usedCount = auditLogUsage.get(entry.id) || 0;

                        // Skip if we've already used this audit log entry up to its count
                        if (usedCount >= count) continue;

                        // For bulk deletions, the timestamp doesn't update, so be more lenient with time
                        const maxAge = count > 1 ? 60000 : 3000; // 60 seconds for bulk, 3 seconds for single

                        // Check if this entry matches and in the same channel
                        if (timeDiff < maxAge && channelId === message.channel.id && entry.target.id === message.author?.id) {
                            deletionLog = entry;
                            break;
                        }
                    }

                    // If no matching audit log entry, it's likely a self-deletion
                    if (!deletionLog) return;

                    // Increment usage count for this audit log
                    const currentUsage = auditLogUsage.get(deletionLog.id) || 0;
                    auditLogUsage.set(deletionLog.id, currentUsage + 1);

                    const { executor } = deletionLog;

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