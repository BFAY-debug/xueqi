-- User reports table
CREATE TABLE IF NOT EXISTS reports (
    id           INT PRIMARY KEY AUTO_INCREMENT,
    reporter_id  INT NOT NULL COMMENT '举报人',
    target_type  ENUM('post', 'comment') NOT NULL,
    target_id    INT NOT NULL COMMENT '帖子或评论ID',
    reason       ENUM('spam', 'abuse', 'inappropriate', 'other') NOT NULL COMMENT '举报原因',
    description  VARCHAR(500) DEFAULT NULL COMMENT '补充说明',
    status       ENUM('pending', 'resolved', 'ignored') DEFAULT 'pending',
    admin_id     INT DEFAULT NULL COMMENT '处理管理员',
    admin_note   VARCHAR(500) DEFAULT NULL COMMENT '处理备注',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at  TIMESTAMP NULL,
    INDEX idx_status (status, created_at DESC),
    INDEX idx_target (target_type, target_id),
    FOREIGN KEY (reporter_id) REFERENCES users(id),
    FOREIGN KEY (admin_id) REFERENCES users(id)
) ENGINE=InnoDB;
