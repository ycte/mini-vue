# Mini-Vue 学习指南

## 📚 目录

1. [学习方法：TDD (测试驱动开发)](#学习方法tdd-测试驱动开发)
2. [开发工作流](#开发工作流)
3. [学习路线图](#学习路线图)
4. [详细学习步骤](#详细学习步骤)
5. [验证方法](#验证方法)
6. [调试技巧](#调试技巧)
7. [常见问题](#常见问题)

---

## 学习方法：TDD (测试驱动开发)

### 什么是 TDD？

TDD (Test-Driven Development) 是一种软件开发方法：

1. **先写测试** - 描述期望的功能
2. **运行测试** - 看到测试失败（红灯）
3. **写实现** - 让测试通过（绿灯）
4. **重构** - 优化代码，保持测试通过

### 为什么用 TDD？

- ✅ **明确目标** - 测试就是需求文档
- ✅ **快速反馈** - 立即知道功能是否正确
- ✅ **重构安全** - 测试保证不会破坏已有功能
- ✅ **学习高效** - 每一步都有明确的成功标准

---

## 开发工作流

### 标准 TDD 循环

```bash
# 1. 启动测试监听模式
pnpm test

# 2. 编写测试用例（红灯 🔴）
# 在 packages/*/__tests__/ 目录下创建或编辑测试文件

# 3. 运行测试 - 看到失败
# vitest 会自动重新运行

# 4. 编写最小实现（绿灯 🟢）
# 在 packages/*/src/ 目录下编写代码

# 5. 测试通过后，重构代码
# 保持测试通过的同时优化代码

# 6. 提交代码
git add .
git commit -m "feat: 实现 xxx 功能"
```

### 目录结构约定

```
packages/
└── [package-name]/
    ├── src/              # 源代码
    │   ├── index.ts      # 导出文件
    │   └── xxx.ts        # 具体实现
    └── __tests__/        # 测试文件
        └── xxx.spec.ts   # 测试用例
```

---

## 学习路线图

### 阶段 1: Reactivity（响应式系统）⭐ 推荐从这里开始

**学习时长**: 3-5 天
**难度**: ⭐⭐☆☆☆
**核心概念**: 依赖收集、触发更新、Proxy

#### 1.1 Effect 与 Reactive

- [ ] effect 基础功能
- [ ] reactive 基础功能
- [ ] 依赖收集与触发
- [ ] effect 返回 runner
- [ ] effect.scheduler
- [ ] effect.stop

#### 1.2 Readonly

- [ ] readonly 基础功能
- [ ] isReactive / isReadonly
- [ ] 嵌套响应式对象
- [ ] shallowReadonly
- [ ] isProxy

#### 1.3 Ref

- [ ] ref 基础功能
- [ ] isRef / unRef
- [ ] proxyRefs
- [ ] ref 嵌套对象

#### 1.4 Computed

- [ ] computed 基础功能
- [ ] computed 缓存机制

### 阶段 2: Runtime-Core（运行时核心）

**学习时长**: 5-7 天
**难度**: ⭐⭐⭐⭐☆
**核心概念**: 组件系统、虚拟 DOM、渲染器

#### 2.1 组件初始化

- [ ] createVNode
- [ ] createComponentInstance
- [ ] setupComponent
- [ ] setupRenderEffect

#### 2.2 组件 Props

- [ ] props 初始化
- [ ] props 在 setup 中访问
- [ ] props 在 render 中访问

#### 2.3 组件 Emit

- [ ] emit 基础功能
- [ ] 支持短横线命名

#### 2.4 组件 Slots

- [ ] 基础 slots
- [ ] 具名 slots
- [ ] 作用域 slots

#### 2.5 更新流程

- [ ] element 更新
- [ ] props 更新
- [ ] children 更新
- [ ] 双端 diff 算法
- [ ] 组件更新
- [ ] nextTick

### 阶段 3: Compiler（编译器）

**学习时长**: 3-4 天
**难度**: ⭐⭐⭐☆☆
**核心概念**: 模板解析、AST、代码生成

- [ ] 解析插值 {{ }}
- [ ] 解析 element
- [ ] 解析 text
- [ ] transform 转换
- [ ] codegen 生成代码

---

## 详细学习步骤

以 **effect 功能**为例，演示完整的 TDD 流程：

### Step 1: 理解需求

阅读 Vue 3 文档，了解 effect 的预期行为：

```javascript
const state = reactive({ count: 0 })
effect(() => {
  console.log(state.count) // 自动执行，输出 0
})
state.count++ // 触发 effect 重新执行，输出 1
```

### Step 2: 编写测试用例

创建测试文件：`packages/reactivity/__tests__/effect.spec.ts`

```typescript
import { describe, expect, it } from 'vitest'
import { effect } from '../src/effect'
import { reactive } from '../src/reactive'

describe('effect', () => {
  it('should run the passed function', () => {
    const user = reactive({ age: 10 })
    let nextAge

    effect(() => {
      nextAge = user.age + 1
    })

    expect(nextAge).toBe(11)
  })

  it('should run when reactive data changes', () => {
    const user = reactive({ age: 10 })
    let nextAge

    effect(() => {
      nextAge = user.age + 1
    })

    expect(nextAge).toBe(11)

    // update
    user.age++
    expect(nextAge).toBe(12)
  })
})
```

### Step 3: 运行测试（红灯 🔴）

```bash
pnpm test

# 预期结果：测试失败
# ✗ effect > should run the passed function
#   Expected: 11
#   Received: undefined
```

### Step 4: 编写最小实现（绿灯 🟢）

在 `packages/reactivity/src/effect.ts` 中实现：

```typescript
// 1. 先让第一个测试通过
export function effect(fn: Function) {
  fn() // 立即执行一次
}

// 2. 添加依赖收集和触发机制
let activeEffect: any
const targetMap = new WeakMap()

export class ReactiveEffect {
  private _fn: any

  constructor(fn: any) {
    this._fn = fn
  }

  run() {
    activeEffect = this
    const result = this._fn()
    activeEffect = undefined
    return result
  }
}

export function effect(fn: Function) {
  const _effect = new ReactiveEffect(fn)
  _effect.run()
}

export function track(target: object, key: string | symbol) {
  if (!activeEffect)
    return

  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }

  dep.add(activeEffect)
}

export function trigger(target: object, key: string | symbol) {
  const depsMap = targetMap.get(target)
  if (!depsMap)
    return

  const dep = depsMap.get(key)
  if (!dep)
    return

  for (const effect of dep) {
    effect.run()
  }
}
```

在 `packages/reactivity/src/baseHandlers.ts` 中调用：

```typescript
function createGetter() {
  return function get(target: any, key: string | symbol) {
    const res = Reflect.get(target, key)
    // 依赖收集
    track(target, key)
    return res
  }
}

function createSetter() {
  return function set(target: any, key: string | symbol, value: any) {
    const res = Reflect.set(target, key, value)
    // 触发依赖
    trigger(target, key)
    return res
  }
}
```

### Step 5: 验证测试通过

```bash
# vitest 会自动重新运行测试

# 预期结果：
# ✓ effect > should run the passed function
# ✓ effect > should run when reactive data changes
```

### Step 6: 增加更多测试用例

```typescript
it('should return runner when call effect', () => {
  let foo = 10
  const runner = effect(() => {
    foo++
    return 'foo'
  })

  expect(foo).toBe(11)
  const r = runner()
  expect(foo).toBe(12)
  expect(r).toBe('foo')
})
```

### Step 7: 重复循环

1. 测试失败 → 2. 实现功能 → 3. 测试通过 → 4. 重构 → 5. 下一个测试

---

## 验证方法

### 1. 单元测试验证 ✅ 主要方法

```bash
# 运行所有测试
pnpm test

# 运行特定文件的测试
pnpm test effect

# 运行特定测试用例
pnpm test -t "should run when reactive data changes"
```

**优势**：

- 快速反馈
- 精准定位问题
- 可重复执行

### 2. 示例验证

在 `packages/vue/example/` 创建示例：

```javascript
// packages/vue/example/reactivity/App.js
import { effect, reactive } from '../../dist/mini-vue.esm-bundler.js'

export default {
  setup() {
    const state = reactive({ count: 0 })

    effect(() => {
      console.log('count changed:', state.count)
    })

    setTimeout(() => {
      state.count++
    }, 1000)
  },
  render() {
    return h('div', {}, 'Check console')
  },
}
```

```html
<!-- packages/vue/example/reactivity/index.html -->
<!doctype html>
<html>
  <head>
    <title>Reactivity Test</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
      import { createApp } from '../../dist/mini-vue.esm-bundler.js'
      import App from './App.js'
      createApp(App).mount(document.querySelector('#root'))
    </script>
  </body>
</html>
```

使用 Live Server 打开，查看控制台输出。

### 3. 对比参考实现

如果不确定实现是否正确，可以：

```bash
# 克隆原始仓库
git clone https://github.com/cuixiaorui/mini-vue.git mini-vue-reference

# 对比代码
code --diff packages/reactivity/src/effect.ts \
  ../mini-vue-reference/packages/reactivity/src/effect.ts
```

### 4. 功能清单检查

每完成一个功能，在清单上打勾：

- [ ] 所有测试用例通过
- [ ] 代码通过构建 (`pnpm build`)
- [ ] 示例运行正常
- [ ] 代码风格一致
- [ ] 添加必要注释

---

## 调试技巧

### 1. 使用 console.log

```typescript
export function effect(fn: Function) {
  console.log('effect called with:', fn)
  const _effect = new ReactiveEffect(fn)
  _effect.run()
}

export function track(target: object, key: string | symbol) {
  console.log('track:', target, key)
  // ...
}

export function trigger(target: object, key: string | symbol) {
  console.log('trigger:', target, key)
  // ...
}
```

### 2. 使用 debugger

```typescript
it('debug test', () => {
  debugger // 执行到这里会暂停
  const state = reactive({ count: 0 })
  effect(() => {
    debugger // effect 执行时暂停
    console.log(state.count)
  })
})
```

在 VS Code 中按 F5 调试测试。

### 3. 查看测试覆盖率

```bash
# 运行测试并生成覆盖率报告
pnpm test --coverage

# 查看报告
open coverage/index.html
```

### 4. 使用 vitest UI

```bash
# 启动可视化测试界面
pnpm test --ui

# 浏览器打开 http://localhost:51204/__vitest__/
```

---

## 常见问题

### Q1: 测试一直不通过怎么办？

**A**: 逐步调试

1. 确认测试用例本身是否正确
2. 添加 console.log 查看数据流
3. 对比原仓库的实现
4. 简化问题，先让最简单的情况通过

### Q2: 不知道如何实现某个功能？

**A**: 参考原仓库

1. 查看 [cuixiaorui/mini-vue](https://github.com/cuixiaorui/mini-vue) 的实现
2. 查看 [Vue 3 源码](https://github.com/vuejs/core)
3. 观看[视频教程](https://www.bilibili.com/video/BV1Zy4y1J73E)
4. 阅读 Vue 3 官方文档

### Q3: 如何知道测试用例是否覆盖了所有场景？

**A**: 参考原仓库的测试

```bash
# 查看原仓库的测试文件
# https://github.com/cuixiaorui/mini-vue/tree/master/packages/reactivity/__tests__

# 确保你的测试至少包含：
# - happy path (正常流程)
# - edge cases (边界情况)
# - error cases (错误处理)
```

### Q4: TypeScript 类型错误怎么办？

**A**:

1. 先让功能正常工作
2. 再完善类型定义
3. 参考 Vue 3 的类型定义

### Q5: 什么时候需要重构？

**A**: 当出现以下情况：

- 代码重复
- 函数过长（>20 行）
- 难以理解的逻辑
- 测试已经通过，但代码可以更优雅

**重构原则**: 小步快走，每次重构后立即运行测试确保通过。

---

## 推荐学习顺序

### Week 1: Reactivity 基础

- Day 1-2: effect + reactive
- Day 3: effect 进阶功能 (runner, scheduler, stop)
- Day 4: readonly
- Day 5: ref + computed

### Week 2: Reactivity 进阶 + Runtime 基础

- Day 1: 完善 reactivity 的边界情况
- Day 2-3: 组件初始化流程
- Day 4-5: element 渲染

### Week 3: Runtime 核心功能

- Day 1: props + emit
- Day 2: slots
- Day 3: provide/inject
- Day 4-5: 更新流程

### Week 4: Diff 算法 + Compiler

- Day 1-3: 双端 diff 算法
- Day 4-5: 编译器基础

---

## 学习资源

### 官方文档

- [Vue 3 官方文档](https://v3.vuejs.org/)
- [Vue 3 设计思路](https://v3.cn.vuejs.org/guide/contributing/writing-guide.html)

### 源码

- [Vue 3 源码](https://github.com/vuejs/core)
- [mini-vue 原仓库](https://github.com/cuixiaorui/mini-vue)

### 视频教程

- [崔效瑞 B站视频](https://www.bilibili.com/video/BV1Zy4y1J73E)

### 书籍

- 《Vue.js 设计与实现》- 霍春阳

---

## 提交规范

使用语义化提交信息：

```bash
# 新功能
git commit -m "feat(reactivity): 实现 effect 基础功能"

# 修复 bug
git commit -m "fix(reactivity): 修复 effect 重复收集依赖的问题"

# 测试
git commit -m "test(reactivity): 添加 effect.stop 测试用例"

# 文档
git commit -m "docs: 更新学习指南"

# 重构
git commit -m "refactor(reactivity): 优化 track 函数结构"
```

---

## 总结

记住 TDD 的核心循环：

```
🔴 Red (写测试 → 失败)
    ↓
🟢 Green (写实现 → 通过)
    ↓
🔵 Refactor (重构 → 优化)
    ↓
   重复...
```

**祝学习愉快！坚持下去，你会对 Vue 3 有深入的理解！** 💪

有问题随时：

1. 查看原仓库的实现
2. 运行测试查看具体错误
3. 添加 console.log 调试
4. 参考这份文档的调试技巧
