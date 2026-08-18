const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const tables = ['FriendRequests', 'Friendships', 'NoteShares'];

function inspect(tableIndex) {
  if (tableIndex >= tables.length) {
    db.close();
    return;
  }
  const table = tables[tableIndex];
  db.get(`SELECT sql FROM sqlite_master WHERE name='${table}'`, (err, schema) => {
    if (err) console.error(err);
    console.log(`Schema for ${table}:`, schema ? schema.sql : 'None');
    inspect(tableIndex + 1);
  });
}

inspect(0);
