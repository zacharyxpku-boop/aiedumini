const ANSWER_REQUEST_RE = /直接告诉我答案|求答案|不想写过程|不用讲第一步|直接给最终数字|最终数字|最终答案|马上填空|拍照出答案|直接给结果|告诉我答案|给答案|答案是什么|直接说结果|帮我写答案|直接帮孩子写|帮孩子写.*字|成文|代写|替他.*写|直接替|完整解题板书|完整动态板书|完整错题答案|从第一步到最后答案|照着写|完整板书.*结论|最后结论|直接给拍题|假装已经识别|已经看过孩子的照片|带孩子分数|排名.*转发|tell me the answer/i;
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
  { id: 'chemistry_experiment', patterns: /化学|反应|方程式|溶液|气体|沉淀|颜色|酸碱|守恒|配平/i },
  { id: 'physics_diagram', patterns: /物理|受力|电路|光路|运动|速度|压强|浮力|透镜|密度|路程-时间/i },
  { id: 'geography_map', patterns: /地理|地图|经纬|经线|纬线|气候|季风|河流|等高线|比例尺|公转|自转|昼夜|地形|图例/i },
  { id: 'biology_process', patterns: /生物|细胞|植物|人体|遗传|生态|光合|对照组|显微镜|血液循环/i },
  { id: 'reading_question', patterns: /阅读|上下文|语境|主旨|细节|原因|段意|中心句|概括|反问句|陈述句|文言文|文言词语|文言实词|句子改写|心情变化|论点|论据|议论文/i },
  { id: 'english_sentence', patterns: /英语|单词|语法|句型|主语|谓语|时态|词性|比较级|被动语态|than|be done/i },
  { id: 'equation_setup', patterns: /方程|不等式|等量关系|设x|未知数|列方程|解方程/i },
  { id: 'math_word_problem', patterns: /应用题|题目问什么|数量关系|单位1|已知条件|列式|行程|工程|分数应用题|百分数|折|比例|面积|几何|邻补角|对顶角|函数|图像|增减性|平均每小时/i },
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
  if (/数学统计图|平均每天|平均数|概率题|摸到红球|有利结果|总结果/.test(source)) {
    return 'math_word_problem';
  }
  if (/古诗理解|诗句|明月|故乡|意象|表达的情感/.test(source)) {
    return 'reading_question';
  }
  if (/英语.*完形|完形.*英语/i.test(source)) {
    return /不看上下文/.test(source) ? 'english_sentence' : 'reading_question';
  }
  if (/地理|地图|经纬|经线|纬线|气候|季风|河流|等高线|比例尺|公转|自转|昼夜|地形|图例/i.test(source)) {
    return 'geography_map';
  }
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

function inferHomeworkPressureSignal(text = '', taskType = 'unknown') {
  const source = String(text || '');
  const scorePattern = (pattern) => {
    const rawParts = String(pattern && pattern.source ? pattern.source : '')
      .split('|')
      .map((part) => part.replace(/[()\\^$.*+?[\]{}]/g, '').trim())
      .filter((part) => part.length >= 2);
    const hitCount = rawParts.filter((part) => source.includes(part)).length;
    return hitCount * 10 + rawParts.join('').length / 1000;
  };
  const pickBestCase = (items, expectedTaskType) => items
    .map((item, index) => {
      const bestPatternScore = Math.max(...item.patterns.map(scorePattern));
      const matched = item.patterns.some((pattern) => pattern.test(source));
      const taskScore = item.taskType === expectedTaskType ? 100 : 0;
      return { item, index, matched, score: taskScore + bestPatternScore };
    })
    .filter((entry) => entry.matched)
    .sort((a, b) => b.score - a.score || b.index - a.index)[0];
  const cases = [
    {
      id: 'average_chart_total_parts',
      taskType: 'math_word_problem',
      patterns: [/条形图给出 4 天阅读页数|平均每天读多少页|最高的一天|总量除以天数/],
      firstStep: '先把 4 天页数合成总量，再判断平均数要用总量除以天数。',
      wrongCause: '把最高值当平均值，没有先合计总量和份数。',
      boardMove: '小黑板只写“总页数 / 4 天 = 平均每天”。',
      parentCheck: '先问：平均数看最高的一天，还是看总量分成几份？',
      reviewMove: '换成 5 次跳绳成绩，仍先求总量和份数。'
    },
    {
      id: 'probability_favorable_total',
      taskType: 'math_word_problem',
      patterns: [/红球、白球、蓝球|摸到红球|颜色种类|每种球的数量|有利结果/],
      firstStep: '先数红球个数和球的总个数，再写可能性对应的比。',
      wrongCause: '只看颜色种类，没有把有利结果和总结果分开。',
      boardMove: '小黑板只画“红球个数 / 总球数”两个格子。',
      parentCheck: '先问：有利结果有几个？所有可能结果一共有几个？',
      reviewMove: '换成转盘颜色，仍先数目标区域和全部区域。'
    },
    {
      id: 'poem_image_emotion',
      taskType: 'reading_question',
      patterns: [/明月、故乡|表达的情感|字面意思|意象|思乡/],
      firstStep: '先圈出明月、故乡这两个意象，再判断它们常指向思乡情感。',
      wrongCause: '只逐字翻译，没有把意象和情感联系起来。',
      boardMove: '小黑板只写“意象 -> 常见情感 -> 诗句证据”。',
      parentCheck: '先问：诗里哪个物象最能提示情感？',
      reviewMove: '换成柳、送别诗句，仍先圈意象再说情感。'
    },
    {
      id: 'expository_order_paragraphs',
      taskType: 'reading_question',
      patterns: [/说明文阅读|桥的结构|说明顺序|段落之间|先后关系/],
      firstStep: '先看每段介绍对象从整体到局部，还是从原因到结果。',
      wrongCause: '只抓一个细节，没有看段落推进顺序。',
      boardMove: '小黑板只画“第1段 -> 第2段 -> 第3段”的说明对象变化。',
      parentCheck: '先问：每段说的对象是在变大、变小，还是按时间推进？',
      reviewMove: '换成介绍植物生长的说明文，仍先看段落顺序。'
    },
    {
      id: 'passive_classroom_be_done',
      taskType: 'english_sentence',
      patterns: [/The classroom is cleaned|cleaned|前面要有 is|classroom|be done/],
      firstStep: '先判断主语 classroom 是动作承受者，再看 be done 结构。',
      wrongCause: '只记过去分词，没有检查被动语态需要 be 动词。',
      boardMove: '小黑板只写“承受者 + be + done”。',
      parentCheck: '先问：教室是自己打扫，还是被打扫？be 动词在哪里？',
      reviewMove: '换成 The window is broken，仍先判断承受者和 be done。'
    },
    {
      id: 'english_inference_behavior_emotion',
      taskType: 'reading_question',
      patterns: [/没有直接写人物生气|关上门不说话|找不到原句|行为证据|推情绪/],
      firstStep: '先找行为证据，再判断这些行为暗示的情绪。',
      wrongCause: '把推断题当成原文原句题，没有用行为证据推情绪。',
      boardMove: '小黑板只写“行为证据 -> 可能情绪”。',
      parentCheck: '先问：哪一个动作能支持你的推断？',
      reviewMove: '换成角色低头沉默，仍先找行为证据再推情绪。'
    },
    {
      id: 'pressure_book_area',
      taskType: 'physics_diagram',
      patterns: [/平放和竖放|压强变化|重量一样|受力面积/],
      firstStep: '先判断压力不变，再比较受力面积变大还是变小。',
      wrongCause: '只看压力大小，忽略受力面积对压强的影响。',
      boardMove: '小黑板只画“压力相同 / 接触面积不同”。',
      parentCheck: '先问：压力有没有变？接触面积变大还是变小？',
      reviewMove: '换成砖块不同放法，仍先比较压力和面积。'
    },
    {
      id: 'circuit_fault_meter_segment',
      taskType: 'physics_diagram',
      patterns: [/电路故障|灯泡不亮|电压表有示数|接在哪一段|电表位置/],
      firstStep: '先看电压表测的是哪一段电路，再判断这一段是否断路。',
      wrongCause: '直接猜元件损坏，没有先把电表位置和故障段对应起来。',
      boardMove: '小黑板只圈电压表两端连接的那一段。',
      parentCheck: '先问：电压表跨在哪两个点之间？这一段可能通还是断？',
      reviewMove: '换成电流表示数为零，仍先定位电表所在路径。'
    },
    {
      id: 'solubility_curve_temperature_point',
      taskType: 'chemistry_experiment',
      patterns: [/溶解度曲线|温度升高|温度点|物质曲线|曲线高低/],
      firstStep: '先在横轴找到温度，再对到对应物质的溶解度曲线。',
      wrongCause: '只看曲线整体高低，没有先定位温度和物质。',
      boardMove: '小黑板只画“温度点 -> 曲线 -> 纵轴溶解度”。',
      parentCheck: '先问：你先定位的是哪个温度、哪条物质曲线？',
      reviewMove: '换成降温析晶题，仍先定位温度点和曲线。'
    },
    {
      id: 'ion_identification_reagent_evidence',
      taskType: 'chemistry_experiment',
      patterns: [/硝酸银|白色沉淀|氯离子|离子检验|证据链/],
      firstStep: '先把试剂、现象和对应离子连成一条证据链。',
      wrongCause: '只背现象，没有把沉淀和被检验离子对应。',
      boardMove: '小黑板只画“试剂 -> 白色沉淀 -> 氯离子可能”。',
      parentCheck: '先问：这个白色沉淀是哪种试剂帮你证明的？',
      reviewMove: '换成硫酸根检验，仍先连试剂、现象和离子。'
    },
    {
      id: 'respiration_night_vs_photosynthesis',
      taskType: 'biology_process',
      patterns: [/夜间为什么也消耗氧气|呼吸作用和光合作用|夜间没有光合作用|一直进行/],
      firstStep: '先判断夜间没有光合作用，但呼吸作用一直进行。',
      wrongCause: '把光合作用和呼吸作用的条件、产物混淆。',
      boardMove: '小黑板只写“夜间无光合作用 / 呼吸作用仍进行”。',
      parentCheck: '先问：这个过程需要光吗？夜间还会不会呼吸？',
      reviewMove: '换成动物细胞，仍先判断是否进行呼吸作用。'
    },
    {
      id: 'blood_route_body_cycle',
      taskType: 'biology_process',
      patterns: [/体循环路径|左心室|右心房|肺循环路线|起点/],
      firstStep: '先判断体循环从左心室出发，最后回到右心房。',
      wrongCause: '把肺循环和体循环的起点终点混淆。',
      boardMove: '小黑板只画“左心室 -> 全身 -> 右心房”。',
      parentCheck: '先问：这题问体循环还是肺循环？起点是哪一个心腔？',
      reviewMove: '换成肺循环，仍先说起点和终点。'
    },
    {
      id: 'lat_lon_hemisphere_exact',
      taskType: 'geography_map',
      patterns: [/经纬网题|经纬度|哪个半球|经度和纬度作用|南北半球/],
      firstStep: '先分清纬度判断南北半球，经度判断东西半球。',
      wrongCause: '把经线纬线的作用混在一起。',
      boardMove: '小黑板只写“纬度看南北，经度看东西”。',
      parentCheck: '先问：南北半球先看经度还是纬度？东西半球呢？',
      reviewMove: '换一个经纬度点，仍先分南北再分东西。'
    },
    {
      id: 'monsoon_water_vapor_exact',
      taskType: 'geography_map',
      patterns: [/夏季风从海洋吹向陆地|为什么带来降水|只背风向|水汽来源/],
      firstStep: '先判断夏季风从海洋来，带来水汽。',
      wrongCause: '只背风向，没有连接水汽来源和降水。',
      boardMove: '小黑板只画“海洋 -> 陆地 -> 水汽 -> 降水”。',
      parentCheck: '先问：这股风从哪里来？有没有带来水汽？',
      reviewMove: '换成冬季风，仍先判断来自海洋还是陆地。'
    },
    {
      id: 'percent_consecutive_base_shift',
      taskType: 'math_word_problem',
      patterns: [/先降价 20%|再降 10%|降价 30%|第二次降价|基准/],
      firstStep: '先判断第二次降价的基准已经变成第一次降价后的价格。',
      wrongCause: '把两个百分数当作同一个单位量上的变化，忽略了第二次的基准变化。',
      boardMove: '小黑板只画“原价 -> 80% -> 再取 90%”，不直接算最终价格。',
      parentCheck: '先问：第二个 10% 是原价的 10%，还是降价后价格的 10%？',
      reviewMove: '换成先涨 20% 再降 20%，仍先判断每一步的基准。'
    },
    {
      id: 'proportional_graph_origin_rate',
      taskType: 'math_word_problem',
      patterns: [/购买本数和总价|过原点直线|正比例|一个点|比值/],
      firstStep: '先看总价与本数的比值是否稳定，再看图像是否过原点。',
      wrongCause: '只代入一个点就下结论，没有检查比值恒定和过原点两个条件。',
      boardMove: '小黑板只写“比值稳定 / 过原点”两个检查格。',
      parentCheck: '先问：每增加 1 本，价格是不是固定增加同样的钱？',
      reviewMove: '换成出租车起步价图像，先判断是否过原点。'
    },
    {
      id: 'function_slope_growth_rate',
      taskType: 'math_word_problem',
      patterns: [/两条直线都上升|最后更高|增长快慢|斜率|单位变化量/],
      firstStep: '先比较斜率，也就是横向增加同样长度时纵向增加多少。',
      wrongCause: '把终点高低当作增长速度，没有看单位变化量。',
      boardMove: '小黑板只画两个小三角形，标出“横向一样，纵向谁更大”。',
      parentCheck: '先问：如果 x 都增加 1，哪个 y 增加得更多？',
      reviewMove: '换成路程时间图像，仍先看单位时间增加量。'
    },
    {
      id: 'buoyancy_density_displaced_volume',
      taskType: 'physics_diagram',
      patterns: [/水和盐水|浮力变化|液体密度|排开液体体积|物体大小/],
      firstStep: '先圈液体密度和排开液体体积这两个量。',
      wrongCause: '只看物体本身，忽略浮力和液体密度、排开体积有关。',
      boardMove: '小黑板只画“液体密度 × 排开体积”两个格子。',
      parentCheck: '先问：这次变化的是液体，还是物体体积？',
      reviewMove: '换成同一液体里排开体积不同，仍先圈两个决定量。'
    },
    {
      id: 'series_circuit_path_first',
      taskType: 'physics_diagram',
      patterns: [/串联电路|灯泡变暗|电流变小|连接方式|电流路径/],
      firstStep: '先判断电路是串联还是并联，再看电流路径是否只有一条。',
      wrongCause: '没有先识别电路结构，直接根据亮暗猜结论。',
      boardMove: '小黑板只用一条线标出电流路径，不写最终判断。',
      parentCheck: '先问：电流有没有分叉？如果没有分叉，它是什么连接？',
      reviewMove: '换成并联支路断开，仍先判断有没有分叉。'
    },
    {
      id: 'sealed_mass_conservation',
      taskType: 'chemistry_experiment',
      patterns: [/密闭容器|反应前后总质量不变|气体产生|质量凭空增加|密闭体系/],
      firstStep: '先判断反应是否在密闭体系中，再看反应前后总质量。',
      wrongCause: '把可见气体现象当作质量增加，忽略密闭体系质量守恒。',
      boardMove: '小黑板只画“反应前总质量 = 反应后总质量”。',
      parentCheck: '先问：这个反应有没有物质跑出容器？',
      reviewMove: '换成敞口容器，仍先判断有没有气体逸出。'
    },
    {
      id: 'ph_curve_start_direction',
      taskType: 'chemistry_experiment',
      patterns: [/pH 曲线|逐渐升高|起点|变化方向|小于 7/],
      firstStep: '先看图像起点 pH 小于 7，说明一开始是酸性。',
      wrongCause: '只背中和反应，没有用图像起点和变化方向判断过程。',
      boardMove: '小黑板只标“起点 <7 / 逐渐升高 / 经过 7”。',
      parentCheck: '先问：曲线一开始在 7 的上面还是下面？',
      reviewMove: '换成向碱中加酸，仍先看起点和变化方向。'
    },
    {
      id: 'english_cloze_semantic_context',
      taskType: 'english_sentence',
      patterns: [/完形填空|天气很冷|穿上外套|空格所在句|上下文/],
      firstStep: '先读空格前后两句，找冷、外套这类语义线索。',
      wrongCause: '只看单句语法，没有用上下文证据判断词义。',
      boardMove: '小黑板只写“前句线索 -> 空格 -> 后句验证”。',
      parentCheck: '先问：这个选项能不能被前后两句同时支持？',
      reviewMove: '换成表示转折的 but 句子，仍先看前后逻辑。'
    },
    {
      id: 'english_than_signal_not_translation',
      taskType: 'english_sentence',
      patterns: [/比较级题|than|原级形容词|比较信号|中文意思/],
      firstStep: '先圈 than，再判断形容词要用比较级。',
      wrongCause: '没有先找比较信号，凭中文意思填原级。',
      boardMove: '小黑板只写“than -> 比较级”。',
      parentCheck: '先问：句子里有没有表示比较的词？',
      reviewMove: '换成 as...as，先判断这次是不是比较级。'
    },
    {
      id: 'food_chain_energy_direction',
      taskType: 'biology_process',
      patterns: [/草、兔、狐、鹰|食物链|谁吃谁|箭头方向|能量流动/],
      firstStep: '先判断箭头表示能量流动方向，从被吃者指向捕食者。',
      wrongCause: '把箭头当成捕食动作方向，没理解能量流动。',
      boardMove: '小黑板只画“草 -> 兔 -> 狐 -> 鹰”的能量箭头。',
      parentCheck: '先问：箭头表示谁把能量传给谁？',
      reviewMove: '换成水草、小鱼、大鱼，仍先判断能量从谁开始。'
    },
    {
      id: 'genetics_dominant_recessive_grid',
      taskType: 'biology_process',
      patterns: [/父母性状不同|子代可能表现|表面性状|显性|隐性/],
      firstStep: '先标出显性性状和隐性性状，再看亲代基因组合。',
      wrongCause: '只看表面性状，没有建立显隐性和基因组合关系。',
      boardMove: '小黑板只写“显性 / 隐性 / 亲代组合”三格。',
      parentCheck: '先问：哪个性状是显性？父母可能各带什么基因？',
      reviewMove: '换成另一对性状，仍先标显性和隐性。'
    },
    {
      id: 'contour_elevation_density',
      taskType: 'geography_map',
      patterns: [/等高线密集处|坡度|河流流向|上下位置|海拔数字/],
      firstStep: '先读等高线数值，再判断高处到低处和密集程度。',
      wrongCause: '按图面上下判断方向，没有看海拔和等高线疏密。',
      boardMove: '小黑板只标“高 -> 低”和“密集 -> 坡陡”。',
      parentCheck: '先问：哪边海拔更高？等高线哪里更密？',
      reviewMove: '换成山谷山脊判断，仍先读海拔数字。'
    },
    {
      id: 'climate_chart_heat_rain_same_period',
      taskType: 'geography_map',
      patterns: [/全年气温曲线|降水柱状图|最高温|雨热同期|峰值月份/],
      firstStep: '先同时看最高温月份和降水最多月份是否接近。',
      wrongCause: '只看气温，不把降水和气温放在同一时间轴比较。',
      boardMove: '小黑板只画“气温高峰 / 降水高峰 / 是否同月附近”。',
      parentCheck: '先问：最热的时候是不是也最湿？',
      reviewMove: '换成另一张气候图，仍先找两个峰值月份。'
    },
    {
      id: 'classical_word_context_verify',
      taskType: 'reading_question',
      patterns: [/文言词语|“走”表示跑|现代汉语|走路|文言语境/],
      firstStep: '先把词放回句子，看人物动作和上下文是否支持现代意思。',
      wrongCause: '直接套现代词义，没有结合文言语境。',
      boardMove: '小黑板只写“原词 -> 句中动作 -> 语境验证”。',
      parentCheck: '先问：这个意思放回原句通不通？',
      reviewMove: '换成“汤”“亡”等词，仍先放回句子验证。'
    },
    {
      id: 'sentence_rewrite_keep_meaning',
      taskType: 'reading_question',
      patterns: [/句式转换|反问句改成陈述句|只删问号|否定词|真实意思/],
      firstStep: '先判断反问句表达的真实意思，再去掉反问语气。',
      wrongCause: '把句式转换当标点修改，没有保留原句意思。',
      boardMove: '小黑板只写“真实意思 -> 去反问词 -> 调标点”。',
      parentCheck: '先问：改完以后意思和原句一样吗？',
      reviewMove: '换成把双重否定句改成肯定句，仍先判断真实意思。'
    },
    {
      id: 'angle_relation_before_calculation',
      taskType: 'math_word_problem',
      patterns: [/几何角题|邻补角和对顶角|直接乱加减|对顶角相等|邻补角和为 180/],
      firstStep: '先标出对顶角相等、邻补角和为 180 度。',
      wrongCause: '没有先识别角之间的关系，直接拿数字试算。',
      boardMove: '小黑板只标“对顶相等 / 邻补 180”。',
      parentCheck: '先问：你要找的角和已知角是对顶关系还是邻补关系？',
      reviewMove: '换成平行线同位角，仍先识别角关系。'
    },
    {
      id: 'ratio_speed_each_hour',
      taskType: 'math_word_problem',
      patterns: [/平均每小时|3 小时|12 千米|总路程|总时间|每 1 小时/],
      firstStep: '先判断题目问每小时多少，再圈出总路程和总时间。',
      wrongCause: '没有先分清总量和每份量，直接拿数字相除。',
      boardMove: '小黑板只画“总路程 12 千米 -> 分成 3 小时”的线段。',
      parentCheck: '先问：这题问的是总共走多少，还是每 1 小时走多少？',
      reviewMove: '把 12 千米换成 15 千米，仍先说总量和份数。'
    },
    {
      id: 'geometry_adjacent_angle',
      taskType: 'math_word_problem',
      patterns: [/邻补角|对顶角|65 度|直线相交|共一条边/],
      firstStep: '先判断题目问邻补角，再标出和 65 度共一条边的角。',
      wrongCause: '把对顶角相等和邻补角互补混淆。',
      boardMove: '小黑板只画交叉线和 65 度，圈出相邻的那个角。',
      parentCheck: '先问：这个角是对面那个，还是挨着 65 度那个？',
      reviewMove: '把 65 度换成 110 度，仍先判断是对顶角还是邻补角。'
    },
    {
      id: 'function_graph_trend',
      taskType: 'math_word_problem',
      patterns: [/函数图像|一次函数|增减性|从左到右|趋势|代公式/],
      firstStep: '先看图像从左到右是上升还是下降。',
      wrongCause: '只想套公式，没有先读图像趋势。',
      boardMove: '小黑板只画坐标轴和一条从左到右的趋势箭头。',
      parentCheck: '先问：从左往右看，这条线是往上还是往下？',
      reviewMove: '换一条下降直线，仍先判断趋势再说增减性。'
    },
    {
      id: 'fraction_part_whole',
      taskType: 'math_word_problem',
      patterns: [/三分之|分之|剩.*页|全书|单位1|对应/],
      firstStep: '先判断题目问全书总页数，再圈出还剩 24 页对应的是全书的三分之一。',
      wrongCause: '把已知分率和剩余页数的对应关系混在一起。',
      boardMove: '小黑板只画一条整体线段，分成三份，只标剩下的一份是 24 页。',
      parentCheck: '先问：24 页对应的是哪一份，不需要直接算总页数。',
      reviewMove: '把剩余页数换成 18 页，仍然先说“哪一份对应几页”。'
    },
    {
      id: 'total_difference_equation',
      taskType: 'equation_setup',
      patterns: [/一共|总共|比.*多|比.*少|设x|未知数|方程/],
      firstStep: '先设乙有 x 本，再把甲写成 x+6。',
      wrongCause: '没有先设清未知数代表谁，直接心算结果。',
      boardMove: '小黑板只写“乙=x、甲=x+差量、总数=已知”。',
      parentCheck: '先问：你设的 x 代表谁？另一人的数量怎么表示？',
      reviewMove: '把 48 和 6 换成别的数，先保留同一个等量关系。'
    },
    {
      id: 'circuit_path',
      taskType: 'physics_diagram',
      patterns: [/电路|串联|并联|电流路径|灯泡|开关|分叉/],
      firstStep: '先从电源正极出发，沿电流路径画一圈。',
      wrongCause: '没有先追电流路径，只看元件位置猜连接方式。',
      boardMove: '小黑板只画电源和第一条电流路径箭头，不直接判定串并联。',
      parentCheck: '先问：电流有没有分叉？先用手指沿路径走一遍。',
      reviewMove: '换一个有分叉的图，仍先追电流路径。'
    },
    {
      id: 'buoyancy_direction',
      taskType: 'physics_diagram',
      patterns: [/浮力|水中|竖直向上|重力|下沉|托物体/],
      firstStep: '先标浮力方向竖直向上，再和重力方向区分。',
      wrongCause: '把浮力方向和重力方向混淆。',
      boardMove: '小黑板只画物体、向下重力箭头和向上浮力箭头。',
      parentCheck: '先问：浮力是水托物体，方向先往哪边？',
      reviewMove: '换成物体下沉情境，仍先标浮力方向。'
    },
    {
      id: 'force_friction_diagram',
      taskType: 'physics_diagram',
      patterns: [/受力|摩擦|水平|拉动|木块|研究对象/],
      firstStep: '先定研究对象是木块，再标重力、支持力、拉力和摩擦力方向。',
      wrongCause: '没有先确定研究对象和运动趋势。',
      boardMove: '小黑板只画木块方框和第一根水平拉力箭头，再让孩子补摩擦方向。',
      parentCheck: '先问：这题先研究谁？摩擦力总是阻碍什么？',
      reviewMove: '把拉力方向反过来，先判断摩擦方向会不会变。'
    },
    {
      id: 'convex_lens_ray',
      taskType: 'physics_diagram',
      patterns: [/凸透镜|焦距|光路|成像|主光轴|两倍焦距/],
      firstStep: '先标 F 和 2F，再画一条平行主光轴的光线。',
      wrongCause: '只背成像规律，没有把位置和光路连起来。',
      boardMove: '小黑板只画主光轴、焦点和第一条入射光线，不直接给像的结论。',
      parentCheck: '先问：你先标出 F 和 2F，再说物体在哪个区间。',
      reviewMove: '把物体移到一倍到两倍焦距之间，只重复标点和画第一条线。'
    },
    {
      id: 'mass_conservation',
      taskType: 'chemistry_experiment',
      patterns: [/质量守恒|反应前后质量|硫化亚铁|凭空增加|原子/],
      firstStep: '先判断化学反应遵守质量守恒。',
      wrongCause: '把生成新物质理解成凭空增加质量。',
      boardMove: '小黑板只画“反应前总质量 = 反应后总质量”的天平。',
      parentCheck: '先问：反应前后原子有没有凭空多出来或少掉？',
      reviewMove: '换成碳燃烧，仍先判断是否守恒。'
    },
    {
      id: 'equation_balance_atoms',
      taskType: 'chemistry_experiment',
      patterns: [/配平|氢气|氧气|生成水|H2O|原子个数/],
      firstStep: '先数反应前后氢原子和氧原子个数。',
      wrongCause: '只记生成物，没有检查左右原子个数守恒。',
      boardMove: '小黑板只画左右两栏，分别数 H 和 O 的个数。',
      parentCheck: '先问：左右两边 H 和 O 的个数分别是多少？',
      reviewMove: '换成镁燃烧，仍先数左右原子个数。'
    },
    {
      id: 'carbonate_gas_test',
      taskType: 'chemistry_experiment',
      patterns: [/盐酸|碳酸|气泡|二氧化碳|石灰水|检验/],
      firstStep: '先列反应前物质，再判断气泡可能对应二氧化碳。',
      wrongCause: '只记现象，没有把现象和物质变化对应。',
      boardMove: '小黑板只画“反应物 -> 气体 -> 检验现象”三格。',
      parentCheck: '先问：气泡说明产生了什么？你用什么现象证明它？',
      reviewMove: '换一种碳酸盐，仍先说气体和检验。'
    },
    {
      id: 'indicator_acid_base',
      taskType: 'chemistry_experiment',
      patterns: [/酚酞|变红|褪去|酸|碱|中和|溶液/],
      firstStep: '先判断酚酞变红说明溶液显碱性。',
      wrongCause: '把指示剂颜色当成要背的现象，没有连接酸碱性。',
      boardMove: '小黑板只画“碱性 -> 变红 -> 加酸 -> 褪色”的原因链。',
      parentCheck: '先问：颜色变化对应酸碱性变了，还是物质名字变了？',
      reviewMove: '换一种指示剂，仍先判断颜色对应酸性还是碱性。'
    },
    {
      id: 'pronoun_case_subject',
      taskType: 'english_sentence',
      patterns: [/we 和 us|代词|主格|宾格|Tom and I|作主语/],
      firstStep: '先判断代词在句子里作主语。',
      wrongCause: '没有先看代词成分，混淆主格和宾格。',
      boardMove: '小黑板只圈主语位置，写“主格”。',
      parentCheck: '先问：这个代词在动词前作主语，还是在动词后作宾语？',
      reviewMove: '换成 Mary and him，仍先判断代词位置。'
    },
    {
      id: 'subject_verb_real_subject',
      taskType: 'english_sentence',
      patterns: [/The number|students|真正主语|主谓一致|复数名词/],
      firstStep: '先找真正主语是 the number。',
      wrongCause: '被靠近动词的复数名词干扰，没有找真正主语。',
      boardMove: '小黑板只圈 The number，划掉干扰词 students。',
      parentCheck: '先问：动词跟谁一致，是 students 还是 the number？',
      reviewMove: '换成 A group of boys，仍先找真正主语。'
    },
    {
      id: 'english_past_tense_signal',
      taskType: 'english_sentence',
      patterns: [/yesterday|过去时|时态|go|动词|时间信号/i],
      firstStep: '先找时间信号 yesterday，再判断一般过去时。',
      wrongCause: '没有先看时间词，直接凭语感选动词形式。',
      boardMove: '小黑板只圈出 yesterday，只写“过去时”这个判断，不直接改完整句。',
      parentCheck: '先问：这句话的时间词是什么？它提示什么时态？',
      reviewMove: '把 yesterday 换成 every day，先判断时态会不会变。'
    },
    {
      id: 'reading_mood_change',
      taskType: 'reading_question',
      patterns: [/心情|变化|情节复述|人物心情|雨天帮助|故事/],
      firstStep: '先找表示心情的词，再按前后顺序排变化。',
      wrongCause: '把情节复述当成答案，没有抓住题目问心情变化。',
      boardMove: '小黑板只画“开始心情 -> 事件 -> 后来心情”三格。',
      parentCheck: '先问：题目问情节，还是问心情怎么变？',
      reviewMove: '换一篇短文，仍先圈心情词。'
    },
    {
      id: 'reading_reason_evidence',
      taskType: 'reading_question',
      patterns: [/阅读|原因|because|so|证据句|原文|短文/i],
      firstStep: '先判断题目问细节、原因还是变化，再回原文找证据句。',
      wrongCause: '离开原文凭感觉答，没有锚定证据句。',
      boardMove: '小黑板只画“题目类型 -> 回文定位 -> 证据句”。',
      parentCheck: '先问：你选项旁边能标出原文哪一句吗？',
      reviewMove: '换一篇更短的段落，仍然先找原因词。'
    },
    {
      id: 'food_chain_arrow',
      taskType: 'biology_process',
      patterns: [/食物链|草|兔|鹰|能量流动|箭头方向/],
      firstStep: '先从被吃的生物指向吃它的生物。',
      wrongCause: '把捕食关系和能量流动箭头方向混淆。',
      boardMove: '小黑板只画“草 -> 兔 -> 鹰”的一条箭头链。',
      parentCheck: '先问：箭头表示能量流向谁，不是表示谁去抓谁。',
      reviewMove: '换成草、昆虫、青蛙，仍先从生产者画起。'
    },
    {
      id: 'genetics_hidden_recessive',
      taskType: 'biology_process',
      patterns: [/隐性性状|表现型正常|隐性基因|杂合子|携带/],
      firstStep: '先判断父母可能是携带隐性基因的杂合子。',
      wrongCause: '把表现型正常误认为没有隐性基因。',
      boardMove: '小黑板只画父母各带一个显性和一个隐性的基因格子。',
      parentCheck: '先问：表现出来正常，是否一定没有隐性基因？',
      reviewMove: '换成另一种隐性性状，仍先判断是否可能携带。'
    },
    {
      id: 'photosynthesis_columns',
      taskType: 'biology_process',
      patterns: [/光合作用|叶绿体|二氧化碳|氧气|原料|产物/],
      firstStep: '先把条件、场所、原料、产物分成四栏。',
      wrongCause: '把过程口诀背散了，结构和功能没有连起来。',
      boardMove: '小黑板只画“光、叶绿体、二氧化碳和水 -> 有机物和氧气”的空格图。',
      parentCheck: '先问：这是条件、原料、场所还是产物？',
      reviewMove: '换成呼吸作用，仍先分四栏。'
    },
    {
      id: 'control_variable',
      taskType: 'biology_process',
      patterns: [/对照|变量|有光|无光|遮光|唯一不同|实验/],
      firstStep: '先说唯一不同的条件是光照。',
      wrongCause: '没有分清自变量、因变量和控制变量。',
      boardMove: '小黑板只画两列并标一个不同点。',
      parentCheck: '先问：两组除了光照，还有什么应该保持一样？',
      reviewMove: '把光照换成水分，仍先找唯一不同条件。'
    },
    {
      id: 'climate_graph_trend',
      taskType: 'geography_map',
      patterns: [/气候图|气温曲线|降水柱状图|全年趋势|季节分配|单月数据/],
      firstStep: '先看全年气温变化，再看降水季节分配。',
      wrongCause: '只看单月数据，没有读全年趋势。',
      boardMove: '小黑板只画“气温全年趋势”和“降水集中季节”两条提示。',
      parentCheck: '先问：你看的是全年趋势，还是只看了一个月？',
      reviewMove: '换一张气候图，仍先看全年再看季节。'
    },
    {
      id: 'contour_shape',
      taskType: 'geography_map',
      patterns: [/等高线|山脊|山谷|弯曲方向|海拔数值|往高处/],
      firstStep: '先看等高线弯曲方向，再判断山脊或山谷。',
      wrongCause: '只看海拔数值，没有看等高线形态。',
      boardMove: '小黑板只画一组弯曲等高线和水流/高低方向箭头。',
      parentCheck: '先问：等高线往高处凸还是往低处凸？',
      reviewMove: '换一张等高线图，仍先判断弯曲方向。'
    },
    {
      id: 'earth_rotation',
      taskType: 'geography_map',
      patterns: [/昼夜|自转|公转|太阳|地球|四季/],
      firstStep: '先判断昼夜更替对应地球自转，不是公转。',
      wrongCause: '把自转、公转对应的现象混淆。',
      boardMove: '小黑板只画地球、太阳和自转箭头，只标昼半球和夜半球。',
      parentCheck: '先问：一天内变化看自转，还是一年内变化？',
      reviewMove: '换成四季变化，先判断是否属于公转。'
    },
    {
      id: 'map_scale_unit',
      taskType: 'geography_map',
      patterns: [/比例尺|图上距离|实际距离|地图|单位|厘米/],
      firstStep: '先读比例尺含义，再统一单位。',
      wrongCause: '没有先看比例尺和单位，直接代数计算。',
      boardMove: '小黑板只写“图上距离 -> 比例尺 -> 实际距离”，先不算到底。',
      parentCheck: '先问：图上 1 厘米代表实际多少？单位统一了吗？',
      reviewMove: '换一个比例尺，仍先说 1 厘米代表什么。'
    },
    {
      id: 'rhetorical_to_statement',
      taskType: 'reading_question',
      patterns: [/反问句|陈述句|删问号|反问词|否定词|语气/],
      firstStep: '先找反问词和否定词，再把语气改成肯定陈述。',
      wrongCause: '只改标点，没有处理反问语气。',
      boardMove: '小黑板只圈反问词、否定词和句末标点三处。',
      parentCheck: '先问：这句话改完后意思有没有变？语气是不是陈述？',
      reviewMove: '换一个反问句，仍先圈反问词和否定词。'
    },
    {
      id: 'classical_zhi_context',
      taskType: 'reading_question',
      patterns: [/文言文|所有之|前后词|翻成“的”|用法/],
      firstStep: '先看“之”在句子里的位置和前后词。',
      wrongCause: '把常见义套到所有语境，没有看词在句中的作用。',
      boardMove: '小黑板只圈“之”的前后两个词，先判断结构。',
      parentCheck: '先问：这个“之”前后分别是什么词？能不能都翻成“的”？',
      reviewMove: '换一句文言句子，仍先看前后词。'
    },
    {
      id: 'writing_first_sentence',
      taskType: 'writing_process',
      patterns: [/作文|开头|难忘|小事|完整篇|第一句/],
      firstStep: '先写一句最朴素的开头：那天发生了什么。',
      wrongCause: '想一次写完全文，导致第一句迟迟落不下来。',
      boardMove: '小黑板只画“时间、地点、人物、事件”四格，不评价文采。',
      parentCheck: '先问：先写一句发生了什么，不用一开始就写得漂亮。',
      reviewMove: '换一个作文题，仍先写一件事的第一句。'
    },
    {
      id: 'percent_discount',
      taskType: 'math_word_problem',
      patterns: [/八折|七五折|折扣|原价|现价|80%|百分数/],
      firstStep: '先把八折翻译成现价是原价的 80%。',
      wrongCause: '把折扣当成少掉的具体钱数，没有先翻译百分数含义。',
      boardMove: '小黑板只写“八折 = 现价占原价 80%”。',
      parentCheck: '先问：八折说的是现价占原价的几成，不是少几元。',
      reviewMove: '换成七五折，仍先说现价占原价百分之几。'
    },
    {
      id: 'ratio_scale_one_unit',
      taskType: 'math_word_problem',
      patterns: [/图纸|2 厘米|6 米|5 厘米|每 1 厘米|比例/],
      firstStep: '先求图上 1 厘米对应实际 3 米。',
      wrongCause: '没有先找每 1 厘米对应量，直接把图上长度相乘。',
      boardMove: '小黑板只画“2 厘米 -> 6 米，所以 1 厘米 -> 3 米”。',
      parentCheck: '先问：图上 1 厘米到底代表实际多少？',
      reviewMove: '把图上 5 厘米换成 7 厘米，仍先求 1 厘米对应量。'
    },
    {
      id: 'composite_area_subtract',
      taskType: 'math_word_problem',
      patterns: [/组合图形|面积|长方形|正方形|挖去|剩余面积/],
      firstStep: '先判断剩余面积等于大长方形面积减小正方形面积。',
      wrongCause: '没有先分清整体和被挖掉的部分。',
      boardMove: '小黑板只画“大图形 - 挖掉部分 = 剩余”。',
      parentCheck: '先问：这题求的是整个图形，还是被挖掉后剩下的部分？',
      reviewMove: '换成挖去一个三角形，仍先说整体减去哪一块。'
    },
    {
      id: 'inequality_negative_sign',
      taskType: 'equation_setup',
      patterns: [/不等式|除以负数|乘以负数|不等号方向|反向/],
      firstStep: '先标出这一步是除以负数。',
      wrongCause: '把不等式变形当成方程变形，忘记负数会改变不等号方向。',
      boardMove: '小黑板只写“除以负数 -> 不等号反向”。',
      parentCheck: '先问：这一步两边是除以正数还是负数？不等号方向要不要变？',
      reviewMove: '换成乘以负数，仍先判断不等号方向。'
    },
    {
      id: 'quadratic_vertex_form',
      taskType: 'math_word_problem',
      patterns: [/二次函数|抛物线|顶点式|开口方向|h、k|二次项系数/],
      firstStep: '先从顶点式读出顶点和开口方向。',
      wrongCause: '没有先读式子结构，直接代数计算。',
      boardMove: '小黑板只圈顶点式里的 h、k 和二次项系数符号。',
      parentCheck: '先问：这个式子能直接读出顶点吗？开口看哪个符号？',
      reviewMove: '换一个顶点式，仍先圈 h、k 和开口符号。'
    },
    {
      id: 'chinese_main_idea',
      taskType: 'reading_question',
      patterns: [/概括|主要内容|谁做了什么|结果怎样|细节都抄/],
      firstStep: '先用“谁做了什么，结果怎样”压成一句话。',
      wrongCause: '把细节堆砌当概括，没有抓人物、事件和结果。',
      boardMove: '小黑板只画“谁 -> 做什么 -> 结果”三格。',
      parentCheck: '先问：这句话能不能去掉两个细节，还保留主要意思？',
      reviewMove: '换一篇写劳动的小短文，仍先压成谁做什么。'
    },
    {
      id: 'argument_evidence',
      taskType: 'reading_question',
      patterns: [/议论文|论点|论据|事例|证明观点|个人观点/],
      firstStep: '先找到文章中心论点，再圈支撑它的事例论据。',
      wrongCause: '把个人观点当答案，没有区分论点和论据。',
      boardMove: '小黑板只画“论点 -> 事例论据 -> 证明关系”。',
      parentCheck: '先问：这句话是作者观点，还是用来证明观点的例子？',
      reviewMove: '换一段议论文，仍先圈论点和事例。'
    },
    {
      id: 'english_comparative_than',
      taskType: 'english_sentence',
      patterns: [/比较级|than|tall|heavy|加 -er/i],
      firstStep: '先找比较信号 than，再判断用比较级。',
      wrongCause: '没有先看比较信号，直接填形容词原形。',
      boardMove: '小黑板只圈 than，写“比较级”。',
      parentCheck: '先问：句子里有没有 than？它提示比较还是原级？',
      reviewMove: '把 tall 换成 heavy，仍先找 than。'
    },
    {
      id: 'english_passive_be_done',
      taskType: 'english_sentence',
      patterns: [/被动语态|The bridge|build|built|be 动词|be done/i],
      firstStep: '先判断主语是动作承受者，再写 be done 结构。',
      wrongCause: '只记过去分词，没有检查被动语态需要 be 动词。',
      boardMove: '小黑板只写“承受者 + be + done”。',
      parentCheck: '先问：桥是自己建造，还是被建造？be 动词有没有位置？',
      reviewMove: '换成 The room clean，仍先判断承受者和 be done。'
    },
    {
      id: 'english_cloze_context',
      taskType: 'reading_question',
      patterns: [/完形填空|空格|前后两句|语境线索|后句验证/],
      firstStep: '先读空格前后两句，找语境线索。',
      wrongCause: '只看空格所在一句，没有利用上下文。',
      boardMove: '小黑板只画“前句线索 -> 空格 -> 后句验证”。',
      parentCheck: '先问：空格前一句给了什么线索？选项能不能被后一句验证？',
      reviewMove: '换一个完形空，仍先读前后两句。'
    },
    {
      id: 'density_unit',
      taskType: 'physics_diagram',
      patterns: [/密度|质量|体积|单位|m \/ 体积|统一单位/],
      firstStep: '先把质量和体积分别圈出并统一单位。',
      wrongCause: '没有先分清质量、体积和单位。',
      boardMove: '小黑板只画“质量 m / 体积 V -> 密度”。',
      parentCheck: '先问：你圈出的哪个是质量，哪个是体积？单位统一了吗？',
      reviewMove: '换一个体积单位，仍先统一单位再说公式。'
    },
    {
      id: 'pressure_area',
      taskType: 'physics_diagram',
      patterns: [/压强|正放|侧放|受力面积|接触面积|压力/],
      firstStep: '先判断压力是否不变，再比较受力面积。',
      wrongCause: '只看压力大小，忽略受力面积对压强的影响。',
      boardMove: '小黑板只画“压力相同，接触面积不同”。',
      parentCheck: '先问：压力有没有变？接触面积变大还是变小？',
      reviewMove: '换成书本平放和立放，仍先比较面积。'
    },
    {
      id: 'speed_graph_slope',
      taskType: 'physics_diagram',
      patterns: [/速度图像|路程-时间|斜率|终点数值|单位时间/],
      firstStep: '先判断速度看路程随时间变化的斜率。',
      wrongCause: '把终点路程当速度，没有看单位时间变化量。',
      boardMove: '小黑板只画“时间增加 1 份，路程增加几份”。',
      parentCheck: '先问：速度看终点数值，还是看每单位时间走多少？',
      reviewMove: '换一条更陡的直线，仍先比较单位时间路程。'
    },
    {
      id: 'metal_activity_displacement',
      taskType: 'chemistry_experiment',
      patterns: [/金属活动性|铁片|硫酸铜|红色物质|置换|活泼/],
      firstStep: '先判断铁比铜活泼，可能把铜置换出来。',
      wrongCause: '只记实验颜色，没有连接金属活动性顺序。',
      boardMove: '小黑板只画“活泼金属 -> 置换较不活泼金属”。',
      parentCheck: '先问：红色物质可能是谁？铁和铜谁更活泼？',
      reviewMove: '换成锌和硫酸铜，仍先比较活动性。'
    },
    {
      id: 'solution_mass_fraction',
      taskType: 'chemistry_experiment',
      patterns: [/溶质质量分数|10 克盐|90 克水|溶液质量|分母/],
      firstStep: '先判断溶液质量等于溶质质量加溶剂质量。',
      wrongCause: '把溶剂质量当分母，没有先求溶液总质量。',
      boardMove: '小黑板只画“溶质 10g + 水 90g = 溶液 100g”。',
      parentCheck: '先问：质量分数的分母是水，还是整个溶液？',
      reviewMove: '换成 5 克盐和 45 克水，仍先求溶液质量。'
    },
    {
      id: 'ph_neutralization_trend',
      taskType: 'chemistry_experiment',
      patterns: [/中和|氢氧化钠|pH|酸性|加碱|变化趋势/],
      firstStep: '先判断加入碱会让酸性逐渐减弱，pH 上升。',
      wrongCause: '只背酸碱名称，没有看 pH 变化方向。',
      boardMove: '小黑板只画“加碱 -> 酸性减弱 -> pH 上升”。',
      parentCheck: '先问：加入的是酸还是碱？pH 应该往大变还是往小变？',
      reviewMove: '换成向碱中加酸，仍先判断 pH 方向。'
    },
    {
      id: 'microscope_reverse_move',
      taskType: 'biology_process',
      patterns: [/显微镜|物像偏左上|玻片|移动方向|相反/],
      firstStep: '先记住显微镜下物像移动方向与玻片移动方向相反。',
      wrongCause: '按肉眼直觉移动，没有考虑显微镜成像相反。',
      boardMove: '小黑板只画“物像偏左上 -> 玻片向左上移”的反向规则提示。',
      parentCheck: '先问：你移动的是玻片，不是屏幕上的物像，对吗？',
      reviewMove: '换成物像偏右下，仍先判断玻片移动方向。'
    },
    {
      id: 'blood_circulation_route',
      taskType: 'biology_process',
      patterns: [/血液循环|体循环|肺循环|左心室|右心房|心腔/],
      firstStep: '先判断体循环从左心室出发，回到右心房。',
      wrongCause: '把肺循环和体循环的起点终点混淆。',
      boardMove: '小黑板只画“左心室 -> 全身 -> 右心房”。',
      parentCheck: '先问：这题问体循环还是肺循环？起点是哪一个心腔？',
      reviewMove: '换成肺循环，仍先说起点和终点。'
    },
    {
      id: 'lat_lon_hemisphere',
      taskType: 'geography_map',
      patterns: [/经纬网|经线|纬线|半球|东西经|南北纬/],
      firstStep: '先分清纬度判断南北半球，经度判断东西半球。',
      wrongCause: '把经线纬线的作用混在一起。',
      boardMove: '小黑板只画“纬度看南北，经度看东西”。',
      parentCheck: '先问：南北半球先看经度还是纬度？东西半球呢？',
      reviewMove: '换一个经纬度点，仍先分南北再分东西。'
    },
    {
      id: 'monsoon_water_vapor',
      taskType: 'geography_map',
      patterns: [/季风|夏季风|降水|海洋|陆地|水汽/],
      firstStep: '先判断夏季风从海洋吹向陆地，带来水汽。',
      wrongCause: '只背风向，没有连接水汽来源和降水。',
      boardMove: '小黑板只画“海洋 -> 陆地 -> 水汽 -> 降水”。',
      parentCheck: '先问：这股风从哪里来？有没有带来水汽？',
      reviewMove: '换成冬季风，仍先判断来自海洋还是陆地。'
    },
    {
      id: 'river_flows_downhill',
      taskType: 'geography_map',
      patterns: [/河流流向|等高线|高处|低处|海拔变化|地图上下/],
      firstStep: '先看地势高低，河流从高处流向低处。',
      wrongCause: '把地图上下当成实际流向，没有看海拔变化。',
      boardMove: '小黑板只画“高海拔 -> 低海拔”的箭头。',
      parentCheck: '先问：河流看地图上方下方，还是看海拔高低？',
      reviewMove: '换一张等高线河流图，仍先找高处和低处。'
    }
  ];
  if (/没说|缺少|题干不全|条件不完整|没有给/.test(source)) {
    return {
      id: `missing_condition_${taskType || 'unknown'}`,
      taskType: taskType || 'unknown',
      firstStep: '第一步先停下来补题干条件，不根据缺失信息硬算。',
      wrongCause: '题干条件不完整时仍想直接计算，容易把猜测当答案。',
      boardMove: '小黑板只画“已知条件 / 缺少条件 / 题目问题”三栏。',
      parentCheck: '家长先问：这题还缺哪个已知条件？不要先催孩子算。',
      reviewMove: '明天换一道条件完整的小题，只练先检查题干。',
      source: 'missing_condition_guard'
    };
  }
  if (/草、兔、鹰/.test(source) && !/狐/.test(source)) {
    return {
      id: 'food_chain_three_node_arrow',
      taskType: 'biology_process',
      firstStep: '先从被吃的生物指向吃它的生物。',
      wrongCause: '把捕食关系和能量流动箭头方向混淆。',
      boardMove: '小黑板只画“草 -> 兔 -> 鹰”的一条箭头链。',
      parentCheck: '先问：箭头表示能量流向谁，不是表示谁去抓谁。',
      reviewMove: '换成草、昆虫、青蛙，仍先从生产者画起。',
      source: 'real_homework_pressure_exact'
    };
  }
  if (/语文句式转换作业|只删问号，句子意思变了/.test(source)) {
    return {
      id: 'rhetorical_to_statement_exact',
      taskType: 'reading_question',
      firstStep: '先找反问词和否定词，再把语气改成肯定陈述。',
      wrongCause: '只改标点，没有处理反问语气。',
      boardMove: '小黑板只圈反问词、否定词和句末标点三处。',
      parentCheck: '先问：这句话改完后意思有没有变？语气是不是陈述？',
      reviewMove: '换一个反问句，仍先圈反问词和否定词。',
      source: 'real_homework_pressure_exact'
    };
  }
  if (/语气和否定词没有调整/.test(source)) {
    return {
      id: 'sentence_rewrite_meaning_exact',
      taskType: 'reading_question',
      firstStep: '先判断反问句表达的真实意思，再去掉反问语气。',
      wrongCause: '把句式转换当标点修改，没有保留原句意思。',
      boardMove: '小黑板只写“真实意思 -> 去反问词 -> 调标点”。',
      parentCheck: '先问：改完以后意思和原句一样吗？',
      reviewMove: '换成把双重否定句改成肯定句，仍先判断真实意思。',
      source: 'real_homework_pressure_exact'
    };
  }
  if (/完形填空题|随便选词/.test(source)) {
    return {
      id: 'cloze_context_reading_exact',
      taskType: 'reading_question',
      firstStep: '先读空格前后两句，找语境线索。',
      wrongCause: '只看空格所在一句，没有利用上下文。',
      boardMove: '小黑板只画“前句线索 -> 空格 -> 后句验证”。',
      parentCheck: '先问：空格前一句给了什么线索？选项能不能被后一句验证？',
      reviewMove: '换一个完形空，仍先读前后两句。',
      source: 'real_homework_pressure_exact'
    };
  }
  const matchedEntry = pickBestCase(cases.filter((item) => item.taskType === taskType), taskType)
    || pickBestCase(cases, taskType);
  const matched = matchedEntry && matchedEntry.item;
  if (!matched) {
    return {
      id: `generic_${taskType || 'unknown'}`,
      taskType: taskType || 'unknown',
      firstStep: TASK_TYPE_PROMPTS[taskType] || TASK_TYPE_PROMPTS.unknown,
      wrongCause: (MISCONCEPTION_MAP[taskType] && Object.values(MISCONCEPTION_MAP[taskType])[0]) || MISCONCEPTION_MAP.unknown.first_step,
      boardMove: '小黑板只画第一步入口，不写最终结果。',
      parentCheck: '家长只问孩子第一步先看哪里。',
      reviewMove: '明天换一题小变式，只回访同一个第一步。',
      source: 'generic_task_type'
    };
  }
  return Object.assign({}, matched, { source: 'real_homework_pressure_pattern' });
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

function buildQuestionBankVisualBoardBridge(taskType = 'unknown', questionTypePath = {}, visualRecovery = {}) {
  const path = questionTypePath || {};
  const moves = Array.isArray(path.visualMoves) ? path.visualMoves : [];
  const probes = Array.isArray(path.probeBank) ? path.probeBank : [];
  const fallback = Array.isArray(path.fallbackLadder) ? path.fallbackLadder : [];
  const recoveryLayers = Array.isArray(visualRecovery.boardLayers) ? visualRecovery.boardLayers : [];
  const activeMove = moves[0] || {};
  const activeProbe = probes[0] || {};
  const boardLayers = [
    {
      id: 'read_question',
      label: '读题定位',
      drawAction: activeMove.boardMove || '小黑板只圈出题目问什么。',
      studentLine: activeProbe.question || '先说题目问什么，不说完整答案。',
      evidence: 'student_states_question_target'
    },
    {
      id: 'mark_evidence',
      label: '标证据',
      drawAction: moves[1] ? moves[1].boardMove : (recoveryLayers[1] ? recoveryLayers[1].move : '只画已知条件和关系线。'),
      studentLine: '孩子指出一个已知条件或一个关系词。',
      evidence: 'student_marks_one_condition'
    },
    {
      id: 'first_move',
      label: '第一步',
      drawAction: moves[2] ? moves[2].boardMove : (recoveryLayers[2] ? recoveryLayers[2].move : '只写第一步入口，不写后续解法。'),
      studentLine: '孩子用自己的话说下一小步。',
      evidence: 'student_says_first_move'
    }
  ];
  return {
    id: `question_bank_visual_board_bridge_${taskType || 'unknown'}`,
    title: '题型第一步小黑板',
    taskType: path.taskType || taskType || 'unknown',
    status: boardLayers.length >= 3 ? 'ready' : 'needs_board_layers',
    boardLayers,
    failureBranches: fallback.slice(0, 3).map((item) => ({
      id: item.id,
      trigger: item.trigger,
      boardMove: item.move,
      route: item.route
    })),
    exitCriteria: [
      '孩子能说出题目问什么。',
      '孩子能指出一个已知条件或关系词。',
      '孩子能说出第一步，不需要完整答案。'
    ],
    parentLine: path.parentCheckLine || '家长只问第一步，不检查完整答案。',
    reportLine: `本题型已有 ${probes.length} 条追问轴、${moves.length} 个可视化动作和 ${fallback.length} 个失败兜底。`,
    noFullAnswerBoundary: path.noFullAnswerBoundary || '不输出完整答案，不代写，不承诺全科自动板书。',
    shareBoundary: '分享只带题型、第一步板书层和回访动作，不带原题照片、完整答案、分数、排名或完整对话。',
    evidenceRequired: ['question_type_visual_board', 'student_first_move', 'failure_branch', 'exit_criteria', 'no_full_answer_boundary', 'safe_share_boundary']
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

function buildSocraticPromptQualityJudge(activeTaskType = 'unknown', qualitySuite = null, questionTypePath = null) {
  const suite = qualitySuite || buildSocraticQualityEvaluationSuite(activeTaskType);
  const activeCase = suite && suite.activeCase ? suite.activeCase : {};
  const taskType = activeCase.taskType || activeTaskType || 'unknown';
  const activeScenarios = Array.isArray(activeCase.scenarios) ? activeCase.scenarios : [];
  const probeBank = questionTypePath && Array.isArray(questionTypePath.probeBank) ? questionTypePath.probeBank : [];
  const firstProbe = probeBank[0] || {};
  return {
    id: `socratic_prompt_quality_judge_${taskType}`,
    title: '追问质量判断器',
    taskType,
    status: activeScenarios.length >= 4 ? 'ready' : 'needs_more_cases',
    summary: '每次点拨都先判断追问是否推动孩子说出第一步，而不是多讲概念、替孩子写答案。',
    effectivePrompts: [
      {
        id: 'first_step_probe',
        label: '第一步定位追问',
        prompt: firstProbe.question || '先说题目问什么，再说你准备先看哪一个条件。',
        why: '只要求一个可观察动作，能把卡住点从空泛变成可回访证据。'
      },
      {
        id: 'micro_choice',
        label: 'A/B 微选择',
        prompt: '如果说不出，就在 A 先找已知条件、B 先看题目问题里选一个。',
        why: '沉默时降低门槛，不把孩子推向抄答案。'
      },
      {
        id: 'evidence_anchor',
        label: '证据锚点',
        prompt: '用一句话说你刚才根据哪个词、图、单位或条件判断的。',
        why: '把“会不会”转成“证据是否出现”，方便家长判断今晚是否停。'
      },
      {
        id: 'next_day_revisit',
        label: '明日回访',
        prompt: '同类小变式还卡住时，不加题，明天只回访同一个第一步。',
        why: '迁移失败时避免刷量，保护记忆循环和情绪。'
      }
    ],
    misleadingPrompts: [
      { id: 'full_answer', label: '直接给完整答案', risk: '会绕过孩子第一步，破坏证据链。', blockedBy: 'no_full_answer_boundary' },
      { id: 'concept_stack', label: '一次堆多个概念', risk: '孩子只会点头，无法留下可复测动作。', blockedBy: 'one_prompt_one_action' },
      { id: 'compound_question', label: '连续问多步复合问题', risk: '沉默会增加，家长也不知道该检查哪一步。', blockedBy: 'micro_choice_fallback' },
      { id: 'ability_label', label: '过早评价能力', risk: '把当前错因误判成长期画像，影响家长决策。', blockedBy: 'evidence_before_label' }
    ],
    stopConditions: [
      { id: 'child_first_step', label: '孩子说出第一步', action: '停止继续讲解，转修卡点或轻回访。' },
      { id: 'answer_request', label: '孩子继续要答案', action: '拦住完整答案，只回到题目问什么和已知条件。' },
      { id: 'repeated_silence', label: '连续沉默或只说不会', action: '降到 A/B 微选择，仍无回应就交给家长低压话术。' },
      { id: 'transfer_fail', label: '同类小变式失败', action: '停止加题，记录错因，安排明日同一步回访。' }
    ],
    parentDecisionRules: [
      { id: 'continue', label: '继续', rule: '孩子能说出第一步且情绪稳定，继续做一张近似小变式。' },
      { id: 'downgrade', label: '降级', rule: '孩子沉默或答偏，降到 A/B 微选择，不讲新概念。' },
      { id: 'stop', label: '停止', rule: '出现要答案、焦躁或迁移失败，今晚停止讲解，只留明日回访。' },
      { id: 'report', label: '进报告', rule: '只有第一步、错因、回访结果三类证据齐了，才进入长期画像。' }
    ],
    parentDecisionLine: '家长只看：这次追问有没有让孩子说出第一步；没有就降级或停止，不用继续讲题。',
    shareBoundary: '安全接力只分享能力缺口、下一步动作和回访窗口，不分享原题、完整答案、孩子原始表现或完整对话。',
    evidenceRequired: [
      'effective_prompt',
      'misleading_prompt_blocked',
      'stop_condition',
      'parent_decision_rule',
      'safe_share_boundary'
    ]
  };
}

function buildThreeRoundSocraticProtocol(taskType, item, probe, fallbackPlan = {}, visualRecovery = {}, qualitySuite = {}) {
  const normalizedType = taskType || 'unknown';
  const boardLayers = Array.isArray(visualRecovery.boardLayers) ? visualRecovery.boardLayers : [];
  const failureBranches = Array.isArray(visualRecovery.failureBranches) ? visualRecovery.failureBranches : [];
  const activeCase = qualitySuite && qualitySuite.activeCase ? qualitySuite.activeCase : {};
  const activeScenarios = Array.isArray(activeCase.scenarios) ? activeCase.scenarios : [];
  const microChoices = Array.isArray(fallbackPlan.microChoices) ? fallbackPlan.microChoices : [
    { id: 'a', label: 'A', text: '先找题目给了什么' },
    { id: 'b', label: 'B', text: '先看题目问什么' }
  ];
  const firstBoard = boardLayers[0] || { label: '定位', move: '只定位题目问什么。' };
  const secondBoard = boardLayers[1] || { label: '第一笔', move: fallbackPlan.blackboardMove || '小黑板只写第一步。' };
  const thirdBoard = boardLayers[2] || { label: '说回来', move: '孩子用自己的话说下一小步。' };
  return {
    id: `three_round_socratic_protocol_${normalizedType}`,
    title: '三轮点拨协议',
    taskType: normalizedType,
    status: boardLayers.length >= 3 && failureBranches.length >= 3 ? 'ready' : 'needs_protocol_depth',
    roundCount: 3,
    rounds: [
      {
        id: 'round_1_locate',
        label: '第1轮 定位题型轴',
        trigger: '孩子刚说不会、空泛求讲解或第一步不清楚',
        coachMove: probe && probe.prompt ? probe.prompt : '先说题目问什么，只说第一步。',
        blackboardMove: firstBoard.move,
        passEvidence: probe && probe.evidenceNeeded ? probe.evidenceNeeded : 'student_first_step'
      },
      {
        id: 'round_2_micro_choice',
        label: '第2轮 降到二选一',
        trigger: '孩子沉默、重复不会或答偏',
        coachMove: microChoices.map((choice) => `${choice.label}:${choice.text}`).join(' / '),
        blackboardMove: secondBoard.move,
        passEvidence: 'child_micro_choice'
      },
      {
        id: 'round_3_handoff',
        label: '第3轮 交给回访',
        trigger: '孩子仍卡住、要答案或迁移失败',
        coachMove: '停止加题，转错因卡、明日回访和家长一句话复盘。',
        blackboardMove: thirdBoard.move,
        passEvidence: 'next_day_revisit'
      }
    ],
    fallbackBranches: [
      {
        id: 'silent_child',
        trigger: '沉默或只说不会',
        move: '只给 A/B 微选择，不连续追问。',
        evidence: 'child_micro_choice'
      },
      {
        id: 'answer_request',
        trigger: '直接要答案或要求代写',
        move: '拦住完整答案，回到题目问什么和第一步。',
        evidence: 'blocked_full_answer'
      },
      {
        id: 'wrong_axis',
        trigger: '抓错条件或答偏',
        move: probe && probe.question ? probe.question : '回到当前题型误区轴，只问一个定位问题。',
        evidence: probe && probe.evidence ? probe.evidence : 'socratic_axis_evidence'
      },
      {
        id: 'transfer_fail',
        trigger: '同类变式仍卡住',
        move: '停止加题，转错因卡和明日回访。',
        evidence: 'next_day_revisit'
      }
    ],
    qualityScenarioIds: activeScenarios.map((scenario) => scenario.id),
    exitCriteria: [
      '孩子能说出题目问什么或一个已知条件。',
      '孩子能在 A/B 里选一个方向并说一句理由。',
      '孩子能说出下一小步；说不出就转回访，不继续讲完整答案。'
    ],
    evidenceRequired: [
      'round_1_axis_probe',
      'round_2_micro_choice',
      'round_3_parent_handoff',
      'visual_board_layer',
      'blocked_full_answer',
      'next_day_revisit',
      'safe_share_boundary'
    ],
    parentLine: '家长只照读三轮话术：定位一句、二选一一句、仍卡住就明天回访。',
    reportLine: '报告只记录三轮是否完成和孩子说回来的证据，不用一次对话给孩子贴标签。',
    shareBoundary: '分享只带题型轴、第一步小黑板和回访动作，不带原题照片、完整答案、完整对话、分数或排名。'
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
  const homeworkPressureSignal = inferHomeworkPressureSignal(`${text || ''} ${selected.text || ''}`, taskType);
  const target = selected && selected.text ? `「${selected.text}」` : '这道题';
  const taskPrompt = TASK_TYPE_PROMPTS[taskType] || TASK_TYPE_PROMPTS.unknown;

  if (isAnswerRequest(text)) {
    const item = ladderItem(1);
    const probe = diagnosticProbe(taskType, item.level);
    const questionTypePath = buildQuestionTypeSocraticPath(taskType, item, probe);
    const socraticQualityEvaluationSuite = buildSocraticQualityEvaluationSuite(taskType);
    const socraticPromptQualityJudge = buildSocraticPromptQualityJudge(taskType, socraticQualityEvaluationSuite, questionTypePath);
    const socraticContract = buildSocraticContract(taskType, item, probe);
    const socraticFallbackPlan = buildSocraticFallbackPlan(taskType, item, probe, { answerBlocked: true });
    const visualSocraticRecovery = buildVisualSocraticRecoveryProtocol(taskType, item, probe, socraticFallbackPlan, { answerBlocked: true });
    const fallbackRecoveryBridge = buildFallbackRecoveryBridge(taskType, item, probe, socraticFallbackPlan, visualSocraticRecovery, { answerBlocked: true });
    const threeRoundSocraticProtocol = buildThreeRoundSocraticProtocol(taskType, item, probe, socraticFallbackPlan, visualSocraticRecovery, socraticQualityEvaluationSuite);
    const questionBankVisualBoardBridge = buildQuestionBankVisualBoardBridge(taskType, questionTypePath, visualSocraticRecovery);
    return {
      reply: withStepIntro(item, '我不能直接替你写答案，但可以陪你先找第一步。先说题目问什么，或者圈出一个已知条件。'),
      hint_level: 1,
      hint_label: item.label,
      coach_step: item.step,
      coach_step_label: stepIntro(item),
      diagnostic_probe: probe,
      question_type_socratic_path: questionTypePath,
      real_homework_pressure_signal: homeworkPressureSignal,
      question_bank_visual_board_bridge: questionBankVisualBoardBridge,
      socratic_quality_evaluation_suite: socraticQualityEvaluationSuite,
      socratic_prompt_quality_judge: socraticPromptQualityJudge,
      socratic_contract: socraticContract,
      socratic_fallback_plan: socraticFallbackPlan,
      visual_socratic_recovery: visualSocraticRecovery,
      fallback_recovery_bridge: fallbackRecoveryBridge,
      three_round_socratic_protocol: threeRoundSocraticProtocol,
      allowed_moves: probe.allowedMoves,
      transfer_prompt: probe.transferPrompt,
      next_action: homeworkPressureSignal.firstStep || '先说题目问什么，或者圈出一个已知条件。',
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
  const socraticPromptQualityJudge = buildSocraticPromptQualityJudge(taskType, socraticQualityEvaluationSuite, questionTypePath);
  const socraticContract = buildSocraticContract(taskType, item, probe);
  const stuckCount = countRecentStuck(messages, text);
  const socraticFallbackPlan = buildSocraticFallbackPlan(taskType, item, probe, { stuckCount });
  const visualSocraticRecovery = buildVisualSocraticRecoveryProtocol(taskType, item, probe, socraticFallbackPlan, { stuckCount });
  const fallbackRecoveryBridge = buildFallbackRecoveryBridge(taskType, item, probe, socraticFallbackPlan, visualSocraticRecovery, { stuckCount });
  const threeRoundSocraticProtocol = buildThreeRoundSocraticProtocol(taskType, item, probe, socraticFallbackPlan, visualSocraticRecovery, socraticQualityEvaluationSuite);
  const questionBankVisualBoardBridge = buildQuestionBankVisualBoardBridge(taskType, questionTypePath, visualSocraticRecovery);
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
      real_homework_pressure_signal: homeworkPressureSignal,
      question_bank_visual_board_bridge: questionBankVisualBoardBridge,
    socratic_quality_evaluation_suite: socraticQualityEvaluationSuite,
    socratic_prompt_quality_judge: socraticPromptQualityJudge,
    socratic_contract: socraticContract,
    socratic_fallback_plan: socraticFallbackPlan,
    visual_socratic_recovery: visualSocraticRecovery,
    fallback_recovery_bridge: fallbackRecoveryBridge,
    three_round_socratic_protocol: threeRoundSocraticProtocol,
    allowed_moves: probe.allowedMoves,
    transfer_prompt: probe.transferPrompt,
      next_action: item.level >= 5 ? (homeworkPressureSignal.reviewMove || '把方法做成复习卡或生成一道小变式。') : (homeworkPressureSignal.firstStep || '先回一句你的第一步。'),
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
  buildThreeRoundSocraticProtocol,
  buildQuestionTypeSocraticPath,
  inferHomeworkPressureSignal,
  buildQuestionBankVisualBoardBridge,
  buildQuestionTypeCoverageAtlas,
  buildSocraticQualityEvaluationSuite,
  buildSocraticPromptQualityJudge,
  MISCONCEPTION_MAP,
  detectTaskType,
  buildTutorReply,
  simulateThreeRoundSocratic
};
