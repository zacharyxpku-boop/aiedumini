module.exports = new Proxy({
  buildCoverageMatrix: () => ({ rows: [], summary: '首版先处理用户主动输入的作业和卡点。' })
}, { get: (target, key) => key in target ? target[key] : (() => ({ rows: [] })) });
