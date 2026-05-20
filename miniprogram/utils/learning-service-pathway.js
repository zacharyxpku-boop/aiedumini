'use strict';

const MODE_CATALOG = [
  {
    id: 'socratic_private_tutor',
    label: '苏格拉底 1 对 1',
    fit: ['说不清第一步', '会想但容易乱', '需要低压追问'],
    action: '先问一个第一步问题，再让孩子用自己的话复述卡点。',
    route: '/pages/tutor/tutor?from=service_pathway&socratic=1'
  },
  {
    id: 'three_minute_mini_lesson',
    label: '3 分钟小课堂',
    fit: ['概念卡住', '需要小黑板', '连续两轮仍不会启动'],
    action: '只讲一个概念缺口，生成三帧小黑板和退出门槛。',
    route: '/pages/tutor/tutor?from=service_pathway&mini_lesson=1'
  },
  {
    id: 'game_recall',
    label: '游戏化轻复练',
    fit: ['会了容易忘', '需要重复巩固', '需要提高坚持度'],
    action: '用一局轻挑战复查同一错因，不奖励最终答案。',
    route: '/pages/arcade/arcade?from=service_pathway'
  },
  {
    id: 'parent_coaching',
    label: '家长陪伴方案',
    fit: ['亲子沟通紧张', '家长不知道怎么问', '作业时间拖长'],
    action: '给家长一条今晚能直接说的低压提问句。',
    route: '/pages/profile/profile?from=service_pathway&parent=1'
  },
  {
    id: 'online_method_course',
    label: '线上学习方法课',
    fit: ['审题方法薄弱', '错题整理无系统', '不会复盘'],
    action: '推荐学习方法课，只承接已被作业证据验证的问题。',
    route: '/pages/profile/profile?from=service_pathway&course=method'
  },
  {
    id: 'wrong_question_repair_course',
    label: '错题修复课',
    fit: ['同类错因反复出现', '变式迁移不稳', '需要题型化修复'],
    action: '按错因进入短周期修复课，先看第一步和近迁移。',
    route: '/pages/review/review?from=service_pathway&course=wrong_question'
  }
];

const PRODUCT_TIERS = [
  {
    id: 'assessment_upgrade',
    label: '测评升级包',
    promise: '报告后补一份 AI 学习方案和 7 天验证任务。',
    entryGate: '有测评/观察材料，但仍需真实作业证据确认。',
    blockedClaims: ['天赋定论', '一次报告决定长期能力', '自动判分']
  },
  {
    id: 'seven_day_companion',
    label: '7 天陪跑',
    promise: '每天一个小任务，验证学习方式是否真的适合孩子。',
    entryGate: '至少有一个真实卡点、错因或家长观察。',
    blockedClaims: ['结果承诺', '替代老师教学', '排名承诺']
  },
  {
    id: 'thirty_day_camp',
    label: '30 天训练营',
    promise: '把高频错因沉淀为课程、复练、家长复盘的稳定节奏。',
    entryGate: '7 天内出现可复现的错因或复习断点。',
    blockedClaims: ['押题', '整卷答案', '公开孩子隐私材料']
  },
  {
    id: 'high_touch_planning',
    label: '高阶学习规划服务',
    promise: '对高需求家庭做阶段规划、课程组合和复盘咨询。',
    entryGate: '家长明确需要长期规划，且已有多源学习证据。',
    blockedClaims: ['医学/心理诊断', '不可验证的能力标签', '包结果']
  }
];

const AI_LOCAL_DELIVERY_SPLIT = [
  {
    id: 'local_release_gate',
    label: '本地代码负责放行',
    owns: ['资料类型识别', '证据是否补齐', '报告/游戏/分享能否放行', '隐私字段拦截'],
    reason: '这些是安全和商业可信度问题，不能交给 AI 临场判断。'
  },
  {
    id: 'ai_expression_layer',
    label: 'AI 负责表达和追问',
    owns: ['测评摘要改写', '苏格拉底追问', '小讲堂一句话解释', '家长可读话术'],
    reason: '这些需要自然语言适配孩子和家长，用 AI 更有弹性。'
  },
  {
    id: 'hybrid_validation_loop',
    label: '混合验证学习方法',
    owns: ['AI 给方法候选', '本地生成 7 天验证任务', '错题/回访确认是否适合'],
    reason: '测评只能给假设，真实作业证据决定是否继续。'
  }
];

const AI_LOCAL_DECISION_MATRIX = [
  {
    id: 'socratic_question_wording',
    module: '苏格拉底点拨',
    betterOwner: 'ai',
    aiUse: '根据孩子当前表达改写追问语气、类比和鼓励方式。',
    localRule: '本地代码决定题型轴、提示层级、答案拦截和是否切入小讲堂。',
    releaseGate: 'blocked_answer_request_must_fallback_to_first_step'
  },
  {
    id: 'mini_lesson_mode_route',
    module: '3 分钟小讲堂',
    betterOwner: 'local_code',
    aiUse: '只生成 AI 老师一句话和 AI 同学常见误区。',
    localRule: '本地代码决定触发阈值、三帧小黑板、退出票据、回访卡和游戏解锁。',
    releaseGate: 'child_exit_ticket_required'
  },
  {
    id: 'learning_preference_report',
    module: '学习偏好/测评资料报告',
    betterOwner: 'hybrid',
    aiUse: '把测评摘要改写成家长能理解的学习方法候选。',
    localRule: '本地代码阻断天赋定性、分数排名、提分承诺，并生成 7 天验证计划。',
    releaseGate: 'assessment_requires_real_homework_evidence'
  },
  {
    id: 'game_recall_and_xp',
    module: '游戏化轻复练',
    betterOwner: 'local_code',
    aiUse: '改写挑战文案和鼓励语。',
    localRule: '本地代码决定 XP、间隔复习、失败重练、排行榜禁用和分享字段。',
    releaseGate: 'reward_only_first_step_wrong_cause_revisit'
  },
  {
    id: 'parent_partner_handoff',
    module: '家长/合作方交付包',
    betterOwner: 'local_code',
    aiUse: '生成低压家长话术和服务候选摘要。',
    localRule: '本地代码只放行今晚行动、家长问题、下一证据和服务候选。',
    releaseGate: 'private_fields_removed_before_partner_view'
  }
];

const SEVEN_DAY_VALIDATION_PLAN = [
  { day: 1, label: '今晚', action: '只试一个学习方法候选，并记录孩子自己的第一步。', evidence: 'child_first_step' },
  { day: 2, label: '明天', action: '遮住答案回访同一第一步，看是否转身还记得。', evidence: 'next_day_revisit' },
  { day: 3, label: '第 3 天', action: '换一道同题型小变式，只看是否能迁移第一步。', evidence: 'near_transfer' },
  { day: 5, label: '第 5 天', action: '进入一局轻复练，验证错因是否复现。', evidence: 'game_recall' },
  { day: 7, label: '第 7 天', action: '家长复盘：保留、降级或换一种学习方法。', evidence: 'family_decision' }
];

const COMMERCIAL_CLAIM_BLOCKLIST = [
  '提分承诺',
  '保证成绩提升',
  '保分',
  '升学承诺',
  '天赋定性',
  '一次报告决定长期能力',
  '自动判分',
  '整卷答案',
  '排名承诺'
];

const PARTNER_HANDOFF_POLICY = {
  id: 'partner_handoff_policy',
  visibleToPartner: ['tonight_action', 'parent_question', 'next_evidence', 'service_candidate'],
  blockedFields: ['original_question', 'photo', 'full_answer', 'score', 'ranking', 'talent_label', 'full_dialogue'],
  rule: '合作方只看服务候选、今晚行动和下一条证据；不看原题、照片、完整答案、分数排名、天赋标签或完整对话。',
  releaseGate: 'parent_confirmed_and_private_fields_removed'
};

const MODE_CHOICE_GUARDRAILS = [
  {
    id: 'socratic_stays_default',
    rule: 'Socratic 1:1 stays the default first move when the child has a real stuck point.'
  },
  {
    id: 'mini_lesson_is_rescue',
    rule: 'Mini lesson opens only for concept, visual, or repeated-start failures; it must end with an exit ticket.'
  },
  {
    id: 'game_after_evidence',
    rule: 'Game recall opens after a first-step or wrong-cause signal, not from assessment labels alone.'
  },
  {
    id: 'parent_confirms_service',
    rule: 'Parent confirms before any course, camp, or partner handoff is shown as a service candidate.'
  }
];

function textOf(value) {
  return String(value || '').trim();
}

function includesAny(text, tokens) {
  const source = textOf(text);
  return tokens.some((token) => source.indexOf(token) >= 0);
}

function inferSignals(input = {}) {
  const sourceText = textOf(input.sourceText || input.text);
  const schemaId = textOf(input.sourceSchemaId || input.sourceSchema || (input.decisionSource && input.decisionSource.sourceSchemaId));
  const structured = input.structuredEvidenceSignals || {};
  const reportDraft = input.reportDraft || {};
  const behavior = reportDraft.behaviorSignals || {};
  const wrongCause = textOf(structured.wrongCause || structured.wrongCauseGuess || behavior.wrongCause);
  const firstStep = textOf(structured.firstStep || structured.stuckFirstStep || behavior.firstStep);
  const questionType = textOf(structured.questionType || behavior.questionType);
  return {
    schemaId,
    sourceText,
    wrongCause,
    firstStep,
    questionType,
    hasTaskClassification: !!questionType,
    hasRealTaskEvidence: !!(wrongCause || firstStep || input.cardId || Number(input.importedCards || 0) > 0),
    hasAssessment: schemaId === 'talent_assessment' || includesAny(sourceText, ['测评', '学习偏好', '视觉', '听觉', '报告']),
    hasWrongQuestion: schemaId === 'wrong_question_paper' || schemaId === 'wrong_question_photo' || includesAny(sourceText, ['错题', '错因', '订正', '不会', '卡住']),
    hasSchoolFeedback: schemaId === 'school_material' || includesAny(sourceText, ['老师', '学校', '课堂', '作业反馈']),
    hasParentObservation: schemaId === 'parent_report' || includesAny(sourceText, ['家长', '晚上', '拖拉', '情绪', '观察']),
    needsBlackboard: includesAny(sourceText + wrongCause + firstStep, ['图', '小黑板', '物理', '化学', '地理', '几何', '电路', '光路']),
    needsMemory: includesAny(sourceText + wrongCause, ['忘', '复习', '反复', '同类', '变式', '迁移']),
    needsParentSupport: includesAny(sourceText, ['家长', '情绪', '拖拉', '不愿意', '沟通', '陪'])
  };
}

function pickModes(signals) {
  const ids = new Set(['socratic_private_tutor', 'parent_coaching']);
  if (signals.needsBlackboard || !signals.hasRealTaskEvidence) ids.add('three_minute_mini_lesson');
  if (signals.needsMemory || signals.hasWrongQuestion) ids.add('game_recall');
  if (signals.hasAssessment) ids.add('online_method_course');
  if (signals.hasWrongQuestion && signals.hasRealTaskEvidence) ids.add('wrong_question_repair_course');
  return MODE_CATALOG
    .filter((mode) => ids.has(mode.id))
    .map((mode, index) => Object.assign({}, mode, {
      priority: index + 1,
      localGate: mode.id === 'game_recall'
        ? '必须先有真实错因或第一步证据'
        : mode.id === 'online_method_course'
          ? '只按方法候选推荐，不把测评当定论'
          : '孩子能说出第一步或家长能补充观察'
    }));
}

function pickTiers(signals) {
  const tiers = [];
  if (signals.hasAssessment) tiers.push('assessment_upgrade');
  tiers.push('seven_day_companion');
  if (signals.hasWrongQuestion && signals.hasRealTaskEvidence) tiers.push('thirty_day_camp');
  if ((signals.hasAssessment && signals.hasParentObservation) || signals.hasSchoolFeedback) tiers.push('high_touch_planning');
  return PRODUCT_TIERS.filter((tier) => tiers.includes(tier.id));
}

function buildModeChoiceProtocol(signals, modeRecommendations, options = {}) {
  const recommended = modeRecommendations[0] || MODE_CATALOG[0];
  const hasRealTaskEvidence = !!(signals && signals.hasRealTaskEvidence);
  const choiceCards = modeRecommendations.map((mode) => {
    const isGame = mode.id === 'game_recall';
    const isMiniLesson = mode.id === 'three_minute_mini_lesson';
    const locked = (isGame && !hasRealTaskEvidence) || (mode.id === 'wrong_question_repair_course' && !hasRealTaskEvidence);
    return Object.assign({}, mode, {
      recommended: mode.id === recommended.id,
      childCanChoose: !locked,
      parentConfirmRequired: mode.id === 'online_method_course'
        || mode.id === 'wrong_question_repair_course'
        || mode.id === 'parent_coaching',
      choiceRole: isMiniLesson
        ? 'rescue_or_concept_bridge'
        : isGame
          ? 'memory_and_return_loop'
          : mode.id === 'socratic_private_tutor'
            ? 'default_private_tutor'
            : 'family_service_support',
      lockReason: locked ? 'requires_real_first_step_or_wrong_cause_evidence' : '',
      exitEvidenceRequired: isMiniLesson
        ? ['one_blackboard_frame', 'child_exit_ticket', 'near_transfer_prompt']
        : isGame
          ? ['recall_attempt', 'wrong_cause_revisit', 'parent_safe_share_line']
          : ['child_first_step', 'parent_one_question']
    });
  });
  return {
    id: 'family_learning_mode_choice_protocol',
    title: 'Family learning mode choice',
    recommendedModeId: recommended.id,
    recommendedModeLabel: recommended.label,
    childChoiceAllowed: choiceCards.some((card) => card.childCanChoose),
    parentConfirmRequired: true,
    choiceCards,
    guardrails: MODE_CHOICE_GUARDRAILS,
    decisionOrder: ['socratic_private_tutor', 'three_minute_mini_lesson', 'game_recall', 'parent_coaching', 'online_method_course', 'wrong_question_repair_course'],
    positioningLine: 'Classroom mode is a short rescue bridge; the main product remains a Socratic family tutor with evidence, review, parent action, and safe share loops.',
    releaseGate: options.releaseGate || (hasRealTaskEvidence ? 'mode_choice_requires_parent_confirmation' : 'mode_choice_requires_real_task_evidence')
  };
}

function buildLearningServicePathway(input = {}) {
  const signals = inferSignals(input);
  const modeRecommendations = pickModes(signals);
  const productTiers = pickTiers(signals);
  const firstMode = modeRecommendations[0] || MODE_CATALOG[0];
  const firstTier = productTiers[0] || PRODUCT_TIERS[1];
  const requiresEvidenceBeforeCommercialPush = signals.hasAssessment && !signals.hasRealTaskEvidence;
  const modeChoiceProtocol = buildModeChoiceProtocol(signals, modeRecommendations, {
    releaseGate: requiresEvidenceBeforeCommercialPush
      ? 'mode_choice_requires_real_task_evidence'
      : 'mode_choice_requires_parent_confirmation'
  });
  const quickAssessmentBridge = {
    id: 'quick_learning_preference_assessment',
    label: '小程序内 15 题学习偏好快测',
    route: '/pages/profile/profile?from=service_pathway&panel=report&quick_assessment=1',
    useWhen: '没有第三方测评，或测评只给了笼统标签时使用。',
    releaseRule: '快测结果只进入学习方法候选，必须用真实错题、隔天回访和第 7 天小变式验证。'
  };
  const validationPlan = SEVEN_DAY_VALIDATION_PLAN.map((item) => Object.assign({}, item, {
    locked: requiresEvidenceBeforeCommercialPush && item.day > 1,
    unlockRule: item.day === 1 ? '可立即执行' : '先补真实作业卡点和孩子第一步'
  }));
  const safeProductTiers = productTiers.map((tier) => Object.assign({}, tier, {
    blockedClaims: Array.from(new Set([].concat(tier.blockedClaims || [], COMMERCIAL_CLAIM_BLOCKLIST)))
  }));
  return {
    id: 'learning_service_pathway',
    status: requiresEvidenceBeforeCommercialPush ? 'needs_real_task_validation' : 'ready_for_family_plan',
    title: '学习服务路径建议',
    summary: requiresEvidenceBeforeCommercialPush
      ? '先把测评报告转成学习方法候选，再用真实错题或作业验证。'
      : '已可把本次材料接到今晚行动、轻复练、家长复盘和后续课程服务。',
    primaryMode: firstMode,
    primaryTier: firstTier,
    modeRecommendations,
    modeChoiceProtocol,
    productTiers: safeProductTiers,
    nextAction: requiresEvidenceBeforeCommercialPush
      ? '补一条真实错题/作业卡点，再放行课程或训练营建议。'
      : `先进入${firstMode.label}，再根据 7 天复盘决定是否进入${firstTier.label}。`,
    familyVisibleLine: requiresEvidenceBeforeCommercialPush
      ? '这份报告先帮助我们选择学习方式，不能直接给孩子贴标签。'
      : '这次材料已经能形成今晚任务、明天回访和下一阶段服务建议。',
    commercialLoop: [
      { step: '入口', owner: '合作/家长侧', action: '测评、错题、学校反馈或家长观察进入小程序' },
      { step: '方案', owner: '原点智学', action: '生成 AI 学习路径、第一步任务和家长话术' },
      { step: '验证', owner: '家庭', action: '7 天内用真实作业和回访验证学习方式' },
      { step: '转化', owner: '双方共营', action: '进入线上课、训练营或高阶学习规划' }
    ],
    quickAssessmentBridge,
    aiLocalDeliverySplit: AI_LOCAL_DELIVERY_SPLIT,
    aiLocalDecisionMatrix: AI_LOCAL_DECISION_MATRIX,
    validationPlan,
    partnerHandoffPolicy: Object.assign({}, PARTNER_HANDOFF_POLICY),
    moatLine: '护城河不在“生成一份测评结论”，而在测评、错题、回访、游戏和家长决策反复闭环后的家庭证据账本。',
    safetyBoundary: {
      allowed: ['学习方式建议', '第一步点拨', '家长陪伴话术', '课程/训练营候选'],
      blocked: Array.from(new Set(['天赋定论', '自动判分', '整卷答案', '结果承诺', '公开原题或孩子隐私材料'].concat(COMMERCIAL_CLAIM_BLOCKLIST))),
      releaseGate: requiresEvidenceBeforeCommercialPush
        ? 'assessment_requires_real_homework_evidence'
        : 'service_pathway_requires_parent_confirmation'
    },
    signals
  };
}

module.exports = {
  MODE_CATALOG,
  PRODUCT_TIERS,
  AI_LOCAL_DECISION_MATRIX,
  MODE_CHOICE_GUARDRAILS,
  inferSignals,
  buildModeChoiceProtocol,
  buildLearningServicePathway
};
