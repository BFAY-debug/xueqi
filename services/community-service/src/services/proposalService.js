const { db, logger } = require('xueqi-shared');

/**
 * Create an edit proposal for a post
 */
async function createProposal(postId, proposerId, { title, description, content }) {
  // Verify post exists and is published
  const [posts] = await db.execute(
    "SELECT id, user_id, version, title AS post_title, status FROM posts WHERE id = ?",
    [postId]
  );
  if (posts.length === 0) {
    const error = new Error('文章不存在');
    error.status = 404;
    throw error;
  }
  if (posts[0].user_id === proposerId) {
    const error = new Error('不能对自己的文章提出修改，请直接编辑');
    error.status = 400;
    throw error;
  }

  const baseVersion = posts[0].version;

  const [result] = await db.execute(
    `INSERT INTO edit_proposals (post_id, proposer_id, title, description, content, base_version)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [postId, proposerId, title, description || '', content, baseVersion]
  );

  return { proposalId: result.insertId, status: 'open' };
}

/**
 * Get proposals for a post (or all proposals)
 */
async function getProposals({ postId, status, page = 1, pageSize = 20 }) {
  page = parseInt(page, 10) || 1;
  pageSize = parseInt(pageSize, 10) || 20;
  const offset = (page - 1) * pageSize;
  const conditions = [];
  const params = [];

  if (postId) {
    conditions.push('ep.post_id = ?');
    params.push(postId);
  }
  if (status) {
    conditions.push('ep.status = ?');
    params.push(status);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const [rows] = await db.execute(
    `SELECT ep.*, p.title AS post_title,
            u.username AS proposer_name, u.avatar_url AS proposer_avatar,
            l.badge AS proposer_badge
     FROM edit_proposals ep
     JOIN posts p ON p.id = ep.post_id
     JOIN users u ON u.id = ep.proposer_id
     LEFT JOIN user_stats us ON us.user_id = ep.proposer_id
     LEFT JOIN levels l ON l.id = us.level_id
     ${where}
     ORDER BY ep.created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    params
  );

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total FROM edit_proposals ep ${where}`,
    params
  );

  return { data: rows, total: countRows[0].total };
}

/**
 * Get a single proposal by ID
 */
async function getProposalById(id) {
  const [rows] = await db.execute(
    `SELECT ep.*, p.title AS post_title, p.content AS original_content, p.version AS current_version,
            u.username AS proposer_name, u.avatar_url AS proposer_avatar,
            l.badge AS proposer_badge
     FROM edit_proposals ep
     JOIN posts p ON p.id = ep.post_id
     JOIN users u ON u.id = ep.proposer_id
     LEFT JOIN user_stats us ON us.user_id = ep.proposer_id
     LEFT JOIN levels l ON l.id = us.level_id
     WHERE ep.id = ?`,
    [id]
  );

  if (rows.length === 0) {
    const error = new Error('提案不存在');
    error.status = 404;
    throw error;
  }

  return rows[0];
}

/**
 * Merge a proposal (post author only)
 */
async function mergeProposal(id, reviewerId) {
  const proposal = await getProposalById(id);

  if (proposal.status !== 'open') {
    const error = new Error('该提案不在开放状态');
    error.status = 400;
    throw error;
  }

  // Verify the reviewer is the post author
  const [posts] = await db.execute('SELECT user_id, version FROM posts WHERE id = ?', [proposal.post_id]);
  if (posts[0].user_id !== reviewerId) {
    const error = new Error('只有文章作者可以合并提案');
    error.status = 403;
    throw error;
  }

  const newVersion = posts[0].version + 1;

  // Update post content and version
  await db.execute(
    'UPDATE posts SET content = ?, version = ?, title = ? WHERE id = ?',
    [proposal.content, newVersion, proposal.title, proposal.post_id]
  );

  // Record version history
  await db.execute(
    `INSERT INTO post_versions (post_id, version, title, content, edit_summary, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [proposal.post_id, newVersion, proposal.title, proposal.content,
     `合并提案 #${id}: ${proposal.description}`, proposal.proposer_id]
  );

  // Update proposal status
  await db.execute(
    `UPDATE edit_proposals SET status = 'merged', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
    [reviewerId, id]
  );

  // Notify proposer
  await db.execute(
    `INSERT INTO notifications (user_id, type, title, content, related_id, related_type)
     VALUES (?, 'review_result', '编辑提案已合并', ?, ?, 'proposal')`,
    [proposal.proposer_id, `你对「${proposal.post_title}」的编辑提案已被合并`, id]
  );

  return { merged: true, newVersion };
}

/**
 * Reject a proposal (post author only)
 */
async function rejectProposal(id, reviewerId, comment) {
  const proposal = await getProposalById(id);

  if (proposal.status !== 'open') {
    const error = new Error('该提案不在开放状态');
    error.status = 400;
    throw error;
  }

  const [posts] = await db.execute('SELECT user_id FROM posts WHERE id = ?', [proposal.post_id]);
  if (posts[0].user_id !== reviewerId) {
    const error = new Error('只有文章作者可以拒绝提案');
    error.status = 403;
    throw error;
  }

  await db.execute(
    `UPDATE edit_proposals SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), review_comment = ? WHERE id = ?`,
    [reviewerId, comment || '', id]
  );

  // Notify proposer
  await db.execute(
    `INSERT INTO notifications (user_id, type, title, content, related_id, related_type)
     VALUES (?, 'review_result', '编辑提案被拒绝', ?, ?, 'proposal')`,
    [proposal.proposer_id,
     `你对「${proposal.post_title}」的编辑提案被拒绝${comment ? '，原因：' + comment : ''}`, id]
  );

  return { rejected: true };
}

/**
 * Close own proposal (proposer only)
 */
async function closeProposal(id, userId) {
  const [rows] = await db.execute(
    "SELECT * FROM edit_proposals WHERE id = ? AND proposer_id = ? AND status = 'open'",
    [id, userId]
  );
  if (rows.length === 0) {
    const error = new Error('提案不存在或无权操作');
    error.status = 403;
    throw error;
  }

  await db.execute(
    "UPDATE edit_proposals SET status = 'closed' WHERE id = ?",
    [id]
  );

  return { closed: true };
}

/**
 * Get current user's proposals
 */
async function getMyProposals(userId, { status, page = 1, pageSize = 20 }) {
  page = parseInt(page, 10) || 1;
  pageSize = parseInt(pageSize, 10) || 20;
  const offset = (page - 1) * pageSize;
  const conditions = ['ep.proposer_id = ?'];
  const params = [userId];

  if (status) {
    conditions.push('ep.status = ?');
    params.push(status);
  }

  const where = 'WHERE ' + conditions.join(' AND ');

  const [rows] = await db.execute(
    `SELECT ep.*, p.title AS post_title
     FROM edit_proposals ep
     JOIN posts p ON p.id = ep.post_id
     ${where}
     ORDER BY ep.created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    params
  );

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total FROM edit_proposals ep ${where}`,
    params
  );

  return { data: rows, total: countRows[0].total };
}

module.exports = {
  createProposal,
  getProposals,
  getProposalById,
  mergeProposal,
  rejectProposal,
  closeProposal,
  getMyProposals
};
