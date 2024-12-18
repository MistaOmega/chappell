const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Lists all available commands')
        .addBooleanOption(option =>
            option.setName('global')
                .setDescription('Show help to everyone [ This will only work for mods ]')
        ),
    async execute(interaction) {
        const global = interaction.options.getBoolean('global');
        const hasManageChannels = interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels);

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

        const isEphemeral = !(global && hasManageChannels);
        await interaction.reply({ embeds: [embed], ephemeral: isEphemeral });
    },
};