const ANSWER_REQUEST_RE = /直接告诉我答案|求答案|不想写过程|拍照出答案|直接给结果|告诉我答案|给答案|答案是什么|直接说结果|帮我写答案|代写|tell me the answer/i;
const STUCK_RE = /不会下一步|不知道下一步|不会列式|还是不会|又不会|我不会|卡住|卡住了|不会写|没思路|读不懂|看不懂|不知道怎么写|不会做|不懂/;

const HINT_LADDER = [
  {
    level: 1,
    label: '提示 1/5',
    step: 'read_problem',
    title: '先读题',
    reply: '先不急着做。你用一句话说说：这题真正问的是什么？再圈出两个已知条件。'
  },
  {
    level: 2,
    label: '提示 2/5',
    step: 'write_first_step',
    title: '问第一步',
    reply: '你觉得第一步应该做什么？先说一个想法就行，可以不完整。'
  },
  {
    level: 3,
    label: '提示 3/5',
    step: 'find_direction',
    title: '给方向',
    reply: '方向可以先从“已知条件”和“要求的问题”之间找关系。先别算到最后，只写第一步关系。'
  },
  {
    level: 4,
    label: '提示 4/5',
    step: 'similar_example',
    title: '相似例子',
    reply: '换个相似例子：如果题目问“总量”，通常先找每份量和份数。回到原题，你觉得对应的两个量是什么？'
  },
  {
    level: 5,
    label: '提示 5/5',
    step: 'method_summary',
    title: '总结方法',
    reply: '这类题的方法是：先说题目问什么，再圈已知条件，最后只写第一步关系。要不要把这个方法做成一张复习卡？'
  }
];

const TASK_TYPE_RULES = [
  { id: 'math_word_problem', patterns: /应用题|题目问什么|数量关系|单位1|已知条件|列式|方程|行程|工程|分数应用题/i },
  { id: 'equation_setup', patterns: /方程|等量关系|设x|未知数|列方程|解方程/i },
  { id: 'reading_question', patterns: /阅读|主旨|细节|原因|段意|中心句|概括/i },
  { id: 'english_sentence', patterns: /英语|单词|语法|句型|主语|谓语|时态|词性/i },
  { id: 'physics_diagram', patterns: /物理|受力|电路|光路|运动|速度|压强|浮力|透镜/i },
  { id: 'chemistry_experiment', patterns: /化学|反应|方程式|溶液|气体|沉淀|颜色|酸碱/i },
  { id: 'biology_process', patterns: /生物|细胞|植物|人体|遗传|生态|光合|对照组/i },
  { id: 'geography_map', patterns: /地理|地图|经纬|气候|公转|自转|昼夜|地形|图例/i },
  { id: 'writing_process', patterns: /作文|写作|开头|结尾|提纲|续写|作文题/i }
];

const TASK_TYPE_PROMPTS = {
  math_word_problem: '先把题干里的已知条件圈出来，再说题目问什么。',
  equation_setup: '先把未知数写出来，再找等量关系。',
  reading_question: '先看题目问的是细节、主旨还是原因。',
  english_sentence: '先找主语和谓语，再看时态。',
  physics_diagram: '先定研究对象，再画第一根方向或状态标记。',
  chemistry_experiment: '先列反应前后物质，再说看到的现象。',
  biology_process: '先把结构和功能连起来，再排过程顺序。',
  geography_map: '先看方向、图例和位置，再说第一条原因链。',
  writing_process: '先写一句最简单的开头，再慢慢补。',
  unknown: '先说你准备从哪一步开始。'
};

function detectTaskType(text = '', selected = {}) {
  const source = `${text || ''} ${selected.text || ''}`;
  const hit = TASK_TYPE_RULES.find((item) => item.patterns.test(source));
  return hit ? hit.id : 'unknown';
}

function isAnswerRequest(text) {
  return ANSWER_REQUEST_RE.test(String(text || ''));
}

function isStuckText(text) {
  return STUCK_RE.test(String(text || ''));
}

function countRecentStuck(messages = [], incomingText = '') {
  const recent = (Array.isArray(messages) ? messages : [])
    .filter((item) => item && item.role === 'user')
    .slice(-2)
    .map((item) => String(item.text || ''));
  if (incomingText) recent.push(String(incomingText || ''));
  return recent.filter(isStuckText).length;
}

function normalizeLevel(level) {
  const value = Number(level || 1);
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(5, Math.round(value)));
}

const MISCONCEPTION_MAP = {
  math_word_problem: {
    what_is_asked: '可能还没有分清题目问什么和已经给了什么。',
    known_conditions: '可能漏圈了条件、单位或隐藏的关键词。',
    quantity_relation: '可能还没有把两个量之间的关系说成一句话。',
    first_equation: '可能急着算结果，还没有把第一步关系写出来。',
    transfer_check: '需要换一道同类小题，确认方法能迁移。'
  },
  equation_setup: {
    unknown_value: '可能没有先设清楚未知数代表什么。',
    equal_relation: '可能找不到哪两边应该相等。',
    first_equation: '可能把关系和计算混在一起，先要写等量关系。',
    solve_check: '可能需要先复述每一步为什么可以这样变形。',
    transfer_check: '需要换一个数值更小的方程检查迁移。'
  },
  reading_question: {
    question_type: '可能没有先判断这是细节、主旨、原因还是推断题。',
    text_evidence: '可能离开原文凭感觉答，需要回到句子证据。',
    sentence_anchor: '可能找到了段落，但没有锚定具体句子。',
    answer_boundary: '可能答得太宽，需要缩回题目问的范围。',
    transfer_check: '需要换一段短文本再找一次证据句。'
  },
  english_sentence: {
    subject_predicate: '可能没有先找主语和谓语。',
    tense_signal: '可能忽略了时间词和时态信号。',
    sentence_pattern: '可能没有识别固定结构。',
    error_check: '可能需要先只查一个错误点，而不是整句重写。',
    transfer_check: '需要换一个同结构句子检查。'
  },
  physics_diagram: {
    object_state: '可能还没确定研究对象和初末状态。',
    diagram_first: '可能没有先画出第一根方向、力或光路。',
    law_match: '可能公式和图示没有连起来。',
    error_check: '可能需要先只检查一个方向或状态。',
    transfer_check: '需要换一个小情境检查能否先画图。'
  },
  chemistry_experiment: {
    substance_state: '可能还没有分清反应前后物质和状态。',
    phenomenon_reason: '可能只记现象，没说现象来自哪里。',
    equation_check: '可能方程式、条件和守恒没有对应。',
    error_check: '可能需要先只查一个守恒点。',
    transfer_check: '需要换一个实验现象检查能否先说物质和原因。'
  },
  biology_process: {
    structure_function: '可能把结构名称和功能关系背散了。',
    process_order: '可能过程顺序没有排清。',
    evidence_reason: '可能现象和结论之间缺证据。',
    error_check: '可能需要先只连一个结构和功能。',
    transfer_check: '需要换一个生命过程检查能否先说结构功能。'
  },
  geography_map: {
    map_reading: '可能没有先看方向、图例和位置。',
    region_position: '可能区域特征没有定清。',
    cause_chain: '可能因果链跳步，只背了结论。',
    error_check: '可能需要先只找一个位置特征。',
    transfer_check: '需要换一张图检查能否先定位。'
  },
  writing_process: {
    one_sentence_start: '可能想一次写完整篇，先降到一句开头。',
    outline_anchor: '可能没有确定这段围绕哪一个意思。',
    example_detail: '可能缺少一个具体例子或画面。',
    rewrite_check: '可能需要只改一句，而不是推翻整篇。',
    transfer_check: '需要换一个题目复用同一个开头方法。'
  },
  unknown: {
    what_is_asked: '可能还没说清题目真正问什么。',
    first_step: '可能知道大概方向，但没有落到可执行第一步。',
    blocking_point: '可能卡点太大，需要缩小到一个动作。',
    similar_example: '可能需要先看一个相似结构。',
    transfer_check: '需要换一个更小任务检查能否迁移。'
  }
};

function ladderItem(level) {
  return HINT_LADDER[normalizeLevel(level) - 1] || HINT_LADDER[0];
}

function diagnosticProbe(taskType, level) {
  const normalized = normalizeLevel(level);
  const probes = {
    math_word_problem: ['what_is_asked', 'known_conditions', 'quantity_relation', 'first_equation', 'transfer_check'],
    equation_setup: ['unknown_value', 'equal_relation', 'first_equation', 'solve_check', 'transfer_check'],
    reading_question: ['question_type', 'text_evidence', 'sentence_anchor', 'answer_boundary', 'transfer_check'],
    english_sentence: ['subject_predicate', 'tense_signal', 'sentence_pattern', 'error_check', 'transfer_check'],
    physics_diagram: ['object_state', 'diagram_first', 'law_match', 'error_check', 'transfer_check'],
    chemistry_experiment: ['substance_state', 'phenomenon_reason', 'equation_check', 'error_check', 'transfer_check'],
    biology_process: ['structure_function', 'process_order', 'evidence_reason', 'error_check', 'transfer_check'],
    geography_map: ['map_reading', 'region_position', 'cause_chain', 'error_check', 'transfer_check'],
    writing_process: ['one_sentence_start', 'outline_anchor', 'example_detail', 'rewrite_check', 'transfer_check'],
    unknown: ['what_is_asked', 'first_step', 'blocking_point', 'similar_example', 'transfer_check']
  };
  const list = probes[taskType] || probes.unknown;
  const axis = list[normalized - 1] || list[0];
  const misconceptionMap = MISCONCEPTION_MAP[taskType] || MISCONCEPTION_MAP.unknown;
  const taskPrompt = TASK_TYPE_PROMPTS[taskType] || TASK_TYPE_PROMPTS.unknown;
  return {
    axis,
    prompt: taskPrompt,
    goal: normalized >= 5
      ? '确认孩子能把同一个方法迁移到一题小变式。'
      : '确认孩子能先说出一个可执行的第一步。',
    misconception: misconceptionMap[axis] || misconceptionMap.first_step || MISCONCEPTION_MAP.unknown.first_step,
    evidenceNeeded: normalized >= 5 ? 'student_solves_transfer_prompt' : 'student_states_next_small_step',
    allowedMoves: normalized >= 4
      ? ['two_choice_prompt', 'similar_example', 'student_restates_first_step']
      : ['ask_student_first_step', 'reflect_stuck_point', 'minimal_hint'],
    transferPrompt: normalized >= 5 ? 'make_one_similar_problem_or_review_card' : 'wait_for_student_first_step'
  };
}

function buildQuestionTypeSocraticPath(taskType = 'unknown', item = {}, probe = {}) {
  const normalizedType = MISCONCEPTION_MAP[taskType] ? taskType : 'unknown';
  const misconceptionMap = MISCONCEPTION_MAP[normalizedType] || MISCONCEPTION_MAP.unknown;
  const prompt = TASK_TYPE_PROMPTS[normalizedType] || TASK_TYPE_PROMPTS.unknown;
  const axes = Object.keys(misconceptionMap);
  const level = normalizeLevel(item && item.level);
  const probeBank = axes.map((axis, index) => ({
    id: `${normalizedType}_${axis}`,
    order: index + 1,
    axis,
    misconception: misconceptionMap[axis],
    question: index === 0 ? prompt : `这一步卡住时，先检查：${misconceptionMap[axis]}`,
    evidence: axis === 'transfer_check' ? 'transfer_prompt_answered' : `socratic_${axis}`,
    stopRule: '孩子能说出第一步或证据句就停，不继续给完整答案。'
  }));
  const visualMoves = probeBank.slice(0, 3).map((bank, index) => ({
    id: `${bank.id}_visual`,
    order: index + 1,
    label: index === 0 ? '定位' : index === 1 ? '证据' : '迁移',
    boardMove: `小黑板只画「${bank.axis}」这一笔`,
    parentPrompt: `你能指出这一步对应哪里吗？`,
    avoid: '不写完整解法，不替孩子组织最终答案。'
  }));
  const fallbackLadder = [
    {
      id: 'silent',
      label: '沉默',
      trigger: '孩子沉默或说不会',
      move: '降到二选一，让孩子选 A 或 B',
      route: '/pages/tutor/tutor?from=socratic_path'
    },
    {
      id: 'answer_request',
      label: '要答案',
      trigger: '孩子要求直接答案或代写',
      move: '拦住答案，只问题目问什么',
      route: '/pages/tutor/tutor?from=socratic_answer_boundary'
    },
    {
      id: 'wrong_again',
      label: '同错因再错',
      trigger: '同一轴连续两次卡住',
      move: '回到修卡点和轻回访，不加题量',
      route: '/pages/review/review?from=socratic_path'
    }
  ];
  return {
    id: `question_type_socratic_path_${normalizedType}`,
    title: '题型级追问路径',
    taskType: normalizedType,
    level,
    scaleLine: `已覆盖 ${axes.length} 个题型误区轴；当前只输出第一步追问和小黑板动作。`,
    activeAxis: probe.axis || axes[Math.max(0, level - 1)] || axes[0],
    probeBank,
    visualMoves,
    fallbackLadder,
    evidenceContractLine: '证据合同：误区轴 + 孩子第一步 + 失败兜底 + 次日回访。',
    parentCheckLine: '家长只检查孩子是否能说出第一步，不检查完整答案。',
    noFullAnswerBoundary: '不提供完整答案、不代写、不生成全科自动板书。',
    route: level >= 4 ? '/pages/review/review?from=socratic_path' : '/pages/tutor/tutor?from=socratic_path'
  };
}

function buildQuestionTypeCoverageAtlas(activeTaskType = 'unknown') {
  const taskTypes = Object.keys(MISCONCEPTION_MAP);
  const paths = taskTypes.map((taskType) => {
    const path = buildQuestionTypeSocraticPath(taskType, { level: 2 }, diagnosticProbe(taskType, 2));
    return {
      id: path.id,
      taskType,
      title: path.title,
      active: taskType === activeTaskType,
      probeCount: path.probeBank.length,
      visualMoveCount: path.visualMoves.length,
      fallbackCount: path.fallbackLadder.length,
      firstProbe: path.probeBank[0] ? path.probeBank[0].question : '',
      firstBoardMove: path.visualMoves[0] ? path.visualMoves[0].boardMove : '',
      evidenceContractLine: path.evidenceContractLine,
      noFullAnswerBoundary: path.noFullAnswerBoundary
    };
  });
  const active = paths.find((item) => item.taskType === activeTaskType) || paths.find((item) => item.taskType === 'unknown') || paths[0];
  return {
    id: 'question_type_coverage_atlas',
    title: '题型级追问覆盖图谱',
    summary: `已覆盖 ${paths.length} 类题型，每类都有误区轴、第一步小黑板和失败兜底。`,
    activeTaskType: active ? active.taskType : 'unknown',
    activeLine: active ? `${active.firstProbe}｜${active.firstBoardMove}` : '',
    paths,
    totalProbeCount: paths.reduce((sum, item) => sum + item.probeCount, 0),
    totalVisualMoveCount: paths.reduce((sum, item) => sum + item.visualMoveCount, 0),
    totalFallbackCount: paths.reduce((sum, item) => sum + item.fallbackCount, 0),
    boundary: '只做第一步追问和可视化提示，不给完整答案，不承诺全科自动板书讲题。'
  };
}

function buildSocraticQualityEvaluationSuite(activeTaskType = 'unknown') {
  const taskTypes = Object.keys(MISCONCEPTION_MAP);
  const cases = taskTypes.map((taskType) => {
    const path = buildQuestionTypeSocraticPath(taskType, { level: 3 }, diagnosticProbe(taskType, 3));
    const firstProbe = path.probeBank[0] || {};
    const fallback = path.fallbackLadder[0] || {};
    return {
      id: `quality_case_${taskType}`,
      taskType,
      active: taskType === activeTaskType,
      probeGate: firstProbe.misconception || '',
      visualGate: path.visualMoves[0] ? path.visualMoves[0].boardMove : '',
      fallbackGate: fallback.move || '',
      scenarios: [
        {
          id: 'silent_child',
          trigger: '孩子沉默或只说不会',
          expectedMove: '降到 A/B 微选择，让孩子先选一个方向',
          passEvidence: 'child_micro_choice'
        },
        {
          id: 'answer_request',
          trigger: '孩子直接要答案或要求代写',
          expectedMove: '拦住完整答案，只回到题目问什么和第一步',
          passEvidence: 'blocked_full_answer'
        },
        {
          id: 'wrong_axis',
          trigger: '孩子答偏或抓错条件',
          expectedMove: firstProbe.question || '回到当前题型误区轴，只问一个定位问题',
          passEvidence: firstProbe.evidence || 'socratic_axis_evidence'
        },
        {
          id: 'transfer_fail',
          trigger: '同类小变式仍然卡住',
          expectedMove: '停止加题，转错因卡和明日回访',
          passEvidence: 'next_day_revisit'
        }
      ],
      passLine: '通过标准：孩子能说出自己的第一步；说不出时有降阶；要答案时不泄露完整答案；迁移失败时回访。',
      parentLine: '家长只看第一步、A/B 选择、错因回退和明天回访，不看完整解法。'
    };
  });
  const activeCase = cases.find((item) => item.taskType === activeTaskType) || cases.find((item) => item.taskType === 'unknown') || cases[0];
  return {
    id: 'socratic_quality_evaluation_suite',
    title: '题型质量评测集',
    activeTaskType: activeCase ? activeCase.taskType : 'unknown',
    summary: `覆盖 ${cases.length} 类题型，每类用 4 个真实卡住场景验收追问、可视化提示和失败兜底。`,
    cases,
    totalScenarioCount: cases.reduce((sum, item) => sum + item.scenarios.length, 0),
    gates: [
      '不输出完整答案',
      '必须要孩子说第一步',
      '沉默时降到 A/B 微选择',
      '答偏时回到题型误区轴',
      '迁移失败时转明日回访'
    ],
    activeCase,
    reportLine: '这不是多讲一点，而是把每种卡住场景变成可复测的点拨质量门槛。',
    shareBoundary: '评测只沉淀动作证据，不分享原题照片、完整对话、分数或排名。'
  };
}

function buildSocraticContract(taskType, item, probe) {
  const normalized = normalizeLevel(item && item.level);
  const nextQuestions = {
    math_word_problem: '题目真正问什么？你先圈出的两个已知条件是什么？',
    equation_setup: '未知数先设什么？哪两边应该相等？',
    reading_question: '这题问细节、原因还是主旨？原文哪一句能当证据？',
    english_sentence: '主语和谓语分别是什么？有没有时间词提示时态？',
    physics_diagram: '研究对象是谁？你先在图上标哪一个方向或状态？',
    chemistry_experiment: '反应前后分别有什么？看到的现象从哪里来？',
    biology_process: '这个结构对应什么功能？过程先后顺序是什么？',
    geography_map: '图上先看方向还是图例？这个区域的第一条原因链是什么？',
    writing_process: '这段先写哪一句开头？它围绕哪个要点？',
    unknown: '你准备先从哪里开始？只说第一步。'
  };
  return {
    title: '苏格拉底追问合约',
    whyThisQuestion: probe && probe.misconception
      ? probe.misconception
      : '先把卡点缩小到一个能执行的动作。',
    nextQuestion: nextQuestions[taskType] || nextQuestions.unknown,
    stopRule: normalized >= 5
      ? '孩子能说出同类小题的第一步就停止，不继续代算。'
      : '孩子能说出自己的第一步就停止，不继续讲完整答案。',
    evidenceToSave: probe && probe.evidenceNeeded ? probe.evidenceNeeded : 'student_states_next_small_step',
    outputArtifact: normalized >= 5 ? '生成一张迁移练习或回访卡' : '沉淀一条第一步证据',
    parentFollowUp: '家长只复述这一句追问，不补答案。',
    noFinalAnswer: true
  };
}

function buildSocraticFallbackPlan(taskType, item, probe, context = {}) {
  const normalized = normalizeLevel(item && item.level);
  const stuckCount = Number(context.stuckCount || 0);
  const answerBlocked = !!context.answerBlocked;
  const mode = answerBlocked
    ? 'answer_boundary'
    : stuckCount >= 3 || normalized >= 4
      ? 'low_threshold'
      : 'normal_probe';
  const baseQuestion = probe && probe.prompt ? probe.prompt : (TASK_TYPE_PROMPTS[taskType] || TASK_TYPE_PROMPTS.unknown);
  const firstMove = answerBlocked
    ? '先停住最终答案，只让孩子圈题目问什么。'
    : mode === 'low_threshold'
      ? '把问题降到二选一：A 找已知条件，B 看题目问什么。'
      : '只问一个第一步问题，不连续追问。';
  return {
    id: `socratic_fallback_${taskType || 'unknown'}_${mode}`,
    title: mode === 'answer_boundary' ? '答案捷径兜底' : mode === 'low_threshold' ? '沉默降级兜底' : '第一步兜底',
    mode,
    trigger: answerBlocked ? '孩子直接要答案或要求代写' : stuckCount >= 3 ? '孩子连续卡住或沉默' : '孩子还没说出可执行第一步',
    firstMove,
    microChoices: [
      { id: 'a', label: 'A', text: '先找题目给了什么' },
      { id: 'b', label: 'B', text: '先看题目问什么' }
    ],
    parentScript: answerBlocked
      ? '家长只说：我们不抄答案，你先说题目问什么。'
      : '家长只说：选 A 或 B 就行，不用完整做完。',
    blackboardMove: `小黑板只写第一笔：${baseQuestion}`,
    recoveryRoute: normalized >= 4 ? '/pages/arcade/arcade?from=socratic_fallback' : '/pages/tutor/tutor?from=socratic_fallback',
    evidenceRequired: [
      'fallback_trigger',
      'child_micro_choice',
      probe && probe.evidenceNeeded ? probe.evidenceNeeded : 'student_states_next_small_step'
    ],
    stopRule: '孩子选出 A/B 并说一句理由就停止，不继续讲完整答案。'
  };
}

function buildVisualSocraticRecoveryProtocol(taskType, item, probe, fallbackPlan = {}, context = {}) {
  const normalized = normalizeLevel(item && item.level);
  const answerBlocked = fallbackPlan.mode === 'answer_boundary' || !!context.answerBlocked;
  const weakAxis = probe && probe.axis ? probe.axis : 'first_step';
  const taskPrompt = probe && probe.prompt ? probe.prompt : (TASK_TYPE_PROMPTS[taskType] || TASK_TYPE_PROMPTS.unknown);
  const recoveryMode = answerBlocked
    ? 'answer_boundary_board'
    : normalized >= 4
      ? 'low_threshold_board'
      : 'first_step_board';
  return {
    id: `visual_socratic_recovery_${taskType || 'unknown'}_${recoveryMode}`,
    title: '\u89c6\u89c9\u5c0f\u9ed1\u677f\u5931\u8d25\u515c\u5e95',
    recoveryMode,
    weakAxis,
    boardLayers: [
      { id: 'locate', label: '\u5b9a\u4f4d', move: `\u53ea\u6807\u51fa\u300c${weakAxis}\u300d\u5bf9\u5e94\u7684\u9898\u76ee\u4f4d\u7f6e\u3002` },
      { id: 'first_stroke', label: '\u7b2c\u4e00\u7b14', move: `\u5c0f\u9ed1\u677f\u53ea\u5199\u4e00\u53e5\uff1a${taskPrompt}` },
      { id: 'student_return', label: '\u5b69\u5b50\u8bf4\u56de\u6765', move: '\u8ba9\u5b69\u5b50\u7528\u81ea\u5df1\u7684\u8bdd\u8bf4\u51fa\u4e0b\u4e00\u4e2a\u5c0f\u52a8\u4f5c\u3002' }
    ],
    failureBranches: [
      { id: 'silent', trigger: '\u6c89\u9ed8\u6216\u8bf4\u4e0d\u4f1a', move: '\u964d\u5230 A/B \u5fae\u9009\u62e9\uff0c\u4e0d\u8ffd\u95ee\u539f\u56e0\u3002', route: '/pages/tutor/tutor?from=visual_recovery' },
      { id: 'asks_answer', trigger: '\u76f4\u63a5\u8981\u7b54\u6848', move: '\u62e6\u4f4f\u5b8c\u6574\u7b54\u6848\uff0c\u53ea\u56de\u5230\u9898\u76ee\u95ee\u4ec0\u4e48\u3002', route: '/pages/tutor/tutor?from=answer_boundary' },
      { id: 'same_miss', trigger: '\u540c\u4e00\u9519\u56e0\u8fde\u7eed\u5361\u4f4f', move: '\u505c\u6b62\u52a0\u9898\uff0c\u8f6c\u9519\u56e0\u5361\u548c\u9694\u5929\u56de\u8bbf\u3002', route: '/pages/review/review?from=visual_recovery' }
    ],
    microChoiceScript: fallbackPlan.microChoices || [
      { id: 'a', label: 'A', text: '\u5148\u627e\u9898\u76ee\u7ed9\u4e86\u4ec0\u4e48' },
      { id: 'b', label: 'B', text: '\u5148\u770b\u9898\u76ee\u95ee\u4ec0\u4e48' }
    ],
    parentHandoff: {
      line: '\u5bb6\u957f\u53ea\u590d\u8ff0\u5c0f\u9ed1\u677f\u7b2c\u4e00\u53e5\uff0c\u4e0d\u8865\u5b8c\u6574\u89e3\u6cd5\u3002',
      check: '\u5b69\u5b50\u80fd\u5426\u81ea\u5df1\u8bf4\u51fa\u4e0b\u4e00\u4e2a\u5c0f\u52a8\u4f5c\uff1f',
      shareBoundary: '\u5206\u4eab\u53ea\u5e26\u5361\u70b9\u548c\u7b2c\u4e00\u6b65\uff0c\u4e0d\u5e26\u539f\u9898\u7167\u7247\u3001\u5b8c\u6574\u5bf9\u8bdd\u6216\u5206\u6570\u3002'
    },
    exitCriteria: [
      '\u5b69\u5b50\u9009\u51fa A/B \u5e76\u8bf4\u4e00\u53e5\u7406\u7531\u5c31\u505c\u3002',
      '\u8fde\u7eed 2 \u6b21\u80fd\u8bf4\u51fa\u7b2c\u4e00\u6b65\uff0c\u624d\u8fdb\u53d8\u5f0f\u7ec3\u4e60\u3002',
      '\u8fde\u7eed 2 \u6b21\u8bf4\u4e0d\u51fa\uff0c\u8f6c\u590d\u4e60\u5361\u548c\u5bb6\u957f\u4e00\u53e5\u8bdd\u590d\u76d8\u3002'
    ],
    evidenceRequired: ['visual_board_layer', 'child_micro_choice', 'parent_handoff_line', 'no_full_answer_boundary', 'next_day_revisit']
  };
}

function buildFallbackRecoveryBridge(taskType, item, probe, fallbackPlan = {}, visualRecovery = {}, context = {}) {
  const boardLayers = Array.isArray(visualRecovery.boardLayers) ? visualRecovery.boardLayers : [];
  const failureBranches = Array.isArray(visualRecovery.failureBranches) ? visualRecovery.failureBranches : [];
  const exitCriteria = Array.isArray(visualRecovery.exitCriteria) ? visualRecovery.exitCriteria : [];
  const microChoices = Array.isArray(fallbackPlan.microChoices) ? fallbackPlan.microChoices : [];
  const mode = visualRecovery.recoveryMode || fallbackPlan.mode || 'first_step_board';
  const trigger = fallbackPlan.trigger || (context.answerBlocked ? '孩子直接要答案' : '孩子卡住或沉默');
  const activeBoard = boardLayers[0] || { label: '定位', move: '只定位题目问什么。' };
  return {
    id: `fallback_recovery_bridge_${taskType || 'unknown'}_${mode}`,
    title: '失败兜底流转桥',
    mode,
    trigger,
    taskType: taskType || 'unknown',
    nextSmallAction: fallbackPlan.firstMove || activeBoard.move,
    blackboardLine: fallbackPlan.blackboardMove || activeBoard.move,
    microChoiceLine: microChoices.length
      ? microChoices.map((choice) => `${choice.label}:${choice.text}`).join(' / ')
      : 'A:先找已知条件 / B:先看题目问什么',
    boardLayerCount: boardLayers.length,
    failureBranchCount: failureBranches.length,
    exitCriteriaCount: exitCriteria.length,
    recoverySequence: [
      { id: 'stop_answer', label: '先停答案', action: '拦住完整答案或代写请求，只保留第一步。' },
      { id: 'draw_first', label: '画第一笔', action: fallbackPlan.blackboardMove || activeBoard.move },
      { id: 'micro_choice', label: '降到二选一', action: microChoices.length ? microChoices[0].text : '先选 A 或 B。' },
      { id: 'handoff', label: '交给回访', action: '仍卡住就转复习卡和明天回访，不继续加题。' }
    ],
    parentDecisionLine: visualRecovery.parentHandoff && visualRecovery.parentHandoff.line
      ? visualRecovery.parentHandoff.line
      : '家长只复述第一步问题，不补完整答案。',
    reportLine: `本轮兜底从 ${mode} 进入，已有 ${boardLayers.length} 层小黑板、${failureBranches.length} 个失败分支和 ${exitCriteria.length} 条退出条件。`,
    shareBoundary: visualRecovery.parentHandoff && visualRecovery.parentHandoff.shareBoundary
      ? visualRecovery.parentHandoff.shareBoundary
      : '分享只带卡点和第一步，不带原题照片、完整对话或分数。',
    evidenceRequired: ['fallback_trigger', 'visual_board_layer', 'child_micro_choice', 'no_full_answer_boundary', 'parent_handoff_line', 'exit_criteria']
  };
}

function stepIntro(item) {
  const level = normalizeLevel(item && item.level);
  const title = item && item.title ? item.title : '看清第一步';
  return `第 ${level} 步：${title}`;
}

function withStepIntro(item, reply) {
  const intro = stepIntro(item);
  const text = String(reply || '').trim();
  return text.indexOf(intro) === 0 ? text : `${intro}。${text}`;
}

function classifyHintLevel(text, messages = [], currentHintLevel = 1) {
  if (isAnswerRequest(text)) return 1;
  const stuckCount = countRecentStuck(messages, text);
  if (stuckCount >= 3) return 4;
  if (/不会下一步|不知道下一步|不会列式|条件不会用|不知道怎么写/.test(String(text || ''))) {
    return Math.max(2, normalizeLevel(currentHintLevel));
  }
  if (isStuckText(text)) return Math.max(2, normalizeLevel(currentHintLevel));
  if (/举一反三|同类|变式|复习卡|总结方法/.test(String(text || ''))) return 5;
  return normalizeLevel(currentHintLevel);
}

function buildTutorReply(text, options = {}) {
  const messages = options.messages || [];
  const currentHintLevel = options.currentHintLevel || 1;
  const selected = options.selected || {};
  const taskType = detectTaskType(text, selected);
  const target = selected && selected.text ? `「${selected.text}」` : '这道题';
  const taskPrompt = TASK_TYPE_PROMPTS[taskType] || TASK_TYPE_PROMPTS.unknown;

  if (isAnswerRequest(text)) {
    const item = ladderItem(1);
    const probe = diagnosticProbe(taskType, item.level);
    const questionTypePath = buildQuestionTypeSocraticPath(taskType, item, probe);
    const socraticQualityEvaluationSuite = buildSocraticQualityEvaluationSuite(taskType);
    const socraticContract = buildSocraticContract(taskType, item, probe);
    const socraticFallbackPlan = buildSocraticFallbackPlan(taskType, item, probe, { answerBlocked: true });
    const visualSocraticRecovery = buildVisualSocraticRecoveryProtocol(taskType, item, probe, socraticFallbackPlan, { answerBlocked: true });
    const fallbackRecoveryBridge = buildFallbackRecoveryBridge(taskType, item, probe, socraticFallbackPlan, visualSocraticRecovery, { answerBlocked: true });
    return {
      reply: withStepIntro(item, '我不能直接替你写答案，但可以陪你先找第一步。先说题目问什么，或者圈出一个已知条件。'),
      hint_level: 1,
      hint_label: item.label,
      coach_step: item.step,
      coach_step_label: stepIntro(item),
      diagnostic_probe: probe,
      question_type_socratic_path: questionTypePath,
      socratic_quality_evaluation_suite: socraticQualityEvaluationSuite,
      socratic_contract: socraticContract,
      socratic_fallback_plan: socraticFallbackPlan,
      visual_socratic_recovery: visualSocraticRecovery,
      fallback_recovery_bridge: fallbackRecoveryBridge,
      allowed_moves: probe.allowedMoves,
      transfer_prompt: probe.transferPrompt,
      next_action: '先说题目问什么，或者圈出一个已知条件。',
      task_type: taskType,
      first_prompt: taskPrompt,
      mastery_signal: {
        status: 'blocked_answer_request',
        confidence: 0.9,
        evidence_needed: '学生需要先给出自己的第一步。'
      },
      homework_boundary: true
    };
  }

  const level = classifyHintLevel(text, messages, currentHintLevel);
  const item = ladderItem(level);
  const probe = diagnosticProbe(taskType, item.level);
  const questionTypePath = buildQuestionTypeSocraticPath(taskType, item, probe);
  const socraticQualityEvaluationSuite = buildSocraticQualityEvaluationSuite(taskType);
  const socraticContract = buildSocraticContract(taskType, item, probe);
  const stuckCount = countRecentStuck(messages, text);
  const socraticFallbackPlan = buildSocraticFallbackPlan(taskType, item, probe, { stuckCount });
  const visualSocraticRecovery = buildVisualSocraticRecoveryProtocol(taskType, item, probe, socraticFallbackPlan, { stuckCount });
  const fallbackRecoveryBridge = buildFallbackRecoveryBridge(taskType, item, probe, socraticFallbackPlan, visualSocraticRecovery, { stuckCount });
  const reply = stuckCount >= 3
    ? `我们把门槛再降一点。先看${target}：下面两个选项选一个就行，A 先找已知条件，B 先看题目问什么。选完我给一个相似例子。`
    : item.reply;

  return {
    reply: withStepIntro(item, reply),
    hint_level: item.level,
    hint_label: item.label,
    coach_step: item.step,
    coach_step_label: stepIntro(item),
    diagnostic_probe: probe,
    question_type_socratic_path: questionTypePath,
    socratic_quality_evaluation_suite: socraticQualityEvaluationSuite,
    socratic_contract: socraticContract,
    socratic_fallback_plan: socraticFallbackPlan,
    visual_socratic_recovery: visualSocraticRecovery,
    fallback_recovery_bridge: fallbackRecoveryBridge,
    allowed_moves: probe.allowedMoves,
    transfer_prompt: probe.transferPrompt,
    next_action: item.level >= 5 ? '把方法做成复习卡或生成一道小变式。' : '先回一句你的第一步。',
    task_type: taskType,
    first_prompt: taskPrompt,
    mastery_signal: {
      status: item.level >= 5 ? 'method_summary_ready' : 'needs_student_step',
      confidence: item.level >= 4 ? 0.78 : 0.68,
      evidence_needed: item.level >= 4 ? '学生需要在相似例子后说回原题第一步。' : '学生需要先说出自己的第一步。'
    }
  };
}

function simulateThreeRoundSocratic(inputs = [], options = {}) {
  const turns = Array.isArray(inputs) ? inputs.slice(0, 3) : [];
  let currentHintLevel = options.currentHintLevel || 1;
  const messages = [];
  return turns.map((input, index) => {
    const result = buildTutorReply(input, {
      selected: options.selected || {},
      messages,
      currentHintLevel
    });
    currentHintLevel = result.hint_level || currentHintLevel;
    messages.push({ role: 'user', text: input });
    messages.push({ role: 'assistant', text: result.reply });
    return Object.assign({
      round: index + 1,
      asksForStudentStep: /绗竴姝|棰樼洰|鏉′欢|鍏堣|鍏堟壘|先|第一步|条件|题目/.test(String(result.reply || '')),
      directAnswerBlocked: result.mastery_signal && result.mastery_signal.status === 'blocked_answer_request',
      noFinalAnswer: !/鏈€缁堢瓟妗堟槸|答案是|结果是|final answer is|=\\s*\\d+\\s*$/.test(String(result.reply || ''))
    }, result);
  });
}

module.exports = {
  HINT_LADDER,
  isAnswerRequest,
  isStuckText,
  countRecentStuck,
  classifyHintLevel,
  stepIntro,
  diagnosticProbe,
  buildSocraticContract,
  buildSocraticFallbackPlan,
  buildVisualSocraticRecoveryProtocol,
  buildFallbackRecoveryBridge,
  buildQuestionTypeSocraticPath,
  buildQuestionTypeCoverageAtlas,
  buildSocraticQualityEvaluationSuite,
  MISCONCEPTION_MAP,
  detectTaskType,
  buildTutorReply,
  simulateThreeRoundSocratic
};
