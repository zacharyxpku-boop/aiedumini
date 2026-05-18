const SUBJECTS = [
  { key: 'chinese', label: '语文', aliases: ['语文', '作文', '阅读', '古文', '文言', '默写'] },
  { key: 'math', label: '数学', aliases: ['数学', '方程', '应用题', '列式', '几何', '函数', '代数'] },
  { key: 'english', label: '英语', aliases: ['英语', '单词', '语法', '听写', '完形'] },
  { key: 'physics', label: '物理', aliases: ['物理', '力学', '电路', '实验'] },
  { key: 'chemistry', label: '化学', aliases: ['化学', '方程式', '实验'] },
  { key: 'biology', label: '生物', aliases: ['生物', '生命', '遗传'] },
  { key: 'history', label: '历史', aliases: ['历史'] },
  { key: 'geography', label: '地理', aliases: ['地理'] },
  { key: 'politics', label: '政治', aliases: ['政治', '道法'] },
  { key: 'science', label: '科学', aliases: ['科学'] }
];

const QUICK_ASSESSMENT_QUESTIONS = [
  {
    id: 'start_mode',
    prompt: '遇到新题时，孩子更常怎么开始？',
    options: [
      { id: 'circle', label: '先圈条件', weights: { visual: 2, structure: 2 } },
      { id: 'read', label: '先完整读一遍', weights: { reading: 2, auditory: 1 } },
      { id: 'write', label: '先写一步试试', weights: { kinesthetic: 2, structure: 1 } }
    ]
  },
  {
    id: 'condition_scan',
    prompt: '题目条件很多时，孩子最需要哪种支持？',
    options: [
      { id: 'mark', label: '标记关键词', weights: { visual: 2, structure: 1 } },
      { id: 'repeat', label: '听别人复述', weights: { auditory: 2 } },
      { id: 'split', label: '拆成小步骤', weights: { structure: 2, persistence: 1 } }
    ]
  },
  {
    id: 'mistake_repair',
    prompt: '错题订正时，孩子更容易接受哪种方式？',
    options: [
      { id: 'compare', label: '对比原题和错因', weights: { reading: 2, structure: 1 } },
      { id: 'talk', label: '先说哪里卡住', weights: { auditory: 2, emotion: 1 } },
      { id: 'redo', label: '直接做一小题', weights: { kinesthetic: 2 } }
    ]
  },
  {
    id: 'variant_transfer',
    prompt: '换一个条件后，孩子通常会怎样？',
    options: [
      { id: 'stable', label: '能说出变化点', weights: { structure: 2, persistence: 1 } },
      { id: 'hesitate', label: '需要一点提示', weights: { emotion: 1, auditory: 1 } },
      { id: 'restart', label: '容易重新卡住', weights: { structure: 1, focus: 1 } }
    ]
  },
  {
    id: 'memory_mode',
    prompt: '记新内容时，哪种方式更顺？',
    options: [
      { id: 'look', label: '看图表/颜色', weights: { visual: 2 } },
      { id: 'say', label: '听讲/复述', weights: { auditory: 2 } },
      { id: 'write', label: '边写边记', weights: { reading: 1, kinesthetic: 2 } }
    ]
  },
  {
    id: 'focus_span',
    prompt: '独立学习 15 分钟时，孩子状态通常如何？',
    options: [
      { id: 'steady', label: '基本能坐住', weights: { focus: 2, persistence: 1 } },
      { id: 'remind', label: '需要提醒', weights: { focus: 1, emotion: 1 } },
      { id: 'break', label: '容易停下来', weights: { focus: 1 } }
    ]
  },
  {
    id: 'homework_rhythm',
    prompt: '作业时间变长时，最容易发生什么？',
    options: [
      { id: 'slow', label: '速度变慢', weights: { focus: 1 } },
      { id: 'avoid', label: '想先放一放', weights: { emotion: 2 } },
      { id: 'rush', label: '开始赶步骤', weights: { structure: 1, focus: 1 } }
    ]
  },
  {
    id: 'parent_talk',
    prompt: '家长问学习时，孩子更容易回应哪句话？',
    options: [
      { id: 'first_step', label: '第一步先做什么', weights: { structure: 2 } },
      { id: 'where_stuck', label: '刚才卡在哪里', weights: { emotion: 1, auditory: 1 } },
      { id: 'what_help', label: '你需要哪种帮忙', weights: { emotion: 2 } }
    ]
  },
  {
    id: 'reading_load',
    prompt: '长题干或长段落出现时，孩子更像哪种状态？',
    options: [
      { id: 'mark', label: '能边读边标', weights: { visual: 2, reading: 1 } },
      { id: 'listen', label: '听别人读更清楚', weights: { auditory: 2 } },
      { id: 'split', label: '需要分段处理', weights: { structure: 2 } }
    ]
  },
  {
    id: 'review_habit',
    prompt: '第二天回看昨天的题时，孩子通常如何？',
    options: [
      { id: 'remember_step', label: '记得第一步', weights: { persistence: 2, structure: 1 } },
      { id: 'remember_context', label: '记得场景但不稳', weights: { reading: 1, emotion: 1 } },
      { id: 'need_restart', label: '需要重新开始', weights: { focus: 1, persistence: 1 } }
    ]
  },
  {
    id: 'exam_feeling',
    prompt: '考试前孩子更常见的反应是？',
    options: [
      { id: 'calm', label: '按步骤准备', weights: { persistence: 2 } },
      { id: 'worry', label: '担心发挥', weights: { emotion: 2 } },
      { id: 'avoid', label: '不太愿意谈', weights: { emotion: 2, focus: 1 } }
    ]
  },
  {
    id: 'favorite_task',
    prompt: '孩子更愿意先完成哪类任务？',
    options: [
      { id: 'logic', label: '有明确步骤', weights: { structure: 2 } },
      { id: 'expression', label: '可以表达想法', weights: { reading: 1, auditory: 1 } },
      { id: 'hands_on', label: '可以动手操作', weights: { kinesthetic: 2 } }
    ]
  },
  {
    id: 'support_preference',
    prompt: '孩子卡住时，哪种帮助最有效？',
    options: [
      { id: 'hint', label: '给一个提示', weights: { structure: 1, auditory: 1 } },
      { id: 'example', label: '看一个例子', weights: { visual: 1, reading: 1 } },
      { id: 'small_goal', label: '只定小目标', weights: { focus: 2, emotion: 1 } }
    ]
  },
  {
    id: 'self_strength',
    prompt: '孩子自认为更擅长什么？',
    options: [
      { id: 'think', label: '想清楚关系', weights: { structure: 2 } },
      { id: 'speak', label: '说出自己的想法', weights: { auditory: 2 } },
      { id: 'try', label: '试着做出来', weights: { kinesthetic: 2 } }
    ]
  },
  {
    id: 'next_goal',
    prompt: '接下来一周最值得先练什么？',
    options: [
      { id: 'first_step', label: '说清第一步', weights: { structure: 2 } },
      { id: 'focus', label: '坐住一小段', weights: { focus: 2 } },
      { id: 'review', label: '回看错题', weights: { persistence: 2 } }
    ]
  }
];

function nowIso(nowInput) {
  const date = nowInput instanceof Date ? nowInput : new Date(nowInput || Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function safeText(value, fallback = '') {
  return String(value || '').replace(/\s+/g, ' ').trim() || fallback;
}

function clamp(number, min, max) {
  const value = Number(number);
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function confidenceLabel(value) {
  const score = clamp(value, 0, 1);
  if (score >= 0.78) return '高';
  if (score >= 0.55) return '中';
  return '低';
}

function subjectFromLine(line) {
  const text = String(line || '');
  return SUBJECTS.find((subject) => subject.aliases.some((alias) => text.indexOf(alias) >= 0));
}

function parseNumber(value) {
  const match = String(value || '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function firstNumberAfter(line, labelPattern) {
  const match = String(line || '').match(new RegExp(`(?:${labelPattern})[^0-9-]*(-?\\d+(?:\\.\\d+)?)`));
  return match ? Number(match[1]) : null;
}

function rankFromLine(line) {
  const value = String(line || '');
  const rank = firstNumberAfter(value, '班名|班级排名|班排|年级排名|总排名|排名|名次');
  return rank === null ? null : rank;
}

function makeScoreRecord(subject, score, rank, line, confidence) {
  const safeConfidence = clamp(confidence, 0.35, 0.98);
  return {
    subject: subject.label,
    key: subject.key,
    score,
    rank: rank === null ? undefined : rank,
    confidence: safeConfidence,
    confidenceLabel: confidenceLabel(safeConfidence),
    status: safeConfidence >= 0.68 ? '已识别' : '待确认',
    evidence: safeText(line).slice(0, 80)
  };
}

function parseScoreTableText(text = '') {
  const raw = String(text || '').replace(/[，,；;]/g, '\n');
  const lines = raw.split(/\r?\n|。/).map((line) => safeText(line)).filter(Boolean);
  const parsedScores = {};
  const namedRanks = [];
  let totalScore = null;
  let totalRank = null;
  let studentName = '';
  let note = '';

  lines.forEach((line, index) => {
    const nameMatch = line.match(/(?:姓名|学生)[:：\s]*([\u4e00-\u9fa5A-Za-z]{2,12})/);
    if (nameMatch && !studentName) studentName = nameMatch[1];

    if (/仅可见|备注|说明/.test(line)) note = note || line;

    if (/总分|总成绩|合计/.test(line)) {
      const scoreMatch = line.match(/(?:总分|总成绩|合计)(?!排名|名次)[^0-9-]*(-?\d+(?:\.\d+)?)/);
      const score = scoreMatch ? Number(scoreMatch[1]) : null;
      if (score !== null) totalScore = score;
      const rank = rankFromLine(line);
      if (rank !== null) totalRank = rank;
      const namedRank = firstNumberAfter(line, '[\\u4e00-\\u9fa5A-Za-z0-9]+总分排名|总排名|班级排名|年级排名');
      if (namedRank !== null) namedRanks.push({ label: line.replace(/\d+(?:\.\d+)?/g, '').slice(0, 18), value: namedRank });
    }

    SUBJECTS.forEach((subject) => {
      if (!subject.aliases.some((alias) => line.indexOf(alias) >= 0)) return;
      const subjectPattern = subject.aliases.map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const explicit = new RegExp(`(?:${subjectPattern})[^0-9-]*(?:分数|成绩|得分)?[^0-9-]*(-?\\d+(?:\\.\\d+)?)`);
      const match = line.match(explicit);
      const score = match ? Number(match[1]) : null;
      if (score === null || score > 200 || score < 0) return;
      const rank = rankFromLine(line);
      const confidence = /分数|成绩|得分|班名|排名|名次/.test(line) ? 0.92 : 0.74 - Math.min(0.12, index * 0.01);
      const next = makeScoreRecord(subject, score, rank, line, confidence);
      const current = parsedScores[subject.label];
      if (!current || next.confidence >= current.confidence) parsedScores[subject.label] = next;
    });
  });

  if (totalScore === null) {
    const total = Object.keys(parsedScores).reduce((sum, key) => sum + Number(parsedScores[key].score || 0), 0);
    totalScore = total > 0 ? Math.round(total * 10) / 10 : null;
  }

  const scoreList = Object.keys(parsedScores).map((key) => parsedScores[key]);
  return {
    studentName,
    parsedScores,
    parsedRanks: {
      totalScore,
      totalRank,
      classRank: totalRank,
      namedRanks,
      note
    },
    requiresConfirmation: scoreList.some((item) => item.status === '待确认') || scoreList.length === 0,
    missingFields: [
      studentName ? '' : '学生姓名',
      scoreList.length ? '' : '学科分数',
      totalRank ? '' : '总排名/班级排名'
    ].filter(Boolean)
  };
}

function normalizeReportSources(input = {}) {
  const sources = asArray(input.reportSources || input.sources);
  const sourceText = safeText(input.sourceText || input.rawText || input.scoreText);
  const result = sources.map((source, index) => ({
    id: source.id || `source_${index + 1}`,
    type: source.type || source.sourceType || 'manual_text',
    label: source.label || source.title || '家长补充资料',
    text: safeText(source.text || source.rawText || source.content),
    confidence: clamp(source.confidence === undefined ? 0.72 : source.confidence, 0.2, 0.98),
    status: source.status || '待家长确认',
    createdAt: source.createdAt || nowIso()
  })).filter((source) => source.text || source.type);

  if (sourceText) {
    result.unshift({
      id: `manual_${Date.now ? Date.now() : 1}`,
      type: 'manual_text',
      label: '家长录入资料',
      text: sourceText,
      confidence: 0.74,
      status: '待家长确认',
      createdAt: nowIso()
    });
  }
  return result.slice(0, 30);
}

function normalizeSignals(input = {}) {
  return Object.keys(input || {}).reduce((acc, key) => {
    const value = input[key];
    if (value !== undefined && value !== null && value !== '') acc[key] = value;
    return acc;
  }, {});
}

function computeCompleteness(parts) {
  let score = 0;
  if (Object.keys(parts.parsedScores || {}).length) score += 30;
  if (Object.keys(parts.profileBasics || {}).length >= 2) score += 18;
  if (Object.keys(parts.behaviorSignals || {}).length) score += 14;
  if (Object.keys(parts.emotionSignals || {}).length) score += 12;
  if (Object.keys(parts.interestSignals || {}).length) score += 8;
  if ((parts.assessmentAnswers || []).length >= 5) score += 14;
  if ((parts.reportSources || []).some((source) => source.type === 'third_party_assessment' || /测评|画像|学习类型|倾向/.test(source.text || ''))) score += 12;
  return clamp(score, Object.keys(parts.parsedScores || {}).length || (parts.reportSources || []).length ? 28 : 0, 100);
}

function missingItems(parts) {
  const missing = [];
  if (!Object.keys(parts.parsedScores || {}).length) missing.push('成绩单或手动分数');
  if (Object.keys(parts.profileBasics || {}).length < 2) missing.push('年级/年龄/学校类型');
  if (!Object.keys(parts.behaviorSignals || {}).length) missing.push('学习时长/睡眠/专注自评');
  if (!Object.keys(parts.emotionSignals || {}).length) missing.push('焦虑度/学习意愿/亲子沟通');
  if (!Object.keys(parts.interestSignals || {}).length) missing.push('兴趣标签/自认为擅长点');
  if (!(parts.assessmentAnswers || []).length) missing.push('快速测评问卷');
  return missing;
}

function inferAnswersFromText(text = '') {
  const value = String(text || '');
  const answers = [];
  const choose = (id, optionId, confidence = 0.34) => answers.push({ id, optionId, confidence, source: 'text_inferred' });
  if (/圈|标|关键词|图|看/.test(value)) choose('start_mode', 'circle');
  if (/听|讲|说|复述/.test(value)) choose('memory_mode', 'say');
  if (/写|动手|演算|练/.test(value)) choose('favorite_task', 'hands_on');
  if (/步骤|关系|公式|结构|提纲/.test(value)) choose('support_preference', 'hint');
  if (/焦虑|担心|紧张|害怕/.test(value)) choose('exam_feeling', 'worry');
  if (/坐不住|分心|拖拉|磨蹭/.test(value)) choose('next_goal', 'focus');
  if (/错题|反复|总错|回看/.test(value)) choose('next_goal', 'review');
  if (/第一步|不会下手|没思路|列式/.test(value)) choose('next_goal', 'first_step');
  return answers;
}

function scoreAssessmentAnswers(answers = [], contextText = '') {
  const scores = { visual: 0, auditory: 0, kinesthetic: 0, reading: 0, structure: 0, focus: 0, persistence: 0, emotion: 0 };
  const evidence = [];
  const allAnswers = answers.length ? answers : inferAnswersFromText(contextText);
  allAnswers.forEach((answer) => {
    const question = QUICK_ASSESSMENT_QUESTIONS.find((item) => item.id === answer.id);
    if (!question) return;
    const option = question.options.find((item) => item.id === answer.optionId || item.id === answer.option);
    if (!option) return;
    Object.keys(option.weights || {}).forEach((key) => {
      scores[key] = Number(scores[key] || 0) + Number(option.weights[key] || 0);
    });
    evidence.push(`${question.prompt}：${option.label}`);
  });
  return { scores, evidence, answered: allAnswers.length, answers: allAnswers };
}

function topSubjects(parsedScores = {}) {
  return Object.keys(parsedScores)
    .map((key) => parsedScores[key])
    .filter((item) => item && Number.isFinite(Number(item.score)))
    .sort((a, b) => Number(b.score) - Number(a.score));
}

function buildTendencies(parts) {
  const text = (parts.reportSources || []).map((source) => source.text).join('\n');
  const scoredAnswers = scoreAssessmentAnswers(parts.assessmentAnswers || [], text);
  const subjects = topSubjects(parts.parsedScores);
  const tendencies = [];

  if (subjects[0]) {
    tendencies.push({
      id: 'subject_strength',
      label: `${subjects[0].subject}当前表现更突出`,
      description: '更容易在这个学科里形成正反馈，可以用来带动待支持学科的方法迁移。',
      evidence: [`${subjects[0].subject} ${subjects[0].score} 分${subjects[0].rank ? ` / 班名 ${subjects[0].rank}` : ''}`],
      confidence: confidenceLabel(subjects[0].confidence || 0.62),
      missing: parts.parsedRanks.totalRank ? [] : ['缺少总排名或年级参照']
    });
  }

  const styleScores = scoredAnswers.scores;
  const style = Object.keys(styleScores).sort((a, b) => styleScores[b] - styleScores[a])[0] || '';
  const styleMap = {
    visual: ['视觉整理倾向', '更适合先圈条件、画关系或用颜色区分信息。'],
    auditory: ['听讲复述倾向', '更适合先说出题意或听一遍关键步骤，再落到书面。'],
    kinesthetic: ['动手试做倾向', '更适合用一小步尝试打开任务，而不是长时间听解释。'],
    reading: ['读写整理倾向', '更适合用提纲、笔记和短句把信息固定下来。'],
    structure: ['结构化拆步倾向', '更适合先拆第一步、再做小变式。'],
    focus: ['短时专注支持倾向', '更适合用 15 分钟小目标启动，而不是一次性要求完成很多。'],
    persistence: ['回访巩固倾向', '更适合第二天轻回看，形成可追踪的复盘证据。'],
    emotion: ['安全沟通支持倾向', '更需要家长先问卡点和第一步，而不是追问结果。']
  };
  if (style && styleScores[style] > 0) {
    const item = styleMap[style] || styleMap.structure;
    tendencies.push({
      id: 'style_tendency',
      label: item[0],
      description: item[1],
      evidence: scoredAnswers.evidence.slice(0, 3),
      confidence: confidenceLabel(Math.min(0.82, 0.45 + scoredAnswers.answered * 0.07)),
      missing: scoredAnswers.answered >= 5 ? [] : ['快速测评题还不完整']
    });
  }

  if (/焦虑|担心|害怕|不愿意谈|紧张/.test(text) || parts.emotionSignals.anxiety) {
    tendencies.push({
      id: 'emotion_support',
      label: '需要先降低沟通压力',
      description: '当前更适合用“你第一步先做什么”这类低压力问题承接，而不是直接追问结果。',
      evidence: [parts.emotionSignals.anxiety ? `焦虑度：${parts.emotionSignals.anxiety}` : '资料中出现担心/紧张相关描述'],
      confidence: confidenceLabel(0.58),
      missing: parts.emotionSignals.willingness ? [] : ['学习意愿量表']
    });
  }

  return tendencies.slice(0, 5);
}

function causeFromSignals(subject, parts, isWeak) {
  const text = (parts.reportSources || []).map((source) => source.text).join('\n');
  if (/不会列式|没思路|第一步|看不懂题|读不懂题/.test(text)) return ['方法匹配度', '需要把题目转成可执行第一步'];
  if (/错题|反复|总错|漏|公式|单位/.test(text)) return ['知识点断层', '需要用错因卡把下次检查点留下来'];
  if (parts.emotionSignals.anxiety || /焦虑|担心|紧张/.test(text)) return ['情绪阻抗', '先降低沟通压力，再安排练习'];
  if (parts.behaviorSignals.focusRating || parts.behaviorSignals.studyMinutes || /分心|坐不住|拖拉|磨蹭/.test(text)) return ['专注/习惯问题', '用短时专注舱绑定一个小目标'];
  if (parts.behaviorSignals.classesCount && Number(parts.behaviorSignals.classesCount) >= 3) return ['负荷过高', '先减少低价值重复，保留最关键练习'];
  return isWeak ? ['方法匹配度', '先用一个具体题型验证第一步'] : ['方法匹配度', '保留当前有效方法并做小迁移'];
}

function buildDiagnosisMatrix(parts) {
  const subjects = topSubjects(parts.parsedScores);
  if (!subjects.length) {
    return [{
      subject: '待确认学科',
      status: '待补充',
      summary: '当前还没有可确认的学科分数，只能先基于家长描述给出快速版方向。',
      mainCause: '信息不足',
      secondaryCause: '建议先补一张成绩单或手动录入单科分',
      evidence: ['成绩单字段缺失'],
      confidence: '低',
      missing: ['学科分数', '排名/趋势']
    }];
  }
  const average = subjects.reduce((sum, item) => sum + Number(item.score || 0), 0) / subjects.length;
  return subjects.map((item) => {
    const delta = Number(item.score || 0) - average;
    const isWeak = delta <= -8;
    const isStrong = delta >= 8;
    const cause = causeFromSignals(item.subject, parts, isWeak);
    return {
      subject: item.subject,
      status: isStrong ? '优势可迁移' : isWeak ? '需要支持' : '相对平衡',
      summary: isStrong
        ? `${item.subject}当前表现高于已录入学科均值，适合作为信心和方法迁移的起点。`
        : isWeak
          ? `${item.subject}当前低于已录入学科均值，先找一个最小卡点，不做泛化结论。`
          : `${item.subject}当前接近已录入学科均值，建议用小题验证具体卡点。`,
      mainCause: cause[0],
      secondaryCause: cause[1],
      evidence: [`${item.subject} ${item.score} 分${item.rank ? ` / 班名 ${item.rank}` : ''}`, `已录入均值约 ${Math.round(average * 10) / 10}`],
      confidence: confidenceLabel(item.confidence || 0.58),
      missing: item.rank ? [] : ['缺少该学科排名或最近 3 次趋势']
    };
  }).slice(0, 8);
}

function buildOverview(parts, tendencies, matrix) {
  const weak = matrix.find((item) => item.status === '需要支持') || matrix[0];
  const strength = matrix.find((item) => item.status === '优势可迁移') || matrix[0];
  const evidence = [];
  if (strength && strength.subject !== '待确认学科') evidence.push(`${strength.subject}：${strength.status}`);
  if (weak && weak.subject !== strength.subject && weak.subject !== '待确认学科') evidence.push(`${weak.subject}：${weak.status}`);
  return {
    title: '学习画像总览',
    line: strength && weak && weak.status === '需要支持'
      ? `当前更像是「${strength.subject}有可迁移方法，${weak.subject}需要第一步支持」的状态。`
      : '当前资料可以先形成一个快速学习画像，重点是把下一步方案落到真实练习里。',
    evidence: evidence.length ? evidence : ['当前资料完整度仍需补充'],
    confidence: confidenceLabel((parts.reportCompleteness || 0) / 100),
    missing: missingItems(parts).slice(0, 3)
  };
}

function buildRecommendationPlan(parts, matrix) {
  const weak = matrix.find((item) => item.status === '需要支持') || matrix[0] || {};
  const primaryModule = weak.mainCause === '专注/习惯问题' ? 'focus'
    : weak.mainCause === '知识点断层' ? 'review'
      : weak.mainCause === '情绪阻抗' ? 'profile'
        : 'tutor';
  const routeMap = {
    tutor: '/pages/tutor/tutor?from=learning_report',
    focus: '/pages/focus/focus?from=learning_report',
    review: '/pages/review/review?from=learning_report',
    arcade: '/pages/arcade/arcade?from=learning_report',
    profile: '/pages/profile/profile?panel=assessment'
  };
  const subject = weak.subject && weak.subject !== '待确认学科' ? weak.subject : '当前卡点';
  const week = [
    { day: 1, minutes: 15, module: primaryModule, task: `只选 ${subject} 的一个题型，让孩子说出第一步。` },
    { day: 2, minutes: 15, module: 'focus', task: '围绕昨天那一句第一步坐一段，结束后留一句证据。' },
    { day: 3, minutes: 15, module: 'review', task: '回看一个错因，不要求多题，只留下下次检查点。' },
    { day: 4, minutes: 10, module: 'arcade', task: '做 3 分钟轻练，把第一步练熟。' },
    { day: 5, minutes: 20, module: primaryModule, task: '换一个小变式，看能否迁移第一步。' },
    { day: 6, minutes: 10, module: 'profile', task: '家长只问一句，把孩子原话记下来。' },
    { day: 7, minutes: 15, module: 'review', task: '上传或录入最新小测，更新学习画像。' }
  ].map((item) => Object.assign({}, item, { path: routeMap[item.module] || routeMap.tutor }));

  return {
    primaryModule,
    cta: {
      label: primaryModule === 'profile' ? '先看家长话术' : primaryModule === 'focus' ? '进入专注舱' : primaryModule === 'review' ? '去修错题卡点' : '用咕点追问第一步',
      path: routeMap[primaryModule] || routeMap.tutor,
      reason: weak.mainCause ? `因为当前主因更像是：${weak.mainCause}` : '因为当前还需要先确认第一步'
    },
    sevenDayPlan: week,
    parentLine: `今晚家长只问一句：${subject}这一步，你先准备看哪里？`,
    childLine: '我先说出第一步，不用一次做完整。',
    evidence: weak.evidence || [],
    confidence: weak.confidence || '低',
    missing: weak.missing || []
  };
}

function buildSolutionMap(parts, matrix, recommendationPlan) {
  const diagnosis = Array.isArray(matrix) ? matrix : [];
  const plan = recommendationPlan || {};
  const primary = diagnosis.find((item) => item.status === '需要支持') || diagnosis[0] || {};
  const cause = primary.mainCause || '信息不足';
  const evidence = Array.isArray(primary.evidence) ? primary.evidence.slice(0, 3) : [];
  const missing = Array.isArray(primary.missing) ? primary.missing.slice(0, 3) : [];
  return {
    targetSubject: primary.subject || '待确认学科',
    rootCause: cause,
    confidence: primary.confidence || '低',
    evidence,
    missing,
    appHandoff: {
      module: plan.primaryModule || 'tutor',
      path: plan.cta && plan.cta.path ? plan.cta.path : '/pages/tutor/tutor?from=learning_report',
      reason: plan.cta && plan.cta.reason ? plan.cta.reason : '先把报告落到一个可执行小动作。'
    },
    parentScript: plan.parentLine || '家长只问一句：这一步你准备先看哪里？',
    childScript: plan.childLine || '我先说出第一步，不用一次做完整。',
    nextEvidenceRequired: [
      'child_first_step',
      cause === '知识点断层' ? 'wrong_cause_card' : 'focus_or_tutor_record',
      'next_day_revisit'
    ],
    reviewTrigger: missing.length
      ? `补充：${missing[0]}`
      : '7 天后上传一次新小测或错题记录，更新画像。'
  };
}

function buildLongTermLearningPortrait(parts = {}, matrix = [], tendencies = []) {
  const diagnosis = Array.isArray(matrix) ? matrix : [];
  const trendItems = Array.isArray(tendencies) ? tendencies : [];
  const weakest = diagnosis.find((item) => item.status === '需要支持') || diagnosis[0] || {};
  const stable = diagnosis.find((item) => item.status === '相对稳定') || diagnosis.find((item) => item.status === '优势') || {};
  const scores = parts.parsedScores || {};
  const subjects = Object.keys(scores);
  const evidenceCount = [
    parts.reportSources && parts.reportSources.length,
    subjects.length,
    parts.assessmentAnswers && parts.assessmentAnswers.length,
    parts.behaviorSignals && Object.keys(parts.behaviorSignals).length,
    parts.emotionSignals && Object.keys(parts.emotionSignals).length
  ].reduce((sum, item) => sum + Number(item || 0), 0);
  const stability = evidenceCount >= 18 ? 'high' : evidenceCount >= 8 ? 'medium' : 'low';
  const nextEvidence = [];
  if (!subjects.length) nextEvidence.push('补一份最近成绩或错题');
  if (!parts.assessmentAnswers || parts.assessmentAnswers.length < 8) nextEvidence.push('补完 8 个快速画像问题');
  if (!parts.behaviorSignals || !Object.keys(parts.behaviorSignals).length) nextEvidence.push('补一次孩子真实做题过程');
  if (!nextEvidence.length) nextEvidence.push('7 天后用新错题更新画像');
  const subjectName = weakest.subject || stable.subject || '当前学科';
  const causeName = weakest.mainCause || '第一步不清';
  [
    `${subjectName} 同题型第一步回执`,
    `${causeName} 是否连续出现两次`,
    '家长是否只问一句而不代讲'
  ].forEach((item) => {
    if (!nextEvidence.includes(item)) nextEvidence.push(item);
  });

  return {
    title: '长期学习画像',
    stability,
    stabilityLine: stability === 'high'
      ? '资料足够形成阶段性判断，但仍要用下一次错题验证。'
      : stability === 'medium'
        ? '已能判断主要卡点，长期趋势还需要连续 7 天证据。'
        : '当前只是快速画像，不能当作定论。',
    learnerPattern: weakest.mainCause
      ? `当前最需要观察的是：${weakest.subject || '当前学科'} 的 ${weakest.mainCause}。`
      : '先观察孩子能否说出第一步，再判断长期模式。',
    stableStrength: stable.subject
      ? `${stable.subject} 暂时可作为信心入口，不急着加难度。`
      : '还没有稳定强项，先从最小可完成动作建立信心。',
    riskWatch: weakest.secondaryCause
      ? `连续两次出现 ${weakest.secondaryCause} 时，需要降低题量，改成一步追问。`
      : '如果孩子开始沉默或只要答案，立刻退回第一步小黑板。',
    portraitDimensions: [
      {
        id: 'first_step_agency',
        label: '第一步自主性',
        signal: `${subjectName} 是否能先说出可执行小动作`,
        evidence: 'child_first_step',
        nextIntervention: '说不出时只给二选一，不讲完整答案'
      },
      {
        id: 'wrong_cause_stability',
        label: '错因稳定性',
        signal: `${causeName} 是否跨两次同类题重复`,
        evidence: 'wrong_cause_card',
        nextIntervention: '重复两次就降题量，先修错因'
      },
      {
        id: 'transfer_resilience',
        label: '迁移韧性',
        signal: '换一题后是否还能复述同一第一步',
        evidence: 'next_day_revisit',
        nextIntervention: '能迁移再加变式，不能迁移回小黑板'
      },
      {
        id: 'parent_scaffold_load',
        label: '家长脚手架负荷',
        signal: '家长是否需要反复解释才能启动',
        evidence: 'parent_prompt_count',
        nextIntervention: '家长只保留一句追问，减少讲解'
      }
    ],
    trajectoryFlags: [
      stability === 'high' ? '画像稳定：可以看 7 天趋势，不按单题波动调整。' : '画像未稳：先收集连续证据，不急着定性。',
      weakest.mainCause ? `主风险：${weakest.mainCause} 如果连续出现，需要先降题量。` : '主风险待确认：先观察第一步质量。',
      stable.subject ? `可利用强项：从 ${stable.subject} 建立信心入口。` : '强项待确认：先记录孩子完成感。'
    ],
    evidenceConfidenceRubric: [
      '1 条证据：只能做今晚建议',
      '3 条同类证据：可以判断短期卡点',
      '7 天证据：才进入长期画像调整'
    ],
    evidenceToCollect: nextEvidence.slice(0, 5),
    trendLines: trendItems.slice(0, 3).map((item) => `${item.label}: ${item.description}`),
    observationLoop: [
      '当天：只记录孩子第一步',
      '次日：回访同题型是否还能说出第一步',
      '第 7 天：用新错题确认是否迁移'
    ],
    parentDecisionRule: '连续两次能说清第一步才加题量；连续两次沉默就降到小黑板。',
    nextReviewCadence: '每 7 天更新一次，不按单次分数下结论。',
    nextTeacherConference: `如果要和老师沟通，只带三样：${subjectName} 第一脚证据、${causeName} 重复次数、7 天回访结果。`
  };
}

function buildClassroomDecisionBoard(parts = {}, matrix = [], recommendationPlan = {}, solutionMap = {}) {
  const diagnosis = Array.isArray(matrix) ? matrix : [];
  const primary = diagnosis.find((item) => item.status === '需要支持') || diagnosis[0] || {};
  const plan = recommendationPlan || {};
  const solution = solutionMap || {};
  const cause = primary.mainCause || solution.rootCause || '第一步不清';
  const subject = primary.subject || solution.targetSubject || '当前学科';
  return {
    title: '课堂级决策板',
    decisionLine: `${subject} 暂不加题量，先处理 ${cause}。`,
    teacherLens: '像老师备课一样看：先找一个可观察动作，而不是直接看对错率。',
    parentLens: solution.parentScript || plan.parentLine || '家长今晚只问一句：这一步你准备先看哪里？',
    classLikeObservation: [
      `观察点：${subject} 能否独立说出第一步`,
      `干预点：${cause} 出现时立刻退回小黑板`,
      '复核点：第二天同类题能否迁移'
    ],
    observationRubric: [
      {
        id: 'observe',
        label: '观察',
        metric: '启动时间',
        rule: `孩子看到 ${subject} 同类题，30 秒内能否说出第一步`,
        evidence: 'child_first_step'
      },
      {
        id: 'intervene',
        label: '干预',
        metric: '提示强度',
        rule: `${cause} 出现时，只给第一步小黑板或二选一`,
        evidence: 'hint_level'
      },
      {
        id: 'review',
        label: '复核',
        metric: '迁移结果',
        rule: '第二天换题，仍看能否复述同一小动作',
        evidence: 'next_day_revisit'
      }
    ],
    interventionLadder: [
      { level: 1, label: '独立说第一步', action: '不讲答案，只让孩子说出下一笔' },
      { level: 2, label: '二选一启动', action: '给两个可能入口，让孩子选一个并说明理由' },
      { level: 3, label: '小黑板降阶', action: '只画关系或条件，不推完整解法' },
      { level: 4, label: '减少题量', action: '同错因重复时停刷题，改成 3 分钟轻练习' }
    ],
    classroomEvidencePacket: [
      `${subject} 第一脚记录`,
      `${cause} 重复次数`,
      '同类题次日回访',
      '家长是否只问一句'
    ],
    intervention: plan.cta && plan.cta.label
      ? `${plan.cta.label}: ${plan.cta.reason || '把报告落到一个小动作'}`
      : '先用点拨页让孩子说出第一步。',
    evidenceRule: Array.isArray(solution.nextEvidenceRequired) && solution.nextEvidenceRequired.length
      ? solution.nextEvidenceRequired.join(' / ')
      : 'child_first_step / wrong_cause_card / next_day_revisit',
    stopRule: '如果连续两次答不上来，不继续讲答案，改用小黑板画第一步。',
    escalationRule: '如果 7 天内同一错因出现 3 次，先减少题量，改成 3 分钟轻练习和一次家长复盘。',
    successRule: '如果连续 2 天能独立说出第一步，再进入变式练习，不提前加难题。',
    classroomCadence: '当天观察启动，次日复核迁移，第 7 天决定加题量还是降阶。',
    nextConferenceQuestion: `下次复盘只问：${subject} 这类题，孩子能否自己说出第一步？`,
    shareableSummary: `${subject} 的下一次干预重点是 ${cause}，用 7 天证据复核，不按一次表现定性。`
  };
}

function buildFamilyDecisionMemo(parts = {}, matrix = [], recommendationPlan = {}, solutionMap = {}, portrait = {}, classroom = {}) {
  const diagnosis = Array.isArray(matrix) ? matrix : [];
  const primary = diagnosis.find((item) => item.status === '需要支持') || diagnosis[0] || {};
  const plan = recommendationPlan || {};
  const solution = solutionMap || {};
  const subject = primary.subject || solution.targetSubject || '当前学科';
  const cause = primary.mainCause || solution.rootCause || '第一步不清';
  const evidence = Array.isArray(solution.nextEvidenceRequired) && solution.nextEvidenceRequired.length
    ? solution.nextEvidenceRequired
    : ['child_first_step', 'wrong_cause_card', 'next_day_revisit'];
  const portraitEvidence = Array.isArray(portrait.evidenceToCollect) ? portrait.evidenceToCollect.slice(0, 3) : [];
  return {
    title: '家庭决策书',
    tonightDecision: `${subject} 今晚不加题量，先处理「${cause}」。`,
    doNotDo: [
      '不按一次分数给孩子定性',
      '不直接讲完整答案',
      '不把薄弱学科一次性铺开'
    ],
    evidenceChecklist: [
      `孩子能否说出 ${subject} 的第一步`,
      `错因是否写成一张可回访卡`,
      `明天是否还能复述同一小步`
    ].concat(portraitEvidence).slice(0, 6),
    parentMeetingScript: [
      solution.parentScript || plan.parentLine || '家长只问：这一步你准备先看哪里？',
      classroom.nextConferenceQuestion || `下次复盘只问：${subject} 这类题，孩子能否自己说出第一步？`,
      portrait.parentDecisionRule || '连续两次能说清第一步才加题量。'
    ],
    decisionCard: {
      subject,
      cause,
      tonight: `今晚只处理 ${cause} 的第一步，不扩题量。`,
      tomorrow: '明天换一题回访，看是否能迁移。',
      shareTitle: `${subject} 7 天家庭学习决策`,
      shareSummary: `${cause} 先用第一步证据复核，不用一次分数定性。`
    },
    weeklyReviewAgenda: [
      '本周哪两次孩子能自己启动？',
      `哪一次 ${cause} 重复出现？`,
      '家长有没有忍住不讲完整答案？',
      '下周是加一点变式，还是继续降阶？'
    ],
    parentActionLadder: [
      { level: 1, label: '只问一句', action: solution.parentScript || plan.parentLine || '这一步你准备先看哪里？' },
      { level: 2, label: '给二选一', action: '让孩子在两个入口里选一个' },
      { level: 3, label: '停讲答案', action: '退回小黑板，保留孩子自己的第一笔' }
    ],
    sevenDayDecisionGate: {
      continueRule: '连续 2 天能独立说出第一步，才进入变式练习。',
      reduceRule: '连续 2 次沉默或同错因重复，减少题量，退回第一步小黑板。',
      evidenceRule: evidence.join(' / ')
    },
    shareLine: `${subject} 家庭决策：先看 ${cause}，7 天后用证据复核。`,
    route: plan.cta && plan.cta.path ? plan.cta.path : '/pages/tutor/tutor?from=family_decision_memo'
  };
}

function buildPortraitConfidenceSystem(parts = {}, matrix = [], portrait = {}, classroom = {}, familyDecision = {}) {
  const diagnosis = Array.isArray(matrix) ? matrix : [];
  const subjects = Object.keys(parts.parsedScores || {});
  const assessmentCount = Array.isArray(parts.assessmentAnswers) ? parts.assessmentAnswers.length : 0;
  const sourceCount = Array.isArray(parts.reportSources) ? parts.reportSources.length : 0;
  const behaviorCount = parts.behaviorSignals ? Object.keys(parts.behaviorSignals).length : 0;
  const emotionCount = parts.emotionSignals ? Object.keys(parts.emotionSignals).length : 0;
  const evidenceScore = subjects.length * 10 + Math.min(assessmentCount, 15) * 3 + sourceCount * 8 + behaviorCount * 5 + emotionCount * 4;
  const confidenceLevel = evidenceScore >= 120 ? 'high' : evidenceScore >= 70 ? 'medium' : 'low';
  const primary = diagnosis.find((item) => String(item.status || '').indexOf('\u652f\u6301') >= 0) || diagnosis[0] || {};
  const subject = primary.subject || '\u5f53\u524d\u5b66\u79d1';
  const cause = primary.mainCause || '\u7b2c\u4e00\u6b65\u4e0d\u6e05';
  const readyCount = [subjects.length >= 3, assessmentCount >= 8, behaviorCount >= 2].filter(Boolean).length;
  const evidenceLedger = [
    { id: 'score_or_task', label: '\u6210\u7ee9/\u4efb\u52a1\u8bc1\u636e', status: subjects.length >= 3 ? 'ready' : 'weak', proof: subjects.length ? `${subjects.length} \u4e2a\u5b66\u79d1\u5df2\u8bb0\u5f55` : '\u7f3a\u5c11\u53ef\u786e\u8ba4\u5b66\u79d1\u8bb0\u5f55' },
    { id: 'assessment', label: '\u753b\u50cf\u95ee\u5377', status: assessmentCount >= 8 ? 'ready' : 'weak', proof: `${assessmentCount}/15 \u4e2a\u95ee\u9898\u5df2\u8bb0\u5f55` },
    { id: 'behavior', label: '\u505a\u9898\u8fc7\u7a0b', status: behaviorCount >= 2 ? 'ready' : 'weak', proof: behaviorCount ? `${behaviorCount} \u7c7b\u884c\u4e3a\u4fe1\u53f7` : '\u7f3a\u5c11\u771f\u5b9e\u505a\u9898\u8fc7\u7a0b' },
    { id: 'next_day', label: '\u9694\u5929\u56de\u8bbf', status: portrait.nextReviewCadence ? 'pending' : 'missing', proof: portrait.nextReviewCadence || '\u9700\u8981\u660e\u5929\u56de\u8bbf\u9a8c\u8bc1' }
  ];
  return {
    id: 'portrait_confidence_system',
    title: '\u957f\u671f\u753b\u50cf\u53ef\u4fe1\u5ea6\u8d26\u672c',
    confidenceLevel,
    evidenceScore,
    summary: confidenceLevel === 'high'
      ? '\u5f53\u524d\u8bc1\u636e\u8db3\u591f\u5f62\u6210\u9636\u6bb5\u5224\u65ad\uff0c\u4f46\u4ecd\u6309 7 \u5929\u56de\u8bbf\u66f4\u65b0\uff0c\u4e0d\u6309\u5355\u6b21\u5206\u6570\u5b9a\u6027\u3002'
      : confidenceLevel === 'medium'
        ? '\u5f53\u524d\u53ef\u4ee5\u6307\u5bfc\u4eca\u665a\u884c\u52a8\uff0c\u4f46\u957f\u671f\u753b\u50cf\u8fd8\u9700\u8981\u9694\u5929\u548c\u7b2c 7 \u5929\u8bc1\u636e\u786e\u8ba4\u3002'
        : '\u5f53\u524d\u53ea\u80fd\u4f5c\u4e3a\u5feb\u901f\u5efa\u8bae\uff0c\u4e0d\u80fd\u5f53\u4f5c\u957f\u671f\u7ed3\u8bba\u3002',
    evidenceLedger,
    decisionThresholds: [
      { id: 'act_tonight', label: '\u4eca\u665a\u53ef\u884c\u52a8', rule: '\u6709\u4e00\u4e2a\u660e\u786e\u5361\u70b9\u548c\u4e00\u4e2a\u53ef\u6267\u884c\u7b2c\u4e00\u6b65\u5373\u53ef\u884c\u52a8\u3002', met: !!primary.mainCause },
      { id: 'update_portrait', label: '\u66f4\u65b0\u753b\u50cf', rule: '\u81f3\u5c11 3 \u7c7b\u8bc1\u636e\u540c\u65f6\u6307\u5411\u540c\u4e00\u9519\u56e0\uff0c\u624d\u66f4\u65b0\u957f\u671f\u753b\u50cf\u3002', met: readyCount >= 3 },
      { id: 'increase_load', label: '\u589e\u52a0\u9898\u91cf', rule: '\u8fde\u7eed 2 \u5929\u80fd\u72ec\u7acb\u8bf4\u51fa\u7b2c\u4e00\u6b65\uff0c\u624d\u589e\u52a0\u53d8\u5f0f\u6216\u9898\u91cf\u3002', met: false },
      { id: 'reduce_load', label: '\u964d\u7ea7\u5904\u7406', rule: '\u540c\u4e00\u9519\u56e0\u8fde\u7eed 2 \u6b21\u5931\u8d25\uff0c\u7acb\u5373\u964d\u5230\u5c0f\u9ed1\u677f\u548c\u9519\u56e0\u5361\u3002', met: String(primary.status || '').indexOf('\u652f\u6301') >= 0 }
    ],
    observationCadence: [
      { day: '\u4eca\u665a', check: `${subject} \u662f\u5426\u80fd\u8bf4\u51fa\u7b2c\u4e00\u6b65`, action: '\u53ea\u8bb0\u5f55\u5b69\u5b50\u539f\u8bdd\uff0c\u4e0d\u8bb2\u5b8c\u6574\u7b54\u6848\u3002' },
      { day: '\u660e\u5929', check: `${cause} \u662f\u5426\u8fd8\u80fd\u590d\u8ff0`, action: '\u6362\u4e00\u5f20\u540c\u7c7b\u5361\u56de\u8bbf\u3002' },
      { day: '\u7b2c 3 \u5929', check: '\u80fd\u5426\u505a\u8fd1\u8fc1\u79fb', action: '\u6362\u4e00\u4e2a\u5c0f\u6761\u4ef6\uff0c\u4e0d\u52a0\u96be\u5ea6\u3002' },
      { day: '\u7b2c 7 \u5929', check: '\u662f\u5426\u8fdb\u5165\u957f\u671f\u753b\u50cf', action: '\u7528\u65b0\u9519\u9898/\u5c0f\u6d4b\u590d\u6838\u7ed3\u8bba\u3002' }
    ],
    parentTrustContract: {
      line: '\u62a5\u544a\u53ea\u7ed9\u5bb6\u5ead\u884c\u52a8\u5efa\u8bae\uff0c\u4e0d\u628a\u5b69\u5b50\u8d34\u6807\u7b7e\u3002',
      doNotShow: ['\u5b8c\u6574\u5bf9\u8bdd', '\u539f\u59cb\u7167\u7247', '\u6392\u540d\u523a\u6fc0', '\u5355\u6b21\u5206\u6570\u5b9a\u6027'],
      shareLine: '\u53ef\u5206\u4eab\u7684\u53ea\u6709\u884c\u52a8\u5efa\u8bae\u3001\u56de\u8bbf\u65f6\u95f4\u548c\u8bc1\u636e\u7f3a\u53e3\u3002'
    },
    escalationRule: classroom.escalationRule || '7 \u5929\u5185\u540c\u4e00\u9519\u56e0\u51fa\u73b0 3 \u6b21\uff0c\u5148\u964d\u9898\u91cf\uff0c\u518d\u56de\u5c0f\u9ed1\u677f\u3002',
    familyDecisionLine: familyDecision.tonightDecision || `\u4eca\u665a\u53ea\u5904\u7406 ${subject} \u7684 ${cause}\u3002`,
    evidenceRequired: ['evidence_ledger', 'decision_thresholds', 'observation_cadence', 'parent_trust_contract']
  };
}

function buildParentDecisionTrustSystem(parts = {}, matrix = [], portraitConfidence = {}, familyDecision = {}, classroom = {}) {
  const diagnosis = Array.isArray(matrix) ? matrix : [];
  const primary = diagnosis.find((item) => String(item.status || '').indexOf('\u652f\u6301') >= 0) || diagnosis[0] || {};
  const subject = primary.subject || '\u5f53\u524d\u5b66\u79d1';
  const cause = primary.mainCause || '\u7b2c\u4e00\u6b65\u4e0d\u6e05';
  const ledger = Array.isArray(portraitConfidence.evidenceLedger) ? portraitConfidence.evidenceLedger : [];
  const thresholds = Array.isArray(portraitConfidence.decisionThresholds) ? portraitConfidence.decisionThresholds : [];
  const readyEvidence = ledger.filter((item) => item.status === 'ready').length;
  const weakEvidence = ledger.filter((item) => item.status === 'weak' || item.status === 'missing').length;
  const metThresholds = thresholds.filter((item) => item.met).length;
  const score = Math.max(0, Math.min(100, readyEvidence * 22 + metThresholds * 12 - weakEvidence * 8));
  const level = score >= 72 ? 'can_decide' : score >= 44 ? 'observe_first' : 'collect_evidence';
  const decisionLine = level === 'can_decide'
    ? `今晚可以围绕 ${subject} 的 ${cause} 做一次低压干预，但 7 天内仍需复核。`
    : level === 'observe_first'
      ? `今晚只做 ${subject} 的第一步观察，不升级题量，也不改长期判断。`
      : `当前证据不足，只能收集 ${subject} 的第一步和错因证据。`;
  return {
    id: 'parent_decision_trust_system',
    title: '家长决策可信度系统',
    level,
    score,
    decisionLine,
    decisionDeck: [
      {
        id: 'tonight',
        label: '今晚能不能行动',
        verdict: level === 'collect_evidence' ? '先收证据' : '可以做一个小动作',
        action: familyDecision.tonightDecision || `只处理 ${subject} 的 ${cause}，不加题量。`,
        evidence: 'child_first_step'
      },
      {
        id: 'portrait',
        label: '能不能更新长期画像',
        verdict: metThresholds >= 2 ? '可临时更新' : '先不要定性',
        action: '至少等到明天回访和第 7 天复核后再写入长期画像。',
        evidence: 'next_day_revisit / day7_review'
      },
      {
        id: 'load',
        label: '能不能增加难度',
        verdict: '暂不增加',
        action: '连续两天能独立说出第一步后，才增加近迁移或题量。',
        evidence: 'two_day_first_step_stable'
      },
      {
        id: 'help',
        label: '什么时候需要家长介入',
        verdict: String(primary.status || '').indexOf('\u652f\u6301') >= 0 ? '需要低压介入' : '先观察',
        action: classroom.stopRule || '连续两次说不出第一步，就退回小黑板，不继续讲答案。',
        evidence: 'repeated_wrong_cause'
      }
    ],
    guardrails: [
      '不按一次分数给孩子贴标签。',
      '不把完整对话、原始照片、排名或隐私评论放进分享卡。',
      '不因为报告很完整就直接加题量。',
      '不把 AI 建议当成老师结论，只当今晚行动参考。'
    ],
    evidenceGaps: ledger
      .filter((item) => item.status !== 'ready')
      .map((item) => `${item.label}：${item.proof}`)
      .slice(0, 4),
    weeklyDecisionReview: [
      { day: '今晚', check: '孩子是否能说出第一步', action: '只问一句，不讲完整答案。' },
      { day: '明天', check: `${cause} 是否复现`, action: '换一张同类卡回访。' },
      { day: '第 3 天', check: '能不能做近迁移', action: '只换一个条件，不增加难度。' },
      { day: '第 7 天', check: '证据是否足够稳定', action: '再决定进入长期画像、继续观察或降级。' }
    ],
    shareBoundary: '分享只带行动建议、证据缺口和回访时间，不带原题、答案、分数、排名和完整对话。',
    route: familyDecision.route || '/pages/profile/profile?from=parent_decision_trust'
  };
}

function buildSocraticMemoryReportBridge(input = {}, parentDecisionTrust = {}, portraitConfidence = {}) {
  const gameEvidence = input.gameEvidence || {};
  const highFrequencyLoop = input.highFrequencyPracticeLoop || gameEvidence.highFrequencyPracticeLoop || {};
  const bridge = input.socraticQualityMemoryBridge || highFrequencyLoop.socraticQualityMemoryBridge || {};
  const actions = Array.isArray(bridge.memoryActions) ? bridge.memoryActions : [];
  const scenarioCount = Number(bridge.scenarioCount || 0);
  const evidenceRequired = Array.isArray(bridge.evidenceRequired) ? bridge.evidenceRequired : [];
  const trustDeck = Array.isArray(parentDecisionTrust.decisionDeck) ? parentDecisionTrust.decisionDeck : [];
  const confidenceLedger = Array.isArray(portraitConfidence.evidenceLedger) ? portraitConfidence.evidenceLedger : [];
  const hasLiveBridge = scenarioCount > 0 && actions.length > 0;
  const readyEvidence = confidenceLedger.filter((item) => item.status === 'ready').length;
  const canUpdatePortrait = hasLiveBridge && readyEvidence >= 2 && trustDeck.some((item) => item.id === 'portrait' && String(item.verdict || '').indexOf('先不要') < 0);
  const primaryAction = actions.find((item) => item.id === 'wrong_axis') || actions[0] || {};
  return {
    id: 'socratic_memory_report_bridge',
    title: '点拨质量到长期画像',
    status: hasLiveBridge ? 'ready' : 'waiting_game_evidence',
    scenarioCount,
    actionCount: actions.length,
    summary: hasLiveBridge
      ? `已有 ${scenarioCount} 个点拨质量场景接入游戏复习，家长报告可以用它判断是否继续观察、降级或进入长期画像。`
      : '还缺一次带点拨质量证据的游戏复习，暂不把单次表现写入长期画像。',
    primaryActionLine: primaryAction.title
      ? `${primaryAction.title}：${primaryAction.memoryAction}`
      : '先完成一次点拨后的高频回忆，再进入家长报告判断。',
    reportDecisionLine: canUpdatePortrait
      ? '可临时更新长期画像，但仍需明天和第 7 天复核。'
      : '暂不更新长期画像，只把今晚动作写入观察记录。',
    noIncreaseRule: bridge.xpGate || '没有第一步、错因回放或次日回访证据，不增加题量。',
    parentProofLine: bridge.parentLine || '家长只看孩子是否说出第一步、是否完成回访。',
    shareBoundary: bridge.privacyBoundary || '不带原题照片、完整对话、分数、排名、私密评价或原始答案。',
    reportActions: actions.slice(0, 4).map((item) => ({
      id: item.id,
      label: item.title,
      action: item.memoryAction,
      evidence: item.evidence,
      route: item.route || '/pages/review/review'
    })),
    evidenceRequired: ['socratic_quality_memory_bridge', 'parent_decision_trust', 'portrait_confidence_ledger'].concat(evidenceRequired).slice(0, 8)
  };
}

function buildQuestionBankDecisionBridge(input = {}, parentDecisionTrust = {}, portraitConfidence = {}) {
  const gameEvidence = input.gameEvidence || {};
  const highFrequencyLoop = input.highFrequencyPracticeLoop || gameEvidence.highFrequencyPracticeLoop || {};
  const bridge = input.questionBankMemoryBridge || highFrequencyLoop.questionBankMemoryBridge || {};
  const activeDeck = Array.isArray(bridge.activeDeck) ? bridge.activeDeck : [];
  const reviewWindows = Array.isArray(bridge.reviewWindows) ? bridge.reviewWindows : [];
  const questionCardCount = Number(bridge.questionCardCount || 0);
  const trustScore = Number(parentDecisionTrust.score || 0);
  const confidenceScore = Number(portraitConfidence.evidenceScore || 0);
  const canUseForDecision = bridge.status === 'ready' && activeDeck.length >= 3 && trustScore >= 45;
  return {
    id: 'question_bank_decision_bridge',
    title: '题型题库到家长决策',
    status: bridge.status || 'waiting_question_bank',
    questionCardCount,
    activeCardCount: Number(bridge.activeCardCount || activeDeck.length || 0),
    masteryGateCount: Number(bridge.masteryGateCount || 0),
    progressionStageCount: Number(bridge.progressionStageCount || 0),
    summary: canUseForDecision
      ? `题库已有 ${questionCardCount} 张题型卡，当前 ${activeDeck.length} 张进入高频记忆训练；家长可以按掌握门槛安排明天回访。`
      : '题型题库证据还不足，报告只能给今晚观察建议，不升级长期画像。',
    decisionLine: canUseForDecision
      ? '今晚只追一个题型掌握门槛；明天回访通过后，再决定是否进入长期画像。'
      : '先补足第一步、错因复述和次日回访证据，再做长期判断。',
    parentActionLine: bridge.parentDecisionLine || '家长只看题型掌握门槛、错因是否复现和明天回访，不看分数排行。',
    xpGate: bridge.xpGate || '只刷数量不加分，必须留下第一步和回访证据。',
    reportLine: bridge.reportLine || '',
    privacyBoundary: bridge.privacyBoundary || '不分享原题照片、完整答案、分数、排名和孩子私密评价。',
    activeDeck: activeDeck.slice(0, 4).map((item) => ({
      id: item.id,
      label: item.label,
      firstStep: item.firstStep,
      masteryGate: item.masteryGate,
      parentCheck: item.parentCheck,
      nextDayRevisit: item.nextDayRevisit
    })),
    reviewWindows,
    evidenceRequired: ['question_bank_memory_bridge', 'mastery_gate', 'parent_decision_trust', 'portrait_confidence'].concat(Array.isArray(bridge.evidenceRequired) ? bridge.evidenceRequired : []).slice(0, 9),
    confidenceLine: `家长决策可信分 ${trustScore}，画像证据分 ${confidenceScore}；不足时只做观察，不做结论。`
  };
}

function buildLearningReportDraft(input = {}) {
  const sources = normalizeReportSources(input);
  const allText = [input.sourceText || '', input.scoreText || ''].concat(sources.map((source) => source.text || '')).join('\n');
  const parsed = parseScoreTableText(allText);
  const profileBasics = normalizeSignals(input.profileBasics || input.basics || {});
  const behaviorSignals = normalizeSignals(input.behaviorSignals || {});
  const emotionSignals = normalizeSignals(input.emotionSignals || {});
  const interestSignals = normalizeSignals(input.interestSignals || {});
  const explicitAnswers = asArray(input.assessmentAnswers || []);
  const assessmentAnswers = explicitAnswers.length ? explicitAnswers : inferAnswersFromText(allText);
  const seedParts = {
    reportSources: sources,
    parsedScores: Object.assign({}, parsed.parsedScores, input.parsedScores || {}),
    parsedRanks: Object.assign({}, parsed.parsedRanks, input.parsedRanks || {}),
    profileBasics,
    behaviorSignals,
    emotionSignals,
    interestSignals,
    assessmentAnswers
  };
  const completeness = computeCompleteness(seedParts);
  const parts = Object.assign({}, seedParts, {
    reportCompleteness: completeness
  });
  const mode = input.mode || (completeness >= 80 ? 'full' : completeness >= 45 ? 'standard' : 'fast');
  const capabilityTendencies = buildTendencies(parts);
  const diagnosisMatrix = buildDiagnosisMatrix(parts);
  const overview = buildOverview(parts, capabilityTendencies, diagnosisMatrix);
  const recommendationPlan = buildRecommendationPlan(parts, diagnosisMatrix);
  const solutionMap = buildSolutionMap(parts, diagnosisMatrix, recommendationPlan);
  const longTermPortrait = buildLongTermLearningPortrait(parts, diagnosisMatrix, capabilityTendencies);
  const classroomDecisionBoard = buildClassroomDecisionBoard(parts, diagnosisMatrix, recommendationPlan, solutionMap);
  const familyDecisionMemo = buildFamilyDecisionMemo(parts, diagnosisMatrix, recommendationPlan, solutionMap, longTermPortrait, classroomDecisionBoard);
  const portraitConfidenceSystem = buildPortraitConfidenceSystem(parts, diagnosisMatrix, longTermPortrait, classroomDecisionBoard, familyDecisionMemo);
  const parentDecisionTrustSystem = buildParentDecisionTrustSystem(parts, diagnosisMatrix, portraitConfidenceSystem, familyDecisionMemo, classroomDecisionBoard);
  const socraticMemoryReportBridge = buildSocraticMemoryReportBridge(input, parentDecisionTrustSystem, portraitConfidenceSystem);
  const questionBankDecisionBridge = buildQuestionBankDecisionBridge(input, parentDecisionTrustSystem, portraitConfidenceSystem);
  const missing = missingItems(parts);
  const reportDraft = {
    id: input.id || `learning_report_${String(nowIso(input.now)).slice(0, 10).replace(/-/g, '')}`,
    title: mode === 'fast' ? '快速版学习画像' : mode === 'standard' ? '标准版学习画像' : '完整版学习画像',
    mode,
    overview,
    capabilityTendencies,
    diagnosisMatrix,
    learningStyle: capabilityTendencies.find((item) => item.id === 'style_tendency') || {
      id: 'style_tendency',
      label: '学习风格待确认',
      description: '需要快速测评或更多学习行为记录来判断倾向。',
      evidence: [],
      confidence: '低',
      missing: ['快速测评问卷']
    },
    rootCauses: diagnosisMatrix.map((item) => ({
      subject: item.subject,
      mainCause: item.mainCause,
      secondaryCause: item.secondaryCause,
      evidence: item.evidence,
      confidence: item.confidence,
      missing: item.missing
    })),
    recommendationPlan,
    solutionMap,
    longTermPortrait,
    classroomDecisionBoard,
    familyDecisionMemo,
    portraitConfidenceSystem,
    parentDecisionTrustSystem,
    socraticMemoryReportBridge,
    questionBankDecisionBridge,
    generatedAt: nowIso(input.now),
    missingItems: missing,
    sourceIntegrity: {
      requiresConfirmation: parsed.requiresConfirmation,
      missingFields: parsed.missingFields
    }
  };

  return {
    reportDraft,
    reportSources: sources,
    reportProgress: {
      mode,
      completeness,
      label: `${completeness}% · ${mode === 'fast' ? '快速版' : mode === 'standard' ? '标准版' : '完整版'}`,
      nextAction: missing[0] ? `补充：${missing[0]}` : '可以进入 7 天方案'
    },
    parsedScores: parts.parsedScores,
    parsedRanks: parts.parsedRanks,
    profileBasics,
    behaviorSignals,
    emotionSignals,
    interestSignals,
    assessmentAnswers,
    capabilityTendencies,
    diagnosisMatrix,
    recommendationPlan,
    solutionMap,
    longTermPortrait,
    classroomDecisionBoard,
    familyDecisionMemo,
    portraitConfidenceSystem,
    parentDecisionTrustSystem,
    socraticMemoryReportBridge,
    questionBankDecisionBridge,
    reportCompleteness: completeness,
    reportStatus: {
      state: completeness >= 30 ? 'ready' : 'draft',
      label: completeness >= 80 ? '资料较完整' : completeness >= 45 ? '可生成标准版' : '可生成快速版',
      requiresConfirmation: parsed.requiresConfirmation
    },
    lastSavedAt: nowIso(input.now)
  };
}

function buildQuickAssessmentQuestions() {
  return QUICK_ASSESSMENT_QUESTIONS.map((question, index) => Object.assign({ order: index + 1 }, question));
}

module.exports = {
  SUBJECTS,
  QUICK_ASSESSMENT_QUESTIONS,
  buildQuickAssessmentQuestions,
  parseScoreTableText,
  scoreAssessmentAnswers,
  buildLearningReportDraft,
  buildLongTermLearningPortrait,
  buildClassroomDecisionBoard,
  buildPortraitConfidenceSystem,
  buildParentDecisionTrustSystem,
  buildSocraticMemoryReportBridge,
  buildQuestionBankDecisionBridge,
  normalizeReportSources,
  confidenceLabel
};
