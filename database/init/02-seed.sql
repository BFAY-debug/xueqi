-- ============================================================
-- 「学栖」数据库种子数据
-- ============================================================

USE xueqi_db;

-- ----------------------------------------------------------
-- 角色（三级权限）
-- ----------------------------------------------------------
INSERT INTO roles (id, name, description) VALUES
(1, 'super_admin', '超级管理员：指定/取消管理员、审核所有内容、系统配置'),
(2, 'admin',       '管理员：审核帖子/评论/书籍、管理座位/教室、禁言用户'),
(3, 'user',        '普通用户：正常使用所有功能、推送书籍、发帖/评论');

-- ----------------------------------------------------------
-- 等级定义（书童 → 大儒）
-- ----------------------------------------------------------
INSERT INTO levels (id, name, min_points, badge) VALUES
(1, '书童', 0,     '📗'),
(2, '秀才', 100,   '📘'),
(3, '举人', 500,   '📙'),
(4, '进士', 1500,  '📕'),
(5, '翰林', 4000,  '🏛️'),
(6, '大儒', 10000, '👑');

-- ----------------------------------------------------------
-- 超级管理员账户（密码: password）
-- 注意：所有种子用户密码均为 'password'，hash: $2b$10$N9qo8uLOickgx2ZMRZoMy...
-- ----------------------------------------------------------
INSERT INTO users (id, username, email, password_hash, nickname, bio, role_id, status) VALUES
(1, 'superadmin', 'admin@xueqi.edu.cn',
 '$2b$10$p9rNpyJIH5LbNngB1LWHIupseHsbLYzL5IHVDbikLM86egRAPx5wm',
 '学栖掌门', '学栖平台超级管理员', 1, 1);

-- 管理员账户
INSERT INTO users (id, username, email, password_hash, nickname, bio, role_id, status) VALUES
(2, 'admin01', 'admin01@xueqi.edu.cn',
 '$2b$10$p9rNpyJIH5LbNngB1LWHIupseHsbLYzL5IHVDbikLM86egRAPx5wm',
 '书院山长', '学栖平台管理员', 2, 1);

-- 普通用户示例
INSERT INTO users (id, username, email, password_hash, nickname, bio, role_id, status) VALUES
(3, 'zhangsan', 'zhangsan@stu.edu.cn',
 '$2b$10$p9rNpyJIH5LbNngB1LWHIupseHsbLYzL5IHVDbikLM86egRAPx5wm',
 '学海无涯', '每天进步一点点', 3, 1),
(4, 'lisi', 'lisi@stu.edu.cn',
 '$2b$10$p9rNpyJIH5LbNngB1LWHIupseHsbLYzL5IHVDbikLM86egRAPx5wm',
 '书虫小李', '阅读使我快乐', 3, 1),
(5, 'wangwu', 'wangwu@stu.edu.cn',
 '$2b$10$p9rNpyJIH5LbNngB1LWHIupseHsbLYzL5IHVDbikLM86egRAPx5wm',
 '考研加油', '目标：上岸！', 3, 1);

-- ----------------------------------------------------------
-- 用户学习统计
-- ----------------------------------------------------------
INSERT INTO user_stats (user_id, total_study_minutes, total_pomodoros, total_points, level_id, daily_points, daily_reset_date, penalty_count, penalty_reset_date, checkin_streak, last_study_date) VALUES
(1, 0,    0,    0,    1, 0, CURDATE(), 0, CURDATE(), 0, NULL),
(2, 320,  12,   280,  3, 15, CURDATE(), 0, CURDATE(), 7, CURDATE()),
(3, 1200, 48,   980,  3, 25, CURDATE(), 0, CURDATE(), 15, CURDATE()),
(4, 560,  22,   520,  3, 10, CURDATE(), 1, CURDATE(), 5, DATE_SUB(CURDATE(), INTERVAL 1 DAY)),
(5, 3200, 128,  2100, 4, 35, CURDATE(), 0, CURDATE(), 30, CURDATE());

-- ----------------------------------------------------------
-- 虚拟自习室
-- ----------------------------------------------------------
INSERT INTO study_rooms (id, name, description, capacity, type, status, created_by) VALUES
(1, '静修斋', '静心修习之所，适合深度学习与专注思考。请保持安静，共同营造良好修习氛围。', 50, 'virtual', 1, 2),
(2, '明理堂', '格物致知，明理求真。适合小组讨论与互帮互助。', 40, 'virtual', 1, 2),
(3, '夜读轩', '挑灯夜读，不负韶华。专为夜间修习学子开设。', 30, 'virtual', 1, 2),
(4, '专攻阁', '专攻考研、考证等应试备考，互相监督激励。', 35, 'virtual', 1, 2),
(5, '闲读居', '闲来读书，不拘一格。适合课外阅读与轻松学习。', 25, 'virtual', 1, 2);

-- ----------------------------------------------------------
-- 实体教学楼/图书馆
-- ----------------------------------------------------------
INSERT INTO real_locations (id, name, building, floor, open_time, close_time, total_seats, description, status) VALUES
(1, '藏经阁A座', '图书馆', 1, '07:00:00', '22:00:00', 120,
 '图书馆一楼自习区，宽敞明亮，有空调和WiFi覆盖。', 1),
(2, '藏经阁B座', '图书馆', 2, '07:00:00', '22:00:00', 80,
 '图书馆二楼自习区，安静舒适，靠窗座位有电源。', 1),
(3, '讲经堂3号', '教学楼C', 3, '08:00:00', '21:00:00', 60,
 '教学楼C栋三层自习教室，配备投影和白板。', 1),
(4, '明德书房', '图书馆', 3, '08:00:00', '22:00:00', 40,
 '图书馆三楼精品自习室，独立座位配台灯和电源。', 1);

-- ----------------------------------------------------------
-- 实体座位（以藏经阁A座为例，生成部分座位）
-- ----------------------------------------------------------
INSERT INTO real_seats (location_id, seat_code, row_num, col_num, has_power, status) VALUES
-- Row 1 (靠窗)
(1, 'A-101', 1, 1, 1, 'available'),
(1, 'A-102', 1, 2, 1, 'available'),
(1, 'A-103', 1, 3, 0, 'available'),
(1, 'A-104', 1, 4, 0, 'available'),
(1, 'A-105', 1, 5, 1, 'available'),
(1, 'A-106', 1, 6, 1, 'available'),
(1, 'A-107', 1, 7, 0, 'available'),
(1, 'A-108', 1, 8, 0, 'available'),
(1, 'A-109', 1, 9, 1, 'available'),
(1, 'A-110', 1, 10, 1, 'available'),
-- Row 2
(1, 'A-201', 2, 1, 0, 'available'),
(1, 'A-202', 2, 2, 0, 'available'),
(1, 'A-203', 2, 3, 1, 'available'),
(1, 'A-204', 2, 4, 1, 'available'),
(1, 'A-205', 2, 5, 0, 'available'),
(1, 'A-206', 2, 6, 0, 'available'),
(1, 'A-207', 2, 7, 1, 'available'),
(1, 'A-208', 2, 8, 1, 'available'),
(1, 'A-209', 2, 9, 0, 'available'),
(1, 'A-210', 2, 10, 0, 'available'),
-- Row 3
(1, 'A-301', 3, 1, 1, 'available'),
(1, 'A-302', 3, 2, 0, 'available'),
(1, 'A-303', 3, 3, 0, 'available'),
(1, 'A-304', 3, 4, 1, 'available'),
(1, 'A-305', 3, 5, 0, 'available'),
(1, 'A-306', 3, 6, 1, 'available'),
(1, 'A-307', 3, 7, 0, 'available'),
(1, 'A-308', 3, 8, 0, 'available'),
(1, 'A-309', 3, 9, 1, 'available'),
(1, 'A-310', 3, 10, 0, 'available'),
-- Row 4 (靠门)
(1, 'A-401', 4, 1, 0, 'available'),
(1, 'A-402', 4, 2, 1, 'available'),
(1, 'A-403', 4, 3, 0, 'available'),
(1, 'A-404', 4, 4, 1, 'available'),
(1, 'A-405', 4, 5, 0, 'available'),
(1, 'A-406', 4, 6, 0, 'available'),
(1, 'A-407', 4, 7, 1, 'available'),
(1, 'A-408', 4, 8, 0, 'available'),
(1, 'A-409', 4, 9, 0, 'available'),
(1, 'A-410', 4, 10, 1, 'available');

-- 藏经阁B座部分座位
INSERT INTO real_seats (location_id, seat_code, row_num, col_num, has_power, status) VALUES
(2, 'B-101', 1, 1, 1, 'available'),
(2, 'B-102', 1, 2, 1, 'available'),
(2, 'B-103', 1, 3, 0, 'available'),
(2, 'B-104', 1, 4, 0, 'available'),
(2, 'B-105', 1, 5, 1, 'available'),
(2, 'B-106', 1, 6, 1, 'available'),
(2, 'B-107', 1, 7, 0, 'available'),
(2, 'B-108', 1, 8, 0, 'available'),
(2, 'B-201', 2, 1, 0, 'available'),
(2, 'B-202', 2, 2, 1, 'available'),
(2, 'B-203', 2, 3, 0, 'available'),
(2, 'B-204', 2, 4, 1, 'available'),
(2, 'B-205', 2, 5, 0, 'available'),
(2, 'B-206', 2, 6, 0, 'available'),
(2, 'B-207', 2, 7, 1, 'available'),
(2, 'B-208', 2, 8, 0, 'available');

-- ----------------------------------------------------------
-- 志愿任务
-- ----------------------------------------------------------
INSERT INTO volunteer_tasks (id, name, description, reward_penalty, reward_points, status) VALUES
(1, '整理书架', '协助图书馆整理一楼自习区书架上的图书，将书籍分类归位。', 1, 5, 1),
(2, '清洁桌面', '清洁自习室桌面和公共区域，保持学习环境整洁。', 1, 5, 1),
(3, '搬运教材', '协助搬运新到教材至各教室，需体力较好。', 1, 10, 1),
(4, '引导新生', '新生报到期间引导新生熟悉图书馆和学习区域。', 1, 5, 1),
(5, '维护设备', '检查和报修自习室损坏的桌椅、灯具等设备。', 1, 8, 1);

-- ----------------------------------------------------------
-- 书籍示例
-- ----------------------------------------------------------
INSERT INTO books (id, isbn, title, author, publisher, publish_year, category, avg_rating, rating_count, status, created_at) VALUES
(1, '9787111544937', '深入理解计算机系统', 'Randal E. Bryant / David R. O''Hallaron', '机械工业出版社', 2016, '计算机科学', 4.8, 25, 'published', NOW()),
(2, '9787040396638', '高等数学（第七版）上册', '同济大学数学系', '高等教育出版社', 2014, '数学', 4.5, 42, 'published', NOW()),
(3, '9787115428028', 'JavaScript高级程序设计（第4版）', 'Matt Frisbie', '人民邮电出版社', 2020, '计算机科学', 4.7, 18, 'published', NOW()),
(4, '9787108009821', '万历十五年', '黄仁宇', '生活·读书·新知三联书店', 1997, '历史', 4.6, 35, 'published', NOW()),
(5, '9787020002207', '红楼梦', '曹雪芹', '人民文学出版社', 1996, '文学', 4.9, 56, 'published', NOW()),
(6, '9787302510704', '数据结构（C语言版）', '严蔚敏 / 吴伟民', '清华大学出版社', 2019, '计算机科学', 4.3, 30, 'published', NOW()),
(7, '9787115546081', 'Python编程：从入门到实践（第3版）', 'Eric Matthes', '人民邮电出版社', 2020, '计算机科学', 4.6, 22, 'published', NOW()),
(8, '9787100079839', '论语译注', '杨伯峻', '中华书局', 2009, '哲学', 4.7, 28, 'published', NOW());

-- ----------------------------------------------------------
-- 书籍-课程关联
-- ----------------------------------------------------------
INSERT INTO book_courses (book_id, course_name) VALUES
(1, '计算机系统基础'),
(2, '高等数学'),
(3, 'Web前端开发'),
(6, '数据结构与算法'),
(7, 'Python程序设计'),
(8, '中国传统文化');

-- ----------------------------------------------------------
-- 标签
-- ----------------------------------------------------------
INSERT INTO tags (id, name) VALUES
(1,  '考研'),
(2,  '高数'),
(3,  '英语'),
(4,  '编程'),
(5,  '期末'),
(6,  '论文'),
(7,  '实习'),
(8,  '考研数学'),
(9,  '考研英语'),
(10, '学习方法'),
(11, '时间管理'),
(12, '读书笔记'),
(13, '推荐'),
(14, '求助'),
(15, '经验分享');

-- ----------------------------------------------------------
-- 示例帖子（已发布）
-- ----------------------------------------------------------
INSERT INTO posts (id, user_id, title, content, category, is_anonymous, is_pinned, is_featured, view_count, like_count, comment_count, status, created_at) VALUES
(1, 3, '考研数学修习心得分享',
 '距离考研还有八个月，分享一下我的数学复习计划。\n\n第一阶段（现在-6月）：打基础，主攻高等数学，做同济版课后习题。\n\n第二阶段（7-8月）：强化训练，刷真题，整理错题本。\n\n第三阶段（9-10月）：模拟考试，查漏补缺。\n\n第四阶段（11-12月）：冲刺，回归基础，保持手感。\n\n希望能和大家一起交流经验！',
 'experience', 0, 1, 1, 234, 45, 12, 'published', DATE_SUB(NOW(), INTERVAL 3 DAY)),

(2, 4, '推荐几个好用的学习网站',
 '整理了一些我常用的学习网站，分享给大家：\n\n1. 中国大学MOOC - 免费大学课程\n2. LeetCode - 算法刷题必备\n3. Coursera - 国际名校课程\n4. B站 - 各种免费教程\n5. GitHub - 开源项目学习\n\n大家有好的资源也可以补充！',
 'resource', 0, 0, 0, 156, 28, 8, 'published', DATE_SUB(NOW(), INTERVAL 1 DAY)),

(3, 5, '四级冲刺计划（30天）',
 '距离四级考试还有一个月，制定了一个冲刺计划：\n\n每天安排：\n- 早：背单词100个（30分钟）\n- 午：听力练习（30分钟）\n- 晚：阅读理解+翻译（45分钟）\n\n周末：\n- 做一套完整真题\n- 整理错题\n\n需要的同学可以一起打卡！',
 'experience', 0, 0, 1, 189, 36, 15, 'published', DATE_SUB(NOW(), INTERVAL 2 DAY)),

(4, 5, '如何高效背诵知识点',
 '背书是很多同学的痛点，分享几个方法：\n\n1. 费曼学习法 - 用自己的话解释\n2. 间隔重复 - 利用艾宾浩斯遗忘曲线\n3. 思维导图 - 先框架后细节\n4. 联想记忆 - 把知识点和生活联系\n5. 番茄钟 - 25分钟专注+5分钟休息\n\n试试看效果如何？',
 'experience', 1, 0, 0, 98, 18, 6, 'published', DATE_SUB(NOW(), INTERVAL 5 DAY)),

(5, 3, '数据结构学习路线求助',
 '最近在学数据结构，感觉有些吃力。\n\n目前学了线性表和链表，接下来是树和图。\n\n请问各位学长学姐：\n1. 有什么好的教材推荐吗？\n2. 刷题应该从简单开始还是按章节来？\n3. 期末考试重点一般在哪些章节？\n\n谢谢大家！',
 'question', 0, 0, 0, 67, 12, 4, 'published', DATE_SUB(NOW(), INTERVAL 4 DAY));

-- ----------------------------------------------------------
-- 帖子-标签关联
-- ----------------------------------------------------------
INSERT INTO post_tags (post_id, tag_id) VALUES
(1, 1), (1, 8), (1, 10), (1, 15),
(2, 13), (2, 10),
(3, 9), (3, 1), (3, 10),
(4, 10), (4, 11),
(5, 4), (5, 14);

-- ----------------------------------------------------------
-- 示例评论
-- ----------------------------------------------------------
INSERT INTO comments (id, post_id, user_id, parent_id, content, is_anonymous, like_count, status, created_at) VALUES
(1, 1, 4, NULL, '写得太详细了！正好我也在准备考研数学，可以交流一下~', 0, 5, 'published', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 1, 3, 1,    '好的！有问题随时交流，一起加油！', 0, 2, 'published', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(3, 1, 5, NULL, '感谢分享，收藏了！我打算按照你的计划试试。', 1, 8, 'published', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, 2, 3, NULL, '补充一个：W3Schools 对于学Web开发也很不错。', 0, 3, 'published', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(5, 3, 4, NULL, '我也在准备四级！可以组个学习小组吗？', 0, 4, 'published', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(6, 5, 4, NULL, '推荐严蔚敏的数据结构教材，很经典。刷题建议从简单题开始，培养信心。', 0, 3, 'published', DATE_SUB(NOW(), INTERVAL 3 DAY));

-- ----------------------------------------------------------
-- 示例通知
-- ----------------------------------------------------------
INSERT INTO notifications (user_id, type, title, content, is_read, related_id, related_type) VALUES
(3, 'like',        '你的帖子收到了新的赞', '用户 小李 对你的帖子「考研数学修习心得分享」点了赞', 0, 1, 'post'),
(3, 'points',      '积分到账通知',         '完成自习获得 +10 积分，当前等级：举人(Lv.3)', 1, NULL, NULL),
(3, 'level_up',    '恭喜升级！',           '恭喜你升级为举人(Lv.3)，继续加油！', 1, NULL, NULL),
(4, 'review_result', '帖子审核通过',       '你的帖子「推荐几个好用的学习网站」已通过审核并发布', 1, 2, 'post'),
(5, 'like',        '你的帖子收到了新的赞', '匿名用户 对你的帖子「四级冲刺计划（30天）」点了赞', 0, 3, 'post');
