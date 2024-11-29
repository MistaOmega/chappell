const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recommend_book')
        .setDescription('Recommends a book belonging to any of the specified genres')
        .addStringOption(option =>
            option.setName('genres')
                .setDescription('Comma-separated list of genres')
                .setRequired(true)),
    async execute(interaction) {
        const genres = interaction.options.getString('genres').split(',').map(genre => genre.trim());
        const bookPromises = genres.map(genre => fetch(`https://openlibrary.org/subjects/${genre}.json?limit=50`).then(response => response.json()));

        try {
            const results = await Promise.all(bookPromises);
            const books = results.flatMap(data => data.works || []);

            if (books.length > 0) {
                const randomIndex = Math.floor(Math.random() * books.length);
                const book = books[randomIndex];
                await interaction.reply(`I recommend "${book.title}" by ${book.authors.map(author => author.name).join(', ')}`);
            } else {
                await interaction.reply(`Sorry, I couldn't find any books in the genres "${genres.join(', ')}".`);
            }
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error while fetching the book recommendation.');
        }
    },
};