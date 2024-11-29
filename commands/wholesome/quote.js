const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quote')
        .setDescription('Shares a daily quote from a famous book'),
    async execute(interaction) {
        try {
            const response = await fetch('https://zenquotes.io/api/random');
            const [quote] = await response.json();
            await interaction.reply(`"${quote.q}" – ${quote.a}`);
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error while fetching the quote.');
        }
    },
};