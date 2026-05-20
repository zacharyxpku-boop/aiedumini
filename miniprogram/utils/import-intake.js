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

const MATERIAL_TYPE_LABELS = {
  parent_report: '家长观察',
  talent_assessment: '天赋/学习偏好测评',
  school_material: '学校/老师材料',
  wrong_question_paper: '错题/试卷',
  wrong_question_photo: '错题照片留档',
  class_notes: '课堂笔记',
  wechat_article: '公众号摘录',
  web_article: '网页摘录',
  pdf_excerpt: 'PDF 摘录',
  manual_notes: '手动整理',
  ppt: 'PPT 要点',
  video: '视频笔记',
  handwriting: '手写整理'
};

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

const STRUCTURED_CAPTURE_PROMPT_BY_FIELD = {
  question_type: { label: '题型', prompt: '这份材料更像哪类题：审题、列式、概念、实验、阅读、表达，还是记忆？' },
  child_original_thought: { label: '孩子原想法', prompt: '孩子当时第一反应是什么？只写一句原话或近似表达。' },
  stuck_first_step: { label: '卡住第一步', prompt: '他卡在读题、找条件、列关系、套概念、检查，还是迁移？' },
  wrong_cause_guess: { label: '错因猜测', prompt: '先猜一个最可能错因，之后用明天回访验证，不直接下结论。' },
  preference_candidate: { label: '方法候选', prompt: '报告只提示一个可能适合的学习方式，例如先看图、先复述、先动笔或先拆步。' },
  method_hypothesis: { label: '方法假设', prompt: '把测评结论改写成可验证假设：今晚试哪一个具体动作？' },
  cross_check_gate: { label: '交叉验证门槛', prompt: '需要哪条真实错题、作业或回访证据，才能继续相信这个方法？' },
  review_window: { label: '回访窗口', prompt: '明天或第 7 天要回看什么，才能判断方法是否真的适合？' },
  teacher_observation: { label: '老师观察', prompt: '老师反馈里可引用的一句事实是什么？不加入排名或评价。' },
  classroom_signal: { label: '课堂信号', prompt: '课堂/作业中出现的具体信号是什么，例如听懂但列式慢。' },
  home_school_question: { label: '家校问题', prompt: '家长下一次跟老师确认的一个安全问题是什么？' },
  safe_handoff: { label: '安全交接', prompt: '哪些内容可以交接给家长，哪些原题、分数、排名不能外传？' },
  home_observation: { label: '家庭观察', prompt: '家长观察到的一个具体场景是什么？只写事实，不贴标签。' },
  parent_goal: { label: '家长期望', prompt: '家长今晚最想解决的一个动作问题是什么？' },
  homework_context: { label: '作业场景', prompt: '这个问题通常出现在什么作业时段、学科或题型里？' },
  next_action: { label: '下一动作', prompt: '今晚家长只做哪一个低压动作？' },
  wrong_cause: { label: '错因', prompt: '把错因写成可验证的一句话，不写完整答案。' },
  first_step: { label: '第一步', prompt: '孩子要自己说出的第一步是什么？' },
  next_day_revisit: { label: '隔天回访', prompt: '明天只回访哪一张卡或哪一个第一步？' },
  day7_variant: { label: '第7天小变式', prompt: '第 7 天用哪一个小变式验证不是只会原题？' }
};

function buildStructuredCapturePromptsForSchema(schema = {}) {
  const fieldIds = schema.id === 'wrong_question_paper' || schema.id === 'wrong_question_photo'
    ? ['question_type', 'child_original_thought', 'stuck_first_step', 'wrong_cause_guess']
    : Array.isArray(schema.localFields) && schema.localFields.length
    ? schema.localFields
    : ['question_type', 'child_original_thought', 'stuck_first_step', 'wrong_cause_guess'];
  return fieldIds.map((id) => Object.assign(
    { id, label: id, prompt: '补一条真实证据，不写结论。' },
    STRUCTURED_CAPTURE_PROMPT_BY_FIELD[id] || {},
    { id }
  ));
}

function buildSourceReadinessBoard(schema = {}, kind = '', materialSource = null, images = []) {
  const sourceLabel = schema.label || (materialSource && materialSource.label) || '用户材料';
  const photoOnly = kind === 'photo_evidence_needs_text';
  const linkOnly = kind === 'link_excerpt_needs_text';
  const methodCandidateOnly = schema.id === 'talent_assessment';
  const localCodeBetter = [
    '来源分类',
    '证据缺口',
    '报告放行',
    '画像置信度',
    '分享字段',
    '家校交接边界'
  ];
  const aiBetter = [
    '苏格拉底追问语气',
    '孩子能听懂的解释',
    '家长可读摘要',
    '同一第一步的不同说法'
  ];
  const mustNotDo = [
    '完整答案',
    '天赋定性',
    '分数排名刺激',
    '拍照 OCR 承诺',
    '自动抓链接或解析 PDF',
    '替老师或家长做最终判断'
  ];
  return {
    id: 'upload_source_readiness_board',
    title: `${sourceLabel}怎么进入报告`,
    sourceSchemaId: schema.id || 'unknown',
    sourceSchemaLabel: sourceLabel,
    sourceType: materialSource ? materialSource.type : '',
    status: photoOnly || linkOnly ? 'needs_text_before_release' : methodCandidateOnly ? 'method_candidate_only' : 'tonight_action_ready',
    readyForReport: !(photoOnly || linkOnly),
    localCodeBetter,
    aiBetter,
    mustNotDo,
    localCodeBetterLine: localCodeBetter.join(' / '),
    aiBetterLine: aiBetter.join(' / '),
    mustNotDoLine: mustNotDo.join(' / '),
    reportUse: schema.reportUse || '只进入今晚行动和证据缺口，不直接生成长期结论。',
    releaseRule: methodCandidateOnly
      ? '天赋/学习偏好只放行学习方法候选；必须用真实错题、隔天回访和第 7 天小变式验证。'
      : photoOnly
        ? '照片只做本地留档；补一句错因或卡点后才进入点拨、报告和复习。'
        : linkOnly
          ? '链接只做来源线索；必须粘贴摘录或卡点文字，不自动抓取。'
          : '可进入今晚行动；长期画像仍等隔天回访、第 7 天迁移和多源证据。',
    nextEvidence: Array.isArray(schema.evidenceGap) ? schema.evidenceGap.slice(0, 4) : [],
    imageCount: Array.isArray(images) ? images.length : 0
  };
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

function buildRequiredNextEvidence(schema = {}, kind = '') {
  const base = Array.isArray(schema.evidenceGap) ? schema.evidenceGap.slice(0, 4) : [];
  const actionMap = {
    talent_assessment: [
      { id: 'real_homework_stuck_point', label: base[0] || '真实作业卡点', route: '/pages/upload/upload', owner: 'local_rule', unlocks: 'method_cross_check' },
      { id: 'two_revisit_records', label: base[1] || '两次以上回访证据', route: '/pages/review/review', owner: 'local_rule', unlocks: 'portrait_candidate' },
      { id: 'day7_variant_result', label: base[2] || '第 7 天小变式', route: '/pages/arcade/arcade', owner: 'local_rule', unlocks: 'weekly_method_signal' }
    ],
    wrong_question_paper: [
      { id: 'child_original_thought', label: base[0] || '孩子原想法', route: '/pages/tutor/tutor?from=wrong_question_evidence', owner: 'ai_with_local_guardrail', unlocks: 'socratic_first_step' },
      { id: 'stuck_first_step', label: base[1] || '卡住的第一步', route: '/pages/tutor/tutor?from=wrong_question_evidence', owner: 'local_rule', unlocks: 'wrong_cause_card' },
      { id: 'next_day_revisit', label: '明天回访结果', route: '/pages/review/review', owner: 'local_rule', unlocks: 'portrait_confidence_plus_one' }
    ],
    school_material: [
      { id: 'home_observation_log', label: base[0] || '家庭观察记录', route: '/pages/profile/profile', owner: 'local_rule', unlocks: 'home_school_digest' },
      { id: 'child_retell_evidence', label: base[1] || '孩子复述证据', route: '/pages/review/review', owner: 'local_rule', unlocks: 'teacher_safe_handoff' }
    ],
    parent_report: [
      { id: 'child_first_step', label: base[0] || '孩子自己的第一步', route: '/pages/tutor/tutor?from=parent_report_evidence', owner: 'ai_with_local_guardrail', unlocks: 'family_decision_homepage' },
      { id: 'tomorrow_revisit_result', label: base[1] || '明天回访结果', route: '/pages/review/review', owner: 'local_rule', unlocks: 'weekly_parent_decision' }
    ]
  };
  const rows = actionMap[schema.id] || base.map((label, index) => ({
    id: `evidence_${index + 1}`,
    label,
    route: '/pages/upload/upload',
    owner: 'local_rule',
    unlocks: 'tonight_action'
  }));
  return rows.map((item) => Object.assign({}, item, {
    required: true,
    status: kind === 'photo_evidence_needs_text' || kind === 'link_excerpt_needs_text' ? 'blocked_until_text' : 'next'
  }));
}

function buildMethodValidationChallengeChain(schema = {}, requiredNextEvidence = [], kind = '') {
  const sourceSchemaId = schema.id || 'parent_report';
  const methodCandidateOnly = sourceSchemaId === 'talent_assessment';
  const blockedUntilText = kind === 'photo_evidence_needs_text' || kind === 'link_excerpt_needs_text';
  const evidenceRows = Array.isArray(requiredNextEvidence) ? requiredNextEvidence : [];
  const firstEvidence = evidenceRows[0] || {};
  const secondEvidence = evidenceRows[1] || {};
  const thirdEvidence = evidenceRows[2] || {};
  return {
    id: 'method_validation_challenge_chain',
    sourceSchemaId,
    title: methodCandidateOnly ? '学习方法候选验证链' : '材料证据验证链',
    status: blockedUntilText ? 'blocked_until_text' : 'ready',
    releaseRule: methodCandidateOnly
      ? '只把天赋/学习偏好当作方法候选；必须经过真实作业卡点、两次回访和第 7 天小变式，才进入周/月报告。'
      : '材料先生成今晚行动证据；长期画像必须等待回访、错因卡和小变式验证。',
    stages: [
      {
        id: 'stage_1_real_task',
        label: firstEvidence.label || '真实作业卡点',
        route: firstEvidence.route || '/pages/tutor/tutor?from=method_validation',
        owner: firstEvidence.owner || 'local_rule',
        unlocks: firstEvidence.unlocks || 'first_step_evidence',
        requiredEvidence: 'child_first_step'
      },
      {
        id: 'stage_2_revisit',
        label: secondEvidence.label || '明天回访证据',
        route: secondEvidence.route || '/pages/review/review?from=method_validation',
        owner: secondEvidence.owner || 'local_rule',
        unlocks: secondEvidence.unlocks || 'revisit_evidence',
        requiredEvidence: 'next_day_revisit'
      },
      {
        id: 'stage_3_day7_variant',
        label: thirdEvidence.label || '第 7 天小变式',
        route: thirdEvidence.route || '/pages/arcade/arcade?from=method_validation',
        owner: thirdEvidence.owner || 'local_rule',
        unlocks: thirdEvidence.unlocks || 'weekly_method_signal',
        requiredEvidence: 'day7_variant_result'
      }
    ],
    reportCopy: methodCandidateOnly
      ? '报告只说“建议先试的学习方法”，不说孩子天赋是什么；等三段证据齐了再提高置信度。'
      : '报告只说“这份材料支持今晚做什么”，不把单次材料当长期能力结论。',
    localCodeOwns: ['release_gate', 'evidence_order', 'report_confidence_weight', 'share_fields'],
    aiBetterFor: ['child_friendly_prompt', 'parent_summary_copy', 'method_explanation'],
    aiMustNotOwn: ['talent_label', 'mastery_claim', 'score_ranking', 'reward_release'],
    blockedFields: ['original_answer', 'full_solution', 'score', 'ranking', 'talent_label', 'private_comment']
  };
}

function buildAiReportDraftAdapter(packet = {}, evidenceSignals = {}) {
  const schema = packet.intakeSourceSchema || {};
  const reportSeed = packet.reportSeed || {};
  const sourceSchemaId = schema.id || reportSeed.sourceSchemaId || 'parent_report';
  const isTalent = sourceSchemaId === 'talent_assessment';
  const isWrongPaper = sourceSchemaId === 'wrong_question_paper';
  const firstStep = evidenceSignals.firstStep || evidenceSignals.stuckFirstStep || '先让孩子说出第一步，不要求算完整题。';
  const wrongCause = evidenceSignals.wrongCause || evidenceSignals.wrongCauseGuess || '先把卡点当作候选错因，等回访验证。';
  const questionType = evidenceSignals.questionType || schema.label || reportSeed.sourceSchemaLabel || '今晚材料';
  const missing = Array.isArray(evidenceSignals.structuredCaptureMissing)
    ? evidenceSignals.structuredCaptureMissing
    : [];
  return {
    id: 'ai_report_draft_adapter',
    sourceSchemaId,
    mode: 'ai_draft_local_guardrail',
    status: isTalent ? 'method_candidate_only' : 'ready_for_guarded_draft',
    aiAllowedSections: [
      'parent_readable_summary',
      'socratic_followup_questions',
      'tonight_action_wording',
      'mini_lesson_candidate_copy'
    ],
    localCodeOwns: [
      'source_classification',
      'release_gate',
      'portrait_confidence_weight',
      'reward_release',
      'share_fields',
      'day7_evidence_gate'
    ],
    aiMustNotOwn: [
      'talent_label',
      'auto_grading',
      'ocr_claim',
      'full_answer',
      'mastery_claim',
      'ranking',
      'reward_release'
    ],
    localSanitizer: {
      rule: 'AI 草案只能作为文案候选；本地二次校验后才写入报告、练习、分享和画像。',
      degradeRule: isTalent
        ? '测评材料一律降级为学习方法候选，必须补真实错题、隔天回访和第 7 天小变式。'
        : isWrongPaper
          ? '错题材料只放行错因候选、第一步和近迁移，不自动判分、不输出整卷答案。'
          : '家长/学校/摘录材料只放行今晚行动和下一证据，不写长期能力结论。',
      blockedClaims: [
        '孩子天赋就是',
        '自动判分',
        'OCR 已识别全部内容',
        '整卷答案',
        '长期掌握',
        '排名提升保证'
      ]
    },
    draftSeed: {
      parentSummary: isTalent
        ? `这份测评只能提示可能适合的学习方法：围绕“${questionType}”，今晚先验证一个动作。`
        : `这份材料先用于今晚决策：卡点暂定为“${wrongCause}”，先看孩子能否说出第一步。`,
      socraticQuestions: [
        '这题第一步你先看哪里？',
        '你刚才卡住的是读题、列关系，还是检查？',
        '如果换一个数字或条件，第一步还一样吗？'
      ],
      tonightAction: firstStep,
      miniLessonCandidate: {
        title: '3 分钟小讲堂候选',
        conceptGap: wrongCause,
        blackboardFirstStep: firstStep,
        parentCheckLine: '家长只问第一步，不追问完整答案。',
        nextDayRevisit: '明天遮住答案，只回访同一第一步。'
      },
      evidenceMissing: missing
    }
  };
}

function buildUploadIntakePacket(text = '', imagePaths = [], materialType = '') {
  const value = String(text || '').trim();
  const images = Array.isArray(imagePaths) ? imagePaths.filter(Boolean).slice(0, 4) : [];
  const classified = classifyImportInput(value);
  const intakeSourceSchema = detectIntakeSourceSchema(value, materialType);
  const materialSource = detectMaterialSource(value)
    || (materialType ? { type: materialType, label: MATERIAL_TYPE_LABELS[materialType] || intakeSourceSchema.label || materialType, hasUrl: false, url: '' } : null);
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
  const requiredNextEvidence = buildRequiredNextEvidence(intakeSourceSchema, kind);
  const schemaStructuredCapturePrompts = buildStructuredCapturePromptsForSchema(intakeSourceSchema);
  const requiredTextFields = schemaStructuredCapturePrompts.map((item) => item.id);
  const legacyStructuredCapturePrompts = [
    { id: 'question_type', label: '题型', prompt: '这份材料更像哪类题：审题、列式、概念、实验、阅读、表达，还是记忆？' },
    { id: 'child_original_thought', label: '孩子原想法', prompt: '孩子当时第一反应是什么？只写一句原话或近似表达。' },
    { id: 'stuck_first_step', label: '卡住第一步', prompt: '他卡在读题、找条件、列关系、套概念、检查，还是迁移？' },
    { id: 'wrong_cause_guess', label: '错因猜测', prompt: '先猜一个最可能错因，之后用明天回访验证，不直接下结论。' }
  ];
  const structuredCapturePrompts = schemaStructuredCapturePrompts.length
    ? schemaStructuredCapturePrompts
    : legacyStructuredCapturePrompts;
  const photoEvidencePolicy = {
    mode: 'local_file_reference_only',
    ocrClaim: false,
    releaseGate: 'photo_needs_structured_text_before_report_or_tutor_release',
    allowedUse: ['local_archive', 'parent_context', 'manual_text_capture_prompt'],
    blockedUse: ['photo_ocr_claim', 'auto_answer', 'score_ranking', 'public_share']
  };
  const methodValidationChallengeChain = buildMethodValidationChallengeChain(
    intakeSourceSchema,
    requiredNextEvidence,
    kind
  );
  const reportSeed = {
    type: images.length ? 'photo_plus_text_intake' : 'text_intake',
    label: materialSource ? materialSource.label : (kind === 'photo_evidence_needs_text' ? '照片留档' : '作业/错题文字'),
    confidence: value ? (images.length ? 0.72 : 0.64) : 0.28,
    status: value ? '可进入今晚闭环' : '需要补一句错因或卡点',
    sourceSchemaId: intakeSourceSchema.id,
    sourceSchemaLabel: intakeSourceSchema.label,
    reportUse: intakeSourceSchema.reportUse,
    evidenceGap: intakeSourceSchema.evidenceGap,
    requiredNextEvidence,
    nextEvidenceUnlockPlan: requiredNextEvidence.map((item) => `${item.id}:${item.unlocks}`).join(' -> '),
    releaseScope: intakeSourceSchema.id === 'talent_assessment' ? 'method_candidate_only' : 'tonight_action_first',
    portraitConfidenceWeight: intakeSourceSchema.id === 'talent_assessment' ? 0 : 1,
    scoreRankingPolicy: intakeSourceSchema.id === 'talent_assessment'
      ? 'degrade_to_unreleased_reference'
      : 'release_only_with_confirmed_score_sheet_or_homework_evidence',
    requiredTextFields,
    structuredCapturePrompts,
    methodValidationChallengeChain,
    photoEvidencePolicy
  };
  const nextActionQueue = buildNextActionQueue(kind, classified, materialSource || classified.sourceMeta || null, images);
  const sourceReadinessBoard = buildSourceReadinessBoard(intakeSourceSchema, kind, materialSource || classified.sourceMeta || null, images);
  const aiReportDraftAdapter = buildAiReportDraftAdapter({
    intakeSourceSchema,
    reportSeed,
    kind
  });
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
    sourceReadinessBoard,
    nextActionQueue,
    blockedFields,
    requiredTextFields,
    structuredCapturePrompts,
    methodValidationChallengeChain,
    photoEvidencePolicy,
    aiReportDraftAdapter,
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
  buildSourceReadinessBoard,
  buildMethodValidationChallengeChain,
  buildAiReportDraftAdapter,
  classifyImportInput,
  detectMaterialSource,
  detectIntakeSourceSchema,
  looksLikeMaterialExcerpt,
  looksLikeQuestion,
  looksLikeReviewRequest,
  looksLikeStuckPoint
};
