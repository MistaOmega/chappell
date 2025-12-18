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

            // Send the cleaned message as the user
            const webhooks = await message.channel.fetchWebhooks();
            let webhook = webhooks.find(wh => wh.owner.id === message.client.user.id);

            if (!webhook) {
                webhook = await message.channel.createWebhook({
                    name: 'URL Cleaner',
                    reason: 'Clean Instagram URLs with tracking parameters'
                });
            }

            await webhook.send({
                content: cleanedContent,
                username: message.author.username,
                avatarURL: message.author.displayAvatarURL()
            });

        } catch (error) {
            console.error('Error in messageCreate event:', error);
        }
    },
};