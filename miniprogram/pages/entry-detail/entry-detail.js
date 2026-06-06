const navigation = require('../../utils/navigation');

const SCENES = {
  upload: {
    badge: '材料入口',
    title: '上传材料，生成家长报告',
    subtitle: '把作业、错题、成绩或家长观察发进来。系统先分类，再给家长报告。',
    heroImage: '/assets/reference/upload-folder-stack-transparent.png',
    focusCopy: '先补真实材料；上传后直接生成家长报告。',
    primaryLabel: '上传材料',
    primaryRoute: '/pages/upload/upload?from=entry_upload_file&open=flow',
    secondaryLabel: '做快测',
    secondaryRoute: '/pages/profile/profile?from=entry_upload_quiz&panel=assessment&quick_assessment=1',
    cards: [
      { label: '天测/测评', value: '提取学习偏好、注意力和优势通道。', icon: '/assets/reference/entry-report.png', scene: 'report' },
      { label: '成绩/错题', value: '提取学科卡点、错因和回访优先级。', icon: '/assets/reference/entry-review.png', scene: 'review' },
      { label: '家长观察', value: '补足情绪、习惯和家庭配合线索。', icon: '/assets/reference/entry-parent.png', scene: 'parent' }
    ],
    spotlight: {
      kicker: '材料分类板',
      title: '材料先分类，报告才可靠',
      image: '/assets/reference/upload-folder-stack-transparent.png',
      metrics: [
        { label: '可上传', value: '6类' },
        { label: '报告', value: '可生成' },
        { label: '路线', value: '今晚用' }
      ],
      points: [
        '作业、错题、成绩、老师反馈和家长观察分开处理。',
        '材料不足时只提示补什么，不硬下结论。',
        '上传后直接进入家长报告。'
      ]
    }
  },
  report: {
    badge: '个性化报告',
    title: '先讲清证据，再匹配学习方法',
    subtitle: '报告先看材料来源、学习画像和当前表现是否互相支持，再给出今晚能执行的方法。',
    heroImage: '/assets/reference/report-radar-card-illustration.png',
    focusCopy: '先看证据是否足够，再决定今晚用哪一种学习方法。',
    primaryLabel: '查看证据报告',
    primaryRoute: '/pages/profile/profile?from=entry_report_evidence&open=flow',
    secondaryLabel: '补充测评/错题',
    secondaryRoute: '/pages/upload/upload?from=entry_report_material',
    cards: [
      { label: '证据来源', value: '测评、成绩、错题、对话和回访记录分开标注。', icon: '/assets/reference/entry-upload.png', scene: 'upload' },
      { label: '画像匹配', value: '看孩子更适合怎样输入、输出和反馈。', icon: '/assets/reference/entry-report.png', scene: 'report' },
      { label: '方法依据', value: '把费曼复述、苏格拉底追问、短周期回访变成动作。', icon: '/assets/reference/entry-tutor.png', scene: 'tutor' }
    ],
    spotlight: {
      kicker: '报告决策板',
      title: '证据先分层，结论才可信',
      image: '/assets/reference/report-radar-card-illustration.png',
      metrics: [
        { label: '材料完整度', value: '4类' },
        { label: '交叉验证', value: '3步' },
        { label: '方法匹配', value: '可执行' }
      ],
      points: [
        '先把测评、成绩、错题和家长观察分开看。',
        '只把互相支持的信号写进结论，弱证据进入待补充。',
        '每个建议都必须落到今晚能做的一步。'
      ]
    }
  },
  tutor: {
    badge: 'AI点拨提示',
    title: '先问一句，不替孩子做完',
    subtitle: '把题目、卡点或第一步发进来，系统只给最小提示，并把可复习的点沉淀下来。',
    heroImage: '/assets/reference/tutor-socratic-board-transparent.png',
    focusCopy: '先问一个更小的问题，不替孩子写完整答案。',
    primaryLabel: '进入追问对话',
    primaryRoute: '/pages/tutor/tutor?from=entry_tutor_first_step&open=flow',
    secondaryLabel: '说完去回访卡',
    secondaryRoute: '/pages/review/review?from=entry_tutor_card',
    cards: [
      { label: '孩子说', value: '我准备先看哪一个条件、哪一句话。', icon: '/assets/reference/entry-tutor.png', scene: 'tutor' },
      { label: 'AI问', value: '下一步只问一个更小的问题。', icon: '/assets/reference/entry-tutor.png', scene: 'tutor' },
      { label: '家长看', value: '只看第一步证据和明天怎么回访。', icon: '/assets/reference/entry-parent.png', scene: 'parent' }
    ],
    spotlight: {
      kicker: '点拨追问板',
      title: '不直接给答案，只追问下一小步',
      image: '/assets/reference/tutor-socratic-board-transparent.png',
      metrics: [
        { label: '提示层级', value: '3层' },
        { label: '答案边界', value: '守住' },
        { label: '沉淀卡点', value: '可回访' }
      ],
      points: [
        '先确认孩子已经说出的第一步，而不是替他开讲。',
        '只给最小提示：条件、依据、反例三选一。',
        '对话结束后生成回访卡，避免一次讲完就忘。'
      ]
    }
  },
  review: {
    badge: '短回访',
    title: '5 分钟验证记忆和迁移',
    subtitle: '先选今天要验证的一张真实卡，再进入 90 秒回忆或错因复盘。',
    heroImage: '/assets/reference/review-world-map-transparent.png',
    focusCopy: '先跑一张真实卡：回忆、迁移、记录明天要回看的点。',
    primaryLabel: '开始 90 秒回忆',
    primaryRoute: '/pages/review/review?mode=recall_return&from=entry_review',
    secondaryLabel: '回到AI点拨',
    secondaryRoute: '/pages/tutor/tutor?from=entry_review_repair',
    cards: [
      { label: '记忆', value: '能不能说出关键概念。', icon: '/assets/reference/entry-review.png', scene: 'review' },
      { label: '迁移', value: '换一道同类题还会不会开始。', icon: '/assets/reference/entry-review.png', scene: 'review' },
      { label: '证据', value: '只记录第一步、错因和明天回访。', icon: '/assets/reference/entry-report.png', scene: 'report' }
    ],
    spotlight: {
      kicker: '回访验证板',
      title: '先回忆，再迁移，最后回流证据',
      image: '/assets/reference/review-world-map-transparent.png',
      metrics: [
        { label: '单轮长度', value: '90秒' },
        { label: '验证目标', value: '迁移' },
        { label: '记录来源', value: '真回忆' }
      ],
      points: [
        '回访不是刷题，而是验证昨天那一步还记不记得。',
        '换一道同类题，看孩子能不能自己启动。',
        '只把错因和可迁移动作回流给报告和家长。'
      ]
    }
  },
  parent: {
    badge: '家长视图',
    title: '家长今晚只问一句',
    subtitle: '家长不用替孩子学题，只看证据、问一句低压问题、明天再回访。',
    heroImage: '/assets/reference/family-avatar-group-transparent.png',
    focusCopy: '先看孩子今天留下了什么证据，再问一句能启动行动的问题。',
    primaryLabel: '打开家长中心',
    primaryRoute: '/pages/profile/profile?from=entry_parent_report&open=flow',
    secondaryLabel: '补一条证据',
    secondaryRoute: '/pages/upload/upload?from=entry_parent_material',
    cards: [
      { label: '证据来自哪里', value: '测评、成绩、错题、对话和回访记录。', icon: '/assets/reference/entry-report.png', scene: 'report' },
      { label: '为什么这样学', value: '从学习偏好和当前卡点匹配方法。', icon: '/assets/reference/entry-tutor.png', scene: 'tutor' },
      { label: '今晚怎么做', value: '只给一张家庭行动卡，不制造焦虑。', icon: '/assets/reference/entry-parent.png', scene: 'parent' }
    ],
    spotlight: {
      kicker: '家长行动卡',
      title: '今晚别追问答案，只问起点',
      image: '/assets/reference/family-avatar-group-transparent.png',
      metrics: [
        { label: '今晚目标', value: '一句话' },
        { label: '家长角色', value: '观察者' },
        { label: '回访时间', value: '明天' }
      ],
      points: [
        '只问“你准备从哪一步开始”。',
        '记录孩子说出的第一步和卡住原因。',
        '明天用同类小题回忆，不翻旧账。'
      ]
    }
  }
};


Page({
  data: {
    sceneKey: 'upload',
    scene: SCENES.upload
  },

  onLoad(query = {}) {
    const key = query.scene || 'upload';
    this.setScene(key);
  },

  setScene(key = 'upload') {
    const sceneKey = SCENES[key] ? key : 'upload';
    this.setData({
      sceneKey,
      scene: SCENES[sceneKey]
    });
  },

  goPrimary() {
    navigation.navigateLearningRoute(this.data.scene.primaryRoute);
  },

  goSecondary() {
    navigation.navigateLearningRoute(this.data.scene.secondaryRoute);
  },

  goBack() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack();
      return;
    }
    navigation.switchTab('/pages/home/home');
  }
});
