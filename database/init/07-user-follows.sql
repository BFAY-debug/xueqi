CREATE TABLE IF NOT EXISTS user_follows (
  follower_id  INT NOT NULL,
  following_id INT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, following_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE user_stats ADD COLUMN follower_count INT DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN following_count INT DEFAULT 0;
