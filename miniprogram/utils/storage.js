const KEYS = new Proxy({
  profile: 'ydzx.profile.v1',
  state: 'ydzx.state.v1',
  selectedHomework: 'ydzx.selected.homework.v1',
  selectedHomeworkSource: 'ydzx.selected.homework.source.v1',
  taskDraft: 'ydzx.task.draft.v1',
  tutorMessages: 'ydzx.tutor.messages.v1',
  consent: 'ydzx.guardian.consent.v1',
  learningReport: 'ydzx.learning.report.v1'
}, { get: (target, key) => target[key] || `ydzx.${String(key)}.v1` });

const memory = {};
function get(key, fallback = null) {
  try {
    const value = wx.getStorageSync(key);
    return value === '' || value == null ? fallback : value;
  } catch (error) {
    return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : fallback;
  }
}
function set(key, value) {
  memory[key] = value;
  try { wx.setStorageSync(key, value); } catch (error) {}
  return value;
}
function remove(key) {
  delete memory[key];
  try { wx.removeStorageSync(key); } catch (error) {}
}

function now() { return new Date().toISOString(); }
function loadProfile() { return Object.assign({ grade: '初中', subject: '数学', streak: 0 }, get(KEYS.profile, {})); }
function saveProfile(profile) { return set(KEYS.profile, Object.assign({}, profile || {}, { updated_at: now() })); }
function loadState() { return Object.assign({ homework_plan: { must_do: [] }, weak_points: [] }, get(KEYS.state, {})); }
function saveState(state) { return set(KEYS.state, Object.assign({}, state || {}, { updated_at: now() })); }
function loadReviewCards() { const cards = get('ydzx.review.cards.v1', []); return Array.isArray(cards) ? cards : []; }
function saveReviewCards(cards) { return set('ydzx.review.cards.v1', Array.isArray(cards) ? cards : []); }
function loadReviewEvents() { return get('ydzx.review.events.v1', []) || []; }
function loadTonightPlan() { return get('ydzx.tonight.plan.v1', null); }
function loadTodayFocus() { return get('ydzx.today.focus.v1', null); }
function loadCompanionPreference() { return { selectedCompanion: 'gudian', selectedLabel: '咕点' }; }
function buildCompanionPreference(value) { return Object.assign(loadCompanionPreference(), value || {}); }
function getCompanionStageCopy() { return '咕点陪你先迈出第一步。'; }
function formatCompanionLine() { return '咕点：我懂你卡住了，我陪你先迈出第一步。'; }
function formatInternalLabel(value, fallback = '先说第一步') { return String(value || fallback); }
function formatIssueType(value, fallback = '今天最卡的一步') { return String(value || fallback); }
function formatSourceLabel(value, fallback = '今晚路线') { return String(value || fallback); }
function createTonightPlanFromInput(text = '') {
  const lines = String(text || '').split(/\n+/).map((item) => item.trim()).filter(Boolean);
  const steps = [
    { id: 'plan', label: '排顺序' },
    { id: 'first_step', label: '说第一步' },
    { id: 'repair', label: '修卡点' },
    { id: 'review', label: '明天验' },
    { id: 'parent', label: '家长看' }
  ];
  return set(KEYS.tonightPlan, {
    id: `plan_${Date.now()}`,
    summaryLine: lines[0] || '今晚先从最卡的一步开始',
    routeSteps: steps,
    homework: lines.map((text, index) => ({ id: `task_${index}`, text, minutes: 10 })),
    created_at: now()
  });
}
function saveTodayFocusFromThought(text = '') {
  return set(KEYS.todayFocus, {
    id: `focus_${Date.now()}`,
    title: String(text || '先说第一步').slice(0, 48),
    issueType: '第一步',
    isStuck: true,
    progress: 20,
    created_at: now()
  });
}
function buildSurfaceDepthPack(surface = 'home') { return { surface, primaryRoute: '/pages/tutor/tutor', cards: [] }; }
function buildUnifiedNextActionController() { return { actionLabel: '继续下一步', route: '/pages/tutor/tutor' }; }
function buildLearningReportFromInput(input = {}) { return { reportStatus: { status: 'ready' }, input, updated_at: now() }; }
function loadLearningReportState() { return get(KEYS.learningReport, null); }
function saveLearningReportState(state) { return set(KEYS.learningReport, state || {}); }
function childStepQuality(text = '') { return { score: String(text || '').trim() ? 70 : 20, label: '先说第一步' }; }
function getLocalUserId() { return get('ydzx.local.user.id.v1', 'local_user'); }
function clearLearningData() { Object.keys(KEYS).forEach((key) => remove(KEYS[key])); }
const noop = () => null;
const api = {
  KEYS,
  COMPANION_OPTIONS: [{ id: 'gudian', label: '咕点' }],
  get, set, remove, loadProfile, saveProfile, loadState, saveState,
  loadReviewCards, saveReviewCards, loadReviewEvents,
  loadTonightPlan, loadTodayFocus, loadCompanionPreference, buildCompanionPreference,
  getCompanionStageCopy, formatCompanionLine, formatInternalLabel, formatIssueType, formatSourceLabel,
  createTonightPlanFromInput, saveTodayFocusFromThought,
  buildSurfaceDepthPack, buildUnifiedNextActionController,
  buildLearningReportFromInput, loadLearningReportState, saveLearningReportState,
  childStepQuality, getLocalUserId, clearLearningData,
  updateTonightRouteStatus: noop,
  appendThinkingReceipt: noop,
  appendReviewEvent: noop,
  appendShareRun: noop,
  appendSyncMutation: noop,
  recordSurfaceDepthAction: noop,
  recordUnifiedNextAction: noop,
  markReviewCardRevisited: noop,
  getYesterdayReview: () => null,
  loadIncomingShare: () => null,
  loadGameProfile: () => ({}),
  loadParentGoal: () => null,
  loadFeedback: () => [],
  loadShareRuns: () => [],
  loadThinkingReceipts: () => [],
  thinkingReceiptSummary: () => ({ total: 0 }),
  moduleEventSummary: () => ({ total: 0 }),
  tutorEventSummary: () => ({ total: 0 }),
  factoryEventSummary: () => ({ total: 0 })
};
module.exports = new Proxy(api, { get: (target, key) => key in target ? target[key] : noop });
