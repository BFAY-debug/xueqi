const bcrypt = require('bcryptjs');
const { db, jwt } = require('xueqi-shared');

const SALT_ROUNDS = 10;

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
  const [rows] = await db.execute(
    `SELECT u.id, u.username, u.account_id, u.email, u.password_hash, u.role_id, u.status,
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
    const error = new Error('用户名或密码错误');
    error.status = 401;
    throw error;
  }

  const payload = {
    userId: user.id,
    username: user.username,
    roleId: user.role_id,
    roleName: user.role_name
  };

  const accessToken = jwt.generateToken(payload);
  const refreshToken = jwt.generateRefreshToken(payload);

  return {
    user: {
      userId: user.id,
      username: user.username,
      accountId: user.account_id,
      email: user.email,
      roleId: user.role_id,
      roleName: user.role_name
    },
    accessToken,
    refreshToken
  };
}

/**
 * Refresh token
 */
function refresh(refreshToken) {
  const decoded = jwt.verifyToken(refreshToken);
  if (!decoded) {
    const error = new Error('Refresh token 无效或已过期');
    error.status = 401;
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

  return { accessToken, refreshToken: newRefreshToken };
}

module.exports = { register, login, refresh };
