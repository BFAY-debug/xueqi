const { db, logger } = require('xueqi-shared');
const axios = require('axios');
const { broadcastSeatUpdate } = require('../socket');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

// ── Locations (教学楼/图书馆) ─────────────────────────

async function getLocations() {
  const [rows] = await db.execute(
    `SELECT rl.*,
            (SELECT COUNT(*) FROM real_seats rs WHERE rs.location_id = rl.id AND rs.status = 'available') AS available_seats
     FROM real_locations rl
     WHERE rl.status = 1
     ORDER BY rl.id`
  );
  return rows;
}

async function getLocationById(locationId) {
  const [rows] = await db.execute('SELECT * FROM real_locations WHERE id = ?', [locationId]);
  if (rows.length === 0) {
    const error = new Error('地点不存在');
    error.status = 404;
    throw error;
  }
  return rows[0];
}

async function createLocation({ name, building, floor, openTime, closeTime, totalSeats, description }) {
  const [result] = await db.execute(
    `INSERT INTO real_locations (name, building, floor, open_time, close_time, total_seats, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, building || null, floor || null, openTime || '08:00:00', closeTime || '22:00:00',
     totalSeats || 60, description || null]
  );
  return getLocationById(result.insertId);
}

async function updateLocation(locationId, data) {
  const ALLOWED_COLUMNS = ['name', 'building', 'floor', 'open_time', 'close_time', 'total_seats', 'description', 'status'];
  const fields = [];
  const params = [];

  for (const [key, value] of Object.entries(data)) {
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (!ALLOWED_COLUMNS.includes(dbKey)) continue;
    fields.push(`${dbKey} = ?`);
    params.push(value);
  }

  if (fields.length === 0) return getLocationById(locationId);

  params.push(locationId);
  await db.execute(`UPDATE real_locations SET ${fields.join(', ')} WHERE id = ?`, params);
  return getLocationById(locationId);
}

async function deleteLocation(locationId) {
  await db.execute('UPDATE real_locations SET status = 0 WHERE id = ?', [locationId]);
  return { deleted: true };
}

// ── Seats ─────────────────────────────────────────────

async function getSeatsByLocation(locationId) {
  const [rows] = await db.execute(
    `SELECT rs.*,
            (SELECT sr.status FROM seat_reservations sr
             WHERE sr.seat_id = rs.id AND sr.reserve_date = CURDATE()
               AND sr.status IN ('pending', 'checked_in')
             ORDER BY sr.start_time DESC LIMIT 1) AS current_reservation_status
     FROM real_seats rs
     WHERE rs.location_id = ?
     ORDER BY rs.row_num, rs.col_num`,
    [locationId]
  );
  return rows;
}

async function batchCreateSeats(locationId, seats) {
  // Accept both snake_case (from frontend) and camelCase
  for (const s of seats) {
    const code = s.seat_code || s.seatCode || '';
    const row = s.row_num || s.rowNum || null;
    const col = s.col_num || s.colNum || null;
    const power = (s.has_power || s.hasPower) ? 1 : 0;
    await db.execute(
      `INSERT IGNORE INTO real_seats (location_id, seat_code, row_num, col_num, has_power, status) VALUES (?, ?, ?, ?, ?, 'available')`,
      [locationId, code, row, col, power]
    );
  }

  return getSeatsByLocation(locationId);
}

// ── Reservations (预约) ───────────────────────────────

async function reserveSeat(seatId, userId, { reserveDate, startTime, endTime }) {
  // Check if user is banned
  const [statsRows] = await db.execute(
    'SELECT ban_until FROM user_stats WHERE user_id = ?',
    [userId]
  );

  if (statsRows.length > 0 && statsRows[0].ban_until) {
    const banUntil = new Date(statsRows[0].ban_until);
    if (banUntil > new Date()) {
      const error = new Error(`因违约被禁预约，截止日期：${banUntil.toLocaleDateString('zh-CN')}`);
      error.status = 403;
      throw error;
    }
  }

  // Check if user already has a pending reservation for this date/time
  const [existing] = await db.execute(
    `SELECT id FROM seat_reservations
     WHERE user_id = ? AND reserve_date = ? AND status IN ('pending', 'checked_in')`,
    [userId, reserveDate]
  );

  if (existing.length > 0) {
    const error = new Error('该日期已有进行中的预约');
    error.status = 400;
    throw error;
  }

  // Check seat availability
  const [seatRows] = await db.execute('SELECT * FROM real_seats WHERE id = ?', [seatId]);
  if (seatRows.length === 0) {
    const error = new Error('座位不存在');
    error.status = 404;
    throw error;
  }

  if (seatRows[0].status === 'maintenance') {
    const error = new Error('座位正在维护中');
    error.status = 400;
    throw error;
  }

  // Check time conflict
  const [conflicts] = await db.execute(
    `SELECT id FROM seat_reservations
     WHERE seat_id = ? AND reserve_date = ? AND status IN ('pending', 'checked_in')
       AND NOT (end_time <= ? OR start_time >= ?)`,
    [seatId, reserveDate, startTime, endTime]
  );

  if (conflicts.length > 0) {
    const error = new Error('该时段座位已被预约');
    error.status = 409;
    throw error;
  }

  const [result] = await db.execute(
    `INSERT INTO seat_reservations (user_id, seat_id, reserve_date, start_time, end_time, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [userId, seatId, reserveDate, startTime, endTime]
  );

  // Update seat status
  await db.execute(
    "UPDATE real_seats SET status = 'reserved' WHERE id = ?",
    [seatId]
  );

  // Broadcast seat update
  const [seatInfo] = await db.execute('SELECT location_id FROM real_seats WHERE id = ?', [seatId]);
  if (seatInfo.length > 0) {
    const seats = await getSeatsByLocation(seatInfo[0].location_id);
    broadcastSeatUpdate(seatInfo[0].location_id, { seats, action: 'reserve', seatId });
  }

  return {
    reservationId: result.insertId,
    seatId,
    reserveDate,
    startTime,
    endTime,
    status: 'pending'
  };
}

async function checkinReservation(reservationId, userId) {
  const [rows] = await db.execute(
    "SELECT * FROM seat_reservations WHERE id = ? AND user_id = ? AND status = 'pending'",
    [reservationId, userId]
  );

  if (rows.length === 0) {
    const error = new Error('预约不存在或无法签到');
    error.status = 404;
    throw error;
  }

  const reservation = rows[0];

  await db.execute(
    "UPDATE seat_reservations SET status = 'checked_in', updated_at = NOW() WHERE id = ?",
    [reservationId]
  );

  // Update seat status
  await db.execute(
    "UPDATE real_seats SET status = 'occupied' WHERE id = ?",
    [reservation.seat_id]
  );

  // Award seat checkin points
  try {
    const token = getServiceToken();
    await axios.post(`${USER_SERVICE_URL}/api/user/points/award`, {
      userId,
      action: 'seat_checkin',
      description: '预约座位签到'
    }, { headers: { Authorization: `Bearer ${token}` } });
  } catch (err) {
    logger.warn(`Failed to award seat checkin points: ${err.message}`);
  }

  // Broadcast seat update
  const [seatInfo] = await db.execute('SELECT location_id FROM real_seats WHERE id = ?', [reservation.seat_id]);
  if (seatInfo.length > 0) {
    const seats = await getSeatsByLocation(seatInfo[0].location_id);
    broadcastSeatUpdate(seatInfo[0].location_id, { seats, action: 'checkin', seatId: reservation.seat_id });
  }

  return { reservationId, status: 'checked_in' };
}

async function cancelReservation(reservationId, userId) {
  const [rows] = await db.execute(
    "SELECT * FROM seat_reservations WHERE id = ? AND user_id = ? AND status IN ('pending', 'checked_in')",
    [reservationId, userId]
  );

  if (rows.length === 0) {
    const error = new Error('预约不存在或无法取消');
    error.status = 404;
    throw error;
  }

  await db.execute(
    "UPDATE seat_reservations SET status = 'cancelled', updated_at = NOW() WHERE id = ?",
    [reservationId]
  );

  // Release seat
  await db.execute(
    "UPDATE real_seats SET status = 'available' WHERE id = ?",
    [rows[0].seat_id]
  );

  // Broadcast seat update
  const [seatInfo] = await db.execute('SELECT location_id FROM real_seats WHERE id = ?', [rows[0].seat_id]);
  if (seatInfo.length > 0) {
    const seats = await getSeatsByLocation(seatInfo[0].location_id);
    broadcastSeatUpdate(seatInfo[0].location_id, { seats, action: 'cancel', seatId: rows[0].seat_id });
  }

  return { reservationId, status: 'cancelled' };
}

async function getMyReservations(userId, page = 1, pageSize = 10) {
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    `SELECT sr.*, rs.seat_code, rs.row_num, rs.col_num, rl.name AS location_name
     FROM seat_reservations sr
     JOIN real_seats rs ON rs.id = sr.seat_id
     JOIN real_locations rl ON rl.id = rs.location_id
     WHERE sr.user_id = ?
     ORDER BY sr.reserve_date DESC, sr.start_time DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    [userId]
  );

  const [countRows] = await db.execute(
    'SELECT COUNT(*) AS total FROM seat_reservations WHERE user_id = ?',
    [userId]
  );

  return { data: rows, total: countRows[0].total };
}

// ── Penalty (违约惩罚) ────────────────────────────────

async function getMyPenalty(userId) {
  // Ensure monthly reset
  await ensureMonthlyPenaltyReset(userId);

  const [rows] = await db.execute(
    'SELECT penalty_count, ban_until, penalty_reset_date FROM user_stats WHERE user_id = ?',
    [userId]
  );

  if (rows.length === 0) {
    return { penaltyCount: 0, banUntil: null, isActive: false };
  }

  const { penalty_count, ban_until } = rows[0];
  const isActive = ban_until && new Date(ban_until) > new Date();

  return {
    penaltyCount: penalty_count,
    banUntil: ban_until,
    isActive
  };
}

async function recordNoShow(reservationId) {
  const [rows] = await db.execute(
    "SELECT * FROM seat_reservations WHERE id = ? AND status = 'pending'",
    [reservationId]
  );

  if (rows.length === 0) return null;

  const reservation = rows[0];

  // Mark as no_show
  await db.execute(
    "UPDATE seat_reservations SET status = 'no_show', updated_at = NOW() WHERE id = ?",
    [reservationId]
  );

  // Release seat
  await db.execute(
    "UPDATE real_seats SET status = 'available' WHERE id = ?",
    [reservation.seat_id]
  );

  // Increment penalty count
  await ensureMonthlyPenaltyReset(reservation.user_id);

  const [statsRows] = await db.execute(
    'SELECT penalty_count FROM user_stats WHERE user_id = ?',
    [reservation.user_id]
  );

  const newCount = (statsRows[0]?.penalty_count || 0) + 1;
  const banDays = newCount * 2;
  const banUntil = new Date();
  banUntil.setDate(banUntil.getDate() + banDays);

  await db.execute(
    'UPDATE user_stats SET penalty_count = ?, ban_until = ? WHERE user_id = ?',
    [newCount, banUntil, reservation.user_id]
  );

  // Create notification
  await db.execute(
    `INSERT INTO notifications (user_id, type, title, content, related_id, related_type)
     VALUES (?, 'system', '座位预约违约', ?, ?, 'reservation')`,
    [
      reservation.user_id,
      `超时未签到，记违约 1 次（本月累计 ${newCount} 次），禁预约 ${banDays} 天。`,
      reservationId
    ]
  );

  logger.info(`No-show recorded for reservation ${reservationId}, user ${reservation.user_id}, penalty count: ${newCount}`);

  // Broadcast seat update
  const [seatInfo] = await db.execute('SELECT location_id FROM real_seats WHERE id = ?', [reservation.seat_id]);
  if (seatInfo.length > 0) {
    const seats = await getSeatsByLocation(seatInfo[0].location_id);
    broadcastSeatUpdate(seatInfo[0].location_id, { seats, action: 'no_show', seatId: reservation.seat_id });
  }

  return { reservationId, penaltyCount: newCount, banUntil };
}

async function ensureMonthlyPenaltyReset(userId) {
  const now = new Date();
  const [rows] = await db.execute(
    'SELECT penalty_reset_date FROM user_stats WHERE user_id = ?',
    [userId]
  );

  if (rows.length === 0) return;

  const resetDate = rows[0].penalty_reset_date;
  const needsReset = !resetDate ||
    new Date(resetDate).getMonth() !== now.getMonth() ||
    new Date(resetDate).getFullYear() !== now.getFullYear();

  if (needsReset) {
    await db.execute(
      'UPDATE user_stats SET penalty_count = 0, penalty_reset_date = CURDATE() WHERE user_id = ?',
      [userId]
    );
  }
}

/**
 * Reduce penalty count (after volunteer task confirmed)
 */
async function reducePenalty(userId, amount = 1) {
  await ensureMonthlyPenaltyReset(userId);

  const [rows] = await db.execute(
    'SELECT penalty_count FROM user_stats WHERE user_id = ?',
    [userId]
  );

  const currentCount = rows[0]?.penalty_count || 0;
  const newCount = Math.max(0, currentCount - amount);

  // Recalculate ban_until
  let banUntil = null;
  if (newCount > 0) {
    banUntil = new Date();
    banUntil.setDate(banUntil.getDate() + newCount * 2);
  }

  await db.execute(
    'UPDATE user_stats SET penalty_count = ?, ban_until = ? WHERE user_id = ?',
    [newCount, banUntil, userId]
  );

  return { penaltyCount: newCount, banUntil };
}

function getServiceToken() {
  const { jwt: { generateToken } } = require('xueqi-shared');
  return generateToken({
    userId: 0,
    username: 'study-service',
    roleId: 1,
    roleName: 'super_admin',
    type: 'service'
  });
}

/**
 * Start periodic no-show checker — runs every 60 seconds.
 * Finds reservations that are 'pending' and started >20 min ago, marks as no-show.
 */
function startNoShowChecker() {
  setInterval(async () => {
    try {
      const [rows] = await db.execute(`
        SELECT sr.id
        FROM seat_reservations sr
        WHERE sr.status = 'pending'
          AND CONCAT(sr.reserve_date, ' ', sr.start_time) <= DATE_SUB(NOW(), INTERVAL 20 MINUTE)
          AND CONCAT(sr.reserve_date, ' ', sr.start_time) >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `);
      for (const row of rows) {
        try {
          await recordNoShow(row.id);
          logger.info(`Auto no-show: reservation ${row.id}`);
        } catch (err) {
          logger.warn(`Failed to process no-show for reservation ${row.id}: ${err.message}`);
        }
      }
    } catch (err) {
      logger.error(`No-show checker error: ${err.message}`);
    }
  }, 60 * 1000);
  logger.info('No-show checker started (every 60s)');
}

module.exports = {
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  getSeatsByLocation,
  batchCreateSeats,
  reserveSeat,
  checkinReservation,
  cancelReservation,
  getMyReservations,
  getMyPenalty,
  recordNoShow,
  reducePenalty,
  startNoShowChecker
};
