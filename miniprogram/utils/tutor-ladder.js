const ANSWER_REQUEST_RE = /直接告诉我答案|求答案|不想写过程|不用讲第一步|直接给最终数字|最终数字|最终答案|马上填空|拍照出答案|直接给结果|告诉我答案|给答案|答案是什么|直接说结果|帮我写答案|直接帮孩子写|帮孩子写.*字|成文|代写|替他.*写|直接替|完整解题板书|完整动态板书|完整错题答案|从第一步到最后答案|照着写|完整板书.*结论|最后结论|直接给拍题|假装已经识别|已经看过孩子的照片|带孩子分数|排名.*转发|tell me the answer|沿用昨天的答案|不用重新看|直接套|没有给横轴纵轴|不用读图|直接判断|别问排开体积|直接套公式|超过同龄人|错题原文|老师点评|动态电路动画|完整解题过程|已生成动态|掌握全章|完全掌握|进入下一单元|标准答案|直接搬到报告|不要再问孩子|推到最后答案|不用说自己的第一步|班级排行榜|原题截图|完整几何板书|直接发 XP|解锁下一单元|不用本地规则|超过班里大多数人|制造转介绍/i;
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
  { id: 'reading_question', patterns: /阅读|上下文|语境|主旨|细节|原因|段意|中心句|概括|反问句|陈述句|文言文|文言词语|文言实词|句子改写|心情变化|论点|论据|议论文|说明文|说明文语言|准确性|约、大约、可能/i },
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
  if (/几何作业|邻补角|对顶角|平行线同位角|角的位置关系/.test(source)) {
    return 'math_word_problem';
  }
  if (/行程作业|追上|先走|追及|提前.*分钟|路程相等/.test(source)) {
    return 'equation_setup';
  }
  if (/完形作业|完形填空.*代词|Tom and his sister|Lily and I/.test(source)) {
    return 'english_sentence';
  }
  if (/百分数作业|八折|七五折|折扣/.test(source)) {
    return 'math_word_problem';
  }
  if (/宾语从句|陈述语序|疑问词 where|疑问词 when/.test(source)) {
    return 'english_sentence';
  }
  if (/阅读指代|it 指代|they 指代/.test(source)) {
    return 'reading_question';
  }
  if (/病句作业|通过这次活动|主语缺失|由于.*让/.test(source)) {
    return 'writing_process';
  }
  if (/材料作文|坚持与转弯|规则与创新|立意/.test(source)) {
    return 'writing_process';
  }
  if (/调酸奶饮品|原味酸奶和水按 3:2|酸奶占几份/.test(source)) {
    return 'math_word_problem';
  }
  if (/数学函数图像作业|水温随时间变化|横轴、纵轴和每一段/.test(source)) {
    return 'math_word_problem';
  }
  if (/物理压强作业|同一压力作用在不同受力面积|受力面积变了吗/.test(source)) {
    return 'physics_diagram';
  }
  if (/物理热学作业|冰熔化和水升温|温度-时间图/.test(source)) {
    return 'physics_diagram';
  }
  if (/语文说明文阅读.*海陆风|题目问说明方法/.test(source)) {
    return 'reading_question';
  }
  if (/生物人体调节作业|血糖升高.*胰岛素|人体调节过程/.test(source)) {
    return 'biology_process';
  }
  if (/数学.*(概率|摸球|不放回|树状图|平均分|合并后的平均分|平行线|同位角|内错角|同旁内角|统计)/.test(source)) {
    return 'math_word_problem';
  }
  if (/生物.*(光合作用|呼吸作用|遗传|表现型|基因型|配子|消化|吸收)/.test(source)) {
    return 'biology_process';
  }
  if (/化学.*(方程式|配平|反应方程|原子个数)/.test(source)) {
    return 'chemistry_experiment';
  }
  if (/英语阅读|Why did|回文定位|证据句|best title|阅读标题/.test(source)) {
    return 'reading_question';
  }
  if (/英语完形填空作业.*he started to cry/.test(source)) {
    return 'english_sentence';
  }
  if (/数学.*(浓度|混合|盐水|含盐率|分段收费|起步价|超过部分|出租车|水费|电费)|方程|等量关系|未知数|设.*x|列方程|年龄|相遇|追及|利润|成本|售价|长方形周长|几何方程/.test(source)) {
    return 'equation_setup';
  }
  if (/英语.*(because|although|when|状语从句|连词|非谓语|to do|定语从句|关系代词)|although|in order to|to do/.test(source)) {
    return 'english_sentence';
  }
  if (/化学|反应|方程式|溶液|气体|沉淀|酸碱|守恒|配平/.test(source)) {
    return 'chemistry_experiment';
  }
  if (/地理|地球运动|地图|经纬|经线|纬线|气候|季风|河流|等高线|比例尺|公转|自转|昼夜|地形|图例/.test(source)) {
    return 'geography_map';
  }
  if (/作文|写作|提纲|润色|病句|段落中心|细节描写|动作、语言|动作细节|语言描写|神态|只改一句|不通顺/.test(source)) {
    return 'writing_process';
  }
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
  const exactHomeworkCases = [
    ['percent_discount', /又减 6 元|再减 6 元/, 'math_word_problem', '先把八折改成原价的百分之八十，再写出现价和原价的关系。', '把折扣当成固定金额，没有把百分数对应到原价。', '小黑板只写“原价 -> 80%原价 -> 再减 6 元”。', '先问：八折是减 8 元，还是变成原价的百分之八十？', '换成七五折后加运费，仍先把折扣写成原价的百分比。'],
    ['geometry_angle_relation', /另一个角互补|未知角.*邻补角/, 'math_word_problem', '先在图上标出已知角和未知角的位置，再判断它们是对顶角还是邻补角。', '没有先看角的位置关系，直接套角度公式。', '小黑板只画交叉线，圈出“对顶相等、邻补和为 180°”两个位置。', '先问：这两个角是面对面，还是挨在一起成一条直线？', '换成平行线同位角题，仍先说两个角的位置关系。'],
    ['travel_catchup_time', /甲先走|乙再追|追上|x\+20|先走 20 分钟/, 'equation_setup', '先设乙追上用 x 分钟，再写甲一共走 x+20 分钟。', '没有区分先走时间和追及时间，把两人的时间量混同。', '小黑板只列“乙时间=x，甲时间=x+20，路程相等”。', '先问：谁先走？追上时谁走的时间更长？', '换成甲提前 15 分钟出发，仍先写两人的时间表达式。'],
    ['series_circuit_branch_path', /题目给两个灯泡和一个开关/, 'physics_diagram', '先从电源正极出发描一条电流路径，看有没有分支。', '只数元件，没有判断电流是否分路。', '小黑板只画电源和一条电流路径，用分叉点判断串并联。', '先问：电流走到这里有没有分成两条路？', '换成开关闭合后一个灯不亮，仍先描电流路径。'],
    ['liquid_pressure_depth', /液体.*压强|同种液体|不同深度|容器形状/, 'physics_diagram', '先确认同种液体，再比较两个点到液面的深度。', '把容器形状当成决定因素，没有抓住液体深度。', '小黑板只画液面到两个点的竖直深度线。', '先问：同种液体时，压强主要看深度还是容器宽窄？', '换成不同液体同一深度，仍先说要比较密度还是深度。'],
    ['speed_graph_slope', /哪一段速度大|只看线段长短/, 'physics_diagram', '先确认横轴是时间、纵轴是路程，再比较图线斜率。', '把图线长度当速度，没有用斜率表示快慢。', '小黑板只标横轴、纵轴和两段斜率。', '先问：速度看这段线有多长，还是看它有多陡？', '换成速度-时间图像，仍先分清横纵轴表示什么。'],
    ['chloride_ion_reagent', /氯离子的检验方法/, 'chemistry_experiment', '先判断要检验氯离子，再想到加入硝酸银溶液观察白色沉淀。', '只背现象，没有把待检离子和试剂对应。', '小黑板只画“Cl- -> AgNO3 -> 白色沉淀”。', '先问：你要检验的是哪种离子？对应的试剂是什么？', '换成硫酸根离子，仍先说待检离子和检验试剂。'],
    ['mass_conservation_closed', /看到有气体生成就以为质量变少|质量变少/, 'chemistry_experiment', '先判断系统是否密闭，再说密闭体系总质量不变。', '把气体生成等同于质量消失，没有区分开放和密闭体系。', '小黑板只画“密闭容器 -> 反应前总质量 = 反应后总质量”。', '先问：气体有没有跑出容器？如果没有，总质量会怎样？', '换成开放烧杯反应，仍先判断气体是否逸出。'],
    ['gas_collection_property', /氧气收集|收集方法|气体性质|溶于水|密度比空气/, 'chemistry_experiment', '先判断氧气不易溶于水、密度比空气略大，再选收集方法。', '没有先看气体性质，直接凭装置外观选择。', '小黑板只画“气体性质 -> 收集方法”的两格。', '先问：这种气体能不能溶于水？比空气轻还是重？', '换成二氧化碳收集，仍先看溶解性和密度。'],
    ['english_cloze_pronoun', /完形.*代词|Tom and his sister|凭中文感觉选 he/, 'english_sentence', '先找空格指代的是一个人还是两个人，再判断主格、宾格或物主代词。', '没有回看前文指代对象和句子成分。', '小黑板只写“指代谁 -> 单复数 -> 句子成分”。', '先问：这个词代替前文哪个人或哪些人？在句子里做什么成分？', '换成 Lily and I，仍先判断指代对象和成分。'],
    ['object_clause_order', /where 就保留疑问句语序|宾语从句语序/, 'english_sentence', '先判断这是宾语从句，再把从句改成陈述语序。', '把疑问词当成疑问句，没有识别宾语从句要用陈述语序。', '小黑板只写“主句 + where/when + 主语 + 谓语”。', '先问：这个 where 后面是不是放在宾语从句里？从句语序要怎样？', '换成 when 引导的宾语从句，仍先改陈述语序。'],
    ['english_reference_it', /it 指代|they 指代|只看所在句|回看上一句/, 'reading_question', '先回到 it 前一句，找最近且语义能对应的名词或事情；如果是单数名词或整件事，再代回本句验证。', '只看指代词所在句，没有用前文名词和语义验证；也可能只看本句，没有用上下文寻找指代对象。', '小黑板只画“上一句候选词/前文名词事件 -> it -> 代入本句是否通顺”。', '先问：把哪个词代回 it 的位置，句子最通顺？', '换成 they 指代题或 this，仍先找前文复数候选和指代对象。'],
    ['argument_method_claim', /论证方法及作用|没有结合论点/, 'reading_question', '先找这一段服务的中心论点，再判断是举例、道理、对比还是比喻论证。', '没有先找论点，作用分析停留在空话。', '小黑板只写“论证方法 -> 证明了哪个论点”。', '先问：这一段是为了证明哪一句观点？', '换成举例论证段，仍先找被证明的观点。'],
    ['sentence_error_subject_missing', /通过这次活动，使我明白/, 'writing_process', '先找句子主干，判断缺不缺主语，再删去“通过”或“使”中的一个。', '没有抓句子主干，只凭读起来顺不顺判断；只润色句子，没有先判断成分残缺和主语缺失。', '小黑板只写“通过...，使...”会让主语消失，并画“通过/使 -> 主语被遮住”。', '先问：这句话的主语是谁？删掉“通过”或“使”后主语还在吗？', '换成“由于...，让...”结构或“经过努力，使成绩提高”，仍先找主语。'],
    ['material_composition_relation', /材料作文|坚持与转弯|万能主题|立意/, 'writing_process', '先圈出材料里的两个关键词“坚持”和“转弯”，再确定二者关系。', '没有分析材料关系，直接套万能主题。', '小黑板只画“关键词 -> 关系 -> 立意句”。', '先问：材料是在只夸坚持，还是说坚持也要会调整？', '换成“规则与创新”材料，仍先圈关键词并说关系。'],
    ['genetics_same_trait', /相对性状|高茎|绿色种子|同一性状/, 'biology_process', '先确认是不是同一种生物同一性状的不同表现。', '没有抓住“同一性状”，把不同性状混在一起。', '小黑板只写“同种生物 + 同一性状 + 不同表现”。', '先问：这两个特征是不是在比较同一个方面？', '换成有耳垂和无耳垂，仍先判断是不是同一性状。'],
    ['foodweb_arrow_energy', /某动物减少|箭头方向理解反了/, 'biology_process', '先确认箭头表示物质和能量从被吃者流向捕食者。', '把食物网箭头当成捕食方向，没有理解能量流向。', '小黑板只画“草 -> 兔 -> 狐”的能量流向。', '先问：箭头从谁指向谁？表示谁被谁吃后能量流过去？', '换成另一条食物链，仍先说箭头表示能量流向。'],
    ['digestive_absorption_structure', /小肠适于吸收|绒毛|毛细血管|面积大/, 'biology_process', '先把问题分成“面积大”和“物质容易进入血液”两个方向。', '只背单个特点，没有把结构和功能对应。', '小黑板只画“小肠长/绒毛多 -> 面积大；毛细血管多 -> 易吸收”。', '先问：这个结构特点是让面积变大，还是让营养物质更容易进入血液？', '换成肺泡适于气体交换，仍先把结构特点和功能对应。'],
    ['contour_ridge_valley', /海拔递变方向/, 'geography_map', '先沿等高线数值判断海拔向哪边升高，再看弯曲方向。', '只看形状，没有结合等高线数值变化。', '小黑板只画等高线弯曲和海拔升高箭头。', '先问：这些数字往哪边越来越高？弯曲方向和高低有什么关系？', '换成陡坡缓坡判断，仍先看等高线疏密和数值。'],
    ['river_flood_climate', /汛期长短|河流长度，不看气候/, 'geography_map', '先看流域气候和降水季节分配，再判断汛期长短。', '把河流长度当成汛期依据，没有连接气候降水。', '小黑板只画“气候降水 -> 径流变化 -> 汛期”。', '先问：这条河的水主要来自哪里？雨季集中在什么时候？', '换成内流河，仍先判断补给来源和季节变化。'],
    ['climate_chart_type', /气候类型。孩子只看最高温|只看最高温，不看雨热同期/, 'geography_map', '先判断最冷月/最热月气温，再看降水集中在哪个季节；也要读最冷月和最热月气温，再看降水是否集中在夏季。', '只抓一个温度点，只看温度，没有同时看气温和降水组合。', '小黑板只画“温度范围/气温范围 + 降水季节 -> 气候类型”。', '先问：冬天冷不冷？雨主要下在夏天还是全年均匀？', '换成地中海气候图或换一张气候图，仍先读气温和降水两个证据。'],
    ['stat_sample_bias', /篮球队同学|样本是否偏|调查.*是否合理/, 'math_word_problem', '先判断调查对象是不是覆盖全班或随机抽样，再看样本是否只来自篮球队。', '把样本人数当成可靠性，没有检查样本来源是否偏。', '小黑板只画“调查对象 -> 样本来源 -> 能否代表全班”。', '先问：这些被调查的人能代表全班吗？有没有只问某一类同学？', '换成只问美术社同学喜欢的课程，仍先判断样本来源是否偏。'],
    ['area_transform_shadow', /阴影面积|拆成.*三角形|直接把所有边相乘|补成大长方形/, 'math_word_problem', '先把阴影拆成能求面积的三角形或长方形，再分别找底和对应高。', '没有先拆图形和对应底高，直接把边长相乘。', '小黑板只画“阴影 -> 拆成三角形/长方形 -> 标底和高”。', '先问：这个阴影能拆成哪几个熟悉图形？每一块的底和高在哪里？', '换成补成大长方形再减空白，仍先说拆分或补形。'],
    ['density_float_decision', /小球分别放入清水和盐水|液体密度和排开体积|只看液面高度/, 'physics_diagram', '先确认同一物体重力不变，再比较液体密度和排开体积变化。', '只看液面高低，没有抓住浮力由液体密度和排开体积共同决定。', '小黑板只画“小球重力不变 -> 液体密度/排开体积 -> 浮力”。', '先问：同一个小球重力变了吗？换液体后哪个决定量变了？', '换成木块在酒精和水中漂浮，仍先比较密度和排开体积。'],
    ['heat_transfer_direction', /铁勺放进热汤|热传递方向|高温物体传向低温物体/, 'physics_diagram', '先判断哪里温度高、哪里温度低，再说热量从高温物体传向低温物体。', '把热传递方向说反，没有先比较温度高低。', '小黑板只画“热汤高温 -> 勺柄低温”的热量箭头。', '先问：哪个地方温度更高？热量箭头应该从哪里指向哪里？', '换成冰块放进温水，仍先比较高温和低温方向。'],
    ['solubility_curve_delta', /降温后哪种析出更多|温度变化区间|溶解度减少了多少/, 'chemistry_experiment', '先标出降温前后两个温度点，再比较同一种物质溶解度减少了多少。', '只看曲线终点高低，没有比较同一物质在两个温度间的变化量。', '小黑板只画“初温 -> 末温 -> 溶解度差值”的三步。', '先问：这题比较的是终点高低，还是降温前后减少多少？', '换成升温判断能否继续溶解，仍先标两个温度点。'],
    ['chem_variable_control', /不同浓度盐酸和金属反应快慢|同时换了金属种类和酸浓度|实验设计是否合理/, 'chemistry_experiment', '先说这次只研究酸浓度一个变量，其他条件要保持相同。', '没有控制单一变量，同时改变多个条件导致结论不可靠。', '小黑板只画“研究变量：酸浓度；保持相同：金属、温度、体积”。', '先问：这次只想研究哪一个条件？其他条件有没有保持一样？', '换成比较温度对反应速率的影响，仍先列唯一变量和不变量。'],
    ['attributive_clause_component', /The book ____ I bought yesterday|book.*bought.*缺宾语|先行词 book/, 'english_sentence', '先找先行词 book，再判断从句里 bought 后缺宾语。', '只看空格位置，没有检查先行词和从句缺什么成分。', '小黑板只写“先行词 book -> 从句缺宾语 -> 关系词”。', '先问：空格前面被修饰的词是谁？从句里缺主语还是宾语？', '换成修饰 person 的句子，仍先找先行词和从句成分。'],
    ['cloze_logic_turning', /天气很冷.*仍然去跑步|although\/however|转折关系/, 'english_sentence', '先读空格前后两句，判断是转折关系，再找表示转折的连词或副词。', '只看空格所在句，没有用上下文逻辑关系决定词。', '小黑板只画“前句冷 -> 仍然跑步 -> 转折词”。', '先问：前后两句话是顺接、因果，还是转折？', '换成 because/so 因果题，仍先判断前后句逻辑。'],
    ['expository_language_accuracy', /约、大约、可能.*能不能删|说明文语言准确性|删掉后表达会变绝对/, 'reading_question', '先解释这个词限制了范围或程度，再说删掉后表达会变绝对。', '只背“体现说明文语言准确性”，没有结合词语限制的对象。', '小黑板只写“限制词 -> 限制什么 -> 删后变绝对”。', '先问：这个词限制的是数量、范围，还是可能性？删掉后意思变了吗？', '换成“几乎、左右、主要”等词，仍先说限制对象。'],
    ['detail_expansion_emotion', /我很紧张|动作、语言或神态|情绪词 -> 动作/, 'writing_process', '先选一个可看见的动作或神态，把“紧张”换成具体表现。', '只有抽象评价，没有用动作、语言或神态呈现细节。', '小黑板只写“情绪词 -> 动作/语言/神态 -> 一句细节”。', '先问：别人能从哪个动作看出你紧张？', '换成“我很开心”，仍先写一个动作或表情细节。'],
    ['reflex_arc_order', /手碰到热物体马上缩回|反射弧顺序|感受器、传入神经/, 'biology_process', '先按感受器、传入神经、神经中枢、传出神经、效应器排顺序。', '把所有反应都归到大脑，没有区分反射弧的信息传递路径。', '小黑板只画“感受器 -> 传入 -> 中枢 -> 传出 -> 效应器”。', '先问：信号从哪里感受到？按哪条路径传出去？', '换成膝跳反射，仍先按反射弧五部分排序。'],
    ['transpiration_stomata', /塑料袋套在叶片外出现水珠|蒸腾作用和气孔|水珠来自叶片/, 'biology_process', '先判断水珠来自叶片散失的水蒸气，再联系气孔和蒸腾作用。', '只看表面水珠，没有把现象和叶片蒸腾作用对应。', '小黑板只画“叶片气孔 -> 水蒸气 -> 袋内水珠”。', '先问：水珠是在袋子里面形成的，还是从土里漏出来的？叶片通过哪里散失水分？', '换成比较有叶和无叶枝条的水珠多少，仍先找蒸腾来源。'],
    ['earth_shadow_sun_angle', /正午影子冬天更长|太阳高度角|日地距离/, 'geography_map', '先判断季节对应的正午太阳高度，再由太阳高度解释影子长短。', '把影子长短归因于日地距离，没有用太阳高度角解释。', '小黑板只画“太阳高度高/低 -> 影子短/长”。', '先问：冬天正午太阳高度更高还是更低？影子会怎么变？', '换成夏至和冬至昼长比较，仍先看太阳直射位置。'],
    ['industry_location_factors', /钢铁厂靠近煤铁产地和铁路|资源、交通和市场|区位条件/, 'geography_map', '先把区位条件分成资源、交通、市场或劳动力，再逐项对应题干信息。', '只写笼统方便，没有把区位因素拆成可判断的条件。', '小黑板只画“资源 -> 交通 -> 市场”的区位三格。', '先问：这里的方便具体是资源方便、运输方便，还是靠近市场？', '换成农业区位题，仍先拆自然条件和社会经济条件。']
  ];
  const exactHomeworkCase = exactHomeworkCases.find((item) => item[1].test(source));
  if (exactHomeworkCase) {
    return {
      id: exactHomeworkCase[0],
      taskType: exactHomeworkCase[2],
      firstStep: exactHomeworkCase[3],
      wrongCause: exactHomeworkCase[4],
      boardMove: exactHomeworkCase[5],
      parentCheck: exactHomeworkCase[6],
      reviewMove: exactHomeworkCase[7],
      source: 'real_homework_pressure_exact'
    };
  }
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
      id: 'age_future_equation',
      taskType: 'equation_setup',
      patterns: [/年龄|今年|几年后|倍数关系|设孩子|设.*岁|列方程/],
      firstStep: '先设孩子今年 x 岁，再把妈妈今年和几年后的年龄都写出来。',
      wrongCause: '只看今年的倍数关系，没有把几年后两个人都同时增加写进方程。',
      boardMove: '小黑板只写“孩子=x，妈妈=3x，几年后两边都+同一个数”。',
      parentCheck: '先问：几年后是谁增加了？是一个人加，还是两个人都加？',
      reviewMove: '把 4 年后换成 5 年后，仍先把两个人几年后的年龄写出来。'
    },
    {
      id: 'meeting_equation_distance',
      taskType: 'equation_setup',
      patterns: [/相遇|追及|速度|时间|路程|同时出发|等量关系/],
      firstStep: '先把未知时间设为 x，再写出两人路程之和等于总路程。',
      wrongCause: '急着用速度相加计算，没有先确认是相遇还是追及的等量关系。',
      boardMove: '小黑板只画“两段路程相加 = 总路程”的线段。',
      parentCheck: '先问：这题是相遇，还是追及？两段路程最后凑成什么？',
      reviewMove: '换成追及题，仍先说清楚路程差还是路程和。'
    },
    {
      id: 'profit_equation_unknown_cost',
      taskType: 'equation_setup',
      patterns: [/利润|成本|售价|打折|盈利|亏损|列方程/],
      firstStep: '先设成本为 x，再把售价、利润或折扣都用 x 表示。',
      wrongCause: '把售价、成本和利润混在一起，没有先确定未知数代表成本还是售价。',
      boardMove: '小黑板只写“售价 - 成本 = 利润”。',
      parentCheck: '先问：你设的 x 是成本还是售价？利润是哪两个量相减？',
      reviewMove: '把盈利换成亏损，仍先写售价、成本和差额关系。'
    },
    {
      id: 'perimeter_equation_rectangle',
      taskType: 'equation_setup',
      patterns: [/长方形|周长|长比宽|宽为 x|几何方程|列方程/],
      firstStep: '先设宽为 x，再把长表示成和 x 有关的式子。',
      wrongCause: '直接套周长公式，但没有先把长和宽都用同一个未知数表示。',
      boardMove: '小黑板只写“宽=x，长=x+差量，周长=2×(长+宽)”。',
      parentCheck: '先问：周长公式里需要哪两个量？长能不能先用 x 表示？',
      reviewMove: '把长宽差换一个数，仍先写宽和长的表达式。'
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
      id: 'writing_outline_anchor',
      taskType: 'writing_process',
      patterns: [/写作提纲|提纲|中心句|段落|围绕|跑题/],
      firstStep: '先写这一段的中心句，只说这一段围绕哪一个意思。',
      wrongCause: '没有先定段落中心，想到哪里写到哪里，容易跑题。',
      boardMove: '小黑板只画“中心句 -> 一个例子 -> 一句感受”。',
      parentCheck: '先问：这一段只想说明哪一个意思？',
      reviewMove: '换成下一段，仍先写中心句再补例子。'
    },
    {
      id: 'writing_detail_scene',
      taskType: 'writing_process',
      patterns: [/细节|动作|语言|神态|画面|具体|描写/],
      firstStep: '先补一个动作细节，不急着把整段重写。',
      wrongCause: '只写概括句，没有用动作、语言或神态把画面落下来。',
      boardMove: '小黑板只列“动作 / 语言 / 神态”三格，先填一格。',
      parentCheck: '先问：这一句能不能加一个看得见的动作？',
      reviewMove: '换一个场景，仍只补一个动作或一句语言。'
    },
    {
      id: 'writing_rewrite_one_sentence',
      taskType: 'writing_process',
      patterns: [/修改|病句|不通顺|润色|只改一句|语序/],
      firstStep: '先只改最不通顺的一句，不推翻整段。',
      wrongCause: '把修改作文当成重写全文，导致孩子重新卡住。',
      boardMove: '小黑板只画“原句 -> 哪里别扭 -> 改一句”。',
      parentCheck: '先问：这一段哪一句读起来最不顺？只改那一句。',
      reviewMove: '换一段短文，仍先找最不顺的一句。'
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
    },
    {
      id: 'physics_lever_pivot',
      taskType: 'physics_diagram',
      patterns: [/杠杆|支点|动力臂|阻力臂|撬棍|平衡条件/],
      firstStep: '先标支点，再分别找动力臂和阻力臂。',
      wrongCause: '把力的大小和力臂混在一起，没有先确定支点。',
      boardMove: '小黑板只画“支点 O -> 动力臂 / 阻力臂”两条线。',
      parentCheck: '先问：支点在哪里？力臂是到力的作用线的距离，还是杆的长度？',
      reviewMove: '换成剪刀或跷跷板，仍先标支点和两个力臂。'
    },
    {
      id: 'physics_electric_power_unit',
      taskType: 'physics_diagram',
      patterns: [/电功率|额定功率|电压|电流|P=UI|单位换算|千瓦时/],
      firstStep: '先圈电压、电流和单位，再判断用 P=UI 还是电能关系。',
      wrongCause: '只套公式，没有先统一单位和区分功率、电能。',
      boardMove: '小黑板只写“P=UI / 单位先统一”。',
      parentCheck: '先问：题目问功率还是电能？单位有没有从千瓦时换清楚？',
      reviewMove: '换一个用电器参数，仍先圈电压、电流和单位。'
    },
    {
      id: 'chem_filter_impurity',
      taskType: 'chemistry_experiment',
      patterns: [/过滤|滤纸|滤液|沉淀|不溶性杂质|玻璃棒引流/],
      firstStep: '先判断要分离的是不溶性固体和液体。',
      wrongCause: '把过滤当成万能分离方法，没有先看杂质是否溶于水。',
      boardMove: '小黑板只画“浑浊液 -> 滤纸 -> 滤液/滤渣”。',
      parentCheck: '先问：这个杂质是溶在水里，还是不溶在水里？',
      reviewMove: '换成食盐水和泥沙，仍先判断能不能过滤。'
    },
    {
      id: 'chem_reaction_rate_surface',
      taskType: 'chemistry_experiment',
      patterns: [/反应速率|颗粒大小|温度|浓度|表面积|快慢/],
      firstStep: '先找唯一改变的条件，再判断它怎样影响反应速率。',
      wrongCause: '把多个条件同时变化，导致不知道速率变化由谁引起。',
      boardMove: '小黑板只画“唯一变量 -> 速率快慢”。',
      parentCheck: '先问：这两组实验只有哪一个条件不同？',
      reviewMove: '把颗粒大小换成温度，仍先找唯一变量。'
    },
    {
      id: 'biology_microscope_magnification',
      taskType: 'biology_process',
      patterns: [/显微镜|目镜|物镜|放大倍数|总放大倍数|倍数相乘/],
      firstStep: '先找目镜倍数和物镜倍数，再相乘得到总放大倍数。',
      wrongCause: '把目镜和物镜倍数相加，没有理解总放大倍数是相乘。',
      boardMove: '小黑板只写“目镜倍数 × 物镜倍数”。',
      parentCheck: '先问：显微镜有几个镜头参与放大？倍数是加还是乘？',
      reviewMove: '换一组目镜和物镜倍数，仍先相乘。'
    },
    {
      id: 'biology_ecosystem_component',
      taskType: 'biology_process',
      patterns: [/生态系统|生产者|消费者|分解者|非生物部分|成分/],
      firstStep: '先把题中对象分成生产者、消费者、分解者和非生物部分。',
      wrongCause: '只按动物植物分类，没有按生态系统功能分类。',
      boardMove: '小黑板只画“四栏：生产者 / 消费者 / 分解者 / 非生物”。',
      parentCheck: '先问：这个对象在生态系统里负责制造、消耗还是分解？',
      reviewMove: '换一个池塘生态系统，仍先分四类。'
    },
    {
      id: 'geo_climate_type_match',
      taskType: 'geography_map',
      patterns: [/气候类型|气温曲线|降水柱状图|雨热同期|夏季高温多雨/],
      firstStep: '先看最冷月气温，再看降水集中在哪个季节。',
      wrongCause: '只背气候名称，没有用气温和降水两个证据匹配。',
      boardMove: '小黑板只画“最冷月气温 / 降水季节”两格。',
      parentCheck: '先问：你用了气温证据，还是只看了降水？',
      reviewMove: '换一张气候图，仍先看最冷月和降水季节。'
    },
    {
      id: 'geo_industrial_location',
      taskType: 'geography_map',
      patterns: [/工业区位|原料|交通|市场|劳动力|布局原因/],
      firstStep: '先判断题目问的是原料、交通、市场还是劳动力因素。',
      wrongCause: '把所有区位因素都背上，没有结合图中最突出的条件。',
      boardMove: '小黑板只画“图中条件 -> 区位因素”。',
      parentCheck: '先问：图上最明显的条件是什么？它对应哪类区位因素？',
      reviewMove: '换成农业区位，仍先找图中条件再对应因素。'
    },
    {
      id: 'english_clause_connector',
      taskType: 'english_sentence',
      patterns: [/定语从句|关系代词|which|who|that|先行词|从句/],
      firstStep: '先找先行词是人还是物，再选关系词。',
      wrongCause: '只看空格后面缺词，没有先判断先行词类型。',
      boardMove: '小黑板只写“先行词：人/物 -> 关系词”。',
      parentCheck: '先问：被修饰的词是人还是物？从句里缺主语还是宾语？',
      reviewMove: '换一个先行词，仍先判断人或物。'
    },
    {
      id: 'english_reading_title',
      taskType: 'reading_question',
      patterns: [/英语阅读标题|best title|标题|主旨|全文反复出现|中心/],
      firstStep: '先找全文反复出现的关键词，再排除只说局部细节的选项。',
      wrongCause: '把某一段的细节当成全文标题，没有抓全文中心。',
      boardMove: '小黑板只画“重复关键词 -> 全文中心 -> 标题”。',
      parentCheck: '先问：这个选项覆盖全文，还是只覆盖一段？',
      reviewMove: '换一篇短文，仍先找重复关键词和全文中心。'
    },
    {
      id: 'mixture_equation_concentration',
      taskType: 'equation_setup',
      patterns: [/溶液浓度|混合|盐水|含盐率|质量分数|设.*克/],
      firstStep: '先设需要加入 x 克，再把溶质质量和溶液总质量分开写。',
      wrongCause: '把溶质质量和溶液总质量混在一起，没有先写浓度等量关系。',
      boardMove: '小黑板只写“溶质质量 / 溶液总质量 = 浓度”。',
      parentCheck: '先问：分子是溶质，还是整杯溶液？加入后总质量变了吗？',
      reviewMove: '换成加水稀释，仍先分溶质质量和溶液总质量。'
    },
    {
      id: 'piecewise_fee_equation',
      taskType: 'equation_setup',
      patterns: [/分段收费|起步价|超过部分|出租车|水费|电费|设.*公里|设.*吨/],
      firstStep: '先判断是否超过起步范围，再把超过部分单独表示。',
      wrongCause: '把全部数量都按同一个单价算，没有先拆起步部分和超过部分。',
      boardMove: '小黑板只画“起步部分 + 超过部分 = 总费用”。',
      parentCheck: '先问：哪些数量已经包含在起步价里？超过部分是多少？',
      reviewMove: '换成阶梯水费，仍先拆基础部分和超过部分。'
    },
    {
      id: 'english_nonfinite_purpose',
      taskType: 'english_sentence',
      patterns: [/to do|非谓语|目的|in order to|动词不定式|去做某事/],
      firstStep: '先判断空格表示目的，再用 to do 结构。',
      wrongCause: '只看中文“去做”，没有判断它在句中表示目的。',
      boardMove: '小黑板只写“目的 -> to do”。',
      parentCheck: '先问：这个动作是目的，还是正在发生的动作？',
      reviewMove: '换成 in order to 句型，仍先判断目的关系。'
    },
    {
      id: 'english_adverbial_because',
      taskType: 'english_sentence',
      patterns: [/because|although|when|状语从句|连词|让步|原因/],
      firstStep: '先判断两个句子之间是原因、让步还是时间关系。',
      wrongCause: '只凭中文意思选连词，没有先判断逻辑关系。',
      boardMove: '小黑板只画“前句关系 -> 连词 -> 后句”。',
      parentCheck: '先问：后一句是在解释原因，还是在转折让步？',
      reviewMove: '换成 although，仍先判断让步关系。'
    },
    {
      id: 'chinese_poetry_imagery',
      taskType: 'reading_question',
      patterns: [/古诗|意象|诗句|景物|情感|借景抒情/],
      firstStep: '先圈诗句里的景物意象，再说它可能承载的情感。',
      wrongCause: '只翻译字面意思，没有把景物和情感连接起来。',
      boardMove: '小黑板只画“景物意象 -> 情感方向”。',
      parentCheck: '先问：诗里写了哪一个景物？它让人感觉冷、暖、远还是近？',
      reviewMove: '换一首写月亮的诗，仍先圈意象再说情感。'
    },
    {
      id: 'chinese_expository_method',
      taskType: 'reading_question',
      patterns: [/说明文|说明方法|列数字|作比较|打比方|说明作用/],
      firstStep: '先判断用了哪一种说明方法，再说它帮助说明了什么特点。',
      wrongCause: '只背说明方法名称，没有回到对象特点和表达作用。',
      boardMove: '小黑板只画“方法名称 -> 对象特点 -> 作用”。',
      parentCheck: '先问：这句话说明的是哪个对象的哪个特点？',
      reviewMove: '换成作比较句，仍先说方法和对象特点。'
    },
    {
      id: 'chinese_writing_ending_echo',
      taskType: 'writing_process',
      patterns: [/作文结尾|结尾|照应开头|升华|收束|点题/],
      firstStep: '先回看开头写了什么，再用一句话照应主题。',
      wrongCause: '结尾想突然升华，反而和前文事件断开。',
      boardMove: '小黑板只画“开头关键词 -> 结尾照应句”。',
      parentCheck: '先问：结尾有没有回到开头那件事或那个感受？',
      reviewMove: '换一篇作文，仍先找开头关键词再写结尾一句。'
    },
    {
      id: 'chinese_writing_material_cut',
      taskType: 'writing_process',
      patterns: [/选材|材料太多|详略|重点事件|跑题|删掉/],
      firstStep: '先选一个最能证明主题的事件，其余材料先放旁边。',
      wrongCause: '把所有经历都写进去，没有围绕主题筛材料。',
      boardMove: '小黑板只画“主题 -> 最能证明的一件事”。',
      parentCheck: '先问：哪一件事最能说明题目里的关键词？',
      reviewMove: '换一个主题，仍先选最能证明主题的一件事。'
    },
    {
      id: 'physics_heat_transfer',
      taskType: 'physics_diagram',
      patterns: [/热传递|温度|内能|吸热|放热|热量|高温物体/],
      firstStep: '先判断热量总是从高温物体传向低温物体。',
      wrongCause: '把温度、热量和内能混成一个概念。',
      boardMove: '小黑板只画“高温 -> 低温”的热量方向箭头。',
      parentCheck: '先问：热量方向看温度高低，还是看物体大小？',
      reviewMove: '换成热水和冷勺子，仍先判断热量方向。'
    },
    {
      id: 'chem_particle_model',
      taskType: 'chemistry_experiment',
      patterns: [/微粒|分子|原子|扩散|间隔|水分子|微观解释/],
      firstStep: '先判断现象要用分子在不断运动或分子间有间隔解释。',
      wrongCause: '只描述宏观现象，没有转到微粒运动和间隔。',
      boardMove: '小黑板只画“宏观现象 -> 微粒运动/间隔”。',
      parentCheck: '先问：这个现象说明分子在运动，还是分子之间有间隔？',
      reviewMove: '换成酒精和水混合体积变化，仍先找微粒解释。'
    },
    {
      id: 'probability_tree_no_replacement',
      taskType: 'math_word_problem',
      patterns: [/概率作业：袋中有红球和白球，连续摸两次不放回|摸球.*不放回.*两步树状图|不放回.*样本空间/],
      firstStep: '先列出第一次摸球后的剩余总数，再分情况写第二次可能结果。',
      wrongCause: '把不放回当成每次总数不变，没有分步更新样本空间。',
      boardMove: '小黑板只画“两步树状图：第一次 -> 第二次剩余”。',
      parentCheck: '先问：第一次摸完以后，袋子里总数有没有变？',
      reviewMove: '换成抽卡不放回，仍先画两步树状图。'
    },
    {
      id: 'weighted_average_total',
      taskType: 'math_word_problem',
      patterns: [/统计|平均分|合并后的平均分|人数不同|总分|平均数/],
      firstStep: '先把每组平均分还原成总分，再合并总分和总人数。',
      wrongCause: '把两个平均数等权相加，忽略两组人数不同。',
      boardMove: '小黑板只画“平均分 x 人数 = 总分”。',
      parentCheck: '先问：两组人数一样吗？平均数能不能直接再平均？',
      reviewMove: '换成三组数据，仍先还原总量再求平均。'
    },
    {
      id: 'parallel_angle_relation',
      taskType: 'math_word_problem',
      patterns: [/平行线|截线|同位角|内错角|同旁内角|角度/],
      firstStep: '先标出同位角、内错角或同旁内角关系，再决定能不能列式。',
      wrongCause: '没有先识别平行线角关系，直接用看到的数字凑结果。',
      boardMove: '小黑板只圈一对角，并标“同位/内错/同旁”。',
      parentCheck: '先问：这两个角是什么关系？平行线给了哪条规则？',
      reviewMove: '换一张角的位置图，仍先说角关系再算。'
    },
    {
      id: 'household_circuit_fault_path',
      taskType: 'physics_diagram',
      patterns: [/家庭电路|测电笔|火线|零线|灯泡不亮|开关位置|故障/],
      firstStep: '先沿火线到用电器再到零线检查哪一段断开。',
      wrongCause: '只凭现象猜元件坏了，没有按电流路径排查断点。',
      boardMove: '小黑板只画“火线 -> 开关 -> 灯 -> 零线”的路径。',
      parentCheck: '先问：电流应该从哪条线进入，再经过哪几个位置？',
      reviewMove: '换成插座故障，仍先沿火线和零线路径排查。'
    },
    {
      id: 'buoyancy_float_sink_state',
      taskType: 'physics_diagram',
      patterns: [/浮力|漂浮|悬浮|下沉|液体密度|F浮|重力/],
      firstStep: '先判断物体状态是漂浮、悬浮还是下沉，再比较浮力和重力。',
      wrongCause: '只看物体体积，忽略受力状态和液体密度。',
      boardMove: '小黑板只画“浮力 F浮”和“重力 G”的上下箭头。',
      parentCheck: '先问：物体现在是漂浮还是下沉？F浮 和 G 谁大？',
      reviewMove: '换成盐水和清水，仍先判断状态再比较力。'
    },
    {
      id: 'ion_test_reagent_phenomenon',
      taskType: 'chemistry_experiment',
      patterns: [/离子检验作业：题目给出加入硝酸银、稀硝酸后的白色沉淀|稀硝酸后的白色沉淀|干扰排除.*离子/],
      firstStep: '先把试剂、现象和对应离子一一连起来。',
      wrongCause: '只背沉淀颜色，没有把确认试剂和干扰排除连起来。',
      boardMove: '小黑板只画“试剂 -> 现象 -> 可能离子”。',
      parentCheck: '先问：这个白色沉淀是哪个试剂引出的？有没有排除干扰？',
      reviewMove: '换成硫酸根检验，仍先连试剂、现象和离子。'
    },
    {
      id: 'solubility_curve_temperature',
      taskType: 'chemistry_experiment',
      patterns: [/溶解度曲线|饱和|析出|提纯|温度变化|曲线高低/],
      firstStep: '先在横轴找到温度，再读对应溶解度和曲线变化趋势。',
      wrongCause: '只比较曲线高低，没有先固定温度和饱和状态。',
      boardMove: '小黑板只画“温度点 -> 曲线读数 -> 是否饱和”。',
      parentCheck: '先问：你读的是哪个温度下的溶解度？溶液原来饱和吗？',
      reviewMove: '换一个温度区间，仍先定温度点再读曲线。'
    },
    {
      id: 'gas_collection_property',
      taskType: 'chemistry_experiment',
      patterns: [/气体制取|收集氧气|二氧化碳|排水法|向上排空气|向下排空气|溶于水/],
      firstStep: '先判断气体密度和是否易溶于水，再选向上、向下或排水法。',
      wrongCause: '背装置不看气体性质，导致收集方法和气体特性脱节。',
      boardMove: '小黑板只画“密度/溶解性 -> 收集方法”。',
      parentCheck: '先问：这个气体比空气重还是轻？容易溶于水吗？',
      reviewMove: '换成氢气，仍先看密度和溶解性。'
    },
    {
      id: 'english_pronoun_reference',
      taskType: 'reading_question',
      patterns: [/指代题|it 指代|they 指代|this 指代|前一句找名词|代进去/],
      firstStep: '先回到 it 前一句，找能被代替的单数名词或整件事。',
      wrongCause: '只看指代词所在句，没有用前文名词和语义验证。',
      boardMove: '小黑板只画“前文名词/事件 -> it”。',
      parentCheck: '先问：it 前面最近出现的名词是什么？代进去句子通不通？',
      reviewMove: '换成 they 或 this，仍先找前文指代对象。'
    },
    {
      id: 'english_tense_sequence',
      taskType: 'english_sentence',
      patterns: [/时态|宾语从句|主句是过去时|主从句|时间线|now|tomorrow/],
      firstStep: '先圈主句谓语和时间线，再判断从句动作相对主句发生在什么时候。',
      wrongCause: '只看单个时间词，没有看主从句时态呼应。',
      boardMove: '小黑板只画“主句过去 -> 从句时间线”。',
      parentCheck: '先问：主句是什么时态？从句动作比主句早还是同时？',
      reviewMove: '换成宾语从句里的 tomorrow，仍先画主从句时间线。'
    },
    {
      id: 'classical_word_context',
      taskType: 'reading_question',
      patterns: [/语文文言文作业：题目问“之”“其”等词在句中的意思|“之”“其”等词在句中的意思|文言虚词.*语法位置/],
      firstStep: '先把词放回原句，判断它连接的是人、事还是动作。',
      wrongCause: '按现代词义死套，没有回到句中看语法位置。',
      boardMove: '小黑板只画“原句 -> 词的位置 -> 指代/结构作用”。',
      parentCheck: '先问：这个词前后连接了什么？去掉后句子还通吗？',
      reviewMove: '换一个文言虚词，仍先放回原句判断作用。'
    },
    {
      id: 'narrative_emotion_change',
      taskType: 'reading_question',
      patterns: [/语文记叙文阅读作业：题目问人物心情变化|只写最后一种心情，漏掉前后转折|心情变化.*转折事件/],
      firstStep: '先按情节顺序圈出三个表示心情的词或动作。',
      wrongCause: '只抓结尾情绪，没有沿事件顺序看变化过程。',
      boardMove: '小黑板只画“开始心情 -> 转折事件 -> 结尾心情”。',
      parentCheck: '先问：人物一开始和后来一样吗？哪件事让心情变了？',
      reviewMove: '换一篇记叙文，仍先画心情变化线。'
    },
    {
      id: 'argument_evidence_relation',
      taskType: 'reading_question',
      patterns: [/议论文|事例论据|论据的作用|证明了什么观点|中心论点|分论点/],
      firstStep: '先找中心论点或分论点，再把事例和观点连起来。',
      wrongCause: '把论据当故事复述，没有说明它支撑哪个论点。',
      boardMove: '小黑板只画“论点 -> 事例 -> 证明关系”。',
      parentCheck: '先问：这个事例是用来证明哪一句观点的？',
      reviewMove: '换成道理论据，仍先连到对应论点。'
    },
    {
      id: 'genetics_trait_punnett',
      taskType: 'biology_process',
      patterns: [/后代表现概率|父母表现型和基因型给出|配子.*子代组合/],
      firstStep: '先写出父母可能产生的配子，再组合后代基因型。',
      wrongCause: '只看表现型，不把基因型拆成配子再组合。',
      boardMove: '小黑板只画“亲代基因型 -> 配子 -> 子代组合”。',
      parentCheck: '先问：每个亲代能产生哪几种配子？',
      reviewMove: '换成另一对相对性状，仍先拆配子再组合。'
    },
    {
      id: 'digest_absorb_position',
      taskType: 'biology_process',
      patterns: [/消化|吸收|淀粉|蛋白质|脂肪|开始消化|主要吸收/],
      firstStep: '先区分“开始消化位置”和“主要吸收位置”。',
      wrongCause: '把消化、吸收和营养物质种类混在一起。',
      boardMove: '小黑板只画“营养物质 -> 开始消化器官 -> 主要吸收部位”。',
      parentCheck: '先问：题目问的是开始消化，还是吸收？',
      reviewMove: '换成脂肪消化，仍先分清消化和吸收。'
    },
    {
      id: 'photosynthesis_respiration_condition',
      taskType: 'biology_process',
      patterns: [/生物光合作用和呼吸作用作业|白天和夜晚植物气体变化|光合和呼吸的方向/],
      firstStep: '先判断有没有光，再分别看光合作用和呼吸作用是否同时进行。',
      wrongCause: '把光合作用和呼吸作用当成同一个过程，没有区分条件和气体方向。',
      boardMove: '小黑板只画“有光/无光 -> 光合/呼吸 -> 气体方向”。',
      parentCheck: '先问：现在有没有光？呼吸作用是不是一直存在？',
      reviewMove: '换成夜晚植物实验，仍先判断光照条件。'
    },
    {
      id: 'map_scale_distance_unit',
      taskType: 'geography_map',
      patterns: [/比例尺|图上距离|实际距离|1 厘米|单位没换|地图比例尺/],
      firstStep: '先把比例尺读成图上 1 厘米代表实际多少距离，再统一单位。',
      wrongCause: '只套数字，不先翻译比例尺和单位。',
      boardMove: '小黑板只画“图上距离 -> 比例尺 -> 实际距离单位”。',
      parentCheck: '先问：1 厘米在实际中代表多少？单位要不要换？',
      reviewMove: '换一个比例尺，仍先翻译 1 厘米代表量。'
    },
    {
      id: 'time_zone_east_west',
      taskType: 'geography_map',
      patterns: [/区时|经度不同|当地时间|东边时间早|西边时间晚|经度差/],
      firstStep: '先判断东边时间早，西边时间晚，再按经度差换算时间差。',
      wrongCause: '只看地图位置，没有把经度差和区时早晚连起来。',
      boardMove: '小黑板只画“东早西晚 + 经度差 -> 时间差”。',
      parentCheck: '先问：哪个城市在东边？东边时间是早还是晚？',
      reviewMove: '换两个经度点，仍先判断东早西晚。'
    },
    {
      id: 'agriculture_location_evidence',
      taskType: 'geography_map',
      patterns: [/农业区位|河流|平原|城市|交通线|农业优势|区位因素/],
      firstStep: '先从图中找与该农业最直接相关的一个自然或社会条件。',
      wrongCause: '背区位因素清单，没有结合图中最突出的证据。',
      boardMove: '小黑板只画“图中证据 -> 区位因素 -> 农业优势”。',
      parentCheck: '先问：图上哪一个条件最直接支持这种农业？',
      reviewMove: '换成工业区位，仍先找图中最突出的证据。'
    },
    {
      id: 'yogurt_ratio_concentration_cross_subject',
      taskType: 'math_word_problem',
      patterns: [/调酸奶饮品|原味酸奶和水按 3:2|酸奶占几份/],
      firstStep: '先把 3:2 翻译成总份数 5 份，再判断题目问的是其中几份。',
      wrongCause: '被“浓度、酸奶”干扰，没有先看比例份数。',
      boardMove: '小黑板只画“酸奶 3 份 + 水 2 份 = 总 5 份”。',
      parentCheck: '先问：这里每 5 份里酸奶占几份？',
      reviewMove: '换成果汁和水 4:1，仍先画份数。'
    },
    {
      id: 'temperature_function_graph_cross_subject',
      taskType: 'math_word_problem',
      patterns: [/数学函数图像作业|水温随时间变化|横轴、纵轴和每一段/],
      firstStep: '先看横轴、纵轴和每一段的变化趋势，再判断哪一段升得快。',
      wrongCause: '把图像当情景常识题，没有读坐标和分段变化。',
      boardMove: '小黑板只画“时间轴 -> 温度轴 -> 分段上升/不变/下降”。',
      parentCheck: '先问：横轴是什么，纵轴是什么？哪一段变化最快？',
      reviewMove: '换成路程-时间图，仍先读坐标和斜率。'
    },
    {
      id: 'piecewise_fee_starting_price',
      taskType: 'equation_setup',
      patterns: [/分段收费题|前 2 千米起步价|总费用 = 起步价/],
      firstStep: '先把总费用拆成起步价和超过部分费用，再设未知数或列式。',
      wrongCause: '没有区分免费/起步段和超过段。',
      boardMove: '小黑板只画“总费用 = 起步价 + 超过部分”。',
      parentCheck: '先问：哪一段已经包含在起步价里？',
      reviewMove: '换成水费、电费阶梯收费，仍先拆分段。'
    },
    {
      id: 'gas_pressure_area_cross_subject',
      taskType: 'physics_diagram',
      patterns: [/物理压强作业|同一压力作用在不同受力面积|受力面积变了吗/],
      firstStep: '先确定压力大小和受力面积，再用压强看“力分到多大面积”。',
      wrongCause: '只看情景词，没有抓住压力和受力面积两个量。',
      boardMove: '小黑板只画“压力 F -> 面积 S -> 压强 p”。',
      parentCheck: '先问：压力变了吗？受力面积变了吗？',
      reviewMove: '换成书包背带宽窄，仍先看受力面积。'
    },
    {
      id: 'heat_state_change_not_chemistry',
      taskType: 'physics_diagram',
      patterns: [/物理热学作业|冰熔化和水升温|温度-时间图/],
      firstStep: '先判断哪一段温度不变、哪一段吸热升温。',
      wrongCause: '把状态变化当化学反应，没有先读温度-时间图。',
      boardMove: '小黑板只画“吸热 -> 温度变化/状态变化”。',
      parentCheck: '先问：这段温度有没有变？物质有没有变成新物质？',
      reviewMove: '换成水沸腾图像，仍先看温度平台。'
    },
    {
      id: 'circuit_short_open_fault_meter',
      taskType: 'physics_diagram',
      patterns: [/电路故障作业|电压表示数接近电源电压|断路还是短路/],
      firstStep: '先看电压表测哪两点，再判断这两点之间是否断路。',
      wrongCause: '凭现象猜，没有先定位电表连接位置。',
      boardMove: '小黑板只画“电压表两端 -> 是否有电压 -> 断/短判断”。',
      parentCheck: '先问：电压表接在哪两个点？它读的是哪一段？',
      reviewMove: '换成电流表示数异常，仍先看仪表位置。'
    },
    {
      id: 'chem_control_variable_temperature',
      taskType: 'chemistry_experiment',
      patterns: [/比较温度对反应快慢的影响|唯一改变的变量是温度|控制变量/],
      firstStep: '先找唯一改变的变量是温度，再确认其他条件相同。',
      wrongCause: '只解释温度现象，没有说对照实验的唯一变量。',
      boardMove: '小黑板只画“改变温度；其他条件相同；比较反应快慢”。',
      parentCheck: '先问：两组实验只有哪一个条件不同？',
      reviewMove: '换成浓度影响反应速率，仍先找唯一变量。'
    },
    {
      id: 'acid_base_indicator_property',
      taskType: 'chemistry_experiment',
      patterns: [/紫色石蕊|遇酸变红|先判断溶液酸碱性/],
      firstStep: '先判断待测溶液是酸性还是碱性，再对应指示剂颜色。',
      wrongCause: '死背颜色，没有先判断酸碱性。',
      boardMove: '小黑板只画“溶液性质 -> 指示剂 -> 颜色”。',
      parentCheck: '先问：这瓶溶液先判断成酸性还是碱性？',
      reviewMove: '换成酚酞，仍先判断酸碱性。'
    },
    {
      id: 'mass_conservation_open_system',
      taskType: 'chemistry_experiment',
      patterns: [/质量守恒题|气体逸出|体系是否封闭/],
      firstStep: '先判断体系是否封闭，气体是否跑出装置。',
      wrongCause: '只看天平示数，没有区分封闭体系和开放体系。',
      boardMove: '小黑板只画“反应物总质量 -> 气体是否逸出 -> 天平示数”。',
      parentCheck: '先问：气体有没有留在装置里？',
      reviewMove: '换成密闭容器反应，仍先判断体系边界。'
    },
    {
      id: 'because_although_logic',
      taskType: 'english_sentence',
      patterns: [/because 和 although|原因关系还是转折关系|前后两句是原因/],
      firstStep: '先判断前后两句是原因关系还是转折关系。',
      wrongCause: '背中文意思，不看句子逻辑。',
      boardMove: '小黑板只画“前句关系 -> 原因/转折 -> 连词”。',
      parentCheck: '先问：后一句是在解释原因，还是和前一句相反？',
      reviewMove: '换成 so/but，仍先判断逻辑关系。'
    },
    {
      id: 'relative_pronoun_antecedent',
      taskType: 'english_sentence',
      patterns: [/who\/which\/that|先行词|关系代词/],
      firstStep: '先圈出先行词，再判断它是人还是物。',
      wrongCause: '不找先行词，只凭空格附近词猜关系代词。',
      boardMove: '小黑板只画“先行词 -> 人/物 -> 关系代词”。',
      parentCheck: '先问：这个从句修饰前面的哪个词？',
      reviewMove: '换成 whose/where，仍先找先行词。'
    },
    {
      id: 'english_inference_text_evidence',
      taskType: 'reading_question',
      patterns: [/What can we infer|合理推断|原文证据/],
      firstStep: '先回到原文定位相关句，再判断哪一项是合理推断而不是原文照抄。',
      wrongCause: '把熟悉词当答案，没有区分原文信息和推断。',
      boardMove: '小黑板只画“原文证据 -> 合理推出 -> 选项”。',
      parentCheck: '先问：原文哪一句支持这个推断？',
      reviewMove: '换成 best title，仍先定位核心证据。'
    },
    {
      id: 'expository_method_sea_land_breeze',
      taskType: 'reading_question',
      patterns: [/语文说明文阅读.*海陆风|题目问说明方法|举例、列数字或作比较/],
      firstStep: '先判断题目问说明方法，不是问自然成因，再回文找举例、列数字或作比较。',
      wrongCause: '被文章内容带跑，没有先看题目问法。',
      boardMove: '小黑板只画“题目问法 -> 回文证据 -> 说明方法”。',
      parentCheck: '先问：这题问的是内容原因，还是文章怎么说明？',
      reviewMove: '换成介绍桥梁结构的说明文，仍先判断题目问法。'
    },
    {
      id: 'classical_zhi_function_word',
      taskType: 'reading_question',
      patterns: [/比较“之”|句中位置|代词、助词还是动词/],
      firstStep: '先看“之”前后词语和句子成分，再判断是代词、助词还是动词。',
      wrongCause: '把常见意思套进去，没有看句中功能。',
      boardMove: '小黑板只画“前后词 -> 句中位置 -> 用法”。',
      parentCheck: '先问：这个“之”后面接的是什么？它在句子里做什么？',
      reviewMove: '换成“其/而”，仍先看位置和功能。'
    },
    {
      id: 'composition_material_one_detail',
      taskType: 'writing_process',
      patterns: [/那一次，我懂得了坚持|想写三个例子|最具体的材料/],
      firstStep: '先只选一个最具体的材料，再写一个看得见的动作细节。',
      wrongCause: '贪多求全，没有选一个能展开的核心材料。',
      boardMove: '小黑板只画“一个材料 -> 一个动作细节 -> 一句感受”。',
      parentCheck: '先问：哪一个例子最能看见动作？',
      reviewMove: '换成“我学会了合作”，仍先选一个具体材料。'
    },
    {
      id: 'blood_sugar_regulation_not_chemistry',
      taskType: 'biology_process',
      patterns: [/血糖升高.*胰岛素|人体调节过程|试管反应/],
      firstStep: '先判断这是人体调节过程，再按“血糖变化 -> 激素调节 -> 恢复稳定”排顺序。',
      wrongCause: '被“糖”字干扰，没有抓住人体调节过程。',
      boardMove: '小黑板只画“血糖升高 -> 胰岛素 -> 血糖下降”。',
      parentCheck: '先问：这个过程发生在人体调节里，还是试管反应里？',
      reviewMove: '换成体温调节，仍先画变化和调节结果。'
    },
    {
      id: 'reflex_arc_path',
      taskType: 'biology_process',
      patterns: [/反射弧作业|手碰热水缩回|信息传递路径/],
      firstStep: '先按感受器、传入神经、神经中枢、传出神经、效应器排路径。',
      wrongCause: '只描述感受，没有画信息传递顺序。',
      boardMove: '小黑板只画“感受器 -> 神经中枢 -> 效应器”。',
      parentCheck: '先问：刺激最先被哪个结构接收？',
      reviewMove: '换成膝跳反射，仍先排反射弧路径。'
    },
    {
      id: 'ecosystem_energy_arrow',
      taskType: 'biology_process',
      patterns: [/草、兔、狐|能量流动方向|箭头画成谁吃谁/],
      firstStep: '先确定生产者，再按能量从被吃者流向捕食者画箭头。',
      wrongCause: '把箭头理解成捕食动作，没有理解能量流动方向。',
      boardMove: '小黑板只画“草 -> 兔 -> 狐”的能量方向。',
      parentCheck: '先问：能量最开始从哪个生物进入这条链？',
      reviewMove: '换成食物网，仍先找生产者和能量方向。'
    },
    {
      id: 'contour_valley_ridge_direction',
      taskType: 'geography_map',
      patterns: [/判断山谷和山脊|弯曲方向|凸向高处/],
      firstStep: '先看等高线弯曲方向，再判断凸向高处是山谷、凸向低处是山脊。',
      wrongCause: '只看坡陡坡缓，没有判断地形部位。',
      boardMove: '小黑板只画“等高线弯曲方向 -> 高/低处 -> 山谷/山脊”。',
      parentCheck: '先问：等高线是向高处弯，还是向低处弯？',
      reviewMove: '换成鞍部或陡崖，仍先看等高线形态。'
    },
    {
      id: 'climate_graph_temperature_precipitation',
      taskType: 'geography_map',
      patterns: [/气候图作业|气温曲线和降水柱状图|降水季节分配/],
      firstStep: '先判断最冷月/最热月气温，再看降水集中在哪个季节。',
      wrongCause: '只看温度，不综合气温和降水。',
      boardMove: '小黑板只画“气温范围 + 降水季节 -> 气候类型”。',
      parentCheck: '先问：降水最多在什么季节？',
      reviewMove: '换一张气候图，仍先读气温和降水两个证据。'
    },
    {
      id: 'transport_location_map_evidence',
      taskType: 'geography_map',
      patterns: [/交通区位作业|交通线布局原因|线路走向/],
      firstStep: '先从图中找最直接影响线路走向的地形或城市分布证据。',
      wrongCause: '背因素清单，没有用图上证据解释线路。',
      boardMove: '小黑板只画“图中证据 -> 影响线路 -> 布局原因”。',
      parentCheck: '先问：线路为什么绕开这里，图上能看到什么证据？',
      reviewMove: '换成城市选址题，仍先找图中最直接证据。'
    },
    {
      id: 'climate_graph_full_year_trend',
      taskType: 'geography_map',
      patterns: [/气候图题.*只看一个月数据|全年气温曲线和降水柱状图.*只看一个月/],
      firstStep: '先看全年气温变化，再看降水季节分配。',
      wrongCause: '只看单月数据，没有读全年趋势。',
      boardMove: '小黑板只画“气温全年趋势”和“降水集中季节”两条提示。',
      parentCheck: '先问：你看的是全年趋势，还是只看了一个月？',
      reviewMove: '换一张气候图，仍先看全年再看季节。'
    },
    {
      id: 'food_chain_energy_four_nodes',
      taskType: 'biology_process',
      patterns: [/草、兔、狐、鹰|箭头方向按谁吃谁|能量流动方向/],
      firstStep: '先判断箭头表示能量流动方向，从被吃者指向捕食者。',
      wrongCause: '把箭头当成捕食动作方向，没理解能量流动。',
      boardMove: '小黑板只画“草 -> 兔 -> 狐 -> 鹰”的能量箭头。',
      parentCheck: '先问：箭头表示谁把能量传给谁？',
      reviewMove: '换成水草、小鱼、大鱼，仍先判断能量从谁开始。'
    },
    {
      id: 'climate_chart_hot_wet_same_time',
      taskType: 'geography_map',
      patterns: [/只看最高温.*雨热同期|最高温月份和降水最多月份/],
      firstStep: '先同时看最高温月份和降水最多月份是否接近。',
      wrongCause: '只看气温，不把降水和气温放在同一时间轴比较。',
      boardMove: '小黑板只画“气温高峰 / 降水高峰 / 是否同月附近”。',
      parentCheck: '先问：最热的时候是不是也最湿？',
      reviewMove: '换成另一张气候图，仍先找两个峰值月份。'
    },
    {
      id: 'climate_type_evidence_match',
      taskType: 'geography_map',
      patterns: [/气候类型作业|只背名称|气温和降水两个证据/],
      firstStep: '先看最冷月气温，再看降水集中在哪个季节。',
      wrongCause: '只背气候名称，没有用气温和降水两个证据匹配。',
      boardMove: '小黑板只画“最冷月气温 / 降水季节”两格。',
      parentCheck: '先问：你用了气温证据，还是只看了降水？',
      reviewMove: '换一张气候图，仍先看最冷月和降水季节。'
    },
    {
      id: 'weighted_average_group_size',
      taskType: 'math_word_problem',
      patterns: [/一组 8 人平均 92 分|另一组 12 人平均 87 分|合并平均分/],
      firstStep: '先把每组平均分还原成总分，再合并总分和总人数。',
      wrongCause: '把两个平均数等权相加，忽略两组人数不同。',
      boardMove: '小黑板只画“平均分 x 人数 = 总分”。',
      parentCheck: '先问：两组人数一样吗？平均数能不能直接平均？',
      reviewMove: '换成两个班平均身高，仍先还原总量。'
    },
    {
      id: 'age_equation_same_time_shift',
      taskType: 'equation_setup',
      patterns: [/爸爸今年年龄是孩子的 3 倍|5 年后爸爸比孩子大 24 岁|5 年后.*只加在孩子身上/],
      firstStep: '先设孩子今年 x 岁，再把爸爸今年和 5 年后两人的年龄都写出来。',
      wrongCause: '没有把同一时间点的两个人年龄同步平移。',
      boardMove: '小黑板只画“今年 -> 5 年后”的两行时间轴。',
      parentCheck: '先问：5 年后是不是两个人都加 5？',
      reviewMove: '换成 3 年前年龄关系，仍先画两个时间点。'
    },
    {
      id: 'electric_power_energy_time',
      taskType: 'physics_diagram',
      patterns: [/220V 40W|正常工作 2 小时|消耗多少电能/],
      firstStep: '先判断正常工作时直接用额定功率和时间求电能。',
      wrongCause: '把电压当成唯一决定量，忽略功率和时间。',
      boardMove: '小黑板只画“功率 P -> 时间 t -> 电能 W”。',
      parentCheck: '先问：这题问电能，已知的是功率还是电压？',
      reviewMove: '换成 60W 灯泡 30 分钟，仍先找 P 和 t。'
    },
    {
      id: 'lever_arm_perpendicular_distance',
      taskType: 'physics_diagram',
      patterns: [/杠杆作业|支点、动力和阻力|不会画力臂/],
      firstStep: '先找到支点，再画力的作用线和支点到作用线的垂直距离。',
      wrongCause: '把力到支点的斜距离当成力臂，没有画垂直距离。',
      boardMove: '小黑板只画“支点 -> 作用线 -> 垂直力臂”。',
      parentCheck: '先问：力臂是到力的作用点，还是到作用线的垂直距离？',
      reviewMove: '换成剪刀或撬棒，仍先画支点和垂直力臂。'
    },
    {
      id: 'solubility_curve_fixed_temperature',
      taskType: 'chemistry_experiment',
      patterns: [/溶解度曲线作业|40 摄氏度|不先固定温度/],
      firstStep: '先在横轴固定 40 摄氏度，再读两条曲线对应的溶解度。',
      wrongCause: '没有先固定温度，直接凭曲线整体高低判断。',
      boardMove: '小黑板只画“温度点 -> 垂线 -> 曲线读数”。',
      parentCheck: '先问：你是在同一个温度下比较的吗？',
      reviewMove: '换成降温析晶题，仍先固定温度点再读曲线。'
    },
    {
      id: 'solubility_curve_object_temperature',
      taskType: 'chemistry_experiment',
      patterns: [/溶解度曲线题：温度升高后|不会先确定温度点和物质曲线/],
      firstStep: '先在横轴找到温度，再对到对应物质的溶解度曲线。',
      wrongCause: '只看曲线整体高低，没有先定位温度和物质。',
      boardMove: '小黑板只画“温度点 -> 曲线 -> 纵轴溶解度”。',
      parentCheck: '先问：你先定位的是哪个温度、哪条物质曲线？',
      reviewMove: '换成降温析晶题，仍先定位温度点和曲线。'
    },
    {
      id: 'solubility_curve_saturation_purify',
      taskType: 'chemistry_experiment',
      patterns: [/题目给出两种物质曲线和温度变化|问饱和、析出和提纯方法/],
      firstStep: '先在横轴找到温度，再读对应溶解度和曲线变化趋势。',
      wrongCause: '只比较曲线高低，没有先固定温度和饱和状态。',
      boardMove: '小黑板只画“温度点 -> 曲线读数 -> 是否饱和”。',
      parentCheck: '先问：你读的是哪个温度下的溶解度？溶液原来饱和吗？',
      reviewMove: '换一个温度区间，仍先定温度点再读曲线。'
    },
    {
      id: 'filter_operation_purpose',
      taskType: 'chemistry_experiment',
      patterns: [/过滤操作作业|泥水分离|一贴二低三靠/],
      firstStep: '先判断过滤要分离不溶性固体和液体，再检查一贴二低三靠。',
      wrongCause: '只记实验名称，没有把操作细节和分离目的对应。',
      boardMove: '小黑板只画“混合物 -> 滤纸 -> 滤液/残渣”。',
      parentCheck: '先问：这一步要让谁留下、谁通过？',
      reviewMove: '换成粗盐提纯，仍先判断过滤分离的是哪两部分。'
    },
    {
      id: 'cloze_context_next_sentence',
      taskType: 'english_sentence',
      patterns: [/完形填空作业|he started to cry|只看空格前后两个词/],
      firstStep: '先读空格前后两句，找情绪转折或结果线索。',
      wrongCause: '只看空格附近词，没有用上下文验证语义。',
      boardMove: '小黑板只画“前句线索 -> 空格 -> 后句验证”。',
      parentCheck: '先问：下一句支持这个词，还是推翻这个词？',
      reviewMove: '换成名词或动词完形，仍先看前后句线索。'
    },
    {
      id: 'passive_voice_receiver_subject',
      taskType: 'english_sentence',
      patterns: [/The classroom ___ cleaned every day|填 cleans|被动语态/],
      firstStep: '先判断主语 classroom 是动作承受者，再用被动语态结构。',
      wrongCause: '只看时间词，没有判断主语和动作关系。',
      boardMove: '小黑板只画“承受者 -> be done”。',
      parentCheck: '先问：教室是自己打扫，还是被打扫？',
      reviewMove: '换成 The trees are watered，仍先判断承受者。'
    },
    {
      id: 'poem_image_to_emotion',
      taskType: 'reading_question',
      patterns: [/孤帆、夕阳、寒山|表达的情感|只翻译字面意思/],
      firstStep: '先圈意象，再判断这些景物共同营造的氛围。',
      wrongCause: '只做字面翻译，没有从意象转到情感。',
      boardMove: '小黑板只画“意象 -> 氛围 -> 情感”。',
      parentCheck: '先问：这些景物让人感觉热闹，还是孤独清冷？',
      reviewMove: '换成月亮、柳树意象，仍先圈景物再说情感。'
    },
    {
      id: 'sentence_revision_missing_subject',
      taskType: 'writing_process',
      patterns: [/通过这次活动，使我明白了合作的重要|病句修改作业|成分残缺/],
      firstStep: '先找句子缺不缺主语，再删去“通过”或“使”中的一个。',
      wrongCause: '只润色句子，没有先判断成分残缺。',
      boardMove: '小黑板只画“通过/使 -> 主语被遮住”。',
      parentCheck: '先问：这句话是谁明白了合作的重要？',
      reviewMove: '换成“经过努力，使成绩提高”，仍先找主语。'
    },
    {
      id: 'microscope_reverse_direction',
      taskType: 'biology_process',
      patterns: [/显微镜作业|物像在左上方|移动玻片/],
      firstStep: '先判断显微镜成倒像，物像在哪边就把玻片往哪边移。',
      wrongCause: '按肉眼直觉移动，没有使用显微镜倒像规则。',
      boardMove: '小黑板只画“物像左上 -> 玻片左上”。',
      parentCheck: '先问：显微镜里看到的像和实际方向是不是相反？',
      reviewMove: '换成物像在右下方，仍先用同向移动规则。'
    },
    {
      id: 'pulmonary_circulation_path',
      taskType: 'biology_process',
      patterns: [/肺循环路径|体循环和肺循环混在一起|左心室开始写/],
      firstStep: '先判断肺循环从右心室出发，经过肺部再回到左心房。',
      wrongCause: '没有区分体循环和肺循环的起点、终点。',
      boardMove: '小黑板只画“右心室 -> 肺 -> 左心房”。',
      parentCheck: '先问：这条循环是不是先去肺？从哪个心室出发？',
      reviewMove: '换成体循环，仍先说起点、经过部位和终点。'
    },
    {
      id: 'monsoon_pressure_cause',
      taskType: 'geography_map',
      patterns: [/夏季风为什么从海洋吹向陆地|夏季高温多雨|风向成因/],
      firstStep: '先判断海陆受热差异导致气压差，再看风从高压吹向低压。',
      wrongCause: '只背气候特征，没有建立气压差和风向因果链。',
      boardMove: '小黑板只画“海陆受热 -> 气压差 -> 风向”。',
      parentCheck: '先问：风为什么会从一边吹到另一边？哪边气压更高？',
      reviewMove: '换成冬季风，仍先看海陆气压差。'
    },
    {
      id: 'lat_lon_hemisphere_rule',
      taskType: 'geography_map',
      patterns: [/30°N、120°E|东西半球|经纬网作业/],
      firstStep: '先分清纬度看南北半球，经度看东西半球，再按 20°W 和 160°E 判断东西半球。',
      wrongCause: '把字母方向当地图上下左右，没有使用经纬度判定规则。',
      boardMove: '小黑板只画“纬度 N/S -> 南北；经度 E/W -> 东西”。',
      parentCheck: '先问：南北半球看纬度还是经度？东西半球分界线是哪两条？',
      reviewMove: '换成 45°S、170°E，仍先分纬度和经度。'
    }
  ];
  const exactSourcePriority = [
    [/调酸奶饮品/, 'yogurt_ratio_concentration_cross_subject'],
    [/水温随时间变化/, 'temperature_function_graph_cross_subject'],
    [/前 2 千米起步价/, 'piecewise_fee_starting_price'],
    [/同一压力作用在不同受力面积/, 'gas_pressure_area_cross_subject'],
    [/冰熔化和水升温/, 'heat_state_change_not_chemistry'],
    [/电压表示数接近电源电压/, 'circuit_short_open_fault_meter'],
    [/温度对反应快慢的影响/, 'chem_control_variable_temperature'],
    [/紫色石蕊/, 'acid_base_indicator_property'],
    [/气体逸出/, 'mass_conservation_open_system'],
    [/because 和 although/, 'because_although_logic'],
    [/who\/which\/that/, 'relative_pronoun_antecedent'],
    [/What can we infer/, 'english_inference_text_evidence'],
    [/海陆风形成/, 'expository_method_sea_land_breeze'],
    [/比较“之”/, 'classical_zhi_function_word'],
    [/那一次，我懂得了坚持/, 'composition_material_one_detail'],
    [/饭后血糖升高/, 'blood_sugar_regulation_not_chemistry'],
    [/手碰热水缩回/, 'reflex_arc_path'],
    [/草、兔、狐、鹰/, 'food_chain_energy_four_nodes'],
    [/草、兔、狐组成食物链/, 'ecosystem_energy_arrow'],
    [/判断山谷和山脊/, 'contour_valley_ridge_direction'],
    [/读气温曲线和降水柱状图，判断气候类型/, 'climate_graph_temperature_precipitation'],
    [/交通线布局原因/, 'transport_location_map_evidence']
    , [/气候图题.*只看一个月数据/, 'climate_graph_full_year_trend']
    , [/全年气温曲线和降水柱状图.*只看一个月/, 'climate_graph_full_year_trend']
    , [/只看最高温.*雨热同期/, 'climate_chart_hot_wet_same_time']
    , [/气候类型作业/, 'climate_type_evidence_match']
    , [/一组 8 人平均 92 分/, 'weighted_average_group_size']
    , [/爸爸今年年龄是孩子的 3 倍/, 'age_equation_same_time_shift']
    , [/220V 40W/, 'electric_power_energy_time']
    , [/撬棍题要求判断省力还是费力/, 'physics_lever_pivot']
    , [/杠杆作业/, 'lever_arm_perpendicular_distance']
    , [/溶解度曲线题：温度升高后/, 'solubility_curve_object_temperature']
    , [/题目给出两种物质曲线和温度变化/, 'solubility_curve_saturation_purify']
    , [/溶解度曲线作业/, 'solubility_curve_fixed_temperature']
    , [/过滤操作作业/, 'filter_operation_purpose']
    , [/完形填空作业/, 'cloze_context_next_sentence']
    , [/The classroom ___ cleaned every day/, 'passive_voice_receiver_subject']
    , [/孤帆、夕阳、寒山/, 'poem_image_to_emotion']
    , [/通过这次活动，使我明白了合作的重要/, 'sentence_revision_missing_subject']
    , [/物像偏在视野左上方/, 'microscope_reverse_move']
    , [/物像偏左上，题目问玻片/, 'microscope_reverse_move']
    , [/目镜 10 倍、物镜 40 倍/, 'biology_microscope_magnification']
    , [/显微镜作业/, 'microscope_reverse_direction']
    , [/肺循环路径/, 'pulmonary_circulation_path']
    , [/夏季风为什么从海洋吹向陆地/, 'monsoon_pressure_cause']
    , [/30°N、120°E/, 'lat_lon_hemisphere_rule']
  ];
  const exactPriority = exactSourcePriority
    .map(([pattern, id]) => (pattern.test(source) ? cases.find((item) => item.id === id) : null))
    .filter(Boolean)[0];
  if (exactPriority) {
    return Object.assign({}, exactPriority, { source: 'real_homework_pressure_exact' });
  }
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
  if (/离子检验作业：题目给出加入硝酸银、稀硝酸后的白色沉淀/.test(source)) {
    return {
      id: 'ion_test_reagent_phenomenon_exact',
      taskType: 'chemistry_experiment',
      firstStep: '先把试剂、现象和对应离子一一连起来。',
      wrongCause: '只背沉淀颜色，没有把确认试剂和干扰排除连起来。',
      boardMove: '小黑板只画“试剂 -> 现象 -> 可能离子”。',
      parentCheck: '先问：这个白色沉淀是哪个试剂引出的？有没有排除干扰？',
      reviewMove: '换成硫酸根检验，仍先连试剂、现象和离子。',
      source: 'real_homework_pressure_exact'
    };
  }
  if (/语文记叙文阅读作业：题目问人物心情变化/.test(source)) {
    return {
      id: 'narrative_emotion_change_exact',
      taskType: 'reading_question',
      firstStep: '先按情节顺序圈出三个表示心情的词或动作。',
      wrongCause: '只抓结尾情绪，没有沿事件顺序看变化过程。',
      boardMove: '小黑板只画“开始心情 -> 转折事件 -> 结尾心情”。',
      parentCheck: '先问：人物一开始和后来一样吗？哪件事让心情变了？',
      reviewMove: '换一篇记叙文，仍先画心情变化线。',
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
