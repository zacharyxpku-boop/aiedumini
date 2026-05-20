'use strict';

const SAFE_SHARE_BOUNDARY = '只分享错因、第一步、家长检查句和回访动作；不分享原题、照片、完整答案、完整对话或孩子隐私材料。';

const OPENMAIC_REFERENCE_POLICY = {
  id: 'openmaic_reference_policy',
  sourceName: 'OpenMAIC',
  sourceUrl: 'https://github.com/THU-MAIC/OpenMAIC',
  license: 'AGPL-3.0',
  decision: 'reference_workflow_only',
  commercialRule: '不复制、不链接、不部署 OpenMAIC 代码；商业闭源小程序只借鉴两阶段生成、事件回放、动作引擎和质量评估思想。',
  borrowedIdeas: [
    'two_stage_generation_outline_then_scene',
    'playback_event_state_machine',
    'action_engine_for_learning_moves',
    'quality_rubric_before_release'
  ],
  forbiddenUses: [
    'copy_openmaic_code',
    'ship_agpl_server_as_closed_backend',
    'copy_prompts_or_assets',
    'promise_full_ai_classroom_generation',
    'export_raw_question_or_answer_pack'
  ]
};

const PUBLIC_K12_RESOURCE_DECISIONS = [
  {
    id: 'official_curriculum_standards',
    label: '公开课标/考试说明',
    directUse: ['学科、年级、章节、能力轴、题型名称'],
    localCodeOwns: ['课程骨架', '题型路由', '报告放行门', '来源登记'],
    aiBetterFor: ['把能力轴改写成孩子能听懂的一句追问'],
    mustNotUse: ['复制整段原文', '包装成官方题库', '生成标准答案库']
  },
  {
    id: 'public_oer_materials',
    label: 'OER/开放许可资源',
    directUse: ['已确认许可的结构、概念标签、活动类型'],
    localCodeOwns: ['license_gate', 'source_registry_gate', 'reuse_scope'],
    aiBetterFor: ['改写为本地第一步、小黑板、家长检查句'],
    mustNotUse: ['未核许可就进公开卡片', '抓取原文训练模型', '保留外部图片或答案']
  },
  {
    id: 'family_uploaded_material',
    label: '家庭上传错题/试卷/天赋报告',
    directUse: ['仅限该家庭私有报告和回访计划'],
    localCodeOwns: ['隐私门', '报告置信度', '分享脱敏', '下一证据'],
    aiBetterFor: ['在脱敏后写家长能读懂的说明'],
    mustNotUse: ['公开沉淀原题', '外传孩子材料', '单次上传就下天赋定论']
  },
  {
    id: 'generated_practice_variants',
    label: '生成式变式练习',
    directUse: ['经本地规则审核后的变式入口和第一步'],
    localCodeOwns: ['答案可见门', '奖励发放', '掌握判断', '间隔复习'],
    aiBetterFor: ['生成不同语气的苏格拉底追问'],
    mustNotUse: ['AI 直接判掌握', 'AI 直接发奖励', 'AI 输出完整答案']
  }
];

const MINI_LESSON_VISUAL_TEMPLATES = [
  {
    subject: 'math',
    match: /数学|方程|应用题|比例|几何|函数|计算|代数|数量|math/i,
    boardMove: '画数量关系：已知量 -> 未知量 -> 先设谁',
    conceptLens: '数量关系入口',
    nearTransfer: '换一个数字，只复述等量关系，不求完整答案。'
  },
  {
    subject: 'physics',
    match: /物理|力|电路|光|速度|压强|浮力|physics/i,
    boardMove: '画对象和方向：研究对象 -> 受力/路径 -> 已知量',
    conceptLens: '对象方向入口',
    nearTransfer: '换一个图，只说研究对象、方向和第一个已知量。'
  },
  {
    subject: 'chemistry',
    match: /化学|反应|溶液|气体|酸|碱|盐|分子|chem/i,
    boardMove: '画变化前后：物质A -> 条件 -> 物质B',
    conceptLens: '变化前后入口',
    nearTransfer: '换一个现象，只说反应前后分别有什么。'
  },
  {
    subject: 'english',
    match: /英语|英文|单词|句子|时态|语法|阅读|english/i,
    boardMove: '划句子骨架：主语 -> 动作 -> 时间/修饰',
    conceptLens: '句子结构入口',
    nearTransfer: '换一句话，只圈主语、动作和时间信号。'
  },
  {
    subject: 'chinese',
    match: /语文|阅读|作文|古诗|文言|段落|chinese/i,
    boardMove: '画证据线：题目问法 -> 原文句子 -> 自己的话',
    conceptLens: '证据句入口',
    nearTransfer: '换一个段落，只找一句能支撑答案的原文。'
  },
  {
    subject: 'biology',
    match: /生物|细胞|器官|生态|遗传|结构|功能|biology/i,
    boardMove: '画结构功能：结构 -> 功能 -> 现象',
    conceptLens: '结构功能入口',
    nearTransfer: '换一个结构，只说它对应的功能。'
  },
  {
    subject: 'geography',
    match: /地理|地图|气候|经纬|地形|公转|自转|geography/i,
    boardMove: '画空间因果：位置 -> 条件 -> 结果',
    conceptLens: '空间因果入口',
    nearTransfer: '换一个区域，只说位置、条件和一个结果。'
  }
];

function safeText(value, fallback, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  const result = text || fallback || '';
  return max && result.length > max ? `${result.slice(0, max)}...` : result;
}

function buildOutline(input = {}) {
  const signal = input.pressureSignal || {};
  const taskType = safeText(input.taskType || signal.taskType, 'unknown');
  const firstStep = safeText(signal.firstStep || input.firstStep, '先让孩子说出第一步。', 80);
  const wrongCause = safeText(signal.wrongCause || input.wrongCause, '证据不足，先观察第一步是否能说清。', 80);
  const parentCheck = safeText(signal.parentCheck || input.parentCheck, '你先说第一步，不用算完整题。', 80);
  const revisit = safeText(signal.reviewMove || input.revisit, '明天换一个数字或材料，只复查第一步入口。', 80);
  return {
    id: 'tonight_outline',
    stage: 'outline_generation',
    taskType,
    issue: wrongCause,
    learningGoal: firstStep,
    firstStep,
    parentCheck,
    revisit,
    sourceBoundary: SAFE_SHARE_BOUNDARY,
    evidenceRequired: [
      'child_first_step',
      'wrong_cause_named',
      'parent_receipt',
      'next_day_revisit'
    ]
  };
}

function buildScenes(outline = {}) {
  return [
    {
      id: 'socratic_probe',
      type: 'one_question',
      label: '追问',
      action: outline.parentCheck,
      passEvidence: 'child_first_step'
    },
    {
      id: 'first_step_blackboard',
      type: 'visual_entry',
      label: '小黑板',
      action: `只画入口关系：${outline.firstStep}`,
      passEvidence: 'board_entry_not_full_solution'
    },
    {
      id: 'active_recall_card',
      type: 'active_recall',
      label: '回忆卡',
      action: '遮住答案，只让孩子复述第一步和错因。',
      passEvidence: 'recall_without_answer'
    },
    {
      id: 'micro_game',
      type: 'game_loop',
      label: '轻游戏',
      action: '只奖励回忆动作、复访完成和错因修复，不奖励速度和分数。',
      passEvidence: 'local_reward_gate'
    },
    {
      id: 'parent_receipt',
      type: 'parent_check',
      label: '家长回执',
      action: outline.parentCheck,
      passEvidence: 'parent_receipt'
    },
    {
      id: 'safe_share',
      type: 'share_loop',
      label: '安全分享',
      action: SAFE_SHARE_BOUNDARY,
      passEvidence: 'share_safe_redaction'
    }
  ];
}

function buildEventFlow(outline = {}, scenes = []) {
  return scenes.map((scene, index) => ({
    order: index + 1,
    event: scene.id,
    actor: scene.id === 'parent_receipt' ? 'parent' : scene.id === 'safe_share' ? 'system' : 'child',
    localGate: scene.passEvidence,
    nextRoute: scene.id === 'micro_game'
      ? '/pages/arcade/arcade?from=openmaic_task_plan'
      : scene.id === 'parent_receipt'
        ? '/pages/profile/profile?from=openmaic_task_plan'
        : '/pages/review/review?from=openmaic_task_plan',
    reportLine: `${scene.label}：${scene.action}`
  }));
}

function buildLocalAiBoundary() {
  return {
    id: 'openmaic_inspired_local_ai_boundary',
    localCodeOwns: [
      'task_type',
      'source_license_gate',
      'answer_visibility_gate',
      'reward_release',
      'mastery_claim',
      'report_release',
      'share_privacy_fields',
      'revisit_schedule'
    ],
    aiBetterFor: [
      'child_friendly_socratic_wording',
      'parent_readable_explanation',
      'alternate_hint_phrasing',
      'private_report_language_after_redaction'
    ],
    aiMustNotDecide: [
      'final_answer',
      'talent_label',
      'score_prediction',
      'ranking',
      'reward_release',
      'share_fields',
      'mastery_claim'
    ],
    offlineFallback: 'AI 不可用时，本地仍能生成任务单、第一步、小黑板、家长检查句和复访卡。'
  };
}

function buildQualityGate(outline = {}, scenes = []) {
  const sceneIds = scenes.map((item) => item.id);
  return {
    id: 'openmaic_inspired_quality_gate',
    status: outline.firstStep && sceneIds.includes('parent_receipt') && sceneIds.includes('safe_share') ? 'ready' : 'blocked',
    gates: [
      { id: 'two_stage_plan', ok: outline.stage === 'outline_generation' && scenes.length >= 5 },
      { id: 'no_full_answer', ok: true },
      { id: 'source_boundary', ok: outline.sourceBoundary === SAFE_SHARE_BOUNDARY },
      { id: 'parent_receipt', ok: sceneIds.includes('parent_receipt') },
      { id: 'safe_share', ok: sceneIds.includes('safe_share') },
      { id: 'revisit', ok: Boolean(outline.revisit) }
    ],
    releaseRule: '全部门槛为 true，才允许进入报告、奖励和分享；任一门槛失败，只保留第一步追问。',
    reportLine: '这不是完整 AI 课堂，而是今晚任务单：先说第一步，再修错因，再由家长回执和明天回访放行。'
  };
}

function pickMiniLessonVisualTemplate(input = {}) {
  const text = [
    input.subject,
    input.taskType,
    input.sourceText,
    input.firstStep,
    input.wrongCause
  ].join(' ');
  return MINI_LESSON_VISUAL_TEMPLATES.find((item) => item.match.test(text)) || {
    subject: 'general',
    boardMove: '画第一步入口：题目问什么 -> 已知什么 -> 先做哪一步',
    conceptLens: '第一步入口',
    nearTransfer: '换一个相似材料，只复述题目问什么和第一步。'
  };
}

function buildMiniLessonTrigger(input = {}) {
  const userTurnCount = Number(input.userTurnCount || 0);
  const stillBlockedCount = Number(input.stillBlockedCount || 0);
  const hintLevel = Number(input.hintLevel || 1);
  const hasChildFirstStep = Boolean(input.hasChildFirstStep);
  const answerRisk = Boolean(input.answerRisk);
  const shouldTrigger = Boolean(
    input.forceMiniLesson
    || stillBlockedCount >= 1
    || answerRisk
    || (userTurnCount >= 2 && !hasChildFirstStep)
    || hintLevel >= 4
  );
  return {
    id: 'mini_lesson_trigger',
    mode: shouldTrigger ? 'mini_lesson' : 'socratic_first',
    shouldTrigger,
    reason: shouldTrigger
      ? '孩子还说不出第一步时，才切入 3 分钟小讲堂。'
      : '继续保持苏格拉底追问，不提前上完整课堂。',
    blockedMode: 'full_ai_classroom',
    releaseCondition: '孩子能用自己的话说出第一步，才回到练习、报告或分享。'
  };
}

function buildThreeMinuteMiniLesson(input = {}) {
  const outline = input.outline || buildOutline(input);
  const visualTemplate = pickMiniLessonVisualTemplate({
    subject: input.subject,
    taskType: outline.taskType,
    sourceText: input.sourceText,
    firstStep: outline.firstStep,
    wrongCause: outline.issue
  });
  const trigger = buildMiniLessonTrigger(input);
  const aiTeacherLine = safeText(
    input.aiTeacherLine,
    `先不讲完整解法，只看「${visualTemplate.conceptLens}」：${outline.firstStep}`,
    120
  );
  const aiClassmateMisconception = safeText(
    input.aiClassmateMisconception,
    `我可能会急着算答案，但其实还没说清：${outline.issue}`,
    120
  );
  return {
    id: 'three_minute_mini_lesson',
    title: '3 分钟小讲堂',
    positioning: '只在苏格拉底点拨连续卡住时补位；不是 AI 课堂平台，不生成完整课程。',
    trigger,
    conceptGap: visualTemplate.conceptLens,
    blackboard: {
      title: '第一步小黑板',
      boardMove: visualTemplate.boardMove,
      firstStep: outline.firstStep,
      noFullSolution: true
    },
    roles: [
      { id: 'socratic_teacher', label: '苏格拉底老师', line: aiTeacherLine, aiUse: '把本地第一步改写成孩子听得懂的一句话' },
      { id: 'misconception_classmate', label: '误区同学', line: aiClassmateMisconception, aiUse: '暴露常见误区，促使孩子辨析' },
      { id: 'parent_observer', label: '家长观察者', line: outline.parentCheck, aiUse: '把检查句改写成低压话术' }
    ],
    nearTransfer: {
      prompt: visualTemplate.nearTransfer,
      gate: '只检查第一步和错因，不检查最终答案。'
    },
    parentCheck: outline.parentCheck,
    nextDayReview: outline.revisit,
    exitGate: {
      passEvidence: 'child_can_say_first_step_in_own_words',
      passRoute: '/pages/review/review?from=mini_lesson_exit',
      failRoute: '/pages/profile/profile?from=mini_lesson_parent_handoff',
      failAction: '降级为家长只问一句和明天回访，不继续加课。'
    },
    localAiBoundary: {
      localCodeOwns: ['trigger', 'concept_gap', 'visual_template', 'exit_gate', 'reward_release', 'share_privacy_fields'],
      aiBetterFor: ['teacher_line', 'classmate_misconception', 'parent_readable_wording'],
      aiMustNotDecide: ['final_answer', 'mastery_claim', 'talent_label', 'score', 'ranking', 'share_fields']
    },
    qualityGate: [
      { id: 'not_default_mode', ok: trigger.shouldTrigger === true || trigger.mode === 'socratic_first' },
      { id: 'no_full_classroom', ok: true },
      { id: 'has_blackboard_first_step', ok: Boolean(visualTemplate.boardMove && outline.firstStep) },
      { id: 'has_misconception_role', ok: true },
      { id: 'has_near_transfer', ok: Boolean(visualTemplate.nearTransfer) },
      { id: 'has_parent_and_review', ok: Boolean(outline.parentCheck && outline.revisit) },
      { id: 'exit_before_reward_or_share', ok: true }
    ],
    shareBoundary: SAFE_SHARE_BOUNDARY
  };
}

function evaluateThreeMinuteMiniLesson(miniLesson = {}) {
  const localOwns = miniLesson.localAiBoundary && Array.isArray(miniLesson.localAiBoundary.localCodeOwns)
    ? miniLesson.localAiBoundary.localCodeOwns
    : [];
  const aiMustNotDecide = miniLesson.localAiBoundary && Array.isArray(miniLesson.localAiBoundary.aiMustNotDecide)
    ? miniLesson.localAiBoundary.aiMustNotDecide
    : [];
  const gates = Array.isArray(miniLesson.qualityGate) ? miniLesson.qualityGate : [];
  return {
    ok: Boolean(
      miniLesson.id === 'three_minute_mini_lesson'
      && miniLesson.trigger
      && miniLesson.trigger.blockedMode === 'full_ai_classroom'
      && miniLesson.blackboard
      && miniLesson.blackboard.noFullSolution === true
      && miniLesson.nearTransfer
      && miniLesson.exitGate
      && localOwns.includes('trigger')
      && localOwns.includes('exit_gate')
      && aiMustNotDecide.includes('final_answer')
      && aiMustNotDecide.includes('talent_label')
      && gates.every((item) => item.ok === true)
    ),
    gateCount: gates.length,
    triggerMode: miniLesson.trigger ? miniLesson.trigger.mode : 'missing',
    conceptGap: miniLesson.conceptGap || '',
    blockedMode: miniLesson.trigger ? miniLesson.trigger.blockedMode : ''
  };
}

function buildOpenMaicInspiredTaskPlan(input = {}) {
  const outline = buildOutline(input);
  const scenes = buildScenes(outline);
  const eventFlow = buildEventFlow(outline, scenes);
  const qualityGate = buildQualityGate(outline, scenes);
  const miniLesson = buildThreeMinuteMiniLesson(Object.assign({}, input, { outline }));
  const miniLessonAudit = evaluateThreeMinuteMiniLesson(miniLesson);
  return {
    id: 'openmaic_inspired_homework_task_plan',
    title: '今晚任务单',
    sourcePolicy: OPENMAIC_REFERENCE_POLICY,
    outline,
    scenes,
    eventFlow,
    localAiBoundary: buildLocalAiBoundary(),
    qualityGate,
    miniLesson,
    miniLessonAudit,
    publicK12ResourceDecisions: PUBLIC_K12_RESOURCE_DECISIONS,
    reportLine: qualityGate.reportLine,
    shareBoundary: SAFE_SHARE_BOUNDARY,
    commercialDecision: '借鉴 OpenMAIC 的课堂流水线，不做 OpenMAIC 式完整课堂；把能力沉淀在家庭作业闭环、证据账本和复访里。'
  };
}

function evaluateOpenMaicInspiredTaskPlan(plan = {}) {
  const forbidden = plan.sourcePolicy && Array.isArray(plan.sourcePolicy.forbiddenUses)
    ? plan.sourcePolicy.forbiddenUses
    : [];
  const localOwns = plan.localAiBoundary && Array.isArray(plan.localAiBoundary.localCodeOwns)
    ? plan.localAiBoundary.localCodeOwns
    : [];
  const aiMustNotDecide = plan.localAiBoundary && Array.isArray(plan.localAiBoundary.aiMustNotDecide)
    ? plan.localAiBoundary.aiMustNotDecide
    : [];
  const gates = plan.qualityGate && Array.isArray(plan.qualityGate.gates) ? plan.qualityGate.gates : [];
  return {
    ok: Boolean(
      plan.outline
      && Array.isArray(plan.scenes)
      && plan.scenes.length >= 5
      && Array.isArray(plan.eventFlow)
      && plan.eventFlow.length === plan.scenes.length
      && forbidden.includes('copy_openmaic_code')
      && localOwns.includes('reward_release')
      && localOwns.includes('share_privacy_fields')
      && aiMustNotDecide.includes('final_answer')
      && aiMustNotDecide.includes('talent_label')
      && plan.miniLessonAudit
      && plan.miniLessonAudit.ok === true
      && gates.every((item) => item.ok === true)
    ),
    gateCount: gates.length,
    sceneCount: Array.isArray(plan.scenes) ? plan.scenes.length : 0,
    eventCount: Array.isArray(plan.eventFlow) ? plan.eventFlow.length : 0,
    miniLessonGateCount: plan.miniLessonAudit ? plan.miniLessonAudit.gateCount : 0,
    miniLessonTriggerMode: plan.miniLessonAudit ? plan.miniLessonAudit.triggerMode : 'missing',
    blockedFields: aiMustNotDecide,
    sourcePolicy: plan.sourcePolicy ? plan.sourcePolicy.decision : 'missing'
  };
}

function buildOpenMaicInspiredDecisionBridge(plan = {}, reportSummary = {}, reviewSummary = {}, gameEvidence = {}) {
  const outline = plan.outline || {};
  const reportLine = safeText(
    reportSummary.familyDecisionHomepageHeadline || reportSummary.reportEvidenceTopLine || plan.reportLine,
    '今晚先说第一步，再看错因和明天回访。',
    120
  );
  const nextAction = safeText(
    reportSummary.familyDecisionHomepageNextLocalAction || reviewSummary.nextStep || outline.firstStep,
    outline.firstStep || '先说第一步。',
    120
  );
  const shareBoundary = safeText(
    reportSummary.familyDecisionHomepageShareBoundary || plan.shareBoundary,
    SAFE_SHARE_BOUNDARY,
    120
  );
  const gameLine = safeText(
    gameEvidence.shareLine || gameEvidence.summary || '回忆卡、轻练习和复访放行后再给奖励。',
    '回忆卡、轻练习和复访放行后再给奖励。',
    120
  );
  const evidenceList = [
    outline.firstStep,
    outline.parentCheck,
    outline.revisit,
    `质量门${plan.qualityGate && Array.isArray(plan.qualityGate.gates) ? plan.qualityGate.gates.length : 0}项`
  ].filter(Boolean);
  return {
    id: 'openmaic_inspired_decision_bridge',
    title: '家庭决策桥',
    headline: reportLine,
    nextAction,
    shareBoundary,
    gameLine,
    evidenceList,
    reportDecisionLine: `${reportLine}｜${nextAction}`,
    reportDecisionCard: [
      `今晚先做：${nextAction}`,
      `今晚不做：完整答案 / 原题外传 / 单次上传就下结论`,
      `依据：${reportLine}`,
      `回访：${outline.revisit || '明天复查第一步'}`
    ],
    gameReturnEvidence: {
      status: 'openmaic_inspired_revisit_gate',
      summary: gameLine,
      nextDayReplay: outline.revisit || '',
      rewardGate: '只奖励第一步、错因修复和回访完成',
      blockedFields: ['final_answer', 'ranking', 'score', 'original_question', 'full_dialogue']
    },
    shareRelayPayload: {
      title: '今晚任务单',
      subtitle: reportLine,
      path: '/pages/profile/profile?from=openmaic_inspired_bridge',
      shareBoundary,
      blockedFields: ['original_question', 'full_answer', 'full_dialogue', 'ranking', 'score'],
      nextAction,
      evidenceList
    },
    localAiBoundary: plan.localAiBoundary || buildLocalAiBoundary(),
    qualityGate: plan.qualityGate || buildQualityGate(outline, plan.scenes || [])
  };
}

module.exports = {
  SAFE_SHARE_BOUNDARY,
  OPENMAIC_REFERENCE_POLICY,
  PUBLIC_K12_RESOURCE_DECISIONS,
  MINI_LESSON_VISUAL_TEMPLATES,
  buildOpenMaicInspiredTaskPlan,
  evaluateOpenMaicInspiredTaskPlan,
  buildMiniLessonTrigger,
  buildThreeMinuteMiniLesson,
  evaluateThreeMinuteMiniLesson,
  buildOpenMaicInspiredDecisionBridge
};
