'use strict';

const DAY_MS = 24 * 60 * 60 * 1000;

const XP_REWARDS = {
  new_card: 10,
  quiz_correct: 20,
  daily_review_complete: 30,
  review_again: 4,
  review_fuzzy: 8,
  review_remembered: 12,
  review_easy: 16,
  wrong_cause_repaired: 15,
  study_pack_created: 20
};

const LEVEL_TITLES = ['新手', '起步', '会学', '学霸', '学神'];

const ACHIEVEMENTS = [
  { id: 'first_review', title: '初出茅庐', description: '完成第一次复习', recordPoints: 20, test: (stats) => Number(stats.review_count || 0) >= 1 },
  { id: 'hundred_correct', title: '百题斩', description: '累计答对 100 题', recordPoints: 80, test: (stats) => Number(stats.correct_count || 0) >= 100 },
  { id: 'seven_day_streak', title: '七日之约', description: '连续 7 天完成复习', recordPoints: 70, test: (stats) => Number(stats.streak || 0) >= 7 },
  {
    id: 'quiz_master_3',
    title: '考神附体',
    description: '连续 3 次小测正确率达到 90%',
    recordPoints: 90,
    test: (stats) => {
      const recent = Array.isArray(stats.recent_quiz_accuracy) ? stats.recent_quiz_accuracy.slice(-3) : [];
      return recent.length >= 3 && recent.every((item) => Number(item || 0) >= 90);
    }
  },
  { id: 'whole_book', title: '全书贯通', description: '学完一本教材的全部知识点', recordPoints: 120, test: (stats) => Number(stats.completed_books || 0) >= 1 }
];

const SHOP_ITEMS = [
  { id: 'avatar_origin_gold', type: 'avatar_frame', title: '原点金色头像框', recordCost: 60, description: '装饰性头像框，不影响学习收益。' },
  { id: 'theme_forest_focus', type: 'theme', title: '森林专注主题', recordCost: 90, description: '深绿护眼轻练主题。' },
  { id: 'card_warm_grid', type: 'card_back', title: '暖色网格卡背', recordCost: 50, description: '闪卡背面装饰。' },
  { id: 'streak_freeze', type: 'streak_freeze', title: '补签卡', recordCost: 180, description: '保护一次断签，只能用本机学习点换取。' }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isoDate(date) {
  return (date || new Date()).toISOString().slice(0, 10);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS).toISOString();
}

function daysBetween(a, b) {
  const start = new Date(`${a}T00:00:00.000Z`).getTime();
  const end = new Date(`${b}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.round((end - start) / DAY_MS);
}

function calculateXP(actionType, streakMultiplierValue) {
  const base = XP_REWARDS[actionType] || 0;
  const multiplier = clamp(Number(streakMultiplierValue || 1), 1, 5);
  return Math.round(base * multiplier);
}

function streakMultiplier(streak) {
  const value = Number(streak || 0);
  if (value >= 100) return 3;
  if (value >= 30) return 2;
  if (value >= 7) return 1.5;
  return 1;
}

function getLevel(xp) {
  const total = Math.max(0, Number(xp || 0));
  const level = Math.floor(Math.sqrt(total / 100));
  const currentFloor = Math.pow(level, 2) * 100;
  const nextLevelXp = Math.pow(level + 1, 2) * 100;
  return {
    level,
    title: LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)],
    currentXp: total,
    nextLevelXp,
    progress: nextLevelXp > currentFloor
      ? Math.round(((total - currentFloor) / (nextLevelXp - currentFloor)) * 100)
      : 100
  };
}

function applySM2(card, grade, now) {
  const currentCard = card || {};
  const reviewAt = now || new Date();
  const current = {
    repetitions: Math.max(0, Number(currentCard.repetitions ?? currentCard.reps ?? 0)),
    interval: Math.max(0, Number(currentCard.interval || 0)),
    ease_factor: Number(currentCard.ease_factor || currentCard.easeFactor || 2.5)
  };
  let repetitions = current.repetitions;
  let interval = current.interval;
  let easeFactor = current.ease_factor;

  if (grade === 'forgotten' || grade === 'again') {
    repetitions = 0;
    interval = 1;
    easeFactor = 2.5;
  } else if (grade === 'fuzzy' || grade === 'hard') {
    interval = Math.max(1, Math.round(interval * 0.5));
    easeFactor = clamp(easeFactor - 0.15, 1.3, 3.2);
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 3;
    else interval = Math.max(1, Math.round(Math.max(1, interval) * easeFactor));
    easeFactor = clamp(easeFactor + (grade === 'easy' ? 0.2 : 0.1), 1.3, 3.2);
  }

  return Object.assign({}, currentCard, {
    repetitions,
    interval,
    ease_factor: Number(easeFactor.toFixed(2)),
    last_review: reviewAt.toISOString(),
    next_review: addDays(reviewAt, interval)
  });
}

function updateStreak(user, options) {
  const profile = user || {};
  const opts = options || {};
  const reviewedToday = Number(opts.reviewedToday || 0);
  const threshold = Number(opts.threshold || 10);
  const today = isoDate(opts.now || new Date());
  const last = profile.last_study_date || '';
  const current = Number(profile.streak || 0);
  const freezes = Math.max(0, Number(profile.streak_freezes || profile.streak_freeze || 0));

  if (reviewedToday < threshold) {
    return Object.assign({}, profile, {
      streak: last && daysBetween(last, today) > 1 ? 0 : current,
      best_streak: Math.max(Number(profile.best_streak || 0), current)
    });
  }

  if (last === today) {
    return Object.assign({}, profile, {
      best_streak: Math.max(Number(profile.best_streak || 0), current),
      last_study_date: today
    });
  }

  const gap = last ? daysBetween(last, today) : 0;
  const missed = Math.max(0, gap - 1);
  const canProtect = missed > 0 && freezes >= missed;
  const nextStreak = !last ? 1 : (gap <= 1 || canProtect ? current + 1 : 1);
  const usedFreezes = canProtect ? missed : 0;

  return Object.assign({}, profile, {
    streak: nextStreak,
    best_streak: Math.max(Number(profile.best_streak || 0), nextStreak),
    streak_freezes: Math.max(0, freezes - usedFreezes),
    last_study_date: today
  });
}

function checkAndUnlockAchievements(stats) {
  const currentStats = stats || {};
  const currentAchievements = Array.isArray(currentStats.achievements) ? currentStats.achievements : [];
  const existing = new Set(currentAchievements);
  const newlyUnlocked = ACHIEVEMENTS.filter((achievement) => !existing.has(achievement.id) && achievement.test(currentStats));
  return {
    achievements: Array.from(new Set(currentAchievements.concat(newlyUnlocked.map((item) => item.id)))),
    newlyUnlocked,
    recordPointsAwarded: newlyUnlocked.reduce((sum, item) => sum + Number(item.recordPoints || 0), 0)
  };
}

function listAchievements(unlocked) {
  const owned = new Set(Array.isArray(unlocked) ? unlocked : []);
  return ACHIEVEMENTS.map((item) => Object.assign({}, item, { unlocked: owned.has(item.id) }));
}

function listShopItems(inventory) {
  const owned = new Set((Array.isArray(inventory) ? inventory : []).map((item) => item.item_id || item.id));
  return SHOP_ITEMS.map((item) => Object.assign({}, item, { owned: owned.has(item.id) }));
}

function purchaseShopItem(user, item) {
  const profile = user || {};
  const shopItem = item && item.id ? item : SHOP_ITEMS.find((entry) => entry.id === item);
  if (!shopItem || !shopItem.id) return { ok: false, error: 'item_not_found', user: profile };
  return {
    ok: false,
    error: 'catalog_only',
    message: '当前只展示本机装饰记录，不提供交易功能。',
    user: profile,
    item: shopItem
  };
}

function capDailyXP(currentDailyXp, delta, cap) {
  const current = Math.max(0, Number(currentDailyXp || 0));
  const requested = Math.max(0, Number(delta || 0));
  const allowed = Math.max(0, Math.min(requested, Number(cap || 500) - current));
  return { allowed, capped: allowed < requested, total: current + allowed };
}

function quizQuestionFromCard(card) {
  const currentCard = card || {};
  const answer = String(currentCard.answer || '').trim();
  const distractors = ['先看题目条件再判断', '把概念和例题混在一起', '只记答案不说原因']
    .filter((item) => item !== answer)
    .slice(0, 3);
  return {
    id: `quiz_${currentCard.id || Date.now()}`,
    card_id: currentCard.id || '',
    type: answer.length <= 16 ? 'choice' : 'short_answer',
    question: currentCard.question || '',
    answer,
    options: answer.length <= 16 ? [answer].concat(distractors).slice(0, 4) : [],
    explanation: currentCard.hint || currentCard.weakPoint || '先回忆，再对照答案说出错因。'
  };
}

function buildKnowledgeGap(events, cards) {
  const gaps = {};
  (Array.isArray(events) ? events : []).forEach((event) => {
    if (!event || !['again', 'forgotten', 'wrong'].includes(event.rating || event.result)) return;
    const key = event.weakPoint || event.knowledge_point || event.subject || '未标注';
    if (!gaps[key]) gaps[key] = { key, count: 0, subjects: {} };
    gaps[key].count += 1;
    if (event.subject) gaps[key].subjects[event.subject] = (gaps[key].subjects[event.subject] || 0) + 1;
  });
  const list = Array.isArray(cards) ? cards : [];
  return Object.values(gaps).sort((a, b) => b.count - a.count).slice(0, 8).map((item) => Object.assign({}, item, {
    next_action: list.some((card) => card.weakPoint === item.key) ? '复习相关卡片' : '补充一张错因卡'
  }));
}

function dueCardCount(cards = [], now = new Date()) {
  const nowTime = now.getTime();
  return (Array.isArray(cards) ? cards : []).filter((card) => {
    const due = new Date(card.next_review || card.due || card.dueDate || 0).getTime();
    return !Number.isFinite(due) || due <= nowTime;
  }).length;
}

function normalizeEvidenceBias(input = {}) {
  const allowedRoutes = [
    '/pages/tutor/tutor',
    '/pages/review/review',
    '/pages/arcade/arcade',
    '/pages/profile/profile',
    '/pages/focus/focus',
    '/pages/home/home'
  ];
  const route = allowedRoutes.includes(input.nextRoute) ? input.nextRoute : '/pages/tutor/tutor';
  const mode = ['repair', 'stretch', 'balanced'].includes(input.gameModeBias) ? input.gameModeBias : 'balanced';
  return Object.assign({}, input, {
    nextRoute: route,
    gameModeBias: mode,
    weakKey: input.weakKey || 'first_step',
    questBias: input.questBias || 'socratic'
  });
}

function buildDailyQuestSet(profile = {}, cards = [], events = [], options = {}) {
  const now = options.now || new Date();
  const evidenceBias = options.evidenceBias ? normalizeEvidenceBias(options.evidenceBias) : null;
  const due = dueCardCount(cards, now);
  const gaps = buildKnowledgeGap(events, cards);
  const reviewedToday = Number(profile.reviewed_today || profile.reviewedToday || 0);
  const correctToday = Number(profile.correct_today || profile.correctToday || 0);
  const accuracy = reviewedToday ? Math.round((correctToday / reviewedToday) * 100) : 0;
  const weakKey = gaps[0] && gaps[0].key ? gaps[0].key : 'first_step';
  const repairTarget = Math.max(1, Math.min(3, due || (Array.isArray(cards) ? cards.length : 0) || 1));
  const base = [
    {
      id: 'quest_first_step',
      kind: 'socratic',
      target: 1,
      progress: Number(profile.first_step_count || 0) > 0 ? 1 : 0,
      rewardXp: calculateXP('new_card', streakMultiplier(profile.streak)),
      route: '/pages/tutor/tutor',
      evidenceRequired: ['student_first_step']
    },
    {
      id: 'quest_repair_due_cards',
      kind: 'review',
      target: repairTarget,
      progress: Math.min(Math.max(0, reviewedToday), repairTarget),
      rewardXp: calculateXP('wrong_cause_repaired', streakMultiplier(profile.streak)),
      route: '/pages/review/review',
      evidenceRequired: ['wrong_cause', 'next_practice_plan']
    },
    {
      id: 'quest_focus_round',
      kind: 'focus',
      target: 1,
      progress: Number(profile.focus_rounds_today || profile.focusRoundsToday || 0) > 0 ? 1 : 0,
      rewardXp: calculateXP('daily_review_complete', streakMultiplier(profile.streak)),
      route: '/pages/focus/focus',
      evidenceRequired: ['focus_seconds', 'parent_recap']
    },
    {
      id: 'quest_arcade_precision',
      kind: 'arcade',
      target: 80,
      progress: accuracy,
      rewardXp: calculateXP('quiz_correct', streakMultiplier(profile.streak)),
      route: '/pages/arcade/arcade',
      evidenceRequired: ['accuracy', 'wrong_answers_returned']
    }
  ];
  const bossQuest = {
    id: 'quest_boss_gap',
    kind: 'boss_gap',
    target: 1,
    progress: gaps.length ? 0 : 1,
    rewardXp: calculateXP('wrong_cause_repaired', streakMultiplier(profile.streak)),
    route: '/pages/review/review',
    evidenceRequired: ['top_gap', 'repair_card']
  };
  const evidenceQuest = evidenceBias ? {
    id: 'quest_evidence_return',
    kind: evidenceBias.questBias || 'evidence',
    target: 1,
    progress: Number(profile.evidence_return_count || profile.evidenceReturnCount || 0) > 0 ? 1 : 0,
    rewardXp: calculateXP('daily_review_complete', streakMultiplier(profile.streak)),
    route: evidenceBias.nextRoute,
    evidenceRequired: ['global_evidence', evidenceBias.weakKey || 'next_step'],
    source: evidenceBias.source || 'global_evidence',
    reasonLine: evidenceBias.reasonLine || ''
  } : null;
  const prioritized = evidenceQuest
    ? [evidenceQuest].concat(gaps.length ? [bossQuest] : [], base)
    : (gaps.length ? [bossQuest].concat(base) : base);
  const visibleQuests = prioritized.slice(0, 4);
  return {
    date: isoDate(now),
    dueCards: due,
    weakKey: evidenceBias && evidenceBias.weakKey ? evidenceBias.weakKey : weakKey,
    quests: visibleQuests,
    evidenceBias,
    completionRate: visibleQuests.length ? Math.round((visibleQuests.filter((item) => item.progress >= item.target).length / visibleQuests.length) * 100) : 0
  };
}

function buildAdaptiveChallenge(cards = [], events = [], profile = {}, options = {}) {
  const evidenceBias = options.evidenceBias ? normalizeEvidenceBias(options.evidenceBias) : null;
  const reviewed = Number(profile.reviewed_today || profile.reviewedToday || 0);
  const correct = Number(profile.correct_today || profile.correctToday || 0);
  const accuracy = reviewed ? Math.round((correct / reviewed) * 100) : Number(options.defaultAccuracy || 70);
  const gaps = buildKnowledgeGap(events, cards);
  const due = dueCardCount(cards, options.now || new Date());
  const baseMode = accuracy < 60 || gaps.length >= 2
    ? 'repair'
    : accuracy >= 85 && due <= 3
      ? 'stretch'
      : 'balanced';
  const mode = evidenceBias && evidenceBias.gameModeBias === 'repair'
    ? 'repair'
    : evidenceBias && evidenceBias.gameModeBias === 'stretch' && accuracy >= 75 && due <= 4
      ? 'stretch'
      : baseMode;
  const roundSize = mode === 'repair' ? 4 : mode === 'stretch' ? 8 : 6;
  return {
    mode,
    roundSize,
    lives: mode === 'repair' ? 4 : 3,
    targetAccuracy: mode === 'stretch' ? 90 : mode === 'repair' ? 70 : 80,
    bossCard: gaps[0] ? {
      key: gaps[0].key,
      count: gaps[0].count,
      nextAction: gaps[0].next_action
    } : evidenceBias && evidenceBias.weakKey ? {
      key: evidenceBias.weakKey,
      count: 1,
      nextAction: evidenceBias.reasonLine || evidenceBias.weakKey
    } : null,
    mix: {
      due: Math.min(due, roundSize),
      newCards: Math.max(0, roundSize - Math.min(due, roundSize)),
      repairBias: mode === 'repair' ? 'high' : 'normal',
      evidenceBias: evidenceBias ? evidenceBias.questBias : ''
    },
    evidenceBias,
    rationale: mode === 'repair'
      ? 'recent misses need a smaller repair round'
      : mode === 'stretch'
        ? 'recent accuracy supports a harder transfer round'
        : 'balanced review keeps recall stable'
  };
}

function buildGameRetentionLoop(profile = {}, result = {}, challenge = {}, questSet = {}, options = {}) {
  const total = Math.max(1, Number(result.total || result.expectedTotal || 1));
  const correct = Math.max(0, Number(result.correct || 0));
  const wrong = Math.max(0, Number(result.wrong || Math.max(0, total - correct)));
  const accuracy = Number.isFinite(Number(result.accuracy))
    ? Number(result.accuracy)
    : Math.round((correct / total) * 100);
  const targetAccuracy = Number(challenge.targetAccuracy || 80);
  const mode = challenge.mode || 'balanced';
  const weakKey = (challenge.bossCard && (challenge.bossCard.nextAction || challenge.bossCard.key))
    || questSet.weakKey
    || options.weakKey
    || '第一步';
  const streak = Number((profile && profile.streak) || 0);
  const reviewedToday = Number((profile && (profile.reviewed_today || profile.reviewedToday)) || 0);
  const xp = Math.max(0, Number(result.xp || 0));
  const needsRepair = wrong > 0 || accuracy < targetAccuracy;
  const nextRoute = needsRepair ? '/pages/review/review' : (mode === 'stretch' ? '/pages/tutor/tutor' : '/pages/focus/focus');
  const nextMode = needsRepair ? 'repair' : (mode === 'stretch' ? 'transfer' : 'steady');
  const nextRoundSize = needsRepair
    ? Math.max(3, Math.min(4, Number(challenge.roundSize || 4)))
    : Math.max(4, Math.min(8, Number(challenge.roundSize || 6)));
  const questNames = Array.isArray(questSet.quests)
    ? questSet.quests.slice(0, 2).map((item) => item.id).filter(Boolean)
    : [];

  return {
    title: needsRepair ? '下一局先修断点' : '下一步继续迁移',
    mode: nextMode,
    riskLevel: needsRepair ? 'attention' : 'stable',
    loopLine: `本局 ${correct}/${total}，不是单次得分，会写回错因、复习队列和家长报告。`,
    nextRoundLine: needsRepair
      ? `下一局缩小到 ${nextRoundSize} 题，只练 ${weakKey}。`
      : `下一步用 ${nextRoundSize} 题做迁移，确认孩子能换题也说出第一步。`,
    wrongCauseReturnLine: needsRepair
      ? `错的 ${wrong} 张会回到修卡点和间隔复习，不靠重刷蒙过。`
      : '本局没有明显断点，保留为可分享的掌握证据。',
    tomorrowLine: reviewedToday >= 6
      ? '明天只回访最不稳的一张卡，避免把轻练习变成刷题。'
      : '明天从同一张卡的第一步开始回访，家长只问一句。',
    xpLine: xp > 0 ? `本局写入 ${xp} 点学习记录。` : '本局先写入行为证据，不做虚拟奖励交易。',
    habitCue: streak > 0
      ? `连续 ${streak} 天记录已保留，下一次只接着补一小步。`
      : '先建立第一次回访记录，再谈连续习惯。',
    nextRoute,
    evidenceRequired: ['accuracy', 'wrong_answers_returned', 'next_round_plan', 'parent_report_signal'],
    questAnchors: questNames,
    weakKey
  };
}

function buildMemoryFeedbackController(cards = [], events = [], result = {}, retention = {}, options = {}) {
  const safeCards = Array.isArray(cards) ? cards : [];
  const safeEvents = Array.isArray(events) ? events : [];
  const wrong = Math.max(0, Number(result.wrong || 0));
  const accuracy = Number.isFinite(Number(result.accuracy)) ? Number(result.accuracy) : 0;
  const stickyCards = safeCards.filter((card) => card.leech || Number(card.lapses || 0) >= 2);
  const recentWrongCauseEvents = safeEvents
    .filter((event) => /wrong|错|repair|leech|again/.test(String(event.type || event.event || event.name || '')))
    .slice(-6);
  const weakKey = retention.weakKey || options.weakKey || (stickyCards[0] && (stickyCards[0].wrongCauseLabel || stickyCards[0].weakPoint)) || '第一步';
  const triggered = wrong > 0 || stickyCards.length > 0 || accuracy < Number(options.targetAccuracy || 80);
  const severity = stickyCards.length >= 2 || wrong >= 3 || accuracy < 50
    ? 'high'
    : triggered
      ? 'watch'
      : 'stable';
  const triggerSignals = [
    wrong > 0 ? `本局错 ${wrong} 张` : '',
    stickyCards.length ? `${stickyCards.length} 张顽固错因卡` : '',
    recentWrongCauseEvents.length >= 2 ? `最近 ${recentWrongCauseEvents.length} 次错因事件` : ''
  ].filter(Boolean);
  return {
    id: 'memory_feedback_controller',
    title: triggered ? '记忆负反馈已启动' : '记忆反馈稳定',
    severity,
    triggered,
    weakKey,
    triggerSignals: triggerSignals.length ? triggerSignals : ['本局暂未触发降级'],
    interventionSteps: triggered
      ? [
        `暂停加题量，只练「${weakKey}」的第一步`,
        '错因卡回到今天和明天的回访队列',
        '连续两次说清第一步后，再开放变式练习'
      ]
      : [
        '保持 3 张主动回忆',
        '明天回访 1 张最不稳的卡',
        '第 7 天做一题小变式'
      ],
    xpThrottle: triggered
      ? '本轮 XP 只给主动回忆和错因修复，不奖励盲刷题量。'
      : '本轮 XP 可进入巩固，但仍以次日回访为准。',
    nextReview: triggered
      ? `下一次先回到「${weakKey}」小黑板。`
      : '下一次可做小变式，但仍要先说第一步。',
    parentLine: triggered
      ? `家长复盘只问：${weakKey} 这一步，你明天还能自己说出来吗？`
      : '家长只确认孩子是否能复述第一步，不追问分数。',
    evidenceRequired: ['wrong_cause_return', 'xp_throttle', 'next_day_revisit', 'parent_feedback_line']
  };
}

function buildRecallIntensityPlan(weakKey = '第一步', needsRepair = false, result = {}) {
  const accuracy = Number.isFinite(Number(result.accuracy)) ? Number(result.accuracy) : 0;
  const wrong = Math.max(0, Number(result.wrong || 0));
  const tier = needsRepair || wrong > 0 || accuracy < 80 ? 'repair' : 'stretch';
  return {
    id: 'recall_intensity_plan',
    tier,
    title: tier === 'repair' ? '三轮修复节奏' : '三轮迁移节奏',
    rounds: [
      { id: 'now', label: '现在', size: tier === 'repair' ? 3 : 4, rule: `只回忆「${weakKey}」第一步，答不出就降到二选一。`, route: '/pages/review/review' },
      { id: 'tomorrow', label: '明天', size: 1, rule: `只抽最不稳 1 张，确认不是当场会、转身忘。`, route: '/pages/review/review' },
      { id: 'day7', label: '第 7 天', size: 1, rule: tier === 'repair' ? '仍不稳就继续降阶，不加题量。' : '换一题小变式，确认能迁移。', route: '/pages/tutor/tutor' }
    ],
    stopRule: '同一错因连续两次卡住，停止刷题，回到第一步小黑板。',
    releaseRule: '连续两次能自己说清第一步，才释放变式练习。'
  };
}

function buildWrongCauseReplayDeck(cards = [], weakKey = '第一步') {
  const safeCards = Array.isArray(cards) ? cards : [];
  const picked = safeCards
    .filter((card) => {
      const text = [card.wrongCauseLabel, card.weakPoint, card.question, card.front].filter(Boolean).join(' ');
      return !weakKey || text.indexOf(weakKey) >= 0 || card.leech || Number(card.lapses || 0) > 0;
    })
    .slice(0, 4);
  const source = picked.length ? picked : safeCards.slice(0, 4);
  const deck = source.map((card, index) => ({
    id: card.id || `replay_${index + 1}`,
    order: index + 1,
    label: card.wrongCauseLabel || card.weakPoint || weakKey,
    prompt: card.question || card.front || `复述「${weakKey}」第一步`,
    repairMove: card.nextAction || card.checkpoint || `先说出「${weakKey}」的一步小动作。`,
    route: '/pages/review/review'
  }));
  while (deck.length < 3) {
    const order = deck.length + 1;
    deck.push({
      id: `synthetic_replay_${order}`,
      order,
      label: weakKey,
      prompt: `第 ${order} 张错因返场：${weakKey}`,
      repairMove: `先复述「${weakKey}」第一步，再看答案。`,
      route: '/pages/review/review'
    });
  }
  return {
    id: 'wrong_cause_replay_deck',
    title: '错因返场牌组',
    cards: deck.slice(0, 4),
    rule: '返场牌只修同一错因，不混入新难题。',
    evidenceRequired: ['wrong_cause_label', 'repair_move', 'next_day_revisit']
  };
}

function buildXpFeedbackPolicy(memoryFeedbackController = {}, result = {}) {
  const triggered = !!memoryFeedbackController.triggered;
  const xp = Math.max(0, Number(result.xp || 0));
  return {
    id: 'xp_feedback_policy',
    title: triggered ? 'XP 降噪规则' : 'XP 巩固规则',
    rewardLine: triggered
      ? '本轮只奖励主动回忆和错因修复，不奖励题量。'
      : '本轮 XP 可以记录掌握，但仍要等次日回访确认。',
    throttleLine: triggered
      ? `已写入 ${xp} XP；若同错因继续错，下一轮 XP 上限降低。`
      : `已写入 ${xp} XP；下一轮看迁移，不看刷题数量。`,
    parentLine: '家长看 XP 只看行为证据，不把 XP 当成绩排名。',
    evidenceRequired: ['active_recall_xp', 'wrong_cause_repair_xp', 'next_day_confirmed']
  };
}

function buildQuestArcRunway(questCadence = [], retention = {}, weakKey = '第一步') {
  const quests = Array.isArray(questCadence) ? questCadence : [];
  return {
    id: 'quest_arc_runway',
    title: '任务弧跑道',
    stages: quests.map((quest, index) => ({
      id: quest.id || `quest_${index + 1}`,
      order: index + 1,
      label: quest.label || '任务',
      status: Number(quest.done || 0) >= Number(quest.target || 1) ? 'done' : 'next',
      nextAction: quest.reward || `完成「${weakKey}」的一步回忆`,
      route: index === 0 ? '/pages/review/review' : index === 1 ? '/pages/tutor/tutor' : '/pages/profile/profile'
    })),
    bossLine: `本轮 boss 不是难题，是「${retention.weakKey || weakKey}」能否跨天复述。`,
    completionRule: '主动回忆、错因修复、家长复盘三段都出现，才算一轮闭环。'
  };
}

function buildGizmoLikeMemoryProtocol(profile = {}, cards = [], events = [], result = {}, retention = {}, options = {}) {
  const safeCards = Array.isArray(cards) ? cards : [];
  const safeEvents = Array.isArray(events) ? events : [];
  const weakKey = retention.weakKey || options.weakKey || '第一步';
  const wrong = Math.max(0, Number(result.wrong || 0));
  const accuracy = Number.isFinite(Number(result.accuracy)) ? Number(result.accuracy) : 0;
  const reviewedToday = Math.max(0, Number(profile.reviewed_today || profile.reviewedToday || 0));
  const stickyCount = safeCards.filter((card) => card.leech || Number(card.lapses || 0) >= 2).length;
  const recentMisses = safeEvents.filter((event) => /again|forgotten|wrong|repair/.test(String(event.rating || event.result || event.type || event.event || ''))).slice(-8).length;
  const needsRepair = retention.mode === 'repair' || wrong > 0 || accuracy < Number(options.targetAccuracy || 80) || stickyCount > 0;
  const intensityTier = stickyCount >= 2 || wrong >= 3 || accuracy < 50
    ? 'leech_rescue'
    : needsRepair
      ? 'repair'
      : 'mastery';
  const dailyMinimumRounds = [
    { id: 'first_step_recall', label: '第一步回忆', target: 3, rule: '先遮住答案，说出第一步；说不出就降到二选一。' },
    { id: 'wrong_cause_fix', label: '错因修复', target: needsRepair ? 2 : 1, rule: '只修同一个错因，不混入新难题。' },
    { id: 'near_transfer', label: '近迁移', target: needsRepair ? 1 : 2, rule: '换一道小变式，确认不是当场记住。' }
  ];
  const returnWindows = [
    { id: 'today', label: '今晚', action: `回忆 3 张和「${weakKey}」有关的卡，只说第一步。`, route: '/pages/arcade/arcade' },
    { id: 'tomorrow', label: '明天', action: `抽 1 张最不稳的卡，确认能跨天复述「${weakKey}」。`, route: '/pages/review/review' },
    { id: 'day3', label: '第 3 天', action: '做 1 道近迁移题，看能不能换题也开口。', route: '/pages/tutor/tutor' },
    { id: 'day7', label: '第 7 天', action: '用家长复盘确认是否进入长期掌握账本。', route: '/pages/profile/profile' }
  ];
  const antiCramThrottle = {
    id: 'anti_cram_throttle',
    active: needsRepair || reviewedToday >= 10,
    maxNewCards: needsRepair ? 0 : 3,
    xpRule: 'XP 只奖励主动回忆、错因修复和跨天回访，不奖励盲目刷题数量。',
    stopLine: needsRepair ? '同一错因未修复前，暂停加新题。' : '今天已够量时，优先保留明天回访。'
  };
  const leechEscalation = {
    id: 'leech_card_escalation',
    threshold: 2,
    stickyCount,
    rule: '同一错因连续 2 次失败，升级为顽固卡，回到第一步小黑板和家长一句话复盘。',
    route: stickyCount || needsRepair ? '/pages/review/review' : '/pages/tutor/tutor'
  };
  return {
    id: 'gizmo_like_memory_protocol',
    title: needsRepair ? '高频记忆训练协议' : '掌握巩固训练协议',
    intensityTier,
    weakKey,
    dailyMinimumRounds,
    returnWindows,
    antiCramThrottle,
    leechEscalation,
    streakProtection: {
      id: 'evidence_streak_protection',
      rule: '连续记录只看今天是否完成主动回忆证据，不看分数和排名。',
      reviewedToday,
      protected: reviewedToday >= 3 || Number(result.correct || 0) >= 3
    },
    parentContract: {
      id: 'parent_memory_contract',
      line: `家长只问一句：「${weakKey} 的第一步，明天你还能自己说出来吗？」`,
      evidenceLine: '报告只展示回忆证据、错因和下一次回访，不展示完整对话或排名。'
    },
    shareSafeChallenge: {
      id: 'share_safe_memory_challenge',
      title: '分享一个安全回忆挑战',
      payloadFields: ['weak_key', 'return_window', 'parent_contract', 'no_score', 'no_original_photo'],
      line: '分享只带挑战动作和回访时间，不带原题照片、完整对话、分数、排名或私密评价。'
    },
    recentMisses,
    evidenceRequired: ['daily_minimum_recall', 'anti_cram_throttle', 'leech_card_escalation', 'return_windows', 'parent_memory_contract', 'share_safe_memory_challenge']
  };
}

function buildSocraticQualityMemoryBridge(qualitySuite = {}, result = {}, retention = {}, options = {}) {
  const cases = Array.isArray(qualitySuite.cases) ? qualitySuite.cases : [];
  const activeCase = qualitySuite.activeCase || cases.find((item) => item && item.active) || cases[0] || {};
  const activeScenarios = Array.isArray(activeCase.scenarios) ? activeCase.scenarios : [];
  const scenarioCount = Number(qualitySuite.totalScenarioCount || 0) || cases.reduce((sum, item) => {
    return sum + (Array.isArray(item.scenarios) ? item.scenarios.length : 0);
  }, 0);
  const weakKey = retention.weakKey || options.weakKey || activeCase.probeGate || '第一步';
  const wrong = Math.max(0, Number(result.wrong || 0));
  const accuracy = Number.isFinite(Number(result.accuracy)) ? Number(result.accuracy) : 0;
  const needsRescue = wrong > 0 || accuracy < Number(options.targetAccuracy || 80) || retention.mode === 'repair';
  const actionMap = {
    silent_child: {
      title: '沉默时先做 A/B 回忆',
      memoryAction: '只问一个二选一问题，让孩子先选方向，再进入 1 张回忆卡。',
      gameRule: '本轮不加新题，只记录 child_micro_choice。',
      evidence: 'child_micro_choice'
    },
    answer_request: {
      title: '要答案时拦完整答案',
      memoryAction: '停止给结果，把回忆卡降到“题目问什么”和“第一步是什么”。',
      gameRule: '没有说出第一步，不发放通关 XP。',
      evidence: 'blocked_full_answer'
    },
    wrong_axis: {
      title: '答偏时回到误区轴',
      memoryAction: '把错因卡放到本局第一张，只追问一个定位问题。',
      gameRule: '同一误区连续两次答偏，转入错因回放。',
      evidence: 'socratic_axis_evidence'
    },
    transfer_fail: {
      title: '迁移失败时做次日回访',
      memoryAction: '保留 1 张相似变式到明天，不在今晚继续堆题。',
      gameRule: '明日回访能说出第一步，才开放变式练习。',
      evidence: 'next_day_transfer_check'
    }
  };
  const fallbackScenarios = ['silent_child', 'answer_request', 'wrong_axis', 'transfer_fail'].map((id) => ({
    id,
    expectedMove: actionMap[id].memoryAction,
    passEvidence: actionMap[id].evidence
  }));
  const sourceScenarios = activeScenarios.length ? activeScenarios : fallbackScenarios;
  const memoryActions = sourceScenarios.map((scenario, index) => {
    const mapped = actionMap[scenario.id] || {
      title: `质量场景 ${index + 1}`,
      memoryAction: scenario.expectedMove || '回到第一步主动回忆。',
      gameRule: '只记录可复盘动作，不记录完整答案。',
      evidence: scenario.passEvidence || 'socratic_memory_evidence'
    };
    return {
      id: scenario.id || `quality_memory_${index + 1}`,
      title: mapped.title,
      trigger: scenario.trigger || '',
      memoryAction: mapped.memoryAction,
      expectedMove: scenario.expectedMove || mapped.memoryAction,
      gameRule: mapped.gameRule,
      evidence: scenario.passEvidence || mapped.evidence,
      route: scenario.id === 'transfer_fail' ? '/pages/review/review' : '/pages/tutor/tutor'
    };
  });
  return {
    id: 'socratic_quality_memory_bridge',
    title: needsRescue ? '点拨质量接入错因回忆' : '点拨质量接入巩固回忆',
    scenarioCount,
    activeTaskType: activeCase.taskType || options.taskType || 'unknown',
    activeScenario: memoryActions[0] || null,
    memoryActions,
    xpGate: '只有说出第一步、完成错因回放或次日回访，才发放 XP；盲刷题量不加分。',
    reviewDeckRule: `本轮优先回收「${weakKey}」相关卡，再进入新题。`,
    parentLine: '家长只看孩子是否说出第一步、是否完成回访，不看完整答案、分数或排名。',
    privacyBoundary: '不带原题照片、完整对话、分数、排名、私密评价或原始答案。',
    evidenceRequired: ['socratic_quality_scenario', 'first_step_recall', 'blocked_answer_boundary', 'wrong_axis_replay', 'next_day_transfer_check']
  };
}

function buildQuestionBankMemoryBridge(courseUnitQuestionBank = {}, result = {}, retention = {}, options = {}) {
  const activeCards = Array.isArray(courseUnitQuestionBank.activeCards) ? courseUnitQuestionBank.activeCards : [];
  const allCards = Array.isArray(courseUnitQuestionBank.cards) ? courseUnitQuestionBank.cards : [];
  const sourceCards = (activeCards.length ? activeCards : allCards).slice(0, 6);
  const weakKey = options.weakKey || retention.weakKey || '第一步';
  const accuracy = Number(result.accuracy || 0);
  const needsRepair = retention.mode === 'repair' || accuracy < Number(options.targetAccuracy || 80) || Number(result.wrong || 0) > 0;
  const masteryActions = sourceCards.slice(0, 4).map((card, index) => ({
    id: card.id || `question_bank_memory_${index + 1}`,
    label: card.label || card.prompt || `题型卡 ${index + 1}`,
    prompt: card.sampleStem || card.prompt || `用自己的题复述 ${weakKey} 的第一步`,
    firstStep: card.firstStepHint || card.progression && card.progression.entryTask || `先说出 ${weakKey} 的第一步`,
    wrongCause: card.wrongCause || card.wrongCauseLabel || weakKey,
    visualMove: card.blackboardMove || card.visualMove || '画出已知条件和第一步关系',
    masteryGate: card.progression && card.progression.masteryGate ? card.progression.masteryGate : '能说出第一步、错因和一个小变式',
    nextDayRevisit: card.progression && card.progression.nextDayRevisit ? card.progression.nextDayRevisit : '明天换一题确认能不能迁移',
    parentCheck: card.parentCheck || card.progression && card.progression.parentEvidence || '家长只问第一步和错因，不看完整答案',
    route: '/pages/tutor/tutor'
  }));
  return {
    id: 'question_bank_memory_bridge',
    title: needsRepair ? '题型卡进入错因回忆' : '题型卡进入掌握巩固',
    status: sourceCards.length ? 'ready' : 'waiting_question_bank',
    questionCardCount: Number(courseUnitQuestionBank.questionCount || allCards.length || activeCards.length || 0),
    activeCardCount: activeCards.length,
    masteryGateCount: Number(courseUnitQuestionBank.masteryGateCount || 0),
    progressionStageCount: Number(courseUnitQuestionBank.progressionStageCount || 0),
    activeDeck: masteryActions,
    reviewWindows: [
      { id: 'tonight', label: '今晚', action: '只做 3 张题型卡的主动回忆，不加新题量。' },
      { id: 'tomorrow', label: '明天', action: '回访最不稳的一张卡，先说第一步再看提示。' },
      { id: 'day_7', label: '第 7 天', action: '换一个小变式，确认不是记住答案。' }
    ],
    entryRule: sourceCards.length
      ? `本轮从 ${sourceCards.length} 张题型卡里选最相关的主动回忆。`
      : '还没有可用题型卡，先回到第一步点拨生成题型证据。',
    xpGate: '题型卡只有通过第一步、错因复述和次日回访，才进入 XP；只刷数量不加分。',
    parentDecisionLine: sourceCards.length
      ? '家长报告只看题型掌握门槛、错因是否复现和明天回访，不看分数排行。'
      : '题型证据不足时，报告只能给观察建议，不能升级长期画像。',
    reportLine: sourceCards.length
      ? `题库已把 ${sourceCards.length} 张题型卡接入高频记忆训练。`
      : '题库还没有进入高频记忆训练。',
    privacyBoundary: '不分享原题照片、完整答案、分数、排名和孩子私密评价。',
    evidenceRequired: ['course_unit_question_bank', 'mastery_gate', 'active_recall', 'wrong_cause_replay', 'next_day_revisit', 'parent_decision_line']
  };
}

function buildHighFrequencyPracticeLoop(profile = {}, cards = [], events = [], result = {}, challenge = {}, questSet = {}, options = {}) {
  const safeCards = Array.isArray(cards) ? cards : [];
  const safeEvents = Array.isArray(events) ? events : [];
  const now = options.now || new Date();
  const retention = options.retentionLoop || buildGameRetentionLoop(profile, result, challenge, questSet, options);
  const gaps = buildKnowledgeGap(safeEvents, safeCards);
  const dueCards = safeCards
    .filter((card) => !card.next_review || new Date(card.next_review).getTime() <= new Date(now).getTime())
    .slice(0, 6);
  const weakKey = retention.weakKey || (gaps[0] && gaps[0].key) || questSet.weakKey || '第一步';
  const sourceCards = dueCards.length ? dueCards : safeCards.slice(0, 6);
  const recallCards = sourceCards.slice(0, 3).map((card, index) => ({
    id: card.id || `recall_${index + 1}`,
    order: index + 1,
    prompt: card.question || card.front || card.weakPoint || `回忆 ${weakKey} 的第一步`,
    firstStep: card.checkpoint || card.nextAction || card.next_practice || `先说清 ${weakKey} 的第一步。`,
    wrongCause: card.wrongCauseLabel || card.weakPoint || weakKey,
    route: '/pages/review/review'
  }));
  while (recallCards.length < 3) {
    const order = recallCards.length + 1;
    recallCards.push({
      id: `synthetic_recall_${order}`,
      order,
      prompt: `第 ${order} 次回忆：${weakKey}`,
      firstStep: `只说 ${weakKey} 的第一步，不直接看答案。`,
      wrongCause: weakKey,
      route: '/pages/review/review'
    });
  }
  const needsRepair = retention.mode === 'repair' || Number(result.wrong || 0) > 0 || Number(result.accuracy || 0) < Number(challenge.targetAccuracy || 80);
  const spacedReviewPlan = [
    { id: 'same_day', label: '今晚', action: `再回忆 3 张 ${weakKey} 卡，只说第一步。`, route: '/pages/arcade/arcade' },
    { id: 'next_day', label: '明天', action: `只回访最不稳的 1 张卡：${weakKey}。`, route: '/pages/review/review' },
    { id: 'day_7', label: '第 7 天', action: '用一题小变式确认能不能迁移。', route: '/pages/tutor/tutor' }
  ];
  const questCadence = [
    { id: 'recall', label: '主动回忆', target: 3, done: Math.min(3, Number(result.correct || 0)), reward: '说出第一步才给 XP' },
    { id: 'repair', label: '错因修复', target: needsRepair ? 1 : 0, done: needsRepair ? 0 : 1, reward: '错因回到复习队列' },
    { id: 'share', label: '家长复盘', target: 1, done: 0, reward: '生成可分享的行动证据' }
  ];
  const memoryFeedbackController = buildMemoryFeedbackController(safeCards, safeEvents, result, retention, {
    weakKey,
      targetAccuracy: challenge.targetAccuracy || 80
  });
  const recallIntensityPlan = buildRecallIntensityPlan(weakKey, needsRepair, result);
  const wrongCauseReplayDeck = buildWrongCauseReplayDeck(safeCards, weakKey);
  const xpFeedbackPolicy = buildXpFeedbackPolicy(memoryFeedbackController, result);
  const questArcRunway = buildQuestArcRunway(questCadence, retention, weakKey);
  const gizmoLikeMemoryProtocol = buildGizmoLikeMemoryProtocol(profile, safeCards, safeEvents, result, retention, {
    weakKey,
    targetAccuracy: challenge.targetAccuracy || 80
  });
  const socraticQualityMemoryBridge = buildSocraticQualityMemoryBridge(
    options.socraticQualityEvaluationSuite || {},
    result,
    retention,
    {
      weakKey,
      taskType: options.taskType || challenge.taskType || '',
      targetAccuracy: challenge.targetAccuracy || 80
    }
  );
  const questionBankMemoryBridge = buildQuestionBankMemoryBridge(
    options.courseUnitQuestionBank || {},
    result,
    retention,
    {
      weakKey,
      targetAccuracy: challenge.targetAccuracy || 80
    }
  );
  return {
    title: needsRepair ? '高频修复循环' : '高频巩固循环',
    mode: needsRepair ? 'repair_recall' : 'mastery_recall',
    summaryLine: needsRepair
      ? `下一轮不加题量，围绕「${weakKey}」做 3 张主动回忆。`
      : `本轮先沉淀掌握证据，再用间隔回访防止遗忘。`,
    recallCards,
    spacedReviewPlan,
    questCadence,
    memoryFeedbackController,
    recallIntensityPlan,
    wrongCauseReplayDeck,
    xpFeedbackPolicy,
    questArcRunway,
    gizmoLikeMemoryProtocol,
    socraticQualityMemoryBridge,
    questionBankMemoryBridge,
    xpRule: 'XP 只奖励主动回忆、错因修复和次日回访，不奖励盲刷题量。',
    leechRule: needsRepair
      ? `同一错因连续 2 次错，会降到第一步小黑板。`
      : '连续 2 次说清第一步，才进入变式练习。',
    parentShareLine: `家长复盘只看：孩子能否自己说出「${weakKey}」的第一步。`,
    nextRoute: needsRepair ? '/pages/review/review' : '/pages/tutor/tutor',
    evidenceRequired: ['active_recall_cards', 'spaced_review_plan', 'wrong_cause_return', 'quest_cadence', 'memory_feedback_controller', 'recall_intensity_plan', 'wrong_cause_replay_deck', 'xp_feedback_policy', 'quest_arc_runway', 'gizmo_like_memory_protocol', 'socratic_quality_memory_bridge', 'question_bank_memory_bridge', 'parent_share_line'],
    weakKey
  };
}

module.exports = {
  ACHIEVEMENTS,
  DAY_MS,
  SHOP_ITEMS,
  XP_REWARDS,
  applySM2,
  buildAdaptiveChallenge,
  buildDailyQuestSet,
  buildGameRetentionLoop,
  buildGizmoLikeMemoryProtocol,
  buildHighFrequencyPracticeLoop,
  buildMemoryFeedbackController,
  buildQuestionBankMemoryBridge,
  buildQuestArcRunway,
  buildRecallIntensityPlan,
  buildSocraticQualityMemoryBridge,
  buildWrongCauseReplayDeck,
  buildXpFeedbackPolicy,
  buildKnowledgeGap,
  calculateXP,
  capDailyXP,
  checkAndUnlockAchievements,
  getLevel,
  listAchievements,
  listShopItems,
  purchaseShopItem,
  quizQuestionFromCard,
  streakMultiplier,
  updateStreak
};
