const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

function getBookRatings(guildId) {
    const dbDir = path.join(__dirname, guildId);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'database.db');
    const db = new sqlite3.Database(dbPath);
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS book_ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            book_title TEXT,
            isbn TEXT,
            rating INTEGER NOT NULL,
            spicy_rating INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    });
    return db;
}

function getGameRatings(guildId) {
    const dbDir = path.join(__dirname, guildId);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'database.db');
    const db = new sqlite3.Database(dbPath);
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS game_ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            game_title TEXT,
            game_id TEXT,
            rating INTEGER NOT NULL,
            url TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    });
    return db;
}

function getWaterLeaderboard(guildId){
    const dbDir = path.join(__dirname, guildId);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'database.db');
    const db = new sqlite3.Database(dbPath);
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS water_leaderboard (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            water_amount INTEGER NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    });
    return db;
}


function getVotes(guildId) {
    const dbDir = path.join(__dirname, guildId);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'database.db');
    const db = new sqlite3.Database(dbPath);
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            book_title TEXT,
            isbn TEXT,
            votes INTEGER DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    });
    return db;
}

module.exports = { getBookRatings, getGameRatings, getVotes, getWaterLeaderboard };