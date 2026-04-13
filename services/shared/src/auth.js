const { verifyToken } = require('./jwt');
const logger = require('./logger');
const pool = require('./db');

/**
 * Auth middleware: verify JWT and attach user info to req
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未提供认证令牌' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Token 无效或已过期' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT u.id, u.username, u.email, u.role_id, u.status, r.name AS role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
      [decoded.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: '用户不存在' });
    }

    if (rows[0].status === 0) {
      return res.status(403).json({ success: false, message: '账号已被禁言' });
    }

    req.user = {
      userId: rows[0].id,
      username: rows[0].username,
      email: rows[0].email,
      roleId: rows[0].role_id,
      roleName: rows[0].role_name
    };

    next();
  } catch (err) {
    logger.error('Auth middleware error:', err);
    return res.status(500).json({ success: false, message: '认证服务错误' });
  }
}

/**
 * Optional auth: attach user if token present, but don't block
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) return next();

  try {
    const [rows] = await pool.execute(
      'SELECT u.id, u.username, u.email, u.role_id, u.status, r.name AS role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
      [decoded.userId]
    );

    if (rows.length > 0 && rows[0].status !== 0) {
      req.user = {
        userId: rows[0].id,
        username: rows[0].username,
        email: rows[0].email,
        roleId: rows[0].role_id,
        roleName: rows[0].role_name
      };
    }
  } catch {
    // silently ignore
  }
  next();
}

/**
 * RBAC middleware: require specific role(s)
 * @param {...string} roles - Allowed role names
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }
    if (!roles.includes(req.user.roleName)) {
      return res.status(403).json({ success: false, message: '权限不足' });
    }
    next();
  };
}

module.exports = { authMiddleware, optionalAuth, requireRole };
