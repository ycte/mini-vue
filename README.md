# mini-vue

实现最简 vue3 模型，用于深入学习 vue3 核心原理

## 项目介绍

这是一个基于 [cuixiaorui/mini-vue](https://github.com/cuixiaorui/mini-vue) 的教育型 Vue 3 实现项目。通过手写 mini-vue 来学习 Vue 3 的核心原理，代码命名与 Vue 3 源码保持一致，方便后续对照学习。

## 特点

- ✅ 采用 pnpm workspace monorepo 架构
- ✅ 使用 TypeScript 开发
- ✅ 完整的响应式系统实现
- ✅ 平台无关的运行时核心
- ✅ 模板编译器实现
- ✅ 适合 TDD 方式逐步学习

## 项目结构

```
mini-vue/
├── packages/
│   ├── reactivity/        # 响应式系统
│   ├── runtime-core/      # 运行时核心（平台无关）
│   ├── runtime-dom/       # 运行时 DOM（浏览器）
│   ├── runtime-test/      # 测试运行时
│   ├── compiler-core/     # 编译器核心
│   ├── shared/            # 共享工具函数
│   └── vue/               # 完整版（运行时 + 编译器）
├── pnpm-workspace.yaml    # pnpm workspace 配置
├── tsconfig.json          # TypeScript 配置
├── rollup.config.js       # Rollup 打包配置
└── vitest.config.ts       # Vitest 测试配置
```

## 快速开始

### 安装依赖

```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

### 构建项目

```bash
pnpm build
```

构建完成后会在 `packages/vue/dist/` 目录生成：

- `mini-vue.cjs.js` - CommonJS 格式
- `mini-vue.esm-bundler.js` - ES Module 格式

### 运行示例

1. 使用 Live Server 或其他 HTTP 服务器打开 `packages/vue/example/helloWorld/index.html`
2. 推荐使用 [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) VSCode 插件

### 运行测试

```bash
pnpm test
```

## 功能清单

### reactivity（响应式系统）

- [x] reactive - 创建响应式对象
- [x] readonly - 创建只读对象
- [x] shallowReadonly - 创建浅层只读对象
- [x] ref - 创建响应式引用
- [x] isRef / unRef / proxyRefs - ref 相关工具函数
- [x] computed - 计算属性
- [x] effect - 副作用函数
- [x] stop - 停止副作用
- [x] isReactive / isReadonly / isProxy - 类型判断

### runtime-core（运行时核心）

- [x] 支持组件类型
- [x] 支持 element 类型
- [x] 初始化 props
- [x] setup 可获取 props 和 context
- [x] 支持 component emit
- [x] 支持 proxy
- [x] 可以在 render 函数中获取 setup 返回的对象
- [x] nextTick 的实现
- [x] 支持 getCurrentInstance
- [x] 支持 provide/inject
- [x] 支持最基础的 slots
- [x] 支持 Text 类型节点
- [x] 支持 Fragment 类型节点
- [x] 支持 $el api

#### 更新流程

- [x] 更新 element 的 props
- [x] 更新 element 的 children
- [x] 双端对比 diff 算法（最长递增子序列）
- [x] 组件更新流程

### compiler-core（编译器）

- [x] 解析插值 `{{ }}`
- [x] 解析 element 标签
- [x] 解析 text 文本
- [x] AST 转换
- [x] 代码生成

### runtime-dom（DOM 运行时）

- [x] 支持 custom renderer（自定义渲染器）
- [x] DOM 元素操作
- [x] DOM 属性处理
- [x] 事件处理

## 学习路径（TDD 方式）

建议按照以下顺序学习：

### 1. Reactivity（响应式系统）

1. 实现 effect & reactive & 依赖收集 & 触发依赖
2. 实现 effect 返回 runner
3. 实现 effect 的 scheduler 功能
4. 实现 effect 的 stop 功能
5. 实现 readonly 功能
6. 实现 isReactive 和 isReadonly
7. 实现嵌套 reactive
8. 实现 shallowReadonly
9. 实现 isProxy
10. 实现 ref
11. 实现 isRef 和 unRef
12. 实现 proxyRefs
13. 实现 computed

### 2. Runtime-Core（运行时核心）

1. 初始化 component 主流程
2. 实现组件代理对象
3. 实现 shapeFlags
4. 实现注册事件功能
5. 实现组件 props
6. 实现组件 emit
7. 实现组件 slots
8. 实现 Fragment 和 Text 类型节点
9. 实现 getCurrentInstance
10. 实现 provide/inject
11. 实现自定义渲染器
12. 更新 element 流程
13. 更新 element props
14. 更新 children
15. 双端对比 diff 算法
16. 实现组件更新
17. 实现 nextTick

### 3. Compiler-Core（编译器）

1. 实现解析插值功能
2. 实现解析 element 标签
3. 实现解析 text 功能
4. 实现 transform 功能
5. 实现代码生成 string 类型
6. 实现代码生成插值类型
7. 实现编译 template 成 render 函数

## 参考资料

- [Vue 3 官方文档](https://v3.vuejs.org/)
- [Vue 3 源码](https://github.com/vuejs/core)
- [mini-vue 原始仓库](https://github.com/cuixiaorui/mini-vue)
- [崔效瑞的视频课程](https://www.bilibili.com/video/BV1Zy4y1J73E)

## License

MIT
