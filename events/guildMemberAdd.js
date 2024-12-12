const { Events } = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            await member.send(`Welcome to the server! You can add an introduction in <#${config.introChannelId}> and your birthday in <#${config.birthdayChannelId}>.`);
        } catch (error) {
            console.error(`Could not send welcome message to ${member.user.tag}.`, error);
        }
    },
};