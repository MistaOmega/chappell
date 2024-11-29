const { SlashCommandBuilder } = require('discord.js');
const { getVotes } = require('../../database/db_tables');
const { getBookTitleByISBN } = require('../../utils/bookUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('startvote')
        .setDescription('Starts a new book vote')
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration of the vote in minutes')
                .setRequired(false)),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const duration = interaction.options.getInteger('duration') || 2;

        const db = getVotes(guildId);
        db.run(`DELETE FROM votes`, [], (err) => {
            if (err) {
                console.error(err);
                interaction.reply('There was an error starting the vote.');
                return;
            }
            interaction.reply(`A new book vote has started! You have ${duration} minutes to add books and vote.`);
            setTimeout(async () => {
                db.all(`SELECT book_title, isbn, votes FROM votes ORDER BY votes DESC LIMIT 1`, [], async (err, rows) => {
                    if (err) {
                        console.error(err);
                        interaction.followUp('There was an error ending the vote.');
                        return;
                    }
                    if (rows.length === 0) {
                        interaction.followUp('No books were added to the vote.');
                    } else {
                        const winner = rows[0];
                        const bookTitle = winner.book_title || await getBookTitleByISBN(winner.isbn);
                        interaction.followUp(`The vote has ended! The winning book is "${bookTitle}" with ${winner.votes} votes.`);
                    }
                });
            }, duration * 60 * 1000);
        });
    },
};