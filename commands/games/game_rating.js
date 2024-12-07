require('dotenv').config();
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('game_rating')
        .setDescription('Gets the general rating, total count, and Metacritic score of a game from the RAWG api')
        .addStringOption(option =>
            option.setName('game')
                .setDescription('The name of the game')
                .setRequired(true)),
    async execute(interaction) {
        const gameName = interaction.options.getString('game');
        const apiKey = process.env.RAWG_API_KEY;

        try {
            const response = await fetch(`https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(gameName)}`);
            const data = await response.json();
            const game = data.results[0];

            if (game) {
                const embed = new EmbedBuilder()
                    .setTitle(game.name)
                    .setColor(0xE7ACCF)
                    .setThumbnail(game.background_image)
                    .addFields(
                        { name: 'General Rating', value: game.rating.toString(), inline: true },
                        { name: 'Total Count', value: game.ratings_count.toString(), inline: true },
                        { name: 'Metacritic Score', value: game.metacritic ? game.metacritic.toString() : 'N/A', inline: true },
                        { name: 'Release Date', value: game.released, inline: true },
                        { name: 'Genres', value: game.genres.map(g => g.name).join(', '), inline: true }
                    );

                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.reply(`Sorry, I couldn't find any information for the game "${gameName}".`);
            }
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error while fetching the game information.');
        }
    },
};