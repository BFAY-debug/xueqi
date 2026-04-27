/**
 * DFA-based sensitive word filter with text normalization.
 * Supports anti-bypass (case/fwidth/traditional/special-chars),
 * check mode (block), filter mode (replace with ***),
 * and incremental trie updates.
 */

// ── Traditional → Simplified Chinese mapping (common chars) ──
const TRADITIONAL_TO_SIMPLIFIED = {
  '國': '国', '說': '说', '學': '学', '見': '见', '對': '对',
  '來': '来', '過': '过', '時': '时', '問': '问', '經': '经',
  '開': '开', '長': '长', '會': '会', '進': '进', '點': '点',
  '還': '还', '無': '无', '們': '们', '義': '义', '發': '发',
  '動': '动', '現': '现', '機': '机', '電': '电', '網': '网',
  '這': '这', '語': '语', '識': '识', '讀': '读', '書': '书',
  '讓': '让', '為': '为', '與': '与', '區': '区', '關': '关',
  '門': '门', '聽': '听', '覺': '觉', '萬': '万', '幾': '几',
  '個': '个', '龍': '龙', '鳳': '凤', '張': '张', '華': '华',
  '東': '东', '條': '条', '樣': '样', '當': '当', '種': '种',
  '場': '场', '腦': '脑', '體': '体', '認': '认', '論': '论',
  '質': '质', '實': '实', '戰': '战', '導': '导', '層': '层',
  '將': '将', '車': '车', '間': '间', '題': '题', '階': '阶',
  '級': '级', '農': '农', '產': '产', '業': '业', '幣': '币',
  '歷': '历', '壓': '压', '縣': '县', '參': '参', '從': '从',
  '圖': '图', '轉': '转', '熱': '热', '氣': '气', '傳': '传',
  '優': '优', '選': '选', '適': '适', '較': '较', '辦': '办',
  '營': '营', '雙': '双', '確': '确', '術': '术', '團': '团',
  '備': '备', '製': '制', '廠': '厂', '態': '态', '環': '环',
  '構': '构', '積': '积', '極': '极', '標': '标', '準': '准',
  '檢': '检', '證': '证', '斷': '断', '醫': '医', '療': '疗',
  '護': '护', '藥': '药', '節': '节', '績': '绩', '織': '织',
  '紀': '纪', '約': '约', '統': '统', '計': '计', '資': '资',
  '試': '试', '記': '记', '設': '设', '許': '许', '討': '讨',
  '劃': '划', '聯': '联', '購': '购', '貿': '贸', '費': '费',
  '貴': '贵', '財': '财', '貧': '贫', '貨': '货', '賣': '卖',
  '賴': '赖', '賺': '赚', '賽': '赛', '贊': '赞', '贈': '赠',
  '贏': '赢', '趕': '赶', '趨': '趋', '躍': '跃', '滅': '灭',
  '災': '灾', '煙': '烟', '煩': '烦', '燒': '烧', '燈': '灯',
  '獨': '独', '獲': '获', '獻': '献', '禮': '礼', '禦': '御',
  '穩': '稳', '隱': '隐', '隸': '隶', '雜': '杂', '難': '难',
  '顯': '显', '風': '风', '飛': '飞', '飲': '饮', '養': '养',
  '驚': '惊', '驗': '验', '驕': '骄', '騎': '骑', '騙': '骗',
  '髮': '发', '鬥': '斗', '魚': '鱼', '鮮': '鲜', '鳥': '鸟',
  '鳴': '鸣', '鴨': '鸭', '鵝': '鹅', '麗': '丽', '麥': '麦',
  '黨': '党', '齊': '齐', '齋': '斋', '齒': '齿', '齡': '龄',
  '龐': '庞', '幹': '干', '臟': '脏', '髒': '脏', '著': '着',
  '裏': '里', '裡': '里', '颱': '台', '霧': '雾', '隻': '只',
  '姦': '奸', '僞': '伪', '傭': '佣', '億': '亿', '儘': '尽',
  '劍': '剑', '劉': '刘', '劑': '剂', '劇': '剧', '勁': '劲',
  '勞': '劳', '勢': '势', '勳': '勋', '勝': '胜', '匭': '匦',
  '匯': '汇', '匱': '匮', '協': '协', '卻': '却', '叢': '丛',
  '吳': '吴', '員': '员', '嘗': '尝', '囑': '嘱', '壘': '垒',
  '壞': '坏', '處': '处', '復': '复', '徑': '径', '憂': '忧',
  '懲': '惩', '戲': '戏', '戴': '戴', '據': '据', '擔': '担',
  '據': '据', '擬': '拟', '擴': '扩', '擺': '摆', '攝': '摄',
  '敗': '败', '數': '数', '斂': '敛', '於': '于', '晝': '昼',
  '曆': '历', '曾': '曾', '替': '替', '術': '术', '條': '条',
  '棄': '弃', '檔': '档', '歲': '岁', '歷': '历', '殘': '残',
  '殺': '杀', '毀': '毁', '漢': '汉', '潔': '洁', '潛': '潜',
  '澤': '泽', '濟': '济', '濕': '湿', '濱': '滨', '瀕': '濒',
  '瀏': '浏', '爐': '炉', '爭': '争', '牆': '墙', '獄': '狱',
  '獎': '奖', '瑪': '玛', '璽': '玺', '癡': '痴', '發': '发',
  '盤': '盘', '盧': '卢', '眾': '众', '睜': '睁', '矚': '瞩',
  '磚': '砖', '礎': '础', '礙': '碍', '禍': '祸', '禱': '祷',
  '稅': '税', '穀': '谷', '窮': '穷', '競': '竞', '管': '管',
  '籠': '笼', '籍': '籍', '籲': '吁', '約': '约', '紅': '红',
  '紙': '纸', '級': '级', '納': '纳', '純': '纯', '索': '索',
  '緊': '紧', '細': '细', '終': '终', '組': '组', '結': '结',
  '絕': '绝', '絞': '绞', '絡': '络', '絲': '丝', '經': '经',
  '綁': '绑', '綠': '绿', '綱': '纲', '網': '网', '緯': '纬',
  '練': '练', '總': '总', '績': '绩', '繁': '繁', '繳': '缴',
  '續': '续', '鐵': '铁', '鑒': '鉴', '鑰': '钥', '長': '长',
  '門': '门', '閉': '闭', '開': '开', '閏': '闰', '閑': '闲',
  '間': '间', '閣': '阁', '閥': '阀', '閱': '阅', '館': '馆',
  '穀': '谷', '黷': '黩', '鼎': '鼎',
};

// ── Trie root ──
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
 * Normalize text for anti-bypass matching.
 * Returns { text: normalizedString, map: normalizedIndex[] → originalIndex }
 *
 * Steps: fullwidth→halfwidth → lowercase → traditional→simplified → strip special chars
 */
function normalizeWithMap(text) {
  if (!text) return { text: '', map: [] };

  const map = [];
  let normalized = '';

  for (let i = 0; i < text.length; i++) {
    let ch = text[i];
    const cp = ch.charCodeAt(0);

    // Full-width → half-width (U+FF01–U+FF5E → U+0021–U+007E)
    if (cp >= 0xFF01 && cp <= 0xFF5E) {
      ch = String.fromCharCode(cp - 0xFEE0);
    }

    // Lowercase
    ch = ch.toLowerCase();

    // Traditional → Simplified
    ch = TRADITIONAL_TO_SIMPLIFIED[ch] || ch;

    // Keep only CJK ideographs and [a-z0-9]
    const ncp = ch.charCodeAt(0);
    const isCJK = (ncp >= 0x4e00 && ncp <= 0x9fff);
    const isAlnum = (ncp >= 0x61 && ncp <= 0x7a) || (ncp >= 0x30 && ncp <= 0x39);

    if (isCJK || isAlnum) {
      normalized += ch;
      map.push(i);
    }
  }

  return { text: normalized, map };
}

/**
 * Normalize text (no index map). Used by check().
 */
function normalize(text) {
  return normalizeWithMap(text).text;
}

/**
 * Check text for sensitive words (block mode).
 * Returns { hasSensitive: boolean, words: string[] }.
 */
function check(text) {
  if (!text) return { hasSensitive: false, words: [] };
  const normalized = normalize(text);
  const found = new Set();
  for (let i = 0; i < normalized.length; i++) {
    let node = trie;
    let j = i;
    let matched = '';
    while (j < normalized.length && node[normalized[j]]) {
      matched += normalized[j];
      node = node[normalized[j]];
      if (node['\0']) found.add(matched);
      j++;
    }
  }
  return { hasSensitive: found.size > 0, words: [...found] };
}

/**
 * Filter text by replacing sensitive words with *** (replace mode).
 * Uses normalizeWithMap to map positions back to original text.
 */
function filter(text) {
  if (!text) return text;
  const { text: normalized, map } = normalizeWithMap(text);

  // Find all matches with their normalized positions
  const matches = [];
  for (let i = 0; i < normalized.length; i++) {
    let node = trie;
    let j = i;
    let matchEnd = -1;
    while (j < normalized.length && node[normalized[j]]) {
      node = node[normalized[j]];
      j++;
      if (node['\0']) matchEnd = j;
    }
    if (matchEnd > i) {
      matches.push({ start: i, end: matchEnd });
      i = matchEnd - 1;
    }
  }

  if (matches.length === 0) return text;

  // Convert to original text ranges
  const origRanges = matches.map(m => ({
    start: map[m.start],
    end: map[m.end - 1] + 1
  }));

  // Merge overlapping ranges
  origRanges.sort((a, b) => a.start - b.start);
  const merged = [origRanges[0]];
  for (let i = 1; i < origRanges.length; i++) {
    const last = merged[merged.length - 1];
    if (origRanges[i].start <= last.end) {
      last.end = Math.max(last.end, origRanges[i].end);
    } else {
      merged.push(origRanges[i]);
    }
  }

  // Build result: replace from back to front to preserve indices
  let result = text;
  for (let i = merged.length - 1; i >= 0; i--) {
    const { start, end } = merged[i];
    result = result.substring(0, start) + '*'.repeat(Math.min(end - start, 10)) + result.substring(end);
  }
  return result;
}

/**
 * Incrementally add a word to the trie (no full reload needed).
 */
function addWord(word) {
  if (!word || !word.trim()) return;
  insertWord(word.trim());
}

/**
 * Incrementally remove a word from the trie (no full reload needed).
 * Only deletes the termination marker — orphaned branches are harmless.
 */
function removeWord(word) {
  if (!word || !word.trim()) return;
  word = word.trim();
  let node = trie;
  for (const ch of word) {
    if (!node[ch]) return;
    node = node[ch];
  }
  delete node['\0'];
}

/**
 * Full reload from database (for initial load or periodic cleanup).
 */
async function reload(pool) {
  await loadFromDB(pool);
}

module.exports = { loadFromDB, check, filter, reload, addWord, removeWord };
