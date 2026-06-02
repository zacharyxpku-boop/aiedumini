function profile() { return { xp: 0, level: 1, streak: 0, achievements: [] }; }
module.exports = new Proxy({
  createDefaultProfile: profile,
  updateStreak: (value) => Object.assign(profile(), value || {}),
  checkAndUnlockAchievements: (stats = {}) => ({ achievements: stats.achievements || [], newlyUnlocked: [], coinsAwarded: 0 }),
  buildHighFrequencyPracticeLoop: () => ({ recallCards: [], dailyMemoryPrescription: {}, ninetySecondRecallComboEngine: {} }),
  addXP: (state = {}) => Object.assign(profile(), state)
}, { get: (target, key) => key in target ? target[key] : (() => ({})) });
