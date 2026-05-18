const SUBJECT_COUNTS = [
  { id: 'math', label: '数学', count: 61, nextGap: '比例、百分数、几何角、函数图像、二次函数顶点、全等证明、相似面积比、单位量比较、统计抽样、概率、不放回样本空间、移项符号、浓度/分段收费/年龄/行程/利润/几何方程继续补跨学科词面误判样本。' },
  { id: 'physics', label: '物理', count: 46, nextGap: '受力、光路、电路、串并联电流、浮力密度、压强面积、电路故障、欧姆定律变量控制、杠杆力臂、电功率、热效率、热传递、状态变化和图像题继续补真实卡点。' },
  { id: 'chemistry', label: '化学', count: 48, nextGap: '实验现象、气体验证、溶液质量分数、金属活动性、守恒、微粒观、酸碱指示剂、pH 加液方向、变量控制、开放体系、粗盐提纯、反应速率、溶解度曲线、过滤操作、离子共存和气体检验继续拆错因。' },
  { id: 'english', label: '英语', count: 49, nextGap: '语法信号、现在完成时、比较级、被动语态、介词范围、定语从句、非谓语目的、状语从句 unless、代词指代、完形上下文、阅读推断、标题题和逻辑连词继续扩样。' },
  { id: 'biology', label: '生物', count: 46, nextGap: '显微镜高低倍、遗传显隐性、生态系统成分、呼吸作用、光合呼吸区分、人体循环、血糖调节、反射弧、蒸腾作用、生态角色和能量流动继续验证小黑板边界。' },
  { id: 'geography', label: '地理', count: 48, nextGap: '经纬网、等高线河流流向、气候图、气候类型、交通/农业/工业区位、地球自转时差、纬度气温、季风成因、板块边界、人口迁移继续验证空间和区位误判。' },
  { id: 'chinese', label: '语文', count: 58, nextGap: '阅读概括、记叙文标题线索、议论文论据作用、古诗意象、修辞赏析、说明方法、说明语言、说明顺序、文言虚词、句式转换、写作起步、段落中心、选材、语段衔接、结尾照应、细节描写、病句修改继续压测。' }
];

const TYPE_COUNTS = [
  { id: 'math_word_problem', label: '数学应用/建模', count: 45, firstStep: '先翻译数量关系、图形关系、变化基准、统计总量、抽样代表性、概率分母、不放回样本空间、比例份数、单位量、函数坐标、二次函数顶点、全等对应条件或相似维度。' },
  { id: 'equation_setup', label: '方程/不等式建模', count: 16, firstStep: '先设未知数、写等量或不等量关系，或拆浓度、分段收费、不等式变形规则、移项符号、同步时间点。' },
  { id: 'physics_diagram', label: '物理图解', count: 46, firstStep: '先定对象、方向、单位、路径、串并联分支、力臂、受力面积、电表位置、故障位置、控制变量、热量方向、热效率输入输出、浮力决定量、状态变化或决定量。' },
  { id: 'chemistry_experiment', label: '化学实验/变化', count: 48, firstStep: '先列反应物、现象、体系边界、微粒解释、守恒关系、唯一变量、酸碱性质、金属活动性、溶液总质量、pH 起点方向、过滤/提纯条件、溶解度曲线定位、离子共存排查和气体检验试剂。' },
  { id: 'english_sentence', label: '英语句法/上下文', count: 37, firstStep: '先找时态、持续时间信号、主语、比较、被动、介词范围、先行词、从句成分、目的关系、unless 逻辑、代词指代或上下文信号。' },
  { id: 'reading_question', label: '阅读证据', count: 48, firstStep: '先判断题目类型，再回文定位证据、标题线索、议论文观点、意象、修辞本体喻体、说明方法、说明语言、文言功能、说明顺序、标题中心或推断行为。' },
  { id: 'biology_process', label: '生物过程', count: 46, firstStep: '先分结构、功能、方向、变量、能量流动、生态角色、调节路径、显微镜操作、显隐性基因、光合呼吸条件、蒸腾路径、生态成分、过程条件或循环路径。' },
  { id: 'geography_map', label: '地理图示', count: 48, firstStep: '先看图例、方向、经纬、纬度热量、地球自转方向、海拔、等高线形态、太阳高度、气候证据、农业/工业区位条件、水汽来源、板块边界、人口迁移推拉力或成因链。' },
  { id: 'writing_process', label: '写作过程', count: 22, firstStep: '先写一句朴素事实、段落中心、一个可见细节、结尾照应、语段顺序、修改成分残缺或选一个核心材料，不追求完整成文。' }
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

const PUBLIC_K12_SOURCE_LEDGER = [
  {
    id: 'moe_curriculum_standard',
    label: '义务教育课程方案与课程标准',
    sourceType: 'official_public_standard',
    useLevel: 'high_confidence',
    productUse: ['课程骨架', '能力标签', '题型方向', '错因模型'],
    localRuleUse: ['学科分流', '任务类型识别', '第一步入口', '报告能力维度'],
    aiUse: ['把本地规则生成的第一步改写成孩子听得懂的追问'],
    blockedUse: ['直接复制教材正文', '宣称覆盖全教材原题', '生成标准答案库'],
    miniappSurface: ['/pages/tutor/tutor', '/pages/profile/profile'],
    evidenceRequired: ['subject_lane', 'capability_tag', 'first_step_rule', 'no_answer_bank_boundary']
  },
  {
    id: 'smartedu_basic_homework',
    label: '国家中小学智慧教育平台基础性作业方向',
    sourceType: 'official_public_homework_direction',
    useLevel: 'high_confidence',
    productUse: ['作业压力样本', '回访题型', '家长检查话术', '减负边界'],
    localRuleUse: ['真实作业压测样本', '负样本拦截', '回访间隔', '家长侧只看行动建议'],
    aiUse: ['根据错因生成不同语气的苏格拉底追问'],
    blockedUse: ['批量搬运原题', '输出完整题解', '伪装成拍照搜题'],
    miniappSurface: ['/pages/home/home', '/pages/review/review', '/pages/arcade/arcade'],
    evidenceRequired: ['sample_rewrite', 'parent_check', 'revisit_plan', 'shortcut_block']
  },
  {
    id: 'public_exam_archetype',
    label: '公开中考/学业水平考试常见题型',
    sourceType: 'public_exam_archetype',
    useLevel: 'medium_confidence',
    productUse: ['题型簇', '变式迁移', '小黑板图解动作', '跨周趋势'],
    localRuleUse: ['题型路由', '小黑板第一笔', '变式解锁门槛', '错因复现'],
    aiUse: ['解释同一错因在不同题面里的表现'],
    blockedUse: ['原题答案索引', '押题承诺', '考试分数预测'],
    miniappSurface: ['/pages/tutor/tutor', '/pages/radar/radar', '/pages/profile/profile'],
    evidenceRequired: ['question_type_cluster', 'visual_board_move', 'variant_gate', 'exam_score_boundary']
  },
  {
    id: 'family_homework_observation',
    label: '家庭晚间作业真实观察',
    sourceType: 'first_party_observation',
    useLevel: 'highest_confidence_after_consent',
    productUse: ['今晚决策', '长期画像', '家校协同摘要', '分享回流'],
    localRuleUse: ['隐私字段裁剪', '分享可见字段', '家校摘要字段', '奖励发放门槛'],
    aiUse: ['把证据解释成家长能执行的一句话'],
    blockedUse: ['展示完整对话', '展示原题照片', '展示排名分数', '未确认就给诊断标签'],
    miniappSurface: ['/pages/profile/profile', '/pages/home/home'],
    evidenceRequired: ['guardian_safe_field', 'visible_share_field', 'home_school_digest', 'confidence_gate']
  }
];

const PUBLIC_K12_USE_POLICY = {
  id: 'public_k12_use_policy',
  title: '公开 K12 资料使用边界',
  principle: '公开资料只沉淀为题型、能力、错因、第一步、小黑板动作和回访规则；不做答案库，不搬运原题，不承诺全科自动板书。',
  localCodeOwns: [
    '学科与题型路由',
    '错因分类',
    '第一步小黑板动作',
    '回访间隔',
    'XP 和变式解锁',
    '报告释放门槛',
    '分享隐私边界'
  ],
  aiOwns: [
    '苏格拉底追问语气',
    '同一第一步的多种讲法',
    '家长报告解释',
    '孩子卡住后的鼓励与降阶提示'
  ],
  aiBlocked: [
    '直接给最终答案',
    '决定是否分享隐私字段',
    '决定奖励和解锁',
    '宣称拍照识别或全科动态板书',
    '替代老师或家长判断'
  ],
  releaseGate: [
    '每个资料来源必须有 productUse',
    '每个资料来源必须有 blockedUse',
    '每个资料来源必须落到至少一个小程序页面',
    '每个资料来源必须说明哪些归本地规则、哪些归 AI 表达'
  ]
};

const K12_PUBLIC_IMPLEMENTATION_DECISION_MATRIX = [
  {
    id: 'homework_archetype_pressure',
    productQuestion: '公开作业/考试题型能不能直接用来扩题库？',
    decision: '只转写为压力样本和题型簇，不搬原题、不做答案库。',
    localCodeBetter: ['题型识别', '错因命中', '第一步小黑板', '回访窗口', '负样本拦截'],
    aiBetter: ['把同一个第一步改写成更像老师的追问', '孩子二次卡住后的降阶语气'],
    evidenceGate: ['sample_specific_first_step', 'sample_specific_wrong_cause', 'no_final_answer_leak']
  },
  {
    id: 'socratic_dialogue',
    productQuestion: '苏格拉底问答应该本地写死还是调用 AI？',
    decision: '本地代码决定问什么轴，AI 只负责怎么说。',
    localCodeBetter: ['追问轴选择', '不直接给答案', '失败降阶', '停止条件', '安全边界'],
    aiBetter: ['同义追问', '鼓励语气', '根据孩子原话换一种解释'],
    evidenceGate: ['axis_selected_by_task_type', 'three_round_no_answer', 'fallback_micro_choice']
  },
  {
    id: 'visual_blackboard',
    productQuestion: '要不要做千问式全科动态板书？',
    decision: '先做可信第一步小黑板，不承诺全科动态板书。',
    localCodeBetter: ['板书层级', '第一笔图解动作', '禁写最终答案', '图示退出条件'],
    aiBetter: ['把板书步骤解释成孩子听得懂的话'],
    evidenceGate: ['board_move_present', 'answer_boundary_visible', 'exit_criteria_present']
  },
  {
    id: 'parent_report_portrait',
    productQuestion: '家长报告用 AI 直接判断孩子画像吗？',
    decision: '本地证据门槛决定能不能写画像，AI 只做解释。',
    localCodeBetter: ['证据字段裁剪', '跨周趋势', '家校摘要', '画像置信度', '行动释放门槛'],
    aiBetter: ['把证据翻译成家长今晚能做的一句话'],
    evidenceGate: ['evidence_count', 'cross_week_signal', 'home_school_safe_fields']
  },
  {
    id: 'community_share',
    productQuestion: '分享要不要展示分数、排名、原题来刺激转发？',
    decision: '不展示分数排名和原题，用安全接力挑战承接自然传播。',
    localCodeBetter: ['可见字段', '禁传字段', '回流参数', '接收者自己的材料', '传播门槛'],
    aiBetter: ['分享卡一句话标题和温和鼓励'],
    evidenceGate: ['blocked_original_question', 'blocked_score_rank', 'receiver_own_material']
  },
  {
    id: 'gizmo_memory_loop',
    productQuestion: 'Gizmo 式高频记忆循环由谁决策？',
    decision: '本地规则决定回访窗口、错因重现、XP 和解锁；AI 只负责把复习提示说得不枯燥。',
    localCodeBetter: ['间隔复习窗口', '错因重现', '变式解锁门槛', 'XP 发放', '连续失败降阶'],
    aiBetter: ['复习提醒文案', '孩子畏难时的鼓励语气', '同一错因的一句话解释'],
    evidenceGate: ['wrong_cause_reappears', 'variant_gate_passed', 'xp_not_awarded_by_ai']
  },
  {
    id: 'question_bank_course_system',
    productQuestion: '题库/课程体系能否直接由 AI 生成？',
    decision: '题型、能力、错因、进阶和掌握门槛由本地规则与稳定资产决定；AI 只生成可替换表达。',
    localCodeBetter: ['学科节点', '题型卡', '错因模型', '进阶门槛', '掌握释放'],
    aiBetter: ['同一题型讲法改写', '年级化表达', '家长版解释'],
    evidenceGate: ['course_unit_card_exists', 'wrong_cause_model_exists', 'mastery_gate_local']
  },
  {
    id: 'intake_import_public_material',
    productQuestion: '公开资料和家长输入哪些能直接用？',
    decision: '只接收用户主动输入的作业摘要、卡点和错因说法；公开资料只抽象题型，不作为原题和答案来源。',
    localCodeBetter: ['输入字段裁剪', '敏感信息过滤', '题型归一', '来源记录', '失败输入回退'],
    aiBetter: ['口语化作业改写成任务摘要', '生成首个追问'],
    evidenceGate: ['user_supplied_summary', 'source_boundary_logged', 'no_photo_recognition_claim']
  },
  {
    id: 'longitudinal_portrait_home_school',
    productQuestion: '长期画像和家校协同能否由 AI 直接判断？',
    decision: '本地证据和置信度门槛先判断可不可以写；AI 只把已释放证据改写成家长/老师可看的短摘要。',
    localCodeBetter: ['跨周趋势', '证据积累', '置信度门槛', '家校字段白名单', '不分享字段黑名单'],
    aiBetter: ['家长版一句话', '老师版观察摘要', '不责备孩子的表达'],
    evidenceGate: ['confidence_threshold_met', 'safe_handoff_fields_only', 'no_score_rank_raw_dialogue']
  }

];

const QUESTION_TYPE_CLUSTER_RUNWAY = [
  {
    id: 'math_quantity_relation_cluster',
    subject: '数学',
    taskType: 'math_word_problem',
    sourceIds: ['moe_curriculum_standard', 'smartedu_basic_homework', 'public_exam_archetype'],
    pressureFamily: '分数、百分数、比例、行程、几何关系、统计图表',
    firstStepRule: '先把题目翻译成“谁和谁的关系”，只圈单位量、基准量、总量或图形关系。',
    wrongCauseSignals: ['把部分量当总量', '连续变化基准没换', '图形关系没标就计算'],
    boardMove: '小黑板只画线段、表格或角关系第一笔，不写最终算式和答案。',
    socraticProbe: '你先说这句话表示哪个量是整体，哪个量是其中一份？',
    reportSignal: '报告记录“数量关系入口是否说清”，不记录原题答案。',
    memoryCadence: '今晚 1 张同型卡，明天 1 张换数字卡，第 7 天 1 张换情境卡。',
    shareHook: '分享给家长只显示“孩子能不能先说整体和部分”，不显示题目和答案。',
    localGates: ['quantity_anchor_detected', 'no_final_answer', 'variant_ready']
  },
  {
    id: 'equation_model_cluster',
    subject: '数学',
    taskType: 'equation_setup',
    sourceIds: ['smartedu_basic_homework', 'public_exam_archetype'],
    pressureFamily: '方程、不等式、浓度、分段收费、年龄、利润、追及相遇',
    firstStepRule: '先设未知数，再写等量或不等量关系；不先心算结果。',
    wrongCauseSignals: ['x 代表谁不清楚', '等量关系少一边', '不等式方向变化漏掉'],
    boardMove: '小黑板只写“设 x = 谁”和一条关系线。',
    socraticProbe: '你设的 x 是哪个人、哪一段、还是哪个总量？',
    reportSignal: '报告记录“能否先设清未知数”。',
    memoryCadence: '连续两天只练设元和关系式，正确后才放开计算。',
    shareHook: '分享卡只问“x 代表谁”，适合家长一眼检查。',
    localGates: ['unknown_named', 'relation_written', 'calculation_locked_until_relation']
  },
  {
    id: 'physics_visual_model_cluster',
    subject: '物理',
    taskType: 'physics_diagram',
    sourceIds: ['moe_curriculum_standard', 'public_exam_archetype'],
    pressureFamily: '受力、光路、电路、压强、浮力、功率、图像',
    firstStepRule: '先定研究对象、方向、路径、单位和决定量，再画第一根箭头或第一条路径。',
    wrongCauseSignals: ['没定研究对象', '把亮暗当电路结构', '只看终点不看斜率'],
    boardMove: '小黑板只画对象框、箭头、电流路径或坐标斜率，不直接代公式。',
    socraticProbe: '这题先研究哪个物体或哪一段电路？方向从哪里到哪里？',
    reportSignal: '报告记录“物理图解入口是否明确”。',
    memoryCadence: '今晚补一张图解入口卡，明天换图不换方法，第 7 天混入公式题。',
    shareHook: '分享只显示“先画对象/路径/方向”，不显示原题图。',
    localGates: ['object_or_path_named', 'first_arrow_drawn', 'formula_delayed']
  },
  {
    id: 'chem_evidence_chain_cluster',
    subject: '化学',
    taskType: 'chemistry_experiment',
    sourceIds: ['moe_curriculum_standard', 'smartedu_basic_homework', 'public_exam_archetype'],
    pressureFamily: '实验现象、气体验证、溶液、守恒、酸碱、过滤、离子检验、曲线',
    firstStepRule: '先列反应前后物质、现象证据和体系边界，再判断变化方向。',
    wrongCauseSignals: ['只背现象不连物质', '体系边界没定', '曲线起点和方向没看'],
    boardMove: '小黑板只画“物质 -> 现象 -> 证据”和体系边界。',
    socraticProbe: '这个现象对应哪一种物质变化？有没有物质跑出体系？',
    reportSignal: '报告记录“证据链是否闭合”。',
    memoryCadence: '今晚 1 张现象证据卡，明天换试剂，第 7 天换曲线或装置。',
    shareHook: '分享只显示“孩子能否说出现象对应的证据链”。',
    localGates: ['substance_before_after', 'evidence_named', 'system_boundary_checked']
  },
  {
    id: 'english_signal_context_cluster',
    subject: '英语',
    taskType: 'english_sentence',
    sourceIds: ['moe_curriculum_standard', 'smartedu_basic_homework'],
    pressureFamily: '时态、比较、被动、从句、非谓语、完形上下文、逻辑连词',
    firstStepRule: '先圈时间词、连接词、先行词、承受者或前后文信号，再决定形式。',
    wrongCauseSignals: ['只看空格所在句', '信号词漏看', '凭语感选形式'],
    boardMove: '小黑板只写“信号词 -> 结构 -> 验证句”。',
    socraticProbe: '这个形式由哪个词、哪个从句或哪一句支持？',
    reportSignal: '报告记录“证据词是否先于答案出现”。',
    memoryCadence: '今晚练 3 个信号词，明天换语境，第 7 天混合时态和从句。',
    shareHook: '分享只显示“孩子能否先圈信号词”。',
    localGates: ['signal_word_found', 'structure_named', 'answer_form_delayed']
  },
  {
    id: 'reading_evidence_cluster',
    subject: '语文/英语',
    taskType: 'reading_question',
    sourceIds: ['moe_curriculum_standard', 'smartedu_basic_homework', 'public_exam_archetype'],
    pressureFamily: '概括、原因、指代、标题、说明方法、诗歌意象、语言效果、推断',
    firstStepRule: '先判断题型，再回原文定位证据句；不凭印象选答案。',
    wrongCauseSignals: ['复述情节代替回答', '离开原文凭感觉', '题型没判就答'],
    boardMove: '小黑板只画“题型 -> 证据句 -> 一句话结论”。',
    socraticProbe: '你选的这一句在原文哪一行能找到证据？',
    reportSignal: '报告记录“是否能把答案挂回证据”。',
    memoryCadence: '今晚 1 篇短文只练定位，明天换题型，第 7 天混合概括和推断。',
    shareHook: '分享只显示“孩子能否指出证据句”。',
    localGates: ['question_type_named', 'evidence_sentence_found', 'impression_answer_blocked']
  },
  {
    id: 'writing_process_cluster',
    subject: '语文',
    taskType: 'writing_process',
    sourceIds: ['moe_curriculum_standard', 'smartedu_basic_homework'],
    pressureFamily: '中心句、选材、细节、结尾照应、病句修改、片段扩写',
    firstStepRule: '先写一句事实、一个中心句或一个可见细节，不要求一次成文。',
    wrongCauseSignals: ['想一次写完整', '没有中心句', '只有评价没有细节'],
    boardMove: '小黑板只写“中心句 -> 例子 -> 可见细节”。',
    socraticProbe: '这一段只想说明哪一个意思？能不能先写一个看得见的动作？',
    reportSignal: '报告记录“是否从一小句启动”。',
    memoryCadence: '今晚 1 句启动，明天 3 句成段，第 7 天做一次改写。',
    shareHook: '分享只显示“孩子能否从一句具体事实开始”。',
    localGates: ['one_sentence_started', 'center_line_present', 'detail_visible']
  },
  {
    id: 'biology_process_cluster',
    subject: '生物',
    taskType: 'biology_process',
    sourceIds: ['moe_curriculum_standard', 'public_exam_archetype'],
    pressureFamily: '显微镜、光合呼吸、遗传、生态系统、人体循环、反射、能量流动',
    firstStepRule: '先分结构、功能、方向、变量、能量或调节路径。',
    wrongCauseSignals: ['结构和功能混在一起', '方向判断反了', '变量没分清'],
    boardMove: '小黑板只画“结构/条件 -> 过程 -> 结果”。',
    socraticProbe: '这是结构、功能、条件还是结果？箭头往哪里走？',
    reportSignal: '报告记录“过程箭头是否稳定”。',
    memoryCadence: '今晚 1 张过程箭头卡，明天换系统，第 7 天混入实验变量。',
    shareHook: '分享只显示“孩子能否说清过程方向”。',
    localGates: ['structure_function_split', 'direction_arrow_named', 'variable_checked']
  },
  {
    id: 'geography_spatial_cluster',
    subject: '地理',
    taskType: 'geography_map',
    sourceIds: ['moe_curriculum_standard', 'smartedu_basic_homework', 'public_exam_archetype'],
    pressureFamily: '经纬网、等高线、气候图、地球运动、河流、区位、季风',
    firstStepRule: '先看图例、方向、经纬、海拔、峰值月份、区位条件或成因链。',
    wrongCauseSignals: ['只看地图上下', '自转公转混淆', '只看温度不看降水'],
    boardMove: '小黑板只画方向箭头、峰值标记或成因链第一段。',
    socraticProbe: '这个判断先看图例、方向、月份，还是成因链？',
    reportSignal: '报告记录“空间规则是否先于结论”。',
    memoryCadence: '今晚 1 张图例卡，明天换图，第 7 天混合气候和区位。',
    shareHook: '分享只显示“孩子能否先说读图规则”。',
    localGates: ['map_rule_named', 'direction_or_legend_checked', 'cause_chain_started']
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
    questionTypeClusterRunway: QUESTION_TYPE_CLUSTER_RUNWAY,
    publicSourceLedger: PUBLIC_K12_SOURCE_LEDGER,
    publicSourcePolicy: PUBLIC_K12_USE_POLICY,
    implementationDecisionMatrix: K12_PUBLIC_IMPLEMENTATION_DECISION_MATRIX,
    publicSourceLine: `已把 ${PUBLIC_K12_SOURCE_LEDGER.length} 类公开/一方资料沉淀为本地规则资产：题型、错因、第一步、小黑板、回访、报告和分享边界。`,
    publicSourceBlockedLine: '禁止把公开资料变成原题答案库、拍照搜题承诺、排名晒分或全科动态板书承诺。',
    clusterRunwayLine: `已把 ${QUESTION_TYPE_CLUSTER_RUNWAY.length} 个高频题型簇接成“第一步-错因-小黑板-回访-分享”本地闭环。`,
    totalSamples,
    totalSubjects: SUBJECT_COUNTS.length,
    totalTypes,
    totalPublicSources: PUBLIC_K12_SOURCE_LEDGER.length,
    totalQuestionTypeClusters: QUESTION_TYPE_CLUSTER_RUNWAY.length,
    reportLine: `报告可引用 ${totalSamples} 个压力样本的第一步、错因、小黑板和回访动作。`,
    parentLine: `家长侧只看 ${active.label} 当前错因和下一次回访，不看孩子完整对话、分数或排名。`,
    nextExpansionLine: active.nextGap,
    evidenceRequired: [
      'sample_specific_first_step',
      'sample_specific_wrong_cause',
      'visual_board_move',
      'parent_check_line',
      'next_day_revisit',
      'public_source_boundary'
    ]
  };
}

module.exports = {
  SUBJECT_COUNTS,
  TYPE_COUNTS,
  SAMPLE_CLUSTERS,
  QUESTION_TYPE_CLUSTER_RUNWAY,
  PUBLIC_K12_SOURCE_LEDGER,
  PUBLIC_K12_USE_POLICY,
  K12_PUBLIC_IMPLEMENTATION_DECISION_MATRIX,
  buildRealHomeworkCoverageMatrix
};
