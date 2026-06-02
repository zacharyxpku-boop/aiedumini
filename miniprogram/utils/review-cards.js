const storage = require('./storage');
function fallbackCard() {
  return {
    id: 'demo_review_card',
    question: '先说出这题第一步看哪里？',
    answer: '先圈条件，再说第一步。',
    weakPoint: '第一步入口',
    subject: '数学',
    due: new Date().toISOString()
  };
}
function cards() { return storage.loadReviewCards().length ? storage.loadReviewCards() : [fallbackCard()]; }
function reviewSummary() { return { total: cards().length, dueCount: cards().length, deck: { dailyLimit: 5, desiredRetention: 0.9 } }; }
function sessionCards() { return cards().slice(0, 5); }
function cardBrowser() { return cards(); }
function suspendedCards() { return []; }
function buriedCards() { return []; }
function importTextToCards(text = '') {
  const card = Object.assign(fallbackCard(), { id: `card_${Date.now()}`, question: String(text || '').slice(0, 80) || fallbackCard().question });
  storage.saveReviewCards([card].concat(storage.loadReviewCards()).slice(0, 80));
  return [card];
}
module.exports = new Proxy({
  reviewSummary,
  sessionCards,
  cardBrowser,
  suspendedCards,
  buriedCards,
  importTextToCards,
  loadCards: cards
}, { get: (target, key) => key in target ? target[key] : (() => null) });
