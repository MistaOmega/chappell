const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const { getTodoTasks } = require('../../database/db_tables');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('todo')
        .setDescription('Create and manage your todo list'),
    async execute(interaction) {
        if (!interaction.user) {
            console.error('Interaction user is undefined');
            return;
        }

        const userId = interaction.user.id;
        const embed = new EmbedBuilder()
            .setTitle(`${interaction.user.username}'s Todo List`)
            .setDescription('Use the buttons below to manage your tasks.')
            .setColor(0xE7ACCF)
            .setTimestamp();

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('add_task')
                .setLabel('Add Task')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('complete_task')
                .setLabel('Complete Task')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('remove_task')
                .setLabel('Remove Task')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('clear_tasks')
                .setLabel('Clear Tasks')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('update_board')
                .setLabel('Update Board')
                .setStyle(ButtonStyle.Secondary)
        );

        const statusRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('status_done')
                .setLabel('Done')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('status_todo')
                .setLabel('Todo')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('status_doing')
                .setLabel('Doing')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ embeds: [embed], components: [actionRow, statusRow], ephemeral: true });

        const filter = i => i.user.id === userId;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
        const db = getTodoTasks(interaction.guild.id);

        collector.on('collect', async i => {
            if (i.customId === 'add_task') {
                await i.reply({ content: 'Please enter the task to add:', ephemeral: true });

                const filter = response => {
                    console.log(response); // Log the response
                    return response.author.id === userId;
                };
                const collected = await i.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
                const task = collected.first().content;
                db.run(`INSERT INTO todo_tasks (user_id, task, status) VALUES (?, ?, ?)`, [userId, task, 'todo']);
                await collected.first().delete();
                await i.editReply({ content: 'Task added!', ephemeral: true });
            } else if (i.customId === 'complete_task') {
                db.all(`SELECT * FROM todo_tasks WHERE user_id = ?`, [userId], async (err, rows) => {
                    if (rows.length === 0) {
                        await i.reply({ content: 'No tasks to complete.', ephemeral: true });
                        return;
                    }
                    await i.reply({ content: 'Please enter the task number to complete:', ephemeral: true });
                    const filter = response => response.author.id === userId;
                    const collected = await i.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
                    const taskNumber = parseInt(collected.first().content);
                    if (isNaN(taskNumber) || taskNumber < 1 || taskNumber > rows.length) {
                        await i.editReply({ content: 'Invalid task number.', ephemeral: true });
                    } else {
                        const taskId = rows[taskNumber - 1].id;
                        db.run(`UPDATE todo_tasks SET status = ? WHERE id = ?`, ['done', taskId]);
                        await i.editReply({ content: `Task ${taskNumber} marked as completed!`, ephemeral: true });
                    }
                    await collected.first().delete();
                });
            } else if (i.customId === 'remove_task') {
                db.all(`SELECT * FROM todo_tasks WHERE user_id = ?`, [userId], async (err, rows) => {
                    if (rows.length === 0) {
                        await i.reply({ content: 'No tasks to remove.', ephemeral: true });
                        return;
                    }
                    await i.reply({ content: 'Please enter the task number to remove:', ephemeral: true });
                    const filter = response => response.author.id === userId;
                    const collected = await i.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
                    const taskNumber = parseInt(collected.first().content);
                    if (isNaN(taskNumber) || taskNumber < 1 || taskNumber > rows.length) {
                        await i.editReply({ content: 'Invalid task number.', ephemeral: true });
                    } else {
                        const taskId = rows[taskNumber - 1].id;
                        db.run(`DELETE FROM todo_tasks WHERE id = ?`, [taskId]);
                        await i.editReply({ content: `Task ${taskNumber} removed!`, ephemeral: true });
                    }
                    await collected.first().delete();
                });
            } else if (i.customId === 'clear_tasks') {
                db.run(`DELETE FROM todo_tasks WHERE user_id = ?`, [userId]);
                await i.update({ content: 'All tasks cleared!', embeds: [embed], components: [actionRow, statusRow], ephemeral: true });
            } else if (i.customId === 'update_board') {
                db.all(`SELECT * FROM todo_tasks WHERE user_id = ?`, [userId], async (err, rows) => {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    const updatedEmbed = new EmbedBuilder()
                        .setTitle(`${interaction.user.username}'s Todo List`)
                        .setDescription('Use the buttons below to manage your tasks.')
                        .setColor(0xE7ACCF)
                        .setTimestamp();

                    rows.forEach((row, index) => {
                        updatedEmbed.addFields({ name: `Task ${index + 1}`, value: `${row.task} - ${row.status}` });
                    });

                    await i.update({ embeds: [updatedEmbed], components: [actionRow, statusRow], ephemeral: true });
                });
            } else if (i.customId.startsWith('status_')) {
                // Handle status changes
            }
        });

        collector.on('end', collected => {
            console.log(`Collected ${collected.size} interactions.`);
        });
    },
};