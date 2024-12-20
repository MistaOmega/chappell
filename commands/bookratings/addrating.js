const { SlashCommandBuilder } = require('discord.js');
const { getBookRatings } = require('../../database/db_tables');
const { getBookTitleByISBN } = require('../../utils/bookUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('books_addrating')
        .setDescription('Adds or updates a rating for a book')
        .addStringOption(option =>
            option.setName('isbn')
                .setDescription('The ISBN of the book')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('rating')
                .setDescription('The rating for the book (1-5)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('spicy')
                .setDescription('The spicy rating for the book (1-5)')
                .setRequired(false)),
    async execute(interaction) {
        const isbn = interaction.options.getString('isbn');
        const rating = interaction.options.getInteger('rating');
        const spicyRating = interaction.options.getInteger('spicy') || 0;
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        if (rating < 1 || rating > 5 || spicyRating < 0 || spicyRating > 5) {
            await interaction.reply('Rating and spicy rating must be between 1 and 5.');
            return;
        }

        const bookInfo = await getBookTitleByISBN(isbn);

        const db = getBookRatings(guildId);
        db.serialize(() => {
            db.get(`SELECT id FROM book_ratings WHERE user_id = ? AND (isbn = ? OR book_title = ?)`, [userId, isbn, bookInfo.title], (err, row) => {
                if (err) {
                    console.error(err);
                    interaction.reply('There was an error while checking the existing rating.');
                    db.close();
                } else if (row) {
                    db.run(`UPDATE book_ratings SET rating = ?, spicy_rating = ?, isbn = ?, timestamp = CURRENT_TIMESTAMP WHERE id = ?`, [rating, spicyRating, isbn, row.id], function(err) {
                        if (err) {
                            console.error(err);
                            interaction.reply('There was an error while updating the rating.');
                        } else {
                            interaction.reply(`Updated rating of ${rating} for "${bookInfo.title}".${spicyRating ? ` Spicy rating of ${'🌶️'.repeat(spicyRating)}.` : ''}`);
                        }
                        db.close();
                    });
                } else {
                    db.run(`INSERT INTO book_ratings (user_id, book_title, isbn, rating, spicy_rating) VALUES (?, ?, ?, ?, ?)`, [userId, bookInfo, isbn, rating, spicyRating], function(err) {
                        if (err) {
                            console.error(err);
                            interaction.reply('There was an error while adding the rating.');
                        } else {
                            interaction.reply(`Rating of ${rating} for "${bookInfo.title}" added successfully.${spicyRating ? ` Spicy rating of ${'🌶️'.repeat(spicyRating)}.` : ''}`);
                        }
                        db.close();
                    });
                }
            });
        });
    },
};