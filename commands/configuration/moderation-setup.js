const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getModerationConfig } = require('../../database/db_tables');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('moderation-setup')
        .setDescription('Set the moderation log channel for viewing deleted messages and moderation events.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('log-channel')
                .setDescription('The channel to send moderation logs to.')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const logChannel = interaction.options.getChannel('log-channel');
        const db = getModerationConfig(interaction.guild.id);

        db.get(`SELECT * FROM moderation_config WHERE guild_id = ?`, [interaction.guild.id], (err, row) => {
            if (err) {
                console.error(err);
                return interaction.editReply({ content: 'There was an error accessing the database.', ephemeral: true });
            }

            if (row) {
                db.run(`UPDATE moderation_config SET moderation_channel_id = ? WHERE guild_id = ?`,
                    [logChannel.id, interaction.guild.id], function(err) {
                        if (err) {
                            console.error(err);
                            return interaction.editReply({ content: 'There was an error updating the moderation log channel.', ephemeral: true });
                        }

                        const embed = new EmbedBuilder()
                            .setTitle('Moderation Log Updated')
                            .setDescription(`Moderation log channel updated successfully! All moderation events will be logged to <#${logChannel.id}>`)
                            .setTimestamp()
                            .setColor(0xE7ACCF);

                        interaction.editReply({ embeds: [embed], ephemeral: true });
                    });
            } else {
                db.run(`INSERT INTO moderation_config (guild_id, moderation_channel_id) VALUES (?, ?)`,
                    [interaction.guild.id, logChannel.id], function(err) {
                        if (err) {
                            console.error(err);
                            return interaction.editReply({ content: 'There was an error setting the moderation log channel.', ephemeral: true });
                        }

                        const embed = new EmbedBuilder()
                            .setTitle('Moderation Log Configured')
                            .setDescription(`Moderation log channel set successfully! All moderation events will be logged to <#${logChannel.id}>`)
                            .setTimestamp()
                            .setColor(0xE7ACCF);

                        interaction.editReply({ embeds: [embed], ephemeral: true });
                    });
            }
        });
    }
};