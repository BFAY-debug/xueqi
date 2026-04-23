-- ============================================================
-- 「学栖」数据库 Schema - 完整建表语句
-- ============================================================

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS xueqi_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE xueqi_db;

-- ----------------------------------------------------------
-- 角色表（三级权限）
-- ----------------------------------------------------------
CREATE TABLE roles (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(200),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 等级定义
-- ----------------------------------------------------------
CREATE TABLE levels (
    id         INT PRIMARY KEY AUTO_INCREMENT,
    name       VARCHAR(50) NOT NULL,
    min_points INT NOT NULL DEFAULT 0,
    badge      VARCHAR(10),
    UNIQUE KEY uk_min_points (min_points)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 用户表
-- ----------------------------------------------------------
CREATE TABLE users (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    account_id      VARCHAR(20)  NOT NULL UNIQUE,
    email           VARCHAR(120) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    nickname        VARCHAR(50),
    avatar_url      VARCHAR(500),
    bio             TEXT,
    role_id         INT NOT NULL DEFAULT 3,
    status          TINYINT NOT NULL DEFAULT 1 COMMENT '1=active, 0=muted',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 用户学习统计
-- ----------------------------------------------------------
CREATE TABLE user_stats (
    id                  INT PRIMARY KEY AUTO_INCREMENT,
    user_id             INT NOT NULL UNIQUE,
    total_study_minutes INT DEFAULT 0,
    total_pomodoros     INT DEFAULT 0,
    total_points        INT DEFAULT 0,
    level_id            INT DEFAULT 1,
    daily_points        INT DEFAULT 0,
    daily_reset_date    DATE,
    penalty_count       INT DEFAULT 0 COMMENT '本月违约次数',
    penalty_reset_date  DATE COMMENT '违约计数重置日期',
    ban_until           DATETIME DEFAULT NULL COMMENT '禁止预约截止时间',
    checkin_streak      INT DEFAULT 0 COMMENT '连续签到天数',
    last_study_date     DATE,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (level_id) REFERENCES levels(id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 积分流水
-- ----------------------------------------------------------
CREATE TABLE points_log (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    user_id     INT NOT NULL,
    action      VARCHAR(50) NOT NULL COMMENT 'study/pomodoro/book_rate/post/comment/volunteer etc.',
    points      INT NOT NULL COMMENT 'positive=earned, negative=deducted',
    description VARCHAR(200),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_created (user_id, created_at DESC),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 通知
-- ----------------------------------------------------------
CREATE TABLE notifications (
    id           INT PRIMARY KEY AUTO_INCREMENT,
    user_id      INT NOT NULL,
    type         VARCHAR(30) NOT NULL COMMENT 'review_result/like/points/level_up/system',
    title        VARCHAR(200) NOT NULL,
    content      TEXT,
    is_read      TINYINT DEFAULT 0,
    related_id   INT,
    related_type VARCHAR(30),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_read (user_id, is_read, created_at DESC),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 虚拟自习室
-- ----------------------------------------------------------
CREATE TABLE study_rooms (
    id           INT PRIMARY KEY AUTO_INCREMENT,
    name         VARCHAR(100) NOT NULL,
    description  TEXT,
    capacity     INT NOT NULL DEFAULT 50,
    type         ENUM('virtual', 'real') NOT NULL DEFAULT 'virtual',
    cover_image  VARCHAR(500),
    status       TINYINT NOT NULL DEFAULT 1 COMMENT '1=open, 0=closed',
    created_by   INT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 自习室参与者
-- ----------------------------------------------------------
CREATE TABLE room_participants (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    room_id     INT NOT NULL,
    user_id     INT NOT NULL,
    seat_number INT,
    joined_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_studying TINYINT DEFAULT 1,
    UNIQUE KEY uk_room_user (room_id, user_id),
    FOREIGN KEY (room_id) REFERENCES study_rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 学习记录（番茄钟/自由学习）
-- ----------------------------------------------------------
CREATE TABLE study_sessions (
    id               INT PRIMARY KEY AUTO_INCREMENT,
    user_id          INT NOT NULL,
    room_id          INT,
    start_time       TIMESTAMP NOT NULL,
    end_time         TIMESTAMP NULL,
    duration_minutes INT,
    session_type     ENUM('pomodoro', 'free', 'timed') DEFAULT 'free',
    status           ENUM('active', 'completed', 'abandoned') DEFAULT 'active',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_status (user_id, status),
    INDEX idx_room (room_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 实体教学楼/图书馆
-- ----------------------------------------------------------
CREATE TABLE real_locations (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL,
    building    VARCHAR(100),
    floor       INT,
    open_time   TIME NOT NULL DEFAULT '08:00:00',
    close_time  TIME NOT NULL DEFAULT '22:00:00',
    total_seats INT NOT NULL,
    description TEXT,
    status      TINYINT DEFAULT 1 COMMENT '1=active, 0=inactive'
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 实体座位
-- ----------------------------------------------------------
CREATE TABLE real_seats (
    id           INT PRIMARY KEY AUTO_INCREMENT,
    location_id  INT NOT NULL,
    seat_code    VARCHAR(20) NOT NULL,
    row_num      INT,
    col_num      INT,
    has_power    TINYINT DEFAULT 0 COMMENT 'has power outlet',
    status       ENUM('available', 'occupied', 'reserved', 'maintenance') DEFAULT 'available',
    UNIQUE KEY uk_location_seat (location_id, seat_code),
    FOREIGN KEY (location_id) REFERENCES real_locations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 座位预约记录
-- ----------------------------------------------------------
CREATE TABLE seat_reservations (
    id            INT PRIMARY KEY AUTO_INCREMENT,
    user_id       INT NOT NULL,
    seat_id       INT NOT NULL,
    reserve_date  DATE NOT NULL,
    start_time    TIME NOT NULL,
    end_time      TIME NOT NULL,
    status        ENUM('pending', 'checked_in', 'completed', 'cancelled', 'no_show') DEFAULT 'pending',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_seat_time (seat_id, reserve_date, start_time),
    INDEX idx_user_date (user_id, reserve_date),
    FOREIGN KEY (seat_id) REFERENCES real_seats(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 志愿任务
-- ----------------------------------------------------------
CREATE TABLE volunteer_tasks (
    id               INT PRIMARY KEY AUTO_INCREMENT,
    name             VARCHAR(100) NOT NULL,
    description      TEXT,
    reward_penalty   INT NOT NULL DEFAULT 1 COMMENT 'how many penalty counts to reduce',
    reward_points    INT NOT NULL DEFAULT 5 COMMENT 'bonus points',
    status           TINYINT DEFAULT 1 COMMENT '1=active, 0=inactive',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 志愿记录
-- ----------------------------------------------------------
CREATE TABLE volunteer_records (
    id           INT PRIMARY KEY AUTO_INCREMENT,
    user_id      INT NOT NULL,
    task_id      INT NOT NULL,
    status       ENUM('pending', 'confirmed', 'rejected') DEFAULT 'pending',
    admin_id     INT COMMENT 'admin who confirmed',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP NULL,
    INDEX idx_user (user_id, status),
    INDEX idx_status (status),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (task_id) REFERENCES volunteer_tasks(id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 社区帖子
-- ----------------------------------------------------------
CREATE TABLE posts (
    id            INT PRIMARY KEY AUTO_INCREMENT,
    user_id       INT NOT NULL,
    title         VARCHAR(200) NOT NULL,
    content       MEDIUMTEXT NOT NULL,
    summary       VARCHAR(500) DEFAULT NULL COMMENT '文章摘要',
    category      ENUM('experience', 'question', 'resource', 'general') DEFAULT 'general',
    is_anonymous  TINYINT DEFAULT 0,
    is_pinned     TINYINT DEFAULT 0,
    is_featured   TINYINT DEFAULT 0,
    permission    ENUM('public', 'private') DEFAULT 'public' COMMENT '访问权限',
    content_type  ENUM('markdown', 'plain') DEFAULT 'markdown' COMMENT '内容格式',
    version       INT DEFAULT 1 COMMENT '当前版本号',
    view_count    INT DEFAULT 0,
    like_count    INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    bookmark_count INT DEFAULT 0,
    status        ENUM('pending', 'published', 'rejected', 'hidden') DEFAULT 'published',
    reviewed_by   INT,
    reviewed_at   TIMESTAMP NULL,
    reject_reason VARCHAR(500),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_status_created (status, created_at DESC),
    INDEX idx_pinned (is_pinned DESC, created_at DESC)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 帖子评论（支持嵌套）
-- ----------------------------------------------------------
CREATE TABLE comments (
    id           INT PRIMARY KEY AUTO_INCREMENT,
    post_id      INT NOT NULL,
    user_id      INT NOT NULL,
    parent_id    INT DEFAULT NULL COMMENT 'NULL=top-level, else reply to parent',
    content      TEXT NOT NULL,
    is_anonymous TINYINT DEFAULT 0,
    like_count   INT DEFAULT 0,
    status       ENUM('pending', 'published', 'rejected') DEFAULT 'pending',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_post_created (post_id, created_at),
    INDEX idx_parent (parent_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 标签
-- ----------------------------------------------------------
CREATE TABLE tags (
    id   INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 帖子-标签（多对多）
-- ----------------------------------------------------------
CREATE TABLE post_tags (
    post_id INT NOT NULL,
    tag_id  INT NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 帖子点赞
-- ----------------------------------------------------------
CREATE TABLE post_likes (
    user_id    INT NOT NULL,
    post_id    INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 评论点赞
-- ----------------------------------------------------------
CREATE TABLE comment_likes (
    user_id     INT NOT NULL,
    comment_id  INT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, comment_id),
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 审核日志
-- ----------------------------------------------------------
CREATE TABLE review_logs (
    id           INT PRIMARY KEY AUTO_INCREMENT,
    reviewer_id  INT NOT NULL,
    target_type  VARCHAR(30) NOT NULL COMMENT 'post/comment',
    target_id    INT NOT NULL,
    action       ENUM('approve', 'reject') NOT NULL,
    reason       VARCHAR(500),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_target (target_type, target_id),
    FOREIGN KEY (reviewer_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 管理员申请
-- ----------------------------------------------------------
CREATE TABLE admin_applications (
    id           INT PRIMARY KEY AUTO_INCREMENT,
    user_id      INT NOT NULL,
    reason       VARCHAR(500) NOT NULL COMMENT '申请理由',
    status       ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    reviewer_id  INT,
    reviewed_at  TIMESTAMP NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reviewer_id) REFERENCES users(id),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 文章版本历史
-- ----------------------------------------------------------
CREATE TABLE post_versions (
    id           INT PRIMARY KEY AUTO_INCREMENT,
    post_id      INT NOT NULL,
    version      INT NOT NULL,
    title        VARCHAR(200),
    content      MEDIUMTEXT NOT NULL,
    edit_summary VARCHAR(200) COMMENT '版本说明',
    created_by   INT NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    INDEX idx_post_version (post_id, version DESC)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 编辑提案（类似 Pull Request）
-- ----------------------------------------------------------
CREATE TABLE edit_proposals (
    id             INT PRIMARY KEY AUTO_INCREMENT,
    post_id        INT NOT NULL,
    proposer_id    INT NOT NULL,
    title          VARCHAR(200) NOT NULL COMMENT '提案标题',
    description    TEXT COMMENT '修改说明',
    content        TEXT NOT NULL COMMENT '修改后的完整内容',
    base_version   INT NOT NULL COMMENT '基于哪个版本',
    status         ENUM('open', 'merged', 'rejected', 'closed') DEFAULT 'open',
    reviewed_by    INT DEFAULT NULL,
    reviewed_at    TIMESTAMP NULL,
    review_comment VARCHAR(500),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (proposer_id) REFERENCES users(id),
    INDEX idx_post_status (post_id, status),
    INDEX idx_proposer (proposer_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 文章收藏
-- ----------------------------------------------------------
CREATE TABLE post_bookmarks (
    user_id    INT NOT NULL,
    post_id    INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 书院聊天消息
-- ----------------------------------------------------------
CREATE TABLE room_messages (
    id         INT PRIMARY KEY AUTO_INCREMENT,
    room_id    INT NOT NULL,
    user_id    INT DEFAULT NULL COMMENT 'NULL for system messages',
    content    TEXT NOT NULL,
    image_url  VARCHAR(500) DEFAULT NULL,
    type       ENUM('user', 'system', 'anonymous') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_room_created (room_id, created_at DESC),
    FOREIGN KEY (room_id) REFERENCES study_rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 消息已读记录
-- ----------------------------------------------------------
CREATE TABLE message_reads (
    message_id INT NOT NULL,
    user_id    INT NOT NULL,
    read_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, user_id),
    FOREIGN KEY (message_id) REFERENCES room_messages(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------
-- 用户反馈
-- ----------------------------------------------------------
CREATE TABLE feedback (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    user_id     INT NOT NULL,
    type        VARCHAR(50) NOT NULL DEFAULT '其他',
    content     TEXT NOT NULL,
    status      ENUM('pending', 'resolved', 'ignored') DEFAULT 'pending',
    admin_reply TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
