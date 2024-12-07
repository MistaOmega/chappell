const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Lists all available commands'),
    async execute(interaction) {
        const commands = interaction.client.commands.map(command => ({
            name: command.data.name,
            description: command.data.description,
            options: command.data.options
        }));

        const embed = new EmbedBuilder()
            .setTitle('Help - List of Commands')
            .setColor(0xE7ACCF)
            .setDescription('Here are all the available commands:')
            .setTimestamp();

        commands.forEach(command => {
            let commandDescription = command.description;
            if (command.options.length > 0) {
                const optionsDescription = command.options.map(option => `\`${option.name}\`: ${option.description}`).join('\n');
                commandDescription += `\n**Options:**\n${optionsDescription}`;
            }
            embed.addFields({ name: `/${command.name}`, value: commandDescription });
        });

        await interaction.reply({ embeds: [embed] });
    },
};