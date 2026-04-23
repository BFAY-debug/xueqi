-- ============================================================
-- 迁移：新增 account_id 字段
-- ============================================================

SET NAMES utf8mb4;
USE xueqi_db;

-- Add account_id column if not exists
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'xueqi_db' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'account_id');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN account_id VARCHAR(20) NOT NULL DEFAULT \'\' AFTER username',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Generate unique account_id for existing users
-- Uses a simple approach: random hex string based on user id + random
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS fill_account_ids()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE uid INT;
  DECLARE new_id VARCHAR(20);
  DECLARE attempts INT;
  DECLARE cur CURSOR FOR SELECT id FROM users WHERE account_id = '' OR account_id IS NULL;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO uid;
    IF done THEN LEAVE read_loop; END IF;

    SET attempts = 0;
    retry: REPEAT
      SET new_id = CONCAT(
        CHAR(FLOOR(65 + RAND() * 26)),
        LPAD(HEX(FLOOR(RAND() * 16777216)), 5, '0')
      );
      SET attempts = attempts + 1;
      SET @conflict = (SELECT COUNT(*) FROM users WHERE account_id = new_id AND id != uid);
    UNTIL @conflict = 0 OR attempts > 10 END REPEAT;

    UPDATE users SET account_id = new_id WHERE id = uid;
  END LOOP;
  CLOSE cur;
END //
DELIMITER ;

CALL fill_account_ids();
DROP PROCEDURE IF EXISTS fill_account_ids;

-- Ensure unique constraint
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = 'xueqi_db' AND TABLE_NAME = 'users' AND INDEX_NAME = 'account_id');

SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE users ADD UNIQUE KEY account_id (account_id)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
