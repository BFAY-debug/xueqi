const adminService = require('../services/adminService');

async function getUsers(req, res, next) {
  try {
    const { page, pageSize, search, role, status } = req.query;
    const result = await adminService.getUsers({
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
      search: search || '',
      role: role || '',
      status: status !== undefined ? status : ''
    });
    res.paginate(result.data, result.total, parseInt(page, 10) || 1, parseInt(pageSize, 10) || 20);
  } catch (err) {
    next(err);
  }
}

async function changeUserRole(req, res, next) {
  try {
    const { roleId } = req.body;
    if (!roleId) {
      return res.error('roleId 不能为空', 400);
    }
    const result = await adminService.changeUserRole(parseInt(req.params.id, 10), roleId);
    res.success(result, '角色变更成功');
  } catch (err) {
    next(err);
  }
}

async function changeUserStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (status === undefined || ![0, 1].includes(status)) {
      return res.error('status 必须为 0（禁言）或 1（正常）', 400);
    }
    const result = await adminService.changeUserStatus(parseInt(req.params.id, 10), status);
    res.success(result, status === 0 ? '已禁言该用户' : '已解禁该用户');
  } catch (err) {
    next(err);
  }
}

async function getSystemStats(req, res, next) {
  try {
    const stats = await adminService.getSystemStats();
    res.success(stats);
  } catch (err) {
    next(err);
  }
}

module.exports = { getUsers, changeUserRole, changeUserStatus, getSystemStats };
