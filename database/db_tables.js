const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

function initializeDatabase(guildId, tableName, tableSchema) {
    const dbDir = path.join(__dirname, guildId);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'database.db');
    const db = new sqlite3.Database(dbPath);
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS ${tableName} (${tableSchema})`);
    });
    return db;
}

function getBookRatings(guildId) {
    const tableSchema = `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        book_title TEXT,
        isbn TEXT,
        rating INTEGER NOT NULL,
        spicy_rating INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    `;
    return initializeDatabase(guildId, 'book_ratings', tableSchema);
}

function getGameRatings(guildId) {
    const tableSchema = `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        game_title TEXT,
        game_id TEXT,
        rating INTEGER NOT NULL,
        url TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    `;
    return initializeDatabase(guildId, 'game_ratings', tableSchema);
}

function getWaterLeaderboard(guildId) {
    const tableSchema = `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        water_amount INTEGER NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    `;
    return initializeDatabase(guildId, 'water_leaderboard', tableSchema);
}

function getVotes(guildId) {
    const tableSchema = `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        book_title TEXT,
        isbn TEXT,
        votes INTEGER DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    `;
    return initializeDatabase(guildId, 'votes', tableSchema);
}

function getNotificationConfig(guildId) {
    const tableSchema = `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        notification_channel_id TEXT,
        youtube_channel_id TEXT,
        custom_message TEXT,
        last_checked_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_checked_video_id TEXT
    `;
    return initializeDatabase(guildId, 'notification_config', tableSchema);
}

function getWaterReminders(guildId) {
    const tableSchema = `
        user_id TEXT PRIMARY KEY,
        interval INTEGER,
        next_reminder TIMESTAMP
    `;
    return initializeDatabase(guildId, 'reminders', tableSchema);
}

module.exports = { getBookRatings, getGameRatings, getVotes, getWaterLeaderboard, getNotificationConfig, getWaterReminders };