const { SlashCommandBuilder } = require('discord.js');
const { setInterval, clearInterval } = require('timers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('book_sprint')
        .setDescription('Starts a book sprint for a specified amount of minutes')
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration of the book sprint in minutes')
                .setRequired(true)),
    async execute(interaction) {
        const duration = interaction.options.getInteger('duration');
        let remainingTime = duration * 60; // convert to seconds

        const message = await interaction.reply({ content: `Book sprint started! Time remaining: ${duration} minutes`, fetchReply: true });

        const interval = setInterval(async () => {
            remainingTime -= 60; // decrement by 60 seconds

            if (remainingTime <= 0) {
                clearInterval(interval);
                await message.edit('Book sprint ended! Great job!');
                return;
            }

            const minutes = Math.floor(remainingTime / 60);
            await message.edit(`Book sprint in progress! Time remaining: ${minutes} minutes`);
        }, 60000); // update every 60 seconds
    },
};