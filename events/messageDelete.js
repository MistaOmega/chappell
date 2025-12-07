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
            console.log('[MessageDelete] Event triggered');

            // Ignore DM messages
            if (!message.guild) {
                console.log('[MessageDelete] Ignoring DM message');
                return;
            }

            // Ignore bot messages
            if (message.author?.bot) {
                console.log('[MessageDelete] Ignoring bot message');
                return;
            }

            console.log(`[MessageDelete] Processing deletion for message by ${message.author?.tag || 'Unknown'}`);

            const db = getModerationConfig(message.guild.id);

            db.get(`SELECT * FROM moderation_config WHERE guild_id = ?`, [message.guild.id], async (err, row) => {
                if (err) {
                    console.error('[MessageDelete] Error fetching moderation config:', err);
                    return;
                }

                // If no moderation channel is configured, do nothing
                if (!row || !row.moderation_channel_id) {
                    console.log('[MessageDelete] No moderation channel configured');
                    return;
                }

                console.log(`[MessageDelete] Moderation channel configured: ${row.moderation_channel_id}`);

                try {
                    // Wait 500ms for Discord to create the audit log entry
                    console.log('[MessageDelete] Waiting 500ms for audit log to be created...');
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Check audit logs to see if a moderator deleted this message
                    console.log('[MessageDelete] Fetching audit logs...');
                    const fetchedLogs = await message.guild.fetchAuditLogs({
                        limit: 10,
                        type: AuditLogEvent.MessageDelete,
                    });

                    console.log(`[MessageDelete] Found ${fetchedLogs.entries.size} audit log entries`);

                    // Find the most recent audit log entry that matches this deletion
                    let deletionLog = null;
                    const now = Date.now();

                    for (const entry of fetchedLogs.entries.values()) {
                        const timeDiff = now - entry.createdTimestamp;
                        const channelId = entry.extra?.channel?.id || entry.extra?.channelId;
                        const count = entry.extra?.count || 1;
                        const usedCount = auditLogUsage.get(entry.id) || 0;

                        console.log(`[MessageDelete] Checking entry ${entry.id}: executor=${entry.executor.tag}, target=${entry.target.tag}, channel=${channelId}, message.channel=${message.channel.id}, count=${count}, used=${usedCount}, age=${timeDiff}ms`);

                        // Skip if we've already used this audit log entry up to its count
                        if (usedCount >= count) {
                            console.log(`[MessageDelete] Skipping fully used audit log ${entry.id} (used ${usedCount}/${count})`);
                            continue;
                        }

                        // For bulk deletions, the timestamp doesn't update, so be more lenient with time
                        const maxAge = count > 1 ? 60000 : 3000; // 60 seconds for bulk, 3 seconds for single

                        console.log(`[MessageDelete] Max age for this entry: ${maxAge}ms, actual age: ${timeDiff}ms`);
                        console.log(`[MessageDelete] Channel match: ${channelId} === ${message.channel.id} = ${channelId === message.channel.id}`);
                        console.log(`[MessageDelete] Target match: ${entry.target.id} === ${message.author?.id} = ${entry.target.id === message.author?.id}`);

                        // Check if this entry matches and in the same channel
                        if (timeDiff < maxAge && channelId === message.channel.id && entry.target.id === message.author?.id) {
                            deletionLog = entry;
                            console.log(`[MessageDelete] Found matching audit log entry! (${usedCount + 1}/${count})`);
                            break;
                        }
                    }

                    // If no matching audit log entry, it's likely a self-deletion
                    if (!deletionLog) {
                        console.log('[MessageDelete] No matching audit log entry found - likely self-deletion');
                        return;
                    }

                    // Increment usage count for this audit log
                    const currentUsage = auditLogUsage.get(deletionLog.id) || 0;
                    auditLogUsage.set(deletionLog.id, currentUsage + 1);
                    console.log(`[MessageDelete] Incremented audit log ${deletionLog.id} usage to ${currentUsage + 1}`);

                    const { executor } = deletionLog;
                    console.log(`[MessageDelete] Using audit log: executor=${executor.tag}, target=${deletionLog.target.tag}`);

                    // Don't log if user deleted their own message
                    console.log(`[MessageDelete] Comparing executor.id (${executor.id}) with message.author.id (${message.author?.id})`);
                    if (executor.id === message.author?.id) {
                        console.log('[MessageDelete] User deleted own message, ignoring');
                        return;
                    }

                    console.log('[MessageDelete] All checks passed, sending to moderation log');

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