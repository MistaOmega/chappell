const { SlashCommandBuilder, PermissionFlagsBits, MessageEmbed, EmbedBuilder} = require('discord.js');
const { getNotificationConfig } = require('../../database/db_tables');
const Parser = require('rss-parser');
const parser = new Parser();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('notification-setup')
        .setDescription('Set the notification channel for YouTube updates.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('youtube-id')
                .setDescription('The YouTube channel ID to monitor.')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('notify-channel')
                .setDescription('The channel to send notifications to.')
                .setRequired(true)),
        // .addStringOption(option =>
        //     option.setName('custom-message')
        //         .setDescription('An optional custom message for notifications.')
        //         .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const youtubeId = interaction.options.getString('youtube-id');
        const notifyChannel = interaction.options.getChannel('notify-channel');
        const customMessage = ''; // todo at some point

        // Check if the YouTube channel ID is valid
        try {
            const feed = await parser.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${youtubeId}`);
            if (!feed || !feed.items || feed.items.length === 0) {
                return interaction.editReply({ content: 'Invalid YouTube channel ID.', ephemeral: true });
            }

            const latestVideo = feed.items[0];
            const latestVideoId = latestVideo.id.split(':')[2];
            const latestVideoTimestamp = latestVideo.pubDate;

            const db = getNotificationConfig(interaction.guild.id);

            db.get(`SELECT * FROM notification_config WHERE guild_id = ?`, [interaction.guild.id], (err, row) => {
                if (err) {
                    console.error(err);
                    return interaction.editReply({ content: 'There was an error accessing the database.', ephemeral: true });
                }

                if (row) {
                    db.run(`UPDATE notification_config SET notification_channel_id = ?, youtube_channel_id = ?, custom_message = ?, last_checked_video_id = ?, last_checked_timestamp = ? WHERE guild_id = ?`,
                        [notifyChannel.id, youtubeId, customMessage, latestVideoId, latestVideoTimestamp, interaction.guild.id], function(err) {
                            if (err) {
                                console.error(err);
                                return interaction.editReply({ content: 'There was an error updating the notification channel.', ephemeral: true });
                            }

                            const embed = new EmbedBuilder()
                                .setTitle('✅ Configuration Updated')
                                .setDescription(`Notification channel updated successfully! <#${notifyChannel.id}> | [YouTube Channel](https://www.youtube.com/channel/${youtubeId})`)
                                .setTimestamp()
                                .setColor(0xE7ACCF);

                            interaction.editReply({ embeds: [embed], ephemeral: true });
                        });
                } else {
                    db.run(`INSERT INTO notification_config (guild_id, notification_channel_id, youtube_channel_id, custom_message, last_checked_video_id, last_checked_timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
                        [interaction.guild.id, notifyChannel.id, youtubeId, customMessage, latestVideoId, latestVideoTimestamp], function(err) {
                            if (err) {
                                console.error(err);
                                return interaction.editReply({ content: 'There was an error setting the notification channel.', ephemeral: true });
                            }

                            const embed = new EmbedBuilder()
                                .setTitle('✅ Configuration Success')
                                .setDescription(`Notification channel set successfully! <#${notifyChannel.id}> | [YouTube Channel](https://www.youtube.com/channel/${youtubeId})`)
                                .setTimestamp()
                                .setColor(0xE7ACCF);

                            interaction.editReply({ embeds: [embed], ephemeral: true });
                        });
                }
            });
        } catch (error) {
            console.error(error);
            return interaction.editReply({ content: 'There was an error validating the YouTube channel ID.', ephemeral: true });
        }
    }
};