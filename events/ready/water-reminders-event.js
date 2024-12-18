const { Events } = require('discord.js');
const { getWaterReminders } = require('../../database/db_tables');
const { setInterval } = require('timers');

let reminderIntervals = {};

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        try {
            console.log(`Enabling water reminders...`);

            const guilds = client.guilds.cache.map(guild => guild.id);
            for (const guildId of guilds) {
                const db = getWaterReminders(guildId);
                db.all(`SELECT *
                        FROM reminders`, [], (err, rows) => {
                    if (err) {
                        console.error(err);
                        return;
                    }

                    for (const row of rows) {
                        const userId = row.user_id;
                        const interval = row.interval;
                        const nextReminder = new Date(row.next_reminder);

                        const now = new Date();
                        const delay = nextReminder - now;
                        if (delay > 0) {
                            setTimeout(() => {
                                reminderIntervals[userId] = setInterval(() => {
                                    client.users.fetch(userId).then(user => {
                                        user.send(`It's time to drink water!`);
                                    });
                                }, interval * 60000);
                            }, delay);
                        } else {
                            reminderIntervals[userId] = setInterval(() => {
                                client.users.fetch(userId).then(user => {
                                    user.send(`It's time to drink water!`);
                                });
                            }, interval * 60000);
                        }
                    }
                });
            }
            console.log(`Water reminders enabled.`);
        } catch (err) {
            console.error(`Caught error in water reminders event: ${err}`);
        }
    },
};