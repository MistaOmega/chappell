const { SlashCommandBuilder } = require('discord.js');
const { setInterval, clearInterval } = require('timers');

let reminderInterval;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('drink')
        .setDescription('Manage your drinking water reminders')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start drinking water reminders')
                .addIntegerOption(option =>
                    option.setName('interval')
                        .setDescription('Time between reminders in minutes')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('update')
                .setDescription('Update the time between reminders')
                .addIntegerOption(option =>
                    option.setName('interval')
                        .setDescription('New time between reminders in minutes')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Stop drinking water reminders')),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const interval = interaction.options.getInteger('interval');

        if (subcommand === 'start') {
            if (reminderInterval) {
                clearInterval(reminderInterval);
            }
            reminderInterval = setInterval(() => {
                interaction.user.send(`It's time to drink water!`);
            }, interval * 60000);
            await interaction.reply({ content: `Started drinking water reminders every ${interval} minutes.`, ephemeral: true });
        } else if (subcommand === 'update') {
            if (reminderInterval) {
                clearInterval(reminderInterval);
                reminderInterval = setInterval(() => {
                    interaction.user.send(`It's time to drink water!`);
                }, interval * 60000);
                await interaction.reply({ content: `Updated drinking water reminders to every ${interval} minutes.`, ephemeral: true });
            } else {
                await interaction.reply({ content: 'You need to start the reminders first using `/drink start`.', ephemeral: true });
            }
        } else if (subcommand === 'stop') {
            if (reminderInterval) {
                clearInterval(reminderInterval);
                reminderInterval = null;
                await interaction.reply({ content: 'Stopped drinking water reminders.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'No active drinking water reminders to stop.', ephemeral: true });
            }
        }
    },
};