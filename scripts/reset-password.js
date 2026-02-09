const BetterSqlite3 = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const { app } = require('electron');

app.whenReady().then(async () => {
  try {
    const dbPath = path.join(app.getPath('userData'), 'aionui', 'aionui.db');
    console.log('DB:', dbPath);
    const db = new BetterSqlite3(dbPath);

    const users = db.prepare('SELECT id, username FROM users').all();
    console.log('Users:', JSON.stringify(users));

    const newPassword = 'admin123';
    const hash = bcrypt.hashSync(newPassword, 10);
    const now = Date.now();
    const jwtSecret = crypto.randomBytes(64).toString('hex');

    const result = db.prepare('UPDATE users SET password_hash = ?, jwt_secret = ?, updated_at = ? WHERE username = ?').run(hash, jwtSecret, now, 'admin');
    console.log('Updated rows:', result.changes);
    console.log('');
    console.log('Password reset!');
    console.log('Username: admin');
    console.log('Password: admin123');
    db.close();
  } catch (err) {
    console.error('Error:', err);
  }
  app.quit();
});
