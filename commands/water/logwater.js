const { SlashCommandBuilder } = require('discord.js');
const { getWaterLeaderboard } = require('../../database/db_tables');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('log')
        .setDescription('Log your water drinking')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of water')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('unit')
                .setDescription('Unit of the amount (ml or fl oz)')
                .setRequired(true)
                .addChoices(
                    { name: 'Milliliters', value: 'ml' },
                    { name: 'Fluid Ounces', value: 'fl_oz' }
                )),
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        const unit = interaction.options.getString('unit');
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const db = getWaterLeaderboard(guildId);

        let amountInMl = amount;
        if (unit === 'fl_oz') {
            amountInMl = amount * 29.5735; // Convert fluid ounces to milliliters
        }

        db.run(`INSERT INTO water_leaderboard (user_id, water_amount) VALUES (?, ?)`, [userId, amountInMl], (err) => {
            if (err) {
                console.error(err);
                interaction.reply('There was an error while logging your water intake.');
                return;
            }
            interaction.reply(`Logged ${amountInMl.toFixed(2)}ml of water.`);
        });
    },
};