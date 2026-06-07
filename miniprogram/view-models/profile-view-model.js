const storage = require('../utils/storage');

const COMPANION_PROFILE_COPY = {
  gudian: '咕点帮你整理成家长能看懂的一句话。'
};

const UNSAFE_KEY_RE = /^[a-z]+(?:_[a-z0-9]+)+$|[a-z]+[A-Z][a-zA-Z]+/;
const INSUFFICIENT_PROOF = '再积累几次真实记录后，咕点会帮你看见孩子常卡在哪一类证据。';

function safeText(value, fallback = '先说第一步') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text || UNSAFE_KEY_RE.test(text)) return fallback;
  return text.slice(0, 100);
}

function companionPreference(input) {
  if (storage.buildCompanionPreference) return storage.buildCompanionPreference(input || {});
  return Object.assign({ selectedCompanion: 'gudian', selectedLabel: '咕点' }, input || {});
}

function companionStrip(input) {
  const preference = companionPreference(input);
  return COMPANION_PROFILE_COPY[preference.selectedCompanion] || COMPANION_PROFILE_COPY.gudian;
}

function firstReviewCard(input) {
  const cards = input && input.reviewCards;
  if (Array.isArray(cards) && cards.length) return cards[0];
  return input && input.reviewCard;
}

function firstStepEvidence(input = {}) {
  const todayFocus = input.todayFocus || {};
  const latest = input.latestFocusSession || {};
  const target = latest.focusTarget || {};
  const card = firstReviewCard(input) || {};
  const cardPlan = card.nextPracticePlan || {};
  const systemStep = todayFocus.systemSuggestedStep
    || latest.linkedSystemSuggestedStep
    || target.linkedSystemSuggestedStep
    || todayFocus.miniActionText
    || card.childArticulatedStep
    || card.checkpoint
    || cardPlan.checkpoint
    || card.parentPrompt
    || '';
  const childStep = todayFocus.childArticulatedStep
    || todayFocus.childStepSentence
    || latest.linkedChildArticulatedStep
    || target.linkedChildArticulatedStep
    || card.childArticulatedStep
    || '';
  const stuck = todayFocus.stuckPointText
    || todayFocus.sourceText
    || todayFocus.thought
    || latest.linkedStuckPointText
    || target.linkedStuckPointText
    || todayFocus.title
    || card.question
    || card.weakPoint
    || card.wrongCauseLabel
    || '';
  const displayStep = childStep || systemStep || target.title || card.answer || card.question || '';
  return {
    stuckPointText: safeText(stuck, '本次第一步还没记录清楚'),
    systemSuggestedStep: safeText(systemStep, '咕点建议先看题目问什么'),
    childArticulatedStep: safeText(childStep, ''),
    displayStep: safeText(displayStep, '先把题目问什么说出来'),
    hasChildStep: !!(childStep || systemStep || card.id),
    latestFocusSession: latest && latest.id ? latest : null,
    latestReviewCard: card && card.id ? card : null
  };
}

function proofSummary(input = {}) {
  const history = Array.isArray(input.focusHistory) ? input.focusHistory : [];
  const focus = input.todayFocus || null;
  const recentSummary = input.recentLearningSummary || {};
  const latest3 = Array.isArray(recentSummary.latest3) ? recentSummary.latest3 : [];
  const latest7 = Array.isArray(recentSummary.latest7) ? recentSummary.latest7 : [];
  const cards = Array.isArray(input.reviewCards) ? input.reviewCards : [];
  const cardSteps = cards.filter((card) => card && (
    card.childArticulatedStep ||
    card.checkpoint ||
    card.parentPrompt ||
    (card.nextPracticePlan && card.nextPracticePlan.checkpoint)
  )).length;
  const childSteps = [focus].concat(history).filter((item) => item && (item.childArticulatedStep || item.linkedChildArticulatedStep)).length + cardSteps;
  const taskBound = history.filter((item) => item && item.taskBound).length;
  const revisits = (Array.isArray(input.reviewEvents) ? input.reviewEvents : []).filter((event) => {
    const type = event && (event.type || event.kind);
    return type === 'today_focus_review_card_created' || type === 'focus_revisit';
  }).length;
  const threeNightText = latest3.length >= 3
    ? `最近 3 次：${latest3.filter((item) => item.firstSteps > 0).length} 次确认第一步，${latest3.filter((item) => item.completedFocus > 0 || item.interruptedFocus > 0).length} 次留下专注痕迹。`
    : INSUFFICIENT_PROOF;
  const sevenNightText = latest7.length >= 7
      ? `最近 7 次：${recentSummary.firstStepDays || 0} 次确认第一步，${recentSummary.focusDays || 0} 次专注，${recentSummary.gameDays || 0} 次短回访。`
    : INSUFFICIENT_PROOF;
  return {
    oneNightProof: history.length || focus
      ? `本次看见了：孩子说出第一步 ${childSteps} 次，围绕第一步坐下 ${taskBound} 次。`
      : INSUFFICIENT_PROOF,
    threeNightPattern: threeNightText,
    sevenNightReadiness: sevenNightText,
    weeklyPattern: sevenNightText,
    localEvidenceDays: latest7.length,
    recentFirstStepCount: childSteps,
    recentFocusEvidence: taskBound,
    recentRevisitEvidence: revisits
  };
}

function buildParentRecap(input = {}) {
  const evidence = firstStepEvidence(input);
  const proof = proofSummary(input);
  const interrupted = evidence.latestFocusSession && evidence.latestFocusSession.completionType === 'interrupted';
  const focusLine = evidence.latestFocusSession
    ? (interrupted ? '中途停下也算开始过。' : '已经围绕这一小步坐过一段。')
    : '还没有进入专注舱留下痕迹。';
  return {
    evidenceRecap: `本次证据显示：${evidence.stuckPointText}`,
    parentOneQuestion: '你可以只问一句：刚才你第一步先看了哪里？',
    firstStepLine: `他先迈出的第一步是：${evidence.displayStep}`,
    recentFirstStepCount: proof.recentFirstStepCount,
    recentFocusEvidence: focusLine,
    recentRevisitEvidence: proof.recentRevisitEvidence ? `已留下 ${proof.recentRevisitEvidence} 次短回访痕迹。` : '明天轻轻回访后会留下记录。',
    trustBoundaryNote: evidence.hasChildStep
      ? '咕点没有给答案，也没有直接给结果，只记录孩子自己说出的第一步。'
      : '咕点没有给答案，也没有直接给结果，只先整理一个可开始的第一步。',
    oneNightProof: proof.oneNightProof,
    threeNightPattern: proof.threeNightPattern,
    sevenNightReadiness: proof.sevenNightReadiness,
    weeklyPattern: proof.weeklyPattern,
    localEvidenceDays: proof.localEvidenceDays
  };
}

function buildParentEvidenceStrip(input = {}) {
  const recap = buildParentRecap(input);
  return {
    title: '为什么这样问',
    subtitle: '只用本机学习痕迹，不贴长期标签。',
    items: [
      {
        id: 'first_step',
        label: '第一步',
        value: recap.recentFirstStepCount ? `${recap.recentFirstStepCount} 次` : '待记录',
        line: recap.firstStepLine
      },
      {
        id: 'focus_trace',
        label: '专注痕迹',
        value: recap.recentFocusEvidence.indexOf('还没有') >= 0 ? '待补' : '已留下',
        line: recap.recentFocusEvidence
      },
      {
        id: 'revisit_trace',
        label: '短回访',
        value: recap.recentRevisitEvidence.indexOf('已留下') >= 0 ? recap.recentRevisitEvidence.replace(/^已留下\s*/, '').replace(/痕迹。$/, '') : '明天看',
        line: recap.recentRevisitEvidence
      }
    ]
  };
}

function buildGrowthMemoryCard(input) {
  const recap = buildParentRecap(input || {});
  return {
    title: '这几次先看证据',
    body: recap.threeNightPattern,
    tomorrow: recap.sevenNightReadiness === INSUFFICIENT_PROOF ? '' : recap.sevenNightReadiness,
    week: recap.weeklyPattern,
    localEvidenceDays: recap.localEvidenceDays,
    empty: recap.threeNightPattern === INSUFFICIENT_PROOF,
    collapsed: true
  };
}

function buildPrimaryCard(input) {
  const recap = buildParentRecap(input || {});
  return {
    title: '家长 5 秒看懂',
    parentRecap: recap,
    sections: [
      {
        id: 'evidenceRecap',
        className: '',
        label: '本次证据显示',
        text: recap.evidenceRecap
      },
      {
        id: 'firstStep',
        className: '',
        label: '他先迈出的第一步',
        text: recap.firstStepLine
      },
      {
        id: 'oneQuestion',
        className: 'parent-one-question',
        label: '家长只问一句',
        text: recap.parentOneQuestion
      },
      {
        id: 'focusEvidence',
        className: '',
        label: '专注证据',
        text: recap.recentFocusEvidence
      },
      {
        id: 'trustBoundary',
        className: '',
        label: '信任边界',
        text: recap.trustBoundaryNote
      }
    ]
  };
}

function buildProfileViewModel(input = {}) {
  const hasFocus = !!(input.todayFocus && input.todayFocus.id !== null);
  const parentRecap = buildParentRecap(input);
  return {
    routePill: '家长复盘 · 5 秒看证据',
    companionStrip: companionStrip(input.companionPreference),
    title: '家长只问这一句',
    subtitle: '不是看分数，是看孩子有没有说出第一步、围绕它坐过一段。',
    parentRecap,
    parentEvidenceStrip: buildParentEvidenceStrip(input),
    primaryCard: buildPrimaryCard(input),
    primaryCta: '查看证据详情',
    growthMemoryCard: buildGrowthMemoryCard(input),
    quickSections: [
      { id: 'learning-records', title: '更多学习记录', collapsed: true },
      { id: 'review-share', title: '复盘卡与分享记录', collapsed: true },
      { id: 'light-practice', title: '回访验证记录', collapsed: true }
    ],
    emptyState: hasFocus ? null : '今天还没有第一步记录。先让孩子说一句哪一步没接上，咕点再整理给家长看。',
    nextStep: hasFocus ? parentRecap.oneNightProof : '',
    debugWarnings: []
  };
}

module.exports = {
  buildProfileViewModel,
  formatMiniActionText: safeText,
  formatGrowthMemoryLine: buildGrowthMemoryCard,
  buildParentRecap,
  buildParentEvidenceStrip,
  proofSummary
};
