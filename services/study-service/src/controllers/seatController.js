const seatService = require('../services/seatService');

// ── Locations ─────────────────────────────────────────

async function listLocations(req, res, next) {
  try {
    const locations = await seatService.getLocations();
    res.success(locations);
  } catch (err) { next(err); }
}

async function getLocation(req, res, next) {
  try {
    const location = await seatService.getLocationById(parseInt(req.params.id, 10));
    res.success(location);
  } catch (err) { next(err); }
}

async function createLocation(req, res, next) {
  try {
    const location = await seatService.createLocation(req.body);
    res.success(location, '地点创建成功', 201);
  } catch (err) { next(err); }
}

async function updateLocation(req, res, next) {
  try {
    const location = await seatService.updateLocation(parseInt(req.params.id, 10), req.body);
    res.success(location, '地点更新成功');
  } catch (err) { next(err); }
}

async function deleteLocation(req, res, next) {
  try {
    await seatService.deleteLocation(parseInt(req.params.id, 10));
    res.success(null, '地点已删除');
  } catch (err) { next(err); }
}

// ── Seats ─────────────────────────────────────────────

async function getSeats(req, res, next) {
  try {
    const seats = await seatService.getSeatsByLocation(parseInt(req.params.id, 10));
    res.success(seats);
  } catch (err) { next(err); }
}

async function batchCreateSeats(req, res, next) {
  try {
    const seats = await seatService.batchCreateSeats(parseInt(req.params.id, 10), req.body.seats);
    res.success(seats, '座位创建成功', 201);
  } catch (err) { next(err); }
}

// ── Reservations ──────────────────────────────────────

async function reserveSeat(req, res, next) {
  try {
    const { reserveDate, startTime, endTime } = req.body;
    if (!reserveDate || !startTime || !endTime) {
      return res.error('reserveDate, startTime, endTime 不能为空', 400);
    }
    const result = await seatService.reserveSeat(
      parseInt(req.params.id, 10), req.user.userId, { reserveDate, startTime, endTime }
    );
    res.success(result, '预约成功', 201);
  } catch (err) { next(err); }
}

async function checkinReservation(req, res, next) {
  try {
    const result = await seatService.checkinReservation(parseInt(req.params.id, 10), req.user.userId);
    res.success(result, '签到成功');
  } catch (err) { next(err); }
}

async function cancelReservation(req, res, next) {
  try {
    const result = await seatService.cancelReservation(parseInt(req.params.id, 10), req.user.userId);
    res.success(result, '预约已取消');
  } catch (err) { next(err); }
}

async function getMyReservations(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;
    const { data, total } = await seatService.getMyReservations(req.user.userId, page, pageSize);
    res.paginate(data, total, page, pageSize);
  } catch (err) { next(err); }
}

async function getMyPenalty(req, res, next) {
  try {
    const penalty = await seatService.getMyPenalty(req.user.userId);
    res.success(penalty);
  } catch (err) { next(err); }
}

module.exports = {
  listLocations, getLocation, createLocation, updateLocation, deleteLocation,
  getSeats, batchCreateSeats,
  reserveSeat, checkinReservation, cancelReservation, getMyReservations, getMyPenalty
};
