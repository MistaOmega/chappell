const { SlashCommandBuilder } = require('discord.js');
const { getDatabase } = require('../../database/dbUtil');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addrating')
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

        let bookTitle = '';
        try {
            const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
            const data = await response.json();
            bookTitle = data[`ISBN:${isbn}`]?.title || 'Unknown Title';
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error fetching the book title.');
            return;
        }

        const db = getDatabase(guildId, 'bookratings');
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                book_title TEXT,
                isbn TEXT,
                rating INTEGER NOT NULL,
                spicy_rating INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            db.get(`SELECT id FROM ratings WHERE user_id = ? AND (isbn = ? OR book_title = ?)`, [userId, isbn, bookTitle], (err, row) => {
                if (err) {
                    console.error(err);
                    interaction.reply('There was an error while checking the existing rating.');
                    db.close();
                } else if (row) {
                    db.run(`UPDATE ratings SET rating = ?, spicy_rating = ?, isbn = ?, timestamp = CURRENT_TIMESTAMP WHERE id = ?`, [rating, spicyRating, isbn, row.id], function(err) {
                        if (err) {
                            console.error(err);
                            interaction.reply('There was an error while updating the rating.');
                        } else {
                            interaction.reply(`Updated rating of ${rating} for "${bookTitle}".${spicyRating ? ` Spicy rating of ${'🌶️'.repeat(spicyRating)}.` : ''}`);
                        }
                        db.close();
                    });
                } else {
                    db.run(`INSERT INTO ratings (user_id, book_title, isbn, rating, spicy_rating) VALUES (?, ?, ?, ?, ?)`, [userId, bookTitle, isbn, rating, spicyRating], function(err) {
                        if (err) {
                            console.error(err);
                            interaction.reply('There was an error while adding the rating.');
                        } else {
                            interaction.reply(`Rating of ${rating} for "${bookTitle}" added successfully.${spicyRating ? ` Spicy rating of ${'🌶️'.repeat(spicyRating)}.` : ''}`);
                        }
                        db.close();
                    });
                }
            });
        });
    },
};