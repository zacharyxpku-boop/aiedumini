const IMPORT_CHIPS = [
  { id: 'read_question', label: '我读不懂题', text: '我读不懂题。题目是：' },
  { id: 'write_equation', label: '我不会列式', text: '我不会列式。题目是：' },
  { id: 'review_this', label: '我想复习这个', text: '我想复习这个：' },
  { id: 'similar_practice', label: '我想做同类题', text: '我想做同类题：' }
];

function looksLikeReviewRequest(text = '') {
  return /复习|回访|再练|巩固|记住|记不牢|背|同类题|变式|练这个/.test(String(text || ''));
}

function looksLikeStuckPoint(text = '') {
  return /读不懂|看不懂|不会列式|不会下一步|不知道下一步|卡住|卡在|不懂|不会写|不会用|不会做|不知道怎么/.test(String(text || ''));
}

function looksLikeQuestion(text = '') {
  const value = String(text || '').trim();
  if (!value) return false;
  if (/[?？]$/.test(value)) return true;
  if (/求|计算|证明|解方程|多少|几|为什么|怎么|已知|若|如果|把.*分成|表面积|体积|列式/.test(value) && value.length >= 12) return true;
  return value.length >= 36 && /[。；，,]/.test(value);
}

function detectMaterialSource(text = '') {
  const value = String(text || '').trim();
  const urlMatch = value.match(/https?:\/\/[^\s，。；]+/i);
  const hasUrl = !!urlMatch;
  if (/公众号|微信文章|原文链接|微信读书/.test(value)) {
    return { type: 'wechat_article', label: '公众号摘录', hasUrl, url: urlMatch ? urlMatch[0] : '' };
  }
  if (/PDF|pdf|讲义|教材|试卷解析|资料页|节选/.test(value)) {
    return { type: 'pdf_excerpt', label: 'PDF 摘录', hasUrl, url: urlMatch ? urlMatch[0] : '' };
  }
  if (hasUrl || /网页|网站|链接|文章摘录|知乎|百科|博客/.test(value)) {
    return { type: 'web_article', label: '网页摘录', hasUrl, url: urlMatch ? urlMatch[0] : '' };
  }
  if (/课堂笔记|读书笔记|整理|摘录|材料|知识点|要点/.test(value)) {
    return { type: 'manual_notes', label: '手动整理', hasUrl, url: '' };
  }
  return null;
}

function looksLikeMaterialExcerpt(text = '') {
  const value = String(text || '').trim();
  if (!value) return false;
  const source = detectMaterialSource(value);
  if (!source) return false;
  const hasEnoughContent = value.length >= 28 || value.split(/\n+/).filter(Boolean).length >= 2;
  const isOnlyLink = /^https?:\/\/\S+$/i.test(value);
  return hasEnoughContent && !isOnlyLink;
}

function classifyImportInput(text = '') {
  const value = String(text || '').trim();
  if (!value) {
    return {
      kind: 'empty',
      route: 'none',
      shouldCreateFocus: false,
      feedback: '粘贴题目，或只说你卡在哪一步。'
    };
  }
  if (looksLikeMaterialExcerpt(value)) {
    const sourceMeta = detectMaterialSource(value) || { type: 'manual_notes', label: '手动整理', hasUrl: false, url: '' };
    return {
      kind: 'material_source',
      route: 'review',
      inputType: sourceMeta.type,
      shouldCreateFocus: false,
      sourceMeta,
      feedback: `收到${sourceMeta.label}。只处理你粘贴的摘录，先导入轻回访；不自动抓取链接、不解析文件、不直接给答案。`
    };
  }
  if (looksLikeReviewRequest(value)) {
    return {
      kind: 'review_request',
      route: 'review',
      shouldCreateFocus: false,
      feedback: '我先把它当成复习入口，等下可以变成一张回访卡。'
    };
  }
  if (looksLikeStuckPoint(value)) {
    return {
      kind: 'stuck_point',
      route: 'today_focus',
      shouldCreateFocus: true,
      feedback: '我记下来了，等下我们就修这个卡点。'
    };
  }
  if (looksLikeQuestion(value)) {
    return {
      kind: 'homework_question',
      route: 'tutor',
      shouldCreateFocus: false,
      feedback: '收到题目了。先说你想到的第一步，我只追问一小步。'
    };
  }
  return {
    kind: 'first_thought',
    route: 'tutor',
    shouldCreateFocus: false,
    feedback: '这一步有用，我帮你记到思路里。'
  };
}

module.exports = {
  IMPORT_CHIPS,
  classifyImportInput,
  detectMaterialSource,
  looksLikeMaterialExcerpt,
  looksLikeQuestion,
  looksLikeReviewRequest,
  looksLikeStuckPoint
};
