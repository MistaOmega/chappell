const { SlashCommandBuilder } = require('discord.js');
const { getVotes } = require('../../database/db_tables');
const { getBookTitleByISBN } = require('../../utils/bookUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('books_addbook')
        .setDescription('Adds a book to the current vote')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The title of the book')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('isbn')
                .setDescription('The ISBN of the book')
                .setRequired(false)),
    async execute(interaction) {
        const title = interaction.options.getString('title');
        const isbn = interaction.options.getString('isbn');
        const guildId = interaction.guild.id;

        if (!title && !isbn) {
            await interaction.reply('You must provide either a title or an ISBN.');
            return;
        }

        const bookTitle = title || await getBookTitleByISBN(isbn);

        const db = getVotes(guildId);
        db.get(`SELECT id FROM votes WHERE book_title = ? OR isbn = ?`, [bookTitle, isbn], (err, row) => {
            if (err) {
                console.error(err);
                interaction.reply('There was an error adding the book to the vote.');
                return;
            }

            if (row) {
                db.run(`UPDATE votes SET votes = votes + 1 WHERE id = ?`, [row.id], function(err) {
                    if (err) {
                        console.error(err);
                        interaction.reply('There was an error updating the vote count.');
                    } else {
                        interaction.reply(`The vote count for "${bookTitle}" has been incremented.`);
                    }
                });
            } else {
                db.run(`INSERT INTO votes (guild_id, book_title, isbn, votes) VALUES (?, ?, ?, 1)`, [guildId, bookTitle, isbn], function(err) {
                    if (err) {
                        console.error(err);
                        interaction.reply('There was an error adding the book to the vote.');
                    } else {
                        interaction.reply(`The book "${bookTitle}" has been added to the vote with 1 vote.`);
                    }
                });
            }
        });
    },
};