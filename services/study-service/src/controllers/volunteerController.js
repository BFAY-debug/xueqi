const volunteerService = require('../services/volunteerService');

async function getTasks(req, res, next) {
  try {
    const tasks = await volunteerService.getTasks();
    res.success(tasks);
  } catch (err) { next(err); }
}

async function applyTask(req, res, next) {
  try {
    const result = await volunteerService.applyTask(req.user.userId, parseInt(req.params.task_id, 10));
    res.success(result, '已申请志愿任务', 201);
  } catch (err) { next(err); }
}

async function getPendingRecords(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;
    const { data, total } = await volunteerService.getPendingRecords(page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) { next(err); }
}

async function confirmRecord(req, res, next) {
  try {
    const result = await volunteerService.confirmRecord(parseInt(req.params.id, 10), req.user.userId);
    res.success(result, '志愿任务已确认');
  } catch (err) { next(err); }
}

async function rejectRecord(req, res, next) {
  try {
    const result = await volunteerService.rejectRecord(parseInt(req.params.id, 10), req.user.userId);
    res.success(result, '志愿任务已拒绝');
  } catch (err) { next(err); }
}

module.exports = { getTasks, applyTask, getPendingRecords, confirmRecord, rejectRecord };
