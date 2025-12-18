const { Events } = require('discord.js');
const { extractAndCleanInstagramURLs } = require('../utils/urlUtils');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        try {
            // Ignore DM messages
            if (!message.guild) return;

            // Ignore bot messages
            if (message.author.bot) return;

            // Check if the message contains any Instagram URLs with igsh parameter
            const cleanedURLs = extractAndCleanInstagramURLs(message.content);

            // If no URLs were cleaned, do nothing
            if (cleanedURLs.length === 0) return;

            // Replace the original URLs with cleaned ones in the message content
            let cleanedContent = message.content;
            cleanedURLs.forEach(({ original, cleaned }) => {
                cleanedContent = cleanedContent.replace(original, cleaned);
            });

            // Delete the original message
            await message.delete();

            // Send the cleaned message as the bot
            await message.channel.send({
                content: `${message.author}: ${cleanedContent}`
            });

        } catch (error) {
            console.error('Error in messageCreate event:', error);
        }
    },
};