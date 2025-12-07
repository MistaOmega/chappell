const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { getModerationConfig } = require('../database/db_tables');

module.exports = {
    name: Events.GuildBanAdd,
    async execute(ban) {
        try {
            const db = getModerationConfig(ban.guild.id);

            db.get(`SELECT * FROM moderation_config WHERE guild_id = ?`, [ban.guild.id], async (err, row) => {
                if (err) {
                    console.error('Error fetching moderation config:', err);
                    return;
                }

                // If no moderation channel is configured, do nothing
                if (!row || !row.moderation_channel_id) return;

                try {
                    // Fetch audit logs to get who banned the user and the reason
                    const fetchedLogs = await ban.guild.fetchAuditLogs({
                        limit: 1,
                        type: AuditLogEvent.MemberBanAdd,
                    });

                    const banLog = fetchedLogs.entries.first();

                    const logChannel = await ban.guild.channels.fetch(row.moderation_channel_id);
                    if (!logChannel) return;

                    const embed = new EmbedBuilder()
                        .setTitle('🔨 Member Banned')
                        .setColor(0x8B0000)
                        .setTimestamp()
                        .addFields(
                            { name: 'Banned User', value: `${ban.user.tag} (${ban.user.id})`, inline: true }
                        );

                    // Add moderator info from audit log if available
                    if (banLog && banLog.target.id === ban.user.id) {
                        const timeDiff = Date.now() - banLog.createdTimestamp;
                        if (timeDiff < 2000) {
                            embed.addFields({ name: 'Banned By', value: `${banLog.executor.tag} (${banLog.executor.id})`, inline: true });
                            if (banLog.reason) {
                                embed.addFields({ name: 'Reason', value: banLog.reason });
                            }
                        }
                    }

                    // Add ban reason from the ban object if available
                    if (ban.reason && !banLog?.reason) {
                        embed.addFields({ name: 'Reason', value: ban.reason });
                    }

                    await logChannel.send({ embeds: [embed] });
                } catch (channelError) {
                    console.error('Error sending to moderation log channel:', channelError);
                }
            });
        } catch (error) {
            console.error('Error in guildBanAdd event:', error);
        }
    },
};