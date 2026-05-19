const arcade = require('../../utils/arcade-engine');
const gameLogic = require('../../utils/game-logic');
const reviewCards = require('../../utils/review-cards');
const storage = require('../../utils/storage');
const navigation = require('../../utils/navigation');
const api = require('../../utils/api');
const tutorLadder = require('../../utils/tutor-ladder');

Page({
  data: {
    summary: null,
    cards: [],
    classifications: [],
    recommendations: [],
    visibleRecommendations: [],
    selectedGame: 'whack',
    gameMode: 'whack',
    round: null,
    currentIndex: 0,
    currentQuestion: null,
    revealed: false,
    snakeTrack: null,
    snakeTiles: [],
    snakeNextOrder: 0,
    matchTiles: [],
    matchSelectedTile: null,
    matchPairsDone: 0,
    activeGame: null,
    moleHoles: [],
    lives: 3,
    combo: 0,
    bestCombo: 0,
    score: 0,
    startXp: 0,
    xpGained: 0,
    answers: [],
    reviewedCardIds: {},
    wrongAnswers: [],
    repairFocus: null,
    dailyQuestSet: null,
    adaptiveChallenge: null,
    questArcMission: null,
    challengeBrief: null,
    surfaceDepthPack: null,
    result: null,
    resultAdvice: null,
    gameRetentionLoop: null,
    highFrequencyPracticeLoop: null,
    arcadeResultActionBridge: null,
    emptyGuide: null,
    feedbackText: '',
    expandedMatrix: false,
    recentTaskType: 'unknown',
    learningBoundLine: '',
    gameBlocked: false
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const summary = reviewCards.reviewSummary();
    const limit = (summary.deck && summary.deck.dailyLimit) || 8;
    const dueCards = reviewCards.sessionCards('smart', limit);
    const fallbackCards = reviewCards.cardBrowser({ status: 'all', limit: 12 });
    const todaySession = storage.getTodaySession ? storage.getTodaySession() : null;
    const todayFocus = storage.loadTodayFocus ? storage.loadTodayFocus() : null;
    const loopFocus = todaySession && todaySession.childArticulatedStep ? todaySession : todayFocus;
    const recentTaskType = (loopFocus && loopFocus.taskType) || 'unknown';
    const subjectSkillDepth = storage.buildSubjectSkillDepth
      ? storage.buildSubjectSkillDepth(Object.assign({}, loopFocus || {}, {
        taskType: recentTaskType,
        sourceText: loopFocus && (loopFocus.stuckPointText || loopFocus.sourceText || loopFocus.thought || loopFocus.title),
        firstStep: loopFocus && (loopFocus.childArticulatedStep || loopFocus.systemSuggestedStep)
      }))
      : null;
    const curriculumSpine = storage.buildCurriculumSpine
      ? storage.buildCurriculumSpine(Object.assign({}, loopFocus || {}, { subjectSkillDepth }))
      : null;
    const courseUnitMap = storage.buildCourseUnitMap
      ? storage.buildCourseUnitMap(Object.assign({}, loopFocus || {}, { subjectSeedLibrary: null }))
      : null;
    const courseUnitMasteryTrajectory = storage.buildCourseUnitMasteryTrajectory
      ? storage.buildCourseUnitMasteryTrajectory({ courseUnitMap })
      : null;
    const courseUnitQuestionBank = storage.buildCourseUnitQuestionBank
      ? storage.buildCourseUnitQuestionBank({ courseUnitMap })
      : null;
    const commercialDepthRunway = storage.buildCommercialDepthRunway
      ? storage.buildCommercialDepthRunway({
        courseUnitMap,
        courseUnitMasteryTrajectory,
        courseUnitQuestionBank,
        subjectSkillDepth
      })
      : null;
    const sevenSubjectMasterySprint = storage.buildSevenSubjectMasterySprint
      ? storage.buildSevenSubjectMasterySprint({
        courseUnitMap,
        courseUnitMasteryTrajectory,
        courseUnitQuestionBank,
        commercialDepthRunway,
        subjectSkillDepth
      })
      : null;
    const taskBoundCards = this.cardsForRecentTaskType(recentTaskType, loopFocus);
    const loopBoundCards = this.loopBoundCards(dueCards.concat(fallbackCards), taskBoundCards, loopFocus);
    const cards = loopBoundCards.length ? loopBoundCards : (dueCards.length ? dueCards : (fallbackCards.length ? fallbackCards : taskBoundCards));
    const profile = storage.loadGameProfile ? storage.loadGameProfile() : {};
    const reviewEvents = storage.loadReviewEvents ? storage.loadReviewEvents() : [];
    const evidenceBias = storage.buildEvidenceRouteBias ? storage.buildEvidenceRouteBias() : null;
    const dailyQuestSet = gameLogic.buildDailyQuestSet(profile, cards, reviewEvents, { now: new Date(), evidenceBias });
    const adaptiveChallenge = gameLogic.buildAdaptiveChallenge(cards, reviewEvents, profile, { now: new Date(), evidenceBias });
    const questArcMission = storage.buildQuestArcGameBridge
      ? storage.buildQuestArcGameBridge({ dailyQuestSet, adaptiveChallenge, evidenceBias })
      : null;
    const recommendations = arcade.recommendGames(cards);
    const selectedGame = (recommendations.find((item) => item.available) || recommendations[0] || {}).id || 'whack';
    const round = this.buildRoundForGame(selectedGame, cards, adaptiveChallenge);
    this.setData({
      summary,
      cards,
      startXp: Number(profile.xp || 0),
      classifications: arcade.classifyCards(cards),
      recommendations,
      visibleRecommendations: this.visibleRecommendations(recommendations, false),
      selectedGame,
      gameMode: selectedGame,
      activeGame: recommendations.find((item) => item.id === selectedGame) || null,
      round,
      currentIndex: 0,
      currentQuestion: this.firstQuestionForRound(round, selectedGame),
      revealed: false,
      snakeTrack: selectedGame === 'snake' ? this.firstQuestionForRound(round, selectedGame) : null,
      snakeTiles: selectedGame === 'snake' && round.tracks && round.tracks[0] ? round.tracks[0].tiles : [],
      snakeNextOrder: 0,
      matchTiles: selectedGame === 'match' && round.tiles ? round.tiles : [],
      matchSelectedTile: null,
      matchPairsDone: 0,
      moleHoles: this.buildHoles(round.questions && round.questions[0], round.holes),
      lives: Number(adaptiveChallenge.lives || 3),
      combo: 0,
      bestCombo: 0,
      score: 0,
      xpGained: 0,
      answers: [],
      reviewedCardIds: {},
      wrongAnswers: [],
      repairFocus: null,
      dailyQuestSet,
      adaptiveChallenge,
      questArcMission,
      challengeBrief: this.buildChallengeBrief(dailyQuestSet, adaptiveChallenge, questArcMission, evidenceBias, subjectSkillDepth, curriculumSpine, courseUnitMap, courseUnitMasteryTrajectory, courseUnitQuestionBank, commercialDepthRunway, sevenSubjectMasterySprint),
      surfaceDepthPack: storage.buildSurfaceDepthPack ? storage.buildSurfaceDepthPack('arcade') : null,
      subjectSkillDepth,
      curriculumSpine,
      courseUnitMap,
      courseUnitMasteryTrajectory,
      courseUnitQuestionBank,
      commercialDepthRunway,
      sevenSubjectMasterySprint,
      result: null,
      resultAdvice: null,
      gameRetentionLoop: null,
      emptyGuide: this.emptyGuide(selectedGame, round),
      feedbackText: (round.questions || round.tracks || round.pairs || []).length ? this.openingHint(selectedGame) : '还没有适合游戏化的真实学习卡。'
      ,
      recentTaskType,
      learningBoundLine: todaySession && todaySession.gamePlayed
        ? '今天已经练过了，先去专注或复习吧'
        : this.learningBoundLine(recentTaskType, loopFocus),
      gameBlocked: !!(todaySession && todaySession.gamePlayed)
    });
  },

  wrongCauseForLoop(todayFocus = {}) {
    const plan = todayFocus && todayFocus.nextPracticePlan;
    if (plan && plan.wrongCauseBucket) return plan;
    if (todayFocus && todayFocus.wrongCauseBucket) {
      return {
        wrongCauseBucket: todayFocus.wrongCauseBucket,
        wrongCauseLabel: todayFocus.wrongCauseLabel || '第一步确认',
        checkpoint: todayFocus.checkpoint || '先说自己准备从哪里开始。',
        parentPrompt: todayFocus.parentPrompt || '你第一步先做了什么？',
        nextPracticeText: todayFocus.repairPlan || '把第一步写成一句话，再进入专注。'
      };
    }
    if (storage.wrongCauseFromFirstStep) {
      const cause = storage.wrongCauseFromFirstStep(
        todayFocus && (todayFocus.childArticulatedStep || todayFocus.systemSuggestedStep || todayFocus.title),
        todayFocus && todayFocus.taskType
      );
      return {
        wrongCauseBucket: cause.id,
        wrongCauseLabel: cause.label,
        checkpoint: cause.checkpoint,
        parentPrompt: cause.parentPrompt,
        nextPracticeText: cause.nextPracticeText
      };
    }
    return {
      wrongCauseBucket: 'first_step',
      wrongCauseLabel: '第一步确认',
      checkpoint: '先说自己准备从哪里开始。',
      parentPrompt: '你第一步先做了什么？',
      nextPracticeText: '把第一步写成一句话，再进入专注。'
    };
  },

  loopBoundCards(reviewList = [], taskBoundCards = [], todayFocus = {}) {
    const cause = this.wrongCauseForLoop(todayFocus);
    const taskType = todayFocus && todayFocus.taskType;
    const seen = {};
    const matched = (reviewList || []).filter((card) => {
      if (!card || !card.id) return false;
      if (cause.wrongCauseBucket && card.wrongCauseBucket === cause.wrongCauseBucket) return true;
      if (taskType && taskType !== 'unknown' && card.taskType === taskType) return true;
      const text = [card.question, card.answer, card.weakPoint, card.checkpoint].join(' ');
      return cause.wrongCauseLabel && text.indexOf(cause.wrongCauseLabel) >= 0;
    });
    return (taskBoundCards || []).concat(matched).filter((card) => {
      const id = card && card.id;
      if (!id || seen[id]) return false;
      seen[id] = true;
      return true;
    }).slice(0, 12);
  },

  cardsForRecentTaskType(taskType, todayFocus = {}) {
    const target = String((todayFocus && (todayFocus.childArticulatedStep || todayFocus.systemSuggestedStep || todayFocus.title)) || '').trim();
    const cause = this.wrongCauseForLoop(todayFocus);
    const map = {
      math_word_problem: [
        { question: '应用题第一眼先找什么？', answer: '数字', hint: '先圈数字和问题句。' },
        { question: '题目问什么要先标哪里？', answer: '问号', hint: '先把问题句读慢一点。' }
      ],
      equation_setup: [
        { question: '列方程前先写什么？', answer: '未知数', hint: '先把未知量写成 x。' },
        { question: '方程中间要找什么？', answer: '等量关系', hint: '先问两边什么相等。' }
      ],
      reading_question: [
        { question: '阅读题先看什么？', answer: '题目问法', hint: '先看细节、主旨还是原因。' },
        { question: '回文定位先找什么？', answer: '关键词', hint: '先圈关键词再回原文。' }
      ],
      english_sentence: [
        { question: '英语句子先找什么？', answer: '主语', hint: '先找谁做动作。' },
        { question: '看时态前先找什么？', answer: '谓语', hint: '先找动作或 be 动词。' }
      ],
      writing_process: [
        { question: '写作开头先写什么？', answer: '一句话', hint: '先写最简单的一句。' },
        { question: '展开前先列什么？', answer: '要点', hint: '先列两个要点。' }
      ],
      unknown: [
        { question: '卡住时先说什么？', answer: '第一步', hint: '先说准备从哪里开始。' }
      ]
    };
    return (map[taskType] || map.unknown).map((item, index) => ({
      id: `task_${taskType}_${index}`,
      question: target ? `${target}：${item.question}` : item.question,
      answer: item.answer,
      hint: `${item.hint} ${cause.checkpoint}`,
      subject: taskType.indexOf('math') >= 0 || taskType.indexOf('equation') >= 0 ? '数学' : '',
      source: 'recent_task_type',
      taskType,
      wrongCauseBucket: cause.wrongCauseBucket,
      wrongCauseLabel: cause.wrongCauseLabel,
      checkpoint: cause.checkpoint,
      parentPrompt: cause.parentPrompt,
      nextPracticePlan: cause
    }));
  },

  learningBoundLine(taskType, todayFocus = {}) {
    const step = todayFocus && (todayFocus.childArticulatedStep || todayFocus.systemSuggestedStep || todayFocus.title);
    const cause = this.wrongCauseForLoop(todayFocus);
    if (step) return `本局跟着最近这一步练：${step}。重点回访：${cause.wrongCauseLabel}`;
    if (taskType && taskType !== 'unknown') return `本局跟着最近题型练：${taskType}`;
    return '先完成一次点拨或错题修复，小游戏会跟着最近题型走。';
  },

  buildRoundForGame(gameId, cards, adaptiveChallenge = this.data.adaptiveChallenge) {
    const size = Math.max(3, Math.min(8, Number(adaptiveChallenge && adaptiveChallenge.roundSize) || 6));
    if (gameId === 'quiz') return arcade.buildQuestRound(cards, { limit: Math.min(size, 8) });
    if (gameId === 'snake') return arcade.buildSnakeRound(cards, { limit: Math.min(size, 6) });
    if (gameId === 'match') return arcade.buildMatchRound(cards, { limit: Math.min(size, 6) });
    return arcade.buildWhackRound(cards, { limit: size });
  },

  buildChallengeBrief(dailyQuestSet = {}, adaptiveChallenge = {}, questArcMission = null, evidenceBias = null, subjectSkillDepth = null, curriculumSpine = null, courseUnitMap = null, courseUnitMasteryTrajectory = null, courseUnitQuestionBank = null, commercialDepthRunway = null, sevenSubjectMasterySprint = null) {
    const quests = Array.isArray(dailyQuestSet.quests) ? dailyQuestSet.quests : [];
    const activeQuest = quests.find((item) => item && item.progress < item.target) || quests[0] || {};
    const mode = adaptiveChallenge.mode || 'balanced';
    const labels = {
      repair: '修卡点局',
      balanced: '稳固局',
      stretch: '挑战局'
    };
    const activeCourseUnit = courseUnitMap && courseUnitMap.active && Array.isArray(courseUnitMap.active.units)
      ? courseUnitMap.active.units[0]
      : null;
    const trajectoryRows = courseUnitMasteryTrajectory && Array.isArray(courseUnitMasteryTrajectory.trajectories)
      ? courseUnitMasteryTrajectory.trajectories.slice(0, 3)
      : [];
    const questionBankShareRelayDeck = storage.buildQuestionBankShareRelayDeck
      ? storage.buildQuestionBankShareRelayDeck({
        courseUnitMap,
        courseUnitQuestionBank,
        subjectSkillDepth
      })
      : null;
    return {
      mode,
      modeLabel: labels[mode] || labels.balanced,
      roundSize: Number(adaptiveChallenge.roundSize || 0),
      targetAccuracy: Number(adaptiveChallenge.targetAccuracy || 0),
      questTitle: activeQuest.id === 'quest_boss_gap'
        ? '先处理一个高频卡点'
        : activeQuest.id === 'quest_repair_due_cards'
          ? '先清一组待回访卡'
          : '先说清今晚第一步',
      questProgress: `${Number(activeQuest.progress || 0)} / ${Number(activeQuest.target || 1)}`,
      rewardLine: activeQuest.rewardXp ? `完成后写入 ${activeQuest.rewardXp} 点学习记录` : '完成后写入学习记录',
      bossLine: adaptiveChallenge.bossCard
        ? `本局重点：${adaptiveChallenge.bossCard.nextAction || adaptiveChallenge.bossCard.key}`
        : '本局重点会跟随错因记录变化',
      storyTitle: questArcMission && questArcMission.title ? questArcMission.title : '',
      storyLine: questArcMission && questArcMission.missionLine ? questArcMission.missionLine : '',
      storyRule: questArcMission && questArcMission.playRule ? questArcMission.playRule : '',
      storyEvidence: questArcMission && Array.isArray(questArcMission.evidenceRequired)
        ? questArcMission.evidenceRequired.join(' / ')
        : '',
      evidenceBiasSource: evidenceBias && evidenceBias.source ? evidenceBias.source : '',
      evidenceBiasLine: evidenceBias && evidenceBias.reasonLine ? evidenceBias.reasonLine : '',
      subjectDepthLabel: subjectSkillDepth && subjectSkillDepth.label ? subjectSkillDepth.label : '',
      subjectDepthLine: subjectSkillDepth && subjectSkillDepth.firstStep
        ? `${subjectSkillDepth.label} · ${subjectSkillDepth.firstStep}`
        : '',
      subjectDepthGameDrills: subjectSkillDepth && Array.isArray(subjectSkillDepth.gameDrills)
        ? subjectSkillDepth.gameDrills.slice(0, 3)
        : [],
      subjectDepthGameLine: subjectSkillDepth && Array.isArray(subjectSkillDepth.gameDrills)
        ? subjectSkillDepth.gameDrills.slice(0, 3).join(' / ')
        : '',
      subjectDepthEvidenceLine: subjectSkillDepth && Array.isArray(subjectSkillDepth.evidenceRequired)
        ? subjectSkillDepth.evidenceRequired.join(' / ')
        : '',
      curriculumTitle: curriculumSpine && curriculumSpine.title ? curriculumSpine.title : '',
      curriculumLine: curriculumSpine && curriculumSpine.gameLine ? curriculumSpine.gameLine : '',
      curriculumProgression: curriculumSpine && Array.isArray(curriculumSpine.progression)
        ? curriculumSpine.progression
        : [],
      curriculumScaleLine: curriculumSpine && curriculumSpine.scaleLine ? curriculumSpine.scaleLine : '',
      courseUnitTitle: activeCourseUnit ? `${activeCourseUnit.subjectLabel} · ${activeCourseUnit.unitLabel}` : '',
      courseUnitLine: activeCourseUnit ? activeCourseUnit.practiceLoop.recall : '',
      courseUnitWrongCauseLine: activeCourseUnit && Array.isArray(activeCourseUnit.wrongCauseAtlas)
        ? activeCourseUnit.wrongCauseAtlas.slice(0, 3).join(' / ')
        : '',
      courseUnitQuestionTypes: activeCourseUnit && Array.isArray(activeCourseUnit.reusableQuestionTypes)
        ? activeCourseUnit.reusableQuestionTypes
        : [],
      courseUnitReportContract: activeCourseUnit ? activeCourseUnit.reportContract : '',
      courseUnitShareContract: activeCourseUnit ? activeCourseUnit.shareContract : '',
      courseUnitPracticeDeckTitle: courseUnitMasteryTrajectory ? courseUnitMasteryTrajectory.title : '',
      courseUnitPracticeDeckLine: courseUnitMasteryTrajectory ? courseUnitMasteryTrajectory.summary : '',
      courseUnitPracticeDeck: trajectoryRows.map((item) => ({
        id: item.id,
        label: item.unitLabel,
        masteryScore: item.masteryScore,
        risk: item.regressionRisk,
        nextEvidence: item.nextEvidence,
        action: item.parentInterventionLevel
      })),
      courseUnitQuestionBankTitle: courseUnitQuestionBank ? courseUnitQuestionBank.title : '',
      courseUnitQuestionBankLine: courseUnitQuestionBank ? courseUnitQuestionBank.summary : '',
      courseUnitQuestionBankCards: courseUnitQuestionBank && Array.isArray(courseUnitQuestionBank.activeCards)
        ? courseUnitQuestionBank.activeCards.slice(0, 6)
        : [],
      questionBankShareRelayDeckTitle: questionBankShareRelayDeck ? questionBankShareRelayDeck.title : '',
      questionBankShareRelayDeckLine: questionBankShareRelayDeck ? questionBankShareRelayDeck.gameRule : '',
      questionBankShareRelayParentLine: questionBankShareRelayDeck ? questionBankShareRelayDeck.parentDecisionLine : '',
      questionBankShareRelayCards: questionBankShareRelayDeck && Array.isArray(questionBankShareRelayDeck.relayCards)
        ? questionBankShareRelayDeck.relayCards.slice(0, 4)
        : [],
      questionBankShareRelayWindows: questionBankShareRelayDeck && Array.isArray(questionBankShareRelayDeck.reviewWindows)
        ? questionBankShareRelayDeck.reviewWindows
        : [],
      commercialDepthRunwayTitle: commercialDepthRunway ? commercialDepthRunway.title : '',
      commercialDepthRunwayLine: commercialDepthRunway ? commercialDepthRunway.gameLine : '',
      commercialDepthRunwayBoundary: commercialDepthRunway ? commercialDepthRunway.boundary : '',
      commercialDepthRunwayLanes: commercialDepthRunway && Array.isArray(commercialDepthRunway.lanes)
        ? commercialDepthRunway.lanes
        : [],
      commercialDepthMemoryCadence: commercialDepthRunway && Array.isArray(commercialDepthRunway.memoryCadence)
        ? commercialDepthRunway.memoryCadence
        : [],
      sevenSubjectMasterySprintTitle: sevenSubjectMasterySprint ? sevenSubjectMasterySprint.title : '',
      sevenSubjectMasterySprintLine: sevenSubjectMasterySprint ? sevenSubjectMasterySprint.gameIntensityLine : '',
      sevenSubjectMasterySprintMoat: sevenSubjectMasterySprint ? sevenSubjectMasterySprint.moatLine : '',
      sevenSubjectMasterySprintLanes: sevenSubjectMasterySprint && Array.isArray(sevenSubjectMasterySprint.lanes)
        ? sevenSubjectMasterySprint.lanes
        : [],
      sevenSubjectMasterySprintSubjects: sevenSubjectMasterySprint && Array.isArray(sevenSubjectMasterySprint.subjects)
        ? sevenSubjectMasterySprint.subjects.slice(0, 3)
        : []
    };
  },

  openingHint(gameId) {
    if (gameId === 'quiz') return '先在心里说一遍，再核对思路自评。不会的卡会回到复习队列。';
    if (gameId === 'snake') return '按正确顺序吃掉步骤块，吃错的步骤会回到复习队列。';
    if (gameId === 'match') return '先点一个题泡泡，再点对应泡泡。错配会回到复习队列。';
    return '今天只开一小局，答错的卡会回到复习队列。';
  },

  emptyGuide(gameId, round) {
    const total = Number((round && round.total) || 0);
    if (total > 0) return null;
    const guides = {
      whack: {
        title: '缺少短回忆卡',
        body: '打地鼠适合口算、单词、年代、符号这类能快速回答的卡。',
        cta: '去生成短卡',
        action: 'goTools'
      },
      quiz: {
        title: '缺少概念轻练卡',
        body: '轻练答题适合原因、定义、关系、应用题思路这类需要先回忆再解释的卡。',
        cta: '去生成概念卡',
        action: 'goTools'
      },
      snake: {
        title: '缺少顺序步骤卡',
        body: '贪吃蛇适合解题步骤、实验流程、历史时间线和操作顺序。',
        cta: '去生成步骤卡',
        action: 'goTools'
      },
      match: {
        title: '缺少短对应卡',
        body: '泡泡消适合单词-释义、年代-事件、符号-含义这类一问一答的短卡。',
        cta: '去生成对应卡',
        action: 'goTools'
      }
    };
    return guides[gameId] || {
      title: '还没有可玩的真实卡片',
      body: '先从作业、错题或教材章节生成学习卡，再回来轻回访。',
      cta: '去生成学习卡',
      action: 'goTools'
    };
  },

  firstQuestionForRound(round, gameId) {
    if (gameId === 'snake') return (round.tracks && round.tracks[0]) || null;
    if (gameId === 'match') return (round.pairs && round.pairs[0]) || null;
    return (round.questions && round.questions[0]) || null;
  },

  visibleRecommendations(recommendations, expanded) {
    const limit = expanded ? 9 : 4;
    const list = recommendations || [];
    const ready = list.filter((item) => item.status === 'ready');
    return ready.slice(0, limit);
  },

  buildHoles(question, holeCount = 9) {
    const total = Math.max(4, Math.min(9, Number(holeCount || 9)));
    if (!question) {
      return Array.from({ length: total }, (_, index) => ({ id: `empty_${index}`, label: '', active: false }));
    }
    const choices = (question.choices || []).slice(0, Math.min(4, total));
    const holeTargets = Array.isArray(question.holeTargets) && question.holeTargets.length >= choices.length
      ? question.holeTargets
      : arcade.buildHoleTargets(question.cardId || question.id, choices.length, total);
    const holes = Array.from({ length: total }, (_, index) => ({
      id: `hole_${question.id}_${index}`,
      label: '',
      active: false,
      correct: false,
      cardId: question.cardId
    }));
    choices.forEach((choice, idx) => {
      const target = Number(holeTargets[idx]);
      holes[target] = Object.assign({}, holes[target], {
        label: choice,
        active: true,
        correct: choice === question.answer
      });
    });
    return holes;
  },

  selectGame(event) {
    const gameId = event.currentTarget.dataset.id || 'whack';
    const game = this.data.recommendations.find((item) => item.id === gameId);
    if (!game || !game.available) {
      this.setData({ feedbackText: (game && game.lockedReason) || '先生成真实学习卡后再玩这个玩法。' });
      return;
    }
    const round = this.buildRoundForGame(gameId, this.data.cards, this.data.adaptiveChallenge);
    this.setData({
      selectedGame: gameId,
      gameMode: gameId,
      activeGame: game,
      round,
      currentIndex: 0,
      currentQuestion: this.firstQuestionForRound(round, gameId),
      revealed: false,
      snakeTrack: gameId === 'snake' ? this.firstQuestionForRound(round, gameId) : null,
      snakeTiles: gameId === 'snake' && round.tracks && round.tracks[0] ? round.tracks[0].tiles : [],
      snakeNextOrder: 0,
      matchTiles: gameId === 'match' && round.tiles ? round.tiles : [],
      matchSelectedTile: null,
      matchPairsDone: 0,
      moleHoles: this.buildHoles(round.questions && round.questions[0], round.holes),
      lives: Number((this.data.adaptiveChallenge && this.data.adaptiveChallenge.lives) || 3),
      combo: 0,
      bestCombo: 0,
      score: 0,
      xpGained: 0,
      answers: [],
      reviewedCardIds: {},
      wrongAnswers: [],
      repairFocus: null,
      result: null,
      resultAdvice: null,
      emptyGuide: this.emptyGuide(gameId, round),
      feedbackText: this.openingHint(gameId)
    });
  },

  toggleMatrix() {
    const expandedMatrix = !this.data.expandedMatrix;
    this.setData({
      expandedMatrix,
      visibleRecommendations: this.visibleRecommendations(this.data.recommendations, expandedMatrix)
    });
  },

  tapMatchTile(event) {
    if (this.data.result || this.data.gameMode !== 'match') return;
    const tileId = event.currentTarget.dataset.id;
    const tile = (this.data.matchTiles || []).find((item) => item.id === tileId);
    if (!tile || tile.matched) return;
    const selected = this.data.matchSelectedTile;
    if (!selected) {
      this.setData({
        matchSelectedTile: tile,
        matchTiles: this.data.matchTiles.map((item) => Object.assign({}, item, {
          selected: item.id === tile.id,
          missed: false
        })),
        feedbackText: `泡泡发光了：${tile.text}。再点它的另一半。`
      });
      return;
    }
    if (selected.id === tile.id) {
      this.setData({
        matchSelectedTile: null,
        matchTiles: this.data.matchTiles.map((item) => Object.assign({}, item, { selected: false })),
        feedbackText: '已取消选择。'
      });
      return;
    }
    if (selected.side === tile.side) {
      this.setData({
        matchSelectedTile: tile,
        matchTiles: this.data.matchTiles.map((item) => Object.assign({}, item, {
          selected: item.id === tile.id,
          missed: false
        })),
        feedbackText: `已换成：${tile.text}。再点它的另一半。`
      });
      return;
    }
    const correct = selected.pairId === tile.pairId && selected.side !== tile.side;
    const combo = correct ? this.data.combo + 1 : 0;
    const bestCombo = Math.max(this.data.bestCombo, combo);
    const lives = correct ? this.data.lives : Math.max(0, this.data.lives - 1);
    const score = this.data.score + (correct ? 16 + Math.max(0, combo - 1) * 2 : 0);
    const answerRecord = arcade.buildMatchAnswerRecord(
      selected,
      tile,
      (this.data.round && this.data.round.pairs) || []
    );
    if (answerRecord.recordable === false) {
      this.setData({ matchSelectedTile: null });
      return;
    }
    const answers = this.data.answers.concat([answerRecord]);
    const xpAccepted = this.recordCardResult(answerRecord.cardId, correct, correct ? 'good' : 'again', 'match');
    const matchPairsDone = this.data.matchPairsDone + (correct ? 1 : 0);
    const nextTiles = this.data.matchTiles.map((item) => {
      const isPair = correct && item.pairId === tile.pairId;
      return Object.assign({}, item, {
        matched: item.matched || isPair,
        selected: false,
        missed: !correct && (item.id === tile.id || item.id === selected.id)
      });
    });

    if (lives <= 0 || matchPairsDone >= this.data.round.total) {
      this.setData({
        matchTiles: nextTiles,
        matchSelectedTile: null,
        matchPairsDone,
        answers
      });
      this.finishRound(answers, bestCombo, score, lives);
      return;
    }

    this.setData({
      matchTiles: nextTiles,
      matchSelectedTile: null,
      matchPairsDone,
      lives,
      combo,
      bestCombo,
      score,
      xpGained: Number(this.data.xpGained || 0) + Number(xpAccepted || 0),
      answers,
      feedbackText: correct ? `啵，消掉一对！Combo ${combo}` : `这对没有粘住。正确关系：${answerRecord.answer}`
    });
  },

  revealAnswer() {
    if (!this.data.currentQuestion || this.data.result) return;
    this.setData({
      revealed: true,
      feedbackText: '核对思路后，按真实掌握程度选择。'
    });
  },

  gradeQuest(event) {
    if (this.data.result || !this.data.currentQuestion || !this.data.revealed) return;
    const rating = event.currentTarget.dataset.rating || 'again';
    const current = this.data.currentQuestion;
    const correct = rating !== 'again';
    const combo = correct ? this.data.combo + 1 : 0;
    const bestCombo = Math.max(this.data.bestCombo, combo);
    const lives = correct ? this.data.lives : Math.max(0, this.data.lives - 1);
    const score = this.data.score + (rating === 'easy' ? 18 : rating === 'good' ? 14 : 0);
    const answers = this.data.answers.concat([{
      cardId: current.cardId,
      correct,
      selected: rating === 'easy' ? '记得' : rating === 'good' ? '模糊' : '忘记',
      answer: current.answer,
      rating,
      gameType: 'quiz'
    }]);
    const xpAccepted = this.recordCardResult(current.cardId, correct, rating, 'quiz');
    const nextIndex = this.data.currentIndex + 1;
    if (lives <= 0 || nextIndex >= this.data.round.questions.length) {
      this.finishRound(answers, bestCombo, score, lives);
      return;
    }
    const nextQuestion = this.data.round.questions[nextIndex];
    this.setData({
      currentIndex: nextIndex,
      currentQuestion: nextQuestion,
      revealed: false,
      lives,
      combo,
      bestCombo,
      score,
      xpGained: Number(this.data.xpGained || 0) + Number(xpAccepted || 0),
      answers,
      feedbackText: correct ? '继续下一关。先回忆，再核对思路。' : `参考思路：${current.answer}。这张卡会回到复习队列。`
    });
  },

  tapSnakeTile(event) {
    if (this.data.result || !this.data.snakeTrack) return;
    const tileId = event.currentTarget.dataset.id;
    const tile = (this.data.snakeTiles || []).find((item) => item.id === tileId);
    if (!tile || tile.eaten) return;
    const current = this.data.snakeTrack;
    const correct = Number(tile.order) === Number(this.data.snakeNextOrder || 0);
    const combo = correct ? this.data.combo + 1 : 0;
    const bestCombo = Math.max(this.data.bestCombo, combo);
    const lives = correct ? this.data.lives : Math.max(0, this.data.lives - 1);
    const score = this.data.score + (correct ? 12 + Math.max(0, combo - 1) : 0);
    const nextTiles = this.data.snakeTiles.map((item) => item.id === tile.id ? Object.assign({}, item, {
      eaten: correct,
      missed: !correct
    }) : item);
    const completedTrack = correct && Number(this.data.snakeNextOrder || 0) + 1 >= current.correctOrder.length;
    const answers = completedTrack || !correct
      ? this.data.answers.concat([{
        cardId: current.cardId,
        correct,
        selected: tile.text,
        answer: current.correctOrder.join(' -> '),
        gameType: 'snake'
      }])
      : this.data.answers;
    const xpAccepted = completedTrack || !correct
      ? this.recordCardResult(current.cardId, correct, correct ? 'good' : 'again', 'snake')
      : 0;

    if (!correct) {
      this.setData({ snakeTiles: nextTiles });
      this.finishRound(answers, bestCombo, score, lives);
      return;
    }

    if (completedTrack) {
      const nextIndex = this.data.currentIndex + 1;
      if (nextIndex >= this.data.round.tracks.length) {
        this.finishRound(answers, bestCombo, score, lives);
        return;
      }
      const nextTrack = this.data.round.tracks[nextIndex];
      this.setData({
        currentIndex: nextIndex,
        currentQuestion: nextTrack,
        snakeTrack: nextTrack,
        snakeTiles: nextTrack.tiles,
        snakeNextOrder: 0,
        lives,
        combo,
        bestCombo,
        score,
        xpGained: Number(this.data.xpGained || 0) + Number(xpAccepted || 0),
        answers,
        feedbackText: '小藤吃完整条顺序了，继续下一条。'
      });
      return;
    }

    this.setData({
      snakeTiles: nextTiles,
      snakeNextOrder: Number(this.data.snakeNextOrder || 0) + 1,
      lives,
      combo,
      bestCombo,
      score,
      answers,
      feedbackText: `小藤吃对了：${tile.text}`
    });
  },

  tapHole(event) {
    if (this.data.result || !this.data.currentQuestion) return;
    const index = Number(event.currentTarget.dataset.index || 0);
    const hole = this.data.moleHoles[index];
    if (!hole || !hole.active) return;

    const current = this.data.currentQuestion;
    const correct = !!hole.correct;
    const combo = correct ? this.data.combo + 1 : 0;
    const bestCombo = Math.max(this.data.bestCombo, combo);
    const lives = correct ? this.data.lives : Math.max(0, this.data.lives - 1);
    const score = this.data.score + (correct ? 10 + Math.max(0, combo - 1) * 2 : 0);
    const answers = this.data.answers.concat([{
      cardId: current.cardId,
      correct,
      selected: hole.label,
      answer: current.answer,
      gameType: 'whack'
    }]);

    const xpAccepted = this.recordCardResult(current.cardId, correct, correct ? 'good' : 'again', 'whack');

    const nextIndex = this.data.currentIndex + 1;
    if (lives <= 0 || nextIndex >= this.data.round.questions.length) {
      this.finishRound(answers, bestCombo, score, lives);
      return;
    }

    const nextQuestion = this.data.round.questions[nextIndex];
    this.setData({
      currentIndex: nextIndex,
      currentQuestion: nextQuestion,
      moleHoles: this.buildHoles(nextQuestion, this.data.round.holes),
      lives,
      combo,
      bestCombo,
      score,
      xpGained: Number(this.data.xpGained || 0) + Number(xpAccepted || 0),
      answers,
      feedbackText: correct ? `芽锤敲中！Combo ${combo}` : `参考思路：${current.answer}。这张卡会回到复习队列。`
    });
  },

  recordCardResult(cardId, correct, rating, gameType) {
    if (!cardId) return 0;
    const reviewedCardIds = this.data.reviewedCardIds || {};
    if (reviewedCardIds[cardId]) {
      storage.appendReviewEvent({
        kind: 'arcade_attempt_duplicate',
        game_type: gameType || this.data.selectedGame || 'whack',
        card_id: cardId,
        review_rating: rating || (correct ? 'good' : 'again'),
        result: correct ? 'correct' : 'wrong',
        xp: 0
      });
      return 0;
    }
    const reviewRating = rating || (correct ? 'good' : 'again');
    const before = storage.loadGameProfile ? storage.loadGameProfile() : {};
    reviewCards.reviewCard(cardId, reviewRating);
    const after = storage.loadGameProfile ? storage.loadGameProfile() : before;
    const xpAccepted = Math.max(0, Number(after.xp || 0) - Number(before.xp || 0));
    storage.appendReviewEvent({
      kind: 'arcade_attempt',
      game_type: gameType || this.data.selectedGame || 'whack',
      card_id: cardId,
      review_rating: reviewRating,
      result: correct ? 'correct' : 'wrong',
      xp: xpAccepted
    });
    this.setData({
      reviewedCardIds: Object.assign({}, reviewedCardIds, {
        [cardId]: true
      })
    });
    return xpAccepted;
  },

  buildQuestionProgressionSignal(result = {}, wrongAnswers = []) {
    const bank = this.data.courseUnitQuestionBank || {};
    const activeCards = Array.isArray(bank.activeCards) ? bank.activeCards : [];
    const progressionCards = activeCards.filter((card) => card && card.progression);
    const first = progressionCards[0] || {};
    const progression = first.progression || {};
    const accuracy = Number(result.accuracy || 0);
    const status = accuracy >= 80 && !wrongAnswers.length ? 'mastery_gate_ready' : 'needs_next_revisit';
    return {
      status,
      activeCardCount: progressionCards.length,
      stageCount: progressionCards.reduce((sum, card) => sum + Number(card.progression && card.progression.stageCount || 0), 0),
      masteryGateCount: progressionCards.filter((card) => card.progression && card.progression.masteryGate).length,
      nextDayRevisit: progression.nextDayRevisit || '明天只回访一张最不稳的题型卡。',
      masteryGate: progression.masteryGate || '第一步、错因、近迁移连续稳定两次再通过。',
      parentEvidence: progression.parentEvidence || '家长只看第一步、错因和回访证据，不看分数排名。',
      visualBoardStep: progression.visualBoardStep || '',
      safetyBoundary: progression.safetyBoundary || '不生成完整答案，不替孩子写过程。'
    };
  },

  finishRound(answers, bestCombo, score, lives) {
    const result = arcade.summarizeAttempt({
      gameType: this.data.selectedGame || 'whack',
      expectedTotal: this.data.round.total,
      bestCombo,
      answers
    });
    const profile = storage.loadGameProfile ? storage.loadGameProfile() : {};
    const xpGained = Math.max(0, Number(profile.xp || 0) - Number(this.data.startXp || 0));
    const savedResult = Object.assign({}, result, { xp: xpGained });
    const wrongAnswers = arcade.uniqueWrongAnswers(answers);
    const repairFocus = wrongAnswers.length ? arcade.buildRepairFocus(wrongAnswers[0], this.data.cards) : null;
    const gameRetention = storage.recordGameSessionResult
      ? storage.recordGameSessionResult(savedResult, { gameType: savedResult.gameType })
      : null;
    const gameRetentionLoop = gameLogic.buildGameRetentionLoop
      ? gameLogic.buildGameRetentionLoop(
        gameRetention && gameRetention.profile ? gameRetention.profile : profile,
        savedResult,
        this.data.adaptiveChallenge,
        this.data.dailyQuestSet,
        { weakKey: repairFocus && repairFocus.title ? repairFocus.title : '' }
      )
      : null;
    const socraticQualityEvaluationSuite = tutorLadder.buildSocraticQualityEvaluationSuite
      ? tutorLadder.buildSocraticQualityEvaluationSuite(this.data.recentTaskType || 'unknown')
      : null;
    const highFrequencyPracticeLoop = gameLogic.buildHighFrequencyPracticeLoop
      ? gameLogic.buildHighFrequencyPracticeLoop(
        gameRetention && gameRetention.profile ? gameRetention.profile : profile,
        this.data.cards,
        storage.loadReviewEvents ? storage.loadReviewEvents() : [],
        savedResult,
        this.data.adaptiveChallenge,
        this.data.dailyQuestSet,
        {
          retentionLoop: gameRetentionLoop,
          weakKey: repairFocus && repairFocus.title ? repairFocus.title : '',
          taskType: this.data.recentTaskType || 'unknown',
          socraticQualityEvaluationSuite,
          courseUnitQuestionBank: this.data.courseUnitQuestionBank
        }
      )
      : null;
    const socraticQualityMemoryBridge = highFrequencyPracticeLoop && highFrequencyPracticeLoop.socraticQualityMemoryBridge
      ? highFrequencyPracticeLoop.socraticQualityMemoryBridge
      : null;
    const questionBankMemoryBridge = highFrequencyPracticeLoop && highFrequencyPracticeLoop.questionBankMemoryBridge
      ? highFrequencyPracticeLoop.questionBankMemoryBridge
      : null;
    const questionBankRecallWorkout = highFrequencyPracticeLoop && highFrequencyPracticeLoop.questionBankRecallWorkout
      ? highFrequencyPracticeLoop.questionBankRecallWorkout
      : null;
    const dailyMemorySprintDeck = highFrequencyPracticeLoop && highFrequencyPracticeLoop.dailyMemorySprintDeck
      ? highFrequencyPracticeLoop.dailyMemorySprintDeck
      : null;
    const adaptiveRecallScheduler = highFrequencyPracticeLoop && highFrequencyPracticeLoop.adaptiveRecallScheduler
      ? highFrequencyPracticeLoop.adaptiveRecallScheduler
      : null;
    const memoryRiskReleaseModel = highFrequencyPracticeLoop && highFrequencyPracticeLoop.memoryRiskReleaseModel
      ? highFrequencyPracticeLoop.memoryRiskReleaseModel
      : null;
    const questArcSignal = storage.recordQuestArcGameSignal
      ? storage.recordQuestArcGameSignal({
        mission: this.data.questArcMission,
        result: savedResult
      }, { gameType: savedResult.gameType })
      : null;
    const incomingShare = storage.loadIncomingShare ? storage.loadIncomingShare() : null;
    const questionProgressionSignal = this.buildQuestionProgressionSignal(savedResult, wrongAnswers);
    storage.appendSyncMutation('arcade_attempt', {
      game_type: savedResult.gameType,
      total: savedResult.total,
      correct: savedResult.correct,
      wrong: savedResult.wrong,
      accuracy: savedResult.accuracy,
      xp: savedResult.xp,
      best_combo: savedResult.bestCombo,
      subject_depth_task_type: this.data.subjectSkillDepth && this.data.subjectSkillDepth.taskType,
      subject_depth_label: this.data.subjectSkillDepth && this.data.subjectSkillDepth.label,
      curriculum_subject: this.data.curriculumSpine && this.data.curriculumSpine.subjectLabel,
      curriculum_node: this.data.curriculumSpine && this.data.curriculumSpine.currentNode && this.data.curriculumSpine.currentNode.label,
      course_unit_subject: this.data.courseUnitMap && this.data.courseUnitMap.active ? this.data.courseUnitMap.active.label : '',
      course_unit_count: this.data.courseUnitMap ? this.data.courseUnitMap.unitCount : 0,
      course_unit_question_types: this.data.courseUnitMap ? this.data.courseUnitMap.reusableQuestionTypeCount : 0,
      course_unit_trajectory_rows: this.data.courseUnitMasteryTrajectory && Array.isArray(this.data.courseUnitMasteryTrajectory.trajectories)
        ? this.data.courseUnitMasteryTrajectory.trajectories.length
        : 0,
      question_progression_status: questionProgressionSignal.status,
      question_progression_cards: questionProgressionSignal.activeCardCount,
      question_progression_stages: questionProgressionSignal.stageCount,
      question_progression_mastery_gates: questionProgressionSignal.masteryGateCount,
      question_progression_revisit: questionProgressionSignal.nextDayRevisit,
      retention_mode: gameRetentionLoop && gameRetentionLoop.mode,
      retention_next_route: gameRetentionLoop && gameRetentionLoop.nextRoute,
      retention_weak_key: gameRetentionLoop && gameRetentionLoop.weakKey,
      high_frequency_mode: highFrequencyPracticeLoop && highFrequencyPracticeLoop.mode,
      high_frequency_next_route: highFrequencyPracticeLoop && highFrequencyPracticeLoop.nextRoute,
      memory_feedback_severity: highFrequencyPracticeLoop && highFrequencyPracticeLoop.memoryFeedbackController
        ? highFrequencyPracticeLoop.memoryFeedbackController.severity
        : '',
      memory_feedback_triggered: highFrequencyPracticeLoop && highFrequencyPracticeLoop.memoryFeedbackController
        ? highFrequencyPracticeLoop.memoryFeedbackController.triggered
        : false,
      recall_intensity_tier: highFrequencyPracticeLoop && highFrequencyPracticeLoop.recallIntensityPlan
        ? highFrequencyPracticeLoop.recallIntensityPlan.tier
        : '',
      wrong_cause_replay_count: highFrequencyPracticeLoop && highFrequencyPracticeLoop.wrongCauseReplayDeck
        ? highFrequencyPracticeLoop.wrongCauseReplayDeck.cards.length
        : 0,
      xp_feedback_policy: highFrequencyPracticeLoop && highFrequencyPracticeLoop.xpFeedbackPolicy
        ? highFrequencyPracticeLoop.xpFeedbackPolicy.title
        : '',
      quest_arc_runway_stages: highFrequencyPracticeLoop && highFrequencyPracticeLoop.questArcRunway
        ? highFrequencyPracticeLoop.questArcRunway.stages.length
        : 0,
      gizmo_memory_protocol_tier: highFrequencyPracticeLoop && highFrequencyPracticeLoop.gizmoLikeMemoryProtocol
        ? highFrequencyPracticeLoop.gizmoLikeMemoryProtocol.intensityTier
        : '',
      gizmo_memory_return_windows: highFrequencyPracticeLoop && highFrequencyPracticeLoop.gizmoLikeMemoryProtocol
        ? highFrequencyPracticeLoop.gizmoLikeMemoryProtocol.returnWindows.length
        : 0,
      gizmo_memory_anti_cram: highFrequencyPracticeLoop && highFrequencyPracticeLoop.gizmoLikeMemoryProtocol
        ? highFrequencyPracticeLoop.gizmoLikeMemoryProtocol.antiCramThrottle.active
        : false,
      socratic_quality_memory_scenarios: socraticQualityMemoryBridge
        ? socraticQualityMemoryBridge.scenarioCount
        : 0,
      socratic_quality_memory_actions: socraticQualityMemoryBridge && Array.isArray(socraticQualityMemoryBridge.memoryActions)
        ? socraticQualityMemoryBridge.memoryActions.length
        : 0,
      socratic_quality_memory_xp_gate: socraticQualityMemoryBridge
        ? socraticQualityMemoryBridge.xpGate
        : '',
      question_bank_memory_cards: questionBankMemoryBridge
        ? questionBankMemoryBridge.questionCardCount
        : 0,
      question_bank_memory_active: questionBankMemoryBridge
        ? questionBankMemoryBridge.activeDeck.length
        : 0,
      question_bank_memory_gate: questionBankMemoryBridge
        ? questionBankMemoryBridge.xpGate
        : '',
      question_bank_recall_workout_mode: questionBankRecallWorkout
        ? questionBankRecallWorkout.mode
        : '',
      question_bank_recall_workout_cards: questionBankRecallWorkout && Array.isArray(questionBankRecallWorkout.workoutCards)
        ? questionBankRecallWorkout.workoutCards.length
        : 0,
      question_bank_recall_workout_phases: questionBankRecallWorkout && Array.isArray(questionBankRecallWorkout.phases)
        ? questionBankRecallWorkout.phases.length
        : 0,
      question_bank_recall_workout_boundary: questionBankRecallWorkout
        ? questionBankRecallWorkout.shareBoundary
        : '',
      daily_memory_sprint_mode: dailyMemorySprintDeck
        ? dailyMemorySprintDeck.mode
        : '',
      daily_memory_sprint_cards: dailyMemorySprintDeck && Array.isArray(dailyMemorySprintDeck.sprintCards)
        ? dailyMemorySprintDeck.sprintCards.length
        : 0,
      daily_memory_sprint_locks: dailyMemorySprintDeck && Array.isArray(dailyMemorySprintDeck.lockRules)
        ? dailyMemorySprintDeck.lockRules.length
        : 0,
      daily_memory_sprint_streak_meters: dailyMemorySprintDeck && Array.isArray(dailyMemorySprintDeck.streakMeters)
        ? dailyMemorySprintDeck.streakMeters.length
        : 0,
      daily_memory_sprint_boundary: dailyMemorySprintDeck
        ? dailyMemorySprintDeck.shareBoundary
        : '',
      adaptive_recall_scheduler_mode: adaptiveRecallScheduler
        ? adaptiveRecallScheduler.mode
        : '',
      adaptive_recall_scheduler_boxes: adaptiveRecallScheduler && Array.isArray(adaptiveRecallScheduler.schedulerBoxes)
        ? adaptiveRecallScheduler.schedulerBoxes.length
        : 0,
      adaptive_recall_scheduler_queue: adaptiveRecallScheduler && Array.isArray(adaptiveRecallScheduler.reviewQueue)
        ? adaptiveRecallScheduler.reviewQueue.length
        : 0,
      adaptive_recall_scheduler_evidence: adaptiveRecallScheduler && Array.isArray(adaptiveRecallScheduler.evidenceRequired)
        ? adaptiveRecallScheduler.evidenceRequired.length
        : 0,
      memory_risk_release_level: memoryRiskReleaseModel ? memoryRiskReleaseModel.level : '',
      memory_risk_signals: memoryRiskReleaseModel && Array.isArray(memoryRiskReleaseModel.riskSignals)
        ? memoryRiskReleaseModel.riskSignals.length
        : 0,
      memory_forgetting_warnings: memoryRiskReleaseModel && Array.isArray(memoryRiskReleaseModel.forgettingWarnings)
        ? memoryRiskReleaseModel.forgettingWarnings.length
        : 0,
      memory_variant_release_gates: memoryRiskReleaseModel && Array.isArray(memoryRiskReleaseModel.variantReleaseGates)
        ? memoryRiskReleaseModel.variantReleaseGates.length
        : 0,
      memory_risk_share_boundary: memoryRiskReleaseModel ? memoryRiskReleaseModel.shareBoundary : '',
      peer_memory_relay_mode: highFrequencyPracticeLoop && highFrequencyPracticeLoop.peerMemoryRelayLeague
        ? highFrequencyPracticeLoop.peerMemoryRelayLeague.mode
        : '',
      peer_memory_relay_lanes: highFrequencyPracticeLoop && highFrequencyPracticeLoop.peerMemoryRelayLeague
        ? highFrequencyPracticeLoop.peerMemoryRelayLeague.lanes.length
        : 0,
      peer_memory_relay_blocked_fields: highFrequencyPracticeLoop && highFrequencyPracticeLoop.peerMemoryRelayLeague
        ? highFrequencyPracticeLoop.peerMemoryRelayLeague.blockedFields.length
        : 0,
      ninety_second_combo_mode: highFrequencyPracticeLoop && highFrequencyPracticeLoop.ninetySecondRecallComboEngine
        ? highFrequencyPracticeLoop.ninetySecondRecallComboEngine.mode
        : '',
      ninety_second_combo_steps: highFrequencyPracticeLoop && highFrequencyPracticeLoop.ninetySecondRecallComboEngine
        ? highFrequencyPracticeLoop.ninetySecondRecallComboEngine.comboSteps.length
        : 0,
      ninety_second_combo_rewards: highFrequencyPracticeLoop && highFrequencyPracticeLoop.ninetySecondRecallComboEngine
        ? highFrequencyPracticeLoop.ninetySecondRecallComboEngine.rewardLadder.length
        : 0,
      share_code: incomingShare && incomingShare.share_code ? incomingShare.share_code : ''
    });
    if (storage.saveTodaySession) {
      const session = storage.getTodaySession ? storage.getTodaySession() : {};
      const cause = this.wrongCauseForLoop(session);
      const rewardLine = savedResult.passed
        ? `完成一次${cause.wrongCauseLabel}轻练，学习记录已写回。`
        : `${cause.wrongCauseLabel}会回到下次复习，不算失败。`;
      storage.saveTodaySession({
        gamePlayed: true,
        gameEvidence: {
          taskType: session.taskType || this.data.recentTaskType || 'unknown',
          firstStep: session.childArticulatedStep || '',
          wrongCauseBucket: cause.wrongCauseBucket,
          wrongCauseLabel: cause.wrongCauseLabel,
          subjectSkillDepth: this.data.subjectSkillDepth,
          subjectDepthTaskType: this.data.subjectSkillDepth && this.data.subjectSkillDepth.taskType,
          subjectDepthLabel: this.data.subjectSkillDepth && this.data.subjectSkillDepth.label,
          curriculumSpine: this.data.curriculumSpine,
          courseUnitMap: this.data.courseUnitMap,
          courseUnitQuestionBank: this.data.courseUnitQuestionBank,
          questionProgressionSignal,
          nextPracticePlan: cause,
          score: Number(savedResult.accuracy || 0),
          adaptiveMode: this.data.adaptiveChallenge && this.data.adaptiveChallenge.mode,
          adaptiveBossCard: this.data.adaptiveChallenge && this.data.adaptiveChallenge.bossCard,
          questArcMission: this.data.questArcMission,
          questArcSignalId: questArcSignal && questArcSignal.id ? questArcSignal.id : '',
          dailyQuestIds: this.data.dailyQuestSet && Array.isArray(this.data.dailyQuestSet.quests)
            ? this.data.dailyQuestSet.quests.map((item) => item.id)
            : [],
          completed: true,
          streak: gameRetention && gameRetention.profile ? Number(gameRetention.profile.streak || 0) : 0,
          newlyUnlocked: gameRetention && gameRetention.newlyUnlocked ? gameRetention.newlyUnlocked.map((item) => item.id) : [],
          rewardLine,
          gameRetentionLoop,
          highFrequencyPracticeLoop
        }
      });
    }
    api.submitEvent({
      event: 'arcade_completed',
      source: 'arcade',
      entity_id: savedResult.gameType,
      page: 'arcade',
      payload: {
        game_type: savedResult.gameType,
        total: savedResult.total,
        correct: savedResult.correct,
        wrong: savedResult.wrong,
        accuracy: savedResult.accuracy,
        xp: savedResult.xp,
        best_combo: savedResult.bestCombo,
        adaptive_mode: this.data.adaptiveChallenge && this.data.adaptiveChallenge.mode,
        subject_depth_task_type: this.data.subjectSkillDepth && this.data.subjectSkillDepth.taskType,
        subject_depth_label: this.data.subjectSkillDepth && this.data.subjectSkillDepth.label,
        curriculum_subject: this.data.curriculumSpine && this.data.curriculumSpine.subjectLabel,
        curriculum_node: this.data.curriculumSpine && this.data.curriculumSpine.currentNode && this.data.curriculumSpine.currentNode.label,
        course_unit_subject: this.data.courseUnitMap && this.data.courseUnitMap.active ? this.data.courseUnitMap.active.label : '',
        course_unit_count: this.data.courseUnitMap ? this.data.courseUnitMap.unitCount : 0,
        course_unit_question_types: this.data.courseUnitMap ? this.data.courseUnitMap.reusableQuestionTypeCount : 0,
        course_unit_trajectory_rows: this.data.courseUnitMasteryTrajectory && Array.isArray(this.data.courseUnitMasteryTrajectory.trajectories)
          ? this.data.courseUnitMasteryTrajectory.trajectories.length
          : 0,
        question_progression_status: questionProgressionSignal.status,
        question_progression_cards: questionProgressionSignal.activeCardCount,
        question_progression_stages: questionProgressionSignal.stageCount,
        question_progression_mastery_gates: questionProgressionSignal.masteryGateCount,
        question_progression_revisit: questionProgressionSignal.nextDayRevisit,
        quest_arc_stage: this.data.questArcMission && this.data.questArcMission.currentStage,
        quest_arc_mission: this.data.questArcMission && this.data.questArcMission.title,
        retention_mode: gameRetentionLoop && gameRetentionLoop.mode,
        retention_next_route: gameRetentionLoop && gameRetentionLoop.nextRoute,
        retention_evidence: gameRetentionLoop && Array.isArray(gameRetentionLoop.evidenceRequired)
          ? gameRetentionLoop.evidenceRequired.join(',')
          : '',
        high_frequency_mode: highFrequencyPracticeLoop && highFrequencyPracticeLoop.mode,
        high_frequency_evidence: highFrequencyPracticeLoop && Array.isArray(highFrequencyPracticeLoop.evidenceRequired)
          ? highFrequencyPracticeLoop.evidenceRequired.join(',')
          : '',
        memory_feedback_severity: highFrequencyPracticeLoop && highFrequencyPracticeLoop.memoryFeedbackController
          ? highFrequencyPracticeLoop.memoryFeedbackController.severity
          : '',
        memory_feedback_triggered: highFrequencyPracticeLoop && highFrequencyPracticeLoop.memoryFeedbackController
          ? highFrequencyPracticeLoop.memoryFeedbackController.triggered
          : false,
        recall_intensity_tier: highFrequencyPracticeLoop && highFrequencyPracticeLoop.recallIntensityPlan
          ? highFrequencyPracticeLoop.recallIntensityPlan.tier
          : '',
        wrong_cause_replay_count: highFrequencyPracticeLoop && highFrequencyPracticeLoop.wrongCauseReplayDeck
          ? highFrequencyPracticeLoop.wrongCauseReplayDeck.cards.length
          : 0,
        xp_feedback_policy: highFrequencyPracticeLoop && highFrequencyPracticeLoop.xpFeedbackPolicy
          ? highFrequencyPracticeLoop.xpFeedbackPolicy.title
          : '',
        quest_arc_runway_stages: highFrequencyPracticeLoop && highFrequencyPracticeLoop.questArcRunway
          ? highFrequencyPracticeLoop.questArcRunway.stages.length
          : 0,
        gizmo_memory_protocol_tier: highFrequencyPracticeLoop && highFrequencyPracticeLoop.gizmoLikeMemoryProtocol
          ? highFrequencyPracticeLoop.gizmoLikeMemoryProtocol.intensityTier
          : '',
        gizmo_memory_return_windows: highFrequencyPracticeLoop && highFrequencyPracticeLoop.gizmoLikeMemoryProtocol
          ? highFrequencyPracticeLoop.gizmoLikeMemoryProtocol.returnWindows.length
          : 0,
        gizmo_memory_anti_cram: highFrequencyPracticeLoop && highFrequencyPracticeLoop.gizmoLikeMemoryProtocol
          ? highFrequencyPracticeLoop.gizmoLikeMemoryProtocol.antiCramThrottle.active
          : false,
        socratic_quality_memory_scenarios: socraticQualityMemoryBridge
          ? socraticQualityMemoryBridge.scenarioCount
          : 0,
        socratic_quality_memory_actions: socraticQualityMemoryBridge && Array.isArray(socraticQualityMemoryBridge.memoryActions)
          ? socraticQualityMemoryBridge.memoryActions.length
          : 0,
        socratic_quality_memory_xp_gate: socraticQualityMemoryBridge
          ? socraticQualityMemoryBridge.xpGate
          : '',
        question_bank_memory_cards: questionBankMemoryBridge
          ? questionBankMemoryBridge.questionCardCount
          : 0,
        question_bank_memory_active: questionBankMemoryBridge
          ? questionBankMemoryBridge.activeDeck.length
          : 0,
        question_bank_memory_gate: questionBankMemoryBridge
          ? questionBankMemoryBridge.xpGate
          : '',
        question_bank_recall_workout_mode: questionBankRecallWorkout
          ? questionBankRecallWorkout.mode
          : '',
        question_bank_recall_workout_cards: questionBankRecallWorkout && Array.isArray(questionBankRecallWorkout.workoutCards)
          ? questionBankRecallWorkout.workoutCards.length
          : 0,
        question_bank_recall_workout_phases: questionBankRecallWorkout && Array.isArray(questionBankRecallWorkout.phases)
          ? questionBankRecallWorkout.phases.length
          : 0,
        question_bank_recall_workout_boundary: questionBankRecallWorkout
          ? questionBankRecallWorkout.shareBoundary
          : '',
        daily_memory_sprint_mode: dailyMemorySprintDeck
          ? dailyMemorySprintDeck.mode
          : '',
        daily_memory_sprint_cards: dailyMemorySprintDeck && Array.isArray(dailyMemorySprintDeck.sprintCards)
          ? dailyMemorySprintDeck.sprintCards.length
          : 0,
        daily_memory_sprint_locks: dailyMemorySprintDeck && Array.isArray(dailyMemorySprintDeck.lockRules)
          ? dailyMemorySprintDeck.lockRules.length
          : 0,
        daily_memory_sprint_streak_meters: dailyMemorySprintDeck && Array.isArray(dailyMemorySprintDeck.streakMeters)
          ? dailyMemorySprintDeck.streakMeters.length
          : 0,
        daily_memory_sprint_boundary: dailyMemorySprintDeck
          ? dailyMemorySprintDeck.shareBoundary
          : '',
        adaptive_recall_scheduler_mode: adaptiveRecallScheduler
          ? adaptiveRecallScheduler.mode
          : '',
        adaptive_recall_scheduler_boxes: adaptiveRecallScheduler && Array.isArray(adaptiveRecallScheduler.schedulerBoxes)
          ? adaptiveRecallScheduler.schedulerBoxes.length
          : 0,
        adaptive_recall_scheduler_queue: adaptiveRecallScheduler && Array.isArray(adaptiveRecallScheduler.reviewQueue)
          ? adaptiveRecallScheduler.reviewQueue.length
          : 0,
        adaptive_recall_scheduler_evidence: adaptiveRecallScheduler && Array.isArray(adaptiveRecallScheduler.evidenceRequired)
          ? adaptiveRecallScheduler.evidenceRequired.length
          : 0,
        memory_risk_release_level: memoryRiskReleaseModel ? memoryRiskReleaseModel.level : '',
        memory_risk_signals: memoryRiskReleaseModel && Array.isArray(memoryRiskReleaseModel.riskSignals)
          ? memoryRiskReleaseModel.riskSignals.length
          : 0,
        memory_forgetting_warnings: memoryRiskReleaseModel && Array.isArray(memoryRiskReleaseModel.forgettingWarnings)
          ? memoryRiskReleaseModel.forgettingWarnings.length
          : 0,
        memory_variant_release_gates: memoryRiskReleaseModel && Array.isArray(memoryRiskReleaseModel.variantReleaseGates)
          ? memoryRiskReleaseModel.variantReleaseGates.length
          : 0,
        memory_risk_share_boundary: memoryRiskReleaseModel ? memoryRiskReleaseModel.shareBoundary : '',
        peer_memory_relay_mode: highFrequencyPracticeLoop && highFrequencyPracticeLoop.peerMemoryRelayLeague
          ? highFrequencyPracticeLoop.peerMemoryRelayLeague.mode
          : '',
        peer_memory_relay_lanes: highFrequencyPracticeLoop && highFrequencyPracticeLoop.peerMemoryRelayLeague
          ? highFrequencyPracticeLoop.peerMemoryRelayLeague.lanes.length
          : 0,
        peer_memory_relay_blocked_fields: highFrequencyPracticeLoop && highFrequencyPracticeLoop.peerMemoryRelayLeague
          ? highFrequencyPracticeLoop.peerMemoryRelayLeague.blockedFields.length
          : 0,
        ninety_second_combo_mode: highFrequencyPracticeLoop && highFrequencyPracticeLoop.ninetySecondRecallComboEngine
          ? highFrequencyPracticeLoop.ninetySecondRecallComboEngine.mode
          : '',
        ninety_second_combo_steps: highFrequencyPracticeLoop && highFrequencyPracticeLoop.ninetySecondRecallComboEngine
          ? highFrequencyPracticeLoop.ninetySecondRecallComboEngine.comboSteps.length
          : 0,
        ninety_second_combo_rewards: highFrequencyPracticeLoop && highFrequencyPracticeLoop.ninetySecondRecallComboEngine
          ? highFrequencyPracticeLoop.ninetySecondRecallComboEngine.rewardLadder.length
          : 0,
        boss_gap: this.data.adaptiveChallenge && this.data.adaptiveChallenge.bossCard
          ? this.data.adaptiveChallenge.bossCard.key
          : '',
        wrong_count: wrongAnswers.length,
        share_code: incomingShare && incomingShare.share_code ? incomingShare.share_code : '',
        share_mode: incomingShare && incomingShare.mode ? incomingShare.mode : '',
        identity_tag: incomingShare && incomingShare.identity_tag ? incomingShare.identity_tag : ''
      }
    }).catch(() => {});
    api.submitQuiz({
      answers: arcade.uniqueReviewAnswers(answers),
      attempt_answers: answers,
      mode: `arcade_${savedResult.gameType}`,
      profile: storage.loadGameProfile ? storage.loadGameProfile() : {}
    }).catch(() => {});
    const arcadeResultActionBridge = this.buildArcadeResultActionBridge(savedResult, {
      repairFocus,
      gameRetentionLoop,
      highFrequencyPracticeLoop,
      questionProgressionSignal,
      wrongAnswers,
      incomingShare
    });
    this.setData({
      result: savedResult,
      resultAdvice: arcade.buildRoundAdvice(savedResult, savedResult.gameType),
      gameRetentionLoop,
      highFrequencyPracticeLoop,
      questionProgressionSignal,
      arcadeResultActionBridge,
      challengeBrief: Object.assign({}, this.data.challengeBrief || {}, {
        resultLine: savedResult.accuracy >= Number((this.data.challengeBrief && this.data.challengeBrief.targetAccuracy) || 80)
          ? '本局达到目标，剧情线证据已写回。'
          : '本局未达到目标，错的卡会回到复习队列。'
      }),
      lives,
      score,
      bestCombo,
      xpGained,
      wrongAnswers,
      repairFocus,
      feedbackText: result.passed ? '通关了，错因会按间隔复习继续回访。' : '没关系，错因卡已经回到复习队列。'
    });
  },

  restartRound() {
    const round = this.buildRoundForGame(this.data.selectedGame, this.data.cards, this.data.adaptiveChallenge);
    const next = this.firstQuestionForRound(round, this.data.selectedGame);
    this.setData({
      round,
      currentIndex: 0,
      currentQuestion: next,
      revealed: false,
      snakeTrack: this.data.selectedGame === 'snake' ? next : null,
      snakeTiles: this.data.selectedGame === 'snake' && next ? next.tiles : [],
      snakeNextOrder: 0,
      matchTiles: this.data.selectedGame === 'match' && round.tiles ? round.tiles : [],
      matchSelectedTile: null,
      matchPairsDone: 0,
      activeGame: this.data.recommendations.find((item) => item.id === this.data.selectedGame) || null,
      moleHoles: this.buildHoles(round.questions && round.questions[0], round.holes),
      lives: Number((this.data.adaptiveChallenge && this.data.adaptiveChallenge.lives) || 3),
      combo: 0,
      bestCombo: 0,
      score: 0,
      xpGained: 0,
      answers: [],
      reviewedCardIds: {},
      wrongAnswers: [],
      repairFocus: null,
      result: null,
      resultAdvice: null,
      arcadeResultActionBridge: null,
      highFrequencyPracticeLoop: null,
      emptyGuide: this.emptyGuide(this.data.selectedGame, round),
      feedbackText: '新一局开始。'
    });
  },

  buildArcadeResultActionBridge(result = {}, context = {}) {
    const wrongCount = Array.isArray(context.wrongAnswers) ? context.wrongAnswers.length : Number(result.wrong || 0);
    const retention = context.gameRetentionLoop || {};
    const highFrequency = context.highFrequencyPracticeLoop || {};
    const progression = context.questionProgressionSignal || {};
    const shareCode = context.incomingShare && context.incomingShare.share_code ? context.incomingShare.share_code : '';
    const headline = result.passed
      ? '这局可以收口：明天轻回看一张卡'
      : '这局没过也有价值：错卡已经回队列';
    const evidenceLine = [
      `正确 ${Number(result.correct || 0)}/${Number(result.total || 0)}`,
      wrongCount ? `错因 ${wrongCount} 条` : '没有新增错因',
      result.xp ? `写入 ${result.xp} XP` : '已写入学习记录'
    ].join(' · ');
    const actions = [
      {
        id: 'review',
        label: wrongCount ? '先修错卡' : '明天回看',
        route: '/pages/review/review',
        reason: wrongCount ? '错题回到修卡点，先拆第一步。' : '把今天会的内容变成长期记忆。',
        capabilityId: 'game'
      },
      {
        id: 'profile',
        label: '给家长看',
        route: '/pages/profile/profile',
        reason: '把本局结果放进家长复盘，不只看分数。',
        capabilityId: 'parent_action'
      },
      {
        id: 'tutor',
        label: '再问一步',
        route: context.repairFocus ? '/pages/tutor/tutor?from=arcade_result_bridge' : '/pages/tutor/tutor?from=arcade_result_review',
        reason: '卡住时回到苏格拉底第一步，不直接照抄结果。',
        capabilityId: 'socratic'
      }
    ];
    return {
      title: '本局之后做什么',
      headline,
      evidenceLine,
      tomorrowLine: progression.nextDayRevisit || retention.tomorrowLine || highFrequency.parentShareLine || '明天只回看最不稳的一张卡。',
      masteryGateLine: progression.masteryGate || '',
      parentEvidenceLine: progression.parentEvidence || '',
      shareLine: shareCode ? `来自分享接力 ${shareCode}，本局结果会继续承接。` : '家长页会显示本局证据和下一步。',
      actions
    };
  },

  runGuideAction(event) {
    const action = event.currentTarget.dataset.action || 'goTools';
    if (action && typeof this[action] === 'function') this[action]();
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
      return;
    }
    wx.switchTab({ url: '/pages/home/home' });
  },

  goHome() {
    wx.switchTab({ url: '/pages/home/home' });
  },

  goTools() {
    wx.switchTab({ url: '/pages/tools/tools' });
  },

  goReview() {
    wx.switchTab({ url: '/pages/review/review' });
  },

  runResultSecondary() {
    if (this.data.repairFocus) {
      this.repairWrongCard();
      return;
    }
    this.goReview();
  },

  runArcadeResultBridgeAction(event) {
    const dataset = event.currentTarget.dataset || {};
    const bridge = this.data.arcadeResultActionBridge || {};
    const route = dataset.route || '/pages/review/review';
    const action = {
      source: 'arcade_result_bridge',
      sourceLabel: '轻练习结果行动桥',
      actionId: dataset.id || 'review',
      actionLabel: dataset.label || '明天回看',
      route,
      reasonLine: dataset.reason || bridge.headline || '',
      evidenceLine: bridge.evidenceLine || '',
      shareIntent: bridge.shareLine || ''
    };
    if (storage.recordUnifiedNextAction) {
      storage.recordUnifiedNextAction(Object.assign({}, action, { surface: 'arcade' }));
    }
    if (storage.recordSurfaceDepthAction) {
      storage.recordSurfaceDepthAction({
        surface: 'arcade',
        dimensionId: action.actionId,
        label: action.actionLabel,
        route,
        readiness: 'arcade_result_bridge',
        capabilityId: dataset.capabilityId || 'game'
      });
    }
    if (storage.appendReviewEvent) {
      storage.appendReviewEvent({
        kind: 'arcade_result_bridge_action',
        action_id: action.actionId,
        route,
        evidence: action.evidenceLine
      });
    }
    api.submitEvent({
      event: 'arcade_result_bridge_action',
      source: 'arcade_result',
      entity_id: action.actionId,
      page: 'arcade',
      payload: {
        route,
        action_label: action.actionLabel,
        evidence: action.evidenceLine,
        reason: action.reasonLine
      }
    }).catch(() => {});
    navigation.navigateLearningRoute(route);
  },

  repairWrongCard() {
    const focus = this.data.repairFocus;
    if (!focus || !focus.cardId) {
      this.goReview();
      return;
    }
    storage.set(storage.KEYS.selectedHomework, {
      id: focus.id,
      text: focus.text,
      reason: focus.reason,
      minutes: focus.minutes,
      evidence: {
        tags: focus.tags,
        decision: focus.decision,
        calibration_key: focus.calibrationKey,
        misconception_tags: [
          {
            id: focus.cardId,
            name: focus.knowledgeType,
            axis: focus.gameName,
            suggested_drill: focus.correctAnswer
          }
        ],
        arcade: {
          game_type: focus.gameType,
          selected: focus.selected,
          correct_answer: focus.correctAnswer
        }
      }
    });
    storage.set(storage.KEYS.selectedHomeworkSource, `arcade:${focus.gameType}:${focus.cardId}`);
    storage.appendReviewEvent({
      kind: 'arcade_repair_started',
      game_type: focus.gameType,
      card_id: focus.cardId,
      selected: focus.selected,
      answer: focus.correctAnswer
    });
    wx.navigateTo({ url: '/pages/tutor/tutor?from=arcade' });
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

});
