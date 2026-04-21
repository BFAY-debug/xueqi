SET NAMES utf8mb4;
USE xueqi_db;

-- ----------------------------------------------------------
-- 好友申请
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS friend_requests (
    id           INT PRIMARY KEY AUTO_INCREMENT,
    sender_id    INT NOT NULL,
    receiver_id  INT NOT NULL,
    message      VARCHAR(200) DEFAULT NULL COMMENT 'optional note',
    status       ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_pair (sender_id, receiver_id),
    INDEX idx_receiver_status (receiver_id, status, created_at DESC),
    INDEX idx_sender_status (sender_id, status),
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 好友关系（user1_id < user2_id，与 conversations 表一致）
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS friendships (
    id         INT PRIMARY KEY AUTO_INCREMENT,
    user1_id   INT NOT NULL COMMENT 'smaller user id',
    user2_id   INT NOT NULL COMMENT 'larger user id',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_users (user1_id, user2_id),
    INDEX idx_user1 (user1_id),
    INDEX idx_user2 (user2_id),
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 黑名单
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS blocks (
    id         INT PRIMARY KEY AUTO_INCREMENT,
    blocker_id INT NOT NULL,
    blocked_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_blocker_blocked (blocker_id, blocked_id),
    INDEX idx_blocked (blocked_id),
    FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
