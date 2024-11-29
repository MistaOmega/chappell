const { SlashCommandBuilder } = require('discord.js');
const { getDatabase } = require('../../database/dbUtil');
const path = require('path');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getrating')
        .setDescription('Gets the latest 5 ratings for a book')
        .addStringOption(option =>
            option.setName('isbn')
                .setDescription('The ISBN of the book')
                .setRequired(true)),
    async execute(interaction) {
        const isbn = interaction.options.getString('isbn');
        const guildId = interaction.guild.id;
        const dbPath = path.join(__dirname, '../../database', guildId, 'bookratings.db');

        if (!fs.existsSync(dbPath)) {
            await interaction.reply(`No ratings found for ISBN "${isbn}".`);
            return;
        }

        const db = getDatabase(guildId, 'bookratings');
        db.all(`SELECT user_id, rating, spicy_rating, timestamp FROM ratings WHERE isbn = ? ORDER BY timestamp DESC LIMIT 5`, [isbn], (err, rows) => {
            if (err) {
                console.error(err);
                interaction.reply('There was an error while fetching the ratings.');
            } else if (rows.length === 0) {
                interaction.reply(`No ratings found for ISBN "${isbn}".`);
            } else {
                const ratings = rows.map(row => `<@${row.user_id}> rated ${row.rating} stars and ${'🌶️'.repeat(row.spicy_rating)} spicy on ${new Date(row.timestamp).toLocaleString()}`).join('\n');
                interaction.reply(`Latest ratings for ISBN "${isbn}":\n${ratings}`);
            }
        });
        db.close();
    },
};