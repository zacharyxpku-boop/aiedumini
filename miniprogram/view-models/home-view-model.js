const storage = require('../utils/storage');

const UNSAFE_KEY_RE = /^[a-z]+(?:_[a-z0-9]+)+$|[a-z]+[A-Z][a-zA-Z]+/;

const COMPANION_HOME_COPY = {
  gudian: '咕点：把材料发来，我先帮你拆出可验证的一步。'
};

function safeText(value, fallback = '学习建议') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text || UNSAFE_KEY_RE.test(text)) return fallback;
  return text.slice(0, 90);
}

function companionPreference(input) {
  if (storage.buildCompanionPreference) return storage.buildCompanionPreference(input || {});
  return Object.assign({ selectedCompanion: 'gudian', selectedLabel: '咕点' }, input || {});
}

function companionStrip(input) {
  const preference = companionPreference(input);
  return COMPANION_HOME_COPY[preference.selectedCompanion] || COMPANION_HOME_COPY.gudian;
}

function buildNextStep(input) {
  if (input && input.miniLessonResume) {
    return {
      text: `下一步：接上 ${safeText(input.miniLessonResume.topicLabel || input.miniLessonResume.conceptGap, '3 分钟小讲堂')}。`,
      cta: '继续小讲堂',
      action: 'miniLesson'
    };
  }
  return null;
}

function buildMiniLessonResume(input = {}) {
  const source = input.miniLessonResume || null;
  if (!source) return null;
  return {
    id: source.id || 'mini_lesson_resume',
    title: '继续 3 分钟小讲堂',
    topicLabel: safeText(source.topicLabel || source.title || source.conceptGap, '当前概念缺口'),
    blackboardLine: safeText(source.blackboardLine || source.firstStep || source.prompt, '先说出第一步'),
    parentLine: safeText(source.parentLine || source.backPrompt || source.parentCheck, '家长只问这一题第一步先看什么'),
    nextDayReview: safeText(source.nextDayReview || source.revisit, '明天换一题只复述第一步'),
    route: source.route || '/pages/review/review?from=home_mini_lesson_resume',
    blockedFields: ['原题', '完整答案', '分数', '排名', '天赋标签', '孩子姓名', '家长联系方式']
  };
}

function buildReportServiceResume(input = {}) {
  if (input.reportServiceResume) return input.reportServiceResume;
  const reportState = input.learningReportState || {};
  const handoff = input.uploadReportHandoff || {};
  const servicePathway = input.servicePathway || reportState.servicePathway || handoff.servicePathway || null;
  const ledger = servicePathway && servicePathway.partnerServiceDeliveryLedger
    ? servicePathway.partnerServiceDeliveryLedger
    : null;
  const parentConfirmed = !!(
    reportState.parentConfirmed ||
    handoff.parentConfirmed ||
    input.parentConfirmed ||
    (ledger && ledger.status === 'deliverable_after_parent_confirmation')
  );
  if (!servicePathway && !handoff.title && !reportState.reportDraft) return null;
  const primaryMode = servicePathway && servicePathway.primaryMode ? servicePathway.primaryMode : {};
  const validationPlan = servicePathway && Array.isArray(servicePathway.validationPlan)
    ? servicePathway.validationPlan
    : [];
  const firstValidation = validationPlan[0] || {};
  return {
    id: 'home_report_service_resume',
    title: safeText(handoff.title || '继续家庭方案验证', '继续家庭方案验证'),
    statusLine: parentConfirmed
      ? '家长已确认交付范围，可以进入7天验证。'
      : '家长还未确认交付范围，先确认再进入合作交付。',
    modeLine: primaryMode.label
      ? `建议模式：${safeText(primaryMode.label, '苏格拉底1对1')}`
      : '建议模式：先用苏格拉底1对1，必要时补小讲堂。',
    actionLine: safeText(
      firstValidation.action || (servicePathway && servicePathway.nextAction) || handoff.line,
      '本次先做一个最小动作，并留下孩子自己的第一步证据。'
    ),
    parentGateLine: parentConfirmed
      ? '放行：只交付行动、家长问题和下一条证据。'
      : '待确认：不向合作方交付原题、答案、分数、排名、姓名或联系方式。',
    cta: parentConfirmed ? '继续7天验证' : '去确认交付范围',
    route: parentConfirmed
      ? '/pages/profile/profile?from=home_report_service_resume'
      : '/pages/upload/upload?from=home_report_service_resume',
    blockedFields: ['原题', '完整答案', '照片', '分数', '排名', '天赋标签', '姓名', '联系方式']
  };
}

function buildPrimaryHomeNextAction(input = {}) {
  const candidates = [];
  if (input.reportServiceResume) {
    candidates.push({
      type: 'report_action',
      priority: 10,
      dispatchCode: 1,
      kicker: '报告建议',
      title: safeText(input.reportServiceResume.title, '继续家庭方案验证'),
      body: safeText(input.reportServiceResume.actionLine || input.reportServiceResume.statusLine, '本次只做一个最小动作。'),
      cta: safeText(input.reportServiceResume.cta, '继续行动')
    });
  }
  if (input.miniLessonResume) {
    candidates.push({
      type: 'mini_lesson',
      priority: 20,
      dispatchCode: 2,
      kicker: '3 分钟小课堂',
      title: safeText(input.miniLessonResume.topicLabel || input.miniLessonResume.title, '继续小课堂'),
      body: `小黑板：${safeText(input.miniLessonResume.blackboardLine, '先说出第一步')}`,
      cta: '继续小课堂'
    });
  }
  if (input.yesterdayReviewCard) {
    candidates.push({
      type: 'review_return',
      priority: 30,
      dispatchCode: 3,
      kicker: '短回访',
      title: safeText(input.yesterdayReviewCard.noticeText, '接上昨天那一步'),
      body: safeText(input.yesterdayReviewCard.childArticulatedStep, '先复述昨天的第一步。'),
      cta: '继续回访'
    });
  }
  if (input.incomingShareRelay) {
    const receiverAction = input.incomingShareRelay.defaultReceiverAction || {};
    candidates.push({
      type: 'share_return',
      priority: 40,
      dispatchCode: 4,
      kicker: '学习复盘卡',
      title: safeText(input.incomingShareRelay.title || input.incomingShareRelay.defaultReceiverActionTitle, '接住一个学习动作'),
      body: safeText(input.incomingShareRelay.defaultReceiverActionLine || input.incomingShareRelay.summary, '只接第一步、错因和回访动作。'),
      cta: safeText(receiverAction.displayLabel, '接力这一小步')
    });
  }
  const selected = candidates.sort((a, b) => a.priority - b.priority)[0];
  const fallback = selected || {
    type: 'first_step',
    priority: 90,
    dispatchCode: 6,
    kicker: '学习建议',
    title: '先上传材料或题目',
    body: '作业、错题、测评或一句题目描述都可以，先生成能执行的下一步。',
    cta: '开始处理'
  };
  return {
    priority: fallback.priority,
    dispatchCode: fallback.dispatchCode,
    kicker: fallback.kicker,
    title: fallback.title,
    body: fallback.body,
    cta: fallback.cta
  };
}

function buildHomeViewModel(input = {}) {
  const hasPlanOrFocus = false;
  const miniLessonResume = buildMiniLessonResume(input);
  const reportServiceResume = buildReportServiceResume(input);
  const primaryNextAction = buildPrimaryHomeNextAction(Object.assign({}, input, {
    miniLessonResume,
    reportServiceResume
  }));
  return {
    routePill: hasPlanOrFocus ? '已分析 · 继续下一步' : '先处理材料',
    companionStrip: companionStrip(input.companionPreference),
    title: hasPlanOrFocus ? '已看清下一步' : '把材料发过来',
    subtitle: hasPlanOrFocus ? '接下来进 AI 点拨或短回访，不在首页堆完整方案。' : '孩子可以上传材料，也可以直接说题目。',
    inputCard: {
      title: hasPlanOrFocus ? '修改情况后重新分析' : '用文字补充情况',
      placeholder: '比如：数学方程 8 道，应用题第一步不清楚；也可以先上传材料。',
      helper: hasPlanOrFocus
        ? '材料变了就重新分析；卡住进 AI 点拨，做完进短回访。'
        : '不用写长，先说题目、材料或第一步线索；这里不直接给答案。'
    },
    primaryCta: hasPlanOrFocus ? '重新分析材料' : '分析材料',
    secondaryAction: '直接去 AI 点拨',
    teacherPickerLabel: '咕点在旁边',
    teacherPickerHint: '把材料发来，我先帮你拆出可验证的一步。',
    selectedCompanionLabel: safeText((companionPreference(input.companionPreference) || {}).selectedLabel, '咕点'),
    emptyState: hasPlanOrFocus ? null : '还没有分析结果。先上传材料或进入 AI 点拨。',
    primaryNextAction,
    nextStep: buildNextStep(Object.assign({}, input, { miniLessonResume })),
    miniLessonResume,
    reportServiceResume,
    debugWarnings: []
  };
}

module.exports = {
  buildHomeViewModel,
  buildPrimaryHomeNextAction
};
