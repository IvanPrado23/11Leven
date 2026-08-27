const mysql = require('mysql2/promise');

async function setPassword() {
  try {
    const c = await mysql.createConnection({ host: '127.0.0.1', port: 3306, user: 'root', password: '' });
    try {
      await c.query("ALTER USER 'root'@'localhost' IDENTIFIED BY '1234'");
    } catch (e) {
      console.log('Fallback:', e.message);
    }
    console.log('Password set successfully to 1234');
    await c.end();
  } catch (err) {
    console.log('Already configured or error:', err.message);
  }
}

setPassword();
