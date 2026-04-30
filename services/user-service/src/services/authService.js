const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db, redis, jwt } = require('xueqi-shared');

const SALT_ROUNDS = 10;
const REFRESH_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const ADMIN_REFRESH_TTL = 24 * 60 * 60; // 1 day for admins
const MAX_LOGIN_FAILURES = 5;
const LOCKOUT_SECONDS = 900; // 15 minutes

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a unique account_id (6-char alphanumeric)
 */
async function generateAccountId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (let attempt = 0; attempt < 20; attempt++) {
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    const [rows] = await db.execute('SELECT id FROM users WHERE account_id = ?', [id]);
    if (rows.length === 0) return id;
  }
  throw new Error('Failed to generate unique account_id');
}

/**
 * Register a new user
 */
async function register({ username, email, password, accountId: inputAccountId }) {
  // Check duplicates
  const [existing] = await db.execute(
    'SELECT id FROM users WHERE username = ? OR email = ?',
    [username, email]
  );
  if (existing.length > 0) {
    const field = existing[0].username === username ? '用户名' : '邮箱';
    const error = new Error(`${field}已被注册`);
    error.status = 409;
    throw error;
  }

  const accountId = inputAccountId || await generateAccountId();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const [result] = await db.execute(
    'INSERT INTO users (username, account_id, email, password_hash, role_id) VALUES (?, ?, ?, ?, 3)',
    [username, accountId, email, passwordHash]
  );

  // Create user_stats row
  await db.execute(
    'INSERT INTO user_stats (user_id, daily_reset_date, penalty_reset_date) VALUES (?, CURDATE(), CURDATE())',
    [result.insertId]
  );

  return { userId: result.insertId, username, accountId, email };
}

/**
 * Login
 */
async function login({ username, password }) {
  // Check if account is locked due to too many failed attempts
  const lockKey = `login_fail:${username}`;
  let failCount = 0;
  try {
    failCount = parseInt(await redis.get(lockKey), 10) || 0;
  } catch (e) {
    // Redis unavailable — fail closed for security
    const error = new Error('服务暂时不可用，请稍后重试');
    error.status = 503;
    throw error;
  }

  if (failCount >= MAX_LOGIN_FAILURES) {
    const ttl = await redis.ttl(lockKey).catch(() => LOCKOUT_SECONDS);
    const minutes = Math.ceil(Math.max(ttl, 0) / 60) || 15;
    const error = new Error(`账号已被锁定，请${minutes}分钟后重试`);
    error.status = 429;
    throw error;
  }

  const [rows] = await db.execute(
    `SELECT u.id, u.username, u.account_id, u.email, u.password_hash, u.role_id, u.status, u.avatar_url,
            r.name AS role_name
     FROM users u JOIN roles r ON u.role_id = r.id
     WHERE u.username = ? OR u.email = ? OR u.account_id = ?`,
    [username, username, username]
  );

  if (rows.length === 0) {
    const error = new Error('用户名或密码错误');
    error.status = 401;
    throw error;
  }

  const user = rows[0];

  if (user.status === 0) {
    const error = new Error('账号已被禁言，请联系管理员');
    error.status = 403;
    throw error;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    // Increment failure count
    try {
      const count = await redis.incr(lockKey);
      if (count === 1) await redis.expire(lockKey, LOCKOUT_SECONDS);
      if (count >= MAX_LOGIN_FAILURES) {
        // Refresh TTL when lockout triggers to ensure full 15-min window
        await redis.expire(lockKey, LOCKOUT_SECONDS);
        const error = new Error('账号已被锁定，请15分钟后重试');
        error.status = 429;
        throw error;
      }
    } catch (e) {
      if (e.status === 429) throw e;
    }
    const error = new Error('用户名或密码错误');
    error.status = 401;
    throw error;
  }

  if (['admin', 'super_admin'].includes(user.role_name)) {
    const error = new Error('管理员请使用管理后台登录');
    error.status = 403;
    throw error;
  }

  // Login success — clear failure count
  try { await redis.del(lockKey); } catch (e) { /* ignore */ }

  const payload = {
    userId: user.id,
    username: user.username,
    roleId: user.role_id,
    roleName: user.role_name
  };

  const accessToken = jwt.generateToken(payload);
  const refreshToken = jwt.generateRefreshToken(payload);

  // Store refresh token in Redis whitelist (fail-closed)
  try {
    await redis.set(`refresh:${tokenHash(refreshToken)}`, String(user.id), 'EX', REFRESH_TTL);
  } catch (e) {
    const error = new Error('服务暂时不可用，请稍后重试');
    error.status = 503;
    throw error;
  }

  return {
    user: {
      userId: user.id,
      username: user.username,
      accountId: user.account_id,
      email: user.email,
      avatar_url: user.avatar_url,
      roleId: user.role_id,
      roleName: user.role_name
    },
    accessToken,
    refreshToken
  };
}

/**
 * Log admin login attempt
 */
async function logAdminLogin(userId, ip, userAgent, success, reason = null) {
  try {
    await db.execute(
      'INSERT INTO admin_login_logs (user_id, ip, user_agent, success, failure_reason) VALUES (?, ?, ?, ?, ?)',
      [userId, ip, userAgent, success, reason]
    );
  } catch { /* non-critical */ }
}

/**
 * Admin login — validates admin role and logs the attempt
 */
async function adminLogin({ username, password }, ip, userAgent) {
  // Reuse login logic but enforce admin role
  const lockKey = `login_fail:admin:${username}`;
  let failCount = 0;
  try {
    failCount = parseInt(await redis.get(lockKey), 10) || 0;
  } catch (e) {
    const error = new Error('服务暂时不可用，请稍后重试');
    error.status = 503;
    throw error;
  }

  if (failCount >= MAX_LOGIN_FAILURES) {
    const ttl = await redis.ttl(lockKey).catch(() => LOCKOUT_SECONDS);
    const minutes = Math.ceil(Math.max(ttl, 0) / 60) || 15;
    const error = new Error(`账号已被锁定，请${minutes}分钟后重试`);
    error.status = 429;
    throw error;
  }

  const [rows] = await db.execute(
    `SELECT u.id, u.username, u.account_id, u.email, u.password_hash, u.role_id, u.status, u.avatar_url,
            r.name AS role_name
     FROM users u JOIN roles r ON u.role_id = r.id
     WHERE (u.username = ? OR u.email = ? OR u.account_id = ?) AND u.role_id IN (1, 2)`,
    [username, username, username]
  );

  if (rows.length === 0) {
    await logAdminLogin(0, ip, userAgent, false, '用户不存在或非管理员');
    const error = new Error('用户名或密码错误');
    error.status = 401;
    throw error;
  }

  const user = rows[0];

  if (user.status === 0) {
    await logAdminLogin(user.id, ip, userAgent, false, '账号已禁言');
    const error = new Error('账号已被禁用');
    error.status = 403;
    throw error;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    try {
      const count = await redis.incr(lockKey);
      if (count === 1) await redis.expire(lockKey, LOCKOUT_SECONDS);
      if (count >= MAX_LOGIN_FAILURES) {
        await redis.expire(lockKey, LOCKOUT_SECONDS);
        await logAdminLogin(user.id, ip, userAgent, false, '密码错误，账号已锁定');
        const error = new Error('账号已被锁定，请15分钟后重试');
        error.status = 429;
        throw error;
      }
    } catch (e) {
      if (e.status === 429) throw e;
    }
    await logAdminLogin(user.id, ip, userAgent, false, '密码错误');
    const error = new Error('用户名或密码错误');
    error.status = 401;
    throw error;
  }

  // Success — clear failure count
  try { await redis.del(lockKey); } catch { /* ignore */ }

  const payload = {
    userId: user.id,
    username: user.username,
    roleId: user.role_id,
    roleName: user.role_name
  };

  const accessToken = jwt.generateToken(payload);
  const refreshToken = jwt.generateRefreshToken(payload);
  const refreshTTL = (user.role_name === 'admin' || user.role_name === 'super_admin')
    ? ADMIN_REFRESH_TTL : REFRESH_TTL;

  try {
    await redis.set(`refresh:${tokenHash(refreshToken)}`, String(user.id), 'EX', refreshTTL);
  } catch (e) {
    const error = new Error('服务暂时不可用，请稍后重试');
    error.status = 503;
    throw error;
  }

  await logAdminLogin(user.id, ip, userAgent, true);

  return {
    user: {
      userId: user.id,
      username: user.username,
      accountId: user.account_id,
      email: user.email,
      avatar_url: user.avatar_url,
      roleId: user.role_id,
      roleName: user.role_name
    },
    accessToken,
    refreshToken
  };
}

/**
 * Get admin login logs
 */
async function getAdminLoginLogs({ page = 1, pageSize = 20 }) {
  const offset = (page - 1) * pageSize;
  const [[{ total }], [rows]] = await Promise.all([
    db.execute('SELECT COUNT(*) as total FROM admin_login_logs'),
    db.execute(
      `SELECT l.id, l.user_id, u.username, l.ip, l.user_agent, l.success, l.failure_reason, l.created_at
       FROM admin_login_logs l LEFT JOIN users u ON l.user_id = u.id
       ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
      [parseInt(pageSize) || 20, parseInt(offset) || 0])
  ]);
  return { logs: rows, total, page, pageSize };
}

/**
 * Refresh token
 */
async function refresh(oldRefreshToken) {
  const decoded = jwt.verifyToken(oldRefreshToken);
  if (!decoded) {
    const error = new Error('Refresh token 无效或已过期');
    error.status = 401;
    throw error;
  }

  // Verify refresh token is in Redis whitelist (fail-closed)
  const key = `refresh:${tokenHash(oldRefreshToken)}`;
  try {
    const stored = await redis.get(key);
    if (!stored) {
      const error = new Error('Refresh token 已失效');
      error.status = 401;
      throw error;
    }
    // Delete old token (rotation)
    await redis.del(key);
  } catch (e) {
    if (e.status === 401) throw e;
    // Redis unavailable — fail closed
    const error = new Error('服务暂时不可用，请稍后重试');
    error.status = 503;
    throw error;
  }

  const payload = {
    userId: decoded.userId,
    username: decoded.username,
    roleId: decoded.roleId,
    roleName: decoded.roleName
  };

  const accessToken = jwt.generateToken(payload);
  const newRefreshToken = jwt.generateRefreshToken(payload);

  // Store new refresh token (fail-closed)
  try {
    await redis.set(`refresh:${tokenHash(newRefreshToken)}`, String(decoded.userId), 'EX', REFRESH_TTL);
  } catch (e) {
    const error = new Error('服务暂时不可用，请稍后重试');
    error.status = 503;
    throw error;
  }

  return { accessToken, refreshToken: newRefreshToken };
}

/**
 * Revoke refresh token (logout)
 */
async function revokeRefreshToken(refreshToken) {
  if (!refreshToken) return;
  try {
    await redis.del(`refresh:${tokenHash(refreshToken)}`);
  } catch (e) { /* graceful */ }
}

/**
 * Change password for logged-in user
 */
async function changePassword(userId, oldPassword, newPassword) {
  const [rows] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [userId]);
  if (rows.length === 0) {
    const error = new Error('用户不存在');
    error.status = 404;
    throw error;
  }

  const valid = await bcrypt.compare(oldPassword, rows[0].password_hash);
  if (!valid) {
    const error = new Error('原密码错误');
    error.status = 400;
    throw error;
  }

  if (newPassword.length < 6 || newPassword.length > 128) {
    const error = new Error('新密码长度需在 6-128 位之间');
    error.status = 400;
    throw error;
  }

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
}

module.exports = { register, login, adminLogin, getAdminLoginLogs, changePassword, refresh, revokeRefreshToken };
