CREATE TABLE IF NOT EXISTS admin_login_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  ip VARCHAR(45) NOT NULL,
  user_agent VARCHAR(500),
  success TINYINT(1) NOT NULL DEFAULT 0,
  failure_reason VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);
