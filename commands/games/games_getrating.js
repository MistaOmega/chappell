const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getGameRatings } = require('../../database/db_tables');
const { getGameIdByTitle } = require('../../utils/gameUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('games_getrating')
        .setDescription('Gets the rating for a video game')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The title of the game')
                .setRequired(true)),
    async execute(interaction) {
        const title = interaction.options.getString('title');
        const guildId = interaction.guild.id;

        const gameID = await getGameIdByTitle(title);
        if (!gameID) {
            await interaction.reply('Could not find a game with the provided title.');
            return;
        }

        const db = getGameRatings(guildId);
        db.all(`SELECT rating FROM game_ratings WHERE game_id = ?`, [gameID], (err, rows) => {
            if (err) {
                console.error(err);
                interaction.reply('There was an error while fetching the ratings.');
                db.close();
                return;
            }

            if (rows.length === 0) {
                interaction.reply(`No ratings found for "${title}".`);
                db.close();
                return;
            }

            const ratings = rows.map(row => row.rating);
            const averageRating = (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1);
            const numberOfVotes = ratings.length;
            const lowestRating = Math.min(...ratings);
            const highestRating = Math.max(...ratings);

            const embed = new EmbedBuilder()
                .setTitle(`Ratings for "${title}"`)
                .setColor(0xE7ACCF)
                .addFields(
                    { name: 'Average Rating', value: `${averageRating}`, inline: true },
                    { name: 'Number of Votes', value: `${numberOfVotes}`, inline: true },
                    { name: 'Lowest Rating', value: `${lowestRating}`, inline: true },
                    { name: 'Highest Rating', value: `${highestRating}`, inline: true }
                );

            interaction.reply({ embeds: [embed] });
            db.close();
        });
    },
};