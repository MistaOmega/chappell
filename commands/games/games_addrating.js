const { SlashCommandBuilder } = require('discord.js');
const { getBookRatings, getGameRatings} = require('../../database/db_tables');
const {getGameIdByTitle } = require('../../utils/gameUtils');
const { validateURL } = require('../../utils/urlUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('games_addrating')
        .setDescription('Adds or updates a rating for a video game')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The title of the game')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('rating')
                .setDescription('The rating for the game (1-5)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('url')
                .setDescription('The URL to the game on Steam, Xbox, Epic, GOG, or RAWG')
                .setRequired(true)),
    async execute(interaction) {
        const title = interaction.options.getString('title');
        const rating = interaction.options.getInteger('rating');
        const url = interaction.options.getString('url');
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        if (rating < 1 || rating > 5) {
            await interaction.reply('Rating must be between 1 and 5.');
            return;
        }

        if (!validateURL(url)) {
            await interaction.reply('The provided URL is not valid.');
            return;
        }

        let gameTitle;
        let gameID;
        if (title) {
            gameID = await getGameIdByTitle(title);
            if (!gameID) {

                await interaction.reply('Could not find a game with the provided title.');
                return;
            }
            gameTitle = title;
        } else {
            await interaction.reply('Please provide a game title.');
            return;
        }

        const db = getGameRatings(guildId);
        db.serialize(() => {
            db.get(`SELECT id FROM game_ratings WHERE user_id = ? AND game_id = ?`, [userId, gameID], (err, row) => {
                if (err) {
                    console.error(err);
                    interaction.reply('There was an error while checking the existing rating.');
                    db.close();
                } else if (row) {
                    db.run(`UPDATE game_ratings SET rating = ?, game_id = ?, url = ?, timestamp = CURRENT_TIMESTAMP WHERE id = ?`, [rating, gameID, url, row.id], function(err) {
                        if (err) {
                            console.error(err);
                            interaction.reply('There was an error while updating the rating.');
                        } else {
                            interaction.reply(`Updated rating of ${rating} for "${gameTitle}".`);
                        }
                        db.close();
                    });
                } else {
                    db.run(`INSERT INTO game_ratings (user_id, game_title, game_id, rating, url) VALUES (?, ?, ?, ?, ?)`, [userId, gameTitle, gameID, rating, url], function(err) {
                        if (err) {
                            console.error(err);
                            interaction.reply('There was an error while adding the rating.');
                        } else {
                            interaction.reply(`Rating of ${rating} for "${gameTitle}" added successfully.`);
                        }
                        db.close();
                    });
                }
            });
        });
    },
};