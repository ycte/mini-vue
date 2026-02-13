# Runtime-Core 运行时核心实现分析

本文档详细分析 `packages/runtime-core` 包的实现原理和设计思路。

---

## 📚 目录

1. [核心概念](#核心概念)
2. [整体架构](#整体架构)
3. [VNode 虚拟节点](#vnode-虚拟节点)
4. [Component 组件系统](#component-组件系统)
5. [Renderer 渲染器](#renderer-渲染器)
6. [Diff 算法](#diff-算法)
7. [Scheduler 调度器](#scheduler-调度器)
8. [依赖注入系统](#依赖注入系统)
9. [设计亮点](#设计亮点)

---

## 核心概念

### Runtime-Core 的核心思想

Vue 3 的运行时核心基于以下核心概念：

1. **VNode (虚拟节点)**: 描述真实 DOM 的 JavaScript 对象
2. **Component (组件)**: 可复用的 UI 单元，包含状态、逻辑和模板
3. **Renderer (渲染器)**: 将 VNode 转换为真实 DOM 的核心引擎
4. **Diff 算法**: 高效更新 DOM 的算法，最小化 DOM 操作
5. **Scheduler (调度器)**: 异步更新队列，批量处理更新

### 数据结构设计

```
VNode 结构:
{
  type: Component | string | Symbol,
  props: { [key: string]: any },
  children: string | VNode[] | { [key: string]: Function },
  el: HTMLElement | null,
  shapeFlag: number,
  key: any
}

Component Instance 结构:
{
  vnode: VNode,
  type: Component,
  setupState: { [key: string]: any },
  props: { [key: string]: any },
  slots: { [key: string]: Function },
  provides: { [key: string | symbol]: any },
  parent: ComponentInstance | null,
  proxy: Proxy,
  render: Function,
  ...
}
```

---

## 整体架构

### 模块划分

```
packages/runtime-core/src/
├── vnode.ts                    # VNode 创建和工具函数
├── h.ts                        # h 函数（createElement）
├── component.ts                # 组件实例创建和初始化
├── componentProps.ts           # Props 处理
├── componentEmits.ts           # 事件触发
├── componentSlots.ts           # Slots 处理
├── componentPublicInstance.ts  # 组件实例代理
├── renderer.ts                 # 渲染器核心
├── scheduler.ts                # 调度器
├── apiInject.ts               # provide/inject API
├── createApp.ts               # 应用实例创建
└── helpers/
    └── renderSlot.ts          # Slot 渲染辅助函数
```

### 核心 API

| API                                    | 功能           | 返回值            |
| -------------------------------------- | -------------- | ----------------- |
| `h(type, props?, children?)`           | 创建 VNode     | VNode             |
| `createVNode(type, props?, children?)` | 创建 VNode     | VNode             |
| `createTextVNode(text)`                | 创建文本节点   | VNode             |
| `createRenderer(options)`              | 创建渲染器     | Renderer          |
| `provide(key, value)`                  | 提供数据       | void              |
| `inject(key, defaultValue?)`           | 注入数据       | any               |
| `getCurrentInstance()`                 | 获取当前实例   | ComponentInstance |
| `nextTick(fn?)`                        | DOM 更新后执行 | Promise           |

---

## VNode 虚拟节点

### 1. createVNode 函数

**文件**: `src/vnode.ts`

```typescript
export function createVNode(type: any, props?: any, children?: any) {
  const vnode = {
    type, // 节点类型
    props: props || {}, // 属性
    children, // 子节点
    el: null, // 对应的真实 DOM
    shapeFlag: getShapeFlag(type), // 类型标识
    key: props?.key, // 用于 diff 的 key
  }

  // 基于 children 设置 shapeFlag
  if (typeof children === 'string') {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
  }
  else if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  }

  // 组件 + object children = slots
  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    if (typeof children === 'object') {
      vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN
    }
  }

  return vnode
}
```

**设计要点**：

1. **ShapeFlags 优化**: 使用位运算标识 VNode 类型，快速判断
2. **懒创建**: el 初始为 null，挂载时才创建真实 DOM
3. **灵活的 children**: 支持 string、Array、Object (slots)

### 2. ShapeFlags 类型标识

**文件**: `packages/shared/src/shapeFlags.ts`

```typescript
export const enum ShapeFlags {
  ELEMENT = 1, // 0001 - HTML 元素
  STATEFUL_COMPONENT = 1 << 1, // 0010 - 有状态组件
  TEXT_CHILDREN = 1 << 2, // 0100 - 文本子节点
  ARRAY_CHILDREN = 1 << 3, // 1000 - 数组子节点
  SLOTS_CHILDREN = 1 << 4, // 10000 - slots 子节点
}
```

**使用位运算的优势**：

- 快速判断: `vnode.shapeFlag & ShapeFlags.ELEMENT`
- 组合标识: `shapeFlag |= ShapeFlags.TEXT_CHILDREN`
- 性能优秀: 位运算比字符串/对象比较快得多

### 3. h 函数

**文件**: `src/h.ts`

```typescript
export function h(type: any, props: any = null, children: any = []) {
  return createVNode(type, props, children)
}
```

**设计思想**：

- 作为 `createVNode` 的便捷方式
- 更符合 JSX 的使用习惯
- 简化 API 调用

### 4. 特殊节点类型

```typescript
export const Fragment = Symbol('Fragment') // 片段节点
export const Text = Symbol('Text') // 文本节点

export function createTextVNode(text: string = ' ') {
  return createVNode(Text, {}, text)
}
```

**Fragment 的作用**：

- 允许组件返回多个根节点
- 不会在 DOM 中创建额外的包裹元素

---

## Component 组件系统

### 1. 组件实例创建

**文件**: `src/component.ts`

```typescript
export function createComponentInstance(vnode: any, parent: any) {
  const component = {
    vnode, // 组件的 VNode
    type: vnode.type, // 组件定义
    setupState: {}, // setup 返回值
    props: {}, // 组件 props
    slots: {}, // 组件 slots
    provides: parent ? parent.provides : {}, // 继承父组件 provides
    parent, // 父组件实例
    isMounted: false, // 是否已挂载
    subTree: null, // 子树 VNode
    emit: () => {}, // emit 函数
    proxy: null, // 组件代理对象
    next: null, // 更新时的新 VNode
  }

  component.emit = emit as any
  return component
}
```

**设计要点**：

- **继承 provides**: 支持跨层级依赖注入
- **parent 引用**: 用于 provide/inject 查找
- **isMounted 标识**: 区分挂载和更新逻辑

### 2. 组件初始化

```typescript
export function setupComponent(instance: any) {
  const { props, children } = instance.vnode

  // 1. 初始化 props
  initProps(instance, props)

  // 2. 初始化 slots
  initSlots(instance, children)

  // 3. 调用 setup 函数
  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance: any) {
  // 创建组件代理
  instance.proxy = new Proxy(
    { _: instance },
    PublicInstanceProxyHandlers
  )

  const Component = instance.type
  const { setup } = Component

  if (setup) {
    // 设置当前实例（用于 getCurrentInstance）
    setCurrentInstance(instance)

    // 调用 setup，传入 props 和 context
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit.bind(null, instance),
      slots: instance.slots,
    })

    // 清除当前实例
    setCurrentInstance(null)

    // 处理 setup 返回值
    handleSetupResult(instance, setupResult)
  }
  else {
    finishComponentSetup(instance)
  }
}
```

**执行流程**：

1. 初始化 props 和 slots
2. 创建组件代理对象（用于 this 访问）
3. 设置当前实例上下文
4. 调用 setup 函数
5. 处理 setup 返回值
6. 设置 render 函数

### 3. Props 处理

**文件**: `src/componentProps.ts`

```typescript
export function initProps(instance: any, rawProps: any) {
  instance.props = rawProps || {}
}
```

**特点**：

- Props 是 `shallowReadonly` 的（在 setup 中传入时处理）
- 只读保护，防止子组件修改父组件数据
- 支持通过 `instance.proxy` 访问

### 4. Emit 事件系统

**文件**: `src/componentEmits.ts`

```typescript
export function emit(instance: any, event: string, ...args: any[]) {
  const { props } = instance

  // 转换事件名: add-foo -> onAddFoo
  const handlerName = toHandlerKey(camelize(event))
  const handler = props[handlerName]

  // 调用事件处理函数
  handler && handler(...args)
}
```

**命名转换**：

- `add` → `onAdd`
- `add-foo` → `onAddFoo`
- `addFoo` → `onAddFoo`

**使用示例**：

```typescript
// 子组件
emit('add-todo', todo)

// 父组件
h(TodoItem, { onAddTodo: handleAddTodo })
```

### 5. Slots 插槽系统

**文件**: `src/componentSlots.ts`

```typescript
export function initSlots(instance: any, children: any) {
  const { vnode } = instance

  // 只有组件的 object children 才是 slots
  if (vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    normalizeObjectSlots(children, instance.slots)
  }
}

function normalizeObjectSlots(children: any, slots: any) {
  for (const key in children) {
    const value = children[key]
    // Slot 是函数，支持作用域插槽
    slots[key] = (props: any) => normalizeSlotValue(value(props))
  }
}
```

**Slots 类型**：

- **默认插槽**: `{ default: () => [...] }`
- **具名插槽**: `{ header: () => [...], footer: () => [...] }`
- **作用域插槽**: `{ default: (props) => [...] }`

### 6. 组件代理对象

**文件**: `src/componentPublicInstance.ts`

```typescript
const publicPropertiesMap: any = {
  $el: (i: any) => i.vnode.el,
  $slots: (i: any) => i.slots,
  $props: (i: any) => i.props,
}

export const PublicInstanceProxyHandlers = {
  get({ _: instance }: any, key: string) {
    const { setupState, props } = instance

    // 1. 访问 setupState
    if (hasOwn(setupState, key)) {
      return setupState[key]
    }
    // 2. 访问 props
    else if (hasOwn(props, key)) {
      return props[key]
    }

    // 3. 访问公共属性 ($el, $slots, $props)
    const publicGetter = publicPropertiesMap[key]
    if (publicGetter) {
      return publicGetter(instance)
    }
  },

  has({ _: instance }: any, key: string) {
    const { setupState, props } = instance
    return hasOwn(setupState, key) || hasOwn(props, key) || key in publicPropertiesMap
  },
}
```

**访问优先级**：

1. setupState (setup 返回值)
2. props
3. 公共属性 ($el, $slots, $props)

**使用示例**：

```typescript
const Comp = {
  setup() {
    return { count: 0 }
  },
  render() {
    return h('div', {}, this.count) // 访问 setupState
  }
}
```

---

## Renderer 渲染器

### 1. 渲染器架构

**文件**: `src/renderer.ts`

```typescript
export function createRenderer(options: any) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
    // ...
  } = options

  function render(vnode: any, container: any) {
    patch(null, vnode, container, null)
  }

  function patch(n1: any, n2: any, container: any, parentComponent: any) {
    const { type, shapeFlag } = n2

    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent)
        break
      case Text:
        processText(n1, n2, container)
        break
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent)
        }
        else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parentComponent)
        }
        break
    }
  }

  return {
    createApp: createAppAPI(render),
  }
}
```

**设计亮点**：

- **自定义渲染器**: 通过 options 注入平台特定的 DOM 操作
- **统一 patch**: 所有节点类型都通过 patch 函数处理
- **类型分发**: 根据 shapeFlag 和 type 分发到不同的处理函数

### 2. 元素挂载

```typescript
function mountElement(vnode: any, container: any, parentComponent: any) {
  // 1. 创建 DOM 元素
  const el = (vnode.el = hostCreateElement(vnode.type))

  const { children, shapeFlag, props } = vnode

  // 2. 处理 children
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    hostSetElementText(el, children)
  }
  else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(children, el, parentComponent)
  }

  // 3. 处理 props
  for (const key in props) {
    const val = props[key]
    hostPatchProp(el, key, null, val)
  }

  // 4. 插入到容器
  hostInsert(el, container)
}
```

**执行顺序**：

1. 创建元素
2. 处理子节点
3. 设置属性
4. 插入 DOM

### 3. 元素更新

```typescript
function patchElement(
  n1: any,
  n2: any,
  container: any,
  parentComponent: any,
) {
  const oldProps = n1.props || {}
  const newProps = n2.props || {}
  const el = (n2.el = n1.el) // 复用 DOM 元素

  // 1. 更新 props
  patchProps(el, oldProps, newProps)

  // 2. 更新 children
  patchChildren(n1, n2, el, parentComponent)
}

function patchProps(el: any, oldProps: any, newProps: any) {
  if (oldProps !== newProps) {
    // 更新变化的 props
    for (const key in newProps) {
      const prevProp = oldProps[key]
      const nextProp = newProps[key]
      if (prevProp !== nextProp) {
        hostPatchProp(el, key, prevProp, nextProp)
      }
    }

    // 删除不存在的 props
    if (Object.keys(oldProps).length > 0) {
      for (const key in oldProps) {
        if (!(key in newProps)) {
          hostPatchProp(el, key, oldProps[key], null)
        }
      }
    }
  }
}
```

### 4. 组件挂载

```typescript
function mountComponent(
  initialVNode: any,
  container: any,
  parentComponent: any,
) {
  // 1. 创建组件实例
  const instance = (initialVNode.component = createComponentInstance(
    initialVNode,
    parentComponent,
  ))

  // 2. 初始化组件
  setupComponent(instance)

  // 3. 设置渲染副作用
  setupRenderEffect(instance, initialVNode, container)
}

function setupRenderEffect(instance: any, initialVNode: any, container: any) {
  instance.update = effect(
    () => {
      if (!instance.isMounted) {
        // 挂载阶段
        const { proxy } = instance
        const subTree = (instance.subTree = normalizeVNode(
          instance.render.call(proxy, proxy)
        ))

        patch(null, subTree, container, instance)

        initialVNode.el = subTree.el
        instance.isMounted = true
      }
      else {
        // 更新阶段
        const { next, vnode } = instance

        if (next) {
          next.el = vnode.el
          updateComponentPreRender(instance, next)
        }

        const { proxy } = instance
        const subTree = normalizeVNode(instance.render.call(proxy, proxy))
        const prevSubTree = instance.subTree
        instance.subTree = subTree

        patch(prevSubTree, subTree, prevSubTree.el, instance)
      }
    },
    {
      scheduler() {
        queueJob(instance.update)
      },
    },
  )
}
```

**关键点**：

- 使用 `effect` 包裹 render，实现响应式更新
- `scheduler` 配合调度器实现异步批量更新
- 区分挂载和更新阶段

---

## Diff 算法

### 1. Children 更新策略

```typescript
function patchChildren(
  n1: any,
  n2: any,
  container: any,
  parentComponent: any,
) {
  const { shapeFlag: prevShapeFlag, children: c1 } = n1
  const { shapeFlag, children: c2 } = n2

  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // 新 children 是文本
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 老 children 是数组，卸载所有子节点
      unmountChildren(c1)
    }
    if (c1 !== c2) {
      // 设置文本内容
      hostSetElementText(container, c2)
    }
  }
  else {
    // 新 children 是数组
    if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 老 children 是文本，清空后挂载新节点
      hostSetElementText(container, '')
      mountChildren(c2, container, parentComponent)
    }
    else {
      // 老 children 也是数组，执行 diff
      patchKeyedChildren(c1, c2, container, parentComponent)
    }
  }
}
```

**四种场景**：

1. Text → Text: 直接替换文本
2. Text → Array: 清空文本，挂载数组
3. Array → Text: 卸载数组，设置文本
4. Array → Array: 执行 diff 算法

### 2. Diff 算法 - 双端对比

```typescript
function patchKeyedChildren(
  c1: any,
  c2: any,
  container: any,
  parentComponent: any,
) {
  let i = 0
  const l2 = c2.length
  let e1 = c1.length - 1 // 老节点结束索引
  let e2 = l2 - 1 // 新节点结束索引

  function isSameVNodeType(n1: any, n2: any) {
    return n1.type === n2.type && n1.key === n2.key
  }

  // 1. 从左侧开始对比
  while (i <= e1 && i <= e2) {
    const n1 = c1[i]
    const n2 = c2[i]

    if (isSameVNodeType(n1, n2)) {
      patch(n1, n2, container, parentComponent)
    }
    else {
      break
    }
    i++
  }

  // 2. 从右侧开始对比
  while (i <= e1 && i <= e2) {
    const n1 = c1[e1]
    const n2 = c2[e2]

    if (isSameVNodeType(n1, n2)) {
      patch(n1, n2, container, parentComponent)
    }
    else {
      break
    }
    e1--
    e2--
  }

  // 3. 新节点比老节点多（新增）
  if (i > e1) {
    if (i <= e2) {
      const nextPos = e2 + 1
      const anchor = nextPos < l2 ? c2[nextPos].el : null
      while (i <= e2) {
        patch(null, c2[i], container, parentComponent)
        i++
      }
    }
  }
  // 4. 老节点比新节点多（删除）
  else if (i > e2) {
    while (i <= e1) {
      hostRemove(c1[i].el)
      i++
    }
  }
  // 5. 中间乱序部分
  else {
    // ... 见下一节
  }
}
```

**示例**：

左侧对比：

```
old: a b c d e
new: a b f g e
     ^
     i=2, 相同节点已 patch
```

右侧对比：

```
old: a b c d e
new: a b f g e
           ^
           e1=3, e2=3, 相同节点已 patch
```

### 3. Diff 算法 - 乱序处理

```typescript
// 5. 中间对比（续）
else {
  const s1 = i  // 老节点开始索引
  const s2 = i  // 新节点开始索引

  const toBePatched = e2 - s2 + 1
  let patched = 0

  // 建立 key -> index 映射
  const keyToNewIndexMap = new Map()
  for (let i = s2; i <= e2; i++) {
    const nextChild = c2[i]
    keyToNewIndexMap.set(nextChild.key, i)
  }

  // 新节点索引 -> 老节点索引映射
  const newIndexToOldIndexMap = new Array(toBePatched)
  for (let i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0

  let moved = false
  let maxNewIndexSoFar = 0

  // 遍历老节点
  for (let i = s1; i <= e1; i++) {
    const prevChild = c1[i]

    // 如果已经 patch 完所有新节点，剩余老节点删除
    if (patched >= toBePatched) {
      hostRemove(prevChild.el)
      continue
    }

    let newIndex
    // 通过 key 查找
    if (prevChild.key != null) {
      newIndex = keyToNewIndexMap.get(prevChild.key)
    }
    // 没有 key，遍历查找
    else {
      for (let j = s2; j <= e2; j++) {
        if (isSameVNodeType(prevChild, c2[j])) {
          newIndex = j
          break
        }
      }
    }

    // 在新节点中找不到，删除
    if (newIndex === undefined) {
      hostRemove(prevChild.el)
    }
    // 找到了，patch
    else {
      // 检查是否需要移动
      if (newIndex >= maxNewIndexSoFar) {
        maxNewIndexSoFar = newIndex
      } else {
        moved = true
      }

      newIndexToOldIndexMap[newIndex - s2] = i + 1
      patch(prevChild, c2[newIndex], container, parentComponent)
      patched++
    }
  }

  // 处理移动和新增
  const increasingNewIndexSequence = moved
    ? getSequence(newIndexToOldIndexMap)
    : []
  let j = increasingNewIndexSequence.length - 1

  // 倒序遍历，保证稳定的锚点
  for (let i = toBePatched - 1; i >= 0; i--) {
    const nextIndex = i + s2
    const nextChild = c2[nextIndex]
    const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null

    // 新增节点
    if (newIndexToOldIndexMap[i] === 0) {
      patch(null, nextChild, container, parentComponent)
    }
    // 移动节点
    else if (moved) {
      if (j < 0 || i !== increasingNewIndexSequence[j]) {
        hostInsert(nextChild.el, container, anchor)
      } else {
        j--
      }
    }
  }
}
```

**优化策略**：

1. 使用 key 快速查找节点
2. 使用最长递增子序列减少移动次数
3. 倒序遍历保证锚点稳定

### 4. 最长递增子序列

```typescript
function getSequence(arr: number[]): number[] {
  const p = arr.slice()
  const result = [0]
  let i, j, u, v, c
  const len = arr.length

  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      j = result[result.length - 1]
      if (arr[j] < arrI) {
        p[i] = j
        result.push(i)
        continue
      }

      // 二分查找
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1
        if (arr[result[c]] < arrI) {
          u = c + 1
        }
        else {
          v = c
        }
      }

      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }

  // 回溯
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }

  return result
}
```

**作用**：

- 找出不需要移动的最长节点序列
- 只移动不在序列中的节点
- 时间复杂度: O(n log n)

**示例**：

```
old: a b c d e
new: a d b c e

newIndexToOldIndexMap: [0, 3, 1, 2, 0]
                        (d, b, c 部分)

最长递增子序列: [1, 2]  (b, c 索引)
需要移动: d
```

---

## Scheduler 调度器

### 1. 任务队列

**文件**: `src/scheduler.ts`

```typescript
const queue: any[] = []
const p = Promise.resolve()
let isFlushPending = false

export function queueJob(job: any) {
  if (!queue.includes(job)) {
    queue.push(job)
    queueFlush()
  }
}

function queueFlush() {
  if (isFlushPending)
    return
  isFlushPending = true

  nextTick(flushJobs)
}

function flushJobs() {
  isFlushPending = false
  let job
  while ((job = queue.shift())) {
    job && job()
  }
}
```

**特点**：

- **去重**: 同一个 job 只会添加一次
- **异步执行**: 使用 Promise 异步执行
- **批量处理**: 在一个 tick 中执行所有任务

### 2. nextTick

```typescript
export function nextTick(fn?: () => void) {
  return fn ? p.then(fn) : p
}
```

**使用场景**：

```typescript
const count = ref(0)

count.value++
count.value++
count.value++

nextTick(() => {
  // DOM 已更新
  console.log(document.querySelector('#count').textContent) // '3'
})
```

**执行流程**：

```
1. count.value++ (触发 effect.scheduler)
   └─> queueJob(instance.update)
       └─> queue: [update]

2. count.value++ (触发 effect.scheduler)
   └─> queueJob(instance.update)
       └─> queue: [update] (去重，不添加)

3. count.value++ (触发 effect.scheduler)
   └─> queueJob(instance.update)
       └─> queue: [update] (去重，不添加)

4. 同步代码执行完毕

5. Promise.then 回调执行
   └─> flushJobs()
       └─> update() (只执行一次)

6. nextTick 回调执行
```

---

## 依赖注入系统

### 1. provide 提供数据

**文件**: `src/apiInject.ts`

```typescript
export function provide(key: string | symbol, value: any) {
  const currentInstance: any = getCurrentInstance()

  if (currentInstance) {
    let { provides } = currentInstance
    const parentProvides = currentInstance.parent?.provides

    // 初始化时，继承父组件的 provides
    if (provides === parentProvides) {
      provides = currentInstance.provides = Object.create(parentProvides)
    }

    provides[key] = value
  }
}
```

**设计要点**：

- **原型链继承**: 使用 `Object.create` 实现原型链查找
- **写时复制**: 只有在提供新数据时才创建新对象
- **性能优化**: 避免不必要的对象复制

### 2. inject 注入数据

```typescript
export function inject(key: string | symbol, defaultValue?: any) {
  const currentInstance: any = getCurrentInstance()

  if (currentInstance) {
    const parentProvides = currentInstance.parent?.provides

    if (parentProvides && key in parentProvides) {
      return parentProvides[key]
    }
    else if (defaultValue !== undefined) {
      if (typeof defaultValue === 'function') {
        return defaultValue()
      }
      return defaultValue
    }
  }
}
```

**查找机制**：

1. 查找父组件的 provides
2. 找不到返回默认值
3. 默认值为函数则执行

**使用示例**：

```typescript
// 祖先组件
provide('theme', 'dark')

// 父组件
provide('user', { name: 'John' })

// 当前组件
const theme = inject('theme') // 'dark'
const user = inject('user') // { name: 'John' }
const lang = inject('lang', 'en') // 'en' (默认值)
```

**原型链查找**：

```
GrandParent.provides = { theme: 'dark' }
           ↑
Parent.provides = Object.create(GrandParent.provides)
Parent.provides.user = { name: 'John' }
           ↑
Child.provides = Parent.provides (初始继承)
```

---

## 设计亮点

### 1. 位运算优化 ShapeFlags

```typescript
// 判断类型
if (vnode.shapeFlag & ShapeFlags.ELEMENT) { ... }

// 组合类型
vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN

// 多条件判断
if (vnode.shapeFlag & (ShapeFlags.ELEMENT | ShapeFlags.COMPONENT)) { ... }
```

**优势**：

- 性能极高（位运算比字符串/对象比较快几十倍）
- 可以组合多个标识
- 内存占用小

### 2. 自定义渲染器

```typescript
const renderer = createRenderer({
  createElement(type) { ... },
  insert(el, parent, anchor) { ... },
  patchProp(el, key, oldValue, newValue) { ... },
  // ...
})
```

**优势**：

- 跨平台支持（Web、Canvas、Native）
- 核心逻辑复用
- 灵活性高

**示例 - Canvas 渲染器**：

```typescript
const canvasRenderer = createRenderer({
  createElement(type) {
    return { type, x: 0, y: 0, width: 0, height: 0 }
  },
  insert(el, parent) {
    parent.children.push(el)
  },
  patchProp(el, key, oldValue, newValue) {
    el[key] = newValue
  },
  // ...
})
```

### 3. 组件代理优化访问

```typescript
instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers)
```

**优势**：

- 统一访问接口
- 优先级控制（setupState > props > $el）
- 支持 `in` 操作符

### 4. 异步调度批量更新

```typescript
instance.update = effect(
  () => { ... },
  {
    scheduler() {
      queueJob(instance.update)
    },
  },
)
```

**优势**：

- 多次修改只触发一次更新
- 减少 DOM 操作
- 提升性能

**对比**：

```typescript
// 没有调度器：3 次 DOM 更新
count.value++ // DOM 更新
count.value++ // DOM 更新
count.value++ // DOM 更新

// 有调度器：1 次 DOM 更新
count.value++ // 加入队列
count.value++ // 加入队列（去重）
count.value++ // 加入队列（去重）
// nextTick 后统一更新
```

### 5. Fragment 支持多根节点

```typescript
case Fragment:
  mountChildren(vnode.children, container, parentComponent)
  break
```

**优势**：

- 组件可以返回多个根节点
- 不创建额外的包裹元素
- 更灵活的组件结构

**示例**：

```typescript
const Comp = {
  render() {
    return h(Fragment, null, [
      h('div', null, 'Header'),
      h('div', null, 'Content'),
      h('div', null, 'Footer'),
    ])
  }
}
```

### 6. 双向绑定的 emit

```typescript
emit(instance, event, ...args)
```

**优势**：

- 简洁的事件触发
- 支持多种命名格式
- 自动大小写转换

### 7. Diff 算法优化

**最长递增子序列优化**：

- 减少节点移动次数
- 只移动必要的节点
- 时间复杂度 O(n log n)

**对比**：

```
// 没有优化：移动 3 次
old: a b c d
new: d a b c
移动: d→前, a→前, b→前

// 有优化：移动 1 次
最长递增子序列: a b c (不动)
只移动: d
```

---

## 测试覆盖

当前实现的测试文件：

### vnode.spec.ts

- ✅ 创建元素 VNode
- ✅ 创建组件 VNode
- ✅ ShapeFlags 正确设置
- ✅ 支持 string/array/object children
- ✅ createTextVNode 创建文本节点

### h.spec.ts

- ✅ h 函数基础功能
- ✅ 支持 props 和 children

### component.spec.ts

- ✅ createComponentInstance 创建实例
- ✅ setupComponent 初始化组件
- ✅ setup 函数调用和返回值处理
- ✅ getCurrentInstance 获取当前实例
- ✅ 组件代理访问

### componentProps.spec.ts

- ✅ initProps 初始化
- ✅ props 在 setup 中可访问
- ✅ props 在 render 中可访问
- ✅ props 是只读的

### componentEmits.spec.ts

- ✅ emit 触发事件
- ✅ 支持驼峰和短横线命名
- ✅ 传递参数

### componentSlots.spec.ts

- ✅ 初始化 slots
- ✅ 具名 slots
- ✅ 作用域 slots
- ✅ this.$slots 访问

### componentPublicInstance.spec.ts

- ✅ this 访问 setupState
- ✅ this 访问 props
- ✅ this 访问 $el, $slots, $props
- ✅ 访问优先级

### apiInject.spec.ts

- ✅ provide/inject 基础功能
- ✅ 跨层级注入
- ✅ 默认值
- ✅ 默认值为函数

### scheduler.spec.ts

- ✅ queueJob 队列任务
- ✅ 去重机制
- ✅ nextTick 异步执行
- ✅ Promise 支持

**测试统计**：

- 测试文件：9 个
- 测试用例：53 个 ✅
- 测试通过率：100%

---

## 性能优化建议

### 1. 合理使用 key

```typescript
// ❌ 没有 key，全部重新渲染
items.map(item => h('div', null, item.name))

// ✅ 有 key，复用节点
items.map(item => h('div', { key: item.id }, item.name))
```

### 2. 避免不必要的组件更新

```typescript
// ❌ props 对象每次都是新的
h(Child, { data: { ...someData } })

// ✅ 保持引用稳定
const data = reactive({ ...someData })
h(Child, { data })
```

### 3. 使用 Fragment 避免多余节点

```typescript
// ❌ 额外的包裹元素
h('div', null, [
  h('header'),
  h('main'),
])

// ✅ Fragment
h(Fragment, null, [
  h('header'),
  h('main'),
])
```

### 4. 善用 shallowReadonly

```typescript
// Props 使用 shallowReadonly 而不是 readonly
// 性能更好，足够用
const props = shallowReadonly(rawProps)
```

---

## 与 Vue 2 的对比

| 特性       | Vue 2                 | Vue 3                     |
| ---------- | --------------------- | ------------------------- |
| VNode 创建 | createElement (h)     | createVNode (h)           |
| 组件实例   | vm 实例               | component instance        |
| 渲染函数   | render.call(vm, h)    | render.call(proxy, proxy) |
| 响应式     | Object.defineProperty | Proxy                     |
| Diff 算法  | 双端对比              | 双端对比 + 最长递增子序列 |
| 调度器     | 使用 watcher 队列     | 独立的 scheduler          |
| Fragment   | 不支持                | 支持                      |
| 多根节点   | 不支持                | 支持                      |

**主要改进**：

1. 性能提升 - 更快的 Diff 算法
2. 体积更小 - Tree-shaking 友好
3. 更灵活 - 自定义渲染器
4. 更强大 - Fragment、Teleport 等新特性

---

## 总结

Vue 3 的 Runtime-Core 通过以下核心机制实现：

1. **VNode**: 描述 UI 的 JavaScript 对象
2. **Component**: 可复用的组件系统
3. **Renderer**: 灵活的渲染器架构
4. **Diff**: 高效的更新算法
5. **Scheduler**: 异步批量更新

**设计优势**：

- ✅ 性能卓越（位运算、最长递增子序列）
- ✅ 架构清晰（自定义渲染器、模块化）
- ✅ 扩展性强（Fragment、Provide/Inject）
- ✅ 开发体验好（组件代理、nextTick）

Runtime-Core 不仅是 Vue 3 的核心，也展示了现代前端框架的设计精髓。通过学习其实现，我们可以深入理解虚拟 DOM、组件系统和渲染优化的原理。
