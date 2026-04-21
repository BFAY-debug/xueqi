-- Migration: v2.4 -> v2.5
-- Drops deprecated books tables and creates private chat tables.
-- Run this script for existing deployments upgrading to v2.5.
-- For fresh installs, 01-schema.sql + 04-private-chat.sql are sufficient.

SET NAMES utf8mb4;
USE xueqi_db;

-- ----------------------------------------------------------
-- 1. Drop deprecated books tables
-- ----------------------------------------------------------
DROP TABLE IF EXISTS book_collections;
DROP TABLE IF EXISTS book_ratings;
DROP TABLE IF EXISTS book_courses;
DROP TABLE IF EXISTS books;

-- ----------------------------------------------------------
-- 2. Create private chat tables (idempotent)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    user1_id        INT NOT NULL COMMENT 'smaller user id',
    user2_id        INT NOT NULL COMMENT 'larger user id',
    last_message_at TIMESTAMP NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_users (user1_id, user2_id),
    INDEX idx_user1 (user1_id, last_message_at DESC),
    INDEX idx_user2 (user2_id, last_message_at DESC),
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS private_messages (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    sender_id       INT NOT NULL,
    content         TEXT NOT NULL,
    image_url       VARCHAR(500) DEFAULT NULL,
    is_read         TINYINT DEFAULT 0 COMMENT '1 = read by receiver',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_conv_created (conversation_id, created_at DESC),
    INDEX idx_unread (conversation_id, is_read, sender_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id)
) ENGINE=InnoDB;
