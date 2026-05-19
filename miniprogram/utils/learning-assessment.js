const SUBJECT_RULES = [
  { subject: '数学', patterns: /数学|方程|应用题|列式|几何|函数|代数|计算|分数|小数|比例|等量关系/i },
  { subject: '英语', patterns: /英语|单词|语法|阅读|听写|时态|主语|谓语|句型/i },
  { subject: '语文', patterns: /语文|作文|阅读|古诗|古文|默写|概括|主旨|段意/i }
];

const STRUGGLE_RULES = [
  { struggle: '没思路', patterns: /没思路|不会下手|不知道怎么开始|不知道先写什么|不会下一步|不会列式|看不懂题|读不懂题/i },
  { struggle: '坐不住', patterns: /坐不住|拖拉|磨蹭|不想学|不想练|注意力不集中|写一会儿就停/i },
  { struggle: '总错', patterns: /错题|反复错|总错|粗心|总是错|步骤乱|容易漏|计算错/i }
];

function detectSubject(text) {
  const value = String(text || '');
  const hit = SUBJECT_RULES.find((item) => item.patterns.test(value));
  return hit ? hit.subject : '未知';
}

function detectStruggle(text) {
  const value = String(text || '');
  const hit = STRUGGLE_RULES.find((item) => item.patterns.test(value));
  return hit ? hit.struggle : '说明学习状态';
}

function recommendCapability(text) {
  const value = String(text || '');
  if (/没思路|不会下手|不知道怎么开始|不会列式|看不懂题|读不懂题/i.test(value)) {
    return {
      id: 'tutor',
      label: '苏格拉底导师',
      reason: '先追问第一步，让孩子把想法说出来'
    };
  }
  if (/坐不住|拖拉|磨蹭|不想学|注意力不集中/i.test(value)) {
    return {
      id: 'focus',
      label: '专注舱',
      reason: '先把任务缩成一小段，留下开始过的证据'
    };
  }
  if (/错题|反复错|粗心|总错|步骤乱|计算错/i.test(value)) {
    return {
      id: 'review',
      label: '错题卡点修复',
      reason: '先把错因和下次检查点整理出来'
    };
  }
  if (/复习|练习|巩固|回访/i.test(value)) {
    return {
      id: 'tools',
      label: '轻回访与练习',
      reason: '先回看昨天那一步，再做一小局轻练习'
    };
  }
  return {
    id: 'tutor',
    label: '苏格拉底导师',
    reason: '先从孩子最卡的一步开始'
  };
}

function collectAssessmentSignals(text) {
  const value = String(text || '');
  const rules = [
    { id: 'wrong_question', label: '错题/试卷', pattern: /错题|试卷|周测|单元测|期中|期末|扣分|总错|反复错|计算错|列式/i, evidence: 'wrong_question_paper' },
    { id: 'first_step_stuck', label: '第一步卡住', pattern: /没思路|不会下手|不知道怎么开始|不会列式|看不懂题|读不懂题|先写什么/i, evidence: 'child_first_step' },
    { id: 'focus_drop', label: '启动和专注困难', pattern: /坐不住|拖拉|磨蹭|不想学|注意力|写一会儿就停|抗拒/i, evidence: 'focus_observation' },
    { id: 'talent_assessment', label: '天赋/学习偏好材料', pattern: /天赋|测评|学习风格|视觉型|听觉型|动觉型|优势|多元智能|MBTI|性格/i, evidence: 'method_candidate_only' },
    { id: 'school_feedback', label: '老师/学校反馈', pattern: /老师|学校|课堂|评语|批注|家校|班主任|作业反馈/i, evidence: 'teacher_observation_request' },
    { id: 'next_revisit', label: '回访/复习线索', pattern: /复习|回访|第\s*7\s*天|两周|变式|迁移|巩固/i, evidence: 'next_day_revisit' }
  ];
  return rules
    .filter((rule) => rule.pattern.test(value))
    .map((rule) => ({
      id: rule.id,
      label: rule.label,
      evidence: rule.evidence
    }));
}

function scoreEvidenceConfidence(subject, struggle, signals) {
  const count = Array.isArray(signals) ? signals.length : 0;
  return {
    subjectConfidence: subject === '未知' ? 0.28 : Math.min(0.92, 0.48 + count * 0.09),
    struggleConfidence: struggle === '说明学习状态' ? Math.min(0.42, 0.22 + count * 0.06) : Math.min(0.9, 0.45 + count * 0.1)
  };
}

function buildAssessmentEvidenceSeed(text, options = {}) {
  const source = String(text || '').trim();
  const subject = detectSubject(source);
  const struggle = detectStruggle(source);
  const capability = recommendCapability(source);
  const matchedSignals = collectAssessmentSignals(source);
  const confidence = scoreEvidenceConfidence(subject, struggle, matchedSignals);
  const sourceType = options.sourceType || (matchedSignals.some((item) => item.id === 'talent_assessment')
    ? 'talent_assessment'
    : matchedSignals.some((item) => item.id === 'wrong_question')
      ? 'wrong_question_paper'
      : 'parent_observation');
  const nextEvidenceRequired = Array.from(new Set([
    'child_first_step',
    'wrong_cause_card',
    'next_day_revisit'
  ].concat(matchedSignals.map((item) => item.evidence)))).filter((item) => item !== 'method_candidate_only').slice(0, 6);

  return {
    id: 'assessment_evidence_seed',
    sourceText: source,
    sourceType,
    subject,
    struggle,
    capabilityId: capability.id,
    capabilityLabel: capability.label,
    matchedSignals,
    subjectConfidence: confidence.subjectConfidence,
    struggleConfidence: confidence.struggleConfidence,
    nextEvidenceRequired,
    reportInputPatch: {
      sourceText: source,
      sourceType,
      materialType: sourceType,
      profileBasics: subject === '未知' ? {} : { subject },
      behaviorSignals: {
        wrongCause: struggle === '说明学习状态' ? '' : struggle,
        firstStep: matchedSignals.some((item) => item.id === 'first_step_stuck') ? '待孩子说出第一步' : '',
        sourceSchemaId: 'assessment_evidence_seed',
        requiredNextEvidence: nextEvidenceRequired
      }
    },
    blockedClaims: [
      '不凭测评给孩子贴天赋标签',
      '不凭单次输入生成长期掌握结论',
      '不输出完整答案、排名或升学判断'
    ],
    localCodeOwns: ['来源分类', '证据缺口', '放行门槛', '分享字段'],
    aiBetterFor: ['苏格拉底追问改写', '家长低压话术', '小黑板解释文案'],
    localBetterFor: ['是否放行画像', '是否增加题量', '是否允许家校分享']
  };
}

function buildLearningAssessment(text) {
  const source = String(text || '').trim();
  const subject = detectSubject(source);
  const struggle = detectStruggle(source);
  const capability = recommendCapability(source);
  const evidenceSeed = buildAssessmentEvidenceSeed(source);
  const nextQuestion = subject === '数学'
    ? '你先能圈出题干里的已知条件吗？'
    : subject === '英语'
      ? '先找主语和谓语，还是先读一遍题？'
      : subject === '语文'
        ? '这题是看细节、主旨，还是原因？'
        : '先说你准备从哪一步开始？';
  const methodHint = {
    tutor: '用咕点追问，让孩子把第一步说出来。',
    focus: '先进入专注舱，围绕这一小步坐一段。',
    review: '先修错题卡点，留下下次检查点。',
    tools: '先做轻回访，再进小游戏轻练习。'
  }[capability.id] || '先从最小动作开始。';

  return {
    sourceText: source,
    subject,
    struggle,
    capability,
    evidenceSeed,
    reportInputPatch: evidenceSeed.reportInputPatch,
    nextEvidenceRequired: evidenceSeed.nextEvidenceRequired,
    blockedClaims: evidenceSeed.blockedClaims,
    nextQuestion,
    methodHint,
    summaryLine: source
      ? `这段描述更像在说 ${subject === '未知' ? '当前学习状态' : subject} 的 ${struggle}。`
      : '先录入一次成绩、测评或学习状态。'
  };
}

module.exports = {
  buildLearningAssessment,
  buildAssessmentEvidenceSeed,
  detectSubject,
  detectStruggle,
  recommendCapability,
  collectAssessmentSignals
};
