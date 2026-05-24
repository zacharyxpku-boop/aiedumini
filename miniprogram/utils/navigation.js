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

function routeQuery(route) {
  const url = normalizeRoute(route);
  const index = url.indexOf('?');
  return index >= 0 ? url.slice(index + 1) : '';
}

function rememberTabRouteContext(route) {
  const url = normalizeRoute(route);
  const base = baseRoute(url);
  const query = routeQuery(url);
  if (!query || typeof wx === 'undefined' || !wx.setStorageSync) return;
  try {
    wx.setStorageSync('navigation.pendingTabRoute.v1', {
      route: url,
      base,
      query,
      createdAt: Date.now()
    });
  } catch (error) {
    // Navigation must still work when storage is unavailable.
  }
}

function navigateLearningRoute(route) {
  const url = normalizeRoute(route);
  if (!url || typeof wx === 'undefined') return false;
  const base = baseRoute(url);
  if (TAB_ROUTES.includes(base)) {
    rememberTabRouteContext(url);
    wx.switchTab({ url: base });
    return true;
  }
  wx.navigateTo({ url });
  return true;
}

module.exports = {
  navigateLearningRoute,
  normalizeRoute,
  baseRoute,
  routeQuery,
  rememberTabRouteContext
};
