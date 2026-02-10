import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  vue: true,
  formatters: {
    css: true,
    html: true,
    markdown: 'prettier',
  },
}, {
  rules: {
    // 允许使用 const enum
    'no-restricted-syntax': 'off',
    // 允许使用 new Function
    'no-new-func': 'off',
    // 允许使用 new Array
    'unicorn/no-new-array': 'off',
    // 允许在 while 中赋值
    'no-cond-assign': 'off',
    // 放松 JSDoc 规则
    'jsdoc/empty-tags': 'off',
    // 允许 import dist 文件夹
    'antfu/no-import-dist': 'off',
    // 允许使用全局 process
    'node/prefer-global/process': 'off',
    // 放松 enum 值规则
    'ts/prefer-literal-enum-member': 'off',
  },
})
