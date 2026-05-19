'use strict';

const DEFAULT_ALLOWLIST = [
  'share_intent',
  'from',
  'mode',
  'challenge',
  'share_code',
  'invite_code',
  'identity_tag',
  'tonight_action',
  'parent_question',
  'tomorrow_check',
  'report_daily_action',
  'unified_next_action',
  'unified_next_action_route',
  'parent_next_action',
  'next_challenge',
  'share_challenge_goal',
  'share_challenge_rule',
  'share_challenge_route',
  'share_privacy_boundary',
  'share_return_contract',
  'safe_relay_allowed_fields',
  'safe_relay_blocked_fields',
  'relay_first_step',
  'relay_receiver_action',
  'relay_parent_check',
  'relay_next_revisit',
  'relay_allowed_fields',
  'relay_blocked_fields',
  'relay_completion_signal',
  'relay_return_path',
  'tonight_parent_question',
  'tonight_tomorrow_revisit',
  'tonight_release_gate',
  'tonight_share_boundary',
  'tonight_allowed_fields',
  'tonight_blocked_fields',
  'question_bank_relay_first_step',
  'question_bank_relay_wrong_cause',
  'question_bank_relay_next_action',
  'course_unit_parent_decision',
  'course_unit_share_contract',
  'course_unit_recall_route',
  'course_unit_game_route',
  'relay_review',
  'relay_spread_status',
  'relay_season_status',
  'wrong_cause_label',
  'wrong_cause_first_step',
  'wrong_cause_parent_check',
  'wrong_cause_receiver_action',
  'wrong_cause_next_revisit',
  'wrong_cause_allowed_fields',
  'wrong_cause_blocked_fields',
  'source_challenge_route',
  'openmaic_bridge_status',
  'openmaic_next_action',
  'openmaic_share_boundary',
  'openmaic_game_gate',
  'openmaic_blocked_fields',
  'openmaic_evidence',
  'openmaic_return_path'
];

const DEFAULT_DENYLIST = [
  'original_question',
  'original_answer',
  'photo',
  'raw_text',
  'full_answer',
  'full_solution',
  'full_dialogue',
  'score',
  'ranking',
  'private_comment',
  'classmate_comparison',
  'teacher_private_comment',
  'complete_transcript'
];

function toText(value) {
  return String(value == null ? '' : value).trim();
}

function mergeAllowedFields(source = {}, allowlist = DEFAULT_ALLOWLIST, denylist = DEFAULT_DENYLIST) {
  const safe = {};
  const extra = {};
  allowlist.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(source, key) && !denylist.includes(key)) {
      safe[key] = source[key];
    }
  });
  Object.keys(source || {}).forEach((key) => {
    if (!allowlist.includes(key) && !denylist.includes(key)) {
      extra[key] = source[key];
    }
  });
  return { safe, extra };
}

function buildSafeSharePayload(card = {}, intent = 'peer_challenge', extra = {}, options = {}) {
  const source = Object.assign({}, card.payload || {}, extra || {});
  const allowlist = Array.isArray(options.allowlist) && options.allowlist.length ? options.allowlist : DEFAULT_ALLOWLIST;
  const denylist = Array.isArray(options.denylist) && options.denylist.length ? options.denylist : DEFAULT_DENYLIST;
  const { safe } = mergeAllowedFields(source, allowlist, denylist);
  const payload = Object.assign({
    share_intent: intent,
    share_code: card.code || source.share_code || source.invite_code || 'LOCAL',
    allowed_fields: ['share_code', 'tonight_action', 'parent_question', 'tomorrow_check', 'safe_relay_allowed_fields'],
    blocked_fields: denylist.slice(0)
  }, safe);
  payload.sanitized = true;
  payload.local_rule = '分享出口只走白名单，本地代码先剔除原题、答案、照片、完整对话、分数、排名和私密评论。';
  return payload;
}

function buildShareRelayQuery(path = '', payload = {}) {
  const base = toText(path);
  const query = Object.keys(payload || {})
    .filter((key) => payload[key] !== undefined && payload[key] !== null && payload[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(payload[key]))}`)
    .join('&');
  if (!query) return base;
  return `${base}${base.indexOf('?') >= 0 ? '&' : '?'}${query}`;
}

function parseShareRelayQuery(query = {}) {
  const safe = {};
  Object.keys(query || {}).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      safe[key] = toText(query[key]);
    }
  });
  return safe;
}

module.exports = {
  DEFAULT_ALLOWLIST,
  DEFAULT_DENYLIST,
  mergeAllowedFields,
  buildSafeSharePayload,
  buildShareRelayQuery,
  parseShareRelayQuery
};
