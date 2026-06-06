const reviewCards = require('../../utils/review-cards');
const storage = require('../../utils/storage');
const navigation = require('../../utils/navigation');
const api = require('../../utils/api');
const gameLogic = require('../../utils/game-logic');
const revisitEngine = require('../../utils/revisit-engine');
const reviewViewModels = require('../../view-models/review-view-model');

const DEFAULT_REVISIT_RUNWAY = {
  due: 0,
  level: 1,
  xp: 0,
  streak: 0,
  hearts: [],
  percent: 0,
  missionTitle: '完成今日复习目标',
  missionProgress: 0,
  missionHint: '先完成今天这一轮复习',
  rewards: [],
  primaryLabel: '录入错题',
  primaryAction: 'import'
};
const DEFAULT_MISTAKE_HUB = {
  totalMistakes: 0,
  appMistakes: 0,
  manualMistakes: 0,
  repairReady: 0,
  wrongToday: 0,
  weakSpot: null,
  repairItems: []
};

function reviewReadableRouteLine(route = '') {
  const value = String(route || '');
  if (value.indexOf('/pages/tutor/') >= 0) return '下一步：回到一对一点拨，只问第一步。';
  if (value.indexOf('/pages/profile/') >= 0) return '下一步：回到家长报告查看证据。';
  if (value.indexOf('/pages/upload/') >= 0) return '下一步：继续补材料证据。';
  return '下一步：完成本张卡后再决定是否继续。';
}

function reviewEvidenceThreadLine(id = '') {
  const value = String(id || '').trim();
  if (!value) return '';
  return '证据线：已绑定小讲堂回访卡，不展示内部编号。';
}

function reviewReadableDay7GateLine(gate = '') {
  const value = String(gate || '').trim();
  if (!value) return '';
  return '第 7 天复核：只看孩子能不能换一道小变式说第一步。';
}

Page({
  data: {
    summary: null,
    cards: [],
    current: null,
    index: 0,
    showAnswer: false,
    done: false,
    progressText: '0/0',
    feedbackText: '',
    importText: '',
    importPreview: [],
    importPlan: null,
    dailyLimit: 5,
    desiredRetention: 90,
    editQuestion: '',
    editAnswer: '',
    editOpen: false,
    suspendedCards: [],
    buriedCards: [],
    browserQuery: '',
    browserStatus: 'all',
    browserSource: 'all',
    browserType: 'all',
    browserTemplate: 'all',
    browserCards: [],
    deckSnapshotText: '',
    sessionMode: 'smart',
    sessionFeedback: null,
    quizRunning: false,
    quizIndex: 0,
    quizCurrent: null,
    quizAnswers: [],
    quizShowAnswer: false,
    quizFeedback: null,
    reviewPlaybook: null,
    revisitProofCard: null,
    revisitRunway: DEFAULT_REVISIT_RUNWAY,
    playableReviewTools: [],
    activeReviewTool: null,
    practiceTemplateWorkshop: null,
    practiceTemplatePack: null,
    practiceTemplateWorkbench: null,
    mistakeHub: DEFAULT_MISTAKE_HUB,
    reviewViewModel: reviewViewModels.buildReviewViewModel(),
    todayFocus: null,
    miniActionText: '',
    tonightPlan: null,
    routeStrip: null,
    surfaceDepthPack: null,
    unifiedNextAction: null,
    memoryPrescriptionPanel: null,
    transferPractice: null,
    outcomeCheck: null,
    postRepairBridge: null,
    companionPreference: null,
    companionCopy: { review: '咕点陪你只修这一小步，不讲完整答案。' },
    companionLine: '咕点：我懂你卡住了，我陪你先迈出第一步。',
    growthMemory: { review: '' },
    lastWrongCard: null,
    reportSourceContext: null,
    reportSourcePanel: null,
    miniLessonReturnPanel: null
  },

  onLoad(query = {}) {
    this.setData({
      reportSourceContext: this.buildReportSourceContext(query) || this.buildTemplateRouteContext(query)
    });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    const pendingRoute = navigation.consumePendingTabRouteContext
      ? navigation.consumePendingTabRouteContext('/pages/review/review')
      : null;
    if (pendingRoute && pendingRoute.options) {
      const context = this.buildReportSourceContext(pendingRoute.options)
        || this.buildTemplateRouteContext(pendingRoute.options)
        || this.buildEntryReviewContext(pendingRoute.options);
      if (context) {
        this.setData({ reportSourceContext: context });
      }
    }
    const publicK12Context = this.consumePublicK12ReviewContext();
    if (publicK12Context) {
      this.setData({ reportSourceContext: publicK12Context });
    }
    const yesterday = storage.getYesterdayReview ? storage.getYesterdayReview() : null;
    if (yesterday && storage.markReviewCardRevisited) storage.markReviewCardRevisited(yesterday.id);
    this.refresh();
    this.refreshServerReviewState();
  },

  consumePublicK12ReviewContext() {
    if (!storage.get || !storage.set || !storage.loadReviewCards || !storage.saveReviewCards) return null;
    const context = storage.get('publicK12.reviewContext.v1', null);
    if (!context || !context.id) return null;
    const expiresAt = context.expiresAt ? Date.parse(context.expiresAt) : 0;
    if (expiresAt && expiresAt < Date.now()) {
      storage.set('publicK12.reviewContext.v1', Object.assign({}, context, { status: 'expired' }));
      return null;
    }
    const cardId = `public_k12_review_${String(context.id || context.taskType || 'first_step').replace(/[^a-zA-Z0-9_\u4e00-\u9fa5:-]/g, '_')}`;
    const cards = storage.loadReviewCards();
    const existing = cards.find((card) => card && card.id === cardId);
    const blockedFields = Array.isArray(context.blockedFields) && context.blockedFields.length
      ? context.blockedFields
      : ['original_question', 'full_answer', 'score', 'ranking', 'full_dialogue'];
    if (!existing) {
      const now = new Date().toISOString();
      const firstStep = context.firstStepRequired || '先说出题目问什么和第一步入口';
      const parentPrompt = context.fallbackIfNoChildInput || '如果孩子说不出第一步，回到苏格拉底追问，不给整题答案。';
      storage.saveReviewCards([{
        id: cardId,
        type: 'public_k12_first_step_revisit',
        source: 'public_k12_homework_intake',
        state: 'new',
        due: now,
        created_at: now,
        question: `${context.subject || '这类题'}：先说哪一个第一步？`,
        answer: firstStep,
        subject: context.subject || '',
        taskType: context.taskType || '',
        weakPoint: '第一步入口',
        wrongCauseBucket: context.taskType || 'first_step',
        parentPrompt,
        checkpoint: firstStep,
        calibrationKey: context.id || context.taskType || 'public_k12_intake',
        blockedFields,
        publicK12ReviewContext: context,
        nextPracticePlan: {
          wrongCauseBucket: context.taskType || 'first_step',
          wrongCauseLabel: '公开题型第一步',
          checkpoint: firstStep,
          parentPrompt,
          nextPracticeText: '换一个同类题，只说第一步和理由，不看完整答案。',
          appRoute: '/pages/review/review?from=public_k12_intake'
        }
      }].concat(cards).slice(0, 260));
      if (storage.appendReviewEvent) {
        storage.appendReviewEvent({
          type: 'public_k12_review_card_created',
          source: 'public_k12_homework_intake',
          cardId,
          sourceIntakeId: context.id,
          subject: context.subject || '',
          taskType: context.taskType || '',
          blockedFields,
          releaseGate: context.releaseGate || 'child_can_say_first_step_before_reward'
        });
      }
    }
    storage.set('publicK12.reviewContext.v1', Object.assign({}, context, {
      status: 'review_card_ready',
      cardId,
      consumedAt: new Date().toISOString()
    }));
    return {
      from: 'public_k12_intake',
      sourceSchemaId: 'public_k12_intake',
      cardId,
      title: context.title || '公开K12第一步回访',
      line: `${context.subject || '公开题型'}：只回访第一步，不展示原题或完整答案。`,
      actionLabel: '回访第一步',
      blockedFields,
      returnRoute: context.route || '/pages/review/review',
      flowTraceId: `public_k12:${context.id || context.taskType || cardId}`,
      publicK12Review: true
    };
  },

  buildReportSourceContext(query = {}) {
    const handoff = storage.get ? storage.get('upload.report.handoff.v1', null) : null;
    const rawQuery = query || {};
    const hasQueryContext = !!(rawQuery.reportId || rawQuery.cardId || rawQuery.sourceSchemaId || rawQuery.from === 'upload_report_ready');
    const expiresAt = handoff && handoff.expiresAt ? Date.parse(handoff.expiresAt) : 0;
    const expired = !!(expiresAt && expiresAt < (Date.now ? Date.now() : new Date().getTime()));
    const readyHandoff = !!(handoff && !expired && handoff.status === 'ready');
    const matchesQuery = !!(handoff && !expired && hasQueryContext && (
      (rawQuery.reportId && rawQuery.reportId === handoff.reportId)
      || (rawQuery.cardId && rawQuery.cardId === handoff.cardId)
      || (rawQuery.sourceSchemaId && rawQuery.sourceSchemaId === handoff.sourceSchemaId)
      || rawQuery.from === 'upload_report_ready'
    ));
    const context = Object.assign({}, (matchesQuery || readyHandoff) ? handoff : {}, rawQuery);
    const fromUpload = context.from === 'upload_report_ready' || matchesQuery || readyHandoff;
    if (!fromUpload && !context.cardId && !context.sourceSchemaId) return null;
    if ((matchesQuery || readyHandoff) && storage.set) {
      storage.set('upload.report.handoff.v1', Object.assign({}, handoff, {
        consumedAt: new Date().toISOString(),
        status: 'consumed'
      }));
    }
    return {
      from: context.from || 'upload_report_ready',
      reportId: context.reportId || '',
      sourceSchemaId: context.sourceSchemaId || '',
      cardId: context.cardId || '',
      title: context.title || '来自刚上传的资料',
      line: context.line || '这轮复习优先处理刚上传材料生成的卡，不散到普通队列里。',
      actionLabel: context.actionLabel || '修这张卡',
      blockedFields: Array.isArray(context.blockedFields) ? context.blockedFields : [],
      openMaicBridgeStatus: context.openMaicDecisionBridge && context.openMaicDecisionBridge.qualityGate
        ? context.openMaicDecisionBridge.qualityGate.status
        : '',
      returnRoute: context.returnRoute || context.actionRoute || '',
      miniLessonReport: context.openMaicDecisionBridge && context.openMaicDecisionBridge.miniLessonReport
        ? context.openMaicDecisionBridge.miniLessonReport
        : null,
      flowTraceId: context.flowTraceId || ''
    };
  },

  buildEntryReviewContext(query = {}) {
    const from = String(query.from || '');
    const mode = String(query.mode || '');
    if (from.indexOf('entry_') !== 0 && !mode) return null;
    const isEntryReviewReturn = from === 'entry_review' || mode === 'recall_return';
    return {
      from,
      mode,
      title: isEntryReviewReturn ? '来自回访入口' : '来自学习入口',
      line: '先选一张真实卡，马上完成 90 秒回忆或迁移验证。',
      actionLabel: isEntryReviewReturn ? '开始 90 秒回忆' : '进入短回访',
      returnRoute: '/pages/entry-detail/entry-detail?scene=review',
      flowTraceId: from || mode || 'entry_review'
    };
  },

  buildTemplateRouteContext(query = {}) {
    const from = String(query.from || '');
    const templateModes = {
      template_worksheet: {
        title: '练习单生成器',
        line: '已进入可打印练习单预览：闪卡、配对、拼图、多米诺和 UNO 都只使用本机错因卡。',
        actionLabel: '查看练习单'
      },
      template_live: {
        title: '课堂互动工具',
        line: '已进入课堂互动包：翻卡、拖拽、投屏和 90 秒回忆只记录过程，不做名次榜。',
        actionLabel: '运行互动包'
      },
      template_assignment: {
        title: '学生自主练习',
        line: '已进入学生作业包：先说第一步和错因，明天回访，第 7 天做小变式。',
        actionLabel: '布置自主练习'
      },
      template_reuse: {
        title: '共创模板复用',
        line: '已进入本机模板复用：只保存结构，不分享原题、答案、分数、身份或完整对话。',
        actionLabel: '保存复用模板'
      }
    };
    const mode = templateModes[from];
    if (!mode) return null;
    return Object.assign({
      from,
      mode: 'practice_template_deliverable',
      returnRoute: '/pages/review/review',
      flowTraceId: from
    }, mode);
  },

  resolveReportRevisitContext(focus = {}) {
    const current = this.data.current || {};
    const evidenceThread = current.evidenceThread && typeof current.evidenceThread === 'object'
      ? current.evidenceThread
      : {};
    const reportSourceContext = this.data.reportSourceContext || {};
    return {
      reportId: focus.reportId
        || reportSourceContext.reportId
        || current.reportId
        || evidenceThread.reportId
        || '',
      flowTraceId: focus.flowTraceId
        || reportSourceContext.flowTraceId
        || current.flowTraceId
        || evidenceThread.flowTraceId
        || ''
    };
  },

  prioritizeReportSourceCards(cards = [], context = null) {
    if (!context) return cards;
    const matched = [];
    const rest = [];
    cards.forEach((card) => {
      const hit = (context.cardId && card.id === context.cardId)
        || (context.type && card.type === context.type)
        || (context.flowTraceId && card.flowTraceId === context.flowTraceId)
        || (context.sourceSchemaId && card.sourceSchemaId === context.sourceSchemaId)
        || (context.sourceSchemaId && String(card.source || '').includes(context.sourceSchemaId));
      (hit ? matched : rest).push(card);
    });
    return matched.concat(rest);
  },

  buildReportSourcePanel(context = null, current = null, cards = []) {
    if (!context) return null;
    const matchedCount = cards.filter((card) => (
      (context.cardId && card.id === context.cardId)
      || (context.type && card.type === context.type)
      || (context.flowTraceId && card.flowTraceId === context.flowTraceId)
      || (context.sourceSchemaId && card.sourceSchemaId === context.sourceSchemaId)
      || (context.sourceSchemaId && String(card.source || '').includes(context.sourceSchemaId))
    )).length;
    return {
      title: context.title || '来自刚上传的资料',
      line: context.line || '这张卡来自刚上传的材料，会先进入修卡点。',
      sourceSchemaId: context.sourceSchemaId || '',
      reportId: context.reportId || '',
      cardId: current && current.id ? current.id : context.cardId,
      currentQuestion: current && current.question ? current.question : '',
      matchedCount,
      blockedFields: context.blockedFields || [],
      openMaicBridgeStatus: context.openMaicBridgeStatus || '',
      returnRoute: context.returnRoute || '',
      returnRouteLine: reviewReadableRouteLine(context.returnRoute || ''),
      miniLessonReport: context.miniLessonReport || null,
      miniLessonCheckQuestion: context.miniLessonReport ? context.miniLessonReport.checkQuestion : '',
      miniLessonBlackboardLine: context.miniLessonReport ? context.miniLessonReport.blackboardLine : '',
      miniLessonNextDayReview: context.miniLessonReport ? context.miniLessonReport.nextDayReview : '',
      miniLessonTopicGate: context.miniLessonReport ? context.miniLessonReport.topicLocalGate : '',
      miniLessonBlackboardFrames: context.miniLessonReport && Array.isArray(context.miniLessonReport.blackboardFrames)
        ? context.miniLessonReport.blackboardFrames
        : [],
      flowTraceId: context.flowTraceId || '',
      next: matchedCount ? '先修这张卡，再进入回访验证。' : '未找到对应卡，会先展示当前到期卡。'
    };
  },

  buildMiniLessonReturnPanel(current = null) {
    if (!current || current.type !== 'three_minute_mini_lesson_return') return null;
    const frames = Array.isArray(current.blackboardFrames) ? current.blackboardFrames : [];
    const blockedFields = Array.isArray(current.blockedFields) && current.blockedFields.length
      ? current.blockedFields
      : ['original_question', 'full_answer', 'score', 'ranking', 'talent_label'];
    const evidenceThread = current.evidenceThread && typeof current.evidenceThread === 'object'
      ? current.evidenceThread
      : null;
    return {
      title: current.title || '3 分钟小讲堂回访',
      status: '先说第一步，再进练习',
      conceptGap: current.wrongCause || current.wrongCauseBucket || current.weakPoint || '这类题第一步还不稳定',
      firstStep: current.prompt || current.answer || current.blackboardLine || '先说出这类题的第一步',
      checkQuestion: current.question || '先说出第一步，再核对思路',
      parentLine: current.backPrompt || (current.nextPracticePlan && current.nextPracticePlan.parentPrompt) || '家长只问第一步，不追完整答案。',
      nextDayReview: current.revisit || (current.nextPracticePlan && current.nextPracticePlan.nextPracticeText) || '换一题，只回访第一步和错因。',
      exitGate: current.exitGate || 'child_can_say_first_step',
      flowTraceId: current.flowTraceId || '',
      evidenceThreadId: evidenceThread ? evidenceThread.id : '',
      topicCardId: evidenceThread ? evidenceThread.topicCardId : '',
      topicCardLine: reviewEvidenceThreadLine(evidenceThread ? evidenceThread.topicCardId : ''),
      day7Gate: evidenceThread ? evidenceThread.day7Gate : '',
      day7GateLine: reviewReadableDay7GateLine(evidenceThread ? evidenceThread.day7Gate : ''),
      frames,
      blockedFields,
      boundary: '不展示原题、不展示完整答案、不做分数/排名/天赋结论；只放行第一步、错因和明天回访。'
    };
  },

  buildPlayableReviewTools(cards = []) {
    const sourceCards = Array.isArray(cards) ? cards : [];
    const recommended = revisitEngine.recommendGames
      ? revisitEngine.recommendGames(sourceCards)
      : [];
    const toolIds = ['quiz', 'match', 'snake'];
    const fallback = {
      quiz: { title: '90秒回忆', pitch: '先在心里回忆，再翻开核对。', readyCount: sourceCards.length, available: !!sourceCards.length },
      match: { title: '配对消消', pitch: '把短概念和含义配起来。', readyCount: 0, available: false },
      snake: { title: '顺序拼图', pitch: '把解题步骤排成正确顺序。', readyCount: 0, available: false }
    };
    return toolIds.map((id) => {
      const item = recommended.find((tool) => tool.id === id) || fallback[id];
      return {
        id,
        title: item.title || fallback[id].title,
        line: item.pitch || fallback[id].pitch,
        count: Number(item.readyCount || 0),
        available: !!item.available,
        status: item.available ? '可开始' : '先补卡'
      };
    });
  },

  buildActiveReviewTool(tool = {}, round = null) {
    const toolId = tool.id || (round && round.gameType) || 'quiz';
    const questions = round && Array.isArray(round.questions) ? round.questions : [];
    const pairs = round && Array.isArray(round.pairs) ? round.pairs : [];
    const tracks = round && Array.isArray(round.tracks) ? round.tracks : [];
    const items = toolId === 'match'
      ? pairs.slice(0, 3).map((item, index) => ({
        id: item.id || `match_${index}`,
        label: `配对 ${index + 1}`,
        prompt: item.question || '先看题面',
        check: item.answer ? `对应：${item.answer}` : '点对应含义'
      }))
      : toolId === 'snake'
        ? tracks.slice(0, 2).map((item, index) => ({
          id: item.id || `snake_${index}`,
          label: `顺序 ${index + 1}`,
          prompt: item.question || '把步骤排好',
          check: Array.isArray(item.correctOrder) && item.correctOrder.length ? item.correctOrder.join(' → ') : '按第一步到最后一步排序'
        }))
        : questions.slice(0, 3).map((item, index) => ({
          id: item.id || `quiz_${index}`,
          label: `回忆 ${index + 1}`,
          prompt: item.question || '先闭眼回忆这张卡',
          check: item.answer ? `核对：${item.answer}` : '再翻开核对'
        }));
    return {
      id: toolId,
      title: tool.title || (round && round.title) || '短回访工具',
      status: items.length ? `本轮 ${items.length} 张` : '缺少回访卡',
      line: tool.line || (round && round.subtitle) || '先主动回忆，再核对第一步和错因。',
      empty: !items.length,
      itemCount: items.length,
      primary: items[0] || null,
      secondary: items[1] || null,
      third: items[2] || null,
      items
    };
  },

  refresh() {
    const summary = reviewCards.reviewSummary();
    const todayFocus = storage.loadTodayFocus ? storage.loadTodayFocus() : null;
    const tonightPlan = storage.loadTonightPlan ? storage.loadTonightPlan() : null;
    const companionPreference = storage.loadCompanionPreference ? storage.loadCompanionPreference() : null;
    const limit = (summary.deck && summary.deck.dailyLimit) || 5;
    const activeMiniLessonContext = storage.loadActiveMiniLessonResumeContext
      ? storage.loadActiveMiniLessonResumeContext()
      : null;
    const reportSourceContext = activeMiniLessonContext || this.data.reportSourceContext || this.buildReportSourceContext();
    const cards = this.prioritizeReportSourceCards(reviewCards.sessionCards(this.data.sessionMode, limit), reportSourceContext);
    const current = cards[0] || null;
    const reviewEvents = storage.loadReviewEvents ? storage.loadReviewEvents() : [];
    const profile = storage.loadGameProfile ? storage.loadGameProfile() : {};
    const revisitRunway = this.buildRevisitRunway(summary, cards);
    const playableReviewTools = this.buildPlayableReviewTools(cards);
    const practiceTemplateWorkshop = summary.practiceTemplateWorkshop
      || (reviewCards.practiceTemplateWorkshop ? reviewCards.practiceTemplateWorkshop(summary, cards) : null);
    const focusProgress = todayFocus ? Number(todayFocus.progress || 0) : revisitRunway.percent;
    const reviewViewModel = reviewViewModels.buildReviewViewModel({
      companionPreference,
      todayFocus,
      tonightPlan
    });
    this.setData({
      summary,
      cards,
      current,
      reportSourceContext,
      reportSourcePanel: this.buildReportSourcePanel(reportSourceContext, current, cards),
      miniLessonReturnPanel: this.buildMiniLessonReturnPanel(current),
      index: 0,
      showAnswer: false,
      done: !cards.length,
      progressText: cards.length ? `1/${cards.length}` : '0/0',
      feedbackText: '',
      editQuestion: current ? current.question : '',
      editAnswer: current ? current.answer : '',
      editOpen: false,
      dailyLimit: (summary.deck && summary.deck.dailyLimit) || 5,
      desiredRetention: Math.round(((summary.deck && summary.deck.desiredRetention) || 0.9) * 100),
      suspendedCards: reviewCards.suspendedCards(6),
      buriedCards: reviewCards.buriedCards(6),
      browserCards: reviewCards.cardBrowser(this.browserPayload()),
      lastWrongCard: null,
      quizRunning: false,
      quizIndex: 0,
      quizCurrent: null,
      quizAnswers: [],
      quizShowAnswer: false,
      revisitRunway: Object.assign({}, revisitRunway, {
        percent: Math.max(Number(revisitRunway.percent || 0), Math.max(0, Math.min(100, focusProgress || 0)))
      }),
      playableReviewTools,
      practiceTemplateWorkshop,
      practiceTemplatePack: this.data.practiceTemplatePack,
      mistakeHub: this.buildMistakeHub(summary, todayFocus),
      reviewViewModel,
      todayFocus,
      miniActionText: todayFocus && todayFocus.miniActionText ? todayFocus.miniActionText : this.data.miniActionText,
      tonightPlan,
      routeStrip: this.buildRouteStrip('repair', tonightPlan),
      surfaceDepthPack: storage.buildSurfaceDepthPack ? storage.buildSurfaceDepthPack('review') : null,
      unifiedNextAction: storage.buildUnifiedNextActionController ? storage.buildUnifiedNextActionController({ surface: 'review' }) : null,
      memoryPrescriptionPanel: this.buildMemoryPrescriptionPanel(summary, cards, reviewEvents, profile, todayFocus),
      ruleRetestPanel: this.buildRuleRetestPanel(current, cards),
      transferPractice: this.buildTransferPracticePanel(current),
      outcomeCheck: this.buildOutcomeCheckPanel(current),
      postRepairBridge: this.buildPostRepairBridge(current, {
        todayFocus,
        done: !cards.length,
        summary,
        revisitRunway
      }),
      companionPreference,
      companionCopy: {
        review: storage.getCompanionStageCopy ? storage.getCompanionStageCopy('review_focus', companionPreference) : '咕点陪你只修这一小步，不讲完整答案。'
      },
      companionLine: storage.formatCompanionLine ? storage.formatCompanionLine(companionPreference) : '咕点：我懂你卡住了，我陪你先迈出第一步。',
      growthMemory: {
        review: storage.growthMemoryCopyFor ? storage.growthMemoryCopyFor('review', companionPreference) : ''
      },
      reviewPlaybook: this.buildReviewPlaybook(summary, cards),
      revisitProofCard: this.buildRevisitProofCard(summary)
    });
  },

  buildRouteStrip(active, tonightPlan) {
    const steps = (tonightPlan && tonightPlan.routeSteps) || [
      { id: 'plan', label: '排顺序' },
      { id: 'first_step', label: '说第一步' },
      { id: 'repair', label: '修卡点' },
      { id: 'review', label: '短回访' },
      { id: 'parent', label: '家长看' }
    ];
    return {
      text: '今晚路线：这里承接最值得修的一个卡点。',
      steps: steps.map((step) => Object.assign({}, step, { active: step.id === active }))
    };
  },

  buildTransferPracticePanel(card) {
    if (!card || !storage.buildTransferPracticeSet) return null;
    const set = (card.nextPracticePlan && card.nextPracticePlan.transferPracticeSet)
      || storage.buildTransferPracticeSet({
        taskType: card.taskType,
        subject: card.subject,
        stuckPointText: card.stuckPointText || card.question,
        childArticulatedStep: card.childArticulatedStep || card.answer,
        wrongCauseBucket: card.wrongCauseBucket,
        wrongCauseLabel: card.wrongCauseLabel,
        parentPrompt: card.parentPrompt
      });
    const attempts = Array.isArray(set.attempts) ? set.attempts : [];
    const completed = new Set(attempts.map((item) => item && item.promptId).filter(Boolean));
    const prompts = (set.prompts || []).map((item) => Object.assign({}, item, {
      done: completed.has(item.id),
      actionLabel: completed.has(item.id) ? '已记录' : '记录这一步'
    }));
    return {
      cardId: card.id,
      title: '举一反三小练',
      subtitle: set.safetyLine || '只练迁移方法，不给最终答案。',
      parentPrompt: set.parentPrompt || '',
      prompts,
      completedCount: completed.size,
      totalCount: prompts.length,
      statusLine: completed.size
        ? `已完成 ${completed.size}/${prompts.length} 个迁移动作`
        : '先做一个同类小变式，再换场景说相同点。'
    };
  },

  buildOutcomeCheckPanel(card) {
    if (!card || !storage.buildMasteryRubric || !storage.buildOutcomeReviewSummary) return null;
    const rubric = storage.buildMasteryRubric();
    const summary = storage.buildOutcomeReviewSummary();
    return {
      cardId: card.id,
      title: '结果复核',
      masteryStage: rubric.stage,
      score: rubric.score,
      nextLevel: rubric.nextLevel ? rubric.nextLevel.label : '继续真实回访',
      line: summary.line,
      actions: [
        { id: 'explain', label: '孩子能讲清', field: 'childCanExplain' },
        { id: 'transfer', label: '换题也能用', field: 'transferWorked' },
        { id: 'tomorrow', label: '明天还记得', field: 'nextDayRemembered' }
      ]
    };
  },

  buildPostRepairBridge(card, context = {}) {
    const focus = context.todayFocus || this.data.todayFocus || {};
    const summary = context.summary || this.data.summary || {};
    const runway = context.revisitRunway || this.data.revisitRunway || {};
    const cardTitle = card && (card.weakPoint || card.question) ? (card.weakPoint || card.question) : (focus.title || '今天这个卡点');
    const completed = !!(focus && focus.repairStatus === 'completed') || !!context.done;
    const evidenceLine = completed
      ? '已留下第一步、回访卡和下一次复核入口。'
      : `当前还有 ${Number(runway.due || (summary.dueCount || 0) || 0)} 张需要短回访。`;
    const actions = [
      {
        id: 'revisit',
        label: '5分钟短回访',
        route: '/pages/review/review',
        reason: '把修过的卡点放进主动回忆，不靠照抄结果。',
        capabilityId: 'revisit'
      },
      {
        id: 'profile',
        label: '给家长看',
        route: '/pages/profile/profile',
        reason: '让家长看到修复证据、迁移尝试和明天复核。',
        capabilityId: 'parent_action'
      },
      {
        id: 'tutor',
        label: '再拆一步',
        route: '/pages/tutor/tutor?from=review_post_repair',
        reason: '如果还卡住，回到苏格拉底第一步。',
        capabilityId: 'socratic'
      }
    ];
    return {
      title: completed ? '修完之后怎么收口' : '修卡点之后别断',
      headline: completed ? '今天先到这里，明天只复核这一小步' : `围绕「${cardTitle}」继续补证据`,
      evidenceLine,
      parentLine: '家长只看三件事：孩子能否自己说第一步、能否换题、明天是否还记得。',
      actions
    };
  },

  buildMemoryPrescriptionPanel(summary = {}, cards = [], reviewEvents = [], profile = {}, todayFocus = {}) {
    const wrongToday = (Array.isArray(reviewEvents) ? reviewEvents : []).filter((event) => {
      const rating = event && event.rating;
      return rating === 'again' || rating === 'hard';
    }).length;
    const weakKey = (todayFocus && (todayFocus.wrongCauseLabel || todayFocus.issueType || todayFocus.title))
      || (summary.wrongCause && summary.wrongCause.top && summary.wrongCause.top.label)
      || '第一步';
    const loop = gameLogic.buildHighFrequencyPracticeLoop
      ? gameLogic.buildHighFrequencyPracticeLoop(profile || {}, cards || [], reviewEvents || [], {
        wrong: wrongToday,
        accuracy: wrongToday ? Math.max(35, 100 - wrongToday * 18) : 82
      }, {}, {}, { weakKey })
      : {};
    const daily = loop.dailyMemoryPrescription || {};
    const combo = loop.ninetySecondRecallComboEngine || {};
    const recallCards = (loop.recallCards || cards || []).slice(0, 3).map((card, index) => ({
      id: card.id || `memory_card_${index}`,
      label: card.weakPoint || card.subject || `第 ${index + 1} 张`,
      question: card.question || card.prompt || '先说出这张卡的第一步',
      action: '遮住答案，先说第一步和错因；点开核对前不展示答案。',
      source: card.source || card.taskType || '本地复习卡'
    }));
    const activeRecallProtocol = {
      title: '主动回忆处方',
      localRule: '本地代码只按到期、错因、材料来源和负荷上限排队；AI 只能改写追问，不决定掌握度。',
      todayMustCards: recallCards.map((card, index) => ({
        id: `today_must_${card.id || index}`,
        label: `今日第 ${index + 1} 张`,
        cardLabel: card.label,
        prompt: card.question,
        action: '先遮答案，说出第一步和错因，再点核对。',
        ratingRule: '忘了=again，模糊=hard，记得=good，轻松=easy'
      })),
      ratingScale: [
        { id: 'again', label: '忘了', rule: '明天必须回访，先回点拨拆第一步。' },
        { id: 'hard', label: '模糊', rule: '缩短间隔，保留同一错因小题。' },
        { id: 'good', label: '记得', rule: '进入正常间隔，明天只查关键第一步。' },
        { id: 'easy', label: '轻松', rule: '拉长间隔，但第 7 天仍要做小变式。' }
      ],
      tomorrowReturnCard: recallCards[0]
        ? {
          id: `tomorrow_${recallCards[0].id}`,
          label: '明日回访',
          prompt: recallCards[0].question,
          action: '换一个数字、条件或材料，只问第一步，不追完整答案。'
        }
        : null,
      day7VariantCard: recallCards[1] || recallCards[0]
        ? {
          id: `day7_${(recallCards[1] || recallCards[0]).id}`,
          label: '第 7 天小变式',
          prompt: (recallCards[1] || recallCards[0]).question,
          action: '同一错因换题型入口，验证能不能迁移。'
        }
        : null,
      releaseGateLine: recallCards.length >= 3
        ? '今日只放 3 张必修卡；完成主动回忆和明日回访前，不继续扩新卡。'
        : '卡片不足 3 张时，先补真实错题或上传材料，不用假题充数。',
      shareBoundary: '分享只带错因、第一步、回访窗口和下一证据，不带原题、答案、照片、分数、排名或完整对话。'
    };
    const incomingShare = storage.loadIncomingShare ? storage.loadIncomingShare() : null;
    const legacyReceiverActionLine = incomingShare
      ? incomingShare[['receiver', 'own', 'challenge', 'line'].join('_')]
      : '';
    const receiverShareRelayPanel = incomingShare && incomingShare.share_code
      ? {
        id: 'receiver_own_material_share_relay',
        title: '接力回访卡',
        shareCode: incomingShare.share_code,
        receiverMaterial: '用自己的作业材料，不复述对方原题',
        receiverFirstStep: incomingShare.relay_receiver_action || legacyReceiverActionLine || '先写下自己这道题的第一步',
        receiverWrongCause: '只写自己的卡点或错因，不带原题、答案、照片、分数、排名',
        nextRevisit: incomingShare.relay_next_revisit || '明天遮住答案再说一次第一步',
        completionEvent: 'share_relay_receiver_completion',
        blockedFields: incomingShare.relay_blocked_fields || 'original_question,full_answer,photo,score,ranking,full_dialogue',
        localRule: '完成时只写 receiverMaterial、receiverFirstStep、receiverWrongCause、nextRevisit；不保存发送者原题或答案。'
      }
      : null;
    const reviewWindows = (loop.spacedReviewPlan || [
      { id: 'tomorrow', label: '明天', action: '只回访同一张卡的第一步' },
      { id: 'day3', label: '第 3 天', action: '换一个同类小变式' },
      { id: 'day7', label: '第 7 天', action: '确认能否迁移到新题' }
    ]).slice(0, 3).map((item, index) => ({
      id: item.id || `window_${index}`,
      label: item.label || item.window || `第 ${index + 1} 次`,
      action: item.action || item.rule || item.releaseGate || '先回忆，再核对'
    }));
    const mustDo = (daily.mustDo || []).slice(0, 3).map((item, index) => ({
      id: item.id || `must_${index}`,
      label: item.label || `动作 ${index + 1}`,
      action: item.action || item.rule || '主动回忆，先说思路'
    }));
    const releaseQueue = (daily.releaseQueue || []).slice(0, 3).map((item, index) => ({
      id: item.id || `release_${index}`,
      label: item.label || `放行 ${index + 1}`,
      status: item.status || 'hold',
      rule: item.rule || '证据不足时不放新卡'
    }));
    return {
      title: '今日记忆处方',
      subtitle: daily.reasonLine || '本地规则只挑今天最该回忆的 3 张卡，先修错因，再放新卡。',
      doseLine: `今日剂量：${recallCards.length || 0} 张主动回忆卡，${daily.dailyCap && daily.dailyCap.maxMinutes ? daily.dailyCap.maxMinutes : 5} 分钟内收口。`,
      weakKey,
      recallCards,
      activeRecallProtocol,
      receiverShareRelayPanel,
      mustDo,
      reviewWindows,
      releaseQueue,
      comboLine: combo.totalSeconds ? `${combo.totalSeconds} 秒主动回忆：先说第一步，再说错因，最后核对。` : '90 秒主动回忆：先说第一步，再说错因，最后核对。',
      xpRule: daily.antiCramRule ? String(daily.antiCramRule).replace(new RegExp(['X', 'P'].join(''), 'g'), '行为反馈') : '行为反馈只记录主动回忆、错因回放和明天回访，不按速度或分数给反馈。',
      parentLine: daily.parentLine || `家长只问一句：这张卡第一步为什么先做「${weakKey}」？`,
      shareLine: daily.shareLine || '分享只带错因和下一步，不带原题、答案、分数或完整对话。',
      nextRoute: '/pages/review/review?from=memory_prescription'
    };
  },

  buildRuleRetestPanel(card, cards = []) {
    const ruleCards = (Array.isArray(cards) ? cards : []).filter((item) => item && item.type === 'real_trial_rule_retest');
    const active = card && card.type === 'real_trial_rule_retest' ? card : ruleCards[0];
    if (!active) return null;
    const retest = active.realTrialRuleRetest || {};
    const cadence = Array.isArray(retest.cadence) && retest.cadence.length
      ? retest.cadence
      : [
        { id: 'tonight', label: '今晚', action: '只说第一步和错因' },
        { id: 'tomorrow', label: '明天', action: '换一道同类材料再说一次' },
        { id: 'day7', label: '第 7 天', action: '确认能不能迁移' }
      ];
    return {
      id: 'rule_retest_panel',
      title: '规则复测卡',
      badge: '先说思路 · 不比速度',
      line: active.question || active.prompt || '换一道同类小题，只说第一步和错因。',
      parentLine: active.parentPrompt || '家长只问：这次第一步是什么？为什么先做这一步？',
      blackboardLine: active.blackboardHint || '小黑板只画第一步关系，不画完整解法。',
      xpRule: active.xpRule || '只记录说清第一步、错因和回访，不按速度或分数给反馈。',
      releaseGate: retest.releaseGate || '三段复测证据齐之前，不写长期掌握结论。',
      revisitRoute: active.nextPracticePlan && (active.nextPracticePlan.appRoute || active.nextPracticePlan.reviewRoute)
        ? (active.nextPracticePlan.appRoute || active.nextPracticePlan.reviewRoute)
        : '/pages/review/review?from=rule_retest',
      count: ruleCards.length,
      cadence
    };
  },

  refreshServerReviewState() {
    api.reviewToday({
      cards: storage.loadReviewCards ? storage.loadReviewCards() : [],
      events: storage.loadReviewEvents ? storage.loadReviewEvents() : [],
      profile: storage.loadGameProfile ? storage.loadGameProfile() : {}
    }).then((result) => {
      if (!result || !result.ok) return;
      this.setData({
        summary: Object.assign({}, this.data.summary || reviewCards.reviewSummary(), {
          serverToday: result
        })
      });
    }).catch(() => {});
  },

  buildRevisitRunway(summary, cards) {
    const safe = summary || {};
    const loop = safe.loop || {};
    const progress = safe.progress || {};
    const season = safe.season || {};
    const quiz = safe.quiz || {};
    const goal = safe.goal || {};
    const qualityQueue = safe.qualityQueue || [];
    const maxLives = Number(loop.maxLives || season.maxLives || 5);
    const lives = Math.max(0, Math.min(maxLives, Number(loop.lives || season.lives || maxLives)));
    const due = safe.due || cards.length || 0;
    const percent = goal.progress !== undefined
      ? Math.max(0, Math.min(100, Number(goal.progress || 0)))
      : Math.max(0, Math.min(100, Math.round(((safe.reviewedToday || 0) / Math.max(1, safe.reviewedToday + due)) * 100)));
    return {
      eyebrow: '今日回访',
      title: due ? '今天先赢这一关' : '今天保持手感',
      subtitle: due
        ? `咕点只推 ${due} 张最该复习的卡，卡住再回作业点拨拆一步。`
        : '没有到期卡时，不硬塞任务。可以先做一轮回访验证。',
      season: season.tier || '青铜',
      level: progress.level || 1,
      xp: progress.xp || 0,
      roundLabel: due ? '今日到期' : '保持手感',
      memoryLabel: due ? `${due} 张待复习` : '暂无到期卡',
      streak: safe.streak || loop.currentStreak || 0,
      lives,
      maxLives,
      hearts: Array.from({ length: maxLives }, (_, index) => ({
        id: `heart_${index}`,
        alive: index < lives
      })),
      percent,
      due,
      quiz: quiz.count || 0,
      repair: qualityQueue.length || 0,
      mastered: safe.mastered || 0,
      missionTitle: (safe.dailyRevisit && safe.dailyRevisit.title) || (goal.achieved ? '今日目标已完成' : '完成今日复习目标'),
      missionProgress: safe.dailyRevisit ? safe.dailyRevisit.progress : (goal.progress || 0),
      missionHint: safe.dailyRevisit
        ? `${safe.dailyRevisit.current || 0}/${safe.dailyRevisit.target || 1} · 完成后明天再看`
        : goal.label || '先完成今天这一轮复习',
      rewards: (safe.rewards || []).slice(0, 2).map((reward) => Object.assign({}, reward, {
        stateLabel: reward.claimed ? '已记录' : reward.canClaim ? '可记录' : '未完成'
      })),
      primaryLabel: due ? '开始短回访' : '先短回访一下',
      primaryAction: due ? 'review' : 'import',
      secondaryLabel: quiz.count ? '做 3 分钟测验' : '找卡点',
      secondaryAction: quiz.count ? 'quiz' : 'repair',
      lanes: [
        { id: 'review', title: '短回访', value: due, label: '到期卡', action: 'review' },
        { id: 'quiz', title: '主动回忆', value: quiz.count || 0, label: '测验卡', action: 'quiz' },
        { id: 'repair', title: '卡点修复', value: qualityQueue.length || 0, label: '待修复', action: 'repair' }
      ]
    };
  },

  buildMistakeHub(summary, todayFocus) {
    const safe = summary || {};
    const sources = Array.isArray(safe.sources) ? safe.sources : [];
    const qualityQueue = Array.isArray(safe.qualityQueue) ? safe.qualityQueue : [];
    const reviewEvents = storage.loadReviewEvents ? storage.loadReviewEvents() : [];
    const appSources = ['tutor', 'thinking_receipt', 'homework_plan', 'learning_path', 'report', 'review_grade', 'review_quiz'];
    const appMistakes = sources
      .filter((item) => appSources.includes(item.source))
      .reduce((sum, item) => sum + Number(item.total || 0), 0);
    const manualMistakes = sources
      .filter((item) => item.source === 'manual_import' || item.source === 'remote_ai_content_engine_v1' || item.source === 'rule_content_engine_v2')
      .reduce((sum, item) => sum + Number(item.total || 0), 0);
    const wrongToday = reviewEvents.filter((event) => {
      const day = String(event.created_at || '').slice(0, 10);
      return day === new Date().toISOString().slice(0, 10) && (event.rating === 'again' || event.rating === 'hard');
    }).length;
    return {
      totalMistakes: Number(safe.total || 0),
      appMistakes,
      manualMistakes: Number(safe.imported || 0) || manualMistakes,
      repairReady: qualityQueue.length,
      wrongToday,
      weakSpot: this.buildWeakSpot(safe, qualityQueue, reviewEvents, todayFocus),
      repairItems: qualityQueue.slice(0, 3).map((item) => Object.assign({}, item, {
        question: item.question || '这道错题需要补一句卡在哪',
        reason: item.reason || '建议补充卡住的一步',
        repairPreviewQuestion: item.repairPreviewQuestion || ''
      }))
    };
  },

  buildWeakSpot(summary, qualityQueue, reviewEvents, todayFocus) {
    if (todayFocus && todayFocus.title) {
      const progress = Number(todayFocus.progress || 0);
      return {
        name: todayFocus.title || (todayFocus.issueType ? storage.formatIssueType(todayFocus.issueType) : '今晚先修这一处'),
        evidence: todayFocus.reason || (todayFocus.isStuck ? '你不是整题不会，只是卡在第一步。' : '来自今天的第一步想法。'),
        cause: todayFocus.sourceText || todayFocus.thought ? `原话：${String(todayFocus.sourceText || todayFocus.thought).slice(0, 42)}` : '先把卡住点说清楚。',
        next: todayFocus.issueType ? `对应修法：先说第一步，再做一道小变式。` : (todayFocus.recommendation || '先说清第一步，再做一道小变式'),
        helper: todayFocus.helper || 'AI点拨会先问一步，不直接讲最终结果。',
        status: todayFocus.repairStatus || 'not_started',
        statusText: todayFocus.repairStatus === 'completed' ? '明天回访' : todayFocus.repairStatus === 'in_progress' ? '进行中' : '未开始',
        confidence: Math.max(62, Math.min(96, progress ? progress + 28 : 72))
      };
    }
    const state = storage.loadState ? storage.loadState() : {};
    const weak = ((state.weak_points || [])[0]) || {};
    const thinking = storage.thinkingReceiptSummary ? storage.thinkingReceiptSummary() : {};
    const review = summary || {};
    const queue = Array.isArray(qualityQueue) ? qualityQueue : [];
    const repeatedWrong = queue.length;
    const wrongEvents = (Array.isArray(reviewEvents) ? reviewEvents : [])
      .filter((event) => event.rating === 'again' || event.rating === 'hard').length;
    const name = weak.name
      || (queue[0] && (storage.formatInternalLabel ? storage.formatInternalLabel(queue[0].weakPoint || queue[0].reason, '') : (queue[0].weakPoint || queue[0].reason)))
      || '先定位一个卡点';
    const evidence = [
      weak.score !== undefined ? `卡点 ${weak.score} 分` : '',
      repeatedWrong ? `${repeatedWrong} 个卡点待修` : '',
      wrongEvents ? `${wrongEvents} 次复习卡住` : '',
      thinking.total ? `${thinking.total} 条思路记录` : ''
    ].filter(Boolean);
    const cause = /单位|条件|审题/.test(name)
      ? '更像审题和条件识别问题'
      : /步骤|方法|建模|关系/.test(name)
        ? '更像步骤断点或建模问题'
        : /概念|定义|原理/.test(name)
          ? '更像概念没有讲清'
          : repeatedWrong ? '需要先说清卡在哪，再练同类题' : '先录入一道真实错题，咕点会继续判断';
    const next = /单位|条件|审题/.test(name)
      ? '先练圈条件和单位，再做同类题'
      : /概念|定义|原理/.test(name)
        ? '先用一句话解释概念，再做题'
        : '先说清第一步，再做一道小变式';
    return {
      name,
      evidence: evidence.length ? evidence.join(' · ') : '等待更多真实记录',
      cause,
      next,
      helper: wrongEvents || repeatedWrong ? '先回作业点拨拆卡点，再生成一道同类题。' : '先录入一道真实错题，再用作业点拨问清卡点。',
      confidence: Math.min(96, 52 + Math.min(18, repeatedWrong * 6) + Math.min(18, wrongEvents * 3) + Math.min(8, Number(thinking.total || 0) * 2))
    };
  },

  buildReviewPlaybook(summary, cards) {
    const safe = summary || {};
    const nextStep = safe.nextStep || { mode: 'smart', message: '先复习价值最高的一组卡。' };
    const quiz = safe.quiz || { count: 0, estimatedMinutes: 0 };
    const qualityQueue = safe.qualityQueue || [];
    const sources = safe.sources || [];
    const loop = safe.loop || {};
    return {
      title: '今日复习路线',
      label: '先复习最该看的卡，再做一次主动回忆，最后只修一个关键卡点。',
      primary: {
        title: nextStep.message,
        meta: `${nextStep.mode || 'smart'} 模式 / ${cards.length || safe.due || 0} 张卡`,
        action: 'review'
      },
      stats: [
        { label: '到期', value: safe.due || 0 },
        { label: '测验', value: quiz.count || 0 },
        { label: '修复', value: qualityQueue.length || 0 },
        { label: '生命', value: `${loop.lives || 0}/${loop.maxLives || 0}` }
      ],
      actions: [
        {
          id: 'review',
          title: '复习最佳队列',
          desc: '只看调度器认为最该看的卡，不把所有内容重新刷一遍。',
          action: 'review',
          cta: '开始复习'
        },
        {
          id: 'quiz',
          title: '做一次测验',
          desc: `主动回忆检查，大约 ${quiz.estimatedMinutes || 3} 分钟。`,
          action: 'quiz',
          cta: '开始测验'
        },
        {
          id: 'repair',
          title: '修一个卡点',
          desc: qualityQueue[0] ? qualityQueue[0].reason : '当前没有紧急修复项。',
          action: 'repair',
          cta: '去修复'
        },
        {
          id: 'tutor',
          title: '回作业点拨',
          desc: '如果又卡住，先回作业点拨拆一步，再继续加卡。',
          action: 'tutor',
          cta: '打开作业点拨'
        }
      ],
      longTermRecord: {
        title: '长期记忆资产',
        label: `${sources.length} 类来源汇入同一套卡组：今晚安排、作业、作业点拨、学习模块和导入材料都会沉淀。`,
        score: safe.assetCompounding ? safe.assetCompounding.score : (safe.maturity ? safe.maturity.overall : 0)
      }
    };
  },

  buildRevisitProofCard(summary) {
    const safe = summary || {};
    const social = safe.localProgressShare || {};
    const progress = safe.progress || {};
    const season = safe.season || {};
    const quiz = safe.quiz || {};
    const goal = safe.goal || {};
    const firstMission = (social.missions || [])[0] || {};
    const name = (storage.loadProfile() && storage.loadProfile().name) || '同学';
    return {
      title: '今日复盘卡',
      label: '可以分享自己的今日复盘卡，当前只展示个人复盘，不展示同伴对比或好友对比。',
      headline: `${name} 今天正在完成 ${season.tier || '青铜'} 复习冲刺。`,
      inviteCode: social.inviteCode || '本地复盘',
      shareCopy: `${name} 今天完成 ${goal.completed || 0}/${goal.target || 0} 个复习目标，回访了 ${quiz.count || 0} 张卡。`,
      prompts: [
        `任务：${firstMission.title || '完成一次专注回忆冲刺'}`,
        `检查点：${season.checkpoint || '完成今日任务'}`,
        `今日提示：${social.dailyPrompt || '守住一个卡点'}`
      ],
      stats: [
        { id: 'goal', label: '目标', value: `${goal.completed || 0}/${goal.target || 0}` },
        { id: 'quiz', label: '测验', value: quiz.count || 0 },
        { id: 'xp', label: '回访', value: progress.xp || 0 },
        { id: 'tier', label: '段位', value: season.tier || '青铜' }
      ]
    };
  },

  runLegacyReviewPlaybookAction(event) {
    const action = event.currentTarget.dataset.action;
    if (action === 'review') {
      const currentFocus = this.data.todayFocus || (storage.loadTodayFocus ? storage.loadTodayFocus() : null);
      const blackboardHint = storage.buildBlackboardHint ? storage.buildBlackboardHint(currentFocus || {}) : null;
      const blackboardUsedAt = blackboardHint ? new Date().toISOString() : '';
      const focus = storage.updateTodayFocusRepair ? storage.updateTodayFocusRepair({
        repairStatus: 'in_progress',
        progress: Math.max(56, Number((this.data.todayFocus && this.data.todayFocus.progress) || 0)),
        blackboardHint: blackboardHint ? Object.assign({}, blackboardHint, { usedAt: blackboardUsedAt }) : undefined,
        blackboardUsedAt
      }) : null;
      this.setData({
        todayFocus: focus || this.data.todayFocus,
        feedbackText: '已进入 5 分钟修复：先说清第一步，再做一道小变式。'
      });
      this.refresh();
      return;
    }
    if (action === 'import') {
      navigation.navigateLearningRoute('/pages/upload/upload?type=wrong_question&from=review');
      return;
    }
    if (action === 'quiz') {
      this.startQuiz();
      return;
    }
    if (action === 'repair') {
      this.runMission({ currentTarget: { dataset: { action: 'repair' } } });
      return;
    }
    if (action === 'tutor') {
      this.goTutor();
      return;
    }
    const mode = (this.data.summary && this.data.summary.nextStep && this.data.summary.nextStep.mode) || 'smart';
    this.setData({ sessionMode: mode });
    this.refresh();
  },

  copyRevisitProofCard() {
    const card = this.data.revisitProofCard;
    if (!card) return;
    const text = [card.headline, card.shareCopy].concat(card.prompts || []).join('\n');
    wx.setClipboardData({
      data: text,
      success: () => {
        this.setData({ feedbackText: '复盘卡已复制，可以发给家长或留作今天的学习记录。' });
      }
    });
  },

  browserPayload(patch = {}) {
    return {
      query: patch.query !== undefined ? patch.query : this.data.browserQuery,
      status: patch.status !== undefined ? patch.status : this.data.browserStatus,
      source: patch.source !== undefined ? patch.source : this.data.browserSource,
      type: patch.type !== undefined ? patch.type : this.data.browserType,
      template: patch.template !== undefined ? patch.template : this.data.browserTemplate,
      limit: 8
    };
  },

  setSessionMode(event) {
    this.setData({ sessionMode: event.currentTarget.dataset.mode || 'smart' });
    this.refresh();
  },

  runMission(event) {
    const action = event.currentTarget.dataset.action;
    if (action === 'quiz') {
      this.startQuiz();
      return;
    }
    if (action === 'repair') {
      const first = this.data.summary && this.data.summary.qualityQueue && this.data.summary.qualityQueue[0];
      if (first && first.noteId) {
        this.editQueueItem({ currentTarget: { dataset: { noteId: first.noteId } } });
      }
      return;
    }
    if (action === 'maintain') {
      this.setData({
        browserStatus: 'leech',
        browserCards: reviewCards.cardBrowser(this.browserPayload({ status: 'leech' })),
        feedbackText: '已筛出最需要维护的高优先级卡片。'
      });
      return;
    }
    this.setData({ sessionMode: 'smart' });
    this.refresh();
  },

  importTemplateDeck(event) {
    const templateId = event.currentTarget.dataset.id;
    const templates = (this.data.summary && this.data.summary.publicDeckTemplates) || [];
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    const result = reviewCards.importTextToDeck(template.text, {
      source: 'public_template_deck',
      subject: template.subject || ''
    });
    this.setData({
      feedbackText: `已从「${template.title}」导入 ${result.imported || 0} 张卡。`
    });
    this.syncQuietly();
    this.refresh();
  },

  reveal() {
    if (!this.data.current) return;
    this.setData({ showAnswer: true });
  },

  startQuiz() {
    const quiz = this.data.summary && this.data.summary.quiz;
    if (!quiz || !quiz.questions || !quiz.questions.length) {
      wx.showToast({ title: '还没有测验卡', icon: 'none' });
      return;
    }
    this.setData({
      quizRunning: true,
      quizIndex: 0,
      quizCurrent: quiz.questions[0],
      quizAnswers: [],
      quizShowAnswer: false,
      quizFeedback: null
    });
    api.generateQuiz({
      cards: (this.data.cards || []).slice(0, 8),
      limit: 6
    }).then((result) => {
      if (!result || !result.ok || !result.questions || !result.questions.length) return;
      this.setData({
        summary: Object.assign({}, this.data.summary || {}, {
          serverQuiz: result
        })
      });
    }).catch(() => {});
  },

  revealQuizAnswer() {
    if (!this.data.quizRunning) return;
    this.setData({ quizShowAnswer: true });
  },

  answerQuiz(event) {
    const correct = event.currentTarget.dataset.correct === 'true';
    const quiz = this.data.summary && this.data.summary.quiz;
    const questions = (quiz && quiz.questions) || [];
    const question = questions[this.data.quizIndex];
    if (!question) return;
    const nextAnswers = this.data.quizAnswers.concat([{
      cardId: question.cardId,
      correct,
      rating: correct ? 'good' : 'again'
    }]);
    const nextIndex = this.data.quizIndex + 1;
    if (nextIndex >= questions.length) {
      const result = reviewCards.finishQuizAttempt(nextAnswers, { mode: quiz.mode });
      this.setData({
        quizRunning: false,
        quizIndex: 0,
        quizCurrent: null,
        quizAnswers: [],
        quizShowAnswer: false,
        quizFeedback: result,
        feedbackText: `测验 ${result.correct}/${result.count}，新增修复 ${result.repair_drills || 0}`
      });
      api.submitQuiz({
        answers: nextAnswers,
        profile: storage.loadGameProfile ? storage.loadGameProfile() : {}
      }).then((serverResult) => {
        if (serverResult && serverResult.ok && serverResult.event) {
          api.submitEvent({
            event: 'review_completed',
            source: 'review_quiz',
            entity_id: serverResult.attempt_id || result.attemptId || '',
            page: 'review',
            payload: serverResult.event
          }).catch(() => {});
        }
      }).catch(() => {});
      this.syncQuietly();
      this.refresh();
      return;
    }
    this.setData({
      quizIndex: nextIndex,
      quizCurrent: questions[nextIndex],
      quizAnswers: nextAnswers,
      quizShowAnswer: false
    });
  },

  syncQuietly() {
    api.flushLocalSyncQueue().then(() => {
      this.setData({ summary: reviewCards.reviewSummary() });
    });
  },

  claimReward(event) {
    const rewardId = event.currentTarget.dataset.id;
    if (!rewardId) return;
    const result = reviewCards.claimReward(rewardId, this.data.summary);
    if (!result.ok) {
      wx.showToast({ title: '这条记录还没完成', icon: 'none' });
      return;
    }
    this.setData({
      feedbackText: `已记下这一小步${result.reward.lives ? `，今天还能继续 ${result.reward.lives} 次` : ''}`
    });
    this.syncQuietly();
    this.refresh();
  },

  rate(event) {
    const rating = event.currentTarget.dataset.rating || 'good';
    const current = this.data.current;
    if (!current) return;
    const reviewedCard = reviewCards.reviewCard(current.id, rating);
    if (current.type === 'three_minute_mini_lesson_return' && storage.recordMiniLessonReviewResult) {
      storage.recordMiniLessonReviewResult({
        cardId: current.id,
        rating,
        reviewedCard,
        evidenceThread: current.evidenceThread || null,
        source: 'review_mini_lesson_return'
      }, {
        source: 'review_rate',
        reportSourceContext: this.data.reportSourceContext || null
      });
    }
    api.gradeReview({
      card: current,
      rating,
      profile: storage.loadGameProfile ? storage.loadGameProfile() : {}
    }).then((serverResult) => {
      if (serverResult && serverResult.ok && serverResult.event) {
        api.submitEvent({
          event: 'review_completed',
          source: 'review_grade',
          entity_id: serverResult.card_id || current.id,
          page: 'review',
          payload: serverResult.event
        }).catch(() => {});
      }
    }).catch(() => {});
    const nextIndex = this.data.index + 1;
    const cards = this.data.cards;
    const done = nextIndex >= cards.length;
    const summary = reviewCards.reviewSummary();
    const lastEvent = (storage.loadReviewEvents ? storage.loadReviewEvents()[0] : null) || {};
    const xpText = lastEvent.xp ? '，已记进今天回访' : '';
    const feedbackText = (rating === 'again'
      ? '已安排明天再看，先回作业点拨拆一步。'
      : rating === 'hard'
        ? '已缩短间隔，后面还会更快出现。'
        : rating === 'easy'
          ? '已拉长间隔。'
          : '已记录掌握。') + xpText;
    this.setData({
      index: nextIndex,
      current: done ? null : cards[nextIndex],
      showAnswer: false,
      done,
      progressText: done ? `${cards.length}/${cards.length}` : `${nextIndex + 1}/${cards.length}`,
      summary,
      revisitRunway: this.buildRevisitRunway(summary, done ? [] : cards.slice(nextIndex)),
      transferPractice: this.buildTransferPracticePanel(done ? null : cards[nextIndex]),
      outcomeCheck: this.buildOutcomeCheckPanel(done ? null : cards[nextIndex]),
      postRepairBridge: this.buildPostRepairBridge(done ? current : cards[nextIndex], {
        todayFocus: this.data.todayFocus,
        done,
        summary,
        revisitRunway: this.buildRevisitRunway(summary, done ? [] : cards.slice(nextIndex))
      }),
      feedbackText,
      editQuestion: done ? '' : cards[nextIndex].question,
      editAnswer: done ? '' : cards[nextIndex].answer,
      editOpen: false,
      lastWrongCard: rating === 'again' ? current : this.data.lastWrongCard,
      sessionFeedback: done ? reviewCards.userSessionFeedback(this.data.sessionMode, cards.slice(0, nextIndex)) : this.data.sessionFeedback
    });
    this.syncQuietly();
    if (done) this.refresh();
  },

  recordTransferPractice(event) {
    const promptId = event.currentTarget.dataset.promptId || 'near_transfer';
    const current = this.data.current || {};
    if (!current.id || !storage.recordTransferPracticeAttempt) return;
    const target = storage.recordTransferPracticeAttempt({
      cardId: current.id,
      promptId,
      result: 'attempted',
      childExplanation: current.childArticulatedStep || current.answer || '',
      parentChecked: promptId === 'teach_back'
    });
    this.setData({
      current: target || current,
      transferPractice: this.buildTransferPracticePanel(target || current),
      outcomeCheck: this.buildOutcomeCheckPanel(target || current),
      postRepairBridge: this.buildPostRepairBridge(target || current, {
        todayFocus: this.data.todayFocus,
        summary: this.data.summary,
        revisitRunway: this.data.revisitRunway
      }),
      feedbackText: '已写回迁移练习记录。下一步看孩子能不能换题也说出同一个第一步。'
    });
    this.syncQuietly();
  },

  recordOutcomeCheck(event) {
    const field = event.currentTarget.dataset.field || 'childCanExplain';
    const current = this.data.current || {};
    if (!current.id || !storage.recordOutcomeCheck) return;
    const payload = {
      cardId: current.id,
      masteryStage: this.data.outcomeCheck && this.data.outcomeCheck.masteryStage,
      childCanExplain: field === 'childCanExplain',
      transferWorked: field === 'transferWorked',
      nextDayRemembered: field === 'nextDayRemembered',
      parentVerified: true
    };
    storage.recordOutcomeCheck(payload);
    this.setData({
      outcomeCheck: this.buildOutcomeCheckPanel(current),
      postRepairBridge: this.buildPostRepairBridge(current, {
        todayFocus: this.data.todayFocus,
        summary: this.data.summary,
        revisitRunway: this.data.revisitRunway
      }),
      feedbackText: '已记录一次结果复核。这里看的是会不会迁移和隔天是否记得，不看最终答案。'
    });
    this.syncQuietly();
  },

  completeTodayRepair() {
    const miniActionText = String(this.data.miniActionText || (this.data.todayFocus && (this.data.todayFocus.childArticulatedStep || this.data.todayFocus.childStepSentence)) || '').trim();
    const quality = storage.childStepQuality ? storage.childStepQuality(miniActionText) : (miniActionText.length >= 3 ? 'partial' : 'empty');
    if (!(this.data.todayFocus && (this.data.todayFocus.childArticulatedStep || this.data.todayFocus.hasMiniActionDone)) || ['empty', 'vague'].includes(quality)) {
      this.setData({
        feedbackText: '先用自己的话补一句第一步，再完成修复。说不完整也没关系。'
      });
      return;
    }
    const focus = storage.updateTodayFocusRepair ? storage.updateTodayFocusRepair({
      repairStatus: 'completed',
      progress: 100,
      hasMiniActionDone: true,
      miniActionText,
      childArticulatedStep: miniActionText,
      childStepSentence: miniActionText,
      childStepQuality: quality,
      firstStepStatus: 'revisited',
      firstStepSource: 'child_articulated'
    }) : null;
    if (storage.appendReviewEvent) {
      storage.appendReviewEvent({
        kind: 'today_focus_repaired',
        rating: 'good',
        focus_id: focus && focus.id,
        focus_title: focus && focus.title
      });
    }
    if (storage.recordShareRelayCompletion) {
      storage.recordShareRelayCompletion({
        firstStep: miniActionText,
        wrongCause: focus && (focus.wrongCauseLabel || focus.weakPoint || focus.title),
        receiverMaterial: focus && (focus.title || focus.subject || focus.weakPoint),
        nextRevisit: '明天回访同一第一步',
        route: '/pages/review/review',
        evidence: 'receiver_first_step_repair_completed',
        title: '接收者完成修卡点第一步'
      });
    }
    const reportRevisitContext = this.resolveReportRevisitContext(focus || {});
    if (storage.recordReportRevisitEvidence && reportRevisitContext.reportId) {
      storage.recordReportRevisitEvidence(reportRevisitContext.reportId, {
        status: 'review_completed',
        nextDayRevisit: true,
        firstStep: miniActionText,
        wrongCause: focus.wrongCauseLabel || focus.weakPoint || focus.title || '',
        parentCheck: '家长只确认第一步和错因，不升级长期画像。',
        route: '/pages/review/review',
        flowTraceId: reportRevisitContext.flowTraceId
      });
    }
    this.setData({
      todayFocus: focus || this.data.todayFocus,
      revisitRunway: Object.assign({}, this.data.revisitRunway || {}, { percent: 100 }),
      postRepairBridge: this.buildPostRepairBridge(this.data.current, {
        todayFocus: focus || this.data.todayFocus,
        done: true,
        summary: this.data.summary,
        revisitRunway: Object.assign({}, this.data.revisitRunway || {}, { percent: 100 })
      }),
      feedbackText: '今天这个卡点先修到这里。明天只轻轻回看这一步。'
    });
  },

  markMiniActionDone() {
    const miniActionText = String(this.data.miniActionText || '').trim();
    const savedStep = storage.saveChildArticulatedStep
      ? storage.saveChildArticulatedStep(miniActionText, {
          repairStatus: 'in_progress',
          progress: 78,
          mini_action_required: false
        })
      : null;
    const focus = storage.updateTodayFocusRepair ? storage.updateTodayFocusRepair({
      repairStatus: 'in_progress',
      progress: 78,
      hasMiniActionDone: true,
      miniActionText: savedStep && savedStep.childArticulatedStep ? savedStep.childArticulatedStep : miniActionText,
      mini_action_required: false
    }) : savedStep;
    if (focus && focus.blockedReason === 'mini_action_required') {
      this.setData({
        todayFocus: focus,
        miniActionText,
        feedbackText: '先用自己的话说一句第一步，再完成修复。'
      });
      return;
    }
    this.setData({
      todayFocus: focus || this.data.todayFocus,
      miniActionText: focus && (focus.childArticulatedStep || focus.miniActionText) ? (focus.childArticulatedStep || focus.miniActionText) : miniActionText,
      feedbackText: '小动作记下来了：这是你自己准备开始的第一步。'
    });
    this.refresh();
  },

  chooseMiniAction(event) {
    const text = event.currentTarget.dataset.text || '';
    this.setData({ miniActionText: text });
    const focus = storage.saveChildArticulatedStep ? storage.saveChildArticulatedStep(text, {
      repairStatus: 'in_progress',
      progress: 78
    }) : null;
    this.setData({
      todayFocus: focus || this.data.todayFocus,
      feedbackText: '咕点记下来了。这不是答案，只是你准备开始的第一步。'
    });
    this.refresh();
  },

  onMiniActionInput(event) {
    this.setData({ miniActionText: event.detail.value });
  },

  buildPracticeTemplatePack(workshop = {}, cards = []) {
    const safeWorkshop = workshop || {};
    const safeCards = Array.isArray(cards) ? cards : [];
    const catalog = Array.isArray(safeWorkshop.teachingAidCatalog) ? safeWorkshop.teachingAidCatalog : [];
    const sourceCards = safeCards.slice(0, 8).map((card, index) => ({
      id: card.id || 'card_' + (index + 1),
      noteId: card.noteId || card.note_id || '',
      weakPoint: card.weakPoint || card.knowledge_point || card.title || '今日卡点',
      firstStep: card.firstStep || card.prompt || card.question || '先说出第一步',
      wrongCause: card.wrongCause || card.reason || card.errorType || '待孩子复述错因'
    }));
    const byLane = (lane) => catalog
      .filter((item) => item && item.lane === lane)
      .map((item, index) => ({
        id: item.id,
        label: item.label,
        format: item.format,
        renderMode: item.renderMode || item.format,
        printReady: !!item.printReady,
        pinyinReady: !!item.pinyinReady,
        colorPrintReady: !!item.colorPrintReady,
        studentAssignable: !!item.studentAssignable,
        communityReusable: !!item.communityReusable,
        requiresParentConfirm: !!item.requiresParentConfirm,
        sourceCardId: sourceCards[index % Math.max(sourceCards.length, 1)] ? sourceCards[index % sourceCards.length].id : '',
        source: sourceCards[index % Math.max(sourceCards.length, 1)] ? sourceCards[index % sourceCards.length].weakPoint : '今日卡点'
      }));
    const worksheet = byLane('worksheet');
    const live = byLane('live');
    const selfPractice = byLane('self');
    const communityReuse = byLane('community');
    const now = new Date().toISOString();
    const packId = 'practice_template_pack_' + now.slice(0, 10).replace(/-/g, '');
    const printOptions = Object.assign({
      colorPrint: true,
      pinyinFieldReady: true,
      cutoutReady: true,
      paperSize: 'A4',
      parentReviewRequired: true
    }, safeWorkshop.printOptions || {});
    const worksheetBundle = {
      id: 'worksheet_bundle',
      route: '/pages/review/review?from=template_worksheet',
      printOptions,
      templates: worksheet,
      sourceCards,
      exportFields: ['title', 'prompt', 'first_step', 'wrong_cause', 'pinyin_hint', 'cut_line', 'color_tag'],
      readyToPreview: worksheet.length >= 8 && sourceCards.length > 0
    };
    const classroomInteractiveRun = {
      id: 'classroom_interactive_run',
      route: '/pages/review/review?from=template_live',
      templates: live,
      modes: ['tap_recall', 'flip_card', 'drag_sort', 'safe_spinner', 'projector_board'],
      timerSeconds: 90,
      groupMode: 'cooperate_without_scoreboard',
      projectorReady: live.some((item) => item.format === 'slide' || item.format === 'board'),
      readyToRun: live.length >= 8 && sourceCards.length > 0
    };
    const studentAssignment = {
      id: 'student_assignment',
      route: '/pages/review/review?from=template_assignment',
      templates: selfPractice,
      releaseGate: 'child_can_finish_one_round_without_full_answer',
      due: 'tonight_or_next_morning',
      revisitPlan: ['day2_return', 'day7_variant'],
      evidenceRequired: ['first_step', 'wrong_cause', 'next_day_recall'],
      parentVisible: true,
      readyToAssign: selfPractice.length >= 8 && sourceCards.length > 0
    };
    const communityReusePlan = {
      id: 'community_reuse',
      route: '/pages/review/review?from=template_reuse',
      templates: communityReuse,
      localSaveKey: 'review.practice.template.pack.v1',
      saveReady: true,
      remixReady: communityReuse.some((item) => item.id === 'template_remix'),
      privacyBoundary: '只复用结构；不分享原题、答案、分数、完整对话或孩子身份信息',
      requiresParentConfirm: true,
      readyToReuse: communityReuse.length >= 8
    };
    const deliverables = [
      { id: 'worksheet_generator', label: '练习单生成器', count: worksheet.length, route: worksheetBundle.route, ready: worksheetBundle.readyToPreview },
      { id: 'classroom_interactive', label: '课堂互动工具', count: live.length, route: classroomInteractiveRun.route, ready: classroomInteractiveRun.readyToRun },
      { id: 'student_assignment', label: '学生自主练习', count: selfPractice.length, route: studentAssignment.route, ready: studentAssignment.readyToAssign },
      { id: 'community_reuse', label: '共创模板复用', count: communityReuse.length, route: communityReusePlan.route, ready: communityReusePlan.readyToReuse }
    ];
    return {
      id: packId,
      title: safeWorkshop.title || '练习模板工坊',
      createdAt: now,
      sourceCount: sourceCards.length,
      catalogCount: Number(safeWorkshop.catalogCount || catalog.length || 0),
      worksheet,
      live,
      selfPractice,
      communityReuse,
      worksheetBundle,
      classroomInteractiveRun,
      studentAssignment,
      communityReusePlan,
      deliverables,
      teacherWorkflow: {
        input: 'review cards + wrong-cause evidence',
        output: 'printable worksheets + classroom interaction pack + assignment + reusable template',
        guardrail: 'no ranking, no score race, no full-answer copying'
      },
      reuseWorkflow: {
        saveReady: true,
        reuseRule: 'local template first, parent confirmation before sharing',
        communityBoundary: communityReusePlan.privacyBoundary
      },
      printOptions,
      assignmentPlan: safeWorkshop.assignmentPlan || {
        route: studentAssignment.route,
        releaseGate: studentAssignment.releaseGate
      },
      communityPlan: safeWorkshop.communityPlan || {
        saveReady: true,
        rule: '先本地保存；需要家长确认后再分享复用。'
      },
      sourceCards,
      safetyLine: safeWorkshop.safetyLine || '只做练习材料、课堂互动和自主回访，不做排名、比较刺激或答案代写。'
    };
  },

  buildPracticeTemplateWorkbench(deliverable = {}, pack = {}) {
    const id = deliverable.id || 'worksheet_generator';
    const laneMap = {
      worksheet_generator: {
        title: '练习单生成器',
        status: '可预览',
        line: '把今日错因卡转成 A4 彩色练习单，先看第一步、再做配对和拼图。',
        primaryAction: '预览练习单',
        sampleTitle: '今日练习单',
        samples: (pack.worksheet || []).slice(0, 3)
      },
      classroom_interactive: {
        title: '课堂互动工具',
        status: '可运行',
        line: '把同一批卡点转成翻卡、拖拽和 90 秒回忆，课堂只记录过程证据。',
        primaryAction: '开始互动',
        sampleTitle: '课堂互动包',
        samples: (pack.live || []).slice(0, 3)
      },
      student_assignment: {
        title: '学生自主练习',
        status: '可布置',
        line: '只布置能自己说第一步的短练习，明天回访同一个错因。',
        primaryAction: '布置自主练习',
        sampleTitle: '自主练习包',
        samples: (pack.selfPractice || []).slice(0, 3)
      },
      community_reuse: {
        title: '共创模板复用',
        status: '可保存',
        line: '只保存模板结构，家长确认后才能复用，不带原题、答案或身份信息。',
        primaryAction: '保存复用模板',
        sampleTitle: '可复用模板',
        samples: (pack.communityReuse || []).slice(0, 3)
      }
    };
    const lane = laneMap[id] || laneMap.worksheet_generator;
    const baseSamples = lane.samples.length ? lane.samples : [{
      label: deliverable.label || lane.title,
      format: 'preview',
      source: (pack.sourceCards && pack.sourceCards[0] && pack.sourceCards[0].weakPoint) || '今日卡点',
      renderMode: 'card'
    }];
    const samples = baseSamples.concat(baseSamples).concat(baseSamples).slice(0, 3);
    return {
      id,
      title: lane.title,
      status: deliverable.ready ? lane.status : '已生成待补卡',
      line: lane.line,
      primaryAction: lane.primaryAction,
      sampleTitle: lane.sampleTitle,
      count: deliverable.count || samples.length,
      route: deliverable.route || '/pages/review/review?from=template_worksheet',
      samples: samples.map((item, index) => ({
        id: item.id || `${id}_${index}`,
        label: item.label || lane.title,
        format: item.format || item.renderMode || 'card',
        source: item.source || '今日卡点',
        renderMode: item.renderMode || item.format || 'card'
      })),
      safetyLine: pack.safetyLine || '只用错因卡和第一步证据，不做答案代写、比较刺激或排名。'
    };
  },

  runPlaybookAction(event) {
    const dataset = event && event.currentTarget ? event.currentTarget.dataset || {} : {};
    const primaryCta = this.data.reviewViewModel && this.data.reviewViewModel.primaryCta ? this.data.reviewViewModel.primaryCta : {};
    const action = dataset.action || primaryCta.action || 'review';
    if (action === 'template') {
      const pack = this.buildPracticeTemplatePack(this.data.practiceTemplateWorkshop, this.data.cards);
      if (storage.set) {
        storage.set('review.practice.template.pack.v1', pack);
      }
      if (storage.appendReviewEvent) {
        storage.appendReviewEvent({
          kind: 'practice_template_pack',
          pack_id: pack.id,
          catalog_count: pack.catalogCount,
          source_count: pack.sourceCount,
          deliverable_ids: pack.deliverables.map((item) => item.id),
          worksheet_count: pack.worksheet.length,
          live_count: pack.live.length,
          self_practice_count: pack.selfPractice.length,
          community_reuse_count: pack.communityReuse.length,
          created_at: pack.createdAt
        });
      }
      this.setData({
        practiceTemplatePack: pack,
        practiceTemplateWorkbench: this.buildPracticeTemplateWorkbench(pack.deliverables[0], pack),
        feedbackText: `已生成 ${pack.catalogCount} 款教具：练习单、课堂互动、自主练习和模板复用都已进本机包。`
      });
      return;
    }
    if (action === 'complete') {
      this.completeTodayRepair();
      return;
    }
    if (action === 'focus') {
      this.goFocus();
      return;
    }
    if (action === 'home') {
      this.goHome();
      return;
    }
    if (action === 'revisit') {
      this.goLearningMap();
      return;
    }
    if (action === 'review') {
      const currentFocus = this.data.todayFocus || (storage.loadTodayFocus ? storage.loadTodayFocus() : null);
      const blackboardHint = storage.buildBlackboardHint ? storage.buildBlackboardHint(currentFocus || {}) : null;
      const blackboardUsedAt = blackboardHint ? new Date().toISOString() : '';
      const focus = storage.updateTodayFocusRepair ? storage.updateTodayFocusRepair({
        repairStatus: 'in_progress',
        progress: Math.max(56, Number((this.data.todayFocus && this.data.todayFocus.progress) || 0)),
        blackboardHint: blackboardHint ? Object.assign({}, blackboardHint, { usedAt: blackboardUsedAt }) : undefined,
        blackboardUsedAt
      }) : null;
      this.setData({
        sessionMode: 'smart',
        todayFocus: focus || this.data.todayFocus,
        feedbackText: '\u5df2\u8fdb\u5165\u77ed\u56de\u8bbf\uff1a\u5148\u56de\u5fc6\u7b2c\u4e00\u6b65\uff0c\u518d\u505a\u4e00\u5f20\u53d8\u5f0f\u3002'
      });
      this.refresh();
      return;
    }
    this.goFocus();
  },

  runPlayableReviewTool(event) {
    const dataset = event && event.currentTarget ? event.currentTarget.dataset || {} : {};
    const toolId = dataset.id || 'quiz';
    const tool = (this.data.playableReviewTools || []).find((item) => item.id === toolId) || {};
    if (!tool.available) {
      this.setData({
        activeReviewTool: this.buildActiveReviewTool(Object.assign({}, tool, {
          id: toolId,
          title: tool.title || '短回访工具',
          line: '这个工具需要真实回访卡，不能用空题假跑。',
          status: '先补卡'
        }), null),
        feedbackText: '先生成一张真实回访卡，再运行短回访工具。'
      });
      return;
    }
    const cards = this.data.cards || [];
    const round = toolId === 'match' && revisitEngine.buildMatchRound
      ? revisitEngine.buildMatchRound(cards, { limit: 4 })
      : toolId === 'snake' && revisitEngine.buildSnakeRound
        ? revisitEngine.buildSnakeRound(cards, { limit: 3 })
        : revisitEngine.buildQuestRound
          ? revisitEngine.buildQuestRound(cards, { limit: 3, timeLimit: 90 })
          : null;
    if (storage.appendReviewEvent) {
      storage.appendReviewEvent({
        kind: 'playable_review_tool_started',
        tool_id: toolId,
        total: round && round.total ? round.total : 0,
        source: 'review_tab_toolbench'
      });
    }
    this.setData({
      activeReviewTool: this.buildActiveReviewTool(tool, round),
      practiceTemplateWorkbench: Object.assign({}, this.data.practiceTemplateWorkbench || {}, {
        id: `review_tool_${toolId}`,
        title: tool.title || '短回访工具',
        status: tool.status || '可开始',
        line: tool.line || '只使用真实回访卡，不展示原题答案和排名。',
        primaryAction: '开始',
        samples: ((round && (round.pairs || round.tracks || round.questions)) || []).slice(0, 3).map((item, index) => ({
          id: item.id || `${toolId}_${index}`,
          label: item.question || item.text || item.knowledgeType || tool.title,
          source: item.answer || item.knowledgeType || '回访卡'
        })),
        safetyLine: '只记录第一步、错因和明天回访，不展示分数比较或消费入口。'
      }),
      feedbackText: `已打开${tool.title || '短回访工具'}，本轮使用 ${round && round.total ? round.total : tool.count || 0} 张真实卡。`
    });
    if (toolId === 'quiz') {
      this.reveal();
    }
  },

  finishPlayableReviewTool(event) {
    const result = event && event.currentTarget && event.currentTarget.dataset
      ? event.currentTarget.dataset.result
      : 'remembered';
    const active = this.data.activeReviewTool || {};
    if (!active.id || active.empty) return;
    if (storage.appendReviewEvent) {
      storage.appendReviewEvent({
        kind: 'playable_review_tool_finished',
        tool_id: active.id,
        result,
        count: Number(active.itemCount || (Array.isArray(active.items) ? active.items.length : 0)),
        source: 'review_tab_live_tool',
        created_at: new Date().toISOString()
      });
    }
    this.setData({
      feedbackText: result === 'remembered'
        ? `${active.title}已记录：明天只回看同一错因。`
        : `${active.title}已记录：保留到下一轮回看。`
    });
    if (result === 'remembered') {
      this.rate({ currentTarget: { dataset: { rating: 'good' } } });
    }
  },

  runTemplateDeliverable(event) {
    const dataset = event && event.currentTarget ? event.currentTarget.dataset || {} : {};
    const route = dataset.route || '/pages/review/review?from=template_worksheet';
    const pack = this.data.practiceTemplatePack && this.data.practiceTemplatePack.id
      ? this.data.practiceTemplatePack
      : this.buildPracticeTemplatePack(this.data.practiceTemplateWorkshop, this.data.cards);
    const deliverable = (pack.deliverables || []).find((item) => item.id === dataset.id)
      || {
        id: dataset.id || 'worksheet_generator',
        label: dataset.label || '练习单生成器',
        route,
        count: 0,
        ready: true
      };
    const workbench = this.buildPracticeTemplateWorkbench(deliverable, pack);
    if (storage.appendReviewEvent) {
      storage.appendReviewEvent({
        kind: 'practice_template_deliverable',
        pack_id: pack.id || '',
        deliverable_id: dataset.id || '',
        deliverable_label: dataset.label || '',
        route,
        catalog_count: pack.catalogCount || 0,
        source_count: pack.sourceCount || 0
      });
    }
    this.setData({
      practiceTemplatePack: pack,
      practiceTemplateWorkbench: workbench,
      feedbackText: dataset.label
        ? `${dataset.label} 工作台已打开，本机只使用错因卡和第一步证据。`
        : '练习工坊交付物已打开，本机只使用错因卡和第一步证据。'
    });
  },

  onImportInput(event) {
    const importText = event.detail.value;
    const importPlan = reviewCards.contentEnginePlan(importText, {
      subject: (this.data.summary && this.data.summary.deck && this.data.summary.deck.subject) || ''
    });
    this.setData({
      importText,
      importPreview: importPlan.cards.slice(0, 5),
      importPlan
    });
  },

  importCards() {
    const text = String(this.data.importText || '').trim();
    if (!text) {
      wx.showToast({ title: '先粘贴笔记或卡点', icon: 'none' });
      return;
    }
    this.setData({ feedbackText: '正在调用内容引擎生成卡片...' });
    api.buildContentCards({
      text,
      subject: (this.data.summary && this.data.summary.deck && this.data.summary.deck.subject) || ''
    }).then((engineResult) => {
      const result = reviewCards.importGeneratedCards(engineResult.cards || [], {
        source: engineResult.provider || 'remote_ai_content_engine_v1'
      });
      this.setData({
        importText: '',
        importPreview: [],
        importPlan: null,
        feedbackText: `内容引擎已导入 ${result.imported || 0} 张，跳过重复 ${result.skipped || 0} 张`
      });
      this.syncQuietly();
      this.refresh();
    }).catch(() => {
      const result = reviewCards.importTextToDeck(text, { source: 'manual_import' });
      this.setData({
        importText: '',
        importPreview: [],
        importPlan: null,
        feedbackText: `本地内容引擎已导入 ${result.imported || 0} 张，跳过重复 ${result.skipped || 0} 张`
      });
      this.syncQuietly();
      this.refresh();
    });
  },

  onSettingInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [field]: event.detail.value });
  },

  onBrowserInput(event) {
    const query = event.detail.value;
    this.setData({
      browserQuery: query,
      browserCards: reviewCards.cardBrowser(this.browserPayload({ query }))
    });
  },

  setBrowserStatus(event) {
    const status = event.currentTarget.dataset.status || 'all';
    this.setData({ browserStatus: status, browserCards: reviewCards.cardBrowser(this.browserPayload({ status })) });
  },

  setBrowserSource(event) {
    const source = event.currentTarget.dataset.source || 'all';
    this.setData({ browserSource: source, browserCards: reviewCards.cardBrowser(this.browserPayload({ source })) });
  },

  setBrowserType(event) {
    const type = event.currentTarget.dataset.type || 'all';
    this.setData({ browserType: type, browserCards: reviewCards.cardBrowser(this.browserPayload({ type })) });
  },

  setBrowserTemplate(event) {
    const template = event.currentTarget.dataset.template || 'all';
    this.setData({ browserTemplate: template, browserCards: reviewCards.cardBrowser(this.browserPayload({ template })) });
  },

  exportDeck() {
    const text = JSON.stringify(reviewCards.exportDeckSnapshot());
    this.setData({
      deckSnapshotText: text,
      feedbackText: `已生成牌组快照，包含 ${reviewCards.reviewSummary().total} 张卡`
    });
  },

  onSnapshotInput(event) {
    this.setData({ deckSnapshotText: event.detail.value });
  },

  importDeckSnapshot() {
    const text = String(this.data.deckSnapshotText || '').trim();
    if (!text) {
      wx.showToast({ title: '先粘贴牌组 JSON', icon: 'none' });
      return;
    }
    try {
      const result = reviewCards.importDeckSnapshot(JSON.parse(text));
      this.setData({ feedbackText: `已合并 ${result.imported || 0} 张卡片` });
      this.syncQuietly();
      this.refresh();
    } catch (error) {
      wx.showToast({ title: 'JSON 格式不对', icon: 'none' });
    }
  },

  saveSettings() {
    const deck = reviewCards.updateDeckSettings({
      dailyLimit: Number(this.data.dailyLimit || 5),
      desiredRetention: Number(this.data.desiredRetention || 90) / 100
    });
    this.setData({
      feedbackText: `已更新：每日 ${deck.dailyLimit} 张，目标记忆率 ${Math.round(deck.desiredRetention * 100)}%`
    });
    this.refresh();
  },

  toggleEdit() {
    const current = this.data.current;
    this.setData({
      editOpen: !this.data.editOpen,
      editQuestion: current ? current.question : '',
      editAnswer: current ? current.answer : ''
    });
  },

  onEditInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [field]: event.detail.value });
  },

  saveEdit() {
    const current = this.data.current;
    if (!current) return;
    reviewCards.updateNote(current.noteId, {
      question: this.data.editQuestion,
      answer: this.data.editAnswer
    });
    this.setData({ feedbackText: '已更新卡片', editOpen: false });
    this.syncQuietly();
    this.refresh();
  },

  suspendCurrent() {
    const current = this.data.current;
    if (!current) return;
    reviewCards.setCardSuspended(current.id, true);
    this.setData({ feedbackText: '已暂停这张卡' });
    this.refresh();
  },

  resumeCard(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    reviewCards.setCardSuspended(id, false);
    this.setData({ feedbackText: '已恢复卡片' });
    this.refresh();
  },

  unburyCard(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    reviewCards.unburyCard(id);
    this.setData({ feedbackText: '已恢复兄弟卡' });
    this.refresh();
  },

  editQueueItem(event) {
    const noteId = event.currentTarget.dataset.noteId;
    if (!noteId) return;
    const result = reviewCards.repairNote(noteId);
    if (result && result.ok) {
      this.setData({
        feedbackText: `已自动修复卡片。质量 ${result.updated.quality}，新增练习 ${result.drillImported || 0}`
      });
      this.syncQuietly();
      this.refresh();
      return;
    }
    const card = reviewCards.cardByNote(noteId);
    if (!card) {
      wx.showToast({ title: '未找到对应卡片', icon: 'none' });
      return;
    }
    this.setData({
      current: card,
      showAnswer: true,
      editOpen: true,
      editQuestion: card.question || '',
      editAnswer: card.answer || '',
      feedbackText: '已定位到待修卡片'
    });
  },

  runPostRepairBridgeAction(event) {
    const dataset = event.currentTarget.dataset || {};
    const bridge = this.data.postRepairBridge || {};
    const route = dataset.route || '/pages/review/review';
    const action = {
      source: 'review_post_repair_bridge',
      sourceLabel: '修卡后行动桥',
      actionId: dataset.id || 'revisit',
      actionLabel: dataset.label || '5分钟短回访',
      route,
      reasonLine: dataset.reason || bridge.headline || '',
      evidenceLine: bridge.evidenceLine || '',
      shareIntent: bridge.parentLine || ''
    };
    if (storage.recordUnifiedNextAction) {
      storage.recordUnifiedNextAction(Object.assign({}, action, { surface: 'review' }));
    }
    if (storage.recordSurfaceDepthAction) {
      storage.recordSurfaceDepthAction({
        surface: 'review',
        dimensionId: action.actionId,
        label: action.actionLabel,
        route,
        readiness: 'review_post_repair_bridge',
        capabilityId: dataset.capabilityId || 'revisit'
      });
    }
    if (storage.appendReviewEvent) {
      storage.appendReviewEvent({
        kind: 'review_post_repair_bridge_action',
        action_id: action.actionId,
        route,
        evidence: action.evidenceLine
      });
    }
    api.submitEvent({
      event: 'review_post_repair_bridge_action',
      source: 'review_post_repair',
      entity_id: action.actionId,
      page: 'review',
      payload: {
        route,
        action_label: action.actionLabel,
        evidence: action.evidenceLine,
        reason: action.reasonLine
      }
    }).catch(() => {});
    navigation.navigateLearningRoute(route);
  },

  runRuleRetestAction() {
    const panel = this.data.ruleRetestPanel || {};
    const route = panel.revisitRoute || '/pages/review/review?from=rule_retest';
    if (storage.recordUnifiedNextAction) {
      storage.recordUnifiedNextAction({
        surface: 'review',
        source: 'rule_retest_panel',
        sourceLabel: '规则复测卡',
        actionId: 'rule_retest_revisit',
        actionLabel: '去做复测回访',
        route,
        reasonLine: panel.line || '',
        evidenceLine: panel.releaseGate || '',
        shareIntent: panel.parentLine || ''
      });
    }
    if (storage.appendReviewEvent) {
      storage.appendReviewEvent({
        kind: 'rule_retest_review_action',
        route,
        card_count: panel.count || 0
      });
    }
    navigation.navigateLearningRoute(route);
  },

  goTutor() {
    const current = this.data.lastWrongCard || this.data.current;
    if (current) {
      storage.set(storage.KEYS.selectedHomework, {
        id: `review_${current.id}`,
        text: current.question,
        reason: current.answer,
        minutes: 8,
        evidence: {
          tags: ['复习', current.type],
          decision: '来自原点复习，先拆卡点再继续。',
          calibration_key: current.calibrationKey || `review:${current.id}`,
          misconception_tags: [
            {
              id: current.id,
              name: current.weakPoint || current.type,
              axis: current.subject || '复习',
              suggested_drill: current.answer
            }
          ]
        }
      });
      storage.set(storage.KEYS.selectedHomeworkSource, `review:${current.id}`);
    }
    navigation.navigateLearningRoute('/pages/tutor/tutor?from=review');
  },

  goUpload() {
    navigation.navigateLearningRoute('/pages/upload/upload?from=review');
  },

  goHome() {
    navigation.switchTab('/pages/home/home');
  },

  goLearningMap() {
    wx.navigateTo({ url: '/pages/entry-detail/entry-detail?scene=today&from=review' });
  },

  openEntryDetail(event) {
    const dataset = event && event.currentTarget ? event.currentTarget.dataset || {} : {};
    const scene = dataset.scene || 'review';
    wx.navigateTo({
      url: `/pages/entry-detail/entry-detail?scene=${encodeURIComponent(scene)}&from=review`
    });
  },

  goFocus() {
    wx.navigateTo({ url: '/pages/entry-detail/entry-detail?scene=today&from=review_focus' });
  },

  goProfile() {
    navigation.switchTab('/pages/profile/profile');
  },
  runSurfaceDepthAction(event) {
    const dataset = event.currentTarget.dataset || {};
    const pack = this.data.surfaceDepthPack || {};
    const route = dataset.route || pack.primaryRoute;
    if (storage.recordSurfaceDepthAction) {
      storage.recordSurfaceDepthAction({
        surface: pack.surface || dataset.surface || '',
        dimensionId: dataset.dimensionId || '',
        label: dataset.label || '',
        route,
        readiness: pack.surfaceReadiness || ''
      });
    }
    navigation.navigateLearningRoute(route);
  },

  runUnifiedNextAction() {
    const next = this.data.unifiedNextAction || {};
    if (storage.recordUnifiedNextAction) {
      storage.recordUnifiedNextAction(Object.assign({}, next, { surface: 'review' }));
    }
    if (storage.recordSurfaceDepthAction) {
      storage.recordSurfaceDepthAction({
        surface: 'review',
        dimensionId: next.source || 'unified_next_action',
        label: next.actionLabel || '',
        route: next.route || '',
        readiness: 'unified_next_action'
      });
    }
    navigation.navigateLearningRoute(next.route || '/pages/tutor/tutor');
  },

});
