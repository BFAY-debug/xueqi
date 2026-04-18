const { db, logger } = require('xueqi-shared');
const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

/**
 * List books with search and pagination
 */
async function getBooks({ page = 1, pageSize = 12, search = '', category = '', sort = 'newest' }) {
  const offset = (page - 1) * pageSize;
  const conditions = ["b.status = 'published'"];
  const params = [];

  if (search) {
    conditions.push('(b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (category) {
    conditions.push('b.category = ?');
    params.push(category);
  }

  const where = conditions.join(' AND ');

  let orderBy = 'b.created_at DESC';
  if (sort === 'rating') orderBy = 'b.avg_rating DESC';
  if (sort === 'popular') orderBy = 'b.rating_count DESC';

  const [rows] = await db.execute(
    `SELECT b.* FROM books b WHERE ${where} ORDER BY ${orderBy} LIMIT ${pageSize} OFFSET ${offset}`,
    params
  );

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total FROM books b WHERE ${where}`,
    params
  );

  return { data: rows, total: countRows[0].total };
}

/**
 * Get book detail
 */
async function getBookById(bookId) {
  const [rows] = await db.execute('SELECT * FROM books WHERE id = ?', [bookId]);
  if (rows.length === 0) {
    const error = new Error('书籍不存在');
    error.status = 404;
    throw error;
  }

  // Get related courses
  const [courses] = await db.execute(
    'SELECT course_name FROM book_courses WHERE book_id = ?',
    [bookId]
  );

  const book = rows[0];
  book.courses = courses.map(c => c.course_name);

  return book;
}

/**
 * Submit a book (user, pending review)
 */
async function submitBook(userId, { isbn, title, author, publisher, publishYear, category, description, coverUrl }) {
  // Check ISBN duplicate
  if (isbn) {
    const [existing] = await db.execute('SELECT id FROM books WHERE isbn = ?', [isbn]);
    if (existing.length > 0) {
      const error = new Error('该 ISBN 的书籍已存在');
      error.status = 409;
      throw error;
    }
  }

  const [result] = await db.execute(
    `INSERT INTO books (isbn, title, author, publisher, publish_year, category, description, cover_url, status, submitted_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [isbn || null, title, author || null, publisher || null, publishYear || null,
     category || null, description || null, coverUrl || null, userId]
  );

  return { bookId: result.insertId, status: 'pending' };
}

/**
 * Add book directly (admin)
 */
async function addBook({ isbn, title, author, publisher, publishYear, category, description, coverUrl }) {
  const [result] = await db.execute(
    `INSERT INTO books (isbn, title, author, publisher, publish_year, category, description, cover_url, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published')`,
    [isbn || null, title, author || null, publisher || null, publishYear || null,
     category || null, description || null, coverUrl || null]
  );

  return getBookById(result.insertId);
}

/**
 * Update book (admin)
 */
async function updateBook(bookId, data) {
  const fields = [];
  const params = [];

  const allowed = ['isbn', 'title', 'author', 'publisher', 'publishYear', 'category', 'description', 'coverUrl', 'status'];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${dbKey} = ?`);
      params.push(data[key]);
    }
  }

  if (fields.length === 0) return getBookById(bookId);

  params.push(bookId);
  await db.execute(`UPDATE books SET ${fields.join(', ')} WHERE id = ?`, params);
  return getBookById(bookId);
}

/**
 * Delete book (admin)
 */
async function deleteBook(bookId) {
  await db.execute('DELETE FROM books WHERE id = ?', [bookId]);
  return { deleted: true };
}

/**
 * Get pending books (admin)
 */
async function getPendingBooks(page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    `SELECT b.*, u.username AS submitter_name
     FROM books b
     LEFT JOIN users u ON u.id = b.submitted_by
     WHERE b.status = 'pending'
     ORDER BY b.created_at ASC
     LIMIT ${pageSize} OFFSET ${offset}`
  );

  const [countRows] = await db.execute(
    "SELECT COUNT(*) AS total FROM books WHERE status = 'pending'"
  );

  return { data: rows, total: countRows[0].total };
}

/**
 * Review a book (admin: approve/reject)
 */
async function reviewBook(bookId, adminId, { action, reason }) {
  const [rows] = await db.execute(
    "SELECT * FROM books WHERE id = ? AND status = 'pending'",
    [bookId]
  );

  if (rows.length === 0) {
    const error = new Error('书籍不存在或已审核');
    error.status = 404;
    throw error;
  }

  const book = rows[0];
  const newStatus = action === 'approve' ? 'published' : 'rejected';

  await db.execute(
    `UPDATE books SET status = ?, reviewed_by = ?, reviewed_at = NOW(), reject_reason = ? WHERE id = ?`,
    [newStatus, adminId, action === 'reject' ? reason : null, bookId]
  );

  // Log review
  await db.execute(
    `INSERT INTO review_logs (reviewer_id, target_type, target_id, action, reason) VALUES (?, 'book', ?, ?, ?)`,
    [adminId, bookId, action, reason || null]
  );

  // If approved and submitted by user, award points
  if (action === 'approve' && book.submitted_by) {
    try {
      const token = getServiceToken();
      await axios.post(`${USER_SERVICE_URL}/api/user/points/award`, {
        userId: book.submitted_by,
        action: 'book_adopted',
        description: `推荐书籍「${book.title}」被采纳`
      }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      logger.warn(`Failed to award book adopted points: ${err.message}`);
    }

    // Notify user
    await db.execute(
      `INSERT INTO notifications (user_id, type, title, content, related_id, related_type)
       VALUES (?, 'review_result', '推荐书籍已通过', ?, ?, 'book')`,
      [book.submitted_by, `你推荐的书籍「${book.title}」已通过审核并发布，获得 20 积分奖励！`, bookId]
    );
  } else if (action === 'reject' && book.submitted_by) {
    await db.execute(
      `INSERT INTO notifications (user_id, type, title, content, related_id, related_type)
       VALUES (?, 'review_result', '推荐书籍未通过', ?, ?, 'book')`,
      [book.submitted_by, `你推荐的书籍「${book.title}」未通过审核。${reason ? '原因：' + reason : ''}`, bookId]
    );
  }

  return { bookId, status: newStatus };
}

/**
 * Rate / review a book
 */
async function rateBook(bookId, userId, { rating, review }) {
  // Check if already rated
  const [existing] = await db.execute(
    'SELECT id FROM book_ratings WHERE user_id = ? AND book_id = ?',
    [userId, bookId]
  );

  if (existing.length > 0) {
    // Update existing rating
    await db.execute(
      'UPDATE book_ratings SET rating = ?, review = ? WHERE user_id = ? AND book_id = ?',
      [rating, review || null, userId, bookId]
    );
  } else {
    await db.execute(
      'INSERT INTO book_ratings (user_id, book_id, rating, review) VALUES (?, ?, ?, ?)',
      [userId, bookId, rating, review || null]
    );

    // Award rating points
    try {
      const token = getServiceToken();
      await axios.post(`${USER_SERVICE_URL}/api/user/points/award`, {
        userId,
        action: 'book_rate',
        description: '为书籍评分'
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (review && review.length >= 30) {
        await axios.post(`${USER_SERVICE_URL}/api/user/points/award`, {
          userId,
          action: 'book_review',
          description: '写书评'
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
    } catch (err) {
      logger.warn(`Failed to award book rating points: ${err.message}`);
    }
  }

  // Update book avg_rating and rating_count
  await db.execute(
    `UPDATE books SET
       avg_rating = (SELECT AVG(rating) FROM book_ratings WHERE book_id = ?),
       rating_count = (SELECT COUNT(*) FROM book_ratings WHERE book_id = ?)
     WHERE id = ?`,
    [bookId, bookId, bookId]
  );

  return { bookId, rating, review };
}

/**
 * Toggle book collection
 */
async function toggleCollection(bookId, userId) {
  const [existing] = await db.execute(
    'SELECT id FROM book_collections WHERE user_id = ? AND book_id = ?',
    [userId, bookId]
  );

  if (existing.length > 0) {
    await db.execute(
      'DELETE FROM book_collections WHERE user_id = ? AND book_id = ?',
      [userId, bookId]
    );
    return { bookId, collected: false };
  } else {
    await db.execute(
      'INSERT INTO book_collections (user_id, book_id) VALUES (?, ?)',
      [userId, bookId]
    );
    return { bookId, collected: true };
  }
}

/**
 * Get my collections
 */
async function getMyCollections(userId, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    `SELECT bc.created_at AS collected_at, b.*
     FROM book_collections bc
     JOIN books b ON b.id = bc.book_id
     WHERE bc.user_id = ?
     ORDER BY bc.created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    [userId]
  );

  const [countRows] = await db.execute(
    'SELECT COUNT(*) AS total FROM book_collections WHERE user_id = ?',
    [userId]
  );

  return { data: rows, total: countRows[0].total };
}

/**
 * Recommend books (simple recommendation based on category)
 */
async function getRecommendations(userId) {
  // Get user's highly rated categories
  const [categories] = await db.execute(
    `SELECT b.category, COUNT(*) AS cnt
     FROM book_ratings br
     JOIN books b ON b.id = br.book_id
     WHERE br.user_id = ? AND br.rating >= 4
     GROUP BY b.category
     ORDER BY cnt DESC
     LIMIT 3`,
    [userId]
  );

  if (categories.length === 0) {
    // Fallback: top rated books
    const [rows] = await db.execute(
      `SELECT * FROM books WHERE status = 'published' ORDER BY avg_rating DESC LIMIT 6`
    );
    return rows;
  }

  const cats = categories.map(c => c.category);
  const [rows] = await db.execute(
    `SELECT * FROM books
     WHERE status = 'published' AND category IN (${cats.map(() => '?').join(',')})
       AND id NOT IN (SELECT book_id FROM book_ratings WHERE user_id = ?)
     ORDER BY avg_rating DESC LIMIT 6`,
    [...cats, userId]
  );

  return rows;
}

function getServiceToken() {
  const { jwt: { generateToken } } = require('xueqi-shared');
  return generateToken({
    userId: 0, username: 'study-service', roleId: 1, roleName: 'super_admin'
  });
}

module.exports = {
  getBooks,
  getBookById,
  submitBook,
  addBook,
  updateBook,
  deleteBook,
  getPendingBooks,
  reviewBook,
  rateBook,
  toggleCollection,
  getMyCollections,
  getRecommendations
};
