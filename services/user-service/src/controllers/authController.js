const authService = require('../services/authService');

async function register(req, res, next) {
  try {
    const { username, email, password, nickname } = req.body;

    if (!username || !email || !password) {
      return res.error('用户名、邮箱和密码不能为空', 400);
    }
    if (username.length < 3 || username.length > 50) {
      return res.error('用户名长度需在 3-50 之间', 400);
    }
    if (password.length < 6) {
      return res.error('密码长度不能少于 6 位', 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.error('邮箱格式不正确', 400);
    }

    const result = await authService.register({ username, email, password, nickname });
    res.success(result, '注册成功', 201);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.error('用户名和密码不能为空', 400);
    }
    const result = await authService.login({ username, password });
    res.success(result, '登录成功');
  } catch (err) {
    next(err);
  }
}

function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.error('Refresh token 不能为空', 400);
    }
    const result = authService.refresh(refreshToken);
    res.success(result, 'Token 刷新成功');
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  // Client-side should discard tokens
  res.success(null, '已登出');
}

module.exports = { register, login, refresh, logout };
