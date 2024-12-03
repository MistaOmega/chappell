const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getWaterLeaderboard } = require('../../database/db_tables');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Show the water drinking leaderboard')
        .addStringOption(option =>
            option.setName('timespan')
                .setDescription('Timespan for the leaderboard (e.g., 1H, 1D, 1W, 1M)')
                .setRequired(false)),
    async execute(interaction) {
        let timespan = interaction.options.getString('timespan') || '1D';
        timespan = timespan.toUpperCase();

        const unit = timespan.slice(-1);
        const validUnits = ['H', 'D', 'W', 'M'];
        if (!validUnits.includes(unit)) {
            interaction.reply('Invalid timespan. Please use a valid format (e.g., 1H, 1D, 1W, 1M).');
            return;
        }

        const guildId = interaction.guild.id;
        const db = getWaterLeaderboard(guildId);

        let timeCondition;
        switch (unit) {
            case 'H':
                timeCondition = `datetime('now', '-${timespan.slice(0, -1)} hour')`;
                break;
            case 'D':
                timeCondition = `datetime('now', '-${timespan.slice(0, -1)} day')`;
                break;
            case 'W':
                timeCondition = `datetime('now', '-${timespan.slice(0, -1)} week')`;
                break;
            case 'M':
                timeCondition = `datetime('now', '-${timespan.slice(0, -1)} month')`;
                break;
        }

        db.all(`SELECT user_id, SUM(water_amount) as total_water FROM water_leaderboard WHERE timestamp >= ${timeCondition} GROUP BY user_id ORDER BY total_water DESC LIMIT 5`, async (err, rows) => {
            if (err) {
                console.error(err);
                interaction.reply('There was an error while fetching the leaderboard.');
                return;
            }

            if (rows.length === 0) {
                interaction.reply('No water intake logged for the specified timespan.');
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('Water Drinking Leaderboard')
                .setColor(0xE7ACCF)
                .setDescription(`Top 5 users for the past ${timespan}`)
                .setTimestamp();

            for (const [index, row] of rows.entries()) {
                const user = interaction.guild.members.cache.get(row.user_id);
                const username = user ? user.displayName : 'Unknown User';
                const totalWaterMl = row.total_water;
                const totalWaterFlOz = (totalWaterMl / 29.5735).toFixed(2);
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';

                // Calculate streak
                const streak = await new Promise((resolve, reject) => {
                    db.all(`SELECT DISTINCT DATE(timestamp) as date FROM water_leaderboard WHERE user_id = ? ORDER BY date DESC`, [row.user_id], (err, streakRows) => {
                        if (err) {
                            console.error(err);
                            resolve(0);
                        }

                        let streakCount = 1;
                        for (let i = 1; i < streakRows.length; i++) {
                            const currentDate = new Date(streakRows[i].date);
                            const previousDate = new Date(streakRows[i - 1].date);
                            const diffTime = Math.abs(previousDate - currentDate);
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                            if (diffDays === 1) {
                                streakCount++;
                            } else {
                                break;
                            }
                        }
                        resolve(streakCount);
                    });
                });

                embed.addFields({
                    name: `${medal} ${username}`,
                    value: `${totalWaterMl.toFixed(2)} ml (${totalWaterFlOz} fl oz)\nStreak: ${streak} day(s)`,
                    inline: false
                });
            }

            interaction.reply({ embeds: [embed] });
        });
    },
};