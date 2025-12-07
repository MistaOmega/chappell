require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const { loadCommands } = require('./load-commands');
const path = require('path');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildModeration] });

client.commands = new Collection();

// Load commands
loadCommands(client);

function loadEvents(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            loadEvents(filePath);
        } else if (file.endsWith('.js')) {
            const event = require(filePath);
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
                console.log(`[EventLoader] Registered ONCE event: ${event.name} from ${filePath}`);
            } else {
                client.on(event.name, (...args) => event.execute(...args));
                console.log(`[EventLoader] Registered ON event: ${event.name} from ${filePath}`);
            }
        }
    }
}

// load events
const eventsPath = path.join(__dirname, 'events');
loadEvents(eventsPath);


client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log(`[Intents] Bot intents: ${client.options.intents.bitfield}`);
    console.log(`[Intents] Has GuildMessages: ${client.options.intents.has(GatewayIntentBits.GuildMessages)}`);
    console.log(`[Intents] Has MessageContent: ${client.options.intents.has(GatewayIntentBits.MessageContent)}`);
    console.log(`[Intents] Has GuildModeration: ${client.options.intents.has(GatewayIntentBits.GuildModeration)}`);
    client.user.setPresence({
        activities: [{
            name: 'With your heart ❤️',
            type: ActivityType.Playing }],
        status: 'online',
    });
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
});

client.login(process.env.BOT_TOKEN).then(r => console.log('Logged in!')).catch(console.error);