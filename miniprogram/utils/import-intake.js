const IMPORT_CHIPS = [
  { id: 'read_question', label: '我读不懂题', text: '我读不懂题。题目是：' },
  { id: 'write_equation', label: '我不会列式', text: '我不会列式。题目是：' },
  { id: 'review_this', label: '我想复习这个', text: '我想复习这个：' },
  { id: 'similar_practice', label: '我想做同类题', text: '我想做同类题：' }
];

const INTAKE_SOURCE_SCHEMAS = [
  {
    id: 'parent_report',
    label: '家长报告',
    match: /家长|家庭|复盘|观察|情绪|拖拉|沟通|作业习惯|专注|睡眠|兴趣/,
    localFields: ['home_observation', 'parent_goal', 'homework_context', 'next_action'],
    evidenceGap: ['孩子自己的第一步', '明天回访结果'],
    reportUse: '进入家庭决策书：先判断今晚怎么问、明天怎么回访。',
    aiAllowed: ['家长可读摘要', '低压沟通话术'],
    aiBlocked: ['亲子关系定性', '孩子能力定性', '家长责任归因']
  },
  {
    id: 'talent_assessment',
    label: '天赋/学习偏好测评',
    match: /天赋|测评|学习类型|学习风格|视觉型|听觉型|动觉型|优势|性格|MBTI|多元智能|注意力/,
    localFields: ['preference_candidate', 'method_hypothesis', 'cross_check_gate', 'review_window'],
    evidenceGap: ['真实作业卡点', '两次以上回访证据', '第 7 天小变式'],
    reportUse: '进入方法候选：只建议先看图、先复述、先动笔或先拆步，不给天赋定论。',
    aiAllowed: ['儿童可听懂解释', '家长方法建议改写'],
    aiBlocked: ['天赋定性', '升学结论', '人格标签']
  },
  {
    id: 'school_material',
    label: '学校/老师材料',
    match: /老师|学校|课堂|评语|批注|作业反馈|家校|班主任|错题本|试卷讲评/,
    localFields: ['teacher_observation', 'classroom_signal', 'home_school_question', 'safe_handoff'],
    evidenceGap: ['家庭观察记录', '孩子复述证据'],
    reportUse: '进入家校摘要：只生成观察问题和安全交接字段。',
    aiAllowed: ['老师沟通摘要', '家校措辞润色'],
    aiBlocked: ['替老师判断', '公开排名', '原题照片转发']
  },
  {
    id: 'wrong_question_paper',
    label: '错题/试卷',
    match: /错题|试卷|周测|单元测|期中|期末|扣分|列式|阅读理解|计算|证明|实验|方程|应用题/,
    localFields: ['question_type', 'wrong_cause', 'first_step', 'next_day_revisit', 'day7_variant'],
    evidenceGap: ['孩子原想法', '卡住的第一步'],
    reportUse: '进入错因报告：抽题型、错因、第一步和回访窗口。',
    aiAllowed: ['苏格拉底追问', '小黑板话术', '同错因小变式表达'],
    aiBlocked: ['完整答案', '自动判分', '分数排名解释']
  }
];

function detectIntakeSourceSchema(text = '', materialType = '') {
  const value = `${materialType || ''}\n${String(text || '')}`;
  const explicit = INTAKE_SOURCE_SCHEMAS.find((schema) => schema.id === materialType);
  if (explicit) return explicit;
  if (/school|teacher|feedback/.test(String(materialType || ''))) {
    return INTAKE_SOURCE_SCHEMAS.find((schema) => schema.id === 'school_material');
  }
  if (/talent|assessment|preference/.test(String(materialType || ''))) {
    return INTAKE_SOURCE_SCHEMAS.find((schema) => schema.id === 'talent_assessment');
  }
  if (/wrong|paper|exam|question/.test(String(materialType || ''))) {
    return INTAKE_SOURCE_SCHEMAS.find((schema) => schema.id === 'wrong_question_paper');
  }
  return INTAKE_SOURCE_SCHEMAS.find((schema) => schema.match.test(value)) || INTAKE_SOURCE_SCHEMAS[3];
}

function looksLikeReviewRequest(text = '') {
  return /复习|回访|再练|巩固|记住|记不牢|背|同类题|变式|练这个/.test(String(text || ''));
}

function looksLikeStuckPoint(text = '') {
  return /读不懂|看不懂|不会列式|不会下一步|不知道下一步|卡住|卡在|不懂|不会写|不会用|不会做|不知道怎么/.test(String(text || ''));
}

function looksLikeQuestion(text = '') {
  const value = String(text || '').trim();
  if (!value) return false;
  if (/[?？]$/.test(value)) return true;
  if (/求|计算|证明|解方程|多少|几|为什么|怎么|已知|若|如果|把.*分成|表面积|体积|列式/.test(value) && value.length >= 12) return true;
  return value.length >= 36 && /[。；，,]/.test(value);
}

function detectMaterialSource(text = '') {
  const value = String(text || '').trim();
  const urlMatch = value.match(/https?:\/\/[^\s，。；]+/i);
  const hasUrl = !!urlMatch;
  if (/公众号|微信文章|原文链接|微信读书/.test(value)) {
    return { type: 'wechat_article', label: '公众号摘录', hasUrl, url: urlMatch ? urlMatch[0] : '' };
  }
  if (/PDF|pdf|讲义|教材|试卷解析|资料页|节选/.test(value)) {
    return { type: 'pdf_excerpt', label: 'PDF 摘录', hasUrl, url: urlMatch ? urlMatch[0] : '' };
  }
  if (hasUrl || /网页|网站|链接|文章摘录|知乎|百科|博客/.test(value)) {
    return { type: 'web_article', label: '网页摘录', hasUrl, url: urlMatch ? urlMatch[0] : '' };
  }
  if (/课堂笔记|读书笔记|整理|摘录|材料|知识点|要点/.test(value)) {
    return { type: 'manual_notes', label: '手动整理', hasUrl, url: '' };
  }
  return null;
}

function looksLikeMaterialExcerpt(text = '') {
  const value = String(text || '').trim();
  if (!value) return false;
  const source = detectMaterialSource(value);
  if (!source) return false;
  const hasEnoughContent = value.length >= 28 || value.split(/\n+/).filter(Boolean).length >= 2;
  const isOnlyLink = /^https?:\/\/\S+$/i.test(value);
  return hasEnoughContent && !isOnlyLink;
}

function classifyImportInput(text = '') {
  const value = String(text || '').trim();
  if (!value) {
    return {
      kind: 'empty',
      route: 'none',
      shouldCreateFocus: false,
      feedback: '粘贴题目，或只说你卡在哪一步。'
    };
  }
  if (looksLikeMaterialExcerpt(value)) {
    const sourceMeta = detectMaterialSource(value) || { type: 'manual_notes', label: '手动整理', hasUrl: false, url: '' };
    return {
      kind: 'material_source',
      route: 'review',
      inputType: sourceMeta.type,
      shouldCreateFocus: false,
      sourceMeta,
      feedback: `收到${sourceMeta.label}。只处理你粘贴的摘录，先导入轻回访；不自动抓取链接、不解析文件、不直接给答案。`
    };
  }
  if (/^https?:\/\/\S+$/i.test(value)) {
    return {
      kind: 'link_excerpt_needs_text',
      route: 'upload',
      shouldCreateFocus: false,
      feedback: '只收到链接。请粘贴一小段摘录或写一句孩子卡住点；我不会自动抓取网页，也不会把裸链接交给 AI 点拨。'
    };
  }
  if (looksLikeReviewRequest(value)) {
    return {
      kind: 'review_request',
      route: 'review',
      shouldCreateFocus: false,
      feedback: '我先把它当成复习入口，等下可以变成一张回访卡。'
    };
  }
  if (looksLikeStuckPoint(value)) {
    return {
      kind: 'stuck_point',
      route: 'today_focus',
      shouldCreateFocus: true,
      feedback: '我记下来了，等下我们就修这个卡点。'
    };
  }
  if (looksLikeQuestion(value)) {
    return {
      kind: 'homework_question',
      route: 'tutor',
      shouldCreateFocus: false,
      feedback: '收到题目了。先说你想到的第一步，我只追问一小步。'
    };
  }
  return {
    kind: 'first_thought',
    route: 'tutor',
    shouldCreateFocus: false,
    feedback: '这一步有用，我帮你记到思路里。'
  };
}

function buildNextActionQueue(kind, classified = {}, materialSource = null, images = []) {
  const sourceLabel = materialSource && materialSource.label ? materialSource.label : '用户输入';
  const photoNeedsText = kind === 'photo_evidence_needs_text';
  const linkNeedsText = kind === 'link_excerpt_needs_text';
  const needsText = photoNeedsText || linkNeedsText;
  return [
    {
      id: 'complete_stuck_point',
      label: needsText ? '先补一句卡住点' : '确认第一步卡点',
      route: '/pages/upload/upload',
      owner: 'local_rule',
      status: needsText ? 'required' : 'ready',
      releaseGate: needsText ? '补齐错因、摘录或卡住点后才进入复习/点拨' : '已有文字证据，可进入今晚闭环',
      action: needsText ? '写清孩子卡在哪一步，或粘贴一小段资料摘录' : '保留题型、错因和来源'
    },
    {
      id: 'socratic_first_step',
      label: '苏格拉底第一步',
      route: '/pages/tutor/tutor?from=upload_intake',
      owner: 'ai_with_local_guardrail',
      status: needsText ? 'locked' : (classified.route === 'review' ? 'optional' : 'ready'),
      releaseGate: '本地规则先判定题型和禁用字段，AI 只改写追问语气',
      action: '只问第一步，不生成完整答案'
    },
    {
      id: 'review_card_seed',
      label: '生成回忆卡',
      route: '/pages/review/review',
      owner: 'local_rule',
      status: needsText ? 'locked' : (kind === 'material_source' || classified.route === 'review' ? 'ready' : 'optional'),
      releaseGate: '只使用用户粘贴的文字摘录或自己写的错因',
      action: `${sourceLabel} -> 概念卡/步骤卡/错因卡/明天回访`
    },
    {
      id: 'first_step_challenge',
      label: '90秒第一步挑战',
      route: '/pages/arcade/arcade?from=upload_intake',
      owner: 'local_rule',
      status: needsText ? 'locked' : 'optional',
      releaseGate: '挑战只带动作和回访窗口，不带原题、答案、分数或排名',
      action: images.length ? '用自己的材料说第一步' : '用当前文字生成低压挑战'
    },
    {
      id: 'parent_report_seed',
      label: '写入家长复盘',
      route: '/pages/profile/profile',
      owner: 'local_rule',
      status: needsText ? 'locked' : 'ready',
      releaseGate: '报告只记录来源、第一步、错因和下一次回访',
      action: '家长只看今晚能问的一句话'
    }
  ];
}

function buildUploadIntakePacket(text = '', imagePaths = [], materialType = '') {
  const value = String(text || '').trim();
  const images = Array.isArray(imagePaths) ? imagePaths.filter(Boolean).slice(0, 4) : [];
  const classified = classifyImportInput(value);
  const intakeSourceSchema = detectIntakeSourceSchema(value, materialType);
  const materialSource = detectMaterialSource(value)
    || (materialType ? { type: materialType, label: materialType, hasUrl: false, url: '' } : null);
  const hasOnlyLink = /^https?:\/\/\S+$/i.test(value);
  const kind = images.length && !value
    ? 'photo_evidence_needs_text'
    : classified.kind;
  const nextRoute = kind === 'photo_evidence_needs_text'
    ? '/pages/upload/upload'
    : kind === 'link_excerpt_needs_text'
      ? '/pages/upload/upload'
    : classified.route === 'review'
      ? '/pages/review/review'
      : classified.route === 'today_focus'
        ? '/pages/review/review'
        : '/pages/tutor/tutor?from=upload_intake';
  const blockedFields = [
    'original_answer',
    'full_solution',
    'auto_link_crawl',
    'auto_pdf_parse',
    'photo_ocr_claim',
    'score',
    'ranking'
  ];
  const evidence = [
    { id: 'text_present', label: '文字材料', ready: !!value },
    { id: 'photo_local_only', label: '照片本地留档', ready: images.length > 0 },
    { id: 'source_classified', label: '来源分类', ready: !!(materialSource || classified.kind !== 'empty') },
    { id: 'answer_safe', label: '不直接给答案', ready: true }
  ];
  const reviewSeed = {
    source: materialSource ? `upload_${materialSource.type}` : `upload_${kind}`,
    sourceType: materialSource ? materialSource.type : kind,
    shouldImport: kind === 'material_source' || kind === 'review_request' || /wrong|review|material|question/.test(kind),
    boundary: '只把用户提供的文字拆成回忆卡，不抓链接、不解析文件、不生成完整答案。'
  };
  const reportSeed = {
    type: images.length ? 'photo_plus_text_intake' : 'text_intake',
    label: materialSource ? materialSource.label : (kind === 'photo_evidence_needs_text' ? '照片留档' : '作业/错题文字'),
    confidence: value ? (images.length ? 0.72 : 0.64) : 0.28,
    status: value ? '可进入今晚闭环' : '需要补一句错因或卡点',
    sourceSchemaId: intakeSourceSchema.id,
    sourceSchemaLabel: intakeSourceSchema.label,
    reportUse: intakeSourceSchema.reportUse,
    evidenceGap: intakeSourceSchema.evidenceGap
  };
  const nextActionQueue = buildNextActionQueue(kind, classified, materialSource || classified.sourceMeta || null, images);
  return {
    id: `upload_intake_${Date.now ? Date.now() : 0}`,
    kind,
    inputKind: classified.kind,
    route: classified.route,
    nextRoute,
    imageCount: images.length,
    hasText: !!value,
    hasOnlyLink,
    sourceMeta: materialSource || classified.sourceMeta || null,
    feedback: kind === 'photo_evidence_needs_text'
      ? '照片只做本地留档。请补一句错因或卡住点，系统才会整理成回忆卡。'
      : classified.feedback,
    evidence,
    intakeSourceSchema,
    intakeSourceSchemas: INTAKE_SOURCE_SCHEMAS,
    nextActionQueue,
    blockedFields,
    reviewSeed,
    reportSeed,
    aiBoundary: 'AI 只负责改写提示和追问；来源识别、路线、放行、分享字段由本地规则决定。'
  };
}

module.exports = {
  IMPORT_CHIPS,
  INTAKE_SOURCE_SCHEMAS,
  buildUploadIntakePacket,
  buildNextActionQueue,
  classifyImportInput,
  detectMaterialSource,
  detectIntakeSourceSchema,
  looksLikeMaterialExcerpt,
  looksLikeQuestion,
  looksLikeReviewRequest,
  looksLikeStuckPoint
};
