const { SlashCommandBuilder } = require('discord.js');
const { setInterval, clearInterval } = require('timers');
const { getWaterReminders } = require('../../database/db_tables');
const reminderIntervals = require('../../utils/reminder-intervals');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('water_reminder')
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
        try {
            const subcommand = interaction.options.getSubcommand();
            const interval = interaction.options.getInteger('interval');
            const userId = interaction.user.id;
            const db = getWaterReminders(interaction.guild.id);

            if (subcommand === 'start' || subcommand === 'update') {
                if (reminderIntervals[userId]) {
                    clearInterval(reminderIntervals[userId]);
                }

                const nextReminder = new Date(Date.now() + interval * 60000);
                reminderIntervals[userId] = setInterval(() => {
                    interaction.user.send(`It's time to drink water!`);
                }, interval * 60000);
                db.run(`INSERT INTO reminders (user_id, interval, next_reminder)
                        VALUES (?, ?, ?) ON CONFLICT(user_id) DO
                        UPDATE SET interval = ?, next_reminder = ?`,
                    [userId, interval, nextReminder.toISOString(), interval, nextReminder.toISOString()]);

                await interaction.reply({
                    content: `Started drinking water reminders every ${interval} minutes.`,
                    ephemeral: true
                });
            } else if (subcommand === 'stop') {
                if (reminderIntervals[userId]) {
                    clearInterval(reminderIntervals[userId]);
                    delete reminderIntervals[userId];

                    db.run(`DELETE
                            FROM reminders
                            WHERE user_id = ?`, [userId]);

                    await interaction.reply({content: 'Stopped drinking water reminders.', ephemeral: true});
                } else {
                    await interaction.reply({content: 'No active drinking water reminders to stop.', ephemeral: true});
                }
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({content: 'There was an error while executing this command!', ephemeral: true});
        }
    },
};