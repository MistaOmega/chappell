const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recommend_book')
        .setDescription('Recommends a book based on the specified criteria')
        .addStringOption(option =>
            option.setName('genres')
                .setDescription('Comma-separated list of genres')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('author')
                .setDescription('The author of the book')
                .setRequired(false)),
    async execute(interaction) {
        const genres = interaction.options.getString('genres')?.split(',').map(genre => genre.trim());
        const author = interaction.options.getString('author');

        if (!genres && !author) {
            await interaction.reply('Please provide at least one search criteria: genres, author, or title.');
            return;
        }

        let bookPromises = [];
        if (genres) {
            bookPromises = genres.map(genre => fetch(`https://openlibrary.org/subjects/${genre}.json?limit=50`).then(response => response.json()));
        }
        if (author) {
            bookPromises.push(fetch(`https://openlibrary.org/search.json?author=${encodeURIComponent(author)}&limit=50`).then(response => response.json()));
        }

        try {
            const results = await Promise.all(bookPromises);
            const books = results.flatMap(data => data.works || data.docs || []);

            if (books.length > 0) {
                const randomIndex = Math.floor(Math.random() * books.length);
                const book = books[randomIndex];

                const embed = new EmbedBuilder()
                    .setTitle('Book Recommendation')
                    .setColor(0xE7ACCF)
                    .addFields(
                        { name: 'Title', value: book.title, inline: true },
                        { name: 'Author(s)', value: book.authors ? book.authors.map(author => author.name).join(', ') : 'N/A', inline: true },
                        { name: 'First Published', value: book.first_publish_year ? book.first_publish_year.toString() : 'N/A', inline: true },
                    );

                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.reply(`Sorry, I couldn't find any books matching your criteria.`);
            }
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error while fetching the book recommendation.');
        }
    },
};