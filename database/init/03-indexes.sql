-- ============================================================
-- 「学栖」数据库附加索引
-- ============================================================
-- 注意：核心索引已在 01-schema.sql 的 CREATE TABLE 中定义。
-- 此文件仅包含额外的复合索引和优化索引。

USE xueqi_db;

-- ----------------------------------------------------------
-- 用户相关
-- ----------------------------------------------------------

-- Leaderboard queries: sort by total_points desc
CREATE INDEX idx_user_stats_points ON user_stats (total_points DESC);

-- Leaderboard queries: sort by total_study_minutes desc
CREATE INDEX idx_user_stats_study ON user_stats (total_study_minutes DESC);

-- Leaderboard queries: sort by checkin_streak desc
CREATE INDEX idx_user_stats_streak ON user_stats (checkin_streak DESC);

-- Find users by level
CREATE INDEX idx_user_stats_level ON user_stats (level_id);

-- Check ban status for seat reservation
CREATE INDEX idx_user_stats_ban ON user_stats (user_id, ban_until);

-- ----------------------------------------------------------
-- 积分流水
-- ----------------------------------------------------------

-- Query points log by action type
CREATE INDEX idx_points_log_action ON points_log (user_id, action, created_at DESC);

-- ----------------------------------------------------------
-- 通知
-- ----------------------------------------------------------

-- Count unread notifications efficiently
CREATE INDEX idx_notifications_unread ON notifications (user_id, is_read);

-- ----------------------------------------------------------
-- 自习室
-- ----------------------------------------------------------

-- Active participants in a room
CREATE INDEX idx_room_participants_room ON room_participants (room_id, is_studying);

-- ----------------------------------------------------------
-- 学习记录
-- ----------------------------------------------------------

-- User's recent study sessions
CREATE INDEX idx_study_sessions_time ON study_sessions (user_id, created_at DESC);

-- Active sessions across all rooms
CREATE INDEX idx_study_sessions_active ON study_sessions (status, room_id);

-- ----------------------------------------------------------
-- 座位预约
-- ----------------------------------------------------------

-- Check seat availability for a date range
CREATE INDEX idx_seat_reservations_date ON seat_reservations (seat_id, reserve_date, status);

-- Find pending reservations that may timeout
CREATE INDEX idx_seat_reservations_pending ON seat_reservations (status, start_time);

-- User's upcoming reservations
CREATE INDEX idx_seat_reservations_user_date ON seat_reservations (user_id, reserve_date DESC, status);

-- ----------------------------------------------------------
-- 帖子
-- ----------------------------------------------------------

-- Posts by user (for "my posts" page)
CREATE INDEX idx_posts_user ON posts (user_id, created_at DESC);

-- Posts by category, sorted by time
CREATE INDEX idx_posts_category_time ON posts (category, status, created_at DESC);

-- Featured posts
CREATE INDEX idx_posts_featured ON posts (is_featured DESC, created_at DESC);

-- ----------------------------------------------------------
-- 评论
-- ----------------------------------------------------------

-- All comments by a user
CREATE INDEX idx_comments_user ON comments (user_id, created_at DESC);

-- Pending comments for admin review
CREATE INDEX idx_comments_status ON comments (status, created_at DESC);

-- ----------------------------------------------------------
-- 点赞
-- ----------------------------------------------------------

-- Check if user liked a specific post (toggle)
CREATE INDEX idx_post_likes_post ON post_likes (post_id);

-- Check if user liked a specific comment
CREATE INDEX idx_comment_likes_comment ON comment_likes (comment_id);

-- ----------------------------------------------------------
-- 志愿记录
-- ----------------------------------------------------------

-- User's volunteer history
CREATE INDEX idx_volunteer_records_user ON volunteer_records (user_id, status, created_at DESC);

-- ----------------------------------------------------------
-- 审核日志
-- ----------------------------------------------------------

-- Review logs by reviewer
CREATE INDEX idx_review_logs_reviewer ON review_logs (reviewer_id, created_at DESC);
