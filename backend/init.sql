CREATE TABLE IF NOT EXISTS tenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50),
  plan_tier VARCHAR(50) DEFAULT 'TRIAL',
  status VARCHAR(50) DEFAULT 'active',
  trial_expires_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  username VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'admin', 'cashier') NOT NULL,
  branch_id INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE KEY unique_tenant_user (tenant_id, username)
);

CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  app_name VARCHAR(100) NOT NULL DEFAULT 'Xirlo POS',
  logo_url VARCHAR(255) DEFAULT '',
  theme_mode ENUM('light', 'dark') DEFAULT 'light',
  phone_number VARCHAR(50) DEFAULT '',
  margin_alert_threshold INT DEFAULT 10,
  theme_color VARCHAR(50) DEFAULT '#A0522D',
  border_radius VARCHAR(20) DEFAULT '12px',
  font_family VARCHAR(100) DEFAULT '''Inter'', sans-serif',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  name VARCHAR(100) NOT NULL,
  image_url VARCHAR(255) DEFAULT '',
  price DECIMAL(15, 2) NOT NULL,
  cost_price DECIMAL(15, 2) DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  min_stock INT DEFAULT 0,
  color_desc VARCHAR(100) DEFAULT '',
  category VARCHAR(50) DEFAULT '',
  barcode VARCHAR(100),
  branch_id INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  cashier_id INT NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'CASH',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (cashier_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS transaction_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  transaction_id INT NOT NULL,
  product_id INT NOT NULL,
  qty INT NOT NULL,
  price_unit DECIMAL(15, 2) NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS stock_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  product_id INT NOT NULL,
  qty_change INT NOT NULL,
  reason VARCHAR(255),
  user_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  user_id INT NOT NULL,
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP NULL,
  start_cash DECIMAL(15, 2) NOT NULL,
  end_cash DECIMAL(15, 2),
  system_cash DECIMAL(15, 2),
  status VARCHAR(50) DEFAULT 'open',
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS app_license (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  machine_id VARCHAR(255) NOT NULL,
  license_key VARCHAR(255),
  status VARCHAR(50) DEFAULT 'trial',
  tier VARCHAR(50) DEFAULT 'BASIC',
  app_code VARCHAR(50) DEFAULT 'APP_KASIR',
  features TEXT,
  installation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiry_date TIMESTAMP NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS api_keys_manager (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  provider VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  api_key VARCHAR(255) NOT NULL,
  base_url VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'Alive',
  used_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Insert Default Tenant
INSERT IGNORE INTO tenants (id, store_name, owner_name, plan_tier) VALUES (1, 'Alio BOS Default Store', 'Admin', 'LIFETIME_BUYOUT');

-- Insert Default Super Admin (password: admin123)
INSERT IGNORE INTO users (tenant_id, username, password, role) VALUES (1, 'superadmin', '$2b$10$yiNAp6AsvwINjp6SpE..zOHRI9QE.64A821H4RFhfwxDDnNfPs7r6', 'super_admin');

-- Insert Default Settings
INSERT IGNORE INTO settings (id, tenant_id, app_name) VALUES (1, 1, 'Xirlo POS');

-- Insert Sample Product
INSERT IGNORE INTO products (tenant_id, name, price, stock, color_desc, category) VALUES 
(1, 'Gula Jawa Premium 1 Kg', 25000, 100, 'Cokelat Putih', 'Grosir'),
(1, 'Gula Semut 500g', 15000, 50, 'Cokelat Muda', 'Eceran'),
(1, 'Gula Aren Cair 1L', 35000, 5, 'Hitam Manis', 'Eceran');
