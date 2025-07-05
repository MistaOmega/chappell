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
        const db = getTodoTasks(interaction.guild.id);

        db.all(`SELECT * FROM todo_tasks WHERE user_id = ?`, [userId], async (err, rows) => {
            if (err) {
                console.error(err);
                return;
            }

            const embed = createTodoEmbed(interaction.user.username, rows);
            const actionRow = createActionRow();
            const functionRow = createFunctionRow();
            const statusRow = createStatusRow();

            await interaction.reply({ embeds: [embed], components: [actionRow, functionRow, statusRow], ephemeral: true });

            const filter = i => i.user.id === userId;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                if (i.customId === 'add_task') {
                    await handleAddTask(i, userId, db);
                } else if (i.customId === 'complete_task') {
                    await handleCompleteTask(i, userId, db);
                } else if (i.customId === 'remove_task') {
                    await handleRemoveTask(i, userId, db);
                } else if (i.customId === 'clear_tasks') {
                    await handleClearTasks(i, userId, db, embed, actionRow, statusRow);
                } else if (i.customId === 'update_board') {
                    await handleUpdateBoard(i, userId, db, embed, actionRow, functionRow, statusRow);
                } else if (i.customId.startsWith('status_')) {
                    // Handle status changes
                }
            });

            collector.on('end', collected => {
                console.log(`Collected ${collected.size} interactions.`);
            });
        });
    },
};

function createTodoEmbed(username, tasks) {
    const embed = new EmbedBuilder()
        .setTitle(`${username}'s Todo List`)
        .setDescription('Use the buttons below to manage your tasks.')
        .setColor(0xE7ACCF)
        .setTimestamp();

    tasks.forEach((task, index) => {
        embed.addFields({ name: `Task ${index + 1}`, value: `${task.task} - ${task.status}` });
    });

    return embed;
}

function createActionRow() {
    return new ActionRowBuilder().addComponents(
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
            .setStyle(ButtonStyle.Danger)
    );
}

function createFunctionRow(){
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('clear_tasks')
            .setLabel('Clear Tasks')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('update_board')
            .setLabel('Update Board')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('publish')
            .setLabel('Publish')
            .setStyle(ButtonStyle.Primary)
    );
}

function createStatusRow() {
    return new ActionRowBuilder().addComponents(
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
}



async function handleAddTask(interaction, userId, db) {
    await interaction.reply({ content: 'Please enter the task to add:', ephemeral: true });

    const filter = response => response.author.id === userId;
    const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
    const task = collected.first().content;
    db.run(`INSERT INTO todo_tasks (user_id, task, status) VALUES (?, ?, ?)`, [userId, task, 'todo']);
    await collected.first().delete();

    // Fetch updated tasks
    db.all(`SELECT * FROM todo_tasks WHERE user_id = ?`, [userId], async (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }

        const updatedEmbed = createTodoEmbed(interaction.user.username, rows);
        const actionRow = createActionRow();
        const functionRow = createFunctionRow();
        const statusRow = createStatusRow();

        await interaction.editReply({ content: 'Task added!', embeds: [updatedEmbed], components: [actionRow, functionRow, statusRow], ephemeral: true });
    });
}

async function handleCompleteTask(interaction, userId, db) {
    db.all(`SELECT * FROM todo_tasks WHERE user_id = ?`, [userId], async (err, rows) => {
        if (rows.length === 0) {
            await interaction.reply({ content: 'No tasks to complete.', ephemeral: true });
            return;
        }
        await interaction.reply({ content: 'Please enter the task number to complete:', ephemeral: true });
        const filter = response => response.author.id === userId;
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
        const taskNumber = parseInt(collected.first().content);
        if (isNaN(taskNumber) || taskNumber < 1 || taskNumber > rows.length) {
            await interaction.editReply({ content: 'Invalid task number.', ephemeral: true });
        } else {
            const taskId = rows[taskNumber - 1].id;
            db.run(`UPDATE todo_tasks SET status = ? WHERE id = ?`, ['done', taskId]);

            // Fetch updated tasks
            db.all(`SELECT * FROM todo_tasks WHERE user_id = ?`, [userId], async (err, updatedRows) => {
                if (err) {
                    console.error(err);
                    return;
                }

                const updatedEmbed = createTodoEmbed(interaction.user.username, updatedRows);
                const actionRow = createActionRow();
                const functionRow = createFunctionRow();
                const statusRow = createStatusRow();

                await interaction.editReply({ content: `Task ${taskNumber} marked as completed!`, embeds: [updatedEmbed], components: [actionRow, functionRow, statusRow], ephemeral: true });
            });
        }
        await collected.first().delete();
    });
}

async function handleRemoveTask(interaction, userId, db) {
    db.all(`SELECT * FROM todo_tasks WHERE user_id = ?`, [userId], async (err, rows) => {
        if (rows.length === 0) {
            await interaction.reply({ content: 'No tasks to remove.', ephemeral: true });
            return;
        }
        await interaction.reply({ content: 'Please enter the task number to remove:', ephemeral: true });
        const filter = response => response.author.id === userId;
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
        const taskNumber = parseInt(collected.first().content);
        if (isNaN(taskNumber) || taskNumber < 1 || taskNumber > rows.length) {
            await interaction.editReply({ content: 'Invalid task number.', ephemeral: true });
        } else {
            const taskId = rows[taskNumber - 1].id;
            db.run(`DELETE FROM todo_tasks WHERE id = ?`, [taskId]);

            // Fetch updated tasks
            db.all(`SELECT * FROM todo_tasks WHERE user_id = ?`, [userId], async (err, updatedRows) => {
                if (err) {
                    console.error(err);
                    return;
                }

                const updatedEmbed = createTodoEmbed(interaction.user.username, updatedRows);
                const actionRow = createActionRow();
                const functionRow = createFunctionRow();
                const statusRow = createStatusRow();

                await interaction.editReply({ content: `Task ${taskNumber} removed!`, embeds: [updatedEmbed], components: [actionRow, functionRow, statusRow], ephemeral: true });
            });
        }
        await collected.first().delete();
    });
}

async function handleClearTasks(interaction, userId, db, actionRow, statusRow) {
    db.run(`DELETE FROM todo_tasks WHERE user_id = ?`, [userId]);

    // Fetch updated tasks (should be empty)
    db.all(`SELECT * FROM todo_tasks WHERE user_id = ?`, [userId], async (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }

        const updatedEmbed = createTodoEmbed(interaction.user.username, rows);

        await interaction.update({ content: 'All tasks cleared!', embeds: [updatedEmbed], components: [actionRow, statusRow], ephemeral: true });
    });
}

async function handleUpdateBoard(interaction, userId, db, embed, actionRow, functionRow, statusRow) {
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

        await interaction.update({ embeds: [updatedEmbed], components: [actionRow, functionRow, statusRow], ephemeral: true });
    });
}