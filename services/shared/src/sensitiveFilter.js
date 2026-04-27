/**
 * DFA-based sensitive word filter.
 * Builds an in-memory trie from database, supports reload on admin CRUD.
 */

// Trie root: { char: { char: { ... '\0': true } } }
let trie = {};

/**
 * Load all words from database and rebuild trie.
 */
async function loadFromDB(pool) {
  const [rows] = await pool.execute('SELECT word FROM sensitive_words');
  trie = {};
  for (const row of rows) {
    insertWord(row.word.trim());
  }
}

/**
 * Insert a single word into the trie.
 */
function insertWord(word) {
  let node = trie;
  for (const ch of word) {
    if (!node[ch]) node[ch] = {};
    node = node[ch];
  }
  node['\0'] = true;
}

/**
 * Check text for sensitive words. Returns matched words.
 */
function check(text) {
  if (!text) return { hasSensitive: false, words: [] };
  const found = new Set();
  for (let i = 0; i < text.length; i++) {
    let node = trie;
    let j = i;
    let matched = '';
    while (j < text.length && node[text[j]]) {
      matched += text[j];
      node = node[text[j]];
      if (node['\0']) {
        found.add(matched);
      }
      j++;
    }
    // Skip ahead if we found a match to avoid redundant scanning
    if (found.size > 0 && matched.length > 0 && j > i + 1) {
      // Continue from next char anyway for overlapping matches
    }
  }
  return { hasSensitive: found.size > 0, words: [...found] };
}

/**
 * Reload trie from database (call after admin adds/deletes words).
 */
async function reload(pool) {
  await loadFromDB(pool);
}

module.exports = { loadFromDB, check, reload };
