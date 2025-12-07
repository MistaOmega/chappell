const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { getModerationConfig } = require('../database/db_tables');

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        try {
            // Check if timeout status changed
            const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
            const newTimeout = newMember.communicationDisabledUntilTimestamp;

            // If timeout didn't change, ignore
            if (oldTimeout === newTimeout) return;

            const db = getModerationConfig(newMember.guild.id);

            db.get(`SELECT * FROM moderation_config WHERE guild_id = ?`, [newMember.guild.id], async (err, row) => {
                if (err) {
                    console.error('Error fetching moderation config:', err);
                    return;
                }

                // If no moderation channel is configured, do nothing
                if (!row || !row.moderation_channel_id) return;

                try {
                    // Fetch audit logs to get who applied the timeout
                    const fetchedLogs = await newMember.guild.fetchAuditLogs({
                        limit: 1,
                        type: AuditLogEvent.MemberUpdate,
                    });

                    const timeoutLog = fetchedLogs.entries.first();

                    const logChannel = await newMember.guild.channels.fetch(row.moderation_channel_id);
                    if (!logChannel) return;

                    // Timeout was added or extended
                    if (newTimeout && newTimeout > (oldTimeout || 0)) {
                        const embed = new EmbedBuilder()
                            .setTitle('⏰ Member Timed Out')
                            .setColor(0xFFA500)
                            .setTimestamp()
                            .addFields(
                                { name: 'Member', value: `${newMember.user.tag} (${newMember.user.id})`, inline: true }
                            );

                        // Add moderator info from audit log if available
                        if (timeoutLog && timeoutLog.target.id === newMember.id) {
                            const timeDiff = Date.now() - timeoutLog.createdTimestamp;
                            if (timeDiff < 2000) {
                                embed.addFields({ name: 'Timed Out By', value: `${timeoutLog.executor.tag} (${timeoutLog.executor.id})`, inline: true });
                                if (timeoutLog.reason) {
                                    embed.addFields({ name: 'Reason', value: timeoutLog.reason });
                                }
                            }
                        }

                        const timeoutDate = new Date(newTimeout);
                        embed.addFields({ name: 'Timeout Until', value: `<t:${Math.floor(timeoutDate.getTime() / 1000)}:F>` });

                        await logChannel.send({ embeds: [embed] });
                    }
                    // Timeout was removed
                    else if (!newTimeout && oldTimeout) {
                        const embed = new EmbedBuilder()
                            .setTitle('✅ Timeout Removed')
                            .setColor(0x00FF00)
                            .setTimestamp()
                            .addFields(
                                { name: 'Member', value: `${newMember.user.tag} (${newMember.user.id})`, inline: true }
                            );

                        // Add moderator info from audit log if available
                        if (timeoutLog && timeoutLog.target.id === newMember.id) {
                            const timeDiff = Date.now() - timeoutLog.createdTimestamp;
                            if (timeDiff < 2000) {
                                embed.addFields({ name: 'Removed By', value: `${timeoutLog.executor.tag} (${timeoutLog.executor.id})`, inline: true });
                            }
                        }

                        await logChannel.send({ embeds: [embed] });
                    }
                } catch (channelError) {
                    console.error('Error sending to moderation log channel:', channelError);
                }
            });
        } catch (error) {
            console.error('Error in guildMemberUpdate event:', error);
        }
    },
};