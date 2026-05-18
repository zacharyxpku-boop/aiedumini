const SUBJECT_COUNTS = [
  { id: 'math', label: '数学', count: 35, nextGap: '比例、百分数、几何角、函数图像、统计平均数、概率、浓度/分段收费/年龄/行程/利润/几何方程继续补跨学科词面误判样本。' },
  { id: 'physics', label: '物理', count: 23, nextGap: '受力、光路、电路、浮力、压强、电路故障、杠杆、电功率、热传递、状态变化和图像题继续补真实卡点。' },
  { id: 'chemistry', label: '化学', count: 25, nextGap: '实验现象、气体验证、溶液、守恒、微粒观、酸碱指示剂、变量控制、开放体系、反应速率、溶解度曲线、离子检验继续拆错因。' },
  { id: 'english', label: '英语', count: 26, nextGap: '语法信号、比较级、被动语态、定语从句、非谓语、状语从句、完形上下文、阅读推断、标题题和逻辑连词继续扩样。' },
  { id: 'biology', label: '生物', count: 23, nextGap: '显微镜、遗传、生态系统成分、呼吸作用、人体循环、血糖调节、反射弧和能量流动继续验证小黑板边界。' },
  { id: 'geography', label: '地理', count: 25, nextGap: '经纬网、等高线、气候图、气候类型、交通/农业/工业区位、地球运动、季风成因继续验证空间误判。' },
  { id: 'chinese', label: '语文', count: 33, nextGap: '阅读概括、古诗意象、说明方法、说明顺序、文言虚词、句式转换、写作起步、段落中心、选材、结尾照应、细节描写和单句修改继续压测。' }
];

const TYPE_COUNTS = [
  { id: 'math_word_problem', label: '数学应用/建模', count: 24, firstStep: '先翻译数量关系、图形关系、变化基准、统计总量、概率分母、比例份数或函数坐标。' },
  { id: 'equation_setup', label: '方程/不等式建模', count: 11, firstStep: '先设未知数、写等量关系，或拆浓度、分段收费、不等式变形规则。' },
  { id: 'physics_diagram', label: '物理图解', count: 23, firstStep: '先定对象、方向、单位、路径、力臂、受力面积、电表位置、热量方向、状态变化或决定量。' },
  { id: 'chemistry_experiment', label: '化学实验/变化', count: 25, firstStep: '先列反应物、现象、体系边界、微粒解释、守恒关系、唯一变量、酸碱性质、过滤条件、曲线定位和检验试剂。' },
  { id: 'english_sentence', label: '英语句法/上下文', count: 18, firstStep: '先找时态、主语、比较、被动、先行词、目的关系、逻辑连词或上下文信号。' },
  { id: 'reading_question', label: '阅读证据', count: 29, firstStep: '先判断题目类型，再回文定位证据、意象、说明方法、文言功能、说明顺序、标题中心或推断行为。' },
  { id: 'biology_process', label: '生物过程', count: 23, firstStep: '先分结构、功能、方向、变量、能量流动、生态角色、调节路径、过程条件或循环路径。' },
  { id: 'geography_map', label: '地理图示', count: 25, firstStep: '先看图例、方向、经纬、海拔、等高线形态、气候证据、区位条件、水汽来源或成因链。' },
  { id: 'writing_process', label: '写作过程', count: 12, firstStep: '先写一句朴素事实、段落中心、一个可见细节、结尾照应或选一个核心材料，不追求完整成文。' }
];

const SAMPLE_CLUSTERS = [
  {
    id: 'percent_ratio_inequality',
    label: '比例/百分数/不等式',
    subject: '数学',
    count: 5,
    pressure: '孩子常把折扣当具体金额、把比例当相乘、把不等式当方程、把连续百分数直接相加。',
    firstStep: '先翻译含义和基准：八折是 80%，第二次变化看新的基准，除以负数要变号。',
    boardMove: '小黑板只写关系翻译和基准变化，不直接算答案。',
    parentCheck: '家长只问：这句话到底表示什么关系？第二步的基准是谁？',
    revisit: '明天换数字，只检查关系翻译和基准判断是否稳定。'
  },
  {
    id: 'function_geometry_graph',
    label: '函数图像/几何关系',
    subject: '数学',
    count: 4,
    pressure: '孩子只看终点高低、不看斜率；几何题直接算数，不先认角关系。',
    firstStep: '先比较单位变化量，或先标对顶角、邻补角、平行线角关系。',
    boardMove: '小黑板只画小三角形或角关系标签，不写最终角度。',
    parentCheck: '家长只问：你先看的是什么关系，而不是先算哪个数？',
    revisit: '明天换图像或角的位置，只复述入口关系。'
  },
  {
    id: 'physics_graph_force_electric',
    label: '物理图像/受力/电路/浮力',
    subject: '物理',
    count: 5,
    pressure: '孩子容易看终点不看斜率、看压力不看面积、看亮暗不看电路结构、看物体不看液体。',
    firstStep: '先圈对象、单位、横纵轴、电流路径、液体密度或排开体积。',
    boardMove: '小黑板只画变量关系、路径或决定量，不写最终数值。',
    parentCheck: '家长只问：你先比较哪一个量？路径有没有分叉？决定量是哪两个？',
    revisit: '明天换图像、电路或液体，仍先复述判断入口。'
  },
  {
    id: 'chem_solution_reaction',
    label: '化学现象/溶液/守恒/酸碱图像',
    subject: '化学',
    count: 5,
    pressure: '孩子会背现象但不连物质变化，把水当分母，忽略密闭体系，或不看 pH 起点。',
    firstStep: '先列反应前后、溶质溶剂、体系边界、图像起点和现象证据。',
    boardMove: '小黑板只画“物质 -> 现象 -> 证据”和“起点/方向/经过 7”。',
    parentCheck: '家长只问：现象对应哪种物质变化？有没有物质跑出体系？',
    revisit: '明天换一种盐、容器或酸碱方向，仍先找体系和证据。'
  },
  {
    id: 'language_evidence_start',
    label: '阅读证据/文言语境/写作过程',
    subject: '语文/英语',
    count: 12,
    pressure: '孩子凭感觉选阅读题、按现代词义理解文言、作文想一次写完整，或写作没有中心句、细节和单句修改入口。',
    firstStep: '阅读先找证据句；文言先放回句子；写作先写一句事实、一个中心句或一个动作细节。',
    boardMove: '小黑板只画“题型 -> 证据”“原词 -> 语境”“中心句 -> 例子”或“动作/语言/神态”。',
    parentCheck: '家长只问：原文哪一句支持你？这个意思放回句子通不通？这一段只说明哪一个意思？',
    revisit: '明天换短文、词语或作文题，只检查证据定位、段落中心和一个可见细节。'
  },
  {
    id: 'english_signal_context',
    label: '英语语法信号/完形上下文',
    subject: '英语',
    count: 4,
    pressure: '孩子只看空格所在句，漏掉 than、be done、yesterday、前后文线索。',
    firstStep: '先圈时间词、比较词、承受者、前后句线索，再决定形式。',
    boardMove: '小黑板只写“信号词 -> 结构”或“前句线索 -> 空格 -> 后句验证”。',
    parentCheck: '家长只问：这个形式由哪个词或哪一句支持？',
    revisit: '明天换一个信号词，仍先圈证据再填。'
  },
  {
    id: 'life_geo_spatial',
    label: '生物/地理方向与图示误判',
    subject: '生物/地理',
    count: 7,
    pressure: '孩子按肉眼直觉移动显微镜、混淆经纬线、看地图上下不看海拔、只看最高温不看降水。',
    firstStep: '先判断方向规则、能量流动、显隐性、纬度经度、海拔或峰值月份。',
    boardMove: '小黑板只画方向箭头、规则标签和高低/峰值标记。',
    parentCheck: '家长只问：这个方向规则或图示规则是什么？',
    revisit: '明天换方位、地图、食物链或气候图，只复述规则再判断。'
  }
];

function buildRealHomeworkCoverageMatrix(options = {}) {
  const activeSubject = String(options.subject || '').trim();
  const active = SUBJECT_COUNTS.find((item) => item.id === activeSubject || item.label === activeSubject) || SUBJECT_COUNTS[0];
  const totalSamples = SUBJECT_COUNTS.reduce((sum, item) => sum + item.count, 0);
  const totalTypes = TYPE_COUNTS.length;
  return {
    id: 'real_homework_coverage_matrix',
    title: '真实作业压力覆盖矩阵',
    summary: `已把 ${totalSamples} 个小学/初中作业压力样本沉淀为 ${SUBJECT_COUNTS.length} 科、${totalTypes} 类题型资产。`,
    boundary: '样本只用于第一步、错因、小黑板、回访和家长判断；不做拍题答案库，不展示原题答案。',
    sourceLine: '来源按公开课标、国家中小学智慧教育平台作业风格和公开考试常见题型方向转写。',
    activeSubject: active,
    subjectRows: SUBJECT_COUNTS,
    typeRows: TYPE_COUNTS,
    sampleClusters: SAMPLE_CLUSTERS,
    totalSamples,
    totalSubjects: SUBJECT_COUNTS.length,
    totalTypes,
    reportLine: `报告可引用 ${totalSamples} 个压力样本的第一步、错因、小黑板和回访动作。`,
    parentLine: `家长侧只看 ${active.label} 当前错因和下一次回访，不看孩子完整对话、分数或排名。`,
    nextExpansionLine: active.nextGap,
    evidenceRequired: [
      'sample_specific_first_step',
      'sample_specific_wrong_cause',
      'visual_board_move',
      'parent_check_line',
      'next_day_revisit'
    ]
  };
}

module.exports = {
  SUBJECT_COUNTS,
  TYPE_COUNTS,
  SAMPLE_CLUSTERS,
  buildRealHomeworkCoverageMatrix
};
