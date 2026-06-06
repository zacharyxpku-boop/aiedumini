const navigation = require('../utils/navigation');

const tabs = ['/pages/tutor/tutor', '/pages/review/review', '/pages/profile/profile', '/pages/upload/upload'];

Component({
  lifetimes: {
    attached() {
      const pages = getCurrentPages();
      const route = pages.length ? `/${pages[pages.length - 1].route}` : '/pages/tutor/tutor';
      const selected = Math.max(0, tabs.indexOf(route));
      this.setData({ selected });
    }
  },

  pageLifetimes: {
    show() {
      const pages = getCurrentPages();
      const route = pages.length ? `/${pages[pages.length - 1].route}` : '/pages/tutor/tutor';
      const selected = Math.max(0, tabs.indexOf(route));
      this.setData({ selected });
    }
  },

  data: {
    selected: 0
  },

  methods: {
    switchTab(event) {
      const index = Number(event.currentTarget.dataset.index || 0);
      const path = event.currentTarget.dataset.path;
      if (!path || tabs.indexOf(path) < 0) return;
      this.setData({ selected: index });
      navigation.switchTab(path);
    }
  }
});
