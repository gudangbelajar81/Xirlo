
require('dotenv').config({ path: __dirname + '/.env' });
const mysql = require('mysql2/promise');
async function migrate() {
  const pool = mysql.createPool({ host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 3307, user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'toko_ht' });
  try {
    await pool.query('ALTER TABLE products ADD COLUMN barcode VARCHAR(255) NULL');
    console.log('Added barcode column');
  } catch(e) { console.log('Column might already exist', e.message); }
  console.log('Done.');
  process.exit(0);
}
migrate();
