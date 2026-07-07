
require('dotenv').config({ path: __dirname + '/.env' });
const mysql = require('mysql2/promise');
async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'toko_ht'
  });
  
  try {
    await pool.query('ALTER TABLE app_license ADD COLUMN expiry_date DATETIME NULL');
    console.log('Added expiry_date');
  } catch(e) { console.log('Column expiry_date might already exist', e.message); }
  
  try {
    await pool.query('ALTER TABLE app_license ADD COLUMN tier VARCHAR(20) DEFAULT \'BASIC\'');
    console.log('Added tier');
  } catch(e) { console.log('Column tier might already exist', e.message); }
  
  console.log('Migration V2 done.');
  process.exit(0);
}
migrate();
