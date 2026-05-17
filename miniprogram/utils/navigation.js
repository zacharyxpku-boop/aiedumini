'use strict';

const TAB_ROUTES = [
  '/pages/home/home',
  '/pages/review/review',
  '/pages/focus/focus',
  '/pages/tools/tools',
  '/pages/profile/profile'
];

function normalizeRoute(route) {
  const value = typeof route === 'string' ? route.trim() : '';
  if (!value) return '';
  return value.startsWith('/') ? value : `/${value}`;
}

function baseRoute(route) {
  return normalizeRoute(route).split('?')[0];
}

function navigateLearningRoute(route) {
  const url = normalizeRoute(route);
  if (!url || typeof wx === 'undefined') return false;
  const base = baseRoute(url);
  if (TAB_ROUTES.includes(base)) {
    wx.switchTab({ url: base });
    return true;
  }
  wx.navigateTo({ url });
  return true;
}

module.exports = {
  navigateLearningRoute,
  normalizeRoute,
  baseRoute
};
