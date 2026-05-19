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

function buildOpenMaicInspiredTaskPlan(input = {}) {
  const outline = buildOutline(input);
  const scenes = buildScenes(outline);
  const eventFlow = buildEventFlow(outline, scenes);
  const qualityGate = buildQualityGate(outline, scenes);
  return {
    id: 'openmaic_inspired_homework_task_plan',
    title: '今晚任务单',
    sourcePolicy: OPENMAIC_REFERENCE_POLICY,
    outline,
    scenes,
    eventFlow,
    localAiBoundary: buildLocalAiBoundary(),
    qualityGate,
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
      && gates.every((item) => item.ok === true)
    ),
    gateCount: gates.length,
    sceneCount: Array.isArray(plan.scenes) ? plan.scenes.length : 0,
    eventCount: Array.isArray(plan.eventFlow) ? plan.eventFlow.length : 0,
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
  buildOpenMaicInspiredTaskPlan,
  evaluateOpenMaicInspiredTaskPlan,
  buildOpenMaicInspiredDecisionBridge
};
