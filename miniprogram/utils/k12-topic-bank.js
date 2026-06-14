// K12 知识点题库：让任何知识点都能直接开一局，不依赖已上传错题。
// 每个主题 8 张卡：7 张短问短答（地鼠/快闪/配对可用，互为干扰项）+ 1 张步骤卡（路线接龙可用）。
// 内容只做「第一步/检查点」式引导，不给完整解题答案。

const TOPIC_BANK = {
  小数乘法: [
    { q: '4.2 × 10 小数点怎么动？', a: '右移一位', hint: '乘10右移' },
    { q: '0.5 × 0.5 等于多少？', a: '0.25', hint: '先算5×5' },
    { q: '估算 3.9 × 2.1 接近几？', a: '8', hint: '看成4×2' },
    { q: '0.3 × 0.2 的积有几位小数？', a: '两位小数', hint: '两个因数各一位小数' },
    { q: '小数乘法第一步先做什么？', a: '按整数相乘', hint: '先忽略小数点' },
    { q: '积的小数位数由什么决定？', a: '因数小数位之和', hint: '数一数再点点' },
    { q: '2.5 × 4 的积末尾的 0 怎么办？', a: '先点小数点再去0', hint: '顺序别颠倒' },
    { q: '小数乘法的检查顺序是什么？', a: '先按整数算，再数两个因数共几位小数，最后从右往左点上小数点', hint: '三步口诀', steps: true }
  ],
  认识分数: [
    { q: '2/4 化简后是多少？', a: '1/2', hint: '上下同除2' },
    { q: '一半用分数怎么写？', a: '1/2', hint: '两份取一份' },
    { q: '3/8 里有几个 1/8？', a: '3个', hint: '分子说个数' },
    { q: '把一个蛋糕平均分成 4 份，每份是几分之几？', a: '四分之一', hint: '平均分是前提' },
    { q: '分数线下面的数叫什么？', a: '分母', hint: '表示平均分的份数' },
    { q: '比较 1/3 和 1/4 谁大？', a: '1/3 大', hint: '分子相同看分母' },
    { q: '分数的前提条件是什么？', a: '平均分', hint: '不平均不能用分数' },
    { q: '认识一个分数的三步是什么？', a: '先看是否平均分，再数总份数定分母，最后数取的份数定分子', hint: '三步认分数', steps: true }
  ],
  面积计算: [
    { q: '边长 5 厘米的正方形面积？', a: '25平方厘米', hint: '5×5' },
    { q: '1 平方米等于几平方分米？', a: '100', hint: '进率是100' },
    { q: '周长相等的长方形面积一定相等吗？', a: '不一定', hint: '举个反例' },
    { q: '长方形面积公式是什么？', a: '长乘宽', hint: '两条邻边' },
    { q: '面积单位和长度单位的区别？', a: '面积带平方', hint: '平方厘米平方米' },
    { q: '正方形面积公式是什么？', a: '边长乘边长', hint: '特殊的长方形' },
    { q: '算面积前先检查什么？', a: '单位是否统一', hint: '厘米和米别混' },
    { q: '组合图形面积的思路是什么？', a: '先把图形切成规则块，再分别算面积，最后相加或相减', hint: '切块法', steps: true }
  ],
  混合运算: [
    { q: '20 - 5 × 2 等于多少？', a: '10', hint: '先乘后减' },
    { q: '(8 + 4) ÷ 2 等于多少？', a: '6', hint: '先算括号' },
    { q: '18 ÷ 3 × 2 等于多少？', a: '12', hint: '同级从左到右' },
    { q: '有括号的算式先算什么？', a: '括号里面', hint: '括号优先' },
    { q: '同级运算按什么顺序算？', a: '从左到右', hint: '别跳着算' },
    { q: '乘除和加减谁先算？', a: '先乘除后加减', hint: '二级优先' },
    { q: '混合运算最容易错在哪？', a: '运算顺序', hint: '先标序号再动笔' },
    { q: '做混合运算的三步是什么？', a: '先标出运算顺序，再一步一步算，最后代回原式检查', hint: '标序号防错', steps: true }
  ],
  英语单词: [
    { q: 'teacher 的意思是什么？', a: '老师', hint: '职业类' },
    { q: 'big 的反义词是什么？', a: 'small', hint: '大与小' },
    { q: 'Monday 是星期几？', a: '星期一', hint: '一周开始' },
    { q: 'apple 的意思是什么？', a: '苹果', hint: '水果类' },
    { q: '记单词先记什么？', a: '读音', hint: '会读才好记' },
    { q: '单词忘得快怎么办？', a: '隔天复习', hint: '间隔重复' },
    { q: '词组 look at 的意思？', a: '看着', hint: '固定搭配' },
    { q: '背一个新单词的三步是什么？', a: '先读准发音，再拆音节拼写，最后用它造一个短句', hint: '音形义三关', steps: true }
  ],
  阅读理解: [
    { q: '文章第一段常交代什么？', a: '时间地点人物', hint: '三要素' },
    { q: '画线句的作用先看什么？', a: '上下文', hint: '联系前后' },
    { q: '总分结构的中心句在哪？', a: '段首', hint: '先总后分' },
    { q: '做阅读题第一步先做什么？', a: '先读问题', hint: '带着问题读' },
    { q: '找答案优先去哪里找？', a: '原文', hint: '答案藏在文中' },
    { q: '概括段意抓什么句子？', a: '中心句', hint: '常在段首段尾' },
    { q: '做完阅读题怎么检查？', a: '回原文核对', hint: '别凭印象' },
    { q: '阅读理解的三步法是什么？', a: '先读题目画关键词，再回原文定位相关句，最后用原文信息组织答案', hint: '定位答题法', steps: true }
  ],
  认识钟表: [
    { q: '分针指 12 时针指 3 是几点？', a: '3点整', hint: '分针12是整点' },
    { q: '时针走一大格是多久？', a: '1小时', hint: '钟面12大格' },
    { q: '分针走一小格是多久？', a: '1分钟', hint: '60小格' },
    { q: '6点半时分针指几？', a: '6', hint: '半点指6' },
    { q: '一刻钟是多少分钟？', a: '15分钟', hint: '四分之一时' },
    { q: '时针在3和4之间分针指6是几点几分？', a: '3点30分', hint: '先看时针' },
    { q: '从2点到5点经过几小时？', a: '3小时', hint: '5减2' },
    { q: '认钟表的三步是什么？', a: '先看时针定几点，再看分针定几分，最后合起来读出来', hint: '时针先行', steps: true }
  ],
  长度单位: [
    { q: '1 米等于多少厘米？', a: '100厘米', hint: '进率100' },
    { q: '课本的厚度大约用什么单位？', a: '毫米', hint: '很薄的东西' },
    { q: '操场跑道一圈大约用什么单位？', a: '米', hint: '较长距离' },
    { q: '1 千米等于多少米？', a: '1000米', hint: '千字提示' },
    { q: '量身高用什么单位合适？', a: '厘米', hint: '一米多用厘米' },
    { q: '5 厘米加 5 毫米等于多少毫米？', a: '55毫米', hint: '先统一单位' },
    { q: '比较长度前先做什么？', a: '统一单位', hint: '单位不同别直接比' },
    { q: '换算长度单位的三步是什么？', a: '先认清两个单位，再想进率是多少，最后大化小乘小化大除', hint: '进率是桥', steps: true }
  ]
};

const qbankStarter = (() => {
  try {
    return require('./qbank-starter.js');
  } catch (error) {
    // Node contract tests may load this module through stdin; fall back to an absolute module path.
    const cwd = typeof process !== 'undefined' && process.cwd ? process.cwd() : '';
    return require(`${cwd}/miniprogram/utils/qbank-starter.js`);
  }
})();
const STARTER_BANK = (qbankStarter && qbankStarter.STARTER_BANK) || {};
const STARTER_TOPICS = (qbankStarter && qbankStarter.STARTER_TOPICS) || [];

const TOPIC_PROFILES = {
  小数乘法: { tag: '真题 · 小数运算', duration: '约 3 分钟', theme: 'teal', aliases: ['小数运算', '小数点移动', '小数计算'] },
  认识分数: { tag: '真题 · 分数运算', duration: '约 3 分钟', theme: 'rose', aliases: ['分数', '分数运算', '约分', '通分'] },
  面积计算: { tag: '真题 · 面积图形', duration: '约 4 分钟', theme: 'green', aliases: ['面积', '图形面积', '组合图形'] },
  混合运算: { tag: '真题 · 运算顺序', duration: '约 3 分钟', theme: 'orange', aliases: ['计算检查', '运算顺序', '四则混合运算'] },
  认识钟表: { tag: '真题 · 时间计算', duration: '约 3 分钟', theme: 'teal', aliases: ['钟表', '时间', '时间计算'] },
  行程问题: { tag: '真题 · 路线推理', duration: '约 5 分钟', theme: 'orange', aliases: ['路程速度时间', '相遇追及', '速度问题'] },
  百分数应用: { tag: '真题 · 百分数', duration: '约 4 分钟', theme: 'teal', aliases: ['百分数', '折扣', '增长率'] },
  平均数: { tag: '真题 · 统计感', duration: '约 3 分钟', theme: 'rose', aliases: ['统计', '平均值'] },
  倍数关系: { tag: '真题 · 倍数关系', duration: '约 4 分钟', theme: 'green', aliases: ['倍数', '倍比'] },
  和差问题: { tag: '真题 · 和差关系', duration: '约 4 分钟', theme: 'orange', aliases: ['和差', '差倍'] },
  工程问题: { tag: '真题 · 工作效率', duration: '约 5 分钟', theme: 'teal', aliases: ['工程', '效率'] },
  比例与比: { tag: '真题 · 比例关系', duration: '约 4 分钟', theme: 'rose', aliases: ['比例', '比', '比例应用'] },
  七年级计算: { tag: '真题 · 初一计算', duration: '约 3 分钟', theme: 'green', aliases: ['七年级数学计算', '初一计算'] },
  八年级计算: { tag: '真题 · 初二计算', duration: '约 3 分钟', theme: 'orange', aliases: ['八年级数学计算', '初二计算'] },
  九年级计算: { tag: '真题 · 初三计算', duration: '约 3 分钟', theme: 'teal', aliases: ['九年级数学计算', '初三计算'] },
  古诗词接句: { tag: '真题 · 古诗背诵', duration: '约 2 分钟', theme: 'rose', aliases: ['古诗词背诵', '诗词接句'] },
  古诗词作者: { tag: '真题 · 作者记忆', duration: '约 2 分钟', theme: 'green', aliases: ['诗人作者', '诗词作者'] },
  英语单词: { tag: '真题 · 单词记忆', duration: '约 3 分钟', theme: 'orange', aliases: ['单词', '英文单词', '词汇'] }
};

const TOPIC_ALIAS_LOOKUP = Object.keys(TOPIC_PROFILES).reduce((map, topic) => {
  map[topic] = topic;
  (TOPIC_PROFILES[topic].aliases || []).forEach((alias) => { map[alias] = topic; });
  return map;
}, {});

function topicRows(key) {
  // 手写卡 + curated 真题精选包合并：真题在后，干扰项池更厚
  return (TOPIC_BANK[key] || []).concat(STARTER_BANK[key] || []);
}

function normalizeTopic(topic = '') {
  const value = String(topic || '').trim();
  if (TOPIC_ALIAS_LOOKUP[value]) return TOPIC_ALIAS_LOOKUP[value];
  if (TOPIC_BANK[value] || STARTER_BANK[value]) return value;
  const keys = Object.keys(TOPIC_BANK).concat(Object.keys(STARTER_BANK));
  const hit = keys.find((key) => {
    const aliases = (TOPIC_PROFILES[key] && TOPIC_PROFILES[key].aliases) || [];
    return value.indexOf(key) >= 0
      || key.indexOf(value) >= 0
      || aliases.some((alias) => value.indexOf(alias) >= 0 || alias.indexOf(value) >= 0);
  });
  return hit || '';
}

function genericDeck(topic) {
  const label = String(topic || '这个知识点').slice(0, 12);
  return [
    { q: `「${label}」的题目通常先问什么？`, a: '先说求什么', hint: '目标先行' },
    { q: `「${label}」最容易看错哪里？`, a: '关键词和单位', hint: '圈出来再做' },
    { q: `做「${label}」卡住时第一步做什么？`, a: '圈已知条件', hint: '条件分两列' },
    { q: `「${label}」做完后先检查什么？`, a: '第一步对不对', hint: '回头看入口' },
    { q: `攻克「${label}」的三步是什么？`, a: '先说题目问什么，再圈已知条件，最后只写第一步', hint: '第一步法', steps: true }
  ];
}

function buildTopicDeck(topic = '') {
  const key = normalizeTopic(topic);
  const rows = key ? topicRows(key) : genericDeck(topic);
  const label = key || String(topic || '基础练习').slice(0, 12);
  const now = new Date().toISOString();
  const baseId = `topic_${label.replace(/[^a-zA-Z0-9_一-龥]/g, '_')}`;
  return rows.map((row, index) => ({
    id: `${baseId}_${index}`,
    type: row.steps ? 'topic_step_card' : 'topic_quiz_card',
    source: 'k12_topic_bank',
    state: 'new',
    due: now,
    created_at: now,
    question: row.q,
    answer: row.a,
    hint: row.hint || '',
    subject: label,
    taskType: row.steps ? 'first_step' : 'quick_recall',
    weakPoint: label,
    wrongCauseBucket: 'topic_practice',
    parentPrompt: `家长只问：${row.q}`,
    checkpoint: row.hint || '能说出第一步',
    prompt: row.hint || '先回忆再核对',
    noFullAnswer: false
  }));
}

function listPlayableTopics(limit = 12) {
  // 内置真题主题在前（每个都有牌组+云端大池），手写主题补位，去重
  const merged = [];
  STARTER_TOPICS.concat(Object.keys(TOPIC_BANK)).forEach((topic) => {
    if (merged.indexOf(topic) < 0) merged.push(topic);
  });
  return merged.slice(0, limit);
}

function listTopicCards(limit = 12) {
  return listPlayableTopics(limit).map((topic, index) => {
    const profile = TOPIC_PROFILES[topic] || {};
    const rows = topicRows(topic);
    return {
      topic,
      tag: profile.tag || '本地题库 · 第一轮',
      duration: profile.duration || (rows.length >= 8 ? '约 3 分钟' : '约 2 分钟'),
      theme: profile.theme || ['teal', 'rose', 'green', 'orange'][index % 4],
      cardCount: rows.length
    };
  });
}

module.exports = {
  TOPIC_BANK,
  buildTopicDeck,
  normalizeTopic,
  listPlayableTopics,
  listTopicCards,
  TOPIC_PROFILES
};
