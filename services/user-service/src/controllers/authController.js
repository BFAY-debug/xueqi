const authService = require('../services/authService');
const { captcha, redis, sensitiveFilter } = require('xueqi-shared');

const isProduction = process.env.NODE_ENV === 'production';

function setRefreshCookie(res, refreshToken) {
  if (!isProduction) return;
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/api/user',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

function clearRefreshCookie(res) {
  if (!isProduction) return;
  res.clearCookie('refreshToken', { path: '/api/user' });
}

async function getCaptcha(req, res, next) {
  try {
    const result = await captcha.generate(redis);
    res.success(result);
  } catch (err) { next(err); }
}

async function register(req, res, next) {
  try {
    const { username, email, password, accountId, captchaUuid, captchaCode } = req.body;

    if (!username || !email || !password) {
      return res.error('用户名、邮箱和密码不能为空', 400);
    }
    if (username.length < 2 || username.length > 50) {
      return res.error('用户名长度需在 2-50 之间', 400);
    }
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
      return res.error('用户名只能包含字母、数字、下划线和中文', 400);
    }
    if (password.length < 6) {
      return res.error('密码长度不能少于 6 位', 400);
    }
    if (password.length > 128) {
      return res.error('密码长度不能超过 128 位', 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.error('邮箱格式不正确', 400);
    }
    if (email.length > 100) {
      return res.error('邮箱不能超过 100 字', 400);
    }
    if (accountId !== undefined && accountId !== null && accountId !== '') {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(accountId)) {
        return res.error('账号ID只能包含字母、数字、下划线，长度3-20', 400);
      }
    }

    // Verify captcha after parameter validation
    if (!captchaUuid || !captchaCode) {
      return res.error('请输入验证码', 400);
    }
    const valid = await captcha.verify(redis, captchaUuid, captchaCode);
    if (!valid) {
      return res.error('验证码错误或已过期', 400);
    }

    // Check username for sensitive words
    const usernameCheck = sensitiveFilter.check(username);
    if (usernameCheck.hasSensitive) {
      return res.error('用户名包含敏感词，请修改', 400);
    }

    const result = await authService.register({ username, email, password, accountId: accountId || undefined });
    res.success(result, '注册成功', 201);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { username, password, captchaUuid, captchaCode } = req.body;

    if (!username || !password) {
      return res.error('用户名和密码不能为空', 400);
    }

    // Verify captcha after parameter validation
    if (!captchaUuid || !captchaCode) {
      return res.error('请输入验证码', 400);
    }
    const valid = await captcha.verify(redis, captchaUuid, captchaCode);
    if (!valid) {
      return res.error('验证码错误或已过期', 400);
    }

    const result = await authService.login({ username, password });
    setRefreshCookie(res, result.refreshToken);
    res.success(result, '登录成功');
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken = req.body.refreshToken || (req.cookies && req.cookies.refreshToken);
    if (!refreshToken) {
      return res.error('刷新令牌不能为空', 400);
    }
    const result = await authService.refresh(refreshToken);
    setRefreshCookie(res, result.refreshToken);
    res.success(result, '令牌刷新成功');
  } catch (err) {
    next(err);
  }
}

async function logout(req, res) {
  const refreshToken = req.body.refreshToken || (req.cookies && req.cookies.refreshToken);
  await authService.revokeRefreshToken(refreshToken);
  clearRefreshCookie(res);
  res.success(null, '已登出');
}

async function adminLogin(req, res, next) {
  try {
    const { username, password, captchaUuid, captchaCode } = req.body;

    if (!username || !password) {
      return res.error('用户名和密码不能为空', 400);
    }

    if (!captchaUuid || !captchaCode) {
      return res.error('请输入验证码', 400);
    }
    const valid = await captcha.verify(redis, captchaUuid, captchaCode);
    if (!valid) {
      return res.error('验证码错误或已过期', 400);
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.ip;
    const userAgent = req.headers['user-agent'] || '';

    const result = await authService.adminLogin({ username, password }, ip, userAgent);
    setRefreshCookie(res, result.refreshToken);
    res.success(result, '管理员登录成功');
  } catch (err) {
    next(err);
  }
}

async function getAdminLoginLogs(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const result = await authService.getAdminLoginLogs({ page, pageSize });
    res.success(result);
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.error('请填写原密码和新密码', 400);
    }
    await authService.changePassword(req.user.userId, oldPassword, newPassword);
    res.success(null, '密码修改成功');
  } catch (err) {
    next(err);
  }
}

module.exports = { getCaptcha, register, login, adminLogin, getAdminLoginLogs, changePassword, refresh, logout };
