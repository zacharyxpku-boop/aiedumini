const priority = require('./learning-priority');
let learningReport = null;

try {
  learningReport = require('./learning-report');
} catch (error) {
  learningReport = null;
}

let gameLogic = null;
try {
  gameLogic = require('./game-logic');
} catch (error) {
  gameLogic = {
    updateStreak(profile = {}, options = {}) {
      const reviewedToday = Number(options.reviewedToday || 0);
      const today = new Date(options.now || new Date()).toISOString().slice(0, 10);
      if (reviewedToday <= 0) return profile;
      const last = profile.last_study_date || '';
      const streak = last === today ? Number(profile.streak || 1) : Number(profile.streak || 0) + 1;
      return Object.assign({}, profile, {
        streak,
        best_streak: Math.max(Number(profile.best_streak || 0), streak),
        last_study_date: today
      });
    },
    checkAndUnlockAchievements(stats = {}) {
      const current = Array.isArray(stats.achievements) ? stats.achievements : [];
      const next = Number(stats.review_count || 0) >= 1 && current.indexOf('first_review') < 0
        ? current.concat(['first_review'])
        : current;
      return { achievements: next, newlyUnlocked: next.length > current.length ? [{ id: 'first_review' }] : [], coinsAwarded: next.length > current.length ? 20 : 0 };
    }
  };
}

let productReadiness = null;
try {
  productReadiness = require('./product-readiness');
} catch (error) {
  productReadiness = null;
}

const KEYS = {
  state: 'ydzx.priority.state.v1',
  selectedHomework: 'ydzx.selected.homework.v1',
  selectedHomeworkSource: 'ydzx.selected.homework.source.v1',
  taskDraft: 'ydzx.task.draft.v1',
  profile: 'ydzx.profile.v1',
  consent: 'ydzx.guardian.consent.v1',
  session: 'ydzx.mini.session.v1',
  tutorMessages: 'ydzx.tutor.messages.v1',
  feedback: 'ydzx.feedback.v1',
  moduleEvents: 'ydzx.module.events.v1',
  moduleFeedback: 'ydzx.module.feedback.v1',
  tutorEvents: 'ydzx.tutor.events.v1',
  pilotRuns: 'ydzx.pilot.runs.v1',
  factoryEvents: 'ydzx.factory.events.v1',
  thinkingReceipts: 'ydzx.thinking.receipts.v1',
  reviewDeck: 'ydzx.review.deck.v1',
  reviewNotes: 'ydzx.review.notes.v1',
  reviewCards: 'ydzx.review.cards.v1',
  reviewEvents: 'ydzx.review.events.v1',
  gameProfile: 'ydzx.game.profile.v1',
  gamePurchases: 'ydzx.game.purchases.v1',
  shareRuns: 'ydzx.share.runs.v1',
  parentGoal: 'ydzx.parent.goal.v1',
  todayFocus: 'ydzx.today.focus.v1',
  tonightPlan: 'ydzx.tonight.plan.v1',
  incomingShare: 'ydzx.share.incoming.v1',
  clientIdentity: 'ydzx.client.identity.v1',
  syncState: 'ydzx.sync.state.v1',
  syncQueue: 'ydzx.sync.queue.v1',
  reviewLoop: 'ydzx.review.loop.v1',
  companionPreference: 'ydzx.companion.preference.v1',
  firstStepProfile: 'ydzx.first.step.profile.v1',
  taskTypePattern: 'ydzx.task.type.pattern.v1',
  parentInterventionLog: 'ydzx.parent.intervention.log.v1',
  scaffoldingChains: 'ydzx.scaffolding.chains.v1',
  lightFeatureEvents: 'ydzx.light.feature.events.v1',
  experienceChecklist: 'ydzx.experience.checklist.v1',
  validationSprint: 'ydzx.validation.sprint.v1',
  betaTester: 'ydzx.beta.tester.v1',
  localUserId: 'ydzx.local.user.id.v1',
  localAnalytics: 'ydzx.local.analytics.v1',
  firstRunGuide: 'ydzx.first.run.guide.v1',
  inviteLedger: 'ydzx.invite.ledger.v1',
  localFeedback: 'ydzx.local.feedback.v1',
  todaySession: 'ydzx.today.session.v1',
  learningReport: 'ydzx.learning.report.v1',
  surfaceDepthEvents: 'ydzx.surface.depth.events.v1',
  unifiedActionEvents: 'ydzx.unified.action.events.v1',
  localBackup: 'ydzx.local.backup.v1'
};

const COMPANION_OPTIONS = [
  {
    id: 'gudian',
    label: '咕点',
    short: '先动一小步',
    desc: '我懂你卡住了，我陪你先迈出第一步',
    copy: {
      home: '咕点陪你先找今晚第一步。',
      review: '咕点陪你只修这一小步，不讲完整答案。',
      tools: '咕点陪你轻轻回访昨天那一步。',
      profile: '咕点帮你整理成家长能看懂的一句话。'
    }
  }
];

const INTERNAL_LABELS = {
  home_xiaodian_entry: '作业点拨入口',
  home_route_cta: '今晚路线入口',
  home_top_must: '今晚关键任务',
  auto_first_must: '今晚第一项任务',
  quick_start_auto: '快速开始',
  radar_first_must: '今晚安排建议',
  needs_student_step: '等孩子先说第一步',
  thinking_started: '已经开始说想法',
  needs_repair: '需要修这一小步',
  blocked_answer_request: '先说第一步',
  ready_for_parent_review: '可以整理给家长看',
  method_summary_ready: '可以总结方法',
  read_problem: '读懂题目',
  write_first_step: '说第一步',
  find_direction: '找方向',
  find_conditions: '找条件',
  explain_misconception: '说错因',
  similar_example: '做小变式',
  method_summary: '总结方法',
  fast_mode: '快一点看方向',
  transfer: '举一反三',
  review: '轻回访',
  today_focus: '今天修过的卡点',
  thinking_receipt: '思路记录',
  homework_plan: '今晚路线',
  tutor: '作业点拨',
  module: '学习关卡',
  manual_import: '手动整理',
  remote_ai_content_engine_v1: '学习材料整理',
  rule_content_engine_v2: '本地材料整理'
};

const ROUTE_STAGE_LABELS = {
  plan: '排顺序',
  first_step: '说第一步',
  repair: '修卡点',
  review: '轻回访',
  parent: '整理给家长看'
};

const ISSUE_TYPE_LABELS = {
  '读题卡住': '读懂题目在问什么',
  '读题审题': '读懂题目在问什么',
  '概念不清': '概念和公式选择',
  '概念公式': '概念和公式选择',
  '步骤断点': '第一步怎么开始',
  '列式关系': '列式和关系',
  '计算粗心': '计算检查',
  '表达不完整': '写清解题过程',
  '思路卡点': '先说第一步',
  '卡点': '今天最卡的一步'
};

const COMPANION_STRIP_COPY = {
  gudian: '我懂你卡住了，我陪你先迈出第一步。'
};

const STAGE_ALIASES = {
  home: 'home_plan',
  plan: 'home_plan',
  stuck: 'home_stuck',
  review: 'review_focus',
  repair: 'review_repairing',
  completed: 'review_completed',
  tools: 'tools_recall',
  recall: 'tools_recall',
  profile: 'profile_summary',
  parent: 'parent_question'
};

const COMPANION_STAGE_COPY = {
  gudian: {
    home_plan: '咕点陪你先找今晚第一步。',
    home_stuck: '咕点懂你卡住了，我们先说清入口。',
    review_focus: '咕点陪你只修这一小步，不讲完整答案。',
    review_repairing: '咕点陪你先看第一眼，再说出自己的第一步。',
    review_completed: '咕点帮你记下这一小步，明天轻轻回访。',
    tools_recall: '咕点陪你轻轻回访昨天那一步。',
    tools_empty: '还没有回访卡。先修过一小步，明天咕点再来轻轻看。',
    profile_summary: '咕点帮你整理成家长能看懂的一句话。',
    profile_empty: '完成一次卡点修复后，咕点会整理给家长看。',
    parent_question: '咕点建议家长只问一句：这题第一步先看哪里？',
    next_step: '咕点陪你走下一步：先把当前这一步理顺。'
  }
};

function isInternalKey(value) {
  return /^[a-z]+(?:_[a-z0-9]+)+$/.test(String(value || ''));
}

function stripPrefixLabel(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const colonIndex = text.indexOf(':');
  if (colonIndex > 0 && isInternalKey(text.slice(0, colonIndex))) {
    return text.slice(colonIndex + 1).trim();
  }
  if (text.indexOf('module:') === 0) return '学习关卡';
  if (text.indexOf('review:') === 0) return '复习回访';
  if (text.indexOf('arcade:') === 0) return '轻回访';
  if (text.indexOf('factory_') === 0 || text.indexOf('factory:') === 0) return '学习材料整理';
  return text;
}

function formatInternalLabel(value, fallback = '先说第一步') {
  const text = stripPrefixLabel(value);
  if (!text) return fallback;
  if (INTERNAL_LABELS[text]) return INTERNAL_LABELS[text];
  if (ISSUE_TYPE_LABELS[text]) return ISSUE_TYPE_LABELS[text];
  if (isInternalKey(text)) return fallback;
  return text;
}

function formatSourceLabel(value, fallback = '今晚路线') {
  return formatInternalLabel(value, fallback);
}

function formatIssueType(value, fallback = '今天最卡的一步') {
  const text = stripPrefixLabel(value);
  if (!text) return fallback;
  if (ISSUE_TYPE_LABELS[text]) return ISSUE_TYPE_LABELS[text];
  if (INTERNAL_LABELS[text]) return INTERNAL_LABELS[text];
  if (isInternalKey(text)) return fallback === '今天最卡的一步' ? '先说第一步' : fallback;
  return text;
}

function formatRouteStage(value, fallback = '今晚路线') {
  const text = stripPrefixLabel(value);
  if (!text) return fallback;
  return ROUTE_STAGE_LABELS[text] || formatInternalLabel(text, fallback);
}

function companionById(id) {
  return COMPANION_OPTIONS.find((item) => item.id === id) || COMPANION_OPTIONS[0];
}

function buildCompanionPreference(input) {
  const selectedId = typeof input === 'string' ? input : input && input.selectedCompanion;
  const companion = companionById(selectedId);
  return Object.assign({}, input && typeof input === 'object' ? input : {}, {
    selectedCompanion: companion.id,
    selectedLabel: companion.label,
    updated_at: input && input.updated_at ? input.updated_at : new Date().toISOString()
  });
}

const memoryStore = {};
let nativeStorageAvailable = true;

function rawGet(key, fallback) {
  if (!nativeStorageAvailable) {
    return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : fallback;
  }
  try {
    const value = wx.getStorageSync(key);
    if (value !== undefined && value !== null && value !== '') {
      memoryStore[key] = value;
      return value;
    }
    return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : fallback;
  } catch (error) {
    nativeStorageAvailable = false;
    return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : fallback;
  }
}

function rawSet(key, value) {
  memoryStore[key] = value;
  if (!nativeStorageAvailable) return value;
  try {
    wx.setStorageSync(key, value);
  } catch (error) {
    nativeStorageAvailable = false;
  }
  return value;
}

function rawRemove(key) {
  delete memoryStore[key];
  if (!nativeStorageAvailable) return;
  try {
    wx.removeStorageSync(key);
  } catch (error) {
    nativeStorageAvailable = false;
  }
}

function createLocalUserId() {
  const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `user_${Date.now()}_${suffix}`;
}

function ensureLocalUserId() {
  const existing = rawGet(KEYS.localUserId, '');
  if (existing && String(existing).indexOf('user_') === 0) return existing;
  return rawSet(KEYS.localUserId, createLocalUserId());
}

function getLocalUserId() {
  return ensureLocalUserId();
}

function getUserKey(key) {
  const raw = String(key || '');
  if (!raw || raw === KEYS.localUserId) return raw;
  if (raw.indexOf('ydzx.') !== 0) return raw;
  return `${ensureLocalUserId()}:${raw}`;
}

function get(key, fallback) {
  return rawGet(getUserKey(key), fallback);
}

function set(key, value) {
  return rawSet(getUserKey(key), value);
}

function remove(key) {
  rawRemove(getUserKey(key));
}

function clearLearningData() {
  createLocalBackup('before_clear_learning_data');
  [
    KEYS.state,
    KEYS.selectedHomework,
    KEYS.selectedHomeworkSource,
    KEYS.taskDraft,
    KEYS.profile,
    KEYS.consent,
    KEYS.tutorMessages,
    KEYS.session,
    KEYS.feedback,
    KEYS.moduleEvents,
    KEYS.moduleFeedback,
    KEYS.tutorEvents,
    KEYS.pilotRuns,
    KEYS.factoryEvents,
    KEYS.thinkingReceipts,
    KEYS.reviewDeck,
    KEYS.reviewNotes,
    KEYS.reviewCards,
    KEYS.reviewEvents,
    KEYS.gameProfile,
    KEYS.gamePurchases,
    KEYS.shareRuns,
    KEYS.parentGoal,
    KEYS.todayFocus,
    KEYS.tonightPlan,
    KEYS.incomingShare,
    KEYS.syncState,
    KEYS.syncQueue,
    KEYS.reviewLoop,
    KEYS.companionPreference,
    KEYS.firstStepProfile,
    KEYS.taskTypePattern,
    KEYS.parentInterventionLog,
    KEYS.scaffoldingChains,
    KEYS.lightFeatureEvents,
    KEYS.experienceChecklist,
    KEYS.validationSprint,
    KEYS.betaTester,
    KEYS.localAnalytics,
    KEYS.firstRunGuide,
    KEYS.inviteLedger,
    KEYS.localFeedback,
    KEYS.todaySession,
    KEYS.learningReport
  ].forEach(remove);
}

function loadLocalAnalytics() {
  return Object.assign({ version: 1, events: [], counters: {} }, get(KEYS.localAnalytics, {}));
}

function recordLocalAnalytics(node, payload = {}) {
  const name = String(node || '').trim();
  if (!name) return null;
  const state = loadLocalAnalytics();
  const event = Object.assign({
    id: `analytics_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    node: name,
    createdAt: new Date().toISOString(),
    localUserId: getLocalUserId()
  }, payload || {});
  const counters = Object.assign({}, state.counters || {});
  counters[name] = Number(counters[name] || 0) + 1;
  const next = Object.assign({}, state, {
    events: [event].concat(state.events || []).slice(0, 800),
    counters,
    updatedAt: event.createdAt
  });
  set(KEYS.localAnalytics, next);
  return event;
}

function localAnalyticsDashboard() {
  const state = loadLocalAnalytics();
  const counters = state.counters || {};
  const nodes = [
    'light_entry_completed',
    'core_loop_entered',
    'first_step_confirmed',
    'focus_started',
    'focus_completed',
    'profile_viewed',
    'service_intent_clicked'
  ];
  return {
    localUserId: getLocalUserId(),
    totalEvents: (state.events || []).length,
    nodes: nodes.map((node) => ({ node, count: Number(counters[node] || 0) })),
    counters
  };
}

function isFirstTime() {
  return !get(KEYS.firstRunGuide, null);
}

function markFirstRunGuideSeen() {
  return set(KEYS.firstRunGuide, { seen: true, seenAt: new Date().toISOString() });
}

function loadInviteLedger() {
  return Object.assign({ invites: [], count: 0 }, get(KEYS.inviteLedger, {}));
}

function recordInvite(payload = {}) {
  const ledger = loadInviteLedger();
  const event = Object.assign({
    id: `invite_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ref: getLocalUserId(),
    path: `/pages/home/home?ref=${getLocalUserId()}`,
    createdAt: new Date().toISOString()
  }, payload || {});
  const invites = [event].concat(ledger.invites || []).slice(0, 100);
  return set(KEYS.inviteLedger, { invites, count: invites.length, updatedAt: event.createdAt });
}

function loadLocalFeedback() {
  const list = get(KEYS.localFeedback, []);
  return Array.isArray(list) ? list : [];
}

function saveLocalFeedback(payload = {}) {
  const text = String(payload.text || '').trim();
  const event = Object.assign({
    id: `feedback_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    page: payload.page || 'unknown',
    text,
    createdAt: new Date().toISOString()
  }, payload || {}, { text });
  return set(KEYS.localFeedback, [event].concat(loadLocalFeedback()).slice(0, 100));
}

function loadCompanionPreference() {
  return buildCompanionPreference(get(KEYS.companionPreference, {
    selectedCompanion: 'gudian',
    selectedLabel: '咕点',
    updated_at: ''
  }));
}

function saveCompanionPreference(input) {
  return set(KEYS.companionPreference, buildCompanionPreference(input));
}

function normalizeCompanionStage(stage) {
  const text = String(stage || '').trim();
  return STAGE_ALIASES[text] || text || 'home_plan';
}

function resolveCompanionStageArgs(first, second) {
  const firstText = String(first || '').trim();
  const secondText = String(second || '').trim();
  if (companionById(firstText).id === firstText && secondText) {
    return {
      stage: secondText,
      preference: buildCompanionPreference(firstText)
    };
  }
  return {
    stage: firstText,
    preference: second
  };
}

function companionCopyFor(stage, preference) {
  const normalizedStage = normalizeCompanionStage(stage);
  const pref = preference || loadCompanionPreference();
  const companion = companionById(pref.selectedCompanion);
  const voice = COMPANION_STAGE_COPY[companion.id] || COMPANION_STAGE_COPY.gudian;
  return voice[normalizedStage] || voice.home_plan;
}

function getCompanionStageCopy(stageOrCompanion, preferenceOrStage) {
  const args = resolveCompanionStageArgs(stageOrCompanion, preferenceOrStage);
  return companionCopyFor(args.stage, args.preference);
}

function formatCompanionLine(preference) {
  const pref = typeof preference === 'string'
    ? buildCompanionPreference(preference)
    : (preference || loadCompanionPreference());
  const companion = companionById(pref.selectedCompanion);
  return `${companion.label}：${COMPANION_STRIP_COPY[companion.id] || COMPANION_STRIP_COPY.gudian}`;
}

function currentGrowthMemory() {
  const focus = loadTodayFocus && loadTodayFocus();
  const cards = loadReviewCards && loadReviewCards();
  const focusCards = (Array.isArray(cards) ? cards : []).filter((card) => {
    return card && (card.source === 'today_focus' || card.sourceFocusId || card.issueType || card.weakPoint);
  });
  const latestCard = focusCards[0] || {};
  const rawIssueType = (focus && focus.issueType) || latestCard.issueType || latestCard.calibrationKey || '';
  const rawStuckPoint = (focus && focus.title) || latestCard.weakPoint || latestCard.title || latestCard.front || '';
  const issueType = formatIssueType(rawIssueType, '卡点');
  const stuckPoint = formatInternalLabel(rawStuckPoint, '第一步');
  return {
    hasMemory: !!(rawIssueType || rawStuckPoint || focusCards.length),
    issueType: issueType || '卡点',
    stuckPoint: stuckPoint || '第一步',
    sourceText: focus && (focus.sourceText || focus.thought),
    cardCount: focusCards.length
  };
}

function normalizeGrowthMemory(memory) {
  if (memory && typeof memory === 'object') {
    return Object.assign({
      hasMemory: !!(memory.issueType || memory.stuckPoint || memory.repeated || memory.topIssueType),
      issueType: formatIssueType(memory.issueType || memory.topIssueType || '', '第一步怎么开始'),
      stuckPoint: formatInternalLabel(memory.stuckPoint || memory.repeated || '', '第一步')
    }, memory);
  }
  return currentGrowthMemory();
}

function getGrowthMemoryLine(memory, companionInput) {
  const remembered = normalizeGrowthMemory(memory);
  if (!remembered.hasMemory) {
    return {
      empty: true,
      topIssueType: '积累中',
      repeated: '还没有重复卡点',
      oneLine: '本周还在积累卡点，先从今晚这一小步开始。',
      lines: ['本周还在积累卡点，先从今晚这一小步开始。'],
      tomorrowLine: ''
    };
  }
  const cardCount = Number(remembered.cardCount || 0);
  const isRepeated = cardCount >= 2 || remembered.repeatedCount >= 2 || remembered.hasRepeated === true;
  const companion = companionById((typeof companionInput === 'string'
    ? buildCompanionPreference(companionInput)
    : (companionInput || loadCompanionPreference())).selectedCompanion);
  const issue = formatIssueType(remembered.issueType, '先说第一步');
  const oneLine = isRepeated
    ? `最近常卡在：${issue}。咕点陪你先回来看这一小步。`
    : `今天记录到：${issue}。咕点先帮你留住这一小步。`;
  const tomorrowLine = '明天用 2 分钟再看一眼。';
  return {
    empty: false,
    topIssueType: formatIssueType(remembered.issueType, '第一步怎么开始'),
    repeated: formatInternalLabel(remembered.stuckPoint, '最近卡住的一步'),
    isRepeated,
    oneLine,
    lines: [oneLine, tomorrowLine],
    tomorrowLine
  };
}

function growthMemoryCopyFor(stage, preference) {
  const memory = currentGrowthMemory();
  if (!memory.hasMemory) {
    return '';
  }
  const companion = companionById((preference || loadCompanionPreference()).selectedCompanion);
  const id = companion.id;
  if (stage === 'home') {
    return getGrowthMemoryLine(memory, preference).oneLine;
  }
  if (stage === 'review') {
    return `你不是整题不会，只是卡在${memory.issueType}。对应修法：先说第一步，再做一道小变式。`;
  }
  if (stage === 'tools') {
    return '咕点陪你轻轻回访一下，不用一次做很多。';
  }
  if (stage === 'profile') {
    return getGrowthMemoryLine(memory, preference).oneLine;
  }
  return '';
}

function buildWeeklyGrowthMemory(preference) {
  const memory = currentGrowthMemory();
  const memoryLine = getGrowthMemoryLine(memory, preference);
  if (!memory.hasMemory) {
    return {
      title: '本周记得的一小步',
      topIssueType: memoryLine.topIssueType,
      repeated: memoryLine.repeated,
      oneLine: memoryLine.oneLine,
      lines: memoryLine.lines,
      tomorrowLine: memoryLine.tomorrowLine,
      empty: true,
      privacyLine: '只记录学习闭环需要的信息：今晚路线、卡点、回访卡和学习小结。'
    };
  }
  return {
    title: '本周记得的一小步',
    topIssueType: memoryLine.topIssueType,
    repeated: memoryLine.repeated,
    oneLine: memoryLine.oneLine,
    lines: memoryLine.lines,
    tomorrowLine: memoryLine.tomorrowLine,
    empty: false,
    privacyLine: '只记录学习闭环需要的信息：今晚路线、卡点、回访卡和学习小结。'
  };
}

function emptyLearningState() {
  return {
    source: '',
    grade: '',
    subject: '',
    score: 0,
    total_score: 0,
    weak_points: [],
    axes: [],
    homework_text: '',
    homework_plan: {
      must_do: [],
      flexible: [],
      can_skip: [],
      summary: {
        must_minutes: 0,
        saved_minutes: 0,
        misconception_count: 0
      }
    },
    weekly_review: null
  };
}

function loadState() {
  return get(KEYS.state, null) || emptyLearningState();
}

function saveState(state) {
  const saved = set(KEYS.state, Object.assign({}, state, { updated_at: new Date().toISOString() }));
  if (state) {
    appendSyncMutation('learning_state', {
      source: saved.source || '',
      grade: saved.grade || '',
      subject: saved.subject || '',
      weak_points: (saved.weak_points || []).slice(0, 8),
      homework_summary: saved.homework_plan && saved.homework_plan.summary
    });
  }
  return saved;
}

function loadProfile() {
  return get(KEYS.profile, {
    name: '',
    grade: '五年级',
    subject: '数学',
    minutes: 35
  });
}

function loadParentGoal() {
  return get(KEYS.parentGoal, {
    id: 'understand',
    label: '先讲懂',
    strategy: '先确认孩子是否理解，再决定要不要加练。',
    tutorMode: 'hint',
    reviewBias: 'balanced'
  });
}

function saveParentGoal(goal) {
  const saved = set(KEYS.parentGoal, Object.assign({
    id: 'understand',
    label: '先讲懂',
    strategy: '先确认孩子是否理解，再决定要不要加练。',
    tutorMode: 'hint',
    reviewBias: 'balanced'
  }, goal || {}));
  appendSyncMutation('parent_goal', {
    id: saved.id || '',
    label: saved.label || '',
    strategy: saved.strategy || '',
    tutor_mode: saved.tutorMode || '',
    review_bias: saved.reviewBias || ''
  });
  return saved;
}

function saveProfile(profile) {
  const saved = set(KEYS.profile, profile || {});
  appendSyncMutation('profile_update', {
    name: saved.name || '',
    grade: saved.grade || '',
    subject: saved.subject || '',
    minutes: Number(saved.minutes || 0)
  });
  return saved;
}

function defaultLearningReportState(nowInput = new Date()) {
  const now = new Date(sessionNowMs(nowInput));
  const iso = now.toISOString();
  return {
    reportDraft: {
      id: `learning_report_${iso.slice(0, 10).replace(/-/g, '')}`,
      title: '快速版学习画像',
      mode: 'fast',
      overview: {
        title: '学习画像总览',
        line: '先补一张成绩单或一段测评描述，咕点会先给出快速版画像。',
        evidence: ['当前还没有足够输入'],
        confidence: '低',
        missing: ['成绩单或手动分数']
      },
      capabilityTendencies: [],
      diagnosisMatrix: [],
      learningStyle: {
        id: 'style_tendency',
        label: '学习风格待确认',
        description: '补充一段测评或快测后，再看更合适的学习方式。',
        evidence: [],
        confidence: '低',
        missing: ['快速测评问卷']
      },
      rootCauses: [],
      recommendationPlan: {
        primaryModule: 'tutor',
        cta: {
          label: '先用咕点追问第一步',
          path: '/pages/tutor/tutor?from=learning_report',
          reason: '当前资料还不足，先从第一步开始最稳'
        },
        sevenDayPlan: [],
        parentLine: '家长先问一句：这一步你准备先看哪里？',
        childLine: '先把第一步说清楚。'
      },
      generatedAt: iso,
      missingItems: ['成绩单或手动分数', '年级/年龄/学校类型']
    },
    reportSources: [],
    recognitionDraft: null,
    reportProgress: {
      mode: 'fast',
      completeness: 0,
      label: '0% · 快速版',
      nextAction: '先补充一张成绩单或一段测评描述'
    },
    parsedScores: {},
    parsedRanks: {
      totalScore: null,
      totalRank: null,
      classRank: null,
      namedRanks: [],
      note: ''
    },
    profileBasics: {},
    behaviorSignals: {},
    emotionSignals: {},
    interestSignals: {},
    assessmentAnswers: [],
    capabilityTendencies: [],
    diagnosisMatrix: [],
    recommendationPlan: {
      primaryModule: 'tutor',
      cta: {
        label: '先用咕点追问第一步',
        path: '/pages/tutor/tutor?from=learning_report',
        reason: '当前资料还不足，先从第一步开始最稳'
      },
      sevenDayPlan: [],
      parentLine: '家长先问一句：这一步你准备先看哪里？',
      childLine: '先把第一步说清楚。',
      evidence: [],
      confidence: '低',
      missing: ['成绩单或手动分数']
    },
    reportCompleteness: 0,
    reportStatus: {
      state: 'draft',
      label: '可生成快速版',
      requiresConfirmation: true
    },
    lastSavedAt: iso
  };
}

function normalizeLearningReportState(input = {}, nowInput = new Date()) {
  const now = new Date(sessionNowMs(nowInput));
  const fallback = defaultLearningReportState(nowInput);
  const report = Object.assign({}, fallback, input || {});
  report.reportDraft = Object.assign({}, fallback.reportDraft, report.reportDraft || {});
  report.reportSources = Array.isArray(report.reportSources) ? report.reportSources : [];
  report.recognitionDraft = report.recognitionDraft && typeof report.recognitionDraft === 'object' ? report.recognitionDraft : null;
  report.reportProgress = Object.assign({}, fallback.reportProgress, report.reportProgress || {});
  report.parsedScores = Object.assign({}, report.parsedScores || {});
  report.parsedRanks = Object.assign({}, fallback.parsedRanks, report.parsedRanks || {});
  report.profileBasics = Object.assign({}, report.profileBasics || {});
  report.behaviorSignals = Object.assign({}, report.behaviorSignals || {});
  report.emotionSignals = Object.assign({}, report.emotionSignals || {});
  report.interestSignals = Object.assign({}, report.interestSignals || {});
  report.assessmentAnswers = Array.isArray(report.assessmentAnswers) ? report.assessmentAnswers : [];
  report.capabilityTendencies = Array.isArray(report.capabilityTendencies) ? report.capabilityTendencies : [];
  report.diagnosisMatrix = Array.isArray(report.diagnosisMatrix) ? report.diagnosisMatrix : [];
  report.recommendationPlan = Object.assign({}, fallback.recommendationPlan, report.recommendationPlan || {});
  report.reportCompleteness = Math.max(0, Math.min(100, Number(report.reportCompleteness || 0)));
  report.reportStatus = Object.assign({}, fallback.reportStatus, report.reportStatus || {});
  report.lastSavedAt = report.lastSavedAt || now.toISOString();
  return report;
}

function loadLearningReportState() {
  const state = get(KEYS.learningReport, null);
  return normalizeLearningReportState(state || {}, new Date());
}

function reportRouteTarget(path = '') {
  const value = String(path || '');
  if (value.indexOf('/pages/review/review') === 0) return 'review';
  if (value.indexOf('/pages/focus/focus') === 0) return 'focus';
  if (value.indexOf('/pages/profile/profile') === 0) return 'profile';
  if (value.indexOf('/pages/arcade/arcade') === 0) return 'arcade';
  if (value.indexOf('/pages/tools/tools') === 0) return 'tools';
  return 'tutor';
}

function firstReportWeakSubject(reportState = {}) {
  const matrix = (reportState.reportDraft && reportState.reportDraft.diagnosisMatrix)
    || reportState.diagnosisMatrix
    || [];
  return matrix.find((item) => item && item.mainCause && item.evidence)
    || matrix[0]
    || {};
}

function reportFirstStepText(reportState = {}) {
  const plan = reportState.recommendationPlan
    || (reportState.reportDraft && reportState.reportDraft.recommendationPlan)
    || {};
  const weak = firstReportWeakSubject(reportState);
  const subject = weak.subject || '\u5f53\u524d\u5361\u70b9';
  const cause = weak.mainCause || '';
  if (/review|wrong|card/.test(plan.primaryModule || '') || /\u65ad\u5c42|\u9519\u56e0/.test(cause)) return `\u5148\u56de\u770b${subject}\u7684\u4e00\u5f20\u9519\u56e0\u5361`;
  if (/focus/.test(plan.primaryModule || '') || /\u4e13\u6ce8|\u4e60\u60ef/.test(cause)) return `\u5148\u56f4\u7ed5${subject}\u575015\u5206\u949f`;
  if (/profile/.test(plan.primaryModule || '') || /\u60c5\u7eea|\u6c9f\u901a/.test(cause)) return `\u5148\u7528\u4e00\u53e5\u4f4e\u538b\u95ee\u9898\u627f\u63a5${subject}`;
  const dayOne = (plan.sevenDayPlan || [])[0];
  return dayOne && dayOne.task ? String(dayOne.task).slice(0, 58) : `\u5148\u8bf4\u6e05${subject}\u7684\u7b2c\u4e00\u6b65`;
}

function buildReportDailyActionQueue(options = {}) {
  const reportState = options.reportState || loadLearningReportState();
  const draft = reportState.reportDraft || {};
  const plan = reportState.recommendationPlan || draft.recommendationPlan || {};
  const solutionMap = reportState.solutionMap || draft.solutionMap || {};
  const tonightPlan = options.tonightPlan || loadTonightPlan() || {};
  const reportSolution = tonightPlan.reportSolution || {};
  const sevenDayPlan = (
    Array.isArray(plan.sevenDayPlan) && plan.sevenDayPlan.length
      ? plan.sevenDayPlan
      : Array.isArray(reportSolution.sevenDayPlan)
        ? reportSolution.sevenDayPlan
        : []
  ).slice(0, 7);
  const reportId = draft.id || reportState.reportId || reportSolution.reportId || '';
  const dayIndex = Math.max(1, Math.min(7, Number(options.day || options.dayIndex || 1)));
  const fallbackRoute = (plan.cta && plan.cta.path) || reportSolution.ctaPath || '/pages/tutor/tutor?from=learning_report';
  const nextEvidence = Array.isArray(solutionMap.nextEvidenceRequired) && solutionMap.nextEvidenceRequired.length
    ? solutionMap.nextEvidenceRequired
    : ['child_first_step', 'focus_or_review_record', 'next_day_revisit'];
  const queue = sevenDayPlan.map((item, index) => {
    const day = Number(item.day || index + 1);
    const route = item.path || fallbackRoute;
    return {
      id: `report_day_${reportId || 'local'}_${day}`,
      day,
      task: item.task || (day === 7 ? (solutionMap.reviewTrigger || '第 7 天做一次结果复核。') : '完成今天的一小步。'),
      minutes: Number(item.minutes || 10),
      module: item.module || plan.primaryModule || reportSolution.primaryModule || reportRouteTarget(route),
      route,
      checkpoint: item.checkpoint || item.parentPrompt || solutionMap.parentScript || plan.parentLine || '家长只问一句：这一步你准备先看哪里？',
      evidenceRequired: nextEvidence,
      status: day < dayIndex ? 'done' : day === dayIndex ? 'active' : 'next'
    };
  });
  const active = queue.find((item) => item.status === 'active') || queue[0] || null;
  const tomorrow = queue.find((item) => item.day === Math.min(7, dayIndex + 1)) || queue[1] || null;
  const finalReview = queue.find((item) => item.day === 7) || queue[queue.length - 1] || null;
  return {
    id: `report_daily_queue_${reportId || 'local'}`,
    reportId,
    ready: queue.length > 0,
    dayIndex,
    source: 'learning_report',
    active,
    tomorrow,
    finalReview,
    queue,
    actionLine: active ? active.task : '先生成学习画像，再进入 7 天行动板。',
    parentLine: active ? active.checkpoint : '家长先问一句：这一步你准备先看哪里？',
    evidenceLine: nextEvidence.join(' / '),
    route: active && active.route ? active.route : fallbackRoute
  };
}

function connectLearningReportToLocalLoop(reportState = {}, options = {}) {
  if (options.connectLoop === false) return null;
  const draft = reportState.reportDraft || {};
  const plan = reportState.recommendationPlan || draft.recommendationPlan || {};
  const solutionMap = reportState.solutionMap || draft.solutionMap || {};
  const appHandoff = solutionMap.appHandoff || {};
  const cta = plan.cta || {};
  const weak = firstReportWeakSubject(reportState);
  const reportId = draft.id || `learning_report_${localDateString(options.now || new Date())}`;
  const firstStep = reportFirstStepText(reportState);
  const routeTarget = reportRouteTarget(cta.path || '');
  const focus = saveTodayFocusFromThought(firstStep, {
    id: `focus_${reportId}`,
    source: 'learning_report',
    title: weak.subject ? `${weak.subject}\u5b66\u4e60\u753b\u50cf\u627f\u63a5` : '\u5b66\u4e60\u753b\u50cf\u627f\u63a5',
    issueType: weak.mainCause || '\u65b9\u6cd5\u5339\u914d\u5ea6',
    systemSuggestedStep: firstStep,
    recommendation: cta.reason || (plan.sevenDayPlan && plan.sevenDayPlan[0] && plan.sevenDayPlan[0].task) || '\u5148\u8bf4\u6e05\u7b2c\u4e00\u6b65\uff0c\u518d\u8fdb\u5165\u7ec3\u4e60\u3002',
    reportId,
    reportCompleteness: reportState.reportCompleteness,
    solutionRoute: cta.path || '/pages/tutor/tutor?from=learning_report',
    solutionModule: plan.primaryModule || routeTarget,
    nextPracticePlan: {
      reportId,
      module: plan.primaryModule || routeTarget,
      route: cta.path || '/pages/tutor/tutor?from=learning_report',
      sevenDayPlan: (plan.sevenDayPlan || []).slice(0, 7),
      parentLine: plan.parentLine || '',
      childLine: plan.childLine || '',
      solutionMap,
      appHandoff,
      parentScript: solutionMap.parentScript || plan.parentLine || '',
      childScript: solutionMap.childScript || plan.childLine || '',
      nextEvidenceRequired: solutionMap.nextEvidenceRequired || [],
      reviewTrigger: solutionMap.reviewTrigger || '',
      evidence: plan.evidence || weak.evidence || [],
      confidence: plan.confidence || weak.confidence || '\u4f4e',
      missing: plan.missing || weak.missing || []
    }
  });
  saveTodaySession({
    stuckPointText: firstStep,
    taskType: detectTaskType(firstStep, weak.subject || ''),
    taskTypeConfirmed: false,
    learningReportId: reportId,
    learningReportMode: draft.mode || (reportState.reportProgress && reportState.reportProgress.mode) || 'fast',
    learningReportCompleteness: Number(reportState.reportCompleteness || 0),
    recommendationPlan: {
      primaryModule: plan.primaryModule || routeTarget,
      ctaPath: cta.path || '',
      ctaLabel: cta.label || '',
      sevenDayPlan: (plan.sevenDayPlan || []).slice(0, 7),
      solutionMap,
      appHandoff,
      parentScript: solutionMap.parentScript || plan.parentLine || '',
      childScript: solutionMap.childScript || plan.childLine || '',
      nextEvidenceRequired: solutionMap.nextEvidenceRequired || [],
      reviewTrigger: solutionMap.reviewTrigger || ''
    }
  }, { now: options.now || new Date() });
  const route = saveTonightPlan(Object.assign({}, loadTonightPlan() || buildTonightPlan(firstStep, {}), {
    id: `route_${reportId}`,
    source: 'learning_report',
    reportId,
    focusId: focus && focus.id,
    routeStatus: routeTarget === 'review' ? 'review_scheduled' : 'focus_created',
    summaryLine: cta.reason || `\u5b66\u4e60\u753b\u50cf\u5df2\u751f\u6210\uff0c\u4eca\u665a\u5148\u505a\uff1a${firstStep}`,
    parentAdvice: plan.parentLine || '\u5bb6\u957f\u53ea\u95ee\u4e00\u53e5\uff1a\u8fd9\u4e00\u6b65\u4f60\u51c6\u5907\u5148\u770b\u54ea\u91cc\uff1f',
    reportSolution: {
      primaryModule: plan.primaryModule || routeTarget,
      ctaPath: cta.path || '',
      ctaLabel: cta.label || '',
      sevenDayPlan: (plan.sevenDayPlan || []).slice(0, 7),
      solutionMap,
      appHandoff,
      nextEvidenceRequired: solutionMap.nextEvidenceRequired || [],
      reviewTrigger: solutionMap.reviewTrigger || ''
    }
  }));
  const session = getTodaySession(options);
  const card = generateReviewCard(Object.assign({}, session, {
    reviewCardId: `report_review_${reportId}`,
    stuckPointText: firstStep,
    childArticulatedStep: session.childArticulatedStep || firstStep,
    firstStepQuality: childStepQuality(session.childArticulatedStep || firstStep)
  }));
  appendReviewEvent({
    type: 'learning_report_solution_connected',
    reportId,
    focusId: focus && focus.id,
    cardId: card && card.id,
    routeTarget,
    nextEvidenceRequired: solutionMap.nextEvidenceRequired || [],
    reviewTrigger: solutionMap.reviewTrigger || ''
  });
  const dailyQueue = buildReportDailyActionQueue({ reportState, tonightPlan: route });
  appendSyncMutation('report_daily_action_queue', {
    id: dailyQueue.id,
    report_id: reportId,
    active_day: dailyQueue.active && dailyQueue.active.day,
    active_task: dailyQueue.active && dailyQueue.active.task,
    route: dailyQueue.route,
    evidence_required: dailyQueue.evidenceLine,
    created_at: new Date().toISOString()
  });
  return { reportId, focus, route, card, routeTarget, dailyQueue };
}

function saveLearningReportState(nextState = {}, options = {}) {
  const nowInput = options.now || new Date();
  const normalized = normalizeLearningReportState(nextState, nowInput);
  if (learningReport && learningReport.buildLearningReportDraft && !options.skipBuild) {
    const built = learningReport.buildLearningReportDraft(Object.assign({}, normalized, options.input || {}));
    Object.assign(normalized, built);
    normalized.reportDraft = built.reportDraft || normalized.reportDraft;
  }
  normalized.lastSavedAt = nowInput.toISOString();
  const saved = set(KEYS.learningReport, normalized);
  appendSyncMutation('learning_report', {
    id: normalized.reportDraft && normalized.reportDraft.id ? normalized.reportDraft.id : `learning_report_${localDateString(nowInput)}`,
    completeness: Number(normalized.reportCompleteness || 0),
    mode: normalized.reportProgress && normalized.reportProgress.mode ? normalized.reportProgress.mode : 'fast',
    state: normalized.reportStatus && normalized.reportStatus.state ? normalized.reportStatus.state : 'draft',
    updated_at: normalized.lastSavedAt
  });
  if ((normalized.reportStatus && normalized.reportStatus.state === 'ready') || Number(normalized.reportCompleteness || 0) >= 28) {
    const connection = connectLearningReportToLocalLoop(normalized, options);
    if (connection) {
      saved.localLoopConnection = {
        reportId: connection.reportId,
        focusId: connection.focus && connection.focus.id,
        reviewCardId: connection.card && connection.card.id,
        routeTarget: connection.routeTarget
      };
      set(KEYS.learningReport, saved);
    }
  }
  return saved;
}

function saveLearningReportSource(source = {}, options = {}) {
  const current = loadLearningReportState();
  const normalizedSource = {
    id: source.id || `report_source_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: source.type || 'manual_text',
    label: source.label || '家长补充资料',
    text: String(source.text || source.rawText || source.content || '').trim(),
    confidence: Number.isFinite(Number(source.confidence)) ? Math.max(0.2, Math.min(0.98, Number(source.confidence))) : 0.72,
    status: source.status || '待家长确认',
    createdAt: source.createdAt || new Date().toISOString()
  };
  const next = Object.assign({}, current, {
    reportSources: [normalizedSource].concat(current.reportSources || []).slice(0, 30)
  });
  return saveLearningReportState(next, options);
}

function buildLearningReportFromInput(input = {}, options = {}) {
  if (!learningReport || !learningReport.buildLearningReportDraft) {
    return normalizeLearningReportState(input, options.now || new Date());
  }
  return learningReport.buildLearningReportDraft(Object.assign({}, loadLearningReportState(), input || {}));
}

function loadFeedback() {
  const list = get(KEYS.feedback, []);
  return Array.isArray(list) ? list : [];
}

function appendFeedback(item) {
  const next = [Object.assign({ created_at: new Date().toISOString() }, item || {})]
    .concat(loadFeedback())
    .slice(0, 80);
  set(KEYS.feedback, next);
  appendSyncMutation('homework_feedback', next[0]);
  return next;
}

function feedbackSummary() {
  const list = loadFeedback();
  const accurate = list.filter((item) => item.rating === 'accurate').length;
  const off = list.filter((item) => item.rating === 'off').length;
  return {
    total: list.length,
    accurate,
    off,
    label: list.length ? `已记录 ${list.length} 条校准` : '还没有校准记录'
  };
}

function loadPilotRuns() {
  const list = get(KEYS.pilotRuns, []);
  return Array.isArray(list) ? list : [];
}

function appendPilotRun(item) {
  const record = Object.assign({
    family: '',
    minutes_saved: 0,
    confidence: 3,
    review_returned: false,
    answer_blocks: 0,
    note: '',
    created_at: new Date().toISOString()
  }, item || {});
  const next = [record].concat(loadPilotRuns()).slice(0, 120);
  set(KEYS.pilotRuns, next);
  appendSyncMutation('pilot_run', record);
  return next;
}

function pilotRunSummary() {
  const list = loadPilotRuns();
  const total = list.length;
  const saved = list.reduce((sum, item) => sum + Number(item.minutes_saved || 0), 0);
  const confidence = total
    ? Math.round((list.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / total) * 10) / 10
    : 0;
  const returned = list.filter((item) => !!item.review_returned).length;
  const blocks = list.reduce((sum, item) => sum + Number(item.answer_blocks || 0), 0);
  return {
    total,
    minutesSaved: saved,
    avgMinutesSaved: total ? Math.round(saved / total) : 0,
    avgConfidence: confidence,
    reviewReturned: returned,
    returnRate: total ? Math.round((returned / total) * 100) : 0,
    answerBlocks: blocks,
    latest: list[0] || null,
    label: total
      ? `${total} pilot nights logged, ${saved} minutes saved, ${returned} review returns.`
      : 'No pilot evidence logged yet.'
  };
}

function loadFactoryEvents() {
  const list = get(KEYS.factoryEvents, []);
  return Array.isArray(list) ? list : [];
}

function appendFactoryEvent(item) {
  const record = Object.assign({
    event: 'factory_generated',
    input_type: '',
    provider: 'local',
    card_count: 0,
    quality_score: 0,
    imported: 0,
    created_at: new Date().toISOString()
  }, item || {});
  const next = [record].concat(loadFactoryEvents()).slice(0, 160);
  set(KEYS.factoryEvents, next);
  appendSyncMutation('factory_event', record);
  return next;
}

function factoryEventSummary() {
  const list = loadFactoryEvents();
  const generated = list.filter((item) => item.event === 'factory_generated').length;
  const imported = list.reduce((sum, item) => sum + Number(item.imported || 0), 0);
  const remote = list.filter((item) => String(item.provider || '').indexOf('remote') >= 0).length;
  const quality = list.length
    ? Math.round(list.reduce((sum, item) => sum + Number(item.quality_score || 0), 0) / list.length)
    : 0;
  const latest = list[0] || null;
  return {
    total: list.length,
    generated,
    imported,
    remote,
    local: Math.max(0, generated - remote),
    quality,
    latest,
    label: list.length
      ? `${generated} factory runs, ${imported} cards imported, quality ${quality}/100.`
      : 'No content factory runs yet.'
  };
}

function loadModuleEvents() {
  const list = get(KEYS.moduleEvents, []);
  return Array.isArray(list) ? list : [];
}

function trackModuleEvent(eventName, module, props = {}) {
  const item = {
    event: eventName,
    module_id: module && module.id,
    module_title: module && module.title,
    subject: module && module.subject,
    type: module && module.type,
    source: props.source || '',
    reason: props.reason || '',
    recommendation: props.recommendation || null,
    created_at: new Date().toISOString()
  };
  const next = [item].concat(loadModuleEvents()).slice(0, 120);
  set(KEYS.moduleEvents, next);
  appendSyncMutation('module_event', item);
  return next;
}

function moduleEventSummary() {
  const list = loadModuleEvents();
  const started = list.filter((item) => item.event === 'module_started').length;
  const viewed = list.filter((item) => item.event === 'module_viewed').length;
  const completed = list.filter((item) => item.event === 'module_completed').length;
  const subjects = {};
  list.forEach((item) => {
    if (!item.subject) return;
    subjects[item.subject] = (subjects[item.subject] || 0) + 1;
  });
  const topSubject = Object.keys(subjects).sort((a, b) => subjects[b] - subjects[a])[0] || '';
  return {
    total: list.length,
    viewed,
    started,
    completed,
    topSubject,
    feedback: loadModuleFeedback().length,
    useful: loadModuleFeedback().filter((item) => item.rating === 'useful').length,
    notUseful: loadModuleFeedback().filter((item) => item.rating === 'not_useful').length,
    label: list.length ? `已记录 ${list.length} 次模块行为` : '还没有模块行为记录'
  };
}

function loadModuleFeedback() {
  const list = get(KEYS.moduleFeedback, []);
  return Array.isArray(list) ? list : [];
}

function appendModuleFeedback(module, rating, props = {}) {
  const item = {
    module_id: module && module.id,
    module_title: module && module.title,
    subject: module && module.subject,
    type: module && module.type,
    rating,
    source: props.source || '',
    reason: props.reason || '',
    created_at: new Date().toISOString()
  };
  const next = [item].concat(loadModuleFeedback()).slice(0, 120);
  set(KEYS.moduleFeedback, next);
  appendSyncMutation('module_feedback', item);
  return next;
}

function moduleFeedbackMap() {
  const map = {};
  loadModuleFeedback().forEach((item) => {
    if (!item.module_id) return;
    if (!map[item.module_id]) map[item.module_id] = { useful: 0, notUseful: 0 };
    if (item.rating === 'useful') map[item.module_id].useful += 1;
    if (item.rating === 'not_useful') map[item.module_id].notUseful += 1;
  });
  return map;
}

function loadSurfaceDepthEvents() {
  const list = get(KEYS.surfaceDepthEvents, []);
  return Array.isArray(list) ? list : [];
}

function inferSurfaceDepthCapability(input = {}) {
  const surface = String(input.surface || '').trim() || 'home';
  const dimensionId = String(input.dimensionId || input.id || '').trim();
  const route = String(input.route || '').trim();
  const pack = buildSurfaceDepthPack(surface, { capabilityEvidenceLedger: input.capabilityEvidenceLedger || null });
  const capabilityCards = Array.isArray(pack.capabilityCards) ? pack.capabilityCards : [];
  const picked = capabilityCards.find((item) => item && item.id && dimensionId && item.id === dimensionId)
    || capabilityCards.find((item) => item && item.route && route && item.route === route)
    || (pack.capabilityLedgerSummary && pack.capabilityLedgerSummary.nextCapability)
    || capabilityCards[0]
    || {};
  return {
    capability_id: picked.id || '',
    capability_label: picked.label || '',
    capability_route: picked.route || '',
    capability_evidence_line: picked.evidenceLine || '',
    capability_next_action: picked.nextAction || ''
  };
}

function recordSurfaceDepthAction(input = {}) {
  const surface = String(input.surface || '').trim() || 'unknown';
  const dimensionId = String(input.dimensionId || input.id || '').trim() || 'next_action';
  const capability = inferSurfaceDepthCapability(Object.assign({}, input, { surface, dimensionId }));
  const item = {
    id: input.eventId || `surface_${Date.now()}_${randomPart()}`,
    event: 'surface_depth_action',
    surface,
    dimension_id: dimensionId,
    capability_id: input.capabilityId || capability.capability_id,
    capability_label: input.capabilityLabel || capability.capability_label,
    capability_route: input.capabilityRoute || capability.capability_route,
    capability_evidence_line: input.capabilityEvidenceLine || capability.capability_evidence_line,
    capability_next_action: input.capabilityNextAction || capability.capability_next_action,
    label: input.label || input.displayLabel || '',
    route: input.route || '',
    readiness: input.readiness || '',
    source: input.source || 'surface_depth_card',
    created_at: input.created_at || new Date().toISOString()
  };
  const next = [item].concat(loadSurfaceDepthEvents()).slice(0, 200);
  set(KEYS.surfaceDepthEvents, next);
  appendSyncMutation('surface_depth_action', item);
  return item;
}

function buildSurfaceDepthActionSummary() {
  const list = loadSurfaceDepthEvents();
  const surfaceCounts = {};
  const dimensionCounts = {};
  const capabilityCounts = {};
  list.forEach((item) => {
    if (item.surface) surfaceCounts[item.surface] = (surfaceCounts[item.surface] || 0) + 1;
    if (item.dimension_id) dimensionCounts[item.dimension_id] = (dimensionCounts[item.dimension_id] || 0) + 1;
    if (item.capability_id) capabilityCounts[item.capability_id] = (capabilityCounts[item.capability_id] || 0) + 1;
  });
  const topSurface = topCountKey(surfaceCounts);
  const topDimension = topCountKey(dimensionCounts);
  const topCapability = topCountKey(capabilityCounts);
  const recent = list.slice(0, 5).map((item) => Object.assign({}, item, {
    displayLabel: item.label || item.dimension_id || item.surface || '下一步'
  }));
  const latest = recent[0] || null;
  return {
    total: list.length,
    latest,
    topSurface,
    topDimension,
    topCapability,
    capabilityCounts,
    recent,
    routeEvidenceLabel: '路线证据',
    latestActionLabel: '最近一步',
    label: list.length ? `已记录 ${list.length} 次模块下一步行动` : '还没有模块下一步行动记录',
    parentLine: latest
      ? `最近从 ${latest.surface} 进入 ${latest.label || latest.dimension_id}`
      : '先从任一厚度卡进入下一步，家长页会留下路线证据。'
  };
}

function loadUnifiedActionEvents() {
  const list = get(KEYS.unifiedActionEvents, []);
  return Array.isArray(list) ? list : [];
}

function recordUnifiedNextAction(input = {}) {
  const source = String(input.source || '').trim() || 'unified_next_action';
  const item = {
    id: input.eventId || `unified_${Date.now()}_${randomPart()}`,
    event: 'unified_next_action',
    source,
    source_label: input.sourceLabel || '',
    label: input.actionLabel || input.label || '',
    route: input.route || '',
    reason_line: input.reasonLine || '',
    evidence_line: input.evidenceLine || '',
    surface: input.surface || '',
    candidate_count: Number(input.candidateCount || 0),
    created_at: input.created_at || new Date().toISOString()
  };
  const next = [item].concat(loadUnifiedActionEvents()).slice(0, 200);
  set(KEYS.unifiedActionEvents, next);
  appendSyncMutation('unified_next_action', item);
  return item;
}

function buildUnifiedNextActionSummary() {
  const list = loadUnifiedActionEvents();
  const sourceCounts = {};
  list.forEach((item) => {
    if (item.source) sourceCounts[item.source] = (sourceCounts[item.source] || 0) + 1;
  });
  const recent = list.slice(0, 5).map((item) => Object.assign({}, item, {
    displayLabel: item.label || item.source_label || item.source || '下一步'
  }));
  const latest = recent[0] || null;
  return {
    total: list.length,
    latest,
    topSource: topCountKey(sourceCounts),
    recent,
    label: list.length ? `已执行 ${list.length} 次建议下一步` : '还没有执行建议下一步',
    parentLine: latest
      ? `最近一次执行：${latest.source_label || latest.source} - ${latest.label || latest.route}`
      : '先从建议下一步进入，后续报告会记录真实执行路径。'
  };
}

function buildGlobalEvidenceBrief(options = {}) {
  const thinking = thinkingReceiptSummary();
  const surface = buildSurfaceDepthActionSummary();
  const unified = buildUnifiedNextActionSummary();
  const light = buildLightFeatureEvidenceSummary(options);
  const gameProfile = loadGameProfile();
  const shareRuns = loadShareRuns();
  const reviewEvents = loadReviewEvents();
  const reportState = loadLearningReportState();
  const questSignals = loadReviewEvents().filter((item) => item && item.event === 'quest_arc_game_signal');
  const reportConnected = !!(
    reportState.localLoopConnection
    || reportState.solutionMap
    || (reportState.reportDraft && reportState.reportDraft.solutionMap)
  );
  const gameCount = Number(gameProfile.reviewed_today || gameProfile.reviewedToday || gameProfile.review_count || 0);
  const cards = [
    {
      id: 'socratic',
      label: '追问证据',
      ready: Number(thinking.total || 0) > 0,
      line: thinking.latest && thinking.latest.shareLine
        ? thinking.latest.shareLine
        : thinking.label,
      route: '/pages/tutor/tutor'
    },
    {
      id: 'light_entry',
      label: '轻入口',
      ready: !!light.ready,
      line: light.ready ? light.parentLine : light.summary,
      route: light.route || '/pages/daily-math/daily-math'
    },
    {
      id: 'game',
      label: '练习回流',
      ready: gameCount > 0 || questSignals.length > 0,
      line: questSignals.length
        ? `已有 ${questSignals.length} 条故事任务回流`
        : gameCount
          ? `已有 ${gameCount} 次练习记录`
          : '先完成一局轻练习，把结果写回学习记录',
      route: '/pages/arcade/arcade'
    },
    {
      id: 'surface_action',
      label: '模块行动',
      ready: Number(surface.total || 0) > 0,
      line: surface.parentLine,
      route: surface.latest && surface.latest.route ? surface.latest.route : '/pages/home/home'
    },
    {
      id: 'unified_action',
      label: '建议下一步',
      ready: Number(unified.total || 0) > 0,
      line: unified.parentLine,
      route: unified.latest && unified.latest.route ? unified.latest.route : '/pages/home/home'
    },
    {
      id: 'share',
      label: '分享回流',
      ready: shareRuns.length > 0,
      line: shareRuns.length ? `已有 ${shareRuns.length} 条分享或回流记录` : '先整理一张家庭行动卡',
      route: '/pages/profile/profile'
    },
    {
      id: 'report',
      label: '报告落地',
      ready: reportConnected,
      line: reportConnected ? '学习画像已接入今晚路线或 7 天行动板' : '先把报告结论接到今晚第一步',
      route: '/pages/profile/profile'
    }
  ];
  const readyCount = cards.filter((item) => item.ready).length;
  const next = cards.find((item) => !item.ready) || cards[0] || null;
  return {
    title: '全局证据简报',
    summary: readyCount >= cards.length
      ? '追问、练习、行动、分享和报告已经能互相喂数据。'
      : `已闭合 ${readyCount}/${cards.length} 条关键证据线。`,
    reportLine: cards.filter((item) => item.ready).map((item) => item.label).join(' / ') || '先补一条真实学习证据',
    shareLine: next ? `下一步：${next.label} - ${next.line}` : '下一步已经闭合',
    parentLine: surface.total
      ? surface.parentLine
      : (thinking.total ? thinking.label : '先让孩子说出第一步，再沉淀到报告和家庭行动卡。'),
    readyCount,
    totalCount: cards.length,
    progress: cards.length ? Math.round((readyCount / cards.length) * 100) : 0,
    cards,
    lightFeatureEvidence: light,
    recentSurfaceActions: surface.recent,
    recentUnifiedActions: unified.recent,
    latestUnifiedAction: unified.latest,
    latestRoute: next && next.route ? next.route : '/pages/home/home',
    reviewEventCount: reviewEvents.length,
    generatedAt: options.now ? new Date(options.now).toISOString() : new Date().toISOString()
  };
}

function buildCapabilityEvidenceLedger(options = {}) {
  const globalEvidenceBrief = options.globalEvidenceBrief || buildGlobalEvidenceBrief(options);
  const learningDepthMap = options.learningDepthMap || buildLearningDepthMap(options);
  const learningQuestArc = options.learningQuestArc || buildLearningQuestArc(options);
  const moduleFlowCompass = options.moduleFlowCompass || buildModuleFlowCompass(options);
  const surfaceDepthActionSummary = options.surfaceDepthActionSummary || buildSurfaceDepthActionSummary();
  const unifiedSummary = options.unifiedSummary || buildUnifiedNextActionSummary();
  const lightFeatureEvidence = options.lightFeatureEvidence || buildLightFeatureEvidenceSummary(options);
  const thinking = options.thinkingSummary || thinkingReceiptSummary();
  const gameProfile = loadGameProfile();
  const shareRuns = loadShareRuns();
  const reportState = loadLearningReportState();
  const reviewEvents = loadReviewEvents();
  const parentDimension = learningDepthMap && Array.isArray(learningDepthMap.dimensions)
    ? learningDepthMap.dimensions.find((item) => item && (item.id === 'parent_coaching' || item.id === 'parent_reflection'))
    : null;
  const reportConnected = !!(
    reportState.localLoopConnection
    || reportState.solutionMap
    || reportState.reportDraft
    || (reportState.reportProgress && Number(reportState.reportProgress.completeness || 0) > 0)
  );
  const gameCount = Number(gameProfile.reviewed_today || gameProfile.reviewedToday || gameProfile.review_count || 0);
  const questSignals = reviewEvents.filter((item) => item && item.event === 'quest_arc_game_signal');
  const moduleReady = moduleFlowCompass && Number(moduleFlowCompass.readyCount || 0);
  const moduleTotal = moduleFlowCompass && Number(moduleFlowCompass.totalCount || 0);
  const rows = [
    {
      id: 'socratic',
      label: '点拨证据',
      ready: Number(thinking.total || 0) > 0 || Number(thinking.diagnosticProbes || 0) > 0,
      evidenceLine: thinking.latest && thinking.latest.shareLine ? thinking.latest.shareLine : (thinking.label || '还缺一次孩子自己说第一步的点拨回执'),
      nextAction: '让孩子先说出第一步，再判断卡点',
      route: '/pages/tutor/tutor'
    },
    {
      id: 'game',
      label: '游戏回流',
      ready: gameCount > 0 || questSignals.length > 0,
      evidenceLine: questSignals.length
        ? `已有 ${questSignals.length} 条剧情闯关证据`
        : gameCount
          ? `今日轻练 ${gameCount} 次`
          : '还缺一局能写回学习记录的轻练',
      nextAction: '打一小局，把错因或迁移结果写回复习队列',
      route: '/pages/arcade/arcade'
    },
    {
      id: 'report',
      label: '报告落地',
      ready: reportConnected,
      evidenceLine: reportConnected
        ? (globalEvidenceBrief.reportLine || '学习画像已经接到今晚路线')
        : '还缺把报告结论接到今晚第一步或 7 天行动',
      nextAction: '把报告从描述变成今日可执行动作',
      route: '/pages/profile/profile'
    },
    {
      id: 'share',
      label: '分享回流',
      ready: shareRuns.length > 0,
      evidenceLine: shareRuns.length ? `已有 ${shareRuns.length} 条分享或回流记录` : '还缺一张可转发的家庭行动卡',
      nextAction: '整理今日复盘卡，带上下一个动作',
      route: '/pages/profile/profile'
    },
    {
      id: 'light_entry',
      label: '轻入口证据',
      ready: !!(lightFeatureEvidence && lightFeatureEvidence.ready),
      evidenceLine: lightFeatureEvidence && (lightFeatureEvidence.parentLine || lightFeatureEvidence.summary)
        ? (lightFeatureEvidence.parentLine || lightFeatureEvidence.summary)
        : '口算、听写、手动诊断还缺回到核心链路的证据',
      nextAction: lightFeatureEvidence && lightFeatureEvidence.nextAction ? lightFeatureEvidence.nextAction : '从一个轻入口补一条第一步记录',
      route: lightFeatureEvidence && lightFeatureEvidence.route ? lightFeatureEvidence.route : '/pages/daily-math/daily-math'
    },
    {
      id: 'module_flow',
      label: '模块流转',
      ready: moduleReady >= Math.max(4, Math.ceil(moduleTotal * 0.6)),
      evidenceLine: moduleFlowCompass ? moduleFlowCompass.summary : '还缺跨模块流转罗盘',
      nextAction: moduleFlowCompass ? moduleFlowCompass.currentNextAction : '先补齐一个模块到下一模块的真实动作',
      route: moduleFlowCompass && moduleFlowCompass.currentRoute ? moduleFlowCompass.currentRoute : '/pages/home/home'
    },
    {
      id: 'parent_action',
      label: '家长动作',
      ready: !!(parentDimension && parentDimension.ready),
      evidenceLine: parentDimension ? parentDimension.evidence : (learningQuestArc && learningQuestArc.parentHook) || '还缺家长一问一答的回执',
      nextAction: '家长只问一句，确认孩子能复述第一步',
      route: '/pages/profile/profile'
    },
    {
      id: 'surface_action',
      label: '页面行动',
      ready: Number(surfaceDepthActionSummary.total || 0) > 0,
      evidenceLine: surfaceDepthActionSummary.parentLine || '还缺一次从页面深度卡触发的真实跳转',
      nextAction: '从当前页面深度卡执行一个下一步',
      route: surfaceDepthActionSummary.latest && surfaceDepthActionSummary.latest.route ? surfaceDepthActionSummary.latest.route : '/pages/home/home'
    },
    {
      id: 'next_action',
      label: '统一下一步',
      ready: Number(unifiedSummary.total || 0) > 0,
      evidenceLine: unifiedSummary.parentLine || (globalEvidenceBrief.shareLine || '还缺一次统一下一步执行记录'),
      nextAction: unifiedSummary.latest && unifiedSummary.latest.label ? unifiedSummary.latest.label : '执行系统推荐的下一步',
      route: unifiedSummary.latest && unifiedSummary.latest.route ? unifiedSummary.latest.route : (globalEvidenceBrief.latestRoute || '/pages/home/home')
    }
  ];
  const readyCount = rows.filter((item) => item.ready).length;
  const next = rows.find((item) => !item.ready) || rows[0] || null;
  const grouped = {
    child: rows.filter((item) => ['socratic', 'game', 'light_entry'].includes(item.id)),
    family: rows.filter((item) => ['report', 'share', 'parent_action'].includes(item.id)),
    system: rows.filter((item) => ['module_flow', 'surface_action', 'next_action'].includes(item.id))
  };
  return {
    title: '能力证据账本',
    summary: readyCount >= rows.length
      ? '孩子思考、游戏练习、家长动作、报告和分享已经能互相交账。'
      : `已闭合 ${readyCount}/${rows.length} 条能力证据，下一条先补：${next ? next.label : '继续积累真实记录'}`,
    readyCount,
    totalCount: rows.length,
    progress: rows.length ? Math.round((readyCount / rows.length) * 100) : 0,
    rows,
    grouped,
    nextCapability: next,
    parentLine: next
      ? `${next.label}：${next.nextAction}`
      : '继续沉淀真实学习材料，保持次日回看。',
    moatLine: '护城河不靠功能堆叠，而靠每次学习都留下可复用证据：思路、练习、复盘、分享和下一步互相回流。',
    generatedAt: options.now ? new Date(options.now).toISOString() : new Date().toISOString()
  };
}

function buildCapabilityMaturityQueue(options = {}) {
  const globalEvidenceBrief = options.globalEvidenceBrief || buildGlobalEvidenceBrief(options);
  const learningQuestArc = options.learningQuestArc || buildLearningQuestArc(options);
  const moduleFlowCompass = options.moduleFlowCompass || buildModuleFlowCompass(options);
  const capabilityLedger = options.capabilityEvidenceLedger || buildCapabilityEvidenceLedger(Object.assign({}, options, {
    globalEvidenceBrief,
    learningQuestArc,
    moduleFlowCompass
  }));
  const ledgerRows = Array.isArray(capabilityLedger.rows) ? capabilityLedger.rows : [];
  const surfaceSpecs = [
    {
      id: 'socratic_depth',
      label: '苏格拉底点拨',
      surface: 'tutor',
      route: '/pages/tutor/tutor',
      capabilities: ['socratic', 'module_flow', 'parent_action', 'next_action'],
      competitorLine: '对标 Khanmigo：不追求替孩子整题讲完，而是持续追问第一步、误区、迁移证据。',
      nextAction: '先完成一轮带误区判断的追问，并把回执接到修卡点。'
    },
    {
      id: 'game_retention',
      label: '游戏化回忆',
      surface: 'arcade',
      route: '/pages/arcade/arcade',
      capabilities: ['game', 'socratic', 'parent_action', 'next_action'],
      competitorLine: '对标 Gizmo：主动回忆和间隔复习要成为主循环，不只是小游戏外壳。',
      nextAction: '打一局后必须写回错因、第一步和下一次回访。'
    },
    {
      id: 'report_decision',
      label: '家长决策报告',
      surface: 'profile',
      route: '/pages/profile/profile',
      capabilities: ['report', 'parent_action', 'share', 'next_action'],
      competitorLine: '对标 Khanmigo 家长/教师视角：报告必须变成今晚行动和 7 天复核规则。',
      nextAction: '把报告结论执行成一条今日行动，并生成家长只问一句。'
    },
    {
      id: 'repair_to_recall',
      label: '修卡到回忆',
      surface: 'review',
      route: '/pages/review/review',
      capabilities: ['socratic', 'game', 'report', 'module_flow', 'next_action'],
      competitorLine: '对标成熟错题系统：错因不是静态标签，要回到同类变式和隔天回看。',
      nextAction: '先修一张真实卡点，再进入轻练或家长复盘。'
    },
    {
      id: 'light_entry_scale',
      label: '轻入口题型库',
      surface: 'light_diagnosis',
      route: '/pages/light-diagnosis/light-diagnosis',
      capabilities: ['light_entry', 'socratic', 'module_flow', 'next_action'],
      competitorLine: '借鉴千问可视化方向，但只做第一步种子库和错因图解，不承诺全科自动板书讲题。',
      nextAction: '从口算、听写或手动诊断补一条可复用第一步模型。'
    },
    {
      id: 'share_return_loop',
      label: '分享回流',
      surface: 'profile',
      route: '/pages/profile/profile',
      capabilities: ['share', 'parent_action', 'next_action', 'surface_action'],
      competitorLine: '分享不是拉新按钮，而是把家庭行动卡带回下一次学习。',
      nextAction: '发一张带能力缺口和下一步的家庭行动卡。'
    },
    {
      id: 'material_factory',
      label: '材料到资产',
      surface: 'tools',
      route: '/pages/tools/tools',
      capabilities: ['light_entry', 'module_flow', 'game', 'next_action'],
      competitorLine: '对标 Gizmo 的导入能力：现阶段先把本地材料稳定转成复习资产。',
      nextAction: '把一段材料或错题转成可回访卡，而不是停在输入框。'
    },
    {
      id: 'trust_boundary',
      label: '信任边界',
      surface: 'legal',
      route: '/pages/legal/legal',
      capabilities: ['parent_action', 'report', 'share', 'next_action'],
      competitorLine: '商用前信任边界必须清楚：未成年人、隐私、AI 边界和家长控制都要可解释。',
      nextAction: '确认边界后回到家长复盘或补一条真实材料。'
    }
  ];
  const maturityContracts = {
    socratic_depth: {
      acceptanceCriteria: ['孩子先说出自己的第一步', '系统只追问误区和证据', '点拨回执能转成修卡点或轻练'],
      fallbackPlan: ['沉默时给 A/B 微选择', '直接要答案时退回第一步小黑板', '连续卡住时交给家长只问一句'],
      evidenceRequired: ['child_first_step', 'diagnostic_probe', 'handoff_to_review']
    },
    game_retention: {
      acceptanceCriteria: ['每局先主动回忆再核对', '错误回到错因修复', 'XP 只奖励可复述的第一步'],
      fallbackPlan: ['连续错两次降级到小黑板', '疲劳时减少题量不清空成就', '隔天从同一错因再回访'],
      evidenceRequired: ['active_recall_cards', 'wrong_cause_return', 'memory_feedback_controller']
    },
    report_decision: {
      acceptanceCriteria: ['报告给出长期画像', '报告给出课堂级观察', '报告落到今晚动作和 7 天复核'],
      fallbackPlan: ['证据不足时只给观察假设', '不输出学习结果承诺', '先补一条真实材料再更新判断'],
      evidenceRequired: ['long_term_portrait', 'classroom_observation', 'seven_day_action']
    },
    repair_to_recall: {
      acceptanceCriteria: ['卡点有明确错因', '修复后生成同类变式', '结果进入轻练或家长复盘'],
      fallbackPlan: ['错因不清先回点拨', '同类题失败时降级到第一步', '次日未记住则重新排入回忆'],
      evidenceRequired: ['wrong_cause_label', 'near_transfer_attempt', 'next_day_recall']
    },
    light_entry_scale: {
      acceptanceCriteria: ['每个轻入口至少 5 个可复用种子', '种子有第一步和错因', '轻入口能回到核心链路'],
      fallbackPlan: ['无法识别时手动选择科目和卡点', '不生成完整答案', '只保存第一步证据'],
      evidenceRequired: ['light_seed_model', 'first_step_blackboard', 'light_to_core_transition']
    },
    share_return_loop: {
      acceptanceCriteria: ['分享卡带能力缺口', '回流页保留下一步', '分享不做排行和虚假社交'],
      fallbackPlan: ['缺证据时只分享家庭行动', '回流失败时落到首页下一步', '不展示同学比较'],
      evidenceRequired: ['capability_gap_share', 'share_landing_next_action', 'no_ranking_boundary']
    },
    material_factory: {
      acceptanceCriteria: ['材料变成复习卡', '卡片能进入轻练', '材料来源可追溯'],
      fallbackPlan: ['材料太薄时要求补一句卡点', '外部识别不可用时本地手动录入', '不把输入框伪装成自动导入'],
      evidenceRequired: ['material_to_card', 'source_trace', 'practice_asset']
    },
    trust_boundary: {
      acceptanceCriteria: ['未成年人和隐私边界清楚', 'AI 只做学习建议', '家长能看到可控范围'],
      fallbackPlan: ['涉及隐私时提示边界', '配置缺失时保留本地可用链路', '无法确认时回到人工/家长判断'],
      evidenceRequired: ['privacy_boundary', 'ai_suggestion_boundary', 'parent_control']
    }
  };
  const items = surfaceSpecs.map((spec) => {
    const pack = buildSurfaceDepthPack(spec.surface, Object.assign({}, options, {
      globalEvidenceBrief,
      learningQuestArc,
      moduleFlowCompass,
      capabilityEvidenceLedger: capabilityLedger
    }));
    const rows = spec.capabilities
      .map((id) => ledgerRows.find((row) => row && row.id === id))
      .filter(Boolean);
    const readyRows = rows.filter((row) => row.ready);
    const score = rows.length ? Math.round((readyRows.length / rows.length) * 100) : 0;
    const missing = rows.find((row) => !row.ready) || rows[0] || {};
    const contract = maturityContracts[spec.id] || {
      acceptanceCriteria: ['完成真实学习动作', '留下证据', '能进入下一步'],
      fallbackPlan: ['证据不足时先收窄动作', '无法自动判断时给家长可执行问题'],
      evidenceRequired: ['real_action', 'evidence_saved', 'next_action']
    };
    return {
      id: spec.id,
      label: spec.label,
      displayLabel: spec.label,
      surface: spec.surface,
      route: spec.route,
      ready: score >= 75 && pack.surfaceReadiness !== 'thin',
      score,
      readiness: pack.surfaceReadiness,
      evidenceLine: pack.evidenceLine || (missing.evidenceLine || ''),
      nextAction: missing.ready ? spec.nextAction : (missing.nextAction || spec.nextAction),
      nextCapability: missing.label || spec.label,
      competitorLine: spec.competitorLine,
      acceptanceCriteria: contract.acceptanceCriteria,
      fallbackPlan: contract.fallbackPlan,
      evidenceRequired: contract.evidenceRequired,
      acceptanceLine: `验收：${contract.acceptanceCriteria[0]}；${contract.acceptanceCriteria[1]}；${contract.acceptanceCriteria[2]}。`,
      fallbackLine: `兜底：${contract.fallbackPlan[0]}；${contract.fallbackPlan[1]}。`,
      evidenceContractLine: `证据：${contract.evidenceRequired.join(' / ')}`,
      parentCheckLine: `家长只看：${contract.acceptanceCriteria[0]}，不看完整答案或分数刺激。`,
      moatLine: `${spec.label} 的护城河不是功能名，而是：动作 -> 证据 -> 回访 -> 家长决策持续复利。`,
      visibleProof: rows.map((row) => ({
        id: row.id,
        label: row.label,
        ready: !!row.ready,
        evidenceLine: row.evidenceLine,
        route: row.route
      })),
      actionPayload: {
        source: 'capability_maturity_queue',
        actionLabel: spec.nextAction,
        reasonLine: spec.competitorLine,
        evidenceLine: pack.evidenceLine || '',
        route: spec.route
      }
    };
  }).sort((a, b) => {
    if (a.ready !== b.ready) return a.ready ? 1 : -1;
    return a.score - b.score;
  });
  const readyCount = items.filter((item) => item.ready).length;
  const next = items.find((item) => !item.ready) || items[0] || null;
  return {
    title: '全局能力厚度队列',
    summary: `已达标 ${readyCount}/${items.length} 个关键能力面。先补 ${next ? next.label : '真实学习证据'}，再谈更大范围竞品能力。`,
    benchmarkLine: '方向：家庭晚间作业闭环 + 第一手证据账本 + 家长低压行动板；借鉴竞品机制，不复制竞品定位。',
    positioningLine: '方向：家庭晚间作业闭环 + 第一手证据账本 + 家长低压行动板；借鉴竞品机制，不复制竞品定位。',
    readyCount,
    totalCount: items.length,
    progress: items.length ? Math.round((readyCount / items.length) * 100) : 0,
    next,
    items,
    reportLine: next ? `${next.label}：${next.nextAction}` : '关键能力面已经闭合，继续沉淀真实学习数据。',
    generatedAt: options.now ? new Date(options.now).toISOString() : new Date().toISOString()
  };
}

function buildEvidenceRouteBias(options = {}) {
  const brief = options.globalEvidenceBrief || buildGlobalEvidenceBrief(options);
  const incomingShare = options.incomingShare || loadIncomingShare() || null;
  const reportState = options.reportState || loadLearningReportState();
  const thinking = options.thinkingSummary || thinkingReceiptSummary();
  const reviewCards = options.reviewCards || loadReviewCards();
  const dueCount = reviewCards.filter((card) => card && (card.due || card.dueDate) && !card.isRevisited).length;
  const reportConnected = !!(
    reportState.localLoopConnection
    || reportState.solutionMap
    || (reportState.reportDraft && reportState.reportDraft.solutionMap)
  );
  const knownRoutes = {
    tutor: '/pages/tutor/tutor',
    review: '/pages/review/review',
    arcade: '/pages/arcade/arcade',
    profile: '/pages/profile/profile',
    focus: '/pages/focus/focus',
    home: '/pages/home/home'
  };
  let nextRoute = brief.latestRoute || knownRoutes.tutor;
  let gameModeBias = 'balanced';
  let weakKey = 'first_step';
  let questBias = 'socratic';
  let source = 'global_evidence';
  let reasonLine = brief.shareLine || brief.parentLine || '';
  let evidenceLine = brief.reportLine || '';

  if (incomingShare && incomingShare.parent_next_action) {
    source = 'incoming_share';
    weakKey = incomingShare.parent_next_action;
    questBias = 'parent';
    gameModeBias = incomingShare.parent_next_action.indexOf('wrong_cause') >= 0 ? 'repair' : 'balanced';
    nextRoute = incomingShare.parent_next_action.indexOf('revisit') >= 0 ? knownRoutes.review : knownRoutes.tutor;
    reasonLine = incomingShare.action_detail || incomingShare.action_label || reasonLine;
    evidenceLine = incomingShare.action_label || evidenceLine;
    if (incomingShare.capability_gap) {
      weakKey = incomingShare.capability_gap;
      questBias = incomingShare.capability_gap;
      nextRoute = incomingShare.capability_route || nextRoute;
      reasonLine = incomingShare.capability_next_action || reasonLine;
      evidenceLine = incomingShare.capability_label || evidenceLine;
    }
  } else if (dueCount > 0) {
    source = 'due_review';
    nextRoute = knownRoutes.review;
    gameModeBias = 'repair';
    weakKey = 'due_review';
    questBias = 'review';
    reasonLine = `有 ${dueCount} 张回访卡到期，先把昨天的方法接回来。`;
  } else if (!reportConnected && Number(brief.readyCount || 0) >= 2) {
    source = 'report_gap';
    nextRoute = knownRoutes.profile;
    gameModeBias = 'balanced';
    weakKey = 'report_connection';
    questBias = 'parent';
    reasonLine = '已有学习证据，但还没有接到家长能执行的报告动作。';
    evidenceLine = '补上报告到行动的连接';
  } else if (Number(thinking.total || 0) > 0 && Number(brief.reviewEventCount || 0) === 0) {
    source = 'socratic_to_game';
    nextRoute = knownRoutes.arcade;
    gameModeBias = 'stretch';
    weakKey = 'first_step';
    questBias = 'arcade';
    reasonLine = '孩子已经留下第一步，下一步需要一小局练习把结果写回记录。';
    evidenceLine = '把追问证据接到轻练习';
  }

  if (!Object.values(knownRoutes).includes(nextRoute)) nextRoute = knownRoutes.tutor;

  return {
    source,
    nextRoute,
    gameModeBias,
    weakKey,
    questBias,
    reasonLine,
    evidenceLine,
    progress: Number(brief.progress || 0),
    readyCount: Number(brief.readyCount || 0),
    totalCount: Number(brief.totalCount || 0)
  };
}

function loadTutorEvents() {
  const list = get(KEYS.tutorEvents, []);
  return Array.isArray(list) ? list : [];
}

function trackTutorEvent(eventName, payload = {}) {
  const selected = get(KEYS.selectedHomework, null);
  const source = get(KEYS.selectedHomeworkSource, '');
  const item = {
    event: eventName,
    selected_id: selected && selected.id,
    selected_text: selected && selected.text,
    source,
    module_id: source && source.indexOf('module:') === 0 ? source.replace('module:', '') : '',
    coach_step: payload.coach_step || '',
    mastery_status: payload.mastery_status || '',
    blocked: !!payload.blocked,
    created_at: new Date().toISOString()
  };
  const next = [item].concat(loadTutorEvents()).slice(0, 160);
  set(KEYS.tutorEvents, next);
  appendSyncMutation('tutor_event', item);
  return next;
}

function tutorEventSummary() {
  const list = loadTutorEvents();
  const completed = list.filter((item) => item.event === 'tutor_mastery_ready').length;
  const blocked = list.filter((item) => item.blocked || item.mastery_status === 'blocked_answer_request').length;
  const moduleRuns = list.filter((item) => item.module_id).length;
  return {
    total: list.length,
    completed,
    blocked,
    moduleRuns,
    label: list.length ? `已记录 ${list.length} 次作业点拨信号` : '还没有作业点拨记录'
  };
}

function loadThinkingReceipts() {
  const list = get(KEYS.thinkingReceipts, []);
  return Array.isArray(list) ? list : [];
}

function appendThinkingReceipt(receipt = {}) {
  const selected = get(KEYS.selectedHomework, null);
  const source = get(KEYS.selectedHomeworkSource, '');
  const checks = Array.isArray(receipt.checks) ? receipt.checks : [];
  const item = {
    id: receipt.id || `think_${Date.now()}_${randomPart()}`,
    title: receipt.title || 'THINKING RECEIPT',
    score: Math.max(0, Math.min(100, Number(receipt.score || 0))),
    status: receipt.status || '',
    focus: receipt.focus || (selected && selected.text) || '',
    selected_id: receipt.selected_id || (selected && selected.id) || '',
    selected_text: receipt.selected_text || (selected && selected.text) || '',
    source,
    coach_step: receipt.coach_step || receipt.activeStep || '',
    diagnostic_probe: receipt.diagnostic_probe || null,
    allowed_moves: Array.isArray(receipt.allowed_moves) ? receipt.allowed_moves.slice(0, 6) : [],
    transfer_prompt: receipt.transfer_prompt || '',
    mastery_status: receipt.mastery_status || '',
    risk: receipt.risk || '',
    shareLine: receipt.shareLine || '',
    checks: checks.map((check) => ({
      id: check.id || '',
      label: check.label || '',
      done: !!check.done,
      detail: check.detail || ''
    })),
    created_at: receipt.created_at || new Date().toISOString()
  };
  const next = [item].concat(loadThinkingReceipts()).slice(0, 120);
  set(KEYS.thinkingReceipts, next);
  appendSyncMutation('thinking_receipt', item);
  return next;
}

function thinkingReceiptSummary() {
  const list = loadThinkingReceipts();
  const countDone = (id) => list.filter((receipt) => {
    const checks = Array.isArray(receipt.checks) ? receipt.checks : [];
    return checks.some((check) => check.id === id && check.done);
  }).length;
  const total = list.length;
  const avgScore = total
    ? Math.round(list.reduce((sum, item) => sum + Number(item.score || 0), 0) / total)
    : 0;
  const blocked = list.filter((item) => item.status === 'answer shortcut blocked' || item.risk === 'high').length;
  const diagnosticProbes = list.filter((item) => item.diagnostic_probe).length;
  const transferPrompts = list.filter((item) => item.transfer_prompt).length;
  const latest = list[0] || null;
  return {
    total,
    avgScore,
    studentFirst: countDone('first'),
    wrongCauseNamed: countDone('cause'),
    answerCopyAvoided: countDone('safe'),
    proofSentence: countDone('proof'),
    blocked,
    diagnosticProbes,
    transferPrompts,
    latest,
    label: total
      ? `Thinking ledger has ${total} parent-visible tutor receipts, ${diagnosticProbes} diagnostic probes, and ${transferPrompts} transfer prompts.`
      : 'No thinking receipts yet.'
  };
}

const ISSUE_RULES = [
  {
    type: '列式关系',
    patterns: [
      /不会列式/,
      /不知道怎么列式/,
      /不知道用哪个关系/,
      /条件用不上/,
      /信息太多不知道怎么用/,
      /不知道单位\s*1/,
      /单位\s*1\s*(找不到|不确定|是谁|是哪个)?/,
      /等量关系找不到/,
      /不知道谁除以谁/,
      /不知道设什么/
    ]
  },
  {
    type: '读题审题',
    patterns: [
      /读不懂题/,
      /题目看不懂/,
      /不知道题目问什么/,
      /题目?条件太多.*不知道怎么用/,
      /条件太多.*不知道怎么用/,
      /关键词找不到/,
      /条件看漏/,
      /题意不清楚/
    ]
  },
  {
    type: '表达不完整',
    patterns: [
      /不知道怎么写过程/,
      /会想不会写/,
      /不会组织答案/,
      /不知道怎么答/,
      /写不完整/,
      /说不清/
    ]
  },
  {
    type: '概念公式',
    patterns: [
      /概念不清/,
      /公式想不起来/,
      /不知道用哪个公式/,
      /这个知识点忘了/,
      /定义不懂/,
      /概念/,
      /公式/
    ]
  },
  {
    type: '计算粗心',
    patterns: [
      /算错了?/,
      /老算错/,
      /计算错/,
      /符号错/,
      /单位错/,
      /抄错数/,
      /粗心/,
      /马虎/,
      /计算乱了/
    ]
  },
  {
    type: '步骤断点',
    patterns: [
      /不知道下一步/,
      /写到第[一二三四五六七八九十\d]+步就乱/,
      /做到一半不知道接着干什么/,
      /不知道先干什么/,
      /后面不会接/,
      /不知道从哪里开始/,
      /不知道第一步/,
      /第一步不会/,
      /下一步卡了?/,
      /不会下一步/,
      /步骤/,
      /下一步/
    ]
  }
];

function classifyIssueType(text = '') {
  const value = String(text || '').trim();
  if (!value) return '思路卡点';
  const hit = ISSUE_RULES.find((rule) => rule.patterns.some((pattern) => pattern.test(value)));
  return hit ? hit.type : '思路卡点';
}

function isStuckThought(text = '') {
  const value = String(text || '');
  if (/我(觉得|想|会)?应该先|我先|先找|先看|先圈|先列|先写/.test(value)
    && !/不知道|不会|卡|乱|不确定|找不到|用不上|想不起来|忘了|写不出|接不上/.test(value)) {
    return false;
  }
  return classifyIssueType(value) !== '思路卡点'
    || /卡住|不知道|不会|没思路|不懂|乱了|找不到|不确定|用不上|想不起来|忘了|写不出|接不上/.test(value);
}

function issueTypeFromThought(text = '') {
  return classifyIssueType(text);
}

function focusNameFromThought(text = '') {
  const value = String(text || '').trim();
  const compact = value.replace(/\s+/g, '');
  const snippets = [
    { pattern: /写到第[一二三四五六七八九十\d]+步就乱了?/, title: (match) => match[0].replace(/了$/, '了') },
    { pattern: /做到一半不知道接着干什么/, title: () => '做到一半不知道接着干什么' },
    { pattern: /不知道从哪里开始/, title: () => '不知道从哪里开始' },
    { pattern: /不知道第一步|第一步不会|下一步卡了?/, title: () => '第一步不知道怎么开始' },
    { pattern: /单位\s*1\s*(不确定|找不到|是谁|是哪个)?/, title: () => /不确定/.test(compact) ? '单位1不确定' : '单位1找不到' },
    { pattern: /条件太多.*不知道怎么用|信息太多.*不知道怎么用/, title: () => '条件太多不知道怎么用' },
    { pattern: /条件用不上/, title: () => '条件用不上' },
    { pattern: /等量关系找不到/, title: () => '等量关系找不到' },
    { pattern: /不会列式|不知道怎么列式/, title: () => '不知道怎么列式' },
    { pattern: /不知道题目问什么/, title: () => '不知道题目问什么' },
    { pattern: /读不懂题|题目看不懂/, title: () => '题目读不懂' },
    { pattern: /公式想不起来|不知道用哪个公式/, title: () => '公式想不起来' },
    { pattern: /概念不清|定义不懂/, title: () => '概念和定义不清楚' },
    { pattern: /计算乱了|老算错|算错了?/, title: () => '计算乱了' },
    { pattern: /符号错|单位错|抄错数/, title: (match) => match[0] },
    { pattern: /会想不会写/, title: () => '会想但写不出过程' },
    { pattern: /不知道怎么写过程|写不完整/, title: () => '过程写不完整' },
    { pattern: /不会组织答案|不知道怎么答/, title: () => '不知道怎么组织答案' }
  ];
  const found = snippets.find((item) => item.pattern.test(compact));
  if (found) {
    const match = compact.match(found.pattern) || [''];
    return found.title(match);
  }
  const issueType = issueTypeFromThought(value);
  if (issueType === '读题审题') return '读懂题目在问什么';
  if (issueType === '概念公式') return '概念和公式选择';
  if (issueType === '列式关系') return '列式和关系';
  if (issueType === '步骤断点') return '列式和下一步';
  if (issueType === '计算粗心') return '计算检查';
  if (issueType === '表达不完整') return '写清解题过程';
  if (/单词|拼写|年代|元素/.test(value)) return '记不牢的知识点';
  return isStuckThought(value) ? '不会下一步' : '先说清第一步';
}

function shouldCreateNewFocus(current, text = '') {
  if (!current || !current.id) return true;
  const today = new Date().toISOString().slice(0, 10);
  const currentDay = current.date || String(current.created_at || '').slice(0, 10);
  return currentDay !== today || (current.repairStatus === 'completed' && isStuckThought(text));
}

function addDaysIso(days, date = new Date()) {
  return new Date(date.getTime() + Number(days || 0) * 24 * 60 * 60 * 1000).toISOString();
}

function todayDueReviewCards(limit = 4) {
  const now = Date.now();
  return loadReviewCards()
    .filter((card) => {
      const dueTime = new Date(card.due || card.dueDate || card.created_at || 0).getTime();
      return !card.suspended && (card.source === 'today_focus' || card.sourceFocusId) && dueTime <= now;
    })
    .slice(0, limit);
}

function parseAvailableMinutes(text, fallback = 45) {
  const match = String(text || '').match(/(\d{1,3})\s*(分钟|分|min|mins|m)/i);
  if (!match) return Math.max(20, Math.min(90, Number(fallback || 45)));
  return Math.max(20, Math.min(120, Number(match[1] || fallback)));
}

function splitTonightHomework(text = '') {
  const value = String(text || '').trim();
  const lines = value
    .split(/\n|；|;|。/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !/^\d{1,3}\s*(分钟|分|min|mins|m)$/i.test(item));
  const fallback = [
    '数学应用题 3 道，明天必交',
    '英语单词 10 分钟，明天听写',
    '整理今天卡住的一步',
    '数学拓展题 2 道'
  ];
  return (lines.length ? lines : fallback).slice(0, 8);
}

function issueKeywords(issueType = '') {
  const value = String(issueType || '');
  if (value.indexOf('读题') >= 0) return /题意|读题|审题|条件|单位|问什么|应用题/;
  if (value.indexOf('概念') >= 0) return /概念|公式|定义|性质|原理|关系/;
  if (value.indexOf('步骤') >= 0) return /列式|步骤|下一步|应用题|方程|等量关系|过程/;
  if (value.indexOf('计算') >= 0) return /计算|运算|口算|竖式|符号|分数|小数/;
  if (value.indexOf('表达') >= 0) return /过程|表达|证明|写清|说明|复盘/;
  return /卡点|不会|错题|订正|应用题|条件|步骤/;
}

function normalizeHomeworkItem(line, index) {
  const text = String(line || '').trim();
  const subjectMatch = text.match(/^(数学|语文|英语|物理|化学|科学|历史|地理|生物)[:：]\s*(.*)$/);
  const subject = subjectMatch ? subjectMatch[1] : (/单词|英语|听写/.test(text) ? '英语' : /课文|作文|语文/.test(text) ? '语文' : /数学|应用题|列式|方程|计算|拓展题/.test(text) ? '数学' : '学习');
  const title = subjectMatch ? (subjectMatch[2] || text) : text;
  const estimated = (text.match(/(\d{1,3})\s*(分钟|分|min)/i) || [])[1];
  const isRequired = /必交|明天|老师|课堂|作业|听写|考试|测验/.test(text);
  const isExtension = /拓展|选做|提高|挑战|附加/.test(text);
  return {
    id: `hw_${Date.now()}_${index + 1}_${randomPart()}`,
    subject,
    title,
    dueText: /明天|必交|听写|测验/.test(text) ? '明天相关' : '今晚安排',
    estimatedMinutes: estimated ? Number(estimated) : (/单词|听写|抄写/.test(text) ? 10 : /拓展|选做/.test(text) ? 12 : 15),
    requiredLevel: isExtension ? '拓展' : isRequired ? '必交' : '建议',
    relatedIssueType: '',
    sourceText: text
  };
}

function scoreHomeworkForRoute(item, todayFocus, remainingMinutes) {
  const text = [item.subject, item.title, item.sourceText].join(' ');
  const required = item.requiredLevel === '必交';
  const extension = item.requiredLevel === '拓展';
  const related = todayFocus && todayFocus.issueType ? issueKeywords(todayFocus.issueType).test(text) : false;
  const shortNecessary = item.estimatedMinutes <= 10 && required;
  let score = 20;
  if (required) score += 36;
  if (related) score += 32;
  if (shortNecessary) score += 12;
  if (extension) score -= 22;
  if (/明天|必交|听写|测验/.test(text)) score += 10;
  if (remainingMinutes < item.estimatedMinutes) score -= 16;
  return { score, related, shortNecessary, extension, required };
}

function priorityLabelForRoute(meta, spent, availableMinutes) {
  if (spent >= availableMinutes) return '明天问老师';
  if (meta.extension || spent + 6 > availableMinutes) return '后置';
  if (meta.related && meta.required) return '先做';
  if (meta.related || meta.required) return '认真做';
  if (meta.shortNecessary) return '快速做';
  return '后置';
}

function buildRouteSteps(activeId) {
  const steps = [
    { id: 'plan', label: '排顺序' },
    { id: 'first_step', label: '说第一步' },
    { id: 'repair', label: '修卡点' },
    { id: 'review', label: '轻回访' },
    { id: 'parent', label: '家长看' }
  ];
  return steps.map((step) => Object.assign({}, step, { active: step.id === activeId }));
}

function buildTonightPlan(inputText = '', options = {}) {
  const todayFocus = loadTodayFocus();
  const reportDailyActionQueue = buildReportDailyActionQueue();
  const companionPreference = loadCompanionPreference();
  const memoryReason = growthMemoryCopyFor('home', companionPreference);
  const availableMinutes = Number(options.availableMinutes || parseAvailableMinutes(inputText, (loadProfile() || {}).minutes || 45));
  const dueCards = todayDueReviewCards(3);
  const homeworkItems = splitTonightHomework(inputText).map(normalizeHomeworkItem);
  const ranked = homeworkItems.map((item) => {
    const meta = scoreHomeworkForRoute(item, todayFocus, availableMinutes);
    return Object.assign({}, item, {
      relatedIssueType: meta.related && todayFocus ? todayFocus.issueType : '',
      routeScore: meta.score,
      routeMeta: meta
    });
  }).sort((a, b) => b.routeScore - a.routeScore);
  let spent = dueCards.length ? 8 : 0;
  const planItems = ranked.map((item, index) => {
    const label = index === 0 && !item.routeMeta.extension ? '先做' : priorityLabelForRoute(item.routeMeta, spent, availableMinutes);
    if (!['后置', '明天问老师'].includes(label)) spent += Number(item.estimatedMinutes || 0);
    const actionMap = {
      '先做': '先认真完成这一项，卡住时说出第一步。',
      '认真做': '按步骤慢一点做，遇到卡点先说一句。',
      '快速做': '用短时间完成，不拖到主任务后面。',
      '后置': '先放到后面，等必须任务和回访完成后再看。',
      '明天问老师': '今晚先记录问题，明天带着第一步去问老师。'
    };
    let reason = '安排在主任务后，保持今晚节奏。';
    if (item.relatedIssueType) {
      reason = memoryReason
        ? `${memoryReason} 最近“${item.relatedIssueType}”卡点会优先照顾。`
        : `和最近“${item.relatedIssueType}”卡点相关，值得先认真做。`;
    } else if (memoryReason && index === 0) {
      reason = memoryReason;
    } else if (item.requiredLevel === '必交') {
      reason = '这是学校任务里更需要先完成的一项。';
    } else if (item.requiredLevel === '拓展') {
      reason = '拓展题不抢今晚主线，先后置。';
    }
    return {
      homeworkId: item.id,
      title: item.title,
      subject: item.subject,
      priorityLabel: label,
      reason,
      suggestedAction: actionMap[label],
      parentPrompt: '你觉得这题第一步应该找什么？',
      estimatedMinutes: item.estimatedMinutes,
      requiredLevel: item.requiredLevel,
      relatedIssueType: item.relatedIssueType,
      sourceText: item.sourceText
    };
  });
  if (reportDailyActionQueue && reportDailyActionQueue.ready && reportDailyActionQueue.active) {
    planItems.unshift({
      homeworkId: reportDailyActionQueue.active.id || 'report_daily_action',
      title: reportDailyActionQueue.active.task,
      subject: '学习画像',
      priorityLabel: '先做',
      reason: '来自学习画像的 7 天行动板，先把今天这一小步接到今晚路线。',
      suggestedAction: reportDailyActionQueue.active.task,
      parentPrompt: reportDailyActionQueue.active.checkpoint,
      estimatedMinutes: reportDailyActionQueue.active.minutes,
      requiredLevel: '建议',
      relatedIssueType: reportDailyActionQueue.active.module,
      route: reportDailyActionQueue.active.route,
      reportDailyActionId: reportDailyActionQueue.active.id,
      evidenceRequired: reportDailyActionQueue.active.evidenceRequired
    });
  }
  if (dueCards.length) {
    planItems.push({
      homeworkId: 'review_today_focus',
      title: '回访今天修过的卡点',
      subject: '复习',
      priorityLabel: '认真做',
      reason: '留 5-10 分钟回访，确认不是只看懂，而是真的会说第一步。',
      suggestedAction: '用一张回访卡轻轻确认。',
      parentPrompt: '这类题下次第一步先查什么？',
      estimatedMinutes: 8,
      requiredLevel: '建议',
      relatedIssueType: todayFocus && todayFocus.issueType,
      reviewCardIds: dueCards.map((card) => card.id)
    });
  }
  const first = planItems[0] || null;
  return {
    id: options.id || `route_${Date.now()}_${randomPart()}`,
    date: new Date().toISOString().slice(0, 10),
    availableMinutes,
    homeworkItems,
    planItems,
    focusId: todayFocus && todayFocus.id,
    reviewCardIds: dueCards.map((card) => card.id),
    reportDailyAction: reportDailyActionQueue && reportDailyActionQueue.ready ? reportDailyActionQueue.active : null,
    parentAdvice: '家长只问一句：你觉得这题第一步应该找什么？不要直接讲最终结果。',
    parentPrompt: '你觉得这题第一步应该找什么？',
    routeStatus: todayFocus && todayFocus.repairStatus === 'completed'
      ? 'review_scheduled'
      : todayFocus && todayFocus.id
        ? 'focus_created'
        : 'needs_input',
    summaryLine: first
      ? `今晚建议顺序：先做${first.title}，再留 5-10 分钟回访卡点。${memoryReason ? ` ${memoryReason}` : ''}`
      : '今晚建议顺序：先排学校任务，再留 5-10 分钟轻回访。',
    routeSteps: buildRouteSteps('plan'),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

function loadTonightPlan() {
  const plan = get(KEYS.tonightPlan, null);
  if (!plan || typeof plan !== 'object') return null;
  return plan;
}

function saveTonightPlan(plan = {}) {
  const saved = set(KEYS.tonightPlan, Object.assign({}, plan || {}, {
    updated_at: new Date().toISOString()
  }));
  appendSyncMutation('tonight_route', {
    id: saved.id,
    date: saved.date,
    available_minutes: Number(saved.availableMinutes || 0),
    route_status: saved.routeStatus || '',
    focus_id: saved.focusId || '',
    review_card_ids: saved.reviewCardIds || []
  });
  return saved;
}

function createTonightPlanFromInput(text = '', options = {}) {
  return saveTonightPlan(buildTonightPlan(text, options));
}

function updateTonightRouteStatus(status, patch = {}) {
  const current = loadTonightPlan() || buildTonightPlan('', {});
  const activeMap = {
    needs_input: 'plan',
    focus_created: 'first_step',
    repaired: 'repair',
    review_scheduled: 'review',
    parent_ready: 'parent'
  };
  return saveTonightPlan(Object.assign({}, current, patch || {}, {
    routeStatus: status || current.routeStatus || 'needs_input',
    routeSteps: buildRouteSteps(activeMap[status] || 'plan')
  }));
}

function isValidMiniActionText(text = '') {
  const value = String(text || '').trim();
  if (!value) return false;
  const compact = value.replace(/\s+/g, '');
  if (compact.length < 3) return false;
  if (/^(不知道|不会|随便|没有|无|求答案|直接看答案|看答案|答案)$/.test(compact)) return false;
  if (/求答案|直接看答案|拍照出答案|答案已生成/.test(compact)) return false;
  return /[\u4e00-\u9fa5]{3,}|[a-zA-Z0-9]{5,}/.test(compact);
}

function sanitizeMiniActionText(text = '') {
  return String(text || '').trim().replace(/\s+/g, ' ').slice(0, 80);
}

const FIRST_STEP_QUICK_CHOICES = [
  '我先圈出题干条件',
  '我先找关键词',
  '我先写出已知量',
  '我先把第一句话读慢一点',
  '我先找等量关系'
];

const FIRST_STEP_TEMPLATES = {
  math_word_problem: [
    '先把题干里的已知条件圈出来。',
    '先找题目问的是什么。'
  ],
  equation_setup: [
    '先把未知数写成 x。',
    '先找等量关系。'
  ],
  reading_question: [
    '先看题目问的是细节、主旨还是原因。'
  ],
  english_sentence: [
    '先找主语和谓语。'
  ],
  physics_diagram: [
    '先画研究对象和方向。',
    '先标出已知量和要求量。'
  ],
  chemistry_experiment: [
    '先写清反应物和现象。',
    '先判断颜色、气体或沉淀来自哪里。'
  ],
  biology_process: [
    '先说结构对应的功能。',
    '先按过程顺序排三步。'
  ],
  geography_map: [
    '先在图上定位方向和位置。',
    '先说这一现象的第一条原因链。'
  ],
  writing_process: [
    '先写一句最简单的开头。'
  ],
  unknown: [
    '先把题目问什么说出来。'
  ]
};

function detectTaskType(text = '', extra = '') {
  const value = `${text || ''} ${extra || ''}`.toLowerCase();
  if (/物理|受力|电路|光路|运动|速度|压强|浮力|杠杆|透镜|physics|force|circuit/.test(value)) return 'physics_diagram';
  if (/化学|反应|方程式|溶液|气体|沉淀|颜色|酸碱|离子|chemistry/.test(value)) return 'chemistry_experiment';
  if (/生物|细胞|植物|人体|遗传|生态|光合|消化|对照组|biology/.test(value)) return 'biology_process';
  if (/地理|地图|经纬|气候|公转|自转|昼夜|季风|地形|geography|map/.test(value)) return 'geography_map';
  if (/方程|等量|未知数|x|列方程|解方程/.test(value)) return 'equation_setup';
  if (/应用题|题干|条件|已知|问什么|关键词|数量关系|单位/.test(value)) return 'math_word_problem';
  if (/阅读|读不懂|主旨|细节|原因|文章|段落|题目问/.test(value)) return 'reading_question';
  if (/英语|英文|句子|主语|谓语|单词|语法|sentence|subject|verb/.test(value)) return 'english_sentence';
  if (/作文|写作|开头|过程|表达|写不出来|怎么写/.test(value)) return 'writing_process';
  return 'unknown';
}

function firstStepTemplatesForTaskType(taskType = 'unknown') {
  return (FIRST_STEP_TEMPLATES[taskType] || FIRST_STEP_TEMPLATES.unknown).slice();
}

function suggestedStepForTaskType(taskType = 'unknown') {
  return firstStepTemplatesForTaskType(taskType)[0] || FIRST_STEP_TEMPLATES.unknown[0];
}

const SUBJECT_SKILL_DEPTH = {
  math_word_problem: {
    label: '数学应用题',
    blackboard: ['圈已知条件', '标问题句', '说数量关系'],
    socratic: ['题目问的到底是什么？', '哪两个量之间有关系？', '换一个数字时第一步还一样吗？'],
    game: ['找关键词', '配数量关系', '说第一步'],
    report: '应用题先看读题、关系、单位三处证据。',
    parent: '你先圈了哪一句？为什么先看这句？',
    evidenceRequired: ['known_conditions', 'question_sentence', 'relation_sentence']
  },
  equation_setup: {
    label: '方程建模',
    blackboard: ['写未知数', '找等量关系', '再列式'],
    socratic: ['你准备用什么表示未知量？', '左右两边什么相等？', '如果单位变了要先检查什么？'],
    game: ['未知数卡', '等量关系卡', '变式检查卡'],
    report: '方程题重点看未知量、等量关系和变式迁移。',
    parent: '这题你设的 x 表示什么？两边为什么相等？',
    evidenceRequired: ['unknown_defined', 'equation_relation', 'transfer_check']
  },
  reading_question: {
    label: '阅读理解',
    blackboard: ['判断题型', '回文定位', '证据句复述'],
    socratic: ['这题问细节、主旨还是原因？', '原文哪一句能做证据？', '答案有没有超出原文？'],
    game: ['题型分类', '关键词定位', '证据句匹配'],
    report: '阅读题重点看题型判断、回文定位和答案边界。',
    parent: '你凭原文哪一句判断？这句能不能直接支持答案？',
    evidenceRequired: ['question_type', 'text_evidence', 'answer_boundary']
  },
  english_sentence: {
    label: '英语句法',
    blackboard: ['找主语', '找谓语', '看时态/修饰'],
    socratic: ['谁在做动作？', '真正的谓语在哪里？', '时态线索是哪一个词？'],
    game: ['主谓配对', '时态判断', '句子骨架'],
    report: '英语句子重点看主谓骨架、时态线索和修饰边界。',
    parent: '这句话谁做动作？动作词是哪一个？',
    evidenceRequired: ['subject_found', 'verb_found', 'tense_signal']
  },
  physics_diagram: {
    label: '物理图解',
    blackboard: ['定研究对象', '标方向/状态', '匹配规律'],
    socratic: ['研究对象是谁？', '图上先标哪个方向或状态？', '这一步对应哪条物理规律？'],
    game: ['对象卡', '方向卡', '规律匹配卡'],
    report: '物理题重点看对象、图示第一笔和规律匹配。不能只看公式有没有背。 ',
    parent: '你先画的是哪个对象？箭头或状态为什么先标这里？',
    evidenceRequired: ['object_selected', 'diagram_first_mark', 'law_match']
  },
  chemistry_experiment: {
    label: '化学实验',
    blackboard: ['列物质状态', '看实验现象', '回到守恒/条件'],
    socratic: ['反应前有哪些物质？', '现象是颜色、气体还是沉淀？', '这一步和守恒或条件有什么关系？'],
    game: ['物质状态卡', '现象原因卡', '守恒复核卡'],
    report: '化学题重点看物质状态、实验现象和守恒条件。不能只背方程式。',
    parent: '你先说反应前后分别有什么，再说现象从哪里来。',
    evidenceRequired: ['substance_state', 'phenomenon_reason', 'conservation_check']
  },
  biology_process: {
    label: '生物过程',
    blackboard: ['找结构', '说功能', '排过程顺序'],
    socratic: ['这个结构负责什么功能？', '过程先后顺序是什么？', '哪一个现象能支持结论？'],
    game: ['结构功能卡', '过程排序卡', '证据解释卡'],
    report: '生物题重点看结构功能、过程顺序和证据解释。不能只背名词。',
    parent: '你先说这个结构有什么用，再排前后三步。',
    evidenceRequired: ['structure_function', 'process_order', 'evidence_reason']
  },
  geography_map: {
    label: '地理读图',
    blackboard: ['读方向/图例', '定位区域', '串因果链'],
    socratic: ['图上先看方向还是图例？', '这个区域的位置特征是什么？', '地形、气候或人类活动哪条先影响结果？'],
    game: ['图例定位卡', '区域特征卡', '因果链卡'],
    report: '地理题重点看读图定位、区域特征和因果链。不能只背结论。',
    parent: '你先在图上指出位置，再说第一条原因。',
    evidenceRequired: ['map_reading', 'region_position', 'cause_chain']
  },
  writing_process: {
    label: '写作表达',
    blackboard: ['一句话立意', '列两个要点', '补例子'],
    socratic: ['你最想说明哪一句？', '第一个理由是什么？', '有没有一个具体例子？'],
    game: ['开头句', '要点排序', '例子补全'],
    report: '写作重点看开头句、要点结构和例子支撑。',
    parent: '你先说一句最简单的中心句，后面只补两个理由。',
    evidenceRequired: ['topic_sentence', 'two_points', 'example_support']
  },
  unknown: {
    label: '通用卡点',
    blackboard: ['说题目问什么', '说第一步', '说检查点'],
    socratic: ['这题第一步先看哪里？', '你现在卡在哪一句？', '下一次先检查什么？'],
    game: ['第一步卡', '检查点卡', '复述卡'],
    report: '通用卡点先看第一步是否能说清楚。',
    parent: '你先说第一步，不急着说答案。',
    evidenceRequired: ['child_first_step', 'stuck_sentence', 'next_check']
  }
};

const SOCRATIC_ASSESSMENT_MATRIX = {
  math_word_problem: {
    misconceptionChecks: ['把问题句当条件', '数量关系没说清', '单位没统一'],
    probeSequence: ['先圈问题句', '再说两个量怎么连起来', '最后检查单位'],
    recoveryMoves: ['只保留一个数字和问题句', '让孩子补一句数量关系', '换一个更小数字再问第一步'],
    transferCheck: '换一组数字后，孩子还能先说数量关系。',
    evidenceTag: 'math_relation_probe'
  },
  equation_setup: {
    misconceptionChecks: ['未知数含义不清', '等量关系错位', '式子和题意脱节'],
    probeSequence: ['先问 x 表示什么', '再问左右两边什么相等', '最后让孩子读回方程含义'],
    recoveryMoves: ['把 x 写成一句中文', '画出等量两边', '只列关系不急着求解'],
    transferCheck: '换一个未知量后，孩子还能说清 x 的含义。',
    evidenceTag: 'equation_model_probe'
  },
  reading_question: {
    misconceptionChecks: ['题型没判断', '证据句找错', '答案超出原文'],
    probeSequence: ['先判断问法', '再回文找证据句', '最后删掉无依据的话'],
    recoveryMoves: ['只读题干关键词', '给出两个候选证据句让孩子选', '让孩子复述原文一句'],
    transferCheck: '换一段文本后，孩子还能先定位证据句。',
    evidenceTag: 'reading_evidence_probe'
  },
  english_sentence: {
    misconceptionChecks: ['主语找错', '谓语找错', '时态线索忽略'],
    probeSequence: ['先问谁做动作', '再找真正谓语', '最后看时间或修饰线索'],
    recoveryMoves: ['遮住修饰语只看主干', '把句子拆成主语和动作', '只检查一个时态信号'],
    transferCheck: '换一句话后，孩子还能先找主谓骨架。',
    evidenceTag: 'english_sentence_probe'
  },
  physics_diagram: {
    misconceptionChecks: ['研究对象没定', '方向或状态漏标', '公式和图示脱节'],
    probeSequence: ['先问研究对象是谁', '再标第一根箭头或初末状态', '最后说对应哪条规律'],
    recoveryMoves: ['只画一个对象', '只标一个方向或状态', '把公式翻译成图上的一句话'],
    transferCheck: '换一个物理情境后，孩子还能先画对象和第一笔标注。',
    evidenceTag: 'physics_diagram_probe'
  },
  chemistry_experiment: {
    misconceptionChecks: ['只背方程式', '现象和原因断开', '守恒或条件没检查'],
    probeSequence: ['先列反应前后物质', '再说看到的现象', '最后回到守恒或条件'],
    recoveryMoves: ['把物质分成反应前/反应后', '只问颜色/气体/沉淀来自哪里', '先查一个守恒点'],
    transferCheck: '换一个实验现象后，孩子还能先说物质和现象来源。',
    evidenceTag: 'chemistry_experiment_probe'
  },
  biology_process: {
    misconceptionChecks: ['结构功能混淆', '过程顺序错', '现象不能支持结论'],
    probeSequence: ['先找结构', '再说功能', '最后按过程顺序解释现象'],
    recoveryMoves: ['只连一个结构和一个功能', '把过程排成三步', '让孩子指出支持结论的现象'],
    transferCheck: '换一个生命过程后，孩子还能先说结构功能关系。',
    evidenceTag: 'biology_process_probe'
  },
  geography_map: {
    misconceptionChecks: ['没读图例方向', '区域位置没定', '因果链跳步'],
    probeSequence: ['先看方向和图例', '再定位区域', '最后串第一条因果链'],
    recoveryMoves: ['遮住题干只看图例', '只找一个位置特征', '把原因链缩成两段'],
    transferCheck: '换一张图后，孩子还能先定位并说第一条原因链。',
    evidenceTag: 'geography_map_probe'
  },
  writing_process: {
    misconceptionChecks: ['中心句不清', '理由堆叠无顺序', '例子不能支撑观点'],
    probeSequence: ['先说中心句', '再列两个理由', '最后补一个具体例子'],
    recoveryMoves: ['只写一句最短中心句', '删掉和中心无关的理由', '用生活例子补证据'],
    transferCheck: '换一个题目后，孩子还能先写中心句。',
    evidenceTag: 'writing_structure_probe'
  },
  unknown: {
    misconceptionChecks: ['没有说题目问什么', '第一步太大', '不知道下次检查点'],
    probeSequence: ['先说题目问什么', '再说第一步', '最后说下次检查点'],
    recoveryMoves: ['把任务缩成一句话', '只问从哪里开始', '让孩子说一个可检查动作'],
    transferCheck: '换一个任务后，孩子还能先说第一步。',
    evidenceTag: 'general_first_step_probe'
  }
};

function buildSocraticAssessmentMatrix(input = {}) {
  const sourceText = input.sourceText || input.stuckPointText || input.thought || input.title || input.text || '';
  const detectedType = detectTaskType(sourceText, input.subject || input.issueType || '');
  const taskType = input.taskType || (detectedType !== 'unknown' ? detectedType : taskTypeForSubject(input.subject)) || 'unknown';
  const spec = SOCRATIC_ASSESSMENT_MATRIX[taskType] || SOCRATIC_ASSESSMENT_MATRIX.unknown;
  return {
    id: `socratic_assessment_${taskType}`,
    taskType,
    title: '题型追问评测',
    misconceptionChecks: spec.misconceptionChecks.map((text, index) => ({
      id: `${taskType}_mis_${index + 1}`,
      order: index + 1,
      text
    })),
    probeSequence: spec.probeSequence.map((text, index) => ({
      id: `${taskType}_probe_${index + 1}`,
      order: index + 1,
      text,
      stopRule: index === 0 ? '孩子能说出第一步就停，不继续代讲。' : '只追问证据，不直接给答案。'
    })),
    recoveryMoves: spec.recoveryMoves.map((text, index) => ({
      id: `${taskType}_recovery_${index + 1}`,
      order: index + 1,
      text
    })),
    transferCheck: spec.transferCheck,
    questionTypeRubric: spec.misconceptionChecks.map((text, index) => ({
      id: `${taskType}_rubric_${index + 1}`,
      order: index + 1,
      misconception: text,
      probe: spec.probeSequence[index] || spec.probeSequence[0],
      recovery: spec.recoveryMoves[index] || spec.recoveryMoves[0],
      evidence: index === 0 ? spec.evidenceTag : `${spec.evidenceTag}_${index + 1}`
    })),
    visualExplanationSteps: spec.probeSequence.slice(0, 3).map((text, index) => ({
      id: `${taskType}_visual_probe_${index + 1}`,
      order: index + 1,
      boardMove: `小黑板只画第 ${index + 1} 笔：${text}`,
      childReply: index === 0 ? '孩子先说第一步' : '孩子补一句证据',
      avoid: '不写完整答案'
    })),
    fallbackLadder: [
      { id: 'silent', label: '沉默', move: spec.recoveryMoves[0], route: '/pages/tutor/tutor' },
      { id: 'answer_request', label: '要答案', move: '只给第一步小黑板和一个追问，不给完整答案。', route: '/pages/tutor/tutor' },
      { id: 'wrong_again', label: '同错因再错', move: spec.recoveryMoves[2] || spec.recoveryMoves[0], route: '/pages/review/review' }
    ],
    fallbackPolicy: {
      whenSilent: spec.recoveryMoves[0],
      whenAsksAnswer: '只给第一步小黑板和一个追问，不给完整答案。',
      whenWrongAgain: spec.recoveryMoves[2] || spec.recoveryMoves[0]
    },
    evidenceContractLine: `证据合同：${spec.evidenceTag} + child_first_step + fallback_trigger + next_day_revisit。`,
    parentCheckLine: '家长只问第一步和证据，不追完整答案。',
    evidenceRequired: ['misconception_check', 'probe_sequence', spec.evidenceTag, 'transfer_check'],
    evidenceTag: spec.evidenceTag,
    route: '/pages/tutor/tutor'
  };
}

function buildSubjectSkillDepth(input = {}) {
  const sourceText = input.sourceText || input.stuckPointText || input.thought || input.title || input.text || '';
  const detectedType = detectTaskType(sourceText, input.subject || input.issueType || '');
  const taskType = input.taskType || (detectedType !== 'unknown' ? detectedType : taskTypeForSubject(input.subject)) || 'unknown';
  const spec = SUBJECT_SKILL_DEPTH[taskType] || SUBJECT_SKILL_DEPTH.unknown;
  const firstStep = sanitizeMiniActionText(input.childArticulatedStep || input.systemSuggestedStep || input.firstStep || suggestedStepForTaskType(taskType));
  const socraticAssessment = buildSocraticAssessmentMatrix(Object.assign({}, input, { taskType }));
  return {
    id: `subject_depth_${taskType}`,
    taskType,
    label: spec.label,
    firstStep,
    blackboard: spec.blackboard.map((text, index) => ({ order: index + 1, text })),
    blackboardBlueprint: buildFirstStepBlackboardBlueprint({
      subjectSkillDepth: {
        taskType,
        label: spec.label,
        firstStep,
        evidenceRequired: spec.evidenceRequired.slice(),
        route: taskType === 'writing_process' ? '/pages/focus/focus' : taskType === 'unknown' ? '/pages/tutor/tutor' : '/pages/arcade/arcade'
      },
      subject: input.subject || '',
      sourceText,
      firstStep
    }),
    socraticQuestions: spec.socratic.slice(),
    gameDrills: spec.game.slice(),
    reportSignal: spec.report,
    parentQuestion: spec.parent,
    evidenceRequired: spec.evidenceRequired.slice(),
    socraticAssessment,
    gameBias: taskType === 'unknown' ? 'balanced' : 'repair',
    route: taskType === 'writing_process' ? '/pages/focus/focus' : taskType === 'unknown' ? '/pages/tutor/tutor' : '/pages/arcade/arcade',
    shareLine: `${spec.label}：先做「${firstStep}」，再留下 ${spec.evidenceRequired[0]} 证据。`
  };
}

const CURRICULUM_SPINE = {
  math: {
    label: '数学',
    route: '/pages/daily-math/daily-math',
    nodes: [
      { id: 'read_problem', label: '读题', evidence: '圈已知、问题句、单位' },
      { id: 'model_relation', label: '建模', evidence: '写数量关系或等量关系' },
      { id: 'solve_check', label: '求解复核', evidence: '检查单位、答句和变式' }
    ]
  },
  chinese: {
    label: '语文',
    route: '/pages/tutor/tutor',
    nodes: [
      { id: 'question_type', label: '判断问法', evidence: '细节、主旨、原因、推断' },
      { id: 'text_evidence', label: '回文找证据', evidence: '原文证据句' },
      { id: 'answer_boundary', label: '组织答案', evidence: '答案不越界' }
    ]
  },
  english: {
    label: '英语',
    route: '/pages/dictation/dictation',
    nodes: [
      { id: 'sentence_frame', label: '句子骨架', evidence: '主语、谓语、时态线索' },
      { id: 'word_use', label: '词汇用法', evidence: '词义、搭配、语境' },
      { id: 'output_check', label: '表达复核', evidence: '一句话复述或造句' }
    ]
  },
  physics: {
    label: '物理',
    route: '/pages/tutor/tutor',
    nodes: [
      { id: 'object_state', label: '对象和状态', evidence: '研究对象、初末状态' },
      { id: 'diagram_first', label: '图示第一步', evidence: '受力/电路/光路的第一笔' },
      { id: 'law_match', label: '规律匹配', evidence: '用哪条规律解释现象' }
    ]
  },
  chemistry: {
    label: '化学',
    route: '/pages/tutor/tutor',
    nodes: [
      { id: 'substance_state', label: '物质和状态', evidence: '反应物、生成物、状态变化' },
      { id: 'phenomenon_reason', label: '现象到原因', evidence: '颜色、气体、沉淀背后的原因' },
      { id: 'equation_check', label: '方程式复核', evidence: '守恒和条件' }
    ]
  },
  biology: {
    label: '生物',
    route: '/pages/tutor/tutor',
    nodes: [
      { id: 'structure_function', label: '结构和功能', evidence: '结构对应的功能' },
      { id: 'process_order', label: '过程顺序', evidence: '步骤、变量、对照组' },
      { id: 'evidence_reason', label: '证据解释', evidence: '用现象说明结论' }
    ]
  },
  geography: {
    label: '地理',
    route: '/pages/tutor/tutor',
    nodes: [
      { id: 'map_reading', label: '读图定位', evidence: '方向、位置、图例' },
      { id: 'cause_chain', label: '因果链', evidence: '地形、气候、人类活动关系' },
      { id: 'space_transfer', label: '空间迁移', evidence: '换地区仍能解释' }
    ]
  }
};

const SUBJECT_TASK_TYPE_MAP = {
  math: 'math_word_problem',
  chinese: 'reading_question',
  english: 'english_sentence',
  physics: 'physics_diagram',
  chemistry: 'chemistry_experiment',
  biology: 'biology_process',
  geography: 'geography_map',
  数学: 'math_word_problem',
  语文: 'reading_question',
  英语: 'english_sentence',
  物理: 'physics_diagram',
  化学: 'chemistry_experiment',
  生物: 'biology_process',
  地理: 'geography_map'
};

function taskTypeForSubject(subject = '') {
  const raw = String(subject || '').trim();
  if (!raw) return '';
  if (SUBJECT_TASK_TYPE_MAP[raw]) return SUBJECT_TASK_TYPE_MAP[raw];
  const lower = raw.toLowerCase();
  return SUBJECT_TASK_TYPE_MAP[lower] || '';
}

function inferCurriculumSubject(input = {}, subjectSkillDepth = null) {
  const text = `${input.subject || ''} ${input.sourceText || ''} ${input.stuckPointText || ''} ${input.thought || ''} ${input.title || ''} ${(subjectSkillDepth && subjectSkillDepth.label) || ''}`;
  if (/物理|受力|电路|光路|速度|压强|浮力|physics/i.test(text)) return 'physics';
  if (/化学|方程式|反应|溶液|气体|沉淀|chemistry/i.test(text)) return 'chemistry';
  if (/生物|细胞|植物|人体|对照组|biology/i.test(text)) return 'biology';
  if (/地理|地图|经纬|气候|公转|自转|geography/i.test(text)) return 'geography';
  if (/英语|英文|单词|语法|句子|english|sentence|verb/i.test(text)) return 'english';
  if (/语文|阅读|作文|文章|段落|主旨|chinese/i.test(text)) return 'chinese';
  return 'math';
}

function buildCurriculumSpine(input = {}) {
  const subjectDepth = input.subjectSkillDepth || buildSubjectSkillDepth(input);
  const subjectId = inferCurriculumSubject(input, subjectDepth);
  const subject = CURRICULUM_SPINE[subjectId] || CURRICULUM_SPINE.math;
  const evidenceKey = subjectDepth && Array.isArray(subjectDepth.evidenceRequired)
    ? subjectDepth.evidenceRequired[0]
    : subject.nodes[0].id;
  const matchedIndex = subject.nodes.findIndex((node) => node.id === evidenceKey);
  const currentIndex = matchedIndex >= 0 ? matchedIndex : 0;
  const currentNode = subject.nodes[currentIndex] || subject.nodes[0];
  const nextNode = subject.nodes[Math.min(subject.nodes.length - 1, currentIndex + 1)] || currentNode;
  const firstStep = subjectDepth.firstStep || suggestedStepForTaskType(subjectDepth.taskType);
  const progression = subject.nodes.map((node, index) => ({
    id: node.id,
    order: index + 1,
    label: node.label,
    evidence: node.evidence,
    active: node.id === currentNode.id,
    done: index < currentIndex
  }));
  return {
    id: `curriculum_${subjectId}_${subjectDepth.taskType || 'unknown'}`,
    subjectId,
    subjectLabel: subject.label,
    taskType: subjectDepth.taskType,
    title: `${subject.label}学习骨架`,
    currentNode,
    nextNode,
    progression,
    firstStep,
    route: subjectDepth.route || subject.route,
    visualBoardLine: `${subject.label}小黑板：先做「${firstStep}」，只画第一步，不直接给完整答案。`,
    reportLine: `${subject.label}不是只看做对没有，先看「${currentNode.label}」是否留下证据：${currentNode.evidence}。`,
    parentDecisionLine: `今晚家长只判断一件事：孩子能否说清「${currentNode.label}」这一小步。`,
    gameLine: `轻练习优先练「${currentNode.label}」，下一关再看「${nextNode.label}」。`,
    shareLine: `${subject.label}闭环：${currentNode.label} -> ${nextNode.label}，保留证据再进入下一步。`,
    scaleLine: `七科课程骨架已覆盖：${Object.keys(CURRICULUM_SPINE).map((key) => CURRICULUM_SPINE[key].label).join(' / ')}；当前只落到第一步图解和证据闭环。`,
    lightEntrySeeds: subject.nodes.map((node) => ({
      id: `${subjectId}_${node.id}`,
      label: node.label,
      prompt: `先说${node.label}：${node.evidence}`,
      route: subject.route
    }))
  };
}

function buildVisualSocraticMatrix(input = {}) {
  const subjectDepth = input.subjectSkillDepth || buildSubjectSkillDepth(input);
  const curriculum = input.curriculumSpine || buildCurriculumSpine(Object.assign({}, input, { subjectSkillDepth: subjectDepth }));
  const socraticAssessment = input.socraticAssessment || subjectDepth.socraticAssessment || buildSocraticAssessmentMatrix(Object.assign({}, input, { taskType: subjectDepth.taskType }));
  const progression = Array.isArray(curriculum.progression) ? curriculum.progression : [];
  const boardMoves = progression.slice(0, 3).map((node) => ({
    id: node.id,
    order: node.order,
    label: node.label,
    drawAction: `在小黑板只标出「${node.label}」这一笔`,
    evidence: node.evidence,
    prompt: `你能先指出${node.label}在哪里吗？`
  }));
  const socraticQuestions = (subjectDepth.socraticQuestions || []).slice(0, 3).map((question, index) => ({
    id: `probe_${index + 1}`,
    order: index + 1,
    question,
    intent: index === 0 ? '定位卡点' : index === 1 ? '要求证据' : '检查迁移',
    stopRule: '孩子能说出自己的第一步就停，不继续代讲完整答案。'
  }));
  const fallback = {
    whenSilent: `如果孩子说不出来，退回到「${curriculum.currentNode.label}」：${curriculum.currentNode.evidence}`,
    whenAsksAnswer: '如果孩子直接要答案，只给第一笔小黑板和一个追问，不给完整过程。',
    whenWrongAgain: `如果同类题又错，下一轮游戏只练「${curriculum.currentNode.label}」。`
  };
  return {
    id: `visual_socratic_${curriculum.subjectId}_${subjectDepth.taskType || 'unknown'}`,
    title: `${curriculum.subjectLabel}第一步图解`,
    subjectLabel: curriculum.subjectLabel,
    taskType: subjectDepth.taskType,
    boardMoves,
    blackboardBlueprint: buildFirstStepBlackboardBlueprint(Object.assign({}, input, {
      subjectSkillDepth: subjectDepth,
      curriculumSpine: curriculum,
      boardMoves
    })),
    socraticQuestions,
    socraticAssessment,
    fallback,
    visualBoundary: '这是第一步小黑板，不是全科自动板书讲题。',
    parentLine: curriculum.parentDecisionLine,
    reportLine: curriculum.reportLine,
    shareLine: curriculum.shareLine,
    route: curriculum.route
  };
}

function buildFirstStepBlackboardBlueprint(input = {}) {
  const subjectDepth = input.subjectSkillDepth || buildSubjectSkillDepth(input);
  const curriculum = input.curriculumSpine || buildCurriculumSpine(Object.assign({}, input, { subjectSkillDepth: subjectDepth }));
  const boardMoves = Array.isArray(input.boardMoves) && input.boardMoves.length
    ? input.boardMoves
    : (Array.isArray(curriculum.progression) ? curriculum.progression : []).slice(0, 3).map((node) => ({
      id: node.id,
      order: node.order,
      label: node.label,
      evidence: node.evidence,
      drawAction: `只标出「${node.label}」这一笔`
    }));
  const firstMove = boardMoves[0] || { label: '第一步', evidence: subjectDepth.firstStep || '孩子自己的第一步' };
  return {
    id: `first_step_blackboard_${curriculum.subjectId}_${subjectDepth.taskType || 'unknown'}`,
    title: `${curriculum.subjectLabel}第一步小黑板`,
    boundary: '只画第一笔和证据点，不讲完整答案。',
    openingQuestion: `先看第一步小黑板这一笔：${firstMove.label}在哪里？`,
    firstStroke: {
      label: firstMove.label,
      drawAction: firstMove.drawAction || `只标出「${firstMove.label}」这一笔`,
      evidence: firstMove.evidence || subjectDepth.firstStep,
      childReply: `孩子要能说出：我先处理「${firstMove.label}」。`
    },
    layers: boardMoves.slice(0, 3).map((move, index) => ({
      id: move.id || `layer_${index + 1}`,
      order: index + 1,
      label: move.label,
      drawAction: move.drawAction || `只标出「${move.label}」这一笔`,
      evidence: move.evidence,
      parentQuestion: index === 0
        ? `你第一步先看「${move.label}」吗？`
        : `这一笔有什么证据？`
    })),
    stopRule: '孩子能说出第一步就停；说不出时退回更小的一笔。',
    wrongCauseReturn: `如果同类题又错，先回到「${firstMove.label}」这一笔，不加题量。`,
    reportLine: `${curriculum.subjectLabel}报告只记录第一笔证据：${firstMove.evidence || subjectDepth.firstStep}。`,
    gameHook: `轻练习优先生成 3 张「${firstMove.label}」主动回忆卡。`,
    shareLine: `分享时只带走第一步小黑板和家长追问，不带完整答案。`,
    evidenceRequired: ['first_stroke_marked', 'child_first_step', 'parent_one_question', 'next_day_revisit'],
    route: curriculum.route || subjectDepth.route || '/pages/tutor/tutor'
  };
}

function childStepQuality(text = '') {
  const value = String(text || '').trim();
  const compact = value.replace(/\s+/g, '');
  if (!compact) return 'empty';
  if (/^(不会|不知道|看题|做题|学一下|再看看|随便|没有)$/.test(compact)) return 'vague';
  if (/圈出|圈条件|找关键词|写已知量|读第一句|列未知数|找等量关系|主语|谓语|写开头|题目问什么|先看|先找|先写|先圈|先读|先列/.test(value)) return 'actionable';
  if (/条件|关键词|已知|未知数|等量|第一句|题干|主旨|细节|原因|开头|主语|谓语|关系/.test(value)) return 'partial';
  if (/先|找|看|写|圈|读|列/.test(value) && compact.length >= 5) return 'partial';
  return compact.length >= 12 ? 'partial' : 'vague';
}

function normalizeFirstStepEvidence(focus = {}) {
  const stuckPointText = focus.stuckPointText || focus.sourceText || focus.thought || '';
  const taskType = focus.taskType || detectTaskType(stuckPointText, focus.issueType || focus.title || '');
  const systemSuggestedStep = sanitizeMiniActionText(
    focus.systemSuggestedStep || focus.suggestedFirstStep || focus.miniActionText || suggestedStepForTaskType(taskType)
  );
  const childArticulatedStep = sanitizeMiniActionText(focus.childArticulatedStep || focus.childStepSentence || '');
  const childStepSentence = childArticulatedStep || sanitizeMiniActionText(focus.childStepSentence || '');
  const quality = childStepQuality(childStepSentence);
  const firstStepSource = childArticulatedStep
    ? 'child_articulated'
    : systemSuggestedStep
      ? 'system_suggested'
      : 'manual';
  let firstStepStatus = focus.firstStepStatus || 'suggested';
  if (childArticulatedStep && firstStepStatus === 'suggested') firstStepStatus = 'child_confirmed';
  return {
    stuckPointText,
    taskType,
    systemSuggestedStep,
    childArticulatedStep,
    childStepSentence,
    childStepQuality: quality,
    firstStepSource,
    firstStepStatus,
    quickChoices: FIRST_STEP_QUICK_CHOICES.slice(),
    firstStepTemplates: firstStepTemplatesForTaskType(taskType),
    updatedAt: new Date().toISOString()
  };
}

const BLACKBOARD_HINTS = {
  '列式关系': {
    title: '关系小黑板',
    body: '先找：题目问谁？谁是整体？谁和谁在比较？',
    structure: '整体 → 部分 → 关系'
  },
  '读题审题': {
    title: '审题小黑板',
    body: '先圈问题，再找相关条件，暂时放下无关信息。',
    structure: '问题 → 条件 → 第一步'
  },
  '步骤断点': {
    title: '步骤小黑板',
    body: '先说第一步，再决定下一步，不要一下子想完整题。',
    structure: '第一步 → 下一步 → 检查'
  },
  '概念公式': {
    title: '概念小黑板',
    body: '先说这个概念在问什么，再想用哪个公式。',
    structure: '概念 → 条件 → 公式'
  }
};

const FIRST_STEP_PROMPT_CARDS = {
  math: {
    subjectLabel: '数学',
    title: '数学第一步卡',
    body: '先圈题目问什么，再找数量关系，不急着算最终结果。',
    structure: '问题 → 条件 → 关系',
    firstMove: '圈出问题里的目标量和已知量。',
    childPrompt: '我第一步先找题目问的量和相关条件。',
    parentPrompt: '你先看哪里，才能知道这题在求什么？',
    avoid: '不要直接套公式或抄完整答案。'
  },
  physics: {
    subjectLabel: '物理',
    title: '物理第一步卡',
    body: '先画对象和方向，分清已知量、过程和单位，再决定用哪个关系。',
    structure: '对象 → 方向/过程 → 公式',
    firstMove: '先画研究对象，标出力、运动方向或电路路径。',
    childPrompt: '我第一步先确定研究对象和方向。',
    parentPrompt: '这题先看哪个物体、哪个方向或哪个过程？',
    avoid: '不要先代数字，也不要直接跳到公式。'
  },
  chemistry: {
    subjectLabel: '化学',
    title: '化学第一步卡',
    body: '先分清反应前后有什么、现象说明什么，再看方程式或实验条件。',
    structure: '物质 → 现象 → 原理',
    firstMove: '先列出反应物、生成物或实验变量。',
    childPrompt: '我第一步先分清反应前后有什么变化。',
    parentPrompt: '这题先看物质变化，还是实验现象？',
    avoid: '不要只背结论，也不要把现象当原因。'
  },
  geography: {
    subjectLabel: '地理',
    title: '地理第一步卡',
    body: '先看图、方向和位置关系，再说因果，不急着背结论。',
    structure: '图表 → 位置/方向 → 因果',
    firstMove: '先找图例、方向、经纬度或运动关系。',
    childPrompt: '我第一步先看图上的方向和位置关系。',
    parentPrompt: '这题先看图里的哪个方向、位置或变化？',
    avoid: '不要脱离图表直接背答案。'
  },
  chinese: {
    subjectLabel: '语文',
    title: '语文第一步卡',
    body: '先看题目问法，再回原文找依据，最后组织一句自己的话。',
    structure: '问法 → 原文依据 → 表达',
    firstMove: '先圈题干关键词，回到原文找对应句。',
    childPrompt: '我第一步先看题目到底问什么，再回原文找依据。',
    parentPrompt: '题目让你回答什么？原文哪一句能支持？',
    avoid: '不要凭感觉空写。'
  },
  english: {
    subjectLabel: '英语',
    title: '英语第一步卡',
    body: '先找句子主干或题目关键词，再看时态、指代和上下文。',
    structure: '关键词 → 句子主干 → 上下文',
    firstMove: '先找主语、谓语或题目关键词。',
    childPrompt: '我第一步先找句子主干和题目关键词。',
    parentPrompt: '这句话先找谁做什么，还是先看上下文？',
    avoid: '不要逐词硬翻，也不要直接猜选项。'
  },
  biology: {
    subjectLabel: '生物',
    title: '生物第一步卡',
    body: '先分清结构、功能和过程，再看图示或实验变量。',
    structure: '结构 → 功能/过程 → 证据',
    firstMove: '先找图中的结构或实验变量。',
    childPrompt: '我第一步先分清结构和它对应的功能。',
    parentPrompt: '这题先看结构、过程，还是实验变量？',
    avoid: '不要只背名词，先说清它在图里起什么作用。'
  }
};

const FIRST_STEP_CARD_VARIANTS = [
  {
    subjectKey: 'physics',
    pattern: /受力|力|摩擦|压力|浮力|重力/,
    patch: {
      title: '物理受力第一步卡',
      body: '先确定研究对象，再把受到的力一个个标出来。',
      structure: '研究对象 → 受力方向 → 平衡/运动',
      firstMove: '先画出研究对象，标出重力、支持力、拉力或摩擦力方向。',
      childPrompt: '我第一步先画研究对象和受力方向。',
      parentPrompt: '这题先看哪个物体受了哪些力？'
    }
  },
  {
    subjectKey: 'physics',
    pattern: /电路|电流|电压|电阻|串联|并联/,
    patch: {
      title: '物理电路第一步卡',
      body: '先看电路路径，再判断串联、并联和测量对象。',
      structure: '电源 → 路径 → 元件/表',
      firstMove: '先沿电流路径走一遍，圈出电流表或电压表测的是谁。',
      childPrompt: '我第一步先看电流怎么走。',
      parentPrompt: '这题先看电流路径，还是先看表测谁？'
    }
  },
  {
    subjectKey: 'chemistry',
    pattern: /方程式|配平|反应/,
    patch: {
      title: '化学方程式第一步卡',
      body: '先写清反应物和生成物，再检查元素守恒。',
      structure: '反应物 → 生成物 → 守恒',
      firstMove: '先把反应前后物质写在两边，不急着配系数。',
      childPrompt: '我第一步先分清反应物和生成物。',
      parentPrompt: '反应前有什么，反应后生成了什么？'
    }
  },
  {
    subjectKey: 'chemistry',
    pattern: /实验|现象|变量|溶液|沉淀|气体/,
    patch: {
      title: '化学实验第一步卡',
      body: '先看实验目的和变量，再把现象和原因分开。',
      structure: '目的 → 变量 → 现象/原因',
      firstMove: '先圈实验在比较什么条件，观察到什么现象。',
      childPrompt: '我第一步先找实验变量和现象。',
      parentPrompt: '这个实验改变了什么，观察到了什么？'
    }
  },
  {
    subjectKey: 'geography',
    pattern: /自转|公转|昼夜|四季|五带/,
    patch: {
      title: '地理运动第一步卡',
      body: '先判断是自转还是公转，再说它带来的现象。',
      structure: '运动方式 → 位置变化 → 现象',
      firstMove: '先圈题目问的是昼夜、四季还是太阳高度。',
      childPrompt: '我第一步先判断这是自转还是公转带来的变化。',
      parentPrompt: '这题先看地球哪种运动？'
    }
  },
  {
    subjectKey: 'geography',
    pattern: /经纬|地图|方向|比例尺|等高线/,
    patch: {
      title: '地理读图第一步卡',
      body: '先看图例、方向和比例，再读位置关系。',
      structure: '图例 → 方向/比例 → 位置',
      firstMove: '先找方向标、图例、比例尺或经纬线。',
      childPrompt: '我第一步先看图例和方向。',
      parentPrompt: '这张图先看哪个标记才能定位？'
    }
  },
  {
    subjectKey: 'math',
    pattern: /几何|角|三角形|圆|辅助线|面积/,
    patch: {
      title: '数学图形第一步卡',
      body: '先把已知条件标到图上，再找相等、平行或比例关系。',
      structure: '图形 → 已知标记 → 关系',
      firstMove: '先在图上标出已知量和要求的量。',
      childPrompt: '我第一步先把条件标到图上。',
      parentPrompt: '图上哪些量是已知的，题目要求哪一个？'
    }
  },
  {
    subjectKey: 'math',
    pattern: /方程|等量|应用题|列式|单位1|比例/,
    patch: {
      title: '数学关系第一步卡',
      body: '先找谁和谁在比较，再写出等量关系。',
      structure: '对象 → 比较 → 等量关系',
      firstMove: '先圈两个比较对象和题目要求的未知量。',
      childPrompt: '我第一步先找比较对象和等量关系。',
      parentPrompt: '谁和谁在比？未知量是哪一个？'
    }
  },
  {
    subjectKey: 'english',
    pattern: /时态|语法|主语|谓语|从句/,
    patch: {
      title: '英语语法第一步卡',
      body: '先找主谓，再看时间词和句子结构。',
      structure: '主谓 → 时间词 → 结构',
      firstMove: '先划出主语和谓语，再看时态线索。',
      childPrompt: '我第一步先找主语、谓语和时间词。',
      parentPrompt: '这句话是谁做什么？时间线索在哪里？'
    }
  },
  {
    subjectKey: 'chinese',
    pattern: /阅读|原文|依据|段落|理解/,
    patch: {
      title: '语文阅读第一步卡',
      body: '先读清题目问法，再回原文找依据句。',
      structure: '问法 → 定位 → 依据',
      firstMove: '先圈题干关键词，再回原文定位相关段落。',
      childPrompt: '我第一步先圈题干关键词，回原文找依据。',
      parentPrompt: '题目问的关键词是什么？原文哪一段能支持？'
    }
  },
  {
    subjectKey: 'biology',
    pattern: /实验|变量|对照|观察/,
    patch: {
      title: '生物实验第一步卡',
      body: '先找实验变量和对照组，再判断结论来自哪条证据。',
      structure: '变量 → 对照 → 证据',
      firstMove: '先圈自变量、因变量和对照条件。',
      childPrompt: '我第一步先找变量和对照组。',
      parentPrompt: '这个实验改变了什么，观察了什么？'
    }
  }
];

const LOCAL_SCENARIO_LOOP_CASES = [
  {
    id: 'math_relation_apples',
    subject: 'math',
    subjectLabel: '数学',
    issueType: '列式关系',
    tag: '应用题',
    title: '数学应用题先找关系',
    inputText: '数学应用题：小明有一些苹果，给妹妹 8 个后还剩 15 个。我知道要算总数，但不知道第一步怎么列式。',
    systemSuggestedStep: '先圈出“给出 8 个后还剩 15 个”，判断原来数量 = 给出的 + 剩下的。',
    childFirstStep: '我第一步先圈出原来的苹果数是未知量，再找 8 个和 15 个的关系。',
    parentPrompt: '原来的数量、给出的数量、剩下的数量，谁和谁合起来？',
    nearTransferPrompt: '把“给出 8 个”换成“吃掉 6 个”，第一步还是先找什么关系？',
    outcomeStandard: '孩子能说出“原来 = 给出或减少的 + 剩下的”，再开始列式。'
  },
  {
    id: 'math_geometry_angle',
    subject: 'math',
    subjectLabel: '数学',
    issueType: '几何图形',
    tag: '几何',
    title: '几何题先把条件标到图上',
    inputText: '数学几何：图里有平行线和一个三角形，题目让求角度。我看图很乱，不知道先看哪两个角。',
    systemSuggestedStep: '先把已知角和平行线标记到图上，再找同位角、内错角或三角形内角和。',
    childFirstStep: '我第一步先把已知角标到图上，再看平行线能推出哪两个角相等。',
    parentPrompt: '图上哪些是已知，哪条线告诉你角之间有关系？',
    nearTransferPrompt: '换一张有平行线的角度图，先标已知还是先算？为什么？',
    outcomeStandard: '孩子能先标图，再说出一个可用的角关系。'
  },
  {
    id: 'physics_force_block',
    subject: 'physics',
    subjectLabel: '物理',
    issueType: '受力分析',
    tag: '受力',
    title: '物理受力先定对象',
    inputText: '物理受力题：木块在水平桌面上被拉着匀速运动，问摩擦力。我总是先套公式，但不知道力怎么画。',
    systemSuggestedStep: '先确定研究对象是木块，再标重力、支持力、拉力和摩擦力方向。',
    childFirstStep: '我第一步先画木块这个研究对象，再标出重力、支持力、拉力和摩擦力方向。',
    parentPrompt: '这题先研究哪个物体？它受到哪些力？',
    nearTransferPrompt: '如果木块改成斜面上的小车，第一步还是先做什么？',
    outcomeStandard: '孩子能先说研究对象和力的方向，不直接代公式。'
  },
  {
    id: 'physics_circuit_path',
    subject: 'physics',
    subjectLabel: '物理',
    issueType: '电路路径',
    tag: '电路',
    title: '电路题先沿电流走一遍',
    inputText: '物理电路：有两个灯泡和一个电流表，问串联还是并联。我看图会乱，不知道电流怎么走。',
    systemSuggestedStep: '先从电源正极沿电流路径走一遍，圈出分叉点和电流表测量对象。',
    childFirstStep: '我第一步先从电源开始沿电流路径走一遍，找有没有分叉。',
    parentPrompt: '电流从哪里出发？有没有分成两条路？',
    nearTransferPrompt: '换成多一个开关的电路图，第一步先找什么？',
    outcomeStandard: '孩子能用“有没有分叉”判断串并联的第一步。'
  },
  {
    id: 'chem_equation_balance',
    subject: 'chemistry',
    subjectLabel: '化学',
    issueType: '方程式配平',
    tag: '方程式',
    title: '化学方程式先分清前后',
    inputText: '化学方程式：铁和氧气反应生成四氧化三铁。我知道要配平，但总是先乱填系数。',
    systemSuggestedStep: '先写清反应物和生成物，再检查每种元素左右各有几个。',
    childFirstStep: '我第一步先把反应物和生成物分清，再数左右两边每种元素的个数。',
    parentPrompt: '反应前有什么，反应后生成什么？左右两边哪种元素先不相等？',
    nearTransferPrompt: '把反应换成氢气燃烧，第一步还是先做什么？',
    outcomeStandard: '孩子能先分反应物/生成物，再数元素守恒。'
  },
  {
    id: 'chem_experiment_variable',
    subject: 'chemistry',
    subjectLabel: '化学',
    issueType: '实验变量',
    tag: '实验',
    title: '化学实验先看变量',
    inputText: '化学实验题：比较不同溶液和金属反应快慢。我看现象很多，不知道哪个才是原因。',
    systemSuggestedStep: '先找实验目的和改变的条件，再把现象与原因分开。',
    childFirstStep: '我第一步先找这个实验在比较什么条件，再看观察到了什么现象。',
    parentPrompt: '这个实验改变了什么？观察到什么？两件事要分开说。',
    nearTransferPrompt: '如果实验变成比较温度影响反应快慢，第一步看什么？',
    outcomeStandard: '孩子能说出变量、现象、结论之间的顺序。'
  },
  {
    id: 'geo_earth_motion',
    subject: 'geography',
    subjectLabel: '地理',
    issueType: '地球运动',
    tag: '自转公转',
    title: '地理先判断运动方式',
    inputText: '地理：题目问昼夜更替和四季变化。我总把自转和公转弄混，不知道先判断哪一个。',
    systemSuggestedStep: '先圈题目问的是昼夜、季节还是太阳高度，再判断自转或公转。',
    childFirstStep: '我第一步先看题目问的是昼夜还是四季，再判断是自转还是公转。',
    parentPrompt: '这题问的是一天里的变化，还是一年里的变化？',
    nearTransferPrompt: '如果题目问五带划分，第一步先看哪类变化？',
    outcomeStandard: '孩子能按现象区分自转和公转。'
  },
  {
    id: 'english_grammar_tense',
    subject: 'english',
    subjectLabel: '英语',
    issueType: '语法时态',
    tag: '语法',
    title: '英语句子先找主谓和时间',
    inputText: '英语语法题：句子里有 yesterday 和 several times，我不确定用过去时还是现在完成时。',
    systemSuggestedStep: '先找主语、谓语和时间线索，再判断动作发生和现在是否有关。',
    childFirstStep: '我第一步先找主语、谓语和时间词，再判断这个动作和现在有没有关系。',
    parentPrompt: '这句话是谁做什么？时间线索在哪里？',
    nearTransferPrompt: '如果时间词换成 already，第一步还是先找什么？',
    outcomeStandard: '孩子能先找句子主干和时间线索，再选时态。'
  },
  {
    id: 'chinese_reading_evidence',
    subject: 'chinese',
    subjectLabel: '语文',
    issueType: '阅读证据',
    tag: '阅读',
    title: '语文阅读先回原文找依据',
    inputText: '语文阅读：题目问人物为什么这么做。我能感觉到答案，但写不出依据。',
    systemSuggestedStep: '先圈题干关键词，再回原文找能支撑判断的句子。',
    childFirstStep: '我第一步先圈题目问的关键词，再回原文找对应句子当依据。',
    parentPrompt: '题目问的关键词是什么？原文哪一句能支持你的判断？',
    nearTransferPrompt: '如果题目问“表达了什么情感”，第一步先找什么？',
    outcomeStandard: '孩子能用原文一句话支撑自己的回答。'
  },
  {
    id: 'biology_control_group',
    subject: 'biology',
    subjectLabel: '生物',
    issueType: '实验变量',
    tag: '对照实验',
    title: '生物实验先找变量和对照',
    inputText: '生物实验：探究光照对植物生长的影响。我分不清自变量、因变量和对照组。',
    systemSuggestedStep: '先找实验改变的条件、观察的结果和保持不变的条件。',
    childFirstStep: '我第一步先找改变的是光照，观察的是植物生长情况，对照组是不改变光照的那组。',
    parentPrompt: '实验改变了什么？观察了什么？哪一组用来对照？',
    nearTransferPrompt: '如果换成探究水分影响植物生长，第一步怎么找变量？',
    outcomeStandard: '孩子能说清自变量、因变量和对照组。'
  }
];

function firstStepVariantFor(subjectKey, focus = {}) {
  const text = [
    focus.subject,
    focus.subjectLabel,
    focus.title,
    focus.issueType,
    focus.sourceText,
    focus.thought,
    focus.stuckPointText
  ].filter(Boolean).join(' ');
  return FIRST_STEP_CARD_VARIANTS.find((item) => item.subjectKey === subjectKey && item.pattern.test(text)) || null;
}

function inferFirstStepSubjectKey(focus = {}) {
  const text = [
    focus.subject,
    focus.subjectLabel,
    focus.title,
    focus.issueType,
    focus.sourceText,
    focus.thought,
    focus.stuckPointText
  ].filter(Boolean).join(' ');
  if (/物理|受力|电路|光路|透镜|速度|功|能量|压强|浮力/.test(text)) return 'physics';
  if (/化学|反应|方程式|溶液|气体|沉淀|实验|酸|碱|盐|分子|原子/.test(text)) return 'chemistry';
  if (/地理|经纬|地图|地球|自转|公转|昼夜|四季|气候|地形|河流/.test(text)) return 'geography';
  if (/英语|英文|单词|阅读|语法|句子|时态|主语|谓语/.test(text)) return 'english';
  if (/语文|阅读理解|作文|古诗|文言|段落|原文|修辞/.test(text)) return 'chinese';
  if (/生物|细胞|植物|动物|消化|遗传|生态|实验变量/.test(text)) return 'biology';
  if (/数学|方程|几何|函数|应用题|单位1|等量|列式|分数|比例/.test(text)) return 'math';
  return '';
}

function buildFirstStepPromptCard(focus = {}) {
  const subjectKey = inferFirstStepSubjectKey(focus);
  const card = FIRST_STEP_PROMPT_CARDS[subjectKey] || null;
  if (!card) return null;
  const variant = firstStepVariantFor(subjectKey, focus);
  return Object.assign({}, card, variant ? variant.patch : {}, {
    subjectKey,
    variant: variant ? variant.patch.title : '',
    noFinalAnswer: true,
    cardType: 'first_step_prompt',
    safetyLine: '只提示第一步，不生成完整答案。'
  });
}

function buildLocalScenarioLoopCases() {
  return LOCAL_SCENARIO_LOOP_CASES.map((item) => {
    const firstStepCard = buildFirstStepPromptCard({
      subject: item.subject,
      subjectLabel: item.subjectLabel,
      title: item.title,
      issueType: `${item.issueType} ${item.inputText}`,
      sourceText: item.inputText,
      thought: item.inputText,
      stuckPointText: item.inputText
    });
    return Object.assign({}, item, {
      label: `${item.subjectLabel} · ${item.tag}`,
      displayLabel: `${item.subjectLabel} · ${item.tag}`,
      firstStepCard,
      previewLine: item.childFirstStep,
      nextAction: '走一遍：第一步提示 → 回访卡 → 迁移练习 → 家长追问'
    });
  });
}

function applyLocalScenarioLoopCase(caseId) {
  const cases = buildLocalScenarioLoopCases();
  const selected = cases.find((item) => item.id === caseId) || cases[0];
  if (!selected) return null;
  const focus = saveTodayFocusFromThought(selected.inputText, {
    id: `focus_local_scenario_loop_${selected.id}`,
    source: 'local_scenario_loop',
    title: selected.title,
    subject: selected.subject,
    subjectLabel: selected.subjectLabel,
    issueType: `${selected.issueType} ${selected.tag}`,
    systemSuggestedStep: selected.systemSuggestedStep,
    recommendation: selected.nearTransferPrompt,
    helper: selected.parentPrompt,
    isStuck: true
  });
  saveChildArticulatedStep(selected.childFirstStep, {
    repairStatus: 'in_progress',
    progress: 78,
    source: 'local_scenario_loop'
  });
  const repairedFocus = updateTodayFocusRepair({
    repairStatus: 'completed',
    progress: 100,
    hasMiniActionDone: true,
    miniActionText: selected.childFirstStep,
    childArticulatedStep: selected.childFirstStep,
    childStepSentence: selected.childFirstStep,
    source: 'local_scenario_loop'
  });
  const reviewCard = ensureTodayFocusReviewCard(repairedFocus || focus);
  if (reviewCard && reviewCard.id) {
    recordTransferPracticeAttempt({
      cardId: reviewCard.id,
      promptId: 'near_transfer',
      result: 'attempted',
      childExplanation: selected.nearTransferPrompt,
      parentChecked: false
    });
    recordTransferPracticeAttempt({
      cardId: reviewCard.id,
      promptId: 'teach_back',
      result: 'parent_checked',
      childExplanation: selected.childFirstStep,
      parentChecked: true
    });
    recordOutcomeCheck({
      cardId: reviewCard.id,
      masteryStage: 'first_step_ready',
      childCanExplain: true,
      transferWorked: false,
      nextDayRemembered: false,
      parentVerified: true
    });
  }
  const parentReceipt = recordParentReflectionReceipt({
    source: 'local_scenario_loop',
    parentAskedOneQuestion: true,
    childRecalledFirstStep: true,
    nextDayRevisit: false,
    phrase: selected.parentPrompt,
    childArticulatedStep: selected.childFirstStep
  });
  appendReviewEvent({
    type: 'local_scenario_loop_applied',
    caseId: selected.id,
    cardId: reviewCard && reviewCard.id,
    subject: selected.subject,
    rating: 'created'
  });
  return {
    case: selected,
    focus: repairedFocus || focus,
    card: reviewCard,
    firstStepCard: buildFirstStepPromptCard(repairedFocus || focus),
    parentReceipt,
    parentPrompt: selected.parentPrompt,
    outcomeStandard: selected.outcomeStandard,
    flowSteps: [
      { id: 'first_step_card', displayLabel: '第一步提示', done: true },
      { id: 'review_card', displayLabel: '回访卡', done: !!reviewCard },
      { id: 'transfer_practice', displayLabel: '迁移练习', done: !!reviewCard },
      { id: 'parent_question', displayLabel: '家长一句话', done: !!parentReceipt },
      { id: 'outcome_check', displayLabel: '结果复核', done: !!reviewCard }
    ],
    nextRoutes: [
      { id: 'review', label: '去修这张卡', path: '/pages/review/review' },
      { id: 'profile', label: '看家长复盘', path: '/pages/profile/profile' }
    ],
    nextAction: '已生成回访卡、迁移练习和家长追问；下一步去“今晚只修一个卡点”复核。'
  };
}

function buildBlackboardHint(focus = {}) {
  if (!focus || !focus.id && !focus.issueType && !focus.title && !focus.sourceText) return null;
  const issueType = focus.issueType || '';
  const hint = BLACKBOARD_HINTS[issueType] || null;
  const firstStepCard = buildFirstStepPromptCard(focus);
  if (!hint && !firstStepCard) return null;
  return Object.assign({}, firstStepCard || {}, hint || {}, {
    issueType,
    firstStepCard,
    used: !!(focus.blackboardUsedAt || focus.blackboardHint),
    usedAt: focus.blackboardUsedAt || (focus.blackboardHint && focus.blackboardHint.usedAt) || ''
  });
}

function reviewPromptForIssueType(focus = {}) {
  const issueType = formatIssueType(focus.issueType || '', '思路卡点');
  const blackboardHint = buildBlackboardHint(focus);
  const blackboardLine = blackboardHint && (focus.blackboardUsedAt || focus.blackboardHint)
    ? `昨天小黑板提醒你先看：${blackboardHint.structure}。`
    : '';
  const childFirstStep = sanitizeMiniActionText(focus.childArticulatedStep || focus.childStepSentence || '');
  if (childFirstStep) {
    return {
      front: `你昨天说的第一步是：「${childFirstStep}」。今天还记得为什么先这样做吗？${blackboardLine}`,
      backPrompt: '先用自己的话说出第一步，再看是否需要提示。'
    };
  }
  const title = formatInternalLabel(focus.title || focus.sourceText || '', '昨天修过的卡点');
  if (issueType === '步骤断点' || issueType === '第一步怎么开始') {
    return {
      front: `你昨天卡在「${title}」。下次先问自己：第一步要找什么？`,
      backPrompt: '先说出第一步，再决定下一步，不要一下子想完整题。'
    };
  }
  if (issueType === '列式关系' || issueType === '列式和关系') {
    return {
      front: `你昨天卡在「${title}」。下次先问自己：谁是单位1或等量关系？`,
      backPrompt: '先找题目中的比较对象，再判断谁是单位1或等量关系。'
    };
  }
  if (issueType === '读题审题' || issueType === '读懂题目在问什么') {
    return {
      front: `你昨天卡在「${title}」。下次先圈出题目问什么。`,
      backPrompt: '先看问题，再回头找相关条件，暂时放下无关信息。'
    };
  }
  if (issueType === '概念公式' || issueType === '概念和公式选择') {
    return {
      front: `你昨天卡在「${title}」。下次先想：这个知识点或公式是什么？`,
      backPrompt: '先说出概念边界或公式用途，再决定怎么用。'
    };
  }
  if (issueType === '计算粗心' || issueType === '计算检查') {
    return {
      front: `你昨天卡在「${title}」。下次算完第一步先检查什么？`,
      backPrompt: '先检查符号、单位和抄数，再继续下一步。'
    };
  }
  if (issueType === '表达不完整' || issueType === '写清解题过程') {
    return {
      front: `你昨天卡在「${title}」。下次先把第一句话怎么写说出来。`,
      backPrompt: '先说清第一步和理由，再写完整过程。'
    };
  }
  return {
    front: '昨天修过的卡点，今天先回想第一步。',
    backPrompt: '先用自己的话说出第一步，再看是否需要提示。'
  };
}

function buildTodayFocusReviewCard(focus = {}) {
  const now = new Date();
  const due = addDaysIso(1, now);
  const focusId = focus.id || `focus_${Date.now()}_${randomPart()}`;
  const prompt = reviewPromptForIssueType(focus);
  const front = prompt.front;
  const backPrompt = prompt.backPrompt;
  return {
    id: `focus_review_${focusId}`,
    noteId: `note_focus_${focusId}`,
    deckId: 'ydzx-core',
    template: 'active_recall',
    type: 'today_focus_recall',
    source: 'today_focus',
    sourceFocusId: focusId,
    front,
    backPrompt,
    question: front,
    answer: backPrompt,
    subject: focus.subject || '',
    issueType: focus.issueType || '思路卡点',
    weakPoint: focus.title || focus.issueType || '今晚修过的卡点',
    miniActionText: sanitizeMiniActionText(focus.miniActionText || ''),
    blackboardHint: buildBlackboardHint(focus),
    blackboardUsedAt: focus.blackboardUsedAt || '',
    sourceText: focus.sourceText || focus.thought || '',
    calibrationKey: focus.issueType || '',
    quality: 82,
    dueDate: due,
    due,
    intervalLevel: 1,
    status: 'new',
    stability: 0,
    difficulty: 5,
    retrievability: 0,
    elapsed_days: 0,
    interval: 1,
    reps: 0,
    lapses: 0,
    state: 'new',
    suspended: false,
    leech: false,
    created_at: now.toISOString(),
    updated_at: now.toISOString()
  };
}

function ensureTodayFocusReviewCard(focus = {}) {
  if (!focus || !focus.id || focus.repairStatus !== 'completed' || !focus.hasMiniActionDone) return null;
  const cards = loadReviewCards();
  const existing = cards.find((card) => card && (card.sourceFocusId === focus.id || card.id === `focus_review_${focus.id}`));
  if (existing) return existing;
  const card = buildTodayFocusReviewCard(focus);
  saveReviewCards([card].concat(cards).slice(0, 260));
  appendReviewEvent({
    type: 'today_focus_review_card_created',
    cardId: card.id,
    sourceFocusId: focus.id,
    rating: 'created'
  });
  return card;
}

function loadTodayFocus() {
  const focus = get(KEYS.todayFocus, null);
  if (!focus || typeof focus !== 'object') return null;
  return focus;
}

function saveTodayFocus(focus = {}) {
  const current = loadTodayFocus() || {};
  const isNewFocus = !!(focus && focus.id && current.id && focus.id !== current.id);
  const baseFocus = isNewFocus ? {} : current;
  const evidence = normalizeFirstStepEvidence(Object.assign({}, baseFocus, focus || {}));
  const saved = set(KEYS.todayFocus, Object.assign({
    id: `focus_${Date.now()}_${randomPart()}`,
    date: new Date().toISOString().slice(0, 10),
    source: 'local',
    title: '先说清第一步',
    thought: '',
    sourceText: '',
    thoughtHistory: [],
    relatedThoughts: [],
    issueType: '思路卡点',
    isStuck: false,
    repairStatus: 'not_started',
    progress: 0,
    hasMiniActionDone: false,
    miniActionText: '',
    miniActionAt: '',
    recommendation: '先做 1 道同类题 + 1 道小变式',
    helper: '原小点会先问一步，不直接给答案。',
    created_at: new Date().toISOString()
  }, baseFocus, focus || {}, evidence, {
    miniActionText: evidence.childArticulatedStep || evidence.systemSuggestedStep || (focus && focus.miniActionText) || current.miniActionText || '',
    hasMiniActionDone: !!evidence.childArticulatedStep || !!((focus && focus.hasMiniActionDone) || (!isNewFocus && current.hasMiniActionDone)),
    updated_at: new Date().toISOString()
  }));
  syncTodaySessionFromFocus(saved);
  appendSyncMutation('today_focus', {
    id: saved.id,
    date: saved.date,
    title: saved.title,
    issue_type: saved.issueType || '',
    is_stuck: !!saved.isStuck,
    repair_status: saved.repairStatus,
    has_mini_action_done: !!saved.hasMiniActionDone,
    progress: Number(saved.progress || 0),
    source: saved.source || '',
    created_at: saved.created_at,
    updated_at: saved.updated_at
  });
  return saved;
}

function saveTodayFocusFromThought(text = '', props = {}) {
  const thought = String(text || '').trim();
  const stuck = isStuckThought(thought);
  const taskType = detectTaskType(thought, `${props.issueType || ''} ${props.title || ''}`);
  const systemSuggestedStep = props.systemSuggestedStep || suggestedStepForTaskType(taskType);
  const current = loadTodayFocus();
  const historyItem = {
    text: thought,
    issueType: issueTypeFromThought(thought),
    isStuck: stuck,
    source: props.source || 'homework_tutor',
    created_at: new Date().toISOString()
  };
  if (current && !shouldCreateNewFocus(current, thought)) {
    const nextHistory = [historyItem].concat(current.thoughtHistory || current.relatedThoughts || []).slice(0, 8);
    const patch = {
      thoughtHistory: nextHistory,
      relatedThoughts: nextHistory,
      updatedAt: new Date().toISOString()
    };
    if (!stuck && current.isStuck && current.repairStatus !== 'completed') {
      return saveTodayFocus(Object.assign({}, patch, props || {}));
    }
  }
  const currentAfterHistory = loadTodayFocus();
  return saveTodayFocus(Object.assign({
    id: shouldCreateNewFocus(currentAfterHistory, thought) ? `focus_${Date.now()}_${randomPart()}` : (currentAfterHistory && currentAfterHistory.id),
    source: 'homework_tutor',
    title: focusNameFromThought(thought),
    stuckPointText: thought,
    taskType,
    systemSuggestedStep,
    firstStepStatus: 'suggested',
    firstStepSource: 'system_suggested',
    thought,
    sourceText: thought,
    thoughtHistory: [historyItem].concat((currentAfterHistory && currentAfterHistory.thoughtHistory) || []).slice(0, 8),
    relatedThoughts: [historyItem].concat((currentAfterHistory && currentAfterHistory.relatedThoughts) || []).slice(0, 8),
    issueType: issueTypeFromThought(thought),
    isStuck: stuck,
    hasMiniActionDone: false,
    repairStatus: stuck ? 'not_started' : 'noted',
    progress: stuck ? 12 : 8,
    reason: stuck ? '孩子刚刚说到这里卡住了。' : '孩子已经留下第一步想法。',
    recommendation: '先做 1 道同类题 + 1 道小变式',
    helper: '原小点会先问一步，不直接给答案。'
  }, shouldCreateNewFocus(currentAfterHistory, thought) ? { completed_at: '' } : {}, props || {}));
}

function saveChildArticulatedStep(text = '', patch = {}) {
  const current = loadTodayFocus() || saveTodayFocusFromThought('', { source: 'child_step_default' });
  const today = localDateString();
  const sessionBefore = loadRawTodaySession();
  const childStepSentence = sanitizeMiniActionText(text);
  const quality = childStepQuality(childStepSentence);
  const hasConcreteStep = quality === 'partial' || quality === 'actionable';
  const alreadyConfirmedToday = !!(
    sessionBefore
    && sessionBefore.date === today
    && childStepQuality(sessionBefore.childArticulatedStep || '') !== 'empty'
    && childStepQuality(sessionBefore.childArticulatedStep || '') !== 'vague'
  );
  if (hasConcreteStep) {
    recordLocalAnalytics('first_step_confirmed', { quality });
    if (!alreadyConfirmedToday) {
      recordDailyLearningQuestSignal({ firstStepConfirmed: true });
    }
  }
  return saveTodayFocus(Object.assign({}, current, patch || {}, {
    childArticulatedStep: childStepSentence,
    childStepSentence,
    childStepQuality: quality,
    firstStepSource: childStepSentence ? 'child_articulated' : current.firstStepSource || 'system_suggested',
    firstStepStatus: hasConcreteStep ? 'child_confirmed' : current.firstStepStatus || 'suggested',
    hasMiniActionDone: hasConcreteStep,
    miniActionText: childStepSentence || current.systemSuggestedStep || current.miniActionText || '',
    miniActionAt: hasConcreteStep ? new Date().toISOString() : current.miniActionAt || '',
    updatedAt: new Date().toISOString()
  }));
}

function updateTodayFocusRepair(patch = {}) {
  const current = loadTodayFocus() || saveTodayFocusFromThought('我不会下一步怎么写', {
    source: 'review_default'
  });
  const status = patch.repairStatus || patch.status || current.repairStatus || 'not_started';
  const existingChildStep = sanitizeMiniActionText(current.childArticulatedStep || current.childStepSentence || '');
  const incomingMiniActionText = patch.miniActionText !== undefined
    ? sanitizeMiniActionText(patch.miniActionText)
    : existingChildStep;
  const incomingQuality = childStepQuality(incomingMiniActionText);
  const miniActionValid = isValidMiniActionText(incomingMiniActionText) && incomingQuality !== 'empty' && incomingQuality !== 'vague';
  const existingChildValid = isValidMiniActionText(existingChildStep) && childStepQuality(existingChildStep) !== 'vague';
  const nextHasMiniAction = miniActionValid || (!!patch.hasMiniActionDone && existingChildValid);
  if ((patch.hasMiniActionDone || status === 'completed') && !miniActionValid && !existingChildValid) {
    return saveTodayFocus(Object.assign({}, current, patch || {}, {
      hasMiniActionDone: false,
      miniActionText: incomingMiniActionText,
      repairStatus: 'in_progress',
      progress: Math.max(56, Number(current.progress || 0)),
      blockedReason: 'mini_action_required',
      feedbackText: '先用自己的话说一句第一步，再完成修复。'
    }));
  }
  const completedPatch = { repairStatus: 'completed' };
  if (status === 'completed' && !nextHasMiniAction) {
    return saveTodayFocus(Object.assign({}, current, patch || {}, {
      repairStatus: 'in_progress',
      progress: Math.max(56, Number(current.progress || 0)),
      blockedReason: 'mini_action_required'
    }));
  }
  const fallbackProgress = status === 'completed' ? 100 : status === 'in_progress' ? Math.max(56, Number(current.progress || 0)) : Number(current.progress || 0);
  const saved = saveTodayFocus(Object.assign({}, current, status === 'completed' ? completedPatch : {}, patch || {}, {
    repairStatus: status,
    hasMiniActionDone: nextHasMiniAction || !!current.hasMiniActionDone,
    miniActionText: incomingMiniActionText || current.miniActionText || '',
    childArticulatedStep: incomingMiniActionText || current.childArticulatedStep || '',
    childStepSentence: incomingMiniActionText || current.childStepSentence || '',
    childStepQuality: childStepQuality(incomingMiniActionText || current.childStepSentence || current.childArticulatedStep || ''),
    firstStepSource: (incomingMiniActionText || current.childArticulatedStep) ? 'child_articulated' : current.firstStepSource || 'system_suggested',
    firstStepStatus: status === 'completed' ? 'revisited' : (nextHasMiniAction ? 'child_confirmed' : current.firstStepStatus || 'suggested'),
    miniActionAt: nextHasMiniAction ? (patch.miniActionAt || current.miniActionAt || new Date().toISOString()) : (current.miniActionAt || ''),
    blockedReason: '',
    progress: Math.max(0, Math.min(100, Number(patch.progress !== undefined ? patch.progress : fallbackProgress))),
    completed_at: status === 'completed' ? (patch.completed_at || new Date().toISOString()) : current.completed_at
  }));
  if (saved.repairStatus === 'completed' && saved.hasMiniActionDone) {
    ensureTodayFocusReviewCard(saved);
    updateTonightRouteStatus('review_scheduled', {
      focusId: saved.id
    });
  } else if (saved.repairStatus === 'in_progress') {
    updateTonightRouteStatus('focus_created', {
      focusId: saved.id
    });
  }
  return saved;
}

function localDateString(input = new Date()) {
  const date = input instanceof Date ? input : new Date(String(input).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function sessionNowMs(input) {
  if (!input) return Date.now();
  const date = input instanceof Date ? input : new Date(String(input).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? Date.now() : date.getTime();
}

function isYesterday(dateInput, nowInput = new Date()) {
  const dateText = localDateString(dateInput);
  const now = new Date(sessionNowMs(nowInput));
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return dateText === yesterday.toISOString().slice(0, 10);
}

function defaultTodaySession(nowInput = new Date()) {
  const nowMs = sessionNowMs(nowInput);
  return {
    date: localDateString(nowInput),
    status: 'active',
    stuckPointText: '',
    taskType: 'unknown',
    taskTypeConfirmed: false,
    tutorCompleted: false,
    childArticulatedStep: '',
    firstStepQuality: 'empty',
    firstStepSource: 'manual',
    focusBound: false,
    focusEvidence: {
      targetStep: '',
      targetSource: 'manual',
      duration: 0,
      completionType: '',
      interruptedAt: null,
      actualFocusSeconds: 0
    },
    reviewCardGenerated: false,
    reviewCardId: '',
    gamePlayed: false,
    gameEvidence: {
      taskType: '',
      firstStep: '',
      score: 0,
      completed: false
    },
    parentRecapViewed: false,
    createdAt: nowMs,
    updatedAt: nowMs
  };
}

function normalizeTodaySession(input = {}, nowInput = new Date()) {
  const base = defaultTodaySession(nowInput);
  const session = Object.assign({}, base, input || {});
  session.focusEvidence = Object.assign({}, base.focusEvidence, (input && input.focusEvidence) || {});
  session.gameEvidence = Object.assign({}, base.gameEvidence, (input && input.gameEvidence) || {});
  session.taskType = session.taskType || 'unknown';
  session.firstStepQuality = session.firstStepQuality || childStepQuality(session.childArticulatedStep || '');
  session.firstStepSource = session.firstStepSource || (session.childArticulatedStep ? 'child_articulated' : 'manual');
  session.updatedAt = Number(session.updatedAt || Date.now());
  session.createdAt = Number(session.createdAt || session.updatedAt);
  return session;
}

function loadRawTodaySession() {
  const session = get(KEYS.todaySession, null);
  if (!session || typeof session !== 'object') return null;
  return normalizeTodaySession(session);
}

function getTodaySession(options = {}) {
  const nowInput = options.now || new Date();
  const today = localDateString(nowInput);
  const current = loadRawTodaySession();
  if (current && current.date === today) return current;
  const session = defaultTodaySession(nowInput);
  set(KEYS.todaySession, session);
  return session;
}

function saveTodaySession(patch = {}, options = {}) {
  const current = options.skipCreate ? loadRawTodaySession() : getTodaySession(options);
  const base = current || defaultTodaySession(options.now || new Date());
  const next = normalizeTodaySession(Object.assign({}, base, patch || {}, {
    focusEvidence: Object.assign({}, base.focusEvidence || {}, (patch && patch.focusEvidence) || {}),
    gameEvidence: Object.assign({}, base.gameEvidence || {}, (patch && patch.gameEvidence) || {}),
    updatedAt: sessionNowMs(options.now || new Date())
  }), options.now || new Date());
  set(KEYS.todaySession, next);
  appendSyncMutation('today_session', {
    id: `today_session_${next.date}`,
    date: next.date,
    status: next.status,
    stuckPointText: next.stuckPointText || '',
    taskType: next.taskType || 'unknown',
    taskTypeConfirmed: !!next.taskTypeConfirmed,
    tutorCompleted: !!next.tutorCompleted,
    childArticulatedStep: next.childArticulatedStep || '',
    firstStepQuality: next.firstStepQuality || 'empty',
    focusEvidence: next.focusEvidence || {},
    reviewCardGenerated: !!next.reviewCardGenerated,
    reviewCardId: next.reviewCardId || '',
    gamePlayed: !!next.gamePlayed,
    gameEvidence: next.gameEvidence || {},
    parentRecapViewed: !!next.parentRecapViewed,
    updatedAt: next.updatedAt
  });
  return next;
}

function syncTodaySessionFromFocus(focus = {}, options = {}) {
  const evidence = normalizeFirstStepEvidence(focus || {});
  const patch = {
    stuckPointText: evidence.stuckPointText || focus.stuckPointText || '',
    taskType: evidence.taskType || focus.taskType || 'unknown',
    taskTypeConfirmed: !!(focus.taskTypeConfirmed || focus.source === 'diagnosis' || focus.source === 'light_diagnosis'),
    childArticulatedStep: evidence.childArticulatedStep || '',
    firstStepQuality: evidence.childStepQuality || childStepQuality(evidence.childArticulatedStep || ''),
    firstStepSource: evidence.firstStepSource || (evidence.childArticulatedStep ? 'child_articulated' : 'system_suggested')
  };
  if (patch.childArticulatedStep && patch.firstStepQuality !== 'empty') patch.tutorCompleted = true;
  return saveTodaySession(patch, options);
}

function canStartFocusFromTodaySession(session = getTodaySession()) {
  const quality = session.firstStepQuality || childStepQuality(session.childArticulatedStep || '');
  return !!(session.childArticulatedStep && quality !== 'empty');
}

function parentQuestionFromFirstStep(step = '') {
  const text = String(step || '');
  if (/圈条件|关键词|已知量|已知|条件/.test(text)) return '你第一步圈了哪些条件？';
  if (/读题|读第一句|先读/.test(text)) return '你读题时先看了哪句话？';
  if (/找等量关系|等量关系|关系/.test(text)) return '你找了哪两个量之间的关系？';
  if (/写开头|列提纲|第一句/.test(text)) return '你写的第一句是什么？';
  return '你第一步先做了什么？';
}

function wrongCauseFromFirstStep(step = '', taskType = 'unknown') {
  const text = `${step || ''} ${taskType || ''}`;
  if (/圈条件|关键词|已知量|已知|条件|读题|问号/.test(text)) {
    return {
      id: 'reading_conditions',
      label: '审题条件',
      checkpoint: '先圈题目问什么、已知条件和单位。',
      parentPrompt: '你第一步圈了哪些条件？',
      nextPracticeText: '做 1 道同类题，只圈条件和问题句，不急着算。'
    };
  }
  if (/等量关系|关系|方程|列式|未知数/.test(text)) {
    return {
      id: 'modeling_relation',
      label: '关系建模',
      checkpoint: '先写出两个量之间的关系，再列式。',
      parentPrompt: '你找了哪两个量之间的关系？',
      nextPracticeText: '把题目里的两个关键量写成一句关系话。'
    };
  }
  if (/计算|粗心|检查|符号|小数点/.test(text)) {
    return {
      id: 'calculation_check',
      label: '计算检查',
      checkpoint: '先复算关键一步，再查符号和单位。',
      parentPrompt: '你准备先检查哪一步计算？',
      nextPracticeText: '只复算上次错的那一步，再做 2 个同类小练。'
    };
  }
  if (/写|提纲|作文|句|阅读|概括/.test(text)) {
    return {
      id: 'expression_planning',
      label: '表达组织',
      checkpoint: '先写一句主干，再补理由或例子。',
      parentPrompt: '你写的第一句是什么？',
      nextPracticeText: '只写开头一句和两个要点，不追求整篇。'
    };
  }
  if (/physics_diagram|物理|受力|电路|光路|方向|状态|研究对象/.test(text)) {
    return {
      id: 'visual_modeling',
      label: '图示建模',
      checkpoint: '先定研究对象，再画第一根方向、力或状态。',
      parentPrompt: '你先画的是哪个对象？第一根标记为什么放这里？',
      nextPracticeText: '做 1 道同类题，只画对象和第一根标记，不急着套公式。'
    };
  }
  if (/chemistry_experiment|化学|反应|物质|现象|气体|沉淀|守恒/.test(text)) {
    return {
      id: 'phenomenon_reason',
      label: '现象归因',
      checkpoint: '先列反应前后物质，再说现象来自哪里。',
      parentPrompt: '你看到的现象是颜色、气体还是沉淀？它从哪里来？',
      nextPracticeText: '做 1 道同类题，只说物质和现象来源。'
    };
  }
  if (/biology_process|生物|结构|功能|过程|对照组/.test(text)) {
    return {
      id: 'structure_process',
      label: '结构过程',
      checkpoint: '先把结构和功能连起来，再排过程顺序。',
      parentPrompt: '这个结构有什么用？这一步前后分别是什么？',
      nextPracticeText: '做 1 道同类题，只连一个结构和一个功能。'
    };
  }
  if (/geography_map|地理|地图|图例|区域|原因链|方向/.test(text)) {
    return {
      id: 'map_cause_chain',
      label: '读图因果',
      checkpoint: '先看方向、图例和位置，再说第一条原因链。',
      parentPrompt: '你先在图上定位哪里？第一条原因是什么？',
      nextPracticeText: '换一张图，只做定位和一句原因。'
    };
  }
  return {
    id: 'first_step',
    label: '第一步确认',
    checkpoint: '先说自己准备从哪里开始。',
    parentPrompt: parentQuestionFromFirstStep(step),
    nextPracticeText: step ? `把「${step}」写成一句话，再进入专注。` : '把第一步写成一句话，再进入专注。'
  };
}

function reviewCardFromSession(session = getTodaySession()) {
  const focusEvidence = session.focusEvidence || {};
  const id = session.reviewCardId || `session_review_${session.date}_${randomPart()}`;
  const step = session.childArticulatedStep || focusEvidence.targetStep || '';
  const taskType = session.taskType || 'unknown';
  const wrongCause = wrongCauseFromFirstStep(step, taskType);
  return {
    id,
    date: session.date,
    stuckPointText: session.stuckPointText || '',
    taskType,
    wrongCauseBucket: wrongCause.id,
    wrongCauseLabel: wrongCause.label,
    checkpoint: wrongCause.checkpoint,
    parentPrompt: wrongCause.parentPrompt,
    nextPracticePlan: {
      wrongCauseBucket: wrongCause.id,
      wrongCauseLabel: wrongCause.label,
      checkpoint: wrongCause.checkpoint,
      parentPrompt: wrongCause.parentPrompt,
      nextPracticeText: wrongCause.nextPracticeText,
      transferPracticeSet: buildTransferPracticeSet({
        taskType,
        childArticulatedStep: step,
        wrongCauseBucket: wrongCause.id,
        wrongCauseLabel: wrongCause.label,
        stuckPointText: session.stuckPointText || ''
      }),
      appRoute: wrongCause.id === 'first_step' ? '/pages/tutor/tutor' : '/pages/review/review'
    },
    childArticulatedStep: step,
    firstStepQuality: session.firstStepQuality || childStepQuality(step),
    focusDuration: Number(focusEvidence.duration || focusEvidence.actualFocusSeconds || 0),
    focusCompletionType: focusEvidence.completionType || '',
    gameScore: Number((session.gameEvidence && session.gameEvidence.score) || 0),
    repairPlan: step ? `明天先回看：${step}。${wrongCause.nextPracticeText}` : wrongCause.nextPracticeText,
    gameEvidence: session.gameEvidence || {},
    parentRecapLine: step ? `今晚只问一句：${parentQuestionFromFirstStep(step)}` : '今晚先看孩子有没有说出第一步。',
    isRevisited: !!session.isRevisited,
    source: 'today_session',
    sourceFocusId: session.reviewCardId || id,
    front: step ? `回看这一步：${step}` : '回看昨晚第一步',
    backPrompt: session.stuckPointText || '说说昨晚卡在哪里。',
    question: step ? `昨晚第一步是什么？${step}` : '昨晚第一步是什么？',
    answer: step || session.stuckPointText || '',
    due: addDaysIso(1, new Date(`${session.date}T00:00:00`)),
    dueDate: addDaysIso(1, new Date(`${session.date}T00:00:00`)),
    created_at: new Date(session.updatedAt || Date.now()).toISOString(),
    updated_at: new Date().toISOString()
  };
}

function generateReviewCard(sessionInput) {
  const session = normalizeTodaySession(sessionInput || getTodaySession());
  const card = reviewCardFromSession(session);
  const cards = loadReviewCards();
  const next = [card].concat(cards.filter((item) => item && item.id !== card.id)).slice(0, 260);
  saveReviewCards(next);
  const current = loadRawTodaySession();
  if (!current || current.date === session.date) {
    saveTodaySession({
      reviewCardGenerated: true,
      reviewCardId: card.id
    }, {
      now: new Date(`${session.date}T00:00:00`),
      skipCreate: true
    });
  }
  appendReviewEvent({
    type: 'today_session_review_card_created',
    cardId: card.id,
    sourceFocusId: card.sourceFocusId
  });
  queueLearningSyncSnapshot('review_card_generated');
  return card;
}

function recordFocusSessionEvidence(record = {}) {
  const target = record.focusTarget || {};
  const targetStep = target.linkedChildArticulatedStep || target.title || '';
  const completionType = record.completionType || (record.status === 'interrupted' ? 'interrupted' : 'completed');
  const completedFocusRound = completionType === 'completed' || completionType === 'manual_done';
  const session = saveTodaySession({
    status: completionType === 'interrupted' ? 'active' : 'completed',
    focusBound: true,
    focusEvidence: {
      targetStep,
      targetSource: target.targetSource || 'child_articulated',
      duration: Number(record.completedSeconds || record.actualFocusSeconds || 0),
      completionType,
      interruptedAt: record.interruptedAt || null,
      actualFocusSeconds: Number(record.actualFocusSeconds || record.completedSeconds || 0)
    }
  });
  if (completedFocusRound) {
    recordDailyLearningQuestSignal({ focusRoundCompleted: true }, { now: record.now || new Date() });
  }
  return generateReviewCard(session);
}

function markReviewCardRevisited(cardId) {
  const cards = loadReviewCards();
  const targetId = cardId || (cards[0] && cards[0].id);
  const next = cards.map((card) => (
    card && card.id === targetId ? Object.assign({}, card, { isRevisited: true, updated_at: new Date().toISOString() }) : card
  ));
  saveReviewCards(next);
  return next.find((card) => card && card.id === targetId) || null;
}

function getYesterdayReview(nowInput = new Date()) {
  return loadReviewCards().find((card) => card && !card.isRevisited && isYesterday(card.date || card.created_at, nowInput)) || null;
}

function archiveYesterdaySession(options = {}) {
  const nowInput = options.now || new Date();
  const current = loadRawTodaySession();
  if (!current || current.date === localDateString(nowInput)) return null;
  const completionType = current.focusEvidence && current.focusEvidence.completionType;
  const status = completionType === 'completed' || completionType === 'manual_done' ? 'completed' : 'abandoned';
  const archived = normalizeTodaySession(Object.assign({}, current, { status, updatedAt: sessionNowMs(nowInput) }), nowInput);
  const card = generateReviewCard(archived);
  set(KEYS.todaySession, defaultTodaySession(nowInput));
  return { session: archived, card };
}

function loadReviewCards() {
  const list = get(KEYS.reviewCards, []);
  return Array.isArray(list) ? list : [];
}

function loadReviewDeck() {
  return get(KEYS.reviewDeck, null);
}

function saveReviewDeck(deck) {
  return set(KEYS.reviewDeck, deck || null);
}

function loadReviewNotes() {
  const list = get(KEYS.reviewNotes, []);
  return Array.isArray(list) ? list : [];
}

function saveReviewNotes(notes) {
  return set(KEYS.reviewNotes, Array.isArray(notes) ? notes : []);
}

function saveReviewCards(cards) {
  const safeCards = Array.isArray(cards) ? cards : [];
  const saved = set(KEYS.reviewCards, safeCards);
  appendSyncMutation('review_cards_snapshot', {
    id: `review_cards_${localDateString()}`,
    total: safeCards.length,
    cards: safeCards.slice(0, 40),
    updated_at: new Date().toISOString()
  });
  return saved;
}

function loadReviewEvents() {
  const list = get(KEYS.reviewEvents, []);
  return Array.isArray(list) ? list : [];
}

function appendReviewEvent(item) {
  const record = Object.assign({ created_at: new Date().toISOString() }, item || {});
  const next = [record]
    .concat(loadReviewEvents())
    .slice(0, 240);
  set(KEYS.reviewEvents, next);
  appendSyncMutation('review_event', record);
  return next;
}

function loadGameProfile() {
  return get(KEYS.gameProfile, {
    xp: 0,
    coins: 0,
    streak: 0,
    best_streak: 0,
    last_study_date: '',
    streak_freezes: 1,
    lives: 5,
    max_lives: 5,
    achievements: [],
    inventory: [],
    recent_quiz_accuracy: [],
    daily_xp: {},
    updated_at: ''
  });
}

function saveGameProfile(profile = {}) {
  const current = loadGameProfile();
  const saved = set(KEYS.gameProfile, Object.assign({}, current, profile || {}, {
    updated_at: new Date().toISOString()
  }));
  appendSyncMutation('game_profile', {
    xp: Number(saved.xp || 0),
    coins: Number(saved.coins || 0),
    streak: Number(saved.streak || 0),
    best_streak: Number(saved.best_streak || 0),
    achievements: saved.achievements || [],
    inventory_count: (saved.inventory || []).length
  });
  return saved;
}

function recordDailyLearningQuestSignal(signal = {}, options = {}) {
  const current = loadGameProfile();
  const nowInput = options.now || new Date();
  const today = localDateString(nowInput);
  const sameLearningDay = current.last_learning_day === today;
  const firstStepBase = sameLearningDay
    ? Number(current.first_step_count || current.firstStepCount || 0)
    : 0;
  const focusRoundBase = sameLearningDay
    ? Number(current.focus_rounds_today || current.focusRoundsToday || 0)
    : 0;
  const firstStepDelta = signal.firstStepConfirmed ? 1 : 0;
  const focusRoundDelta = signal.focusRoundCompleted ? 1 : 0;
  if (!firstStepDelta && !focusRoundDelta) return current;
  const saved = saveGameProfile({
    first_step_count: firstStepBase + firstStepDelta,
    firstStepCount: firstStepBase + firstStepDelta,
    focus_rounds_today: focusRoundBase + focusRoundDelta,
    focusRoundsToday: focusRoundBase + focusRoundDelta,
    last_learning_day: today
  });
  appendSyncMutation('daily_learning_quest_signal', {
    id: `daily_learning_quest_${today}`,
    date: today,
    first_step_count: Number(saved.first_step_count || 0),
    focus_rounds_today: Number(saved.focus_rounds_today || 0),
    first_step_confirmed: !!signal.firstStepConfirmed,
    focus_round_completed: !!signal.focusRoundCompleted,
    created_at: new Date().toISOString()
  });
  return saved;
}

function addGameXP(amount, reason = '') {
  const current = loadGameProfile();
  const today = new Date().toISOString().slice(0, 10);
  const daily = Object.assign({}, current.daily_xp || {});
  const delta = Math.max(0, Number(amount || 0));
  const nextDaily = Number(daily[today] || 0) + delta;
  daily[today] = Math.min(500, nextDaily);
  const accepted = Math.max(0, daily[today] - Number((current.daily_xp || {})[today] || 0));
  const saved = saveGameProfile(Object.assign({}, current, {
    xp: Number(current.xp || 0) + accepted,
    daily_xp: daily
  }));
  if (accepted > 0) {
    appendSyncMutation('game_xp', {
      xp: accepted,
      reason,
      daily_total: daily[today],
      created_at: new Date().toISOString()
    });
  }
  return { profile: saved, accepted, capped: accepted < delta };
}

function recordGameSessionResult(result = {}, context = {}) {
  const current = loadGameProfile();
  const total = Number(result.total || 0);
  const correct = Number(result.correct || 0);
  const accuracy = Number(result.accuracy || 0);
  const reviewedToday = Math.max(1, total || correct || 1);
  const nowInput = context.now || new Date();
  const today = localDateString(nowInput);
  const sameGameDay = current.last_game_day === today;
  const previousReviewedToday = sameGameDay
    ? Number(current.reviewed_today || current.reviewedToday || 0)
    : 0;
  const previousCorrectToday = sameGameDay
    ? Number(current.correct_today || current.correctToday || 0)
    : 0;
  const nextReviewedToday = previousReviewedToday + reviewedToday;
  const nextCorrectToday = previousCorrectToday + Math.max(0, correct);
  const streaked = gameLogic.updateStreak(current, {
    reviewedToday,
    threshold: 1,
    now: nowInput
  });
  const recentQuiz = (Array.isArray(streaked.recent_quiz_accuracy) ? streaked.recent_quiz_accuracy : [])
    .concat([accuracy])
    .slice(-7);
  const stats = Object.assign({}, streaked, {
    review_count: Number(streaked.review_count || 0) + reviewedToday,
    correct_count: Number(streaked.correct_count || 0) + correct,
    reviewed_today: nextReviewedToday,
    correct_today: nextCorrectToday,
    reviewedToday: nextReviewedToday,
    correctToday: nextCorrectToday,
    last_game_day: today,
    recent_quiz_accuracy: recentQuiz,
    achievements: streaked.achievements || []
  });
  const achievementResult = gameLogic.checkAndUnlockAchievements(stats);
  const saved = saveGameProfile(Object.assign({}, stats, {
    achievements: achievementResult.achievements,
    coins: Number(stats.coins || 0) + Number(achievementResult.coinsAwarded || 0)
  }));
  appendSyncMutation('game_session_result', {
    id: `game_session_${today}_${String(context.gameType || result.gameType || 'arcade')}`,
    game_type: context.gameType || result.gameType || 'arcade',
    total,
    correct,
    accuracy,
    reviewed_today: nextReviewedToday,
    correct_today: nextCorrectToday,
    streak: Number(saved.streak || 0),
    achievements: saved.achievements || [],
    newly_unlocked: achievementResult.newlyUnlocked.map((item) => item.id),
    created_at: new Date().toISOString()
  });
  return {
    profile: saved,
    newlyUnlocked: achievementResult.newlyUnlocked,
    coinsAwarded: achievementResult.coinsAwarded
  };
}

function saveGamePurchase(purchase = {}) {
  const next = [Object.assign({ created_at: new Date().toISOString() }, purchase || {})]
    .concat(loadGamePurchases())
    .slice(0, 120);
  set(KEYS.gamePurchases, next);
  appendSyncMutation('game_purchase', next[0]);
  return next;
}

function loadGamePurchases() {
  const list = get(KEYS.gamePurchases, []);
  return Array.isArray(list) ? list : [];
}

function loadShareRuns() {
  const list = get(KEYS.shareRuns, []);
  return Array.isArray(list) ? list : [];
}

function loadIncomingShare() {
  return get(KEYS.incomingShare, null);
}

function parentNextActionLabel(action = '') {
  if (action === 'wrong_cause_revisit') return '明天先回看这张错因卡';
  if (action === 'due_card_revisit') return '明天先清一张待回访卡';
  if (action === 'first_step_revisit') return '明天继续说出第一步';
  return '先用自己的材料完成一组轻回访';
}

function parentNextActionDetail(action = '') {
  if (action === 'wrong_cause_revisit') return '先让孩子说出这张错因卡的第一步，再做一道同类小题。';
  if (action === 'due_card_revisit') return '先回忆再核对，忘了就回到第一步提示卡。';
  if (action === 'first_step_revisit') return '家长只问一句，不接管答案：你第一步先看哪里？';
  return '用自己的作业或错题生成一张卡，再完成一次 5 分钟轻回访。';
}

function buildShareChallengePlan(input = {}) {
  const focus = input.focus || loadTodayFocus() || {};
  const capability = input.capability || {};
  const subjectDepth = input.subjectSkillDepth || null;
  const actionLabel = input.actionLabel || capability.nextAction || parentNextActionLabel(input.parentNextAction || '');
  const subjectLabel = subjectDepth && subjectDepth.label ? subjectDepth.label : (focus.title ? '当前卡点' : '第一步');
  const firstStep = subjectDepth && subjectDepth.firstStep
    ? subjectDepth.firstStep
    : (focus.childArticulatedStep || focus.systemSuggestedStep || '先说清第一步');
  const route = capability.route || input.route || '/pages/arcade/arcade';
  const goal = `用自己的材料完成一次「${subjectLabel}」轻挑战`;
  const steps = [
    { id: 'recall', label: '主动回忆', text: `先不看答案，说出：${firstStep}` },
    { id: 'repair', label: '错因修复', text: actionLabel || '错了也只退回第一步提示卡。' },
    { id: 'revisit', label: '次日回访', text: '明天只回看 1 张卡，确认还能开口。' }
  ];
  const reviewCadence = [
    { id: 'tonight', label: '今晚', text: '完成 3 张主动回忆卡，只奖励说清第一步。' },
    { id: 'tomorrow', label: '明天', text: '只回访最不稳的 1 张卡，不扩题量。' },
    { id: 'day_7', label: '第 7 天', text: '用 1 道小变式确认能不能迁移。' }
  ];
  const privacyBoundary = '分享只带轻挑战、第一步、能力缺口和回访动作，不带孩子完整对话、分数、原题照片。';
  const peerSafeLine = '同伴只接同类动作，不比较速度、不比较正确率。';
  const returnPathContract = [
    { id: 'land', label: '落地页', text: '先解释这不是排行榜，而是一张可复用的学习动作卡。' },
    { id: 'choose', label: '选动作', text: '从修卡点、轻挑战、给家长看三条路里选一条。' },
    { id: 'persist', label: '留证据', text: '完成后写入分享接力、统一下一步和页面能力账本。' }
  ];
  const relayChain = [
    { id: 'sender', label: '发起者', text: `留下「${subjectLabel}」的第一步证据。` },
    { id: 'receiver', label: '接收者', text: '用自己的材料复刻同一类第一步，不复制作业答案。' },
    { id: 'parent', label: '家长', text: '只检查今晚动作和明天回访，不追排名。' }
  ];
  const communityChallengeCard = {
    title: '家庭轻接力卡',
    promise: '把一次分享变成一次可复用的学习动作，而不是邀请链接。',
    firstStep,
    noRankingLine: '不排行、不晒分、不暴露原题，只留行动证据。',
    doneSignal: '接收者完成 1 次主动回忆、1 次错因回退、1 次明天回访预约。'
  };
  const parentDecisionPayload = {
    tonightQuestion: `今晚只问一句：${firstStep}`,
    evidenceToCheck: ['孩子自己的第一步', '错因是否回到卡片', '明天是否能复述'],
    stopRule: '孩子说不出来就停在小黑板提示，不继续补完整答案。'
  };
  const wrongCauseReplayPayload = {
    entry: '/pages/review/review?from=share_relay&mode=wrong_cause',
    replayRule: '先复述错因，再做 1 道同类小变式。',
    fallback: '错因说不清时回到第一步卡，不进入刷题。'
  };
  const sevenDayReviewPayload = {
    day1: '今晚完成主动回忆。',
    day2: '明天只回访最不稳的 1 张卡。',
    day7: '第 7 天用小变式确认迁移。'
  };
  const shareRelayActions = [
    { id: 'repair', label: '修卡点', route: wrongCauseReplayPayload.entry, evidence: 'wrong_cause_relay' },
    { id: 'challenge', label: '做轻挑战', route, evidence: 'active_recall_relay' },
    { id: 'parent', label: '给家长看', route: '/pages/profile/profile?from=share_relay', evidence: 'parent_decision_relay' }
  ];
  return {
    id: 'share_challenge_plan',
    title: '同伴轻挑战',
    goal,
    route,
    noRankingLine: '不排行、不晒分，只看有没有说清第一步。',
    modeLine: input.mode === 'parent_recap'
      ? '家庭模式：另一位家长只照着一句话追问。'
      : '同伴模式：对方用自己的材料做同一类第一步。',
    steps,
    reviewCadence,
    relayChain,
    communityChallengeCard,
    returnPathContract,
    privacyBoundary,
    peerSafeLine,
    parentDecisionPayload,
    wrongCauseReplayPayload,
    sevenDayReviewPayload,
    evidenceContractLine: '接力成立必须同时有：第一步、错因回退、明天回访；缺一项就只算邀请，不算学习闭环。',
    shareRelayActions,
    parentEvidenceLine: '家长只看三件事：孩子是否自己说第一步、错因是否回到卡片、明天是否还能复述。',
    successRule: '完成 3 张主动回忆卡，并留下孩子自己的第一步。',
    failureFallback: '如果说不出来，退回第一步小黑板，不继续讲完整答案。',
    evidenceRequired: ['active_recall_cards', 'child_first_step', 'wrong_cause_return', 'next_day_revisit'],
    query: {
      challenge_goal: goal,
      challenge_rule: '三张主动回忆卡，不排行，只留第一步证据',
      challenge_route: route,
      relay_privacy: privacyBoundary,
      relay_review: sevenDayReviewPayload.day7,
      relay_first_step: firstStep
    }
  };
}

function saveIncomingShare(share = {}) {
  const code = share.share_code || share.code || '';
  if (!code) return null;
  const parentNextAction = share.parent_next_action || share.action || '';
  const record = {
    code,
    share_code: code,
    from: share.from || '',
    challenge: share.challenge || '',
    mode: share.mode || '',
    identity_tag: share.identity_tag || share.identity || '',
    parent_next_action: parentNextAction,
    action_label: share.action_label || parentNextActionLabel(parentNextAction),
    action_detail: share.action_detail || parentNextActionDetail(parentNextAction),
    capability_gap: share.capability_gap || '',
    capability_label: share.capability_label || '',
    capability_next_action: share.capability_next_action || '',
    capability_route: share.capability_route || '',
    challenge_goal: share.challenge_goal || '',
    challenge_rule: share.challenge_rule || '',
    challenge_route: share.challenge_route || '',
    relay_privacy: share.relay_privacy || '',
    relay_review: share.relay_review || '',
    relay_first_step: share.relay_first_step || '',
    course_unit_label: share.course_unit_label || '',
    course_unit_subject: share.course_unit_subject || '',
    course_unit_tier: share.course_unit_tier || '',
    course_unit_parent_decision: share.course_unit_parent_decision || '',
    course_unit_report_contract: share.course_unit_report_contract || '',
    course_unit_share_contract: share.course_unit_share_contract || '',
    course_unit_blackboard: share.course_unit_blackboard || '',
    course_unit_recall_route: share.course_unit_recall_route || '',
    course_unit_game_route: share.course_unit_game_route || '',
    created_at: share.created_at || new Date().toISOString()
  };
  set(KEYS.incomingShare, record);
  return record;
}

function appendShareRun(event = {}) {
  const list = loadShareRuns();
  const shareCode = event.share_code || event.code || (event.payload && (event.payload.share_code || event.payload.code)) || '';
  const record = {
    id: event.id || `share_${Date.now()}`,
    type: event.type || 'daily_learning_card',
    code: shareCode,
    share_code: shareCode,
    title: event.title || '',
    path: event.path || '',
    payload: event.payload && typeof event.payload === 'object' ? event.payload : {},
    share_intent: event.share_intent || (event.payload && event.payload.share_intent) || '',
    created_at: event.created_at || new Date().toISOString()
  };
  const next = [record].concat(list).slice(0, 80);
  set(KEYS.shareRuns, next);
  appendSyncMutation('share_run', {
    id: record.id,
    type: record.type,
    code: record.code,
    share_code: record.share_code,
    title: record.title,
    path: record.path,
    share_intent: record.share_intent,
    payload: record.payload,
    created_at: record.created_at
  });
  return next;
}

function randomPart() {
  return Math.random().toString(36).slice(2, 10);
}

function loadClientIdentity() {
  const existing = get(KEYS.clientIdentity, null);
  if (existing && existing.client_id) return existing;
  return set(KEYS.clientIdentity, {
    client_id: `local_${Date.now()}_${randomPart()}`,
    user_id: '',
    auth_mode: 'local',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}

function saveClientIdentity(patch = {}) {
  const current = loadClientIdentity();
  return set(KEYS.clientIdentity, Object.assign({}, current, patch, {
    updated_at: new Date().toISOString()
  }));
}

function loadSyncState() {
  return get(KEYS.syncState, {
    enabled: false,
    cursor: '',
    version: 1,
    last_success_at: '',
    last_attempt_at: '',
    last_error: '',
    mode: 'local_queue'
  });
}

function saveSyncState(patch = {}) {
  const current = loadSyncState();
  return set(KEYS.syncState, Object.assign({}, current, patch, {
    updated_at: new Date().toISOString()
  }));
}

function loadSyncQueue() {
  const list = get(KEYS.syncQueue, []);
  return Array.isArray(list) ? list : [];
}

function mutationEntity(type, payload = {}) {
  const entityId = payload.id
    || payload.target_id
    || payload.module_id
    || payload.card_id
    || payload.note_id
    || payload.reward_id
    || payload.deck_id
    || '';
  const family = String(type || '').split('_')[0] || 'learning';
  return {
    entity_type: payload.entity_type || family,
    entity_id: String(entityId || '')
  };
}

function appendSyncMutation(type, payload = {}) {
  const identity = loadClientIdentity();
  const safePayload = payload && typeof payload === 'object' ? payload : {};
  const entity = mutationEntity(type, safePayload);
  const state = loadSyncState();
  const seq = Number(state.local_seq || 0) + 1;
  const dedupeKey = [
    type,
    entity.entity_id,
    safePayload.created_at || '',
    JSON.stringify(safePayload).slice(0, 120)
  ].join('|');
  const existing = loadSyncQueue();
  if (existing.some((item) => item.dedupe_key === dedupeKey && item.status === 'pending')) {
    return existing.find((item) => item.dedupe_key === dedupeKey && item.status === 'pending');
  }
  const mutation = {
    id: `mut_${Date.now()}_${randomPart()}`,
    type,
    schema_version: 1,
    base_version: Number(safePayload.base_version || safePayload.version || 0),
    local_seq: seq,
    payload: safePayload,
    client_id: identity.client_id,
    entity_type: entity.entity_type,
    entity_id: entity.entity_id,
    dedupe_key: dedupeKey,
    created_at: new Date().toISOString(),
    status: 'pending'
  };
  const next = [mutation].concat(existing).slice(0, 300);
  set(KEYS.syncQueue, next);
  saveSyncState({
    local_seq: seq,
    pending: next.filter((item) => item.status === 'pending').length,
    last_mutation_at: mutation.created_at
  });
  return mutation;
}

function markSyncAttempt(result = {}) {
  const ok = !!result.ok;
  const acknowledged = Array.isArray(result.acknowledged) ? result.acknowledged : [];
  const acknowledgedSet = new Set(acknowledged);
  const queue = loadSyncQueue();
  const now = new Date().toISOString();
  const next = ok
    ? queue.map((item) => (acknowledgedSet.has(item.id) || acknowledgedSet.has(item.mutation_id || '')
      ? Object.assign({}, item, { status: 'synced', synced_at: now })
      : item)).slice(0, 300)
    : queue;
  if (ok) set(KEYS.syncQueue, next);
  const lastState = loadSyncState();
  return saveSyncState({
    last_attempt_at: now,
    last_success_at: ok ? now : lastState.last_success_at,
    last_error: ok ? '' : (result.error || 'sync_not_available'),
    last_mode: result.mode || lastState.last_mode || '',
    pending: next.filter((item) => item.status === 'pending').length
  });
}

function syncDiagnostics() {
  const queue = loadSyncQueue();
  const state = loadSyncState();
  const byType = {};
  const byEntity = {};
  let pending = 0;
  let synced = 0;
  let failed = 0;
  queue.forEach((item) => {
    const status = item.status || 'pending';
    const type = item.type || 'unknown';
    const entityKey = `${item.entity_type || 'unknown'}:${item.entity_id || ''}`;
    if (!byType[type]) byType[type] = { type, pending: 0, synced: 0, failed: 0, total: 0 };
    byType[type].total += 1;
    byType[type][status] = Number(byType[type][status] || 0) + 1;
    if (!byEntity[entityKey]) byEntity[entityKey] = { entity: entityKey, pending: 0, total: 0 };
    byEntity[entityKey].total += 1;
    if (status === 'pending') {
      pending += 1;
      byEntity[entityKey].pending += 1;
    } else if (status === 'synced') {
      synced += 1;
    } else {
      failed += 1;
    }
  });
  const duplicates = queue.length - Object.keys(queue.reduce((map, item) => {
    map[item.dedupe_key || item.id] = true;
    return map;
  }, {})).length;
  const conflictedEntities = Object.keys(byEntity).filter((key) => byEntity[key].pending > 1);
  return {
    schemaVersion: 1,
    localSeq: Number(state.local_seq || 0),
    pending,
    synced,
    failed,
    duplicates,
    conflictedEntities,
    conflictSafe: duplicates === 0,
    lastSuccessAt: state.last_success_at || '',
    lastAttemptAt: state.last_attempt_at || '',
    lastError: state.last_error || '',
    byType: Object.keys(byType).map((key) => byType[key]).sort((a, b) => b.pending - a.pending || b.total - a.total),
    label: pending
      ? `Local queue has ${pending} pending mutations across ${Object.keys(byType).length} types.`
      : 'Local sync queue is clean.'
  };
}

function loadFocusCabinHistory() {
  const list = get('ydzx.focus.cabin.history.v1', []);
  return Array.isArray(list) ? list : [];
}

function buildLearningSyncSnapshot(reason = 'manual_snapshot') {
  const identity = loadClientIdentity();
  const todaySession = loadRawTodaySession() || getTodaySession();
  const reviewCards = loadReviewCards().slice(0, 40);
  const reviewEvents = loadReviewEvents().slice(0, 80);
  const tutorEvents = loadTutorEvents().slice(0, 80);
  const tutorMessages = get(KEYS.tutorMessages, []);
  const thinkingReceipts = loadThinkingReceipts ? loadThinkingReceipts().slice(0, 40) : [];
  const focusHistory = loadFocusCabinHistory().slice(0, 40);
  const gameProfile = loadGameProfile();
  return {
    version: 1,
    reason,
    identity,
    created_at: new Date().toISOString(),
    todaySession,
    reviewCards,
    reviewEvents,
    tutorEvents,
    tutorMessages: Array.isArray(tutorMessages) ? tutorMessages.slice(-20) : [],
    thinkingReceipts,
    focusHistory,
    gameProfile,
    syncDiagnostics: syncDiagnostics()
  };
}

function createLocalBackup(reason = 'manual_backup') {
  const snapshot = buildLearningSyncSnapshot(reason);
  const list = get(KEYS.localBackup, []);
  const next = [snapshot].concat(Array.isArray(list) ? list : []).slice(0, 3);
  set(KEYS.localBackup, next);
  return snapshot;
}

function queueLearningSyncSnapshot(reason = 'learning_state_snapshot') {
  const snapshot = buildLearningSyncSnapshot(reason);
  appendSyncMutation('learning_state_snapshot', {
    id: `learning_snapshot_${snapshot.todaySession && snapshot.todaySession.date ? snapshot.todaySession.date : localDateString()}`,
    reason,
    snapshot,
    created_at: snapshot.created_at
  });
  saveSyncState({
    enabled: true,
    last_snapshot_at: snapshot.created_at,
    ready_for_cloud: true
  });
  return snapshot;
}

function buildRecentLearningSummary(nowInput = new Date()) {
  const cards = loadReviewCards();
  const focusHistory = loadFocusCabinHistory();
  const todaySession = loadRawTodaySession() || getTodaySession({ now: nowInput });
  const byDate = {};
  cards.forEach((card) => {
    const date = String(card.date || card.created_at || '').slice(0, 10);
    if (!date) return;
    if (!byDate[date]) {
      byDate[date] = {
        date,
        firstSteps: 0,
        completedFocus: 0,
        interruptedFocus: 0,
        gamePlayed: 0,
        gameScoreTotal: 0,
        gameScoreCount: 0,
        steps: []
      };
    }
    if (card.childArticulatedStep) {
      byDate[date].firstSteps += 1;
      byDate[date].steps.push(card.childArticulatedStep);
    }
    if (card.focusCompletionType === 'completed' || card.focusCompletionType === 'manual_done') byDate[date].completedFocus += 1;
    if (card.focusCompletionType === 'interrupted') byDate[date].interruptedFocus += 1;
    if (Number(card.gameScore || 0) > 0) {
      byDate[date].gamePlayed += 1;
      byDate[date].gameScoreTotal += Number(card.gameScore || 0);
      byDate[date].gameScoreCount += 1;
    }
  });
  focusHistory.forEach((item) => {
    const date = String(item.completedAt || item.interruptedAt || item.startedAt || '').slice(0, 10);
    if (!date) return;
    if (!byDate[date]) byDate[date] = { date, firstSteps: 0, completedFocus: 0, interruptedFocus: 0, gamePlayed: 0, gameScoreTotal: 0, gameScoreCount: 0, steps: [] };
    if (item.completionType === 'completed' || item.completionType === 'manual_done') byDate[date].completedFocus += 1;
    if (item.completionType === 'interrupted') byDate[date].interruptedFocus += 1;
    if (item.linkedChildArticulatedStep) byDate[date].steps.push(item.linkedChildArticulatedStep);
  });
  if (todaySession && todaySession.date) {
    if (!byDate[todaySession.date]) byDate[todaySession.date] = { date: todaySession.date, firstSteps: 0, completedFocus: 0, interruptedFocus: 0, gamePlayed: 0, gameScoreTotal: 0, gameScoreCount: 0, steps: [] };
    if (todaySession.childArticulatedStep) {
      byDate[todaySession.date].firstSteps += 1;
      byDate[todaySession.date].steps.push(todaySession.childArticulatedStep);
    }
    if (todaySession.gamePlayed) {
      byDate[todaySession.date].gamePlayed += 1;
      byDate[todaySession.date].gameScoreTotal += Number((todaySession.gameEvidence && todaySession.gameEvidence.score) || 0);
      byDate[todaySession.date].gameScoreCount += 1;
    }
  }
  const days = Object.keys(byDate).sort().reverse().map((date) => {
    const item = byDate[date];
    return Object.assign({}, item, {
      representativeStep: item.steps[0] || '',
      gameAvg: item.gameScoreCount ? Math.round(item.gameScoreTotal / item.gameScoreCount) : 0
    });
  });
  const latest3 = days.slice(0, 3);
  const latest7 = days.slice(0, 7);
  const firstStepDays = latest7.filter((item) => item.firstSteps > 0).length;
  const focusDays = latest7.filter((item) => item.completedFocus > 0 || item.interruptedFocus > 0).length;
  const gameDays = latest7.filter((item) => item.gamePlayed > 0).length;
  return {
    days,
    latest3,
    latest7,
    threeNightText: latest3.length >= 3
      ? `最近 3 晚有 ${latest3.filter((item) => item.firstSteps > 0).length} 晚说出了第一步，${latest3.filter((item) => item.completedFocus > 0).length} 晚完成了专注。`
      : '再用两晚后，咕点会帮你看见模式。',
    sevenNightText: latest7.length >= 7
      ? `最近 7 晚有 ${firstStepDays} 晚确认第一步、${focusDays} 晚留下专注记录、${gameDays} 晚做了轻练。`
      : '用满 7 晚后，咕点再整理一条更稳的复盘线索。',
    firstStepDays,
    focusDays,
    gameDays
  };
}

function buildProductReadiness(options = {}) {
  if (!productReadiness || !productReadiness.buildProductReadiness) {
    return {
      version: 1,
      generatedAt: new Date().toISOString(),
      score: 0,
      verdict: 'unavailable',
      friendTrialReady: false,
      commercialCodeReady: false,
      launchBlockedByExternalConfig: true,
      dimensions: [],
      workflow: [],
      gaps: [{ id: 'readiness_engine', label: 'readiness engine', fix: 'Product readiness evaluator is unavailable.' }],
      externalBlockers: []
    };
  }
  return productReadiness.buildProductReadiness(module.exports, options);
}

function buildAcceptanceReport(options = {}) {
  const readiness = buildProductReadiness(options);
  if (!productReadiness || !productReadiness.buildAcceptanceReport) {
    return {
      version: 1,
      generatedAt: new Date().toISOString(),
      overallConclusion: 'fail',
      localReadinessScore: readiness.score || 0,
      friendTrialReady: false,
      commercialCodeReady: false,
      launchBlockedByExternalConfig: true,
      competitiveGapSummary: [],
      functionalityChecklist: [],
      storyLoop: [],
      workflowBreakpoints: [],
      technicalBreakpoints: [],
      friendTrialRisk: [{ risk: 'high', scenario: 'acceptance report unavailable', description: 'readiness report generator is unavailable', mitigation: 'restore product-readiness module' }],
      fixPriorityQueue: [{ priority: 'P0', owner: 'code', id: 'acceptance_report', action: 'restore product readiness acceptance report generator' }],
      finalRecommendation: 'fix_local_p0_before_friend_trial'
    };
  }
  return productReadiness.buildAcceptanceReport(readiness, options);
}

function loadReviewLoop() {
  return get(KEYS.reviewLoop, {
    lives: 5,
    max_lives: 5,
    streak_freeze: 1,
    current_streak: 0,
    longest_streak: 0,
    bonus_xp: 0,
    claimed_rewards: {},
    last_review_day: '',
    last_life_refill_day: '',
    leaderboard: [],
    updated_at: ''
  });
}

function claimReviewReward(reward = {}) {
  const id = reward.id || '';
  if (!id) return { claimed: false, reason: 'missing_reward_id', loop: loadReviewLoop() };
  const current = loadReviewLoop();
  const claimed = current.claimed_rewards || {};
  if (claimed[id]) return { claimed: false, reason: 'already_claimed', loop: current };
  const maxLives = Math.max(1, Number(current.max_lives || 5));
  const xp = Number(reward.xp || reward.rewardXp || 0);
  const lives = Math.max(0, Math.min(maxLives, Number(current.lives || maxLives) + Number(reward.lives || 0)));
  const next = saveReviewLoop(Object.assign({}, current, {
    lives,
    bonus_xp: Number(current.bonus_xp || 0) + Math.max(0, xp),
    streak_freeze: Number(current.streak_freeze || 0) + Number(reward.streakFreeze || 0),
    claimed_rewards: Object.assign({}, claimed, {
      [id]: Object.assign({}, reward, {
        claimed_at: new Date().toISOString()
      })
    })
  }));
  appendSyncMutation('review_reward_claimed', {
    reward_id: id,
    xp,
    lives: Number(reward.lives || 0),
    streakFreeze: Number(reward.streakFreeze || 0)
  });
  return { claimed: true, loop: next };
}

function saveReviewLoop(loop) {
  return set(KEYS.reviewLoop, Object.assign({}, loop || {}, {
    updated_at: new Date().toISOString()
  }));
}

function updateReviewLoopForRating(rating, streak = 0) {
  const today = new Date().toISOString().slice(0, 10);
  const current = loadReviewLoop();
  const maxLives = Math.max(1, Number(current.max_lives || 5));
  const refill = current.last_life_refill_day === today ? Number(current.lives || maxLives) : maxLives;
  const lost = rating === 'again' ? 1 : 0;
  const gained = rating === 'easy' ? 1 : 0;
  const lives = Math.max(0, Math.min(maxLives, refill - lost + gained));
  const lastDay = current.last_review_day || '';
  const gapDays = lastDay ? Math.floor((new Date(`${today}T00:00:00Z`).getTime() - new Date(`${lastDay}T00:00:00Z`).getTime()) / (24 * 60 * 60 * 1000)) : 0;
  const missedDays = Math.max(0, gapDays - 1);
  const freeze = Math.max(0, Number(current.streak_freeze || 0));
  const freezeUsed = missedDays ? Math.min(freeze, missedDays) : 0;
  const protectedGap = missedDays > 0 && freezeUsed >= missedDays;
  const baseStreak = Number(current.current_streak || streak || 0);
  const currentStreak = !lastDay
    ? 1
    : lastDay === today
      ? Math.max(1, baseStreak, Number(streak || 0))
      : gapDays <= 1 || protectedGap
        ? Math.max(1, baseStreak + 1)
        : 1;
  return saveReviewLoop(Object.assign({}, current, {
    lives,
    max_lives: maxLives,
    current_streak: currentStreak,
    streak_freeze: Math.max(0, freeze - freezeUsed),
    last_freeze_used_at: freezeUsed ? new Date().toISOString() : current.last_freeze_used_at,
    longest_streak: Math.max(Number(current.longest_streak || 0), currentStreak, Number(streak || 0)),
    last_review_day: today,
    last_life_refill_day: today
  }));
}

function localLeaderboardSnapshot(profile = {}, progress = {}) {
  const loop = loadReviewLoop();
  const name = profile.name || 'Local learner';
  const self = {
    rank: 1,
    name,
    xp: Number(progress.xp || 0),
    streak: Number(progress.streak || 0),
    isSelf: true
  };
  const peers = Array.isArray(loop.leaderboard) ? loop.leaderboard : [];
  return [self].concat(peers).sort((a, b) => Number(b.xp || 0) - Number(a.xp || 0)).slice(0, 8)
    .map((item, index) => Object.assign({}, item, { rank: index + 1 }));
}

function rcNowIso() {
  return new Date().toISOString();
}

function rcTodayKey() {
  return rcNowIso().slice(0, 10);
}

function loadUserFirstStepProfile() {
  const profile = get(KEYS.firstStepProfile, { version: 1, events: [], qualityTimeline: [] });
  return Object.assign({ version: 1, events: [], qualityTimeline: [] }, profile || {});
}

function saveUserFirstStepProfile(profile = {}) {
  const next = Object.assign({ version: 1, events: [], qualityTimeline: [] }, profile || {}, {
    updatedAt: rcNowIso()
  });
  next.events = Array.isArray(next.events) ? next.events.slice(0, 240) : [];
  next.qualityTimeline = Array.isArray(next.qualityTimeline) ? next.qualityTimeline.slice(0, 240) : [];
  return set(KEYS.firstStepProfile, next);
}

function loadTaskTypePattern() {
  const pattern = get(KEYS.taskTypePattern, { version: 1, byTaskType: {}, latestIntervention: null });
  return Object.assign({ version: 1, byTaskType: {}, latestIntervention: null }, pattern || {});
}

function saveTaskTypePattern(pattern = {}) {
  return set(KEYS.taskTypePattern, Object.assign({ version: 1, byTaskType: {}, latestIntervention: null }, pattern || {}, {
    updatedAt: rcNowIso()
  }));
}

function taskTypeLabel(type) {
  return {
    math_word_problem: '数学应用题',
    equation_setup: '列方程',
    reading_question: '阅读题',
    english_sentence: '英语句子',
    physics_diagram: '物理图解',
    chemistry_experiment: '化学实验',
    biology_process: '生物过程',
    geography_map: '地理读图',
    writing_process: '写作',
    dictation: '听写',
    daily_math: '口算',
    light_diagnosis: '手动选题型',
    unknown: '当前题型'
  }[type] || '当前题型';
}

function deepScaffoldingTemplates(type = 'unknown') {
  const map = {
    math_word_problem: ['先把题干里的已知条件圈出来。', '现在把两个条件连起来，问一句：它们有什么关系？', '最后再想：这个关系能不能写成一个式子？'],
    equation_setup: ['先把未知数写成 x。', '再找一句能表示相等关系的话。', '最后把两边分别写出来，不急着算。'],
    reading_question: ['先看题目问的是细节、主旨还是原因。', '再回到对应段落，找到题目里重复或相近的词。', '最后用自己的话说出这一句为什么相关。'],
    english_sentence: ['先找主语和谓语。', '再看动作发生在什么时候。', '最后看句子里有没有固定结构或连接词。'],
    physics_diagram: ['先定研究对象。', '再画第一根方向、力或状态标记。', '最后说这一笔对应哪条规律。'],
    chemistry_experiment: ['先列反应前后物质。', '再说看到的现象来自哪里。', '最后检查守恒或实验条件。'],
    biology_process: ['先找结构。', '再说结构对应的功能。', '最后把过程排成三步。'],
    geography_map: ['先看方向和图例。', '再定位区域特征。', '最后说第一条原因链。'],
    writing_process: ['先写一句最简单的开头。', '再补一个具体例子或画面。', '最后检查这一段是不是围绕同一个意思。'],
    dictation: ['先听清第一个词。', '再确认你先看的是拼音、字形还是意思。', '最后把不确定的那一笔圈出来。'],
    daily_math: ['先看清符号。', '再看有没有进位或退位。', '最后只检查这一步，不急着重做整题。'],
    light_diagnosis: ['先判断这道题像哪一类。', '再圈出题目真正问的内容。', '最后只写准备开始的第一步。'],
    unknown: ['先说清楚题目问什么。', '再找一个能下手的位置。', '最后把这一步写成一句话。']
  };
  return (map[type] || map.unknown).slice();
}

function buildSecondStepHint(type = 'unknown', firstStep = '') {
  const steps = deepScaffoldingTemplates(type);
  return {
    taskType: type,
    firstStep: firstStep || steps[0],
    secondStep: steps[1],
    thirdStep: steps[2],
    boundary: '这不是答案，是下一小步提示。'
  };
}

function updateTaskTypePatternForEvent(event = {}) {
  const type = event.taskType || 'unknown';
  const pattern = loadTaskTypePattern();
  const byTaskType = Object.assign({}, pattern.byTaskType || {});
  const current = Object.assign({
    taskType: type,
    total: 0,
    firstStepQualityCounts: { empty: 0, vague: 0, partial: 0, actionable: 0 },
    secondStepIndependentCount: 0,
    recentQualities: [],
    recentFirstSteps: []
  }, byTaskType[type] || {});
  const quality = event.childStepQuality || childStepQuality(event.childArticulatedStep || event.childStepSentence || event.firstStepText || '');
  current.total += 1;
  current.firstStepQualityCounts[quality] = Number(current.firstStepQualityCounts[quality] || 0) + 1;
  if (event.secondStepStatus === 'independent') current.secondStepIndependentCount += 1;
  current.recentQualities = [quality].concat(current.recentQualities || []).slice(0, 7);
  current.recentFirstSteps = [event.childArticulatedStep || event.childStepSentence || event.firstStepText || ''].concat(current.recentFirstSteps || []).filter(Boolean).slice(0, 7);
  current.updatedAt = rcNowIso();
  byTaskType[type] = current;
  const next = Object.assign({}, pattern, { byTaskType });
  const intervention = detectAvoidancePattern(next);
  if (intervention.triggered) next.latestIntervention = intervention;
  return saveTaskTypePattern(next);
}

function recordFirstStepEvent(event = {}) {
  const taskType = event.taskType || detectTaskType(event.stuckPointText || event.prompt || event.sourceText || '', event.feature || '');
  const sentence = event.childArticulatedStep || event.childStepSentence || event.firstStepText || '';
  const quality = event.childStepQuality || childStepQuality(sentence);
  const normalized = {
    id: event.id || `first_step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    day: event.day || rcTodayKey(),
    source: event.source || event.feature || 'first_step',
    taskType,
    stuckPointText: event.stuckPointText || event.prompt || '',
    systemSuggestedStep: event.systemSuggestedStep || suggestedStepForTaskType(taskType),
    childArticulatedStep: sentence,
    childStepSentence: sentence,
    childStepQuality: quality,
    secondStepStatus: event.secondStepStatus || '',
    createdAt: event.createdAt || rcNowIso()
  };
  const profile = loadUserFirstStepProfile();
  saveUserFirstStepProfile(Object.assign({}, profile, {
    events: [normalized].concat(profile.events || []).slice(0, 240),
    qualityTimeline: [{
      day: normalized.day,
      taskType,
      quality,
      source: normalized.source
    }].concat(profile.qualityTimeline || []).slice(0, 240)
  }));
  updateTaskTypePatternForEvent(normalized);
  if (quality === 'partial' || quality === 'actionable') recordLocalAnalytics('first_step_confirmed', { source: normalized.source, quality });
  return normalized;
}

function recordLightFeatureFirstStep(feature, payload = {}) {
  const taskType = payload.taskType || (feature === 'daily_math' ? 'daily_math' : feature === 'dictation' ? 'dictation' : feature === 'light_diagnosis' ? 'light_diagnosis' : 'unknown');
  const event = recordFirstStepEvent(Object.assign({}, payload, { source: feature, feature, taskType }));
  const events = get(KEYS.lightFeatureEvents, []);
  set(KEYS.lightFeatureEvents, [Object.assign({}, event, { feature })].concat(Array.isArray(events) ? events : []).slice(0, 240));
  return event;
}

function loadLightFeatureEvents() {
  const events = get(KEYS.lightFeatureEvents, []);
  return Array.isArray(events) ? events : [];
}

function buildLightFeatureEvidenceSummary(options = {}) {
  const events = loadLightFeatureEvents();
  const labels = {
    daily_math: '口算',
    dictation: '听写',
    light_diagnosis: '手动选题'
  };
  const byFeature = events.reduce((acc, event) => {
    const feature = event && event.feature ? event.feature : 'unknown';
    if (!acc[feature]) {
      acc[feature] = {
        id: feature,
        label: labels[feature] || taskTypeLabel(event && event.taskType) || '轻入口',
        count: 0,
        actionable: 0,
        latestStep: '',
        latestStuckPoint: '',
        latestAt: ''
      };
    }
    acc[feature].count += 1;
    if (event && (event.childStepQuality === 'actionable' || event.childStepQuality === 'partial')) {
      acc[feature].actionable += 1;
    }
    if (!acc[feature].latestAt || String(event && event.createdAt || '') > acc[feature].latestAt) {
      acc[feature].latestAt = event && event.createdAt || '';
      acc[feature].latestStep = event && (event.childArticulatedStep || event.systemSuggestedStep) || '';
      acc[feature].latestStuckPoint = event && event.stuckPointText || '';
    }
    return acc;
  }, {});
  const cards = Object.keys(byFeature).map((key) => byFeature[key])
    .sort((a, b) => b.count - a.count || String(b.latestAt).localeCompare(String(a.latestAt)));
  const total = events.length;
  const actionable = events.filter((event) => event && (event.childStepQuality === 'actionable' || event.childStepQuality === 'partial')).length;
  const top = cards[0] || null;
  const latest = events.slice().sort((a, b) => String(b && b.createdAt || '').localeCompare(String(a && a.createdAt || '')))[0] || null;
  return {
    title: '轻入口证据',
    ready: total > 0,
    total,
    actionable,
    featureCount: cards.length,
    cards,
    latest,
    summary: total
      ? `轻入口已留下 ${total} 条第一步记录，${actionable} 条能直接回到核心学习链路。`
      : '口算、听写和手动选题还没有留下第一步记录。',
    parentLine: top
      ? `${top.label}最近留下的第一步：${top.latestStep || top.latestStuckPoint || '先确认从哪里开始'}`
      : '先从口算、听写或手动选题里留下一条第一步。',
    nextAction: total
      ? '把最近一条轻入口记录带回修卡点或专注舱。'
      : '先完成一次口算、听写或手动选题。',
    route: top && top.id === 'dictation'
      ? '/pages/dictation/dictation'
      : top && top.id === 'light_diagnosis'
        ? '/pages/light-diagnosis/light-diagnosis'
        : '/pages/daily-math/daily-math',
    generatedAt: options.now ? new Date(options.now).toISOString() : rcNowIso()
  };
}

const LIGHT_ENTRY_SEED_BANK = {
  daily_math: {
    label: '口算',
    route: '/pages/daily-math/daily-math',
    taskSeeds: [
      { id: 'symbol_scan', label: '符号先看清', taskType: 'daily_math', wrongCause: '漏看符号', firstStep: '先圈加减乘除符号。' },
      { id: 'carry_check', label: '进退位检查', taskType: 'daily_math', wrongCause: '进退位漏掉', firstStep: '先标出需要进位或退位的位置。' },
      { id: 'estimate_guard', label: '估算护栏', taskType: 'daily_math', wrongCause: '结果量级不对', firstStep: '先估一个大概范围。' },
      { id: 'unit_place', label: '位值对齐', taskType: 'daily_math', wrongCause: '数位没对齐', firstStep: '先把个位、十位、小数点对齐。' },
      { id: 'reverse_check', label: '反向验算', taskType: 'daily_math', wrongCause: '算完不检查', firstStep: '先用反向运算验一遍。' }
    ]
  },
  dictation: {
    label: '听写',
    route: '/pages/dictation/dictation',
    taskSeeds: [
      { id: 'sound_shape', label: '音形对应', taskType: 'dictation', wrongCause: '听到音但字形不稳', firstStep: '先说这个词最容易错的那一笔。' },
      { id: 'meaning_anchor', label: '意思锚点', taskType: 'dictation', wrongCause: '词义不清', firstStep: '先用这个词说一句短句。' },
      { id: 'repeat_rhythm', label: '复听节奏', taskType: 'dictation', wrongCause: '听一次就下笔', firstStep: '先听两遍，再写第一个字。' },
      { id: 'shape_part', label: '部件拆字', taskType: 'dictation', wrongCause: '偏旁部件混淆', firstStep: '先把这个字拆成偏旁和剩下部分。' },
      { id: 'sentence_memory', label: '句中记忆', taskType: 'dictation', wrongCause: '孤立背词不稳', firstStep: '先把词放进一句自己能说的话。' }
    ]
  },
  light_diagnosis: {
    label: '手动选题',
    route: '/pages/light-diagnosis/light-diagnosis',
    taskSeeds: [
      { id: 'type_confirm', label: '先判题型', taskType: 'unknown', wrongCause: '题型没确认', firstStep: '先说这题像哪一类。' },
      { id: 'ask_sentence', label: '问题句定位', taskType: 'math_word_problem', wrongCause: '没看清问什么', firstStep: '先圈题目真正问的句子。' },
      { id: 'start_position', label: '下手位置', taskType: 'unknown', wrongCause: '第一步太大', firstStep: '先写一个能马上做的小动作。' },
      { id: 'known_unknown', label: '已知未知', taskType: 'equation_setup', wrongCause: '未知量没设清', firstStep: '先写清谁是未知数。' },
      { id: 'evidence_sentence', label: '证据句', taskType: 'reading_question', wrongCause: '回答没有依据', firstStep: '先找一句能支撑回答的原文。' }
    ]
  }
};

function buildLightEntrySeedBank(feature = 'daily_math', options = {}) {
  const bank = LIGHT_ENTRY_SEED_BANK[feature] || LIGHT_ENTRY_SEED_BANK.light_diagnosis;
  const events = loadLightFeatureEvents().filter((event) => !feature || event.feature === feature);
  const latest = events[0] || null;
  const seeds = bank.taskSeeds.map((seed, index) => {
    const depth = buildSubjectSkillDepth({
      taskType: seed.taskType,
      sourceText: seed.wrongCause,
      firstStep: seed.firstStep
    });
    return {
      id: `${feature}_${seed.id}`,
      order: index + 1,
      label: seed.label,
      taskType: seed.taskType,
      wrongCause: seed.wrongCause,
      firstStep: seed.firstStep,
      parentQuestion: depth.parentQuestion,
      evidenceRequired: depth.evidenceRequired,
      modelLine: `${taskTypeLabel(seed.taskType)} · ${seed.wrongCause}`,
      blackboardLine: `${bank.label}小黑板：${seed.label} -> ${seed.firstStep}`,
      evidenceLine: `留下 ${depth.evidenceRequired.slice(0, 2).join(' / ')} 证据`,
      loopLine: `完成后回到${feature === 'dictation' ? '听写回访' : feature === 'daily_math' ? '口算轻练' : '修卡点'}，再给家长看一句第一步。`,
      route: bank.route
    };
  });
  return {
    id: `light_seed_${feature}`,
    feature,
    label: bank.label,
    title: `${bank.label}题型种子`,
    summary: latest
      ? `最近记录会优先回到「${latest.childArticulatedStep || latest.systemSuggestedStep || latest.stuckPointText || bank.label}」。`
      : `先从 ${seeds.length} 个可复用小题型里选一个，留下第一步证据。`,
    seeds,
    reusableCount: seeds.length,
    modelLine: `${bank.label}已沉淀 ${seeds.length} 条题型 / 错因 / 第一动作模型。`,
    evidenceLine: '每条种子都会进入题型评测、错因卡、轻练习和家长复盘。',
    routeLine: `回流路线：${bank.label} -> 第一手证据 -> 修卡点 / 轻练习 -> 家长行动板。`,
    latestEvidence: latest,
    route: bank.route,
    nextAction: latest ? '带着最近第一步回到修卡点' : '先完成一条轻入口第一步'
  };
}

function buildSubjectSeedLibrary(options = {}) {
  const subjectIds = ['math', 'chinese', 'english', 'physics', 'chemistry', 'biology', 'geography'];
  const tiers = ['入门', '核心', '迁移'];
  const gradeBands = ['小学高段', '小初衔接', '初中'];
  const subjects = subjectIds.map((subjectId) => {
    const curriculum = CURRICULUM_SPINE[subjectId] || CURRICULUM_SPINE.math;
    const taskType = taskTypeForSubject(subjectId) || 'unknown';
    const depth = buildSubjectSkillDepth({
      taskType,
      subject: curriculum.label,
      firstStep: suggestedStepForTaskType(taskType),
      sourceText: `${curriculum.label} 七科第一步种子`
    });
    const seeds = curriculum.nodes.map((node, index) => {
      const firstStep = index === 0 ? depth.firstStep : `先处理「${node.label}」：${node.evidence}`;
      const wrongCause = index === 0 ? '不知道从哪里下手' : `${node.label}证据不足`;
      const evidenceRequired = index === 0 ? depth.evidenceRequired : [node.id, 'child_first_step', 'next_day_revisit'];
      const tier = tiers[index] || '迁移';
      const gradeBand = gradeBands[index] || '初中';
      return {
        id: `${subjectId}_${node.id}`,
        order: index + 1,
        tier,
        gradeBand,
        subjectId,
        subjectLabel: curriculum.label,
        label: node.label,
        taskType,
        firstStep,
        wrongCause,
        wrongCauseModel: `${curriculum.label}/${node.label}：先判是不是「${wrongCause}」，再只补一个可观察动作。`,
        parentQuestion: index === 0 ? depth.parentQuestion : `你能先说清「${node.label}」这一小步吗？`,
        parentCheckLine: `家长只检查：孩子是否能说出「${firstStep}」，不替孩子讲完整答案。`,
        evidenceRequired,
        evidenceContractLine: `证据契约：留下 ${evidenceRequired.slice(0, 2).join(' + ')}，明天回访同类一题。`,
        visualPrompt: `${curriculum.label}可视化：画出「${node.label}」和「${node.evidence}」的关系，不画最终答案。`,
        boardMove: `小黑板动作：先写「${node.label}」，旁边标一条证据「${node.evidence}」。`,
        blackboardLine: `${curriculum.label}小黑板：${node.label} -> ${node.evidence}`,
        transferPrompt: `迁移题：换一道同类题，仍然先做「${firstStep}」。`,
        recallPrompt: `主动回忆：合上题目，说出这张卡的错因和第一步。`,
        loopLine: `流转闭环：轻诊断 -> ${curriculum.route} -> 复习回访 -> 家长复盘。`,
        recallRoute: '/pages/review/review',
        gameRoute: '/pages/arcade/arcade',
        route: curriculum.route
      };
    });
    return {
      id: subjectId,
      label: curriculum.label,
      taskType,
      route: curriculum.route,
      depthLine: depth.reportSignal,
      visualBoundary: '只做第一步小黑板，不做全科自动板书讲题。',
      progressionLine: `${curriculum.label}按「入门-核心-迁移」三层沉淀，不追求大而全。`,
      seeds
    };
  });
  const activeSubject = options.subject ? String(options.subject) : '';
  const active = subjects.find((item) => item.id === activeSubject || item.label === activeSubject) || subjects[0];
  return {
    id: 'subject_seed_library',
    title: '七科第一步种子库',
    summary: '每科沉淀题型、错因模型、第一步小黑板、迁移题、回忆路线、家长检查和证据契约，不承诺自动给完整答案。',
    subjects,
    active,
    subjectCount: subjects.length,
    seedCount: subjects.reduce((sum, item) => sum + item.seeds.length, 0),
    nextAction: active ? `先选 ${active.label} 的一张第一步种子` : '先选一张第一步种子',
    generatedAt: options.now ? new Date(options.now).toISOString() : rcNowIso()
  };
}

function buildCourseUnitMap(options = {}) {
  const subjectLibrary = options.subjectSeedLibrary || buildSubjectSeedLibrary(options);
  const activeSubject = options.subject ? String(options.subject) : '';
  const subjects = (subjectLibrary.subjects || []).map((subject) => {
    const units = (subject.seeds || []).map((seed, index) => ({
      id: `${subject.id}_unit_${seed.id}`,
      order: index + 1,
      subjectId: subject.id,
      subjectLabel: subject.label,
      unitLabel: seed.label,
      tier: seed.tier,
      gradeBand: seed.gradeBand,
      taskType: seed.taskType,
      reusableQuestionTypes: [
        `${seed.label}第一步判断`,
        `${seed.label}错因复述`,
        `${seed.label}同类小变式`
      ],
      wrongCauseAtlas: [
        seed.wrongCause,
        `${seed.label}证据不足`,
        '会做一次但隔天不能复述'
      ],
      diagnosticProbes: [
        seed.parentQuestion,
        `这题先看「${seed.label}」还是先算答案？`,
        `换一道题时，第一步还会是「${seed.firstStep}」吗？`
      ],
      blackboardBlueprint: {
        title: `${subject.label} · ${seed.label}小黑板`,
        firstStroke: seed.boardMove,
        visualPrompt: seed.visualPrompt,
        stopRule: '只画第一笔和证据点，孩子能说出第一步就停。'
      },
      practiceLoop: {
        recall: seed.recallPrompt,
        repair: seed.wrongCauseModel,
        transfer: seed.transferPrompt,
        nextDay: '明天只回访 1 道同类小变式。'
      },
      reportContract: `${subject.label}/${seed.label}进入报告时，只写第一步证据、错因和下一次回访，不写分数排名。`,
      parentAction: seed.parentCheckLine,
      shareContract: `分享只带「${seed.label}」第一步和回访动作，不带完整答案。`,
      evidenceRequired: seed.evidenceRequired || [],
      route: seed.route,
      recallRoute: seed.recallRoute,
      gameRoute: seed.gameRoute
    }));
    return {
      id: subject.id,
      label: subject.label,
      route: subject.route,
      visualBoundary: subject.visualBoundary,
      unitCount: units.length,
      modelLine: `${subject.label}已沉淀 ${units.length} 个课程单元，每个单元都有题型、错因、小黑板、游戏回流和报告口径。`,
      units
    };
  });
  const active = subjects.find((item) => item.id === activeSubject || item.label === activeSubject)
    || (subjectLibrary.active && subjects.find((item) => item.id === subjectLibrary.active.id))
    || subjects[0];
  const totalUnits = subjects.reduce((sum, subject) => sum + subject.unitCount, 0);
  const totalQuestionTypes = subjects.reduce((sum, subject) => sum + subject.units.reduce((unitSum, unit) => unitSum + unit.reusableQuestionTypes.length, 0), 0);
  return {
    id: 'course_unit_map',
    title: '七科课程单元地图',
    summary: '把每科第一步种子升级为课程单元：题型、错因、小黑板、练习回流、报告和家长动作都能复用。',
    boundary: '这是课程能力地图，不承诺拍题自动板书讲完整答案。',
    subjects,
    active,
    subjectCount: subjects.length,
    unitCount: totalUnits,
    reusableQuestionTypeCount: totalQuestionTypes,
    wrongCauseModelCount: totalUnits * 3,
    reportLine: `当前课程地图覆盖 ${subjects.length} 科、${totalUnits} 个单元、${totalQuestionTypes} 条可复用题型动作。`,
    parentLine: active ? `今晚家长只看 ${active.label} 的一个单元：孩子能不能说第一步、错因和明天回访。` : '',
    gameLine: '游戏只奖励主动回忆和错因回退，不奖励刷题数量。',
    generatedAt: options.now ? new Date(options.now).toISOString() : rcNowIso()
  };
}

function buildCourseUnitMasteryTrajectory(options = {}) {
  const courseUnitMap = options.courseUnitMap || buildCourseUnitMap(options);
  const active = courseUnitMap && courseUnitMap.active ? courseUnitMap.active : null;
  const reviewCards = loadReviewCards();
  const thinkingReceipts = loadThinkingReceipts();
  const gameProfile = loadGameProfile();
  const parentReflection = buildParentReflectionSummary();
  const reviewedToday = Number(gameProfile.reviewed_today || gameProfile.reviewedToday || 0);
  const totalEvidence = reviewCards.length + thinkingReceipts.length + reviewedToday + Number(parentReflection.childRecalledFirstStep || 0);
  const subjectEvidence = active
    ? reviewCards.filter((card) => {
      const text = `${card.subject || ''} ${card.stuckPointText || ''} ${card.prompt || ''} ${card.taskType || ''}`;
      return text.indexOf(active.id) >= 0 || text.indexOf(active.label) >= 0;
    }).length
    : 0;
  const units = active && Array.isArray(active.units) ? active.units : [];
  const trajectories = units.map((unit, index) => {
    const evidenceCount = subjectEvidence + Math.max(0, totalEvidence - index);
    const masteryScore = Math.max(12, Math.min(96, 28 + evidenceCount * 7 + reviewedToday * 3 - index * 4));
    const regressionRisk = masteryScore >= 75 ? '低' : masteryScore >= 52 ? '中' : '高';
    const parentInterventionLevel = regressionRisk === '高' ? '陪问一句' : regressionRisk === '中' ? '明天复核' : '只看证据';
    const nextEvidence = masteryScore >= 75
      ? unit.practiceLoop.transfer
      : masteryScore >= 52
        ? unit.practiceLoop.nextDay
        : unit.diagnosticProbes[0];
    return {
      id: unit.id,
      unitLabel: unit.unitLabel,
      subjectLabel: unit.subjectLabel,
      masteryScore,
      masteryLine: `${unit.subjectLabel}/${unit.unitLabel} 当前掌握度 ${masteryScore}，风险 ${regressionRisk}。`,
      regressionRisk,
      parentInterventionLevel,
      nextEvidence,
      evidenceContract: unit.reportContract,
      route: unit.recallRoute || unit.route || '/pages/review/review'
    };
  });
  const weakest = trajectories.slice().sort((a, b) => a.masteryScore - b.masteryScore)[0] || null;
  const strongest = trajectories.slice().sort((a, b) => b.masteryScore - a.masteryScore)[0] || null;
  return {
    id: 'course_unit_mastery_trajectory',
    title: '单元级长期画像轨迹',
    subjectLabel: active ? active.label : '',
    ready: trajectories.length > 0,
    evidenceCount: totalEvidence,
    summary: weakest
      ? `先看 ${weakest.unitLabel}：${weakest.parentInterventionLevel}，下一证据是「${weakest.nextEvidence}」。`
      : '先选择一个课程单元，再沉淀第一步、错因和回访证据。',
    weakest,
    strongest,
    trajectories,
    parentLine: weakest
      ? `家长今晚只管 ${weakest.unitLabel}：${weakest.parentInterventionLevel}，不扩到整科刷题。`
      : '',
    reportLine: `报告按单元跟踪掌握度、回退风险、下一证据和家长介入等级，不做排名。`
  };
}

function detectAvoidancePattern(patternInput = loadTaskTypePattern()) {
  const byTaskType = (patternInput && patternInput.byTaskType) || {};
  const candidates = Object.keys(byTaskType).map((type) => {
    const item = byTaskType[type] || {};
    const avoidCount = (item.recentQualities || []).slice(0, 3).filter((quality) => quality === 'empty' || quality === 'vague').length;
    return { type, avoidCount };
  }).filter((candidate) => candidate.avoidCount >= 3);
  if (!candidates.length) return { triggered: false, reason: 'insufficient_pattern' };
  const selected = candidates.sort((a, b) => b.avoidCount - a.avoidCount)[0];
  return {
    triggered: true,
    taskType: selected.type,
    title: `${taskTypeLabel(selected.type)}第一步微训练`,
    prompt: `连续几次都停在“不会/先看题”，今天只做 3 分钟：先把${taskTypeLabel(selected.type)}的第一步说成一句话。`,
    durationMinutes: 3,
    createdAt: rcNowIso()
  };
}

function loadParentInterventionLog() {
  const list = get(KEYS.parentInterventionLog, []);
  return Array.isArray(list) ? list : [];
}

function appendParentInterventionLog(input = {}) {
  const item = {
    id: input.id || `parent_intervention_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    day: input.day || rcTodayKey(),
    usedProductPhrase: !!input.usedProductPhrase,
    gaveDirectAnswer: !!input.gaveDirectAnswer,
    parentAskedOneQuestion: !!input.parentAskedOneQuestion,
    childRecalledFirstStep: !!input.childRecalledFirstStep,
    nextDayRevisit: !!input.nextDayRevisit,
    reflectionResult: input.reflectionResult || '',
    emotionLevel: Math.max(1, Math.min(5, Number(input.emotionLevel || 3))),
    phrase: input.phrase || '你第一步先看了哪里？',
    source: input.source || 'parent_pause',
    createdAt: input.createdAt || rcNowIso()
  };
  set(KEYS.parentInterventionLog, [item].concat(loadParentInterventionLog()).slice(0, 180));
  return item;
}

function loadScaffoldingChains() {
  const chains = get(KEYS.scaffoldingChains, []);
  return Array.isArray(chains) ? chains : [];
}

function saveScaffoldingChains(chains = []) {
  return set(KEYS.scaffoldingChains, Array.isArray(chains) ? chains.slice(0, 180) : []);
}

function createScaffoldingChain(input = {}) {
  const taskType = input.taskType || detectTaskType(input.stuckPointText || '', input.subject || '');
  const firstStep = input.firstStep || input.childArticulatedStep || suggestedStepForTaskType(taskType);
  const hint = buildSecondStepHint(taskType, firstStep);
  const chain = {
    id: input.id || `chain_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    taskType,
    stuckPointText: input.stuckPointText || '',
    firstStepSuggestion: input.systemSuggestedStep || hint.firstStep,
    firstStepChild: input.childArticulatedStep || '',
    secondStepSuggestion: input.secondStepSuggestion || hint.secondStep,
    thirdStepSuggestion: input.thirdStepSuggestion || hint.thirdStep,
    steps: [
      { order: 1, type: 'suggestion', text: input.systemSuggestedStep || hint.firstStep },
      { order: 1, type: 'child_action', text: input.childArticulatedStep || '' },
      { order: 2, type: 'suggestion', text: input.secondStepSuggestion || hint.secondStep }
    ],
    createdAt: rcNowIso(),
    updatedAt: rcNowIso()
  };
  saveScaffoldingChains([chain].concat(loadScaffoldingChains()).slice(0, 180));
  return chain;
}

function appendScaffoldingStep(chainId, step = {}) {
  const next = loadScaffoldingChains().map((chain) => {
    if (chain.id !== chainId) return chain;
    return Object.assign({}, chain, {
      steps: (chain.steps || []).concat(Object.assign({
        order: Number(step.order || (chain.steps || []).length + 1),
        type: step.type || 'child_action',
        text: step.text || '',
        createdAt: rcNowIso()
      }, step || {})),
      updatedAt: rcNowIso()
    });
  });
  saveScaffoldingChains(next);
  return next.find((chain) => chain.id === chainId) || null;
}

function buildTransferPracticeSet(input = {}) {
  const taskType = input.taskType || detectTaskType(input.stuckPointText || '', input.subject || '');
  const step = input.childArticulatedStep || input.firstStep || suggestedStepForTaskType(taskType);
  const cause = input.wrongCauseBucket
    ? {
      id: input.wrongCauseBucket,
      label: input.wrongCauseLabel || input.wrongCauseBucket,
      parentPrompt: input.parentPrompt || parentQuestionFromFirstStep(step),
      nextPracticeText: input.nextPracticeText || ''
    }
    : wrongCauseFromFirstStep(step, taskType);
  const scaffolds = deepScaffoldingTemplates(taskType);
  const base = {
    taskType,
    wrongCauseBucket: cause.id,
    wrongCauseLabel: cause.label,
    sourceFirstStep: step,
    noFinalAnswer: true,
    safetyLine: '只练迁移方法，不给最终答案。',
    parentPrompt: cause.parentPrompt,
    nextEvidenceRequired: ['near_transfer_attempted', 'far_transfer_attempted', 'child_explains_back']
  };
  const prompts = [
    {
      id: 'near_transfer',
      label: '同类小变式',
      prompt: `换一个数字或条件，第一步仍然先做：${step || scaffolds[0]}`,
      check: scaffolds[1] || cause.nextPracticeText
    },
    {
      id: 'far_transfer',
      label: '换场景迁移',
      prompt: `换成另一道${taskTypeLabel(taskType)}，先说这次第一步和刚才哪里一样。`,
      check: scaffolds[2] || '只说方法相同点，不急着算结果。'
    },
    {
      id: 'teach_back',
      label: '教家长一句',
      prompt: `用一句话教家长：这类题下次第一步先看什么？`,
      check: cause.parentPrompt
    }
  ];
  return Object.assign({}, base, { prompts });
}

function recordParentReflectionReceipt(input = {}) {
  const childStep = input.childArticulatedStep || (loadRawTodaySession() || {}).childArticulatedStep || '';
  const record = appendParentInterventionLog({
    source: input.source || 'parent_reflection',
    usedProductPhrase: input.usedProductPhrase !== false,
    gaveDirectAnswer: !!input.gaveDirectAnswer,
    parentAskedOneQuestion: input.parentAskedOneQuestion !== false,
    childRecalledFirstStep: !!input.childRecalledFirstStep,
    nextDayRevisit: !!input.nextDayRevisit,
    reflectionResult: input.reflectionResult || (childStep ? 'child_recalled_or_rephrased_first_step' : 'parent_question_used'),
    phrase: input.phrase || parentQuestionFromFirstStep(childStep),
    emotionLevel: input.emotionLevel || 3
  });
  appendValidationEvent('parent_reflection_receipt', {
    parentAskedOneQuestion: record.parentAskedOneQuestion,
    childRecalledFirstStep: record.childRecalledFirstStep,
    nextDayRevisit: record.nextDayRevisit,
    gaveDirectAnswer: record.gaveDirectAnswer
  });
  return record;
}

function buildParentReflectionSummary() {
  const logs = loadParentInterventionLog();
  const reflectionLogs = logs.filter((item) => item && (
    item.source === 'parent_reflection'
    || item.parentAskedOneQuestion
    || item.childRecalledFirstStep
    || item.nextDayRevisit
  ));
  const asked = reflectionLogs.filter((item) => item.parentAskedOneQuestion).length;
  const recalled = reflectionLogs.filter((item) => item.childRecalledFirstStep).length;
  const revisited = reflectionLogs.filter((item) => item.nextDayRevisit).length;
  const direct = reflectionLogs.filter((item) => item.gaveDirectAnswer).length;
  return {
    title: '家长追问回执',
    total: reflectionLogs.length,
    askedOneQuestion: asked,
    childRecalledFirstStep: recalled,
    nextDayRevisit: revisited,
    directAnswerCount: direct,
    ready: reflectionLogs.length > 0 && asked > 0 && direct === 0,
    line: reflectionLogs.length
      ? `已记录 ${asked} 次只问一句，${recalled} 次孩子复述第一步，${revisited} 次次日回访。`
      : '今晚用一句话追问后，可以留下是否复述、是否次日回访的回执。'
  };
}

function recordTransferPracticeAttempt(input = {}) {
  const cardId = input.cardId || input.card_id || '';
  const promptId = input.promptId || input.prompt_id || 'near_transfer';
  const cards = loadReviewCards();
  let target = null;
  const nextCards = cards.map((card) => {
    if (!card || (cardId && card.id !== cardId)) return card;
    if (!cardId && target) return card;
    const plan = Object.assign({}, card.nextPracticePlan || {});
    const set = Object.assign({}, plan.transferPracticeSet || buildTransferPracticeSet({
      taskType: card.taskType,
      childArticulatedStep: card.childArticulatedStep,
      wrongCauseBucket: card.wrongCauseBucket,
      wrongCauseLabel: card.wrongCauseLabel,
      stuckPointText: card.stuckPointText,
      parentPrompt: card.parentPrompt
    }));
    const attempts = Array.isArray(set.attempts) ? set.attempts.slice() : [];
    const attempt = {
      id: input.id || `transfer_attempt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      promptId,
      result: input.result || 'attempted',
      childExplanation: input.childExplanation || input.explanation || '',
      parentChecked: !!input.parentChecked,
      createdAt: input.createdAt || rcNowIso()
    };
    set.attempts = [attempt].concat(attempts).slice(0, 20);
    set.completedPromptIds = Array.from(new Set(set.attempts.map((item) => item.promptId).filter(Boolean)));
    set.completedCount = set.completedPromptIds.length;
    set.readyForParentTeachBack = set.completedPromptIds.includes('teach_back');
    target = Object.assign({}, card, {
      nextPracticePlan: Object.assign({}, plan, { transferPracticeSet: set }),
      transferPracticeStatus: {
        completedCount: set.completedCount,
        latestResult: attempt.result,
        readyForParentTeachBack: set.readyForParentTeachBack
      },
      updated_at: rcNowIso()
    });
    return target;
  });
  if (target) {
    saveReviewCards(nextCards);
    appendReviewEvent({
      type: 'transfer_practice_attempt',
      cardId: target.id,
      promptId,
      result: input.result || 'attempted'
    });
    appendValidationEvent('transfer_practice_attempt', {
      cardId: target.id,
      promptId,
      result: input.result || 'attempted'
    });
  }
  return target;
}

function buildWeeklyPatternSynthesis(options = {}) {
  const recent = buildRecentLearningSummary(options.now || new Date());
  const firstStepProfile = loadUserFirstStepProfile();
  const taskPattern = loadTaskTypePattern();
  const reviewCards = loadReviewCards();
  const parentReflection = buildParentReflectionSummary();
  const typeCounter = {};
  (firstStepProfile.events || []).slice(0, 14).forEach((event) => {
    const type = event && event.taskType ? event.taskType : 'unknown';
    typeCounter[type] = Number(typeCounter[type] || 0) + 1;
  });
  reviewCards.slice(0, 14).forEach((card) => {
    const type = card && card.taskType ? card.taskType : 'unknown';
    typeCounter[type] = Number(typeCounter[type] || 0) + 1;
  });
  const dominantType = topCountKey(typeCounter) || 'unknown';
  const dominantPattern = ((taskPattern.byTaskType || {})[dominantType]) || {};
  const wrongCauseCounter = {};
  reviewCards.slice(0, 14).forEach((card) => {
    const key = card && (card.wrongCauseBucket || card.wrongCauseLabel);
    if (key) wrongCauseCounter[key] = Number(wrongCauseCounter[key] || 0) + 1;
  });
  const dominantCause = topCountKey(wrongCauseCounter) || 'first_step';
  const transferAttempts = reviewCards.reduce((total, card) => {
    const attempts = card && card.nextPracticePlan && card.nextPracticePlan.transferPracticeSet
      ? card.nextPracticePlan.transferPracticeSet.attempts || []
      : [];
    return total + attempts.length;
  }, 0);
  const enoughEvidence = (recent.latest3 || []).length >= 3 || reviewCards.length >= 3 || (firstStepProfile.events || []).length >= 3;
  const firstStepQualityCounts = Object.assign({ empty: 0, vague: 0, partial: 0, actionable: 0 }, dominantPattern.firstStepQualityCounts || {});
  const intervention = dominantPattern.total
    ? `下周先修 ${taskTypeLabel(dominantType)} 的第一步：${(deepScaffoldingTemplates(dominantType) || [])[0] || '先说清从哪里开始。'}`
    : '先连续留下 3 晚第一步、专注和回访记录。';
  return {
    title: '一周模式判断',
    ready: !!enoughEvidence,
    dominantTaskType: dominantType,
    dominantTaskLabel: taskTypeLabel(dominantType),
    dominantWrongCause: dominantCause,
    firstStepQualityCounts,
    transferAttempts,
    parentReflectionReady: !!(parentReflection && parentReflection.ready),
    summary: enoughEvidence
      ? `最近最常出现的是${taskTypeLabel(dominantType)}，优先观察「${dominantCause}」这类卡点。`
      : '证据还不够，先连续记录 3 晚再判断模式。',
    intervention,
    nextEvidence: transferAttempts > 0
      ? '继续完成一次教家长一句，确认迁移不是只会原题。'
      : '从一张错因卡开始，完成同类小变式和教家长一句。'
  };
}

function buildLearningDecisionPath(options = {}) {
  const weekly = buildWeeklyPatternSynthesis(options);
  const evidenceBias = buildEvidenceRouteBias(options);
  const reviewCards = loadReviewCards();
  const dueCards = reviewCards.filter((card) => card && (card.due || card.dueDate) && !card.isRevisited);
  const todaySession = loadRawTodaySession() || getTodaySession(options);
  const parentReflection = buildParentReflectionSummary();
  const hasTransferPractice = reviewCards.some((card) => (
    card
    && card.nextPracticePlan
    && card.nextPracticePlan.transferPracticeSet
    && Array.isArray(card.nextPracticePlan.transferPracticeSet.prompts)
    && card.nextPracticePlan.transferPracticeSet.prompts.length >= 3
  ));
  let route = '/pages/tutor/tutor';
  let action = '先说第一步';
  let reason = '还需要孩子先留下自己的第一步。';
  if (dueCards.length) {
    route = '/pages/review/review';
    action = '先清一张回访卡';
    reason = '已有到期卡，先确认昨天的方法还记得。';
  } else if (!hasTransferPractice && reviewCards.length) {
    route = '/pages/review/review';
    action = '做一个同类小变式';
    reason = '已有错因卡，但迁移练习还没有完成。';
  } else if (todaySession.childArticulatedStep && !todaySession.gamePlayed) {
    route = '/pages/arcade/arcade';
    action = '玩一小局轻回访';
    reason = '孩子已经说出第一步，下一步让轻练结果写回记录。';
  } else if (!parentReflection.ready) {
    route = '/pages/profile/profile';
    action = '留下家长追问回执';
    reason = '家长侧还没有确认是否只问一句、孩子是否复述。';
  } else if (weekly.ready) {
    route = '/pages/profile/profile';
    action = '看一周模式判断';
    reason = weekly.intervention;
  }
  if (evidenceBias && evidenceBias.nextRoute && evidenceBias.source !== 'global_evidence') {
    route = evidenceBias.nextRoute;
    action = evidenceBias.evidenceLine || action;
    reason = evidenceBias.reasonLine || reason;
  }
  return {
    title: '下一步决策路径',
    route,
    action,
    reason,
    weeklyPattern: weekly.summary,
    evidenceBias,
    evidence: [
      dueCards.length ? `${dueCards.length} due cards` : '',
      hasTransferPractice ? 'transfer practice available' : '',
      weekly.ready ? `weekly: ${weekly.dominantTaskType}` : ''
    ].filter(Boolean)
  };
}

function buildMasteryRubric(options = {}) {
  const reviewCards = loadReviewCards();
  const thinkingReceipts = loadThinkingReceipts();
  const gameProfile = loadGameProfile();
  const parentReflection = buildParentReflectionSummary();
  const transferAttemptCount = reviewCards.reduce((total, card) => {
    const attempts = card && card.nextPracticePlan && card.nextPracticePlan.transferPracticeSet
      ? card.nextPracticePlan.transferPracticeSet.attempts || []
      : [];
    return total + attempts.length;
  }, 0);
  const reviewedCards = reviewCards.filter((card) => card && (card.isRevisited || card.transferPracticeStatus)).length;
  const levels = [
    {
      id: 'first_step',
      label: '能说第一步',
      ready: reviewCards.some((card) => card && card.childArticulatedStep) || !!((loadRawTodaySession() || {}).childArticulatedStep),
      evidence: '孩子能把第一步说成一句话'
    },
    {
      id: 'diagnosis',
      label: '能说卡因',
      ready: reviewCards.some((card) => card && (card.wrongCauseBucket || card.wrongCauseLabel))
        || thinkingReceipts.some((item) => item && item.diagnostic_probe),
      evidence: '能把卡点归到审题、建模、计算、表达等原因'
    },
    {
      id: 'near_transfer',
      label: '能做同类变式',
      ready: transferAttemptCount > 0,
      evidence: `${transferAttemptCount} 次迁移练习尝试`
    },
    {
      id: 'teach_back',
      label: '能教家长一句',
      ready: parentReflection.childRecalledFirstStep > 0
        || reviewCards.some((card) => card && card.transferPracticeStatus && card.transferPracticeStatus.readyForParentTeachBack),
      evidence: parentReflection.line
    },
    {
      id: 'next_day_recall',
      label: '隔天还能回访',
      ready: reviewedCards > 0 || parentReflection.nextDayRevisit > 0 || Number(gameProfile.reviewed_today || gameProfile.reviewedToday || 0) > 0,
      evidence: reviewedCards ? `${reviewedCards} 张卡已有复核痕迹` : parentReflection.line
    }
  ];
  const readyCount = levels.filter((item) => item.ready).length;
  const stage = readyCount >= 5 ? 'transfer_stable'
    : readyCount >= 4 ? 'teach_back_ready'
      : readyCount >= 3 ? 'transfer_started'
        : readyCount >= 2 ? 'diagnosis_ready'
          : readyCount >= 1 ? 'first_step_ready'
            : 'needs_first_step';
  return {
    title: '掌握度量尺',
    stage,
    readyCount,
    totalCount: levels.length,
    score: Math.round((readyCount / levels.length) * 100),
    levels,
    nextLevel: (levels.find((item) => !item.ready) || null),
    line: readyCount >= 5
      ? '这类卡点已经从第一步、错因、迁移到隔天回访形成闭环。'
      : `当前到第 ${readyCount} 层，下一层要补：${(levels.find((item) => !item.ready) || {}).label || '继续真实回访'}。`
  };
}

function buildInterventionPlaybook(options = {}) {
  const weekly = buildWeeklyPatternSynthesis(options);
  const decision = buildLearningDecisionPath(options);
  const rubric = buildMasteryRubric(options);
  const taskType = weekly.dominantTaskType || 'unknown';
  const scaffolds = deepScaffoldingTemplates(taskType);
  const parentQuestion = parentQuestionFromFirstStep((loadRawTodaySession() || {}).childArticulatedStep || scaffolds[0]);
  const actions = [
    {
      id: 'tonight_first_step',
      label: '今晚先降到一小步',
      route: '/pages/tutor/tutor',
      script: scaffolds[0] || '先说清从哪里开始。',
      evidence: 'child_first_step_sentence'
    },
    {
      id: 'repair_one_card',
      label: '只修一张卡',
      route: '/pages/review/review',
      script: weekly.intervention || '先修出现最多的那类卡点。',
      evidence: 'wrong_cause_card_repaired'
    },
    {
      id: 'transfer_once',
      label: '做一次迁移',
      route: '/pages/review/review',
      script: '同类小变式只换一个条件，先说第一步哪里一样。',
      evidence: 'near_transfer_attempted'
    },
    {
      id: 'parent_teach_back',
      label: '教家长一句',
      route: '/pages/profile/profile',
      script: parentQuestion,
      evidence: 'child_explains_back'
    }
  ];
  return {
    title: '干预作战单',
    ready: !!(weekly.ready && decision.action && rubric.readyCount >= 2),
    summary: weekly.ready
      ? `围绕${weekly.dominantTaskLabel}，先按「${decision.action}」推进。`
      : '证据还不够，先连续 3 晚留下第一步和回访记录。',
    priorityAction: decision,
    masteryStage: rubric.stage,
    actions,
    exitCriteria: [
      '孩子能说第一步',
      '能说这次卡因',
      '能做一次同类变式',
      '能教家长一句',
      '隔天能回访一次'
    ]
  };
}

function recordOutcomeCheck(input = {}) {
  const event = appendValidationEvent('learning_outcome_check', {
    cardId: input.cardId || input.card_id || '',
    masteryStage: input.masteryStage || input.stage || '',
    childCanExplain: !!input.childCanExplain,
    transferWorked: !!input.transferWorked,
    nextDayRemembered: !!input.nextDayRemembered,
    parentVerified: !!input.parentVerified
  });
  appendReviewEvent({
    type: 'learning_outcome_check',
    cardId: input.cardId || input.card_id || '',
    masteryStage: input.masteryStage || input.stage || '',
    transferWorked: !!input.transferWorked,
    nextDayRemembered: !!input.nextDayRemembered
  });
  return event;
}

function buildOutcomeReviewSummary() {
  const events = validationEventsByType('learning_outcome_check');
  const success = events.filter((item) => item && item.childCanExplain && item.transferWorked && item.nextDayRemembered).length;
  return {
    title: '结果复核',
    total: events.length,
    success,
    ready: events.length > 0,
    line: events.length
      ? `已复核 ${events.length} 次，其中 ${success} 次同时满足会解释、能迁移、隔天记得。`
      : '还没有结果复核，完成一次迁移和次日回访后再判断。'
  };
}

function buildExperienceChecklist() {
  const lightEvents = loadLightFeatureEvents();
  const profile = loadUserFirstStepProfile();
  const parentLogs = loadParentInterventionLog();
  const chains = loadScaffoldingChains();
  const checklist = [
    { id: 'light_daily_active', label: '轻功能日活', field: 'light_feature_daily_active', done: lightEvents.length >= 3 },
    { id: 'deep_service_started', label: '深度服务启动率', field: 'deep_service_started', done: chains.length > 0 },
    { id: 'parent_phrase_used', label: '家长话术实际使用率', field: 'parent_phrase_used', done: parentLogs.some((item) => item.usedProductPhrase) },
    { id: 'second_step_success', label: '孩子第二步成功率', field: 'child_second_step_status', done: (profile.events || []).some((item) => item.secondStepStatus) }
  ];
  set(KEYS.experienceChecklist, checklist);
  return checklist;
}

function loadValidationSprintState() {
  const state = get(KEYS.validationSprint, { version: 1, events: [], counters: {} });
  return Object.assign({ version: 1, events: [], counters: {} }, state || {});
}

function saveValidationSprintState(state = {}) {
  const next = Object.assign({ version: 1, events: [], counters: {} }, state || {}, {
    updatedAt: rcNowIso()
  });
  next.events = Array.isArray(next.events) ? next.events.slice(0, 500) : [];
  next.counters = next.counters || {};
  return set(KEYS.validationSprint, next);
}

function appendValidationEvent(type, payload = {}) {
  const state = loadValidationSprintState();
  const event = Object.assign({
    id: `validation_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    createdAt: rcNowIso()
  }, payload || {});
  const counters = Object.assign({}, state.counters || {});
  counters[type] = Number(counters[type] || 0) + 1;
  saveValidationSprintState(Object.assign({}, state, {
    events: [event].concat(state.events || []).slice(0, 500),
    counters
  }));
  return event;
}

function recordLightEntryCompletion(feature, payload = {}) {
  const key = feature === 'daily_math' ? 'mathCompletionTime' : feature === 'dictation' ? 'dictationCompletionTime' : 'lightDiagnosisCompletionTime';
  recordLocalAnalytics('light_entry_completed', { feature });
  return appendValidationEvent('light_entry_completed', Object.assign({
    feature,
    [key]: payload.completionTime || rcNowIso()
  }, payload || {}));
}

function recordLightToCoreTransition(feature, clicked, payload = {}) {
  const clickKey = feature === 'daily_math' ? 'mathToDiagnosisClick' : feature === 'dictation' ? 'dictationToDiagnosisClick' : 'lightDiagnosisToDiagnosisClick';
  return appendValidationEvent('light_to_core_transition', Object.assign({
    feature,
    clicked: !!clicked,
    [clickKey]: !!clicked,
    transitionTime: rcNowIso()
  }, payload || {}));
}

function recordCoreLoopEntry(source = 'unknown', payload = {}) {
  recordLocalAnalytics('core_loop_entered', { source });
  return appendValidationEvent('core_loop_entered', Object.assign({
    source,
    enteredAt: rcNowIso()
  }, payload || {}));
}

function recordProfileVisit(payload = {}) {
  recordLocalAnalytics('profile_viewed', payload);
  return appendValidationEvent('profile_visit', Object.assign({
    visitedAt: rcNowIso()
  }, payload || {}));
}

function recordServiceIntent(source = 'profile_warning', payload = {}) {
  recordLocalAnalytics('service_intent_clicked', { source });
  return appendValidationEvent('service_intent_clicked', Object.assign({
    source,
    clickedAt: rcNowIso()
  }, payload || {}));
}

function recordParentPauseUsed(payload = {}) {
  return appendValidationEvent('parent_pause_used', Object.assign({
    parentUsedPause: true,
    usedAt: rcNowIso()
  }, payload || {}));
}

function recordParentPostPauseBehavior(behavior, payload = {}) {
  const normalized = ['direct_answer', 'asked_one_question', 'let_child_think', 'left_alone'].includes(behavior)
    ? behavior
    : 'unknown';
  appendParentInterventionLog({
    source: 'post_pause_survey',
    usedProductPhrase: normalized === 'asked_one_question',
    gaveDirectAnswer: normalized === 'direct_answer',
    emotionLevel: payload.emotionLevel || 3,
    phrase: payload.phrase || '你第一步先看了哪里？'
  });
  return appendValidationEvent('parent_post_pause_behavior', Object.assign({
    parentPostPauseBehavior: normalized,
    answeredAt: rcNowIso()
  }, payload || {}));
}

function saveBetaTester(value = true) {
  return set(KEYS.betaTester, { isBetaTester: !!value, updatedAt: rcNowIso() });
}

function isBetaTester() {
  const beta = get(KEYS.betaTester, { isBetaTester: true });
  return beta && beta.isBetaTester !== false;
}

function validationEventsByType(type) {
  return (loadValidationSprintState().events || []).filter((event) => event && event.type === type);
}

function withinHours(later, earlier, hours) {
  const laterTime = new Date(later || 0).getTime();
  const earlierTime = new Date(earlier || 0).getTime();
  if (!laterTime || !earlierTime) return false;
  return laterTime >= earlierTime && laterTime - earlierTime <= hours * 60 * 60 * 1000;
}

function calculateValidationDashboard() {
  const validationEvents = loadValidationSprintState().events || [];
  const lightEvents = loadLightFeatureEvents();
  const firstProfile = loadUserFirstStepProfile();
  const chains = loadScaffoldingChains();
  const parentLogs = loadParentInterventionLog();
  const today = rcTodayKey();

  const completedLight = validationEvents.filter((event) => event.type === 'light_entry_completed');
  const lightToday = completedLight.filter((event) => String(event.createdAt || '').slice(0, 10) === today).length
    || lightEvents.filter((event) => String(event.createdAt || '').slice(0, 10) === today).length;
  const coreEntries = validationEvents.filter((event) => event.type === 'core_loop_entered' || (event.type === 'light_to_core_transition' && event.clicked));
  const converted = completedLight.filter((complete) => coreEntries.some((entry) => (
    entry.feature === complete.feature && withinHours(entry.createdAt || entry.transitionTime || entry.enteredAt, complete.createdAt, 24)
  ))).length;

  const qualityCounts = { empty: 0, vague: 0, partial: 0, actionable: 0 };
  (firstProfile.qualityTimeline || []).slice(0, 7).forEach((item) => {
    const quality = item && item.quality;
    if (Object.prototype.hasOwnProperty.call(qualityCounts, quality)) qualityCounts[quality] += 1;
  });

  const firstStepDone = chains.length;
  const secondStepAttempt = chains.filter((chain) => (chain.steps || []).some((step) => Number(step.order) === 2)).length;
  const secondStepDone = chains.filter((chain) => (chain.steps || []).some((step) => Number(step.order) === 2 && step.completed)).length;

  const directAnswer = parentLogs.filter((item) => item.gaveDirectAnswer).length;
  const usedPhrase = parentLogs.filter((item) => item.usedProductPhrase).length;
  const pauseUsed = validationEvents.filter((event) => event.type === 'parent_pause_used').length;
  const profileVisits = validationEvents.filter((event) => event.type === 'profile_visit').length;
  const serviceClicks = validationEvents.filter((event) => event.type === 'service_intent_clicked').length;

  return {
    lightEntryDAU: lightToday,
    coreLoopEntryRate: completedLight.length ? Math.round((converted / completedLight.length) * 100) : 0,
    firstStepQualityTrend: qualityCounts,
    scaffoldingCompletionRate: {
      firstStepDone,
      secondStepAttempt,
      secondStepDone,
      attemptRate: firstStepDone ? Math.round((secondStepAttempt / firstStepDone) * 100) : 0,
      completionRate: secondStepAttempt ? Math.round((secondStepDone / secondStepAttempt) * 100) : 0
    },
    parentInterventionRate: {
      directAnswer,
      usedPhrase,
      pauseUsed,
      directAnswerRate: parentLogs.length ? Math.round((directAnswer / parentLogs.length) * 100) : 0
    },
    serviceIntentRate: {
      serviceClicks,
      profileVisits,
      rate: profileVisits ? Math.round((serviceClicks / profileVisits) * 100) : 0
    }
  };
}

function buildParentActionGuide(input = {}) {
  const pattern = loadTaskTypePattern();
  const parentLogs = loadParentInterventionLog();
  const parentReflectionSummary = buildParentReflectionSummary();
  const weeklyPatternSynthesis = buildWeeklyPatternSynthesis(input);
  const learningDecisionPath = buildLearningDecisionPath(input);
  const masteryRubric = buildMasteryRubric(input);
  const interventionPlaybook = buildInterventionPlaybook(input);
  const outcomeReviewSummary = buildOutcomeReviewSummary();
  const profile = loadUserFirstStepProfile();
  const recentEvents = (profile.events || []).slice(0, 7);
  const latestType = (recentEvents[0] && recentEvents[0].taskType) || 'unknown';
  const latestPattern = ((pattern.byTaskType || {})[latestType]) || {};
  const todaySession = loadRawTodaySession() || getTodaySession();
  const todayFocus = loadTodayFocus();
  const childStep = todaySession.childArticulatedStep
    || (todayFocus && (todayFocus.childArticulatedStep || todayFocus.miniActionText))
    || '';
  const taskLabel = taskTypeLabel(latestType);
  const parentQuestion = parentQuestionFromFirstStep(childStep);
  const repeatedLine = latestPattern.total
    ? `${taskLabel}里已经出现 ${latestPattern.total} 次第一步记录，先观察同一类卡点是不是重复出现。`
    : '本周模式还不够，先连续记录 3 晚。';
  const tonightScript = childStep
    ? `先复述孩子的话：“你刚才说第一步是${childStep}。”再问：“这一步下次先查什么？”`
    : `先问一句：“${parentQuestion}”如果孩子说不出来，就让他只圈一个条件或读第一句。`;
  const cannotAnswerFallback = '孩子答不上来时，不讲完整过程，只缩小到一个动作：圈条件、读第一句、找两个量、写第一句。';
  const praiseLine = childStep
    ? '先肯定他能说出自己的第一步，再决定要不要继续练。'
    : '先肯定他愿意停下来想一步，不急着评价对错。';
  const nextEvidence = childStep
    ? ['child_first_step_recalled', 'same_type_try_once', 'next_day_revisit']
    : ['parent_question_used', 'child_first_step_attempted', 'next_day_revisit'];
  const sevenDayParentPlan = [
    { day: 1, action: '只问第一步', script: parentQuestion, evidence: 'child_first_step_attempted' },
    { day: 2, action: '回看同一张卡', script: '昨天那一步，今天还记得先看哪里吗？', evidence: 'next_day_revisit' },
    { day: 3, action: '做 1 道同类题', script: '这道同类题，第一步和昨天一样吗？', evidence: 'same_type_try_once' },
    { day: 4, action: '检查错因', script: '这次卡住，是读题、列式、步骤还是检查？', evidence: 'wrong_cause_named' },
    { day: 5, action: '让孩子教家长', script: '你用一句话教我：这类题第一步看什么？', evidence: 'child_explains_back' },
    { day: 6, action: '轻练小游戏', script: '玩一小局后，说一张错卡为什么回来。', evidence: 'arcade_wrong_card_returned' },
    { day: 7, action: '形成周小结', script: '这一周最常卡的是哪一步？下周先修哪一类？', evidence: 'weekly_pattern_named' }
  ];
  return {
    tonightRecap: input.tonightRecap || '今晚先看孩子有没有说出自己的第一步。',
    weekPattern: repeatedLine,
    monthSuggestion: '接下来 7 天，每晚只做一件事：让孩子先说出自己的第一步，再用一张卡轻轻回访。',
    parentPhraseTraining: {
      title: '7 天家长陪伴脚本',
      preview: '先练“少讲答案，多问对一句”。',
      tonightScript,
      cannotAnswerFallback,
      praiseLine,
      avoid: ['别直接讲完整答案', '别追问排名和输赢', '别一次加太多题'],
      nextEvidence
    },
    sevenDayParentPlan,
    parentReflectionSummary,
    weeklyPatternSynthesis,
    learningDecisionPath,
    masteryRubric,
    interventionPlaybook,
    outcomeReviewSummary,
    usedPhraseCount: parentLogs.filter((item) => item && item.usedProductPhrase).length,
    experienceChecklist: buildExperienceChecklist()
  };
}

function buildLearningDepthMap(options = {}) {
  const todaySession = loadRawTodaySession() || getTodaySession(options);
  const todayFocus = loadTodayFocus();
  const reportState = loadLearningReportState();
  const tonightPlan = loadTonightPlan();
  const reviewCards = loadReviewCards();
  const reviewEvents = loadReviewEvents();
  const tutorEvents = loadTutorEvents();
  const thinkingReceipts = loadThinkingReceipts();
  const gameProfile = loadGameProfile();
  const shareRuns = loadShareRuns();
  const parentReflectionSummary = buildParentReflectionSummary();
  const weeklyPatternSynthesis = buildWeeklyPatternSynthesis(options);
  const learningDecisionPath = buildLearningDecisionPath(options);
  const masteryRubric = buildMasteryRubric(options);
  const interventionPlaybook = buildInterventionPlaybook(options);
  const outcomeReviewSummary = buildOutcomeReviewSummary();
  const transferPracticeCards = reviewCards.filter((card) => (
    card
    && card.nextPracticePlan
    && card.nextPracticePlan.transferPracticeSet
    && Array.isArray(card.nextPracticePlan.transferPracticeSet.prompts)
    && card.nextPracticePlan.transferPracticeSet.prompts.length >= 3
  ));
  const sync = syncDiagnostics();
  const parentGuide = buildParentActionGuide({
    tonightRecap: todaySession.childArticulatedStep
      ? `今晚孩子已经说出第一步：${todaySession.childArticulatedStep}`
      : ''
  });
  const hasDiagnostic = thinkingReceipts.some((item) => item && (item.diagnostic_probe || item.transfer_prompt))
    || tutorEvents.some((event) => event && event.event === 'tutor_diagnostic_probe')
    || !!(todaySession && (todaySession.childArticulatedStep || todaySession.tutorCompleted || todaySession.taskTypeConfirmed))
    || !!(todayFocus && (todayFocus.systemSuggestedStep || todayFocus.childArticulatedStep));
  const hasReportPlan = !!(
    reportState.localLoopConnection
    || reportState.solutionMap
    || (tonightPlan && tonightPlan.reportSolution)
  );
  const dueCards = reviewCards.filter((card) => card && (card.due || card.dueDate));
  const wrongCauseCards = reviewCards.filter((card) => card && (card.wrongCauseBucket || card.nextPracticePlan || card.repairPlan));
  const hasPracticeFeedback = !!(
    todaySession.gamePlayed
    || Number(gameProfile.reviewed_today || gameProfile.reviewedToday || gameProfile.review_count || 0) > 0
  );
  const hasParentScript = !!(
    parentGuide
    && Array.isArray(parentGuide.sevenDayParentPlan)
    && parentGuide.sevenDayParentPlan.length >= 7
    && parentGuide.parentPhraseTraining
    && parentGuide.parentPhraseTraining.cannotAnswerFallback
  );
  const hasTransferPractice = transferPracticeCards.length > 0;
  const hasParentReflection = (parentReflectionSummary && parentReflectionSummary.ready) || hasParentScript;
  const hasMisconceptionMap = hasDiagnostic || thinkingReceipts.some((item) => item && item.diagnostic_probe && item.diagnostic_probe.misconception);
  const hasWeeklyPattern = weeklyPatternSynthesis && weeklyPatternSynthesis.ready;
  const hasDecisionPath = learningDecisionPath && learningDecisionPath.action && learningDecisionPath.route;
  const hasMasteryRubric = masteryRubric && masteryRubric.readyCount >= 3;
  const hasInterventionPlaybook = interventionPlaybook && interventionPlaybook.ready && Array.isArray(interventionPlaybook.actions);
  const hasOutcomeReview = outcomeReviewSummary && outcomeReviewSummary.ready;
  const hasContinuity = !!(
    shareRuns.length
    || (sync && (Number(sync.queueLength || sync.pending || 0) >= 0))
  );
  const dimensions = [
    {
      id: 'guided_followup',
      label: '追问有层次',
      ready: hasDiagnostic,
      evidence: hasDiagnostic ? '已有诊断追问和迁移提示记录' : '先完成一次咕点追问'
    },
    {
      id: 'misconception_map',
      label: '误区能定位',
      ready: hasMisconceptionMap,
      evidence: hasMisconceptionMap ? '导师回执里已经记录误区判断和下一步证据' : '先完成一轮带误区判断的追问'
    },
    {
      id: 'action_plan',
      label: '报告能落地',
      ready: hasReportPlan,
      evidence: hasReportPlan ? '学习画像已接到今晚路线或 7 天方案' : '先录入成绩/测评并生成方案'
    },
    {
      id: 'active_recall',
      label: '错题会回访',
      ready: dueCards.length > 0 || wrongCauseCards.length > 0 || reviewEvents.length > 0,
      evidence: dueCards.length || wrongCauseCards.length
        ? `${dueCards.length} 张待回访卡，${wrongCauseCards.length} 张错因卡`
        : '先修一个卡点生成回访卡'
    },
    {
      id: 'transfer_practice',
      label: '会举一反三',
      ready: hasTransferPractice,
      evidence: hasTransferPractice ? `${transferPracticeCards.length} 张卡带同类变式、换场景和教家长练习` : '先从错因卡生成 3 个迁移练习'
    },
    {
      id: 'practice_feedback',
      label: '轻练会反哺',
      ready: hasPracticeFeedback,
      evidence: hasPracticeFeedback
        ? `今日练习 ${Number(gameProfile.reviewed_today || gameProfile.reviewedToday || 0)} 次，正确 ${Number(gameProfile.correct_today || gameProfile.correctToday || 0)} 次`
        : '先玩一小局，让结果写回学习记录'
    },
    {
      id: 'parent_coaching',
      label: '家长能接上',
      ready: hasParentScript,
      evidence: hasParentScript ? '已有 7 天家长陪伴脚本和答不上来兜底话术' : '先生成家长陪伴脚本'
    },
    {
      id: 'parent_reflection',
      label: '家长有回执',
      ready: hasParentReflection,
      evidence: parentReflectionSummary ? parentReflectionSummary.line : '今晚追问后记录一次回执'
    },
    {
      id: 'weekly_pattern',
      label: '一周能归因',
      ready: hasWeeklyPattern,
      evidence: weeklyPatternSynthesis ? weeklyPatternSynthesis.summary : '先积累 3 晚记录'
    },
    {
      id: 'decision_path',
      label: '下一步会决策',
      ready: hasDecisionPath,
      evidence: hasDecisionPath ? `${learningDecisionPath.action}：${learningDecisionPath.reason}` : '先生成下一步路径'
    },
    {
      id: 'mastery_rubric',
      label: '掌握有分层',
      ready: hasMasteryRubric,
      evidence: masteryRubric ? masteryRubric.line : '先形成掌握度量尺'
    },
    {
      id: 'intervention_playbook',
      label: '干预有打法',
      ready: hasInterventionPlaybook,
      evidence: interventionPlaybook ? interventionPlaybook.summary : '先形成干预作战单'
    },
    {
      id: 'outcome_review',
      label: '结果会复核',
      ready: hasOutcomeReview,
      evidence: outcomeReviewSummary ? outcomeReviewSummary.line : '先完成一次结果复核'
    },
    {
      id: 'continuity',
      label: '离开能回来',
      ready: hasContinuity,
      evidence: shareRuns.length
        ? `已留下 ${shareRuns.length} 条分享/回流记录`
        : '本地队列可恢复今晚路线、回访卡和学习小结'
    }
  ];
  const readyCount = dimensions.filter((item) => item.ready).length;
  const depthScore = Math.round((readyCount / dimensions.length) * 100);
  const nextDimension = dimensions.find((item) => !item.ready) || null;
  return {
    title: '能力厚度地图',
    summary: depthScore >= 84
      ? '追问、回访、轻练、家长陪伴和回流已经连成一条可复用路线。'
      : '核心路线能跑，继续补齐追问、回访或家长陪伴证据。',
    depthScore,
    readyCount,
    totalCount: dimensions.length,
    dimensions,
    transferPlan: parentGuide.sevenDayParentPlan || [],
    nextBestAction: nextDimension
      ? `${nextDimension.label}：${nextDimension.evidence}`
      : '继续用真实材料积累 3/7 晚记录。',
    benchmarkDepthLine: '对标成熟学习产品：不是只给一次提示，而是把追问、练习、回访、家长一句话和下一次行动连起来。'
  };
}

function buildLearningQuestArc(options = {}) {
  const todayFocus = loadTodayFocus();
  const tonightPlan = loadTonightPlan();
  const reviewCards = loadReviewCards();
  const outcome = buildOutcomeReviewSummary();
  const parentReflection = buildParentReflectionSummary();
  const decision = buildLearningDecisionPath(options);
  const mastery = buildMasteryRubric(options);
  const shareRuns = loadShareRuns();
  const dueCount = reviewCards.filter((card) => card && (card.due || card.dueDate) && !card.isRevisited).length;
  const transferCount = reviewCards.reduce((total, card) => {
    const attempts = card && card.nextPracticePlan && card.nextPracticePlan.transferPracticeSet
      ? card.nextPracticePlan.transferPracticeSet.attempts || []
      : [];
    return total + attempts.length;
  }, 0);
  const stages = [
    {
      id: 'plan',
      displayLabel: '今晚开局',
      title: tonightPlan && tonightPlan.summaryLine ? tonightPlan.summaryLine : '先排今晚第一步',
      body: '先把材料排顺序，再让孩子说出第一步。',
      action: 'goTutor',
      actionLabel: '去作业点拨',
      done: !!tonightPlan
    },
    {
      id: 'first_step',
      displayLabel: '苏格拉底',
      title: '先问一步，不直接给答案',
      body: '只追问诊断问题、第一步和卡点，不越过孩子的思考。',
      action: 'goReview',
      actionLabel: '看小黑板',
      done: !!(todayFocus && todayFocus.childArticulatedStep)
    },
    {
      id: 'repair',
      displayLabel: '修卡点',
      title: todayFocus && todayFocus.title ? todayFocus.title : '把一个真实卡点修完',
      body: '只修一个最卡的点，再把它写成回访卡。',
      action: 'goReview',
      actionLabel: '去修卡点',
      done: !!(todayFocus && todayFocus.repairStatus === 'completed')
    },
    {
      id: 'transfer',
      displayLabel: '迁移练习',
      title: '换题也能说出同一步',
      body: transferCount > 0 ? `已经写回 ${transferCount} 次迁移尝试。` : '先做一次同类变式，再看能不能换场景。',
      action: 'goReview',
      actionLabel: '做小变式',
      done: transferCount > 0
    },
    {
      id: 'parent',
      displayLabel: '家长追问',
      title: parentReflection.ready ? parentReflection.line : '家长只问一句',
      body: '家长只确认孩子能不能复述第一步，不直接接管答案。',
      action: 'goProfile',
      actionLabel: '看家长复盘',
      done: !!(parentReflection && parentReflection.ready)
    },
    {
      id: 'next_day',
      displayLabel: '次日回看',
      title: outcome.ready ? outcome.line : '隔天再回看一张卡',
      body: dueCount > 0 ? `当前还有 ${dueCount} 张待回访。` : '次日回看会把今天的动作变成长期记忆。',
      action: 'goReview',
      actionLabel: '去回看',
      done: outcome.success > 0 || reviewCards.some((card) => card && (card.isRevisited || card.due))
    }
  ];
  const doneCount = stages.filter((item) => item.done).length;
  const current = stages.find((item) => !item.done) || stages[stages.length - 1];
  return {
    title: '学习剧情线',
    summary: todayFocus
      ? `围绕${todayFocus.title || '今晚卡点'}，把苏格拉底、修卡点、迁移、家长和次日回看连成一条线。`
      : '把今晚的第一步、复盘和家长追问连成一条线。',
    currentStage: current.id,
    currentLabel: current.displayLabel,
    currentTitle: current.title,
    currentBody: current.body,
    currentAction: current.action,
    currentActionLabel: current.actionLabel,
    doneCount,
    totalCount: stages.length,
    progress: Math.round((doneCount / stages.length) * 100),
    stages,
    parentHook: parentReflection.ready ? parentReflection.line : '家长入口会先确认第一步，不接管答案。',
    gameHook: shareRuns.length
      ? `已有 ${shareRuns.length} 次分享或回流记录，可把复盘卡继续推到下一步。`
      : '分享后会保留下一步动作，而不是只发一张卡。',
    reportHook: outcome.ready ? outcome.line : '结果复核看迁移和次日记忆，不看最终答案。',
    decisionHook: decision.action,
    benchmarkHook: mastery.line
  };
}

function buildQuestArcGameBridge(options = {}) {
  const arc = buildLearningQuestArc(options);
  const dailyQuestSet = options.dailyQuestSet || {};
  const adaptiveChallenge = options.adaptiveChallenge || {};
  const evidenceBias = options.evidenceBias || dailyQuestSet.evidenceBias || adaptiveChallenge.evidenceBias || null;
  const activeQuest = Array.isArray(dailyQuestSet.quests)
    ? dailyQuestSet.quests.find((item) => item && item.progress < item.target) || dailyQuestSet.quests[0]
    : null;
  const bossKey = adaptiveChallenge && adaptiveChallenge.bossCard
    ? adaptiveChallenge.bossCard.key
    : dailyQuestSet.weakKey || '';
  const stageMap = {
    plan: {
      title: '先接上今晚路线',
      missionLine: '这一局只确认：孩子知道今晚从哪一步开始。',
      playRule: '答题前先在心里说出第一步，再点选；不会就回到点拨。',
      evidenceRequired: ['tonight_first_step', 'game_attempt']
    },
    first_step: {
      title: '第一步闯关',
      missionLine: '这一局不抢答案，只练“先说第一步”。',
      playRule: '每张卡先说准备从哪里开始，再核对思路。',
      evidenceRequired: ['student_first_step', 'no_final_answer']
    },
    repair: {
      title: bossKey ? `修补 ${bossKey}` : '修补一个真卡点',
      missionLine: bossKey ? `本局围绕高频卡点：${bossKey}` : '本局围绕最近的真实卡点。',
      playRule: '错了不扣成就感，直接回到复习队列生成下一步。',
      evidenceRequired: ['wrong_cause_returned', 'repair_card']
    },
    transfer: {
      title: '变式迁移关',
      missionLine: '同一个方法，换一道题也要能开口说第一步。',
      playRule: '只看方法能不能迁移，不追求一次给出完整答案。',
      evidenceRequired: ['near_transfer_attempted', 'same_method_new_context']
    },
    parent: {
      title: '教家长一句话',
      missionLine: '通关后让孩子用一句话教家长：我第一步先做什么。',
      playRule: '家长只追问一句，不接管解题。',
      evidenceRequired: ['child_explains_back', 'parent_one_question']
    },
    next_day: {
      title: '隔天回看关',
      missionLine: '隔天再看一张卡，确认不是当场会、转身忘。',
      playRule: '先回忆，再核对；忘了就回到轻量复习。',
      evidenceRequired: ['next_day_recall', 'review_card']
    }
  };
  const stage = stageMap[arc.currentStage] || stageMap.first_step;
  return Object.assign({
    id: `quest_arc_game_${arc.currentStage || 'first_step'}`,
    currentStage: arc.currentStage,
    currentLabel: arc.currentLabel,
    noFinalAnswer: true,
    source: 'learning_quest_arc',
    activeQuestId: activeQuest && activeQuest.id ? activeQuest.id : '',
    adaptiveMode: adaptiveChallenge.mode || 'balanced',
    evidenceBiasSource: evidenceBias && evidenceBias.source ? evidenceBias.source : '',
    evidenceBiasRoute: evidenceBias && evidenceBias.nextRoute ? evidenceBias.nextRoute : '',
    route: '/pages/arcade/arcade',
    completionWrites: ['quest_arc_game_signal', 'review_event', 'game_session_result']
  }, stage);
}

function recordQuestArcGameSignal(input = {}, context = {}) {
  const mission = input.mission || input.questArcMission || {};
  const result = input.result || {};
  const event = appendValidationEvent('quest_arc_game_signal', {
    currentStage: mission.currentStage || '',
    currentLabel: mission.currentLabel || '',
    missionTitle: mission.title || '',
    activeQuestId: mission.activeQuestId || '',
    adaptiveMode: mission.adaptiveMode || '',
    gameType: context.gameType || result.gameType || '',
    accuracy: Number(result.accuracy || 0),
    total: Number(result.total || 0),
    correct: Number(result.correct || 0),
    passed: !!result.passed,
    noFinalAnswer: mission.noFinalAnswer !== false,
    evidenceRequired: mission.evidenceRequired || []
  });
  appendSyncMutation('quest_arc_game_signal', {
    id: event.id,
    current_stage: event.currentStage,
    active_quest_id: event.activeQuestId,
    adaptive_mode: event.adaptiveMode,
    game_type: event.gameType,
    accuracy: event.accuracy,
    passed: event.passed,
    no_final_answer: event.noFinalAnswer,
    created_at: event.createdAt
  });
  if (event.passed && event.currentStage === 'first_step') {
    recordDailyLearningQuestSignal({ firstStepConfirmed: true }, { now: context.now || new Date() });
  }
  if (event.passed && ['repair', 'transfer', 'next_day'].includes(event.currentStage)) {
    recordDailyLearningQuestSignal({ focusRoundCompleted: true }, { now: context.now || new Date() });
  }
  return event;
}

function buildModuleFlowCompass(options = {}) {
  const todayFocus = loadTodayFocus();
  const tonightPlan = loadTonightPlan();
  const reviewCards = loadReviewCards();
  const thinking = thinkingReceiptSummary();
  const parentReflection = buildParentReflectionSummary();
  const outcome = buildOutcomeReviewSummary();
  const reportState = loadLearningReportState();
  const gameProfile = loadGameProfile();
  const shareRuns = loadShareRuns();
  const dueReviewCount = reviewCards.filter((card) => card && (card.due || card.dueDate) && !card.isRevisited).length;
  const transferAttemptCount = reviewCards.reduce((total, card) => {
    const attempts = card && card.nextPracticePlan && card.nextPracticePlan.transferPracticeSet
      ? card.nextPracticePlan.transferPracticeSet.attempts || []
      : [];
    return total + attempts.length;
  }, 0);
  const modules = [
    {
      id: 'plan',
      label: '今晚路线',
      route: '/pages/home/home',
      ready: !!tonightPlan,
      evidence: tonightPlan ? (tonightPlan.summaryLine || '已排今晚第一步') : '还缺今晚任务顺序',
      nextAction: tonightPlan ? '接到第一步点拨' : '先录入今晚任务',
      action: 'goHome'
    },
    {
      id: 'tutor',
      label: '苏格拉底点拨',
      route: '/pages/tutor/tutor',
      ready: !!(thinking && (thinking.diagnosticProbes || thinking.transferPrompts || thinking.total)),
      evidence: thinking && thinking.total ? `${thinking.total} 条思路记录` : '还缺一次第一步追问',
      nextAction: '让孩子先说第一步',
      action: 'goTutor'
    },
    {
      id: 'repair',
      label: '修卡点',
      route: '/pages/review/review',
      ready: !!(todayFocus && todayFocus.repairStatus === 'completed'),
      evidence: todayFocus ? `${todayFocus.title || '今日卡点'} · ${todayFocus.repairStatus || 'not_started'}` : '还缺一张真实卡点卡',
      nextAction: todayFocus && todayFocus.repairStatus === 'completed' ? '进入迁移或回访' : '完成一个小动作',
      action: 'goReview'
    },
    {
      id: 'review',
      label: '轻回访',
      route: '/pages/review/review',
      ready: dueReviewCount > 0 || reviewCards.some((card) => card && card.isRevisited),
      evidence: dueReviewCount ? `${dueReviewCount} 张待回访` : `${reviewCards.length} 张本地学习卡`,
      nextAction: dueReviewCount ? '先清一张待回访卡' : '生成或回看一张卡',
      action: 'goReview'
    },
    {
      id: 'arcade',
      label: '游戏化轻练',
      route: '/pages/arcade/arcade',
      ready: Number(gameProfile.reviewed_today || gameProfile.reviewedToday || 0) > 0,
      evidence: Number(gameProfile.reviewed_today || gameProfile.reviewedToday || 0)
        ? `今日轻练 ${Number(gameProfile.reviewed_today || gameProfile.reviewedToday || 0)} 题`
        : '还没把轻练写回证据',
      nextAction: '打一小局，错卡回队列',
      action: 'goArcade'
    },
    {
      id: 'transfer',
      label: '迁移练习',
      route: '/pages/review/review',
      ready: transferAttemptCount > 0,
      evidence: transferAttemptCount ? `${transferAttemptCount} 次迁移尝试` : '还缺同类变式或教家长',
      nextAction: '做一个同类变式',
      action: 'goReview'
    },
    {
      id: 'report',
      label: '报告到行动',
      route: '/pages/profile/profile',
      ready: !!(reportState && reportState.reportDraft),
      evidence: reportState && reportState.reportDraft ? `${Number(reportState.reportCompleteness || 0)}% 资料完整度` : '还缺学习画像',
      nextAction: '生成报告行动板',
      action: 'goProfile'
    },
    {
      id: 'parent',
      label: '家长复核',
      route: '/pages/profile/profile',
      ready: !!(parentReflection && parentReflection.ready),
      evidence: parentReflection && parentReflection.ready ? parentReflection.line : '还缺家长一句话回执',
      nextAction: '家长只问一句',
      action: 'goProfile'
    },
    {
      id: 'outcome',
      label: '次日结果',
      route: '/pages/review/review',
      ready: !!(outcome && outcome.ready),
      evidence: outcome && outcome.ready ? outcome.line : '还缺次日回看证据',
      nextAction: '隔天回看一张卡',
      action: 'goReview'
    },
    {
      id: 'share',
      label: '分享回流',
      route: '/pages/profile/profile',
      ready: shareRuns.length > 0,
      evidence: shareRuns.length ? `${shareRuns.length} 条分享/回流记录` : '还缺可转发行动卡',
      nextAction: '整理家庭行动卡',
      action: 'goProfile'
    }
  ];
  modules.forEach((item) => {
    item.displayLabel = item.label;
  });
  const readyCount = modules.filter((item) => item.ready).length;
  const current = modules.find((item) => !item.ready) || modules[modules.length - 1];
  return {
    title: '模块流转罗盘',
    summary: `已闭合 ${readyCount}/${modules.length} 个关键节点，下一步：${current.nextAction}`,
    readyCount,
    totalCount: modules.length,
    progress: Math.round((readyCount / modules.length) * 100),
    currentModule: current.id,
    currentLabel: current.label,
    currentAction: current.action,
    currentRoute: current.route,
    currentNextAction: current.nextAction,
    currentEvidence: current.evidence,
    modules,
    readiness: readyCount >= modules.length ? 'closed' : readyCount >= 7 ? 'nearly_closed' : readyCount >= 4 ? 'building' : 'thin',
    benchmarkLine: '对标成熟产品，不是单点功能强，而是每个模块都能把证据交给下一个模块。'
  };
}

function buildSurfaceDepthPack(surface = 'home', options = {}) {
  const acceptance = buildAcceptanceReport(options);
  const readiness = buildProductReadiness(options);
  const moduleFlowCompass = buildModuleFlowCompass(options);
  const globalEvidenceBrief = options.globalEvidenceBrief || buildGlobalEvidenceBrief(options);
  const learningQuestArc = options.learningQuestArc || buildLearningQuestArc(options);
  const capabilityLedger = options.capabilityEvidenceLedger || buildCapabilityEvidenceLedger(Object.assign({}, options, {
    globalEvidenceBrief,
    learningQuestArc,
    moduleFlowCompass
  }));
  const checklist = Array.isArray(acceptance.functionalityChecklist) ? acceptance.functionalityChecklist : [];
  const map = checklist.reduce((acc, item) => {
    if (item && item.id) acc[item.id] = item;
    return acc;
  }, {});
  const surfaces = {
    home: {
      title: '首页厚度包',
      summary: '把今晚第一步、点拨、修卡点、轻练和家长证据串成一个入口。',
      focusIds: ['guided_tutor', 'light_entry_evidence', 'material_to_review', 'game_retention', 'parent_evidence', 'local_resilience'],
      nextAction: '先把今晚第一步说清，再去点拨 / 修卡点 / 轻练。',
      benchmark: '首页不只是入口，要能把孩子推进到下一步证据。'
    },
    tutor: {
      title: '点拨厚度包',
      summary: '点拨必须留住第一步、错因、迁移提示和停止规则。',
      focusIds: ['guided_tutor', 'material_to_review', 'depth_compounding', 'parent_evidence'],
      nextAction: '先说第一步，再补错因和迁移检查。',
      benchmark: '点拨不是讲答案，是让孩子能复述下一步。'
    },
    review: {
      title: '修卡厚度包',
      summary: '修卡点必须能回到卡点、转成回访、再回到迁移。',
      focusIds: ['material_to_review', 'spaced_recall', 'report_to_solution', 'decision_path'],
      nextAction: '先修一个真卡点，再生成同类变式和回访。',
      benchmark: '修卡不是做完一张卡，而是把错因写回系统。'
    },
    arcade: {
      title: '游戏厚度包',
      summary: '轻练必须写回学习证据，而不是只给一个好玩外壳。',
      focusIds: ['game_retention', 'spaced_recall', 'parent_evidence', 'depth_compounding'],
      nextAction: '先打一局，再看它把哪张卡写回复习。',
      benchmark: '游戏不是装饰入口，是证据回流的动力层。'
    },
    profile: {
      title: '家长厚度包',
      summary: '家长页要能看见报告、周模式、掌握度、干预和分享回流。',
      focusIds: ['report_to_solution', 'parent_evidence', 'share_return', 'weekly_pattern', 'decision_path', 'mastery_rubric', 'intervention_playbook', 'outcome_review'],
      nextAction: '先看一条家长行动，再看周模式和掌握度。',
      benchmark: '家长页不是报表墙，是可执行的家庭决策台。'
    },
    legal: {
      title: '信任边界厚度包',
      summary: '法律与隐私页要讲清楚数据、未成年人保护、AI 边界和可回到的学习动作。',
      focusIds: ['local_resilience', 'parent_evidence', 'guided_tutor', 'decision_path'],
      nextAction: '确认边界后，回到家长复盘或补一条真实材料。',
      benchmark: '信任页不是静态条款，是让家庭敢试用的边界说明。'
    },
    tools: {
      title: '工具厚度包',
      summary: '工具页要把材料、错题、轻练习和回访都导回学习资产。',
      focusIds: ['light_entry_evidence', 'material_to_review', 'spaced_recall', 'game_retention', 'depth_compounding'],
      nextAction: '先把一段材料或错题变成可回访卡。',
      benchmark: '工具不是功能货架，是把输入转成复习资产的工厂。'
    },
    upload: {
      title: '材料入口厚度包',
      summary: '上传/录入要把作业、错题和材料分流到今晚路线。',
      focusIds: ['report_to_solution', 'material_to_review', 'guided_tutor', 'local_resilience'],
      nextAction: '先录入今晚任务，再确认第一项必须做。',
      benchmark: '材料入口不是收集框，是学习路线的源头。'
    },
    diagnosis: {
      title: '诊断厚度包',
      summary: '诊断要先判断卡点，再导向第一步、修卡点和迁移。',
      focusIds: ['guided_tutor', 'decision_path', 'mastery_rubric', 'intervention_playbook'],
      nextAction: '先回答三个小问题，确认今晚先修哪一点。',
      benchmark: '诊断不是贴标签，是把不清楚变成可执行一步。'
    },
    focus: {
      title: '专注厚度包',
      summary: '专注舱要绑定孩子说出的第一步，并在结束后留下证据。',
      focusIds: ['guided_tutor', 'parent_evidence', 'spaced_recall', 'depth_compounding'],
      nextAction: '先确认第一步，再围绕这一步坐一段。',
      benchmark: '专注不是计时器，是把开始过的证据留下来。'
    },
    module: {
      title: '学习小局厚度包',
      summary: '学习模块要能进入点拨、留下掌握标准，并变成复习卡。',
      focusIds: ['guided_tutor', 'material_to_review', 'mastery_rubric', 'spaced_recall'],
      nextAction: '先完成一个小局，再把方法加入回访。',
      benchmark: '模块不是内容页，是一个可沉淀的小学习闭环。'
    },
    radar: {
      title: '决策雷达厚度包',
      summary: '雷达要把弱点、优先级和下一步行动放在同一张图里。',
      focusIds: ['decision_path', 'weekly_pattern', 'parent_evidence', 'intervention_playbook'],
      nextAction: '先执行当前最高优先级的一步。',
      benchmark: '雷达不是分析图，是今晚下一步的决策台。'
    },
    daily_math: {
      title: '口算厚度包',
      summary: '轻口算要先看第一步，并在卡住时导回核心学习链路。',
      focusIds: ['light_entry_evidence', 'guided_tutor', 'game_retention', 'parent_evidence', 'depth_compounding'],
      nextAction: '先提交一轮，再决定是否进入诊断。',
      benchmark: '口算不是孤立练习，是核心链路的轻入口。'
    },
    dictation: {
      title: '听写厚度包',
      summary: '听写要记录孩子先看拼音、字形或意思的第一步。',
      focusIds: ['light_entry_evidence', 'guided_tutor', 'parent_evidence', 'depth_compounding'],
      nextAction: '先确认听写前的第一步，再进入核心链路。',
      benchmark: '听写不是报词工具，是留下学习方法的一步。'
    },
    light_diagnosis: {
      title: '手动选题厚度包',
      summary: '手动诊断要诚实承认边界，并让孩子确认第一步。',
      focusIds: ['light_entry_evidence', 'guided_tutor', 'local_resilience', 'decision_path'],
      nextAction: '先手动确认科目和卡点，再保存第一步。',
      benchmark: '轻诊断不是自动识别答案，是低风险定位入口。'
    }
  };
  const current = surfaces[surface] || surfaces.home;
  const routeMap = {
    guided_tutor: '/pages/tutor/tutor',
    material_to_review: '/pages/review/review',
    game_retention: '/pages/arcade/arcade',
    parent_evidence: '/pages/profile/profile',
    local_resilience: '/pages/upload/upload',
    spaced_recall: '/pages/review/review',
    report_to_solution: '/pages/radar/radar',
    decision_path: '/pages/radar/radar',
    weekly_pattern: '/pages/profile/profile',
    mastery_rubric: '/pages/profile/profile',
    intervention_playbook: '/pages/radar/radar',
    outcome_review: '/pages/profile/profile',
    depth_compounding: '/pages/module/module',
    light_entry_evidence: '/pages/daily-math/daily-math',
    share_return: '/pages/profile/profile'
  };
  const surfaceCapabilityMap = {
    home: ['socratic', 'light_entry', 'game', 'parent_action', 'next_action'],
    tutor: ['socratic', 'module_flow', 'parent_action', 'next_action'],
    review: ['socratic', 'game', 'report', 'module_flow', 'next_action'],
    arcade: ['game', 'socratic', 'parent_action', 'next_action'],
    profile: ['report', 'share', 'parent_action', 'surface_action', 'next_action'],
    legal: ['parent_action', 'report', 'share', 'next_action'],
    tools: ['light_entry', 'module_flow', 'game', 'next_action'],
    upload: ['report', 'socratic', 'module_flow', 'next_action'],
    diagnosis: ['socratic', 'report', 'module_flow', 'next_action'],
    focus: ['socratic', 'parent_action', 'surface_action', 'next_action'],
    module: ['module_flow', 'socratic', 'game', 'next_action'],
    radar: ['report', 'parent_action', 'module_flow', 'next_action'],
    daily_math: ['light_entry', 'game', 'socratic', 'next_action'],
    dictation: ['light_entry', 'socratic', 'parent_action', 'next_action'],
    light_diagnosis: ['light_entry', 'socratic', 'module_flow', 'next_action']
  };
  const ledgerRows = capabilityLedger && Array.isArray(capabilityLedger.rows) ? capabilityLedger.rows : [];
  const capabilityCards = (surfaceCapabilityMap[surface] || surfaceCapabilityMap.home)
    .map((id) => ledgerRows.find((item) => item && item.id === id))
    .filter(Boolean)
    .map((item) => ({
      id: item.id,
      label: item.label,
      displayLabel: item.label,
      ready: !!item.ready,
      evidenceLine: item.evidenceLine,
      nextAction: item.nextAction,
      route: item.route
    }));
  const cards = current.focusIds.map((id) => {
    const item = map[id] || {};
    const flow = (moduleFlowCompass.modules || []).find((entry) => entry.id === id) || {};
    return {
      id,
      label: item.name || item.label || id,
      displayLabel: item.name || item.label || id,
      ready: !!(item.status === 'implemented' || item.ready),
      statusLine: item.status === 'implemented' ? '已具备证据' : '还缺证据',
      evidenceLine: Array.isArray(item.evidence) ? item.evidence.filter(Boolean).slice(0, 2).join(' / ') : '',
      gapLine: item.fix || item.gap || '先补本地证据',
      route: flow.route || routeMap[id] || '/pages/home/home',
      moduleLabel: flow.label || ''
    };
  });
  const functionCards = cards;
  const visibleCards = functionCards.concat(capabilityCards.map((item) => ({
    id: item.id,
    label: item.label,
    displayLabel: `能力·${item.label}`,
    ready: !!item.ready,
    statusLine: item.ready ? '已有能力证据' : '能力证据待补',
    evidenceLine: item.evidenceLine,
    gapLine: item.nextAction,
    route: item.route,
    moduleLabel: '能力账本',
    cardType: 'capability'
  })));
  const readyCount = visibleCards.filter((item) => item.ready).length;
  const currentModule = visibleCards.find((item) => !item.ready) || visibleCards[0] || null;
  const storyLine = learningQuestArc && learningQuestArc.currentLabel
    ? `当前剧情：${learningQuestArc.currentLabel} - ${learningQuestArc.currentTitle || learningQuestArc.currentBody || ''}`
    : '当前剧情：先留下第一步，再把练习、家长复盘和隔天回看接起来。';
  const evidenceLine = globalEvidenceBrief && globalEvidenceBrief.reportLine
    ? `证据线：${globalEvidenceBrief.reportLine}`
    : '证据线：先补一条真实学习证据。';
  const routeLine = globalEvidenceBrief && globalEvidenceBrief.shareLine
    ? `流转线：${globalEvidenceBrief.shareLine}`
    : `流转线：下一步进入 ${currentModule && currentModule.displayLabel ? currentModule.displayLabel : current.nextAction}`;
  const capabilityLine = capabilityLedger && capabilityLedger.nextCapability
    ? `能力账本：${capabilityLedger.readyCount}/${capabilityLedger.totalCount}，先补 ${capabilityLedger.nextCapability.label}。${capabilityLedger.nextCapability.evidenceLine || capabilityLedger.nextCapability.nextAction}`
    : '能力账本：继续沉淀孩子思路、练习、家长动作和下一步证据。';
  const capabilityRoute = capabilityLedger && capabilityLedger.nextCapability && capabilityLedger.nextCapability.route
    ? capabilityLedger.nextCapability.route
    : (currentModule && currentModule.route ? currentModule.route : '/pages/home/home');
  const surfaceLoop = {
    title: '入口闭环',
    entry: current.title,
    action: current.nextAction,
    evidence: currentModule && currentModule.ready
      ? (currentModule.evidenceLine || evidenceLine)
      : (currentModule && currentModule.gapLine ? currentModule.gapLine : evidenceLine),
    parent: capabilityLedger && capabilityLedger.parentLine
      ? capabilityLedger.parentLine
      : (learningQuestArc && learningQuestArc.parentHook) || '家长只问一句，确认孩子能不能说出第一步。',
    next: capabilityLedger && capabilityLedger.nextCapability
      ? capabilityLedger.nextCapability.nextAction
      : (currentModule && currentModule.route ? `继续到 ${currentModule.displayLabel}` : current.nextAction),
    route: currentModule && currentModule.route ? currentModule.route : capabilityRoute
  };
  const loopLine = `闭环：进入${surfaceLoop.entry} → ${surfaceLoop.action} → 留下证据：${surfaceLoop.evidence} → 家长看：${surfaceLoop.parent} → 下一步：${surfaceLoop.next}`;
  const familyLine = `${current.benchmark} ${storyLine} ${evidenceLine} ${capabilityLine} ${loopLine}`;
  return {
    surface,
    title: current.title,
    summary: current.summary,
    nextAction: current.nextAction,
    benchmarkLine: current.benchmark,
    storyLine,
    evidenceLine,
    routeLine,
    capabilityLine,
    capabilityRoute,
    surfaceLoop,
    loopLine,
    familyLine,
    readyCount,
    totalCount: visibleCards.length,
    progress: visibleCards.length ? Math.round((readyCount / visibleCards.length) * 100) : 0,
    currentModule,
    primaryRoute: currentModule && currentModule.route ? currentModule.route : '/pages/home/home',
    ledgerPrimaryRoute: capabilityRoute,
    capabilityLedgerSummary: capabilityLedger ? {
      readyCount: capabilityLedger.readyCount,
      totalCount: capabilityLedger.totalCount,
      progress: capabilityLedger.progress,
      nextCapability: capabilityLedger.nextCapability,
      moatLine: capabilityLedger.moatLine
    } : null,
    capabilityCards,
    functionCards,
    cards: visibleCards,
    surfaceReadiness: readyCount >= visibleCards.length ? 'closed' : readyCount >= Math.max(2, Math.ceil(visibleCards.length / 2)) ? 'building' : 'thin',
    acceptanceSignal: readiness && readiness.score ? Number(readiness.score || 0) : 0
  };
}

function buildUnifiedNextActionController(options = {}) {
  const safeRoutes = [
    '/pages/home/home',
    '/pages/tutor/tutor',
    '/pages/review/review',
    '/pages/arcade/arcade',
    '/pages/profile/profile',
    '/pages/focus/focus',
    '/pages/tools/tools',
    '/pages/upload/upload',
    '/pages/diagnosis/diagnosis',
    '/pages/radar/radar',
    '/pages/module/module',
    '/pages/daily-math/daily-math',
    '/pages/dictation/dictation',
    '/pages/light-diagnosis/light-diagnosis'
  ];
  function normalizeRoute(route, fallback = '/pages/tutor/tutor') {
    const value = typeof route === 'string' && route.trim() ? route.trim() : fallback;
    const normalized = value.charAt(0) === '/' ? value : `/${value}`;
    const base = normalized.split('?')[0];
    return safeRoutes.includes(base) ? normalized : fallback;
  }
  function pushCandidate(list, item) {
    if (!item || !item.source) return;
    list.push(Object.assign({}, item, {
      route: normalizeRoute(item.route),
      actionLabel: item.actionLabel || item.action || '\u5148\u5b8c\u6210\u8fd9\u4e00\u6b65',
      reasonLine: item.reasonLine || item.reason || '',
      evidenceLine: item.evidenceLine || item.evidence || ''
    }));
  }

  const reportDailyActionQueue = options.reportDailyActionQueue || buildReportDailyActionQueue(options);
  const evidenceBias = options.evidenceBias || buildEvidenceRouteBias(options);
  const decisionPath = options.learningDecisionPath || buildLearningDecisionPath(options);
  const questArc = options.learningQuestArc || buildLearningQuestArc(options);
  const moduleFlowCompass = options.moduleFlowCompass || buildModuleFlowCompass(options);
  const surfaceDepthPack = options.surfaceDepthPack || buildSurfaceDepthPack(options.surface || 'home', options);
  const candidates = [];

  if (reportDailyActionQueue && reportDailyActionQueue.ready && reportDailyActionQueue.active) {
    pushCandidate(candidates, {
      source: 'report_daily_action',
      sourceLabel: '\u62a5\u544a\u4eca\u65e5\u884c\u52a8',
      route: reportDailyActionQueue.active.route || reportDailyActionQueue.route,
      actionLabel: reportDailyActionQueue.active.task || reportDailyActionQueue.actionLine,
      reasonLine: reportDailyActionQueue.parentLine,
      evidenceLine: reportDailyActionQueue.evidenceLine,
      priority: 95
    });
  }
  if (evidenceBias && evidenceBias.nextRoute && evidenceBias.source && evidenceBias.source !== 'global_evidence') {
    pushCandidate(candidates, {
      source: evidenceBias.source,
      sourceLabel: evidenceBias.source === 'incoming_share' ? '\u5206\u4eab\u56de\u6d41' : evidenceBias.source === 'due_review' ? '\u5230\u671f\u56de\u8bbf' : '\u8bc1\u636e\u504f\u7f6e',
      route: evidenceBias.nextRoute,
      actionLabel: evidenceBias.evidenceLine || '\u5148\u5904\u7406\u6700\u65b0\u8bc1\u636e',
      reasonLine: evidenceBias.reasonLine,
      evidenceLine: evidenceBias.evidenceLine,
      priority: evidenceBias.source === 'incoming_share' ? 100 : 90
    });
  }
  if (decisionPath && decisionPath.route) {
    pushCandidate(candidates, {
      source: 'decision_path',
      sourceLabel: '\u5b66\u4e60\u51b3\u7b56\u8def\u5f84',
      route: decisionPath.route,
      actionLabel: decisionPath.action,
      reasonLine: decisionPath.reason,
      evidenceLine: decisionPath.weeklyPattern,
      priority: 80
    });
  }
  if (questArc && questArc.currentActionLabel) {
    pushCandidate(candidates, {
      source: 'quest_arc',
      sourceLabel: '\u5b66\u4e60\u5267\u60c5\u7ebf',
      route: decisionPath && decisionPath.route ? decisionPath.route : '/pages/tutor/tutor',
      actionLabel: questArc.currentActionLabel,
      reasonLine: questArc.currentBody || questArc.summary,
      evidenceLine: questArc.currentTitle,
      priority: 70
    });
  }
  if (moduleFlowCompass && moduleFlowCompass.currentRoute) {
    pushCandidate(candidates, {
      source: 'module_flow',
      sourceLabel: '\u6a21\u5757\u6d41\u8f6c\u7f57\u76d8',
      route: moduleFlowCompass.currentRoute,
      actionLabel: moduleFlowCompass.currentNextAction,
      reasonLine: moduleFlowCompass.currentEvidence,
      evidenceLine: moduleFlowCompass.currentLabel,
      priority: 60
    });
  }
  if (surfaceDepthPack && surfaceDepthPack.primaryRoute) {
    pushCandidate(candidates, {
      source: 'surface_depth',
      sourceLabel: '\u677f\u5757\u539a\u5ea6\u5305',
      route: surfaceDepthPack.primaryRoute,
      actionLabel: surfaceDepthPack.nextAction,
      reasonLine: surfaceDepthPack.familyLine || surfaceDepthPack.summary,
      evidenceLine: surfaceDepthPack.currentModule && surfaceDepthPack.currentModule.displayLabel,
      priority: 50
    });
  }

  const sorted = candidates
    .filter((item) => item.route)
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
  const primary = sorted[0] || {
    source: 'fallback_first_step',
    sourceLabel: '\u7b2c\u4e00\u6b65',
    route: '/pages/tutor/tutor',
    actionLabel: '\u5148\u8ba9\u5b69\u5b50\u8bf4\u51fa\u7b2c\u4e00\u6b65',
    reasonLine: '\u8bc1\u636e\u8fd8\u4e0d\u8db3\uff0c\u4e0d\u731c\u6d4b\u7b54\u6848\uff0c\u5148\u7559\u4e0b\u4e00\u6761\u771f\u5b9e\u601d\u8def\u3002',
    evidenceLine: '\u5f85\u8865\u7b2c\u4e00\u6b65\u8bc1\u636e',
    priority: 40
  };
  return Object.assign({}, primary, {
    title: '\u5f53\u524d\u7cfb\u7edf\u5efa\u8bae\u4e0b\u4e00\u6b65',
    summary: `${primary.sourceLabel}\uff1a${primary.actionLabel}`,
    candidates: sorted.slice(0, 5),
    candidateCount: sorted.length,
    route: normalizeRoute(primary.route),
    readinessLine: sorted.length >= 5
      ? '\u62a5\u544a\u3001\u8bc1\u636e\u3001\u5267\u60c5\u3001\u6e38\u620f\u548c\u6a21\u5757\u6d41\u8f6c\u5df2\u8fdb\u5165\u540c\u4e00\u4e2a\u8c03\u5ea6\u5668\u3002'
      : '\u8fd8\u6709\u6a21\u5757\u9700\u8981\u8865\u8bc1\u636e\uff0c\u4f46\u5f53\u524d\u4e0b\u4e00\u6b65\u5df2\u53ef\u6267\u884c\u3002'
  });
}

function topCountKey(counter) {
  return Object.keys(counter || {}).sort((a, b) => counter[b] - counter[a])[0] || '';
}

function familyCalibrationProfile() {
  const feedbackList = loadFeedback();
  const moduleEvents = loadModuleEvents();
  const moduleFeedback = loadModuleFeedback();
  const tutorEvents = loadTutorEvents();
  const reviewEvents = loadReviewEvents();
  const reviewCards = loadReviewCards();
  const reviewNotes = loadReviewNotes();
  const profile = loadProfile();
  const state = loadState() || {};

  const accurate = feedbackList.filter((item) => item.rating === 'accurate').length;
  const off = feedbackList.filter((item) => item.rating === 'off').length;
  const viewed = moduleEvents.filter((item) => item.event === 'module_viewed').length;
  const started = moduleEvents.filter((item) => item.event === 'module_started').length;
  const useful = moduleFeedback.filter((item) => item.rating === 'useful').length;
  const notUseful = moduleFeedback.filter((item) => item.rating === 'not_useful').length;
  const tutorCompleted = tutorEvents.filter((item) => item.event === 'tutor_mastery_ready').length;
  const tutorBlocked = tutorEvents.filter((item) => item.blocked || item.mastery_status === 'blocked_answer_request').length;
  const reviewed = reviewEvents.length;
  const reviewGood = reviewEvents.filter((item) => ['good', 'easy'].includes(item.rating)).length;

  const subjectCounter = {};
  moduleEvents.concat(moduleFeedback).forEach((item) => {
    if (!item.subject) return;
    subjectCounter[item.subject] = (subjectCounter[item.subject] || 0) + 1;
  });

  const calibrationCounter = {};
  feedbackList.forEach((item) => {
    if (!item.calibration_key) return;
    calibrationCounter[item.calibration_key] = (calibrationCounter[item.calibration_key] || 0) + 1;
  });

  const topSubject = topCountKey(subjectCounter) || profile.subject || '';
  const topCalibrationKey = topCountKey(calibrationCounter);
  const topWeakPoint = (((state.weak_points || [])[0] || {}).name) || '';
  const homeworkTotal = accurate + off;
  const moduleFeedbackTotal = useful + notUseful;
  const accuracyRate = homeworkTotal ? Math.round((accurate / homeworkTotal) * 100) : 0;
  const fitRate = moduleFeedbackTotal ? Math.round((useful / moduleFeedbackTotal) * 100) : 0;
  const startRate = viewed ? Math.round((started / viewed) * 100) : 0;
  const moduleCompletionRate = started ? Math.round((tutorCompleted / started) * 100) : 0;

  const signals = [];

  if (homeworkTotal >= 3) {
    signals.push(
      accuracyRate >= 70 ? '作业判断开始贴近真实情况' : '作业判断还需要继续校准'
    );
  } else if (homeworkTotal > 0) {
    signals.push('已开始积累作业判断校准记录');
  }

  if (moduleFeedbackTotal >= 3) {
    signals.push(
      fitRate >= 60 ? '学习模块适配度开始收敛' : '学习模块仍在探索更适合的练法'
    );
  } else if (viewed || started) {
    signals.push('已开始积累学习模块适配反馈');
  }

  if (topSubject) {
    signals.push(`高频学科：${topSubject}`);
  }

  if (tutorCompleted) {
    signals.push(`作业点拨已形成 ${tutorCompleted} 次掌握记录`);
  }

  if (tutorBlocked) {
    signals.push(`出现 ${tutorBlocked} 次直接要答案倾向`);
  }

  if (reviewed) {
    signals.push(`已完成 ${reviewed} 次错因复习`);
  }

  if (topWeakPoint) {
    signals.push(`当前高频卡点：${topWeakPoint}`);
  }

  if (topCalibrationKey) {
    signals.push(`最常出现的校准点：${topCalibrationKey}`);
  }

  let label = '还没有足够记录形成画像';
  if (homeworkTotal || viewed || started || moduleFeedbackTotal) {
    label = '正在形成家庭校准画像';
  }
  if (homeworkTotal >= 3 && moduleFeedbackTotal >= 3) {
    label = accuracyRate >= 70 && fitRate >= 60
      ? '已形成初步家庭校准画像'
      : '已有画像雏形，仍需继续校准';
  }

  return {
    homework: {
      total: homeworkTotal,
      accurate,
      off,
      accuracyRate,
      topCalibrationKey
    },
    modules: {
      viewed,
      started,
      useful,
      notUseful,
      fitRate,
      startRate,
      completed: tutorCompleted,
      completionRate: moduleCompletionRate,
      topSubject
    },
    tutor: tutorEventSummary(),
    review: {
      totalCards: reviewCards.length,
      totalNotes: reviewNotes.length,
      reviewed,
      accuracyRate: reviewed ? Math.round((reviewGood / reviewed) * 100) : 0
    },
    weakPoint: topWeakPoint,
    signals: signals.slice(0, 5),
    label
  };
}

module.exports = {
  KEYS,
  ensureLocalUserId,
  getLocalUserId,
  getUserKey,
  COMPANION_OPTIONS,
  get,
  set,
  remove,
  clearLearningData,
  loadLocalAnalytics,
  recordLocalAnalytics,
  localAnalyticsDashboard,
  isFirstTime,
  markFirstRunGuideSeen,
  loadInviteLedger,
  recordInvite,
  loadLocalFeedback,
  saveLocalFeedback,
  loadCompanionPreference,
  saveCompanionPreference,
  companionCopyFor,
  getCompanionStageCopy,
  formatCompanionLine,
  classifyIssueType,
  isValidMiniActionText,
  detectTaskType,
  firstStepTemplatesForTaskType,
  suggestedStepForTaskType,
  buildSubjectSkillDepth,
  buildSocraticAssessmentMatrix,
  buildCurriculumSpine,
  buildVisualSocraticMatrix,
  buildFirstStepBlackboardBlueprint,
  buildLightEntrySeedBank,
  buildSubjectSeedLibrary,
  buildCourseUnitMap,
  buildCourseUnitMasteryTrajectory,
  childStepQuality,
  normalizeFirstStepEvidence,
  saveChildArticulatedStep,
  formatIssueType,
  formatRouteStage,
  formatSourceLabel,
  formatInternalLabel,
  getGrowthMemoryLine,
  growthMemoryCopyFor,
  buildWeeklyGrowthMemory,
  loadState,
  saveState,
  loadProfile,
  saveProfile,
  loadLearningReportState,
  saveLearningReportState,
  saveLearningReportSource,
  buildLearningReportFromInput,
  buildReportDailyActionQueue,
  loadParentGoal,
  saveParentGoal,
  loadTodayFocus,
  saveTodayFocus,
  saveTodayFocusFromThought,
  updateTodayFocusRepair,
  getTodaySession,
  saveTodaySession,
  archiveYesterdaySession,
  getYesterdayReview,
  generateReviewCard,
  recordFocusSessionEvidence,
  markReviewCardRevisited,
  canStartFocusFromTodaySession,
  parentQuestionFromFirstStep,
  wrongCauseFromFirstStep,
  isYesterday,
  buildFirstStepPromptCard,
  buildLocalScenarioLoopCases,
  applyLocalScenarioLoopCase,
  buildBlackboardHint,
  ensureTodayFocusReviewCard,
  loadTonightPlan,
  saveTonightPlan,
  createTonightPlanFromInput,
  updateTonightRouteStatus,
  loadFeedback,
  appendFeedback,
  feedbackSummary,
  loadPilotRuns,
  appendPilotRun,
  pilotRunSummary,
  loadFactoryEvents,
  appendFactoryEvent,
  factoryEventSummary,
  loadModuleEvents,
  trackModuleEvent,
  moduleEventSummary,
  loadModuleFeedback,
  appendModuleFeedback,
  moduleFeedbackMap,
  loadSurfaceDepthEvents,
  inferSurfaceDepthCapability,
  recordSurfaceDepthAction,
  buildSurfaceDepthActionSummary,
  loadUnifiedActionEvents,
  recordUnifiedNextAction,
  buildUnifiedNextActionSummary,
  buildEvidenceRouteBias,
  loadTutorEvents,
  trackTutorEvent,
  tutorEventSummary,
  loadThinkingReceipts,
  appendThinkingReceipt,
  thinkingReceiptSummary,
  loadReviewDeck,
  saveReviewDeck,
  loadReviewNotes,
  saveReviewNotes,
  loadReviewCards,
  saveReviewCards,
  loadReviewEvents,
  appendReviewEvent,
  loadGameProfile,
  saveGameProfile,
  recordDailyLearningQuestSignal,
  addGameXP,
  recordGameSessionResult,
  loadGamePurchases,
  saveGamePurchase,
  loadShareRuns,
  loadIncomingShare,
  buildShareChallengePlan,
  saveIncomingShare,
  appendShareRun,
  loadClientIdentity,
  saveClientIdentity,
  loadSyncState,
  saveSyncState,
  loadSyncQueue,
  appendSyncMutation,
  markSyncAttempt,
  syncDiagnostics,
  buildLearningSyncSnapshot,
  createLocalBackup,
  queueLearningSyncSnapshot,
  buildRecentLearningSummary,
  buildProductReadiness,
  buildAcceptanceReport,
  loadReviewLoop,
  saveReviewLoop,
  updateReviewLoopForRating,
  claimReviewReward,
  localLeaderboardSnapshot,
  loadUserFirstStepProfile,
  saveUserFirstStepProfile,
  loadTaskTypePattern,
  saveTaskTypePattern,
  taskTypeLabel,
  deepScaffoldingTemplates,
  buildSecondStepHint,
  recordFirstStepEvent,
  recordLightFeatureFirstStep,
  loadLightFeatureEvents,
  buildLightFeatureEvidenceSummary,
  detectAvoidancePattern,
  loadParentInterventionLog,
  appendParentInterventionLog,
  loadScaffoldingChains,
  saveScaffoldingChains,
  createScaffoldingChain,
  appendScaffoldingStep,
  buildTransferPracticeSet,
  recordTransferPracticeAttempt,
  recordParentReflectionReceipt,
  buildParentReflectionSummary,
  buildWeeklyPatternSynthesis,
  buildLearningDecisionPath,
  buildMasteryRubric,
  buildInterventionPlaybook,
  recordOutcomeCheck,
  buildOutcomeReviewSummary,
  buildParentActionGuide,
  buildLearningDepthMap,
  buildGlobalEvidenceBrief,
  buildCapabilityEvidenceLedger,
  buildCapabilityMaturityQueue,
  buildUnifiedNextActionController,
  buildLearningQuestArc,
  buildQuestArcGameBridge,
  buildModuleFlowCompass,
  buildSurfaceDepthPack,
  recordQuestArcGameSignal,
  buildExperienceChecklist,
  loadValidationSprintState,
  saveValidationSprintState,
  appendValidationEvent,
  recordLightEntryCompletion,
  recordLightToCoreTransition,
  recordCoreLoopEntry,
  recordProfileVisit,
  recordServiceIntent,
  recordParentPauseUsed,
  recordParentPostPauseBehavior,
  saveBetaTester,
  isBetaTester,
  validationEventsByType,
  calculateValidationDashboard,
  familyCalibrationProfile
};
