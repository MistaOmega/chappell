const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quote')
        .setDescription('Shares a daily quote'),
    async execute(interaction) {
        try {
            const response = await fetch('https://zenquotes.io/api/random');
            const [quote] = await response.json();

            const embed = new EmbedBuilder()
                .setColor(0xE7ACCF)
                .setTitle('Daily Quote')
                .setDescription(`"${quote.q}"`)
                .addFields({ name: 'Author', value: quote.a })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.reply('There was an error while fetching the quote.');
        }
    },
};