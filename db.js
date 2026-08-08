const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');

let db = null;

function getDb() {
  if (!db) throw new Error('数据库尚未初始化，请先调用 initDb()');
  return db;
}

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      celebrities TEXT NOT NULL,
      report_time TEXT NOT NULL,
      report_frequency TEXT NOT NULL DEFAULT 'daily',
      report_day INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      celebrity TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('simulated', 'manual')),
      user_email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS usage_limits (
      email TEXT PRIMARY KEY,
      subscribe_count INTEGER DEFAULT 0,
      trigger_count INTEGER DEFAULT 0
    )
  `);

  // 迁移
  try { db.run('ALTER TABLE users ADD COLUMN report_frequency TEXT DEFAULT "daily"'); } catch (e) {}
  try { db.run('ALTER TABLE users ADD COLUMN report_day INTEGER'); } catch (e) {}
  try { db.run('ALTER TABLE reports ADD COLUMN user_email TEXT'); } catch (e) {}

  saveDb();
  console.log('数据库初始化完成');
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

module.exports = { getDb, initDb, saveDb };
