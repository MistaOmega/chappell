const { SlashCommandBuilder } = require('discord.js');
const { getVotes } = require('../../database/db_tables');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('books_getlastvote')
        .setDescription('Gets the book that won the last vote'),
    async execute(interaction) {
        const guildId = interaction.guild.id;

        const db = getVotes(guildId);
        db.all(`SELECT book_title, isbn, votes FROM votes ORDER BY timestamp DESC LIMIT 1`, [], (err, rows) => {
            if (err) {
                console.error(err);
                interaction.reply('There was an error fetching the last vote.');
            } else if (rows.length === 0) {
                interaction.reply('No votes have been recorded yet.');
            } else {
                const winner = rows[0];
                interaction.reply(`The last winning book was "${winner.book_title || winner.isbn}" with ${winner.votes} votes.`);
            }
        });
    },
};