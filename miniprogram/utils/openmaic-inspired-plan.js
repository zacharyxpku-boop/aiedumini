module.exports = new Proxy({
  buildPlan: () => ({ cards: [], nextAction: '/pages/tutor/tutor' })
}, { get: (target, key) => key in target ? target[key] : (() => null) });
