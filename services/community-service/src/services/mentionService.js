const { db, logger } = require('xueqi-shared');
const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

// Match @username — supports Chinese, letters, digits, underscores
const MENTION_REGEX = /@([\w\u4e00-\u9fff]+)/g;

/**
 * Extract unique usernames from content after @
 */
function parseMentions(content) {
  if (!content) return [];
  const matches = [];
  let m;
  while ((m = MENTION_REGEX.exec(content)) !== null) {
    matches.push(m[1]);
  }
  return [...new Set(matches)];
}

/**
 * Resolve usernames to user IDs
 */
async function resolveMentions(usernames) {
  if (!usernames.length) return [];
  const placeholders = usernames.map(() => '?').join(',');
  const [rows] = await db.execute(
    `SELECT id, username FROM users WHERE username IN (${placeholders}) AND status = 1`,
    usernames
  );
  return rows; // [{ id, username }]
}

/**
 * Send mention notifications via user-service
 */
async function notifyMentions({ mentionedUsers, fromUserId, fromUsername, postId, commentId }) {
  if (!mentionedUsers.length) return;
  try {
    const token = getServiceToken();
    const promises = mentionedUsers
      .filter(u => u.id !== fromUserId)
      .map(u => axios.post(`${USER_SERVICE_URL}/api/user/notifications/create`, {
        userId: u.id,
        type: 'mention',
        title: `${fromUsername} 在${commentId ? '评论' : '文章'}中提及了你`,
        content: commentId ? `在文章评论中 @了你` : `在文章中 @了你`,
        relatedId: postId,
        relatedType: commentId ? 'comment' : 'post'
      }, { headers: { Authorization: `Bearer ${token}` } }));

    await Promise.allSettled(promises);
  } catch (err) {
    logger.warn(`Failed to send mention notifications: ${err.message}`);
  }
}

/**
 * Full pipeline: parse content, resolve users, notify
 */
async function processMentions(content, { fromUserId, fromUsername, postId, commentId }) {
  const usernames = parseMentions(content);
  if (!usernames.length) return;

  const mentionedUsers = await resolveMentions(usernames);
  if (!mentionedUsers.length) return;

  await notifyMentions({ mentionedUsers, fromUserId, fromUsername, postId, commentId });
  return mentionedUsers;
}

/**
 * Enrich comments with mentionedUsers for frontend rendering
 */
function enrichWithMentions(rows) {
  const allMentions = [];
  const commentMentions = new Map();

  for (const row of rows) {
    if (row.is_anonymous) {
      row.mentionedUsers = [];
      continue;
    }
    const usernames = parseMentions(row.content);
    if (usernames.length) {
      row._mentionNames = usernames;
      allMentions.push(...usernames);
    } else {
      row.mentionedUsers = [];
    }
  }

  if (!allMentions.length) return;

  const unique = [...new Set(allMentions)];
  // Sync resolve — rows is already fetched, this is inside getComments
  // We do a separate async call in the service layer
  return unique;
}

/**
 * Batch-resolve usernames to { username, id } map
 */
async function batchResolveMentions(usernames) {
  if (!usernames.length) return new Map();
  const users = await resolveMentions(usernames);
  return new Map(users.map(u => [u.username, u.id]));
}

function getServiceToken() {
  const { jwt: { generateToken } } = require('xueqi-shared');
  return generateToken({ userId: 0, username: 'community-service', roleId: 0, roleName: 'service', type: 'service' });
}

module.exports = { parseMentions, resolveMentions, processMentions, batchResolveMentions };
