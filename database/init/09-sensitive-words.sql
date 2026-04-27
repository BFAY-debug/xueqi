-- Sensitive words table (managed via admin panel)
CREATE TABLE IF NOT EXISTS sensitive_words (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    word        VARCHAR(100) NOT NULL UNIQUE,
    created_by  INT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;
