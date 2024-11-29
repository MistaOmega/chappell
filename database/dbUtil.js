const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

function getDatabase(guildId, dbName) {
    const dbDir = path.join(__dirname, guildId);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, `${dbName}.db`);
    const db = new sqlite3.Database(dbPath);
    return db;
}

module.exports = { getDatabase };