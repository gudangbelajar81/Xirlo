CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'admin') NOT NULL,
  branch_id INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  app_name VARCHAR(100) NOT NULL DEFAULT 'Xirlo POS',
  logo_url VARCHAR(255) DEFAULT '',
  theme_mode ENUM('light', 'dark') DEFAULT 'light',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  image_url VARCHAR(255) DEFAULT '',
  price DECIMAL(15, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  color_desc VARCHAR(100) DEFAULT '',
  category VARCHAR(50) DEFAULT '',
  branch_id INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cashier_id INT NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'CASH',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cashier_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS transaction_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  product_id INT NOT NULL,
  qty INT NOT NULL,
  price_unit DECIMAL(15, 2) NOT NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Insert Default Super Admin (password: admin123)
INSERT IGNORE INTO users (username, password, role) VALUES ('superadmin', '$2b$10$yiNAp6AsvwINjp6SpE..zOHRI9QE.64A821H4RFhfwxDDnNfPs7r6', 'super_admin');

-- Insert Default Settings
INSERT IGNORE INTO settings (id, app_name) VALUES (1, 'Xirlo POS');

-- Insert Sample Product
INSERT IGNORE INTO products (name, price, stock, color_desc, category) VALUES 
('Gula Jawa Premium 1 Kg', 25000, 100, 'Cokelat Putih', 'Grosir'),
('Gula Semut 500g', 15000, 50, 'Cokelat Muda', 'Eceran'),
('Gula Aren Cair 1L', 35000, 5, 'Hitam Manis', 'Eceran');
