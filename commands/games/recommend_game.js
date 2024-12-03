require('dotenv').config();
const {SlashCommandBuilder, EmbedBuilder} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recommend_game')
        .setDescription('Recommends games based on the specified criteria')
        .addStringOption(option =>
            option.setName('genre')
                .setDescription('The genre(s) of the game (comma-separated)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('developer')
                .setDescription('The developer of the game')
                .setRequired(false)),
    async execute(interaction) {
        const genre = interaction.options.getString('genre');
        const developer = interaction.options.getString('developer');
        const apiKey = process.env.RAWG_API_KEY;

        if (!genre && !developer) {
            await interaction.reply('Please provide at least one search criteria: genre, developer.');
            return;
        }

        let query = `key=${apiKey}`;
        if (genre) query += `&genres=${genre.split(',').map(g => g.trim()).join(',')}`;
        if (developer) query += `&developers=${developer}`;

        try {
            const response = await fetch(`https://api.rawg.io/api/games?${query}`);
            const data = await response.json();
            const games = data.results;

            if (games.length > 0) {
                const embed = new EmbedBuilder()
                    .setTitle('Game Recommendations')
                    .setColor(0xE7ACCF);

                games.slice(0, 5).forEach(game => {
                    embed.addFields(
                        {
                            name: game.name,
                            value: `Released: ${game.released}\nRating: ${game.rating}\nPlatforms: ${game.platforms.map(p => p.platform.name).join(', ')}\nGenres: ${game.genres.map(g => g.name).join(', ')}\nDeveloper: ${developer}`
                        }
                    );
                });

                await interaction.reply({embeds: [embed]});
            } else {
                await interaction.reply(`Sorry, I couldn't find any games matching your criteria.`);
            }
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error while fetching the game recommendations.');
        }
    },
};