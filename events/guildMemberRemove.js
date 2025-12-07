const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { getModerationConfig } = require('../database/db_tables');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        try {
            const db = getModerationConfig(member.guild.id);

            db.get(`SELECT * FROM moderation_config WHERE guild_id = ?`, [member.guild.id], async (err, row) => {
                if (err) {
                    console.error('Error fetching moderation config:', err);
                    return;
                }

                // If no moderation channel is configured, do nothing
                if (!row || !row.moderation_channel_id) return;

                try {
                    // Fetch audit logs to check if this was a kick
                    const fetchedLogs = await member.guild.fetchAuditLogs({
                        limit: 1,
                        type: AuditLogEvent.MemberKick,
                    });

                    const kickLog = fetchedLogs.entries.first();

                    // If no kick log or it's old, this was likely a voluntary leave
                    if (!kickLog) return;

                    const { executor, target, reason, createdTimestamp } = kickLog;

                    // Check if the kick happened recently (within 2 seconds)
                    const timeDiff = Date.now() - createdTimestamp;
                    if (timeDiff > 2000) return;

                    // Check if the kicked user matches
                    if (target.id !== member.id) return;

                    const logChannel = await member.guild.channels.fetch(row.moderation_channel_id);
                    if (!logChannel) return;

                    const embed = new EmbedBuilder()
                        .setTitle('👢 Member Kicked')
                        .setColor(0xFF8C00)
                        .setTimestamp()
                        .addFields(
                            { name: 'Kicked User', value: `${member.user.tag} (${member.user.id})`, inline: true },
                            { name: 'Kicked By', value: `${executor.tag} (${executor.id})`, inline: true }
                        );

                    if (reason) {
                        embed.addFields({ name: 'Reason', value: reason });
                    }

                    await logChannel.send({ embeds: [embed] });
                } catch (channelError) {
                    console.error('Error sending to moderation log channel:', channelError);
                }
            });
        } catch (error) {
            console.error('Error in guildMemberRemove event:', error);
        }
    },
};