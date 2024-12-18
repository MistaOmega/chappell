const { google } = require('googleapis');
const { getNotificationConfig } = require('../../database/db_tables');
const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');

const youtube = google.youtube({
    version: 'v3',
    auth: config.youtubeApiKey
});

module.exports = {
    name: Events.ClientReady,
    async execute(client) {
        checkYoutube();
        try {
            setInterval(checkTimeAndYoutube, 60000); // Check every minute
        } catch (e) {
            console.log('Caught error in get-latest-video.js', e);
        }

        async function checkTimeAndYoutube() {
            const now = new Date();
            const isDST = now.getTimezoneOffset() < new Date(now.getFullYear(), 0, 1).getTimezoneOffset();
            const mountainTimeOffset = isDST ? -6 : -7; // Mountain Daylight Time (MDT) is UTC-6, Mountain Standard Time (MST) is UTC-7
            const currentHour = now.getUTCHours() + mountainTimeOffset;
            const currentMinute = now.getUTCMinutes();

            if (currentHour === 8 && currentMinute >= 25 && currentMinute <= 35) {
                checkYoutube();
            }
        }

        async function checkYoutube() {
            const db = getNotificationConfig(config.guildId);
            db.all(`SELECT * FROM notification_config`, [], async (err, rows) => {
                try {
                    if (err) {
                        console.error(err);
                        return;
                    }

                    for (const row of rows) {
                        const response = await youtube.search.list({
                            part: 'snippet',
                            channelId: row.youtube_channel_id,
                            order: 'date',
                            maxResults: 1
                        });

                        if (!response.data.items || response.data.items.length === 0) {
                            console.log(`Invalid YouTube channel ID for guild ${row.guild_id}`);
                            continue;
                        }

                        const latestVideo = response.data.items[0];
                        const latestVideoId = latestVideo.id.videoId;
                        const latestVideoTimestamp = latestVideo.snippet.publishedAt;

                        if (row.last_checked_video_id === latestVideoId) {
                            continue;
                        }

                        const channel = await client.channels.fetch(row.notification_channel_id);
                        if (!channel) {
                            console.log(`Channel not found for guild ${row.guild_id}`);
                            continue;
                        }
                        const publishedDate = new Date(latestVideo.snippet.publishedAt).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                            second: 'numeric',
                            hour12: true
                        });

                        const embed = new EmbedBuilder()
                            .setTitle('🎉🦢 NEW VIDEO ALERT! 🦢🎉')
                            .setDescription(`🚀 A brand new video from [**${latestVideo.snippet.channelTitle}**](https://www.youtube.com/watch?v=${latestVideoId}) just dropped! 🦢`)
                            .addFields(
                                { name: '📺 **Title**', value: `**${latestVideo.snippet.title}**\n\n` },
                                { name: '🕒 **Published**', value: `**${publishedDate}**\n\n` }
                            )
                            .setImage(latestVideo.snippet.thumbnails.high.url)
                            .setColor(0xE7ACCF);

                        const actionRow = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setLabel('Watch Video')
                                .setStyle(ButtonStyle.Link)
                                .setURL(`https://www.youtube.com/watch?v=${latestVideoId}`),
                            new ButtonBuilder()
                                .setLabel('Visit Channel')
                                .setStyle(ButtonStyle.Link)
                                .setURL(`https://www.youtube.com/channel/${row.youtube_channel_id}`)
                        );

                        channel.send({ embeds: [embed], components: [actionRow] });
                        db.run(`UPDATE notification_config
                                SET last_checked_video_id  = ?,
                                    last_checked_timestamp = ?
                                WHERE guild_id = ?`, [latestVideoId, latestVideoTimestamp, row.guild_id]);
                    }
                } catch (e) {
                    console.log('Caught error in get-latest-video.js', e);
                }
            });
        }
    },
};