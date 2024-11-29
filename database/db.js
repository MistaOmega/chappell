const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./bookratings.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS ratings (
                                                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                   user_id TEXT NOT NULL,
                                                   book_title TEXT,
                                                   isbn TEXT,
                                                   rating INTEGER NOT NULL,
                                                   spicy_rating INTEGER,
                                                   timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
});

db.close();