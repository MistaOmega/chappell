const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBookRatings } = require('../../database/db_tables');
const { getBookTitleByISBN } = require('../../utils/bookUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('books_getrating')
        .setDescription('Gets the rating for a book')
        .addStringOption(option =>
            option.setName('isbn')
                .setDescription('The ISBN of the book')
                .setRequired(true)),
    async execute(interaction) {
        const isbn = interaction.options.getString('isbn');
        const guildId = interaction.guild.id;

        const { title: bookTitle, coverUrl } = await getBookTitleByISBN(isbn);

        const db = getBookRatings(guildId);
        db.all(`SELECT rating FROM book_ratings WHERE isbn = ?`, [isbn], (err, rows) => {
            if (err) {
                console.error(err);
                interaction.reply('There was an error while fetching the ratings.');
                db.close();
                return;
            }

            if (rows.length === 0) {
                interaction.reply(`No ratings found for "${bookTitle}".`);
                db.close();
                return;
            }

            const ratings = rows.map(row => row.rating);
            const averageRating = (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1);
            const numberOfVotes = ratings.length;
            const lowestRating = Math.min(...ratings);
            const highestRating = Math.max(...ratings);

            const embed = new EmbedBuilder()
                .setTitle(`Ratings for "${bookTitle}"`)
                .setColor(0xE7ACCF)
                .setDescription(`[Link to book](https://www.example.com/books/${isbn})`)
                .addFields(
                    { name: 'Average Rating', value: `${averageRating}`, inline: true },
                    { name: 'Number of Votes', value: `${numberOfVotes}`, inline: true },
                    { name: 'Lowest Rating', value: `${lowestRating}`, inline: true },
                    { name: 'Highest Rating', value: `${highestRating}`, inline: true }
                );

            if (coverUrl) {
                embed.setThumbnail(coverUrl);
            }

            interaction.reply({ embeds: [embed] });
            db.close();
        });
    },
};