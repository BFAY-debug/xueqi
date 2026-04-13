const { db } = require('xueqi-shared');

async function getTags(req, res, next) {
  try {
    const [rows] = await db.execute(
      `SELECT t.id, t.name, COUNT(pt.post_id) AS post_count
       FROM tags t
       LEFT JOIN post_tags pt ON pt.tag_id = t.id
       LEFT JOIN posts p ON p.id = pt.post_id AND p.status = 'published'
       GROUP BY t.id
       ORDER BY post_count DESC`
    );
    res.success(rows);
  } catch (err) { next(err); }
}

module.exports = { getTags };
