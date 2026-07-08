function pauseAndExit() {
  console.log('\nTekan ENTER untuk menutup jendela ini...');
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  readline.question('', () => {
    process.exit(1);
  });
}

process.on('uncaughtException', (err) => {
  console.error('\n[CRITICAL ERROR]', err);
  pauseAndExit();
});

// Standalone mode - fully self-contained, no .env file required
const JWT_SECRET = 'kasir_ht_production_2024_secure_key';
const APP_PORT = 5001;
const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const axios = require('axios');

const getHardwareId = () => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (!net.internal && net.mac && net.mac !== '00:00:00:00:00:00') {
        return 'HW-' + net.mac.replace(/:/g, '').toUpperCase();
      }
    }
  }
  return 'MACHINE-' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

const rootDir = process.pkg ? path.dirname(process.execPath) : __dirname;

const publicKeyPath = path.join(__dirname, 'public_key.pem');
const publicKey = fs.existsSync(publicKeyPath) ? fs.readFileSync(publicKeyPath, 'utf8') : '';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(rootDir, 'uploads')));
app.use(express.static(path.join(rootDir, 'public')));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(rootDir, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

let db;

// --- UTILITIES ---
async function sendWhatsAppMessage(target, message) {
  if (!target || !message) return false;
  
  // Clean target number
  let phone = target.replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '62' + phone.substring(1);
  if (!phone.startsWith('62')) phone = '62' + phone;

  // Get alive keys
  const keys = await db.all("SELECT * FROM api_keys_manager WHERE status = 'Alive' ORDER BY id ASC");
  if (keys.length === 0) {
    console.warn('[WA-Gateway] No active API keys found.');
    return false;
  }

  for (const key of keys) {
    try {
      // Fonnte uses https://api.fonnte.com/send
      const response = await fetch(key.base_url, {
        method: 'POST',
        headers: {
          'Authorization': key.api_key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          target: phone,
          message: message
        })
      });

      const data = await response.json();
      
      if (response.ok && data.status) {
        // Success
        await db.run("UPDATE api_keys_manager SET used_count = used_count + 1 WHERE id = ?", [key.id]);
        return true;
      } else {
        // Failed (e.g. Rate limit or invalid key)
        console.warn(`[WA-Gateway] Key ${key.name} failed:`, data.reason || 'Unknown error');
        if (response.status === 429 || (data.reason && data.reason.includes('limit'))) {
          await db.run("UPDATE api_keys_manager SET status = 'Limit' WHERE id = ?", [key.id]);
        } else if (response.status === 401) {
          await db.run("UPDATE api_keys_manager SET status = 'Dead' WHERE id = ?", [key.id]);
        }
        // Loop continues to next key
      }
    } catch (err) {
      console.error(`[WA-Gateway] Error with key ${key.name}:`, err.message);
      // Might be a network issue, keep key alive but try next one
    }
  }
  return false;
}

// --- MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  // Default JWT_SECRET if not provided in env for standalone
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Super Admin only' });
  next();
};

// --- ROUTES ---
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const rows = await db.all('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Settings API
app.get('/api/settings', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM settings WHERE id = 1');
    res.json(rows[0] || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/settings', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { app_name, logo_url, theme_mode, phone_number, margin_alert_threshold, theme_color, border_radius, font_family } = req.body;
  try {
    await db.run(
      'UPDATE settings SET app_name = ?, logo_url = ?, theme_mode = ?, phone_number = ?, margin_alert_threshold = ?, theme_color = ?, border_radius = ?, font_family = ? WHERE id = 1', 
      [app_name, logo_url, theme_mode, phone_number, margin_alert_threshold ?? 10, theme_color, border_radius, font_family]
    );
    res.json({ message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

  // API Keys Manager
  app.get('/api/keys', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const rows = await db.all('SELECT * FROM api_keys_manager ORDER BY id DESC');
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/keys', authenticateToken, requireSuperAdmin, async (req, res) => {
    const { provider, name, api_key, base_url } = req.body;
    try {
      const result = await db.run(
        'INSERT INTO api_keys_manager (provider, name, api_key, base_url) VALUES (?, ?, ?, ?)',
        [provider, name, api_key, base_url]
      );
      res.status(201).json({ id: result.lastID });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/keys/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      await db.run('DELETE FROM api_keys_manager WHERE id = ?', [req.params.id]);
      res.json({ message: 'Key deleted' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/keys/:id/reset', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      await db.run("UPDATE api_keys_manager SET status = 'Alive', used_count = 0 WHERE id = ?", [req.params.id]);
      res.json({ message: 'Key reset' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- PHASE 4: DETEKTIF HPP (AI Margin) ---
  app.get('/api/alerts/margin', authenticateToken, async (req, res) => {
    try {
      const settings = await db.get('SELECT margin_alert_threshold FROM settings WHERE id = 1');
      const threshold = settings?.margin_alert_threshold ?? 10;
      const thresholdDecimal = threshold / 100.0;

      // Find products where (price - cost_price) / cost_price < threshold
      // and cost_price > 0 to avoid division by zero
      const rows = await db.all(`
        SELECT id, name, price, cost_price, 
               ROUND(((price - cost_price) * 100.0) / cost_price, 2) as margin_pct
        FROM products 
        WHERE cost_price > 0 AND ((price - cost_price) * 1.0 / cost_price) < ?
      `, [thresholdDecimal]);
      res.json({ threshold, items: rows });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  // ------------------------------------------

// Products API

  app.get('/api/inventory/history', authenticateToken, async (req, res) => {
    try {
      const rows = await db.all(`
        SELECT h.*, p.name as product_name
        FROM stock_history h
        JOIN products p ON h.product_id = p.id
        ORDER BY h.created_at DESC
        LIMIT 100
      `);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/inventory/alerts/low-stock', authenticateToken, async (req, res) => {
    try {
      const rows = await db.all(`
        SELECT * FROM products WHERE stock <= min_stock AND min_stock > 0
      `);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM products');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { name, image_url, price, cost_price, stock, color_desc, category, barcode } = req.body;
  try {
    const result = await db.run(
      'INSERT INTO products (name, image_url, price, stock, color_desc, category, cost_price, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, image_url, price, stock, color_desc, category, cost_price, barcode]
    );
    res.status(201).json({ id: result.lastID });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { name, image_url, price, cost_price, stock, color_desc, category, barcode } = req.body;
  try {
    await db.run(
      'UPDATE products SET name = ?, image_url = ?, price = ?, stock = ?, color_desc = ?, category = ?, cost_price = ?, barcode = ? WHERE id = ?',
      [name, image_url, price, stock, color_desc, category, cost_price, barcode, req.params.id]
    );
    res.json({ message: 'Product updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    await db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transactions API
app.post('/api/transactions', authenticateToken, async (req, res) => {
  const { items, total_amount, payment_method } = req.body;
  
  try {
    await db.run('BEGIN TRANSACTION');
    
    // Verify stock
    for (const item of items) {
      const prodRows = await db.all('SELECT stock, name, cost_price FROM products WHERE id = ?', [item.product_id]);
      if (prodRows.length === 0) throw new Error(`Product ${item.product_id} not found`);
      const prod = prodRows[0];
      if (prod.stock < item.qty) {
        throw new Error(`Stock tidak cukup untuk ${prod.name}. Sisa: ${prod.stock}`);
      }
      item.cost_price = prod.cost_price;
    }
    
    const cashierId = req.user ? req.user.id : 1; 
    const txResult = await db.run(
      'INSERT INTO transactions (cashier_id, total_amount, payment_method) VALUES (?, ?, ?)',
      [cashierId, total_amount, payment_method]
    );
    
    const transactionId = txResult.lastID;
    
    for (const item of items) {
      await db.run(
        'INSERT INTO transaction_items (transaction_id, product_id, qty, price_unit, cost_price) VALUES (?, ?, ?, ?, ?)',
        [transactionId, item.product_id, item.qty, item.price, item.cost_price]
      );
      await db.run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.qty, item.product_id]);
          await db.run('INSERT INTO stock_history (product_id, qty_change, reason, user_name) VALUES (?, ?, \'Terjual di Kasir\', ?)', [item.product_id, -item.qty, req.user.username]);
    }
    
    await db.run('COMMIT');

    // --- PHASE 1: WA RECEIPT ---
    const { customer_wa } = req.body;
    if (customer_wa) {
      // Check if feature is active
      const licRows = await db.all('SELECT features FROM app_license ORDER BY id ASC LIMIT 1');
      if (licRows.length > 0) {
        let features = [];
        try { features = JSON.parse(licRows[0].features || '[]'); } catch (e) {}
        
        if (features.includes('feat_wa_receipt')) {
          const setRows = await db.all('SELECT app_name FROM settings WHERE id = 1');
          const appName = setRows.length > 0 ? setRows[0].app_name : 'Toko Anda';
          
          let receiptMsg = `*[ STRUK DIGITAL - ${appName} ]*\n`;
          receiptMsg += `No. Nota: #${transactionId}\n`;
          receiptMsg += `Tanggal: ${new Date().toLocaleString('id-ID')}\n`;
          receiptMsg += `Kasir: ${req.user ? req.user.username : 'Umum'}\n\n`;
          
          receiptMsg += `*Rincian Belanja:*\n`;
          for (const item of items) {
             const pRows = await db.all('SELECT name FROM products WHERE id = ?', [item.product_id]);
             const pName = pRows.length > 0 ? pRows[0].name : 'Barang';
             receiptMsg += `- ${pName.substring(0,20)} (${item.qty} x ${item.price})\n`;
          }
          
          receiptMsg += `\n*TOTAL BAYAR: Rp ${Number(total_amount).toLocaleString('id-ID')}*\n`;
          receiptMsg += `Metode: ${payment_method}\n\n`;
          receiptMsg += `_Terima kasih telah berbelanja di ${appName}!_`;
          
          // Send asynchronously
          sendWhatsAppMessage(customer_wa, receiptMsg).catch(console.error);
        }
      }
    }
    // ----------------------------
    
    res.status(201).json({ message: 'Transaction successful', transaction_id: transactionId });
  } catch (error) {
    await db.run('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/transactions/summary', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const incomeQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN DATE(created_at) = DATE('now', 'localtime') THEN total_amount ELSE 0 END), 0) as today_income,
        COALESCE(SUM(CASE WHEN strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime') THEN total_amount ELSE 0 END), 0) as month_income
      FROM transactions
    `;
    const costQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN DATE(t.created_at) = DATE('now', 'localtime') THEN (ti.qty * ti.cost_price) ELSE 0 END), 0) as today_cost,
        COALESCE(SUM(CASE WHEN strftime('%Y-%m', t.created_at) = strftime('%Y-%m', 'now', 'localtime') THEN (ti.qty * ti.cost_price) ELSE 0 END), 0) as month_cost
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
    `;
    const incomeResult = await db.get(incomeQuery);
    const costResult = await db.get(costQuery);

    res.json({
      today_income: Number(incomeResult.today_income),
      month_income: Number(incomeResult.month_income),
      today_profit: Number(incomeResult.today_income) - Number(costResult.today_cost),
      month_profit: Number(incomeResult.month_income) - Number(costResult.month_cost)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const rows = await db.all('SELECT t.*, u.username as cashier_name FROM transactions t JOIN users u ON t.cashier_id = u.id ORDER BY t.created_at DESC LIMIT 50');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/transactions/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { total_amount, payment_method } = req.body;
    await db.run('UPDATE transactions SET total_amount = ?, payment_method = ? WHERE id = ?', [total_amount, payment_method, req.params.id]);
    res.json({ message: 'Transaction updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/transactions/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const reason = req.body.reason || 'Tidak ada alasan';
    await db.run('BEGIN TRANSACTION');
    
    // Get transaction details for WA
    const tx = await db.get('SELECT total_amount FROM transactions WHERE id = ?', [req.params.id]);
    
    // 1. Revert stock
    const items = await db.all('SELECT product_id, qty FROM transaction_items WHERE transaction_id = ?', [req.params.id]);
    for (const item of items) {
      await db.run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.qty, item.product_id]);
    }
    
    // 2. Delete items
    await db.run('DELETE FROM transaction_items WHERE transaction_id = ?', [req.params.id]);
    
    // 3. Delete transaction
    await db.run('DELETE FROM transactions WHERE id = ?', [req.params.id]);
    
    await db.run('COMMIT');

    // --- PHASE 2: MATA ELANG (ANTI-THEFT) ---
    if (tx) {
      const licRows = await db.all('SELECT features FROM app_license ORDER BY id ASC LIMIT 1');
      if (licRows.length > 0) {
        let features = [];
        try { features = JSON.parse(licRows[0].features || '[]'); } catch (e) {}
        
        if (features.includes('feat_anti_theft')) {
          const setRows = await db.all('SELECT app_name, phone_number FROM settings WHERE id = 1');
          if (setRows.length > 0 && setRows[0].phone_number) {
            const ownerWa = setRows[0].phone_number;
            const appName = setRows[0].app_name;
            const kasir = req.user ? req.user.username : 'Unknown';
            
            const alertMsg = `🦅 *[MATA ELANG - ALERT]*\n\nBos, ada nota yang dihapus di *${appName}*!\n\nKasir: ${kasir}\nNo Nota: #${req.params.id}\nNominal: Rp ${Number(tx.total_amount).toLocaleString('id-ID')}\nAlasan: "${reason}"\n\n_Sistem Anti-Maling mendeteksi tindakan ini._`;
            
            sendWhatsAppMessage(ownerWa, alertMsg).catch(console.error);
          }
        }
      }
    }
    // ----------------------------------------

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    await db.run('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// Shifts API
app.get('/api/shifts/current', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const shift = await db.get("SELECT * FROM shifts WHERE user_id = ? AND status = 'open'", [userId]);
    res.json(shift || { status: 'none' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/shifts/open', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { start_cash } = req.body;
    
    // Ensure no open shift
    const existing = await db.get("SELECT * FROM shifts WHERE user_id = ? AND status = 'open'", [userId]);
    if (existing) return res.status(400).json({ error: 'Shift already open' });
    
    await db.run("INSERT INTO shifts (user_id, start_cash, status) VALUES (?, ?, 'open')", [userId, start_cash]);
    res.json({ message: 'Shift opened' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/shifts/close', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { end_cash } = req.body;
    
    const shift = await db.get("SELECT * FROM shifts WHERE user_id = ? AND status = 'open'", [userId]);
    if (!shift) return res.status(400).json({ error: 'No open shift' });
    
    // Calculate system cash
    const sales = await db.get("SELECT COALESCE(SUM(total_amount), 0) as total FROM transactions WHERE cashier_id = ? AND created_at >= ?", [userId, shift.start_time]);
    const systemCash = shift.start_cash + (sales ? sales.total : 0);
    
    await db.run(
      "UPDATE shifts SET end_time = CURRENT_TIMESTAMP, end_cash = ?, system_cash = ?, status = 'closed' WHERE id = ?",
      [end_cash, systemCash, shift.id]
    );
    
    res.json({ message: 'Shift closed', system_cash: systemCash, difference: end_cash - systemCash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// License API
app.get('/api/license/status', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM app_license ORDER BY id ASC LIMIT 1');
    if (rows.length === 0) return res.json({ access: true, mode: 'premium', tier: 'ULTIMATE', app_code: 'APP_KASIR' });
    const license = rows[0];
    
    const currentHardwareId = getHardwareId();
    if (license.machine_id !== currentHardwareId) {
      return res.json({ access: false, mode: 'hardware_mismatch', machine_id: currentHardwareId });
    }
    
    if (license.status === 'active') {
      if (license.expiry_date) {
        // Appending 'Z' ensures JS parses the string as UTC rather than Local Time
        const expiryStr = license.expiry_date.endsWith('Z') ? license.expiry_date : license.expiry_date.replace(' ', 'T') + 'Z';
        const expiry = new Date(expiryStr);
        const now = new Date();
        if (now > expiry) {
          await db.run('UPDATE app_license SET status = ? WHERE id = ?', ['trial', license.id]);
          return res.json({ access: false, mode: 'expired', machine_id: license.machine_id, app_code: license.app_code || 'APP_KASIR' });
        }
      }
      
      let parsedFeatures = [];
      try { parsedFeatures = JSON.parse(license.features || '[]'); } catch (e) {}

      return res.json({ access: true, mode: 'premium', tier: license.tier || 'BASIC', features: parsedFeatures, expiry_date: license.expiry_date, app_code: license.app_code || 'APP_KASIR', machine_id: currentHardwareId });
    }
    
    const installDate = new Date(license.installation_date);
    const now = new Date();
    const diffTime = Math.abs(now - installDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 5) {
      return res.json({ access: false, mode: 'expired', machine_id: license.machine_id, app_code: license.app_code || 'APP_KASIR' });
    } else {
      return res.json({ access: true, mode: 'trial', days_left: 5 - diffDays + 1, tier: 'BASIC', app_code: license.app_code || 'APP_KASIR', machine_id: currentHardwareId });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/license/activate', async (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: 'Key is required' });
  try {
    const rows = await db.all('SELECT * FROM app_license ORDER BY id ASC LIMIT 1');
    if (rows.length === 0) return res.status(400).json({ error: 'No license record found' });
    const license = rows[0];
    
    const parts = key.split('.');
    if (parts.length !== 2) return res.status(400).json({ error: 'Format Kunci Tidak Valid.' });
    
    const payloadBase64 = parts[0];
    const signatureBase64 = parts[1];
    
    const payloadStr = Buffer.from(payloadBase64, 'base64').toString('utf8');
    let payload;
    try {
      payload = JSON.parse(payloadStr);
    } catch(e) { return res.status(400).json({ error: 'Payload Corrupted' }); }

    
    const currentHardwareId = getHardwareId();
    if (payload.m !== currentHardwareId) return res.status(400).json({ error: 'ID Toko tidak cocok dengan Hardware PC ini!' });
    
    if (!publicKey) return res.status(500).json({ error: 'Public key missing from server.' });

    const isVerified = crypto.verify(
      'sha256',
      Buffer.from(payloadStr),
      { key: publicKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING },
      Buffer.from(signatureBase64, 'base64')
    );
    
    if (isVerified) {
      const formattedExpiry = payload.e ? new Date(payload.e).toISOString() : null;
      const featuresStr = JSON.stringify(payload.f || []);
      await db.run('UPDATE app_license SET status = ?, license_key = ?, tier = ?, features = ?, expiry_date = ?, machine_id = ?, app_code = ? WHERE id = ?', 
        ['active', key, payload.t || 'BASIC', featuresStr, formattedExpiry, currentHardwareId, payload.a, license.id]);
      res.json({ message: 'Aktivasi Berhasil!' });
    } else {
      res.status(400).json({ error: 'Kode Aktivasi Salah atau Telah Dimanipulasi.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Gagal memverifikasi kunci: ' + error.message });
  }
});

// --- ALVES Smart Licensing (OTP Auto-Binding) ---
let currentOtp = null;
let otpExpiry = null;

app.get('/api/license/otp-request', async (req, res) => {
  const currentHardwareId = getHardwareId();
  currentOtp = Math.floor(100000 + Math.random() * 900000).toString();
  otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 menit
  res.json({ otp: currentOtp, machine_id: currentHardwareId, expires_in: '5 menit' });
});

app.get('/api/license/otp-poll', async (req, res) => {
  if (!currentOtp || new Date() > otpExpiry) {
    return res.status(400).json({ status: 'expired', error: 'OTP Kedaluwarsa' });
  }
  const currentHardwareId = getHardwareId();
  try {
    const lmUrl = process.env.LICENSE_MANAGER_URL || 'http://localhost:5000';
    const response = await axios.post(`${lmUrl}/api/license/poll`, {
      otp: currentOtp,
      machine_id: currentHardwareId
    });
    
    if (response.data && response.data.license_key) {
       const key = response.data.license_key;
       const parts = key.split('.');
       if (parts.length !== 2) throw new Error('Format kunci cacat');
       const payloadBase64 = parts[0];
       const signatureBase64 = parts[1];
       const payloadStr = Buffer.from(payloadBase64, 'base64').toString('utf8');
       const payload = JSON.parse(payloadStr);
       
       const isVerified = crypto.verify(
         'sha256',
         Buffer.from(payloadStr),
         { key: publicKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING },
         Buffer.from(signatureBase64, 'base64')
       );
       
       if (!isVerified) throw new Error('Signature palsu!');
       if (payload.m !== currentHardwareId) throw new Error('HWID mismatch!');
       
       const formattedExpiry = payload.e ? new Date(payload.e).toISOString() : null;
       const featuresStr = JSON.stringify(payload.f || []);
       
       const rows = await db.all('SELECT * FROM app_license ORDER BY id ASC LIMIT 1');
       if (rows.length > 0) {
         await db.run('UPDATE app_license SET status = ?, license_key = ?, tier = ?, features = ?, expiry_date = ?, machine_id = ?, app_code = ? WHERE id = ?',
           ['active', key, payload.t || 'BASIC', featuresStr, formattedExpiry, currentHardwareId, payload.a, rows[0].id]);
       }
       
       currentOtp = null;
       return res.json({ status: 'approved', message: 'Aktivasi Jarak Jauh Berhasil!' });
    }
    res.json({ status: 'pending' });
  } catch (error) {
    if (error.response && error.response.status === 400) {
      currentOtp = null;
      return res.status(400).json({ status: 'rejected', error: 'OTP Ditolak oleh Pusat' });
    }
    res.json({ status: 'pending' });
  }
});

// Users (Super Admin only)
app.post('/api/users', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hash, role]);
    res.json({ message: 'User created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const rows = await db.all('SELECT id, username, role, branch_id FROM users');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload: Image
app.post('/api/upload', authenticateToken, requireSuperAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

// REPORTS API
app.get('/api/reports/sales', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const query = `
      SELECT DATE(created_at) as date, 
             SUM(total_amount) as total_sales, 
             COUNT(id) as total_transactions 
      FROM transactions 
      GROUP BY DATE(created_at) 
      ORDER BY date ASC 
      LIMIT 30
    `;
    const rows = await db.all(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/top-products', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const query = `
      SELECT p.id as product_id, p.name, SUM(ti.qty) as total_sold, p.category
      FROM transaction_items ti 
      JOIN products p ON ti.product_id = p.id 
      GROUP BY p.id 
      ORDER BY total_sold DESC 
      LIMIT 5
    `;
    const rows = await db.all(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fallback for React Router (Single Page App)
app.use((req, res) => {
  const indexPath = path.join(rootDir, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('Folder "public" tidak ditemukan di sebelah EXE. Pastikan folder public ada di sebelah HT-Production-POS.exe');
  }
});

async function startServer() {
  
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
    user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
    password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || 'password',
    database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'xirlo',
    port: process.env.MYSQL_PORT || process.env.DB_PORT || 3307,
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true
  });

  // Create SQLite Wrapper for MySQL
  db = {
    get: async (sql, params) => {
      const [rows] = await pool.query(sql, params);
      return rows[0];
    },
    all: async (sql, params) => {
      const [rows] = await pool.query(sql, params);
      return rows;
    },
    run: async (sql, params) => {
      const [result] = await pool.query(sql, params);
      return { lastID: result.insertId, changes: result.affectedRows };
    },
    exec: async (sql) => {
      sql = sql.replace(/INTEGER PRIMARY KEY/g, 'INT PRIMARY KEY').replace(/AUTOINCREMENT/g, 'AUTO_INCREMENT');
      return pool.query(sql);
    }
  };


    // Phase 7 migrations
    try { await db.exec('ALTER TABLE products ADD COLUMN min_stock INT DEFAULT 0'); } catch(e) {}


  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    const hash = await bcrypt.hash('admin', 10);
    await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hash, 'super_admin']);
  }
  
  const settingsCount = await db.get('SELECT COUNT(*) as count FROM settings');
  if (settingsCount.count === 0) {
    await db.run('INSERT INTO settings (id, app_name) VALUES (1, "Alio BOS")');
  }

  const licenseCount = await db.get('SELECT COUNT(*) as count FROM app_license');
  if (licenseCount.count === 0) {
    const mId = getHardwareId();
    await db.run('INSERT INTO app_license (machine_id) VALUES (?)', [mId]);
  }
  
  // Safely add features column if it doesn't exist
  try {
    await db.run('ALTER TABLE app_license ADD COLUMN features TEXT');
  } catch (e) {}

  try {
    await db.run('ALTER TABLE settings ADD COLUMN margin_alert_threshold INTEGER DEFAULT 10');
  } catch (e) {}

  try {
    await db.run('ALTER TABLE settings ADD COLUMN theme_color TEXT DEFAULT "#A0522D"');
    await db.run('ALTER TABLE settings ADD COLUMN border_radius TEXT DEFAULT "12px"');
    await db.run('ALTER TABLE settings ADD COLUMN font_family TEXT DEFAULT "\'Inter\', sans-serif"');
  } catch (e) {}

  // Handle SPA (React Router)
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.accepts('html')) {
      res.sendFile(path.join(rootDir, 'public', 'index.html'));
    } else {
      next();
    }
  });

  const PORT = process.env.PORT || APP_PORT;
  const server = 
  // Vendor Portal API (Secret)
  app.post('/api/vendor/generate-key', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
      const privateKeyPath = path.join(__dirname, 'private_key.pem');
      if (!fs.existsSync(privateKeyPath)) {
        return res.status(403).json({ error: 'Akses Ditolak: Fitur ini hanya tersedia di Mesin Induk Vendor (Private Key missing).' });
      }

      const { machine_id, expiry_date, tier, app_code, features } = req.body;
      if (!machine_id) return res.status(400).json({ error: 'Machine ID diperlukan' });

      const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      
      const payload = {
        sub: machine_id,
        t: tier || 'BASIC',
        a: app_code || 'APP_KASIR',
        f: features || [],
        e: expiry_date || null
      };

      const payloadStr = JSON.stringify(payload);
      const signature = crypto.sign(
        'sha256',
        Buffer.from(payloadStr),
        { key: privateKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING }
      );

      const token = Buffer.from(payloadStr).toString('base64') + '.' + signature.toString('base64');
      res.json({ token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.listen(PORT, () => {
    console.log(`Standalone Kasir Server running on port ${PORT}`);
    
    // Auto-open Chrome App Mode
    const url = `http://localhost:${PORT}`;
    const command = process.platform === 'win32' 
      ? `start chrome --app=${url}`
      : process.platform === 'darwin' 
      ? `open -na "Google Chrome" --args --app=${url}`
      : `google-chrome --app=${url}`;
      
    exec(command, (err) => {
      if (err) console.log('Notice: Could not auto-launch Chrome. Please open browser manually.');
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[ERROR] Port ${PORT} sudah digunakan!`);
      console.error('Pastikan tidak ada aplikasi kasir lain atau terminal (npm run dev) yang sedang berjalan.');
    } else {
      console.error('\n[ERROR] Gagal menyalakan server:', err.message);
    }
    pauseAndExit();
  });
}

startServer().catch(err => {
  console.error('\n[STARTUP ERROR]', err);
  pauseAndExit();
});
