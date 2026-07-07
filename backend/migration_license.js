
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const backendPath = path.join(__dirname, 'public_key.pem');
const bossPath = 'D:\\\\PROJEK APLIKASI\\\\toko-HT\\\\boss-keygen';
if (!fs.existsSync(bossPath)) fs.mkdirSync(bossPath);
const privatePath = path.join(bossPath, 'private_key.pem');

fs.writeFileSync(backendPath, publicKey);
fs.writeFileSync(privatePath, privateKey);
console.log('RSA Keys generated.');

require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');
async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'toko_ht'
  });
  
  await pool.query('CREATE TABLE IF NOT EXISTS app_license (id INT PRIMARY KEY AUTO_INCREMENT, machine_id VARCHAR(50) NOT NULL, installation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, license_key TEXT, status ENUM(\'trial\', \'active\') DEFAULT \'trial\')');
  
  const [rows] = await pool.query('SELECT * FROM app_license LIMIT 1');
  if (rows.length === 0) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let machineId = '';
    for(let i=0; i<8; i++) {
      if(i===2 || i===7) machineId += '-';
      else machineId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const date = new Date();
    date.setDate(date.getDate() - 6);
    await pool.query('INSERT INTO app_license (machine_id, installation_date) VALUES (?, ?)', [machineId, date]);
    console.log('Inserted dummy expired license record for testing.');
  }
  console.log('DB Migration done.');
  process.exit(0);
}
migrate();
