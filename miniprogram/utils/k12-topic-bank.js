// K12 知识点题库：让任何知识点都能直接开一局，不依赖已上传错题。
// 每个主题 5 张卡：4 张短问短答（地鼠/快闪/配对可用，互为干扰项）+ 1 张步骤卡（路线接龙可用）。
// 内容只做「第一步/检查点」式引导，不给完整解题答案。

const TOPIC_BANK = {
  小数乘法: [
    { q: '0.3 × 0.2 的积有几位小数？', a: '两位小数', hint: '两个因数各一位小数' },
    { q: '小数乘法第一步先做什么？', a: '按整数相乘', hint: '先忽略小数点' },
    { q: '积的小数位数由什么决定？', a: '因数小数位之和', hint: '数一数再点点' },
    { q: '2.5 × 4 的积末尾的 0 怎么办？', a: '先点小数点再去0', hint: '顺序别颠倒' },
    { q: '小数乘法的检查顺序是什么？', a: '先按整数算，再数两个因数共几位小数，最后从右往左点上小数点', hint: '三步口诀', steps: true }
  ],
  认识分数: [
    { q: '把一个蛋糕平均分成 4 份，每份是几分之几？', a: '四分之一', hint: '平均分是前提' },
    { q: '分数线下面的数叫什么？', a: '分母', hint: '表示平均分的份数' },
    { q: '比较 1/3 和 1/4 谁大？', a: '1/3 大', hint: '分子相同看分母' },
    { q: '分数的前提条件是什么？', a: '平均分', hint: '不平均不能用分数' },
    { q: '认识一个分数的三步是什么？', a: '先看是否平均分，再数总份数定分母，最后数取的份数定分子', hint: '三步认分数', steps: true }
  ],
  面积计算: [
    { q: '长方形面积公式是什么？', a: '长乘宽', hint: '两条邻边' },
    { q: '面积单位和长度单位的区别？', a: '面积带平方', hint: '平方厘米平方米' },
    { q: '正方形面积公式是什么？', a: '边长乘边长', hint: '特殊的长方形' },
    { q: '算面积前先检查什么？', a: '单位是否统一', hint: '厘米和米别混' },
    { q: '组合图形面积的思路是什么？', a: '先把图形切成规则块，再分别算面积，最后相加或相减', hint: '切块法', steps: true }
  ],
  混合运算: [
    { q: '有括号的算式先算什么？', a: '括号里面', hint: '括号优先' },
    { q: '同级运算按什么顺序算？', a: '从左到右', hint: '别跳着算' },
    { q: '乘除和加减谁先算？', a: '先乘除后加减', hint: '二级优先' },
    { q: '混合运算最容易错在哪？', a: '运算顺序', hint: '先标序号再动笔' },
    { q: '做混合运算的三步是什么？', a: '先标出运算顺序，再一步一步算，最后代回原式检查', hint: '标序号防错', steps: true }
  ],
  英语单词: [
    { q: 'apple 的意思是什么？', a: '苹果', hint: '水果类' },
    { q: '记单词先记什么？', a: '读音', hint: '会读才好记' },
    { q: '单词忘得快怎么办？', a: '隔天复习', hint: '间隔重复' },
    { q: '词组 look at 的意思？', a: '看着', hint: '固定搭配' },
    { q: '背一个新单词的三步是什么？', a: '先读准发音，再拆音节拼写，最后用它造一个短句', hint: '音形义三关', steps: true }
  ],
  阅读理解: [
    { q: '做阅读题第一步先做什么？', a: '先读问题', hint: '带着问题读' },
    { q: '找答案优先去哪里找？', a: '原文', hint: '答案藏在文中' },
    { q: '概括段意抓什么句子？', a: '中心句', hint: '常在段首段尾' },
    { q: '做完阅读题怎么检查？', a: '回原文核对', hint: '别凭印象' },
    { q: '阅读理解的三步法是什么？', a: '先读题目画关键词，再回原文定位相关句，最后用原文信息组织答案', hint: '定位答题法', steps: true }
  ]
};

function normalizeTopic(topic = '') {
  const value = String(topic || '').trim();
  if (TOPIC_BANK[value]) return value;
  const hit = Object.keys(TOPIC_BANK).find((key) => value.indexOf(key) >= 0 || key.indexOf(value) >= 0);
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
  const rows = key ? TOPIC_BANK[key] : genericDeck(topic);
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

module.exports = {
  TOPIC_BANK,
  buildTopicDeck,
  normalizeTopic
};
