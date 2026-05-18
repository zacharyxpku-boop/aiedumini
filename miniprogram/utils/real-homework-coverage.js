const SUBJECT_COUNTS = [
  { id: 'math', label: '数学', count: 17, nextGap: '比例、百分数、不等式、函数图像继续补变式压力样本。' },
  { id: 'physics', label: '物理', count: 11, nextGap: '受力、光路、电路、压强、图像题继续补真实卡点。' },
  { id: 'chemistry', label: '化学', count: 12, nextGap: '实验现象、气体验证、溶液、守恒题继续拆错因。' },
  { id: 'english', label: '英语', count: 13, nextGap: '语法信号、阅读证据句、完形上下文继续扩样。' },
  { id: 'biology', label: '生物', count: 11, nextGap: '显微镜、遗传、生态、人体循环继续验证小黑板边界。' },
  { id: 'geography', label: '地理', count: 13, nextGap: '经纬网、等高线、季风、地球运动继续验证空间误判。' },
  { id: 'chinese', label: '语文', count: 13, nextGap: '阅读概括、文言词语、句式转换、写作起步继续压测。' }
];

const TYPE_COUNTS = [
  { id: 'math_word_problem', label: '数学应用/建模', count: 13, firstStep: '先翻译数量关系或图形关系。' },
  { id: 'equation_setup', label: '方程/不等式建模', count: 4, firstStep: '先设未知数或标出变形规则。' },
  { id: 'physics_diagram', label: '物理图解', count: 11, firstStep: '先定对象、方向、单位或图像斜率。' },
  { id: 'chemistry_experiment', label: '化学实验/变化', count: 12, firstStep: '先列反应物、现象、守恒关系。' },
  { id: 'english_sentence', label: '英语句法', count: 9, firstStep: '先找时态、主语、比较或被动信号。' },
  { id: 'reading_question', label: '阅读证据', count: 14, firstStep: '先判断题目类型，再回文定位证据。' },
  { id: 'biology_process', label: '生物过程', count: 11, firstStep: '先分结构、功能、方向或变量。' },
  { id: 'geography_map', label: '地理图示', count: 13, firstStep: '先看图例、方向、经纬、海拔或成因链。' },
  { id: 'writing_process', label: '写作起步', count: 3, firstStep: '先写一句朴素事实，不追求完整成文。' }
];

const SAMPLE_CLUSTERS = [
  {
    id: 'percent_ratio_inequality',
    label: '比例/百分数/不等式',
    subject: '数学',
    count: 3,
    pressure: '孩子常把折扣当具体金额、把比例当相乘、把不等式当方程。',
    firstStep: '先翻译含义：八折是 80%，厘米对应多少，除以负数要变号。',
    boardMove: '小黑板只写关系翻译，不直接算答案。',
    parentCheck: '家长只问：这句话到底表示什么关系？',
    revisit: '明天换数字，只检查关系翻译是否稳定。'
  },
  {
    id: 'physics_graph_area_density',
    label: '物理图像/面积/单位',
    subject: '物理',
    count: 3,
    pressure: '孩子容易看终点不看斜率，看压力不看面积，套公式前不统一单位。',
    firstStep: '先圈对象、单位、横纵轴或接触面积。',
    boardMove: '小黑板只画变量关系，不写最终数值。',
    parentCheck: '家长只问：你先比较哪一个量？',
    revisit: '明天换图像或摆放方式，只复述判断入口。'
  },
  {
    id: 'chem_solution_reaction',
    label: '化学现象/溶液/守恒',
    subject: '化学',
    count: 3,
    pressure: '孩子会背现象但不连物质变化，把水当分母，或忘记守恒。',
    firstStep: '先列反应前后、溶质溶剂和现象证据。',
    boardMove: '小黑板只画“物质 -> 现象 -> 证据”。',
    parentCheck: '家长只问：现象对应哪种物质变化？',
    revisit: '明天换一种盐或溶液质量，仍先找分母和证据。'
  },
  {
    id: 'language_evidence_start',
    label: '阅读证据/写作起步',
    subject: '语文/英语',
    count: 4,
    pressure: '孩子凭感觉选阅读题，或作文想一次写完导致迟迟不落笔。',
    firstStep: '阅读先找证据句；写作先写一句事实。',
    boardMove: '小黑板只画“题型 -> 证据”或“时间地点人物事件”。',
    parentCheck: '家长只问：原文哪一句支持你？或先写发生了什么？',
    revisit: '明天换短文或作文题，只检查证据定位和第一句。'
  },
  {
    id: 'life_geo_spatial',
    label: '生物/地理方向误判',
    subject: '生物/地理',
    count: 5,
    pressure: '孩子按肉眼直觉移动显微镜、混淆经纬线、看地图上下不看海拔。',
    firstStep: '先判断方向规则：显微镜相反、纬度看南北、河流看高低。',
    boardMove: '小黑板只画方向箭头和判断规则。',
    parentCheck: '家长只问：这个方向规则是什么？',
    revisit: '明天换方位或地图，只复述规则再判断。'
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
