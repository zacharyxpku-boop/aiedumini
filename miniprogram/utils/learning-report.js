function buildQuickAssessmentQuestions() { return []; }
function buildLearningReportDraft(input = {}) {
  return {
    reportStatus: { status: 'ready', requiresConfirmation: false },
    diagnosisLine: '先看孩子今晚卡在哪一步。',
    planLine: '家长只问第一步，不替孩子做题。',
    ctaLabel: '去说第一步',
    nextActionRoute: '/pages/tutor/tutor',
    input
  };
}
module.exports = new Proxy({ buildQuickAssessmentQuestions, buildLearningReportDraft }, { get: (target, key) => key in target ? target[key] : (() => null) });
