# TDD 实战示例

这份文档提供详细的 TDD 示例，展示如何一步步实现每个功能。

---

## 示例 1: 实现 Effect 基础功能

### 需求分析

effect 是响应式系统的核心，它需要：

1. 立即执行传入的函数
2. 当函数中使用的响应式数据变化时，自动重新执行

### Step 1: 写第一个测试

**文件**: `packages/reactivity/__tests__/effect.spec.ts`

```typescript
import { describe, expect, it } from 'vitest'
import { effect } from '../src/effect'
import { reactive } from '../src/reactive'

describe('effect', () => {
  it('should run the passed function immediately', () => {
    let dummy
    const counter = reactive({ num: 0 })

    effect(() => {
      dummy = counter.num
    })

    expect(dummy).toBe(0)
  })
})
```

### Step 2: 最小实现（让测试通过）

**文件**: `packages/reactivity/src/effect.ts`

```typescript
// 最简单的实现 - 只是立即执行函数
export function effect(fn: Function) {
  fn()
}
```

**运行测试**: ✅ 通过

### Step 3: 增加响应式测试

```typescript
it('should run when reactive data changes', () => {
  let dummy
  const counter = reactive({ num: 0 })

  effect(() => {
    dummy = counter.num
  })

  expect(dummy).toBe(0)

  counter.num = 7
  expect(dummy).toBe(7)
})
```

**运行测试**: ❌ 失败

```
Expected: 7
Received: 0
```

### Step 4: 实现依赖收集

现在需要实现：

1. 在 effect 执行时收集依赖（track）
2. 在数据变化时触发依赖（trigger）

```typescript
// effect.ts

// 全局变量存储当前活跃的 effect
let activeEffect: ReactiveEffect | undefined

// 用于存储 target -> key -> deps 的映射
const targetMap = new WeakMap()

export class ReactiveEffect {
  private _fn: any

  constructor(fn: any) {
    this._fn = fn
  }

  run() {
    // 设置当前活跃的 effect
    activeEffect = this
    // 执行函数（此时会触发 getter，进行依赖收集）
    const result = this._fn()
    // 重置
    activeEffect = undefined
    return result
  }
}

export function effect(fn: Function) {
  const _effect = new ReactiveEffect(fn)
  // 立即执行一次
  _effect.run()
}

// 依赖收集
export function track(target: object, key: string | symbol) {
  if (!activeEffect)
    return

  // 获取 target 对应的 depsMap
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  // 获取 key 对应的 dep
  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }

  // 收集当前 effect
  dep.add(activeEffect)
}

// 触发依赖
export function trigger(target: object, key: string | symbol) {
  const depsMap = targetMap.get(target)
  if (!depsMap)
    return

  const dep = depsMap.get(key)
  if (!dep)
    return

  // 执行所有依赖的 effect
  for (const effect of dep) {
    effect.run()
  }
}
```

### Step 5: 在 reactive 中调用 track 和 trigger

**文件**: `packages/reactivity/src/baseHandlers.ts`

```typescript
import { track, trigger } from './effect'

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

export const mutableHandlers = {
  get: createGetter(),
  set: createSetter(),
}
```

**运行测试**: ✅ 通过

### Step 6: 重构 - 抽取公共逻辑

现在代码可以工作，但可以优化：

```typescript
// 抽取依赖收集到 Set 的逻辑
export function trackEffects(dep: Set<ReactiveEffect>) {
  if (!activeEffect)
    return
  dep.add(activeEffect)
}

// 抽取触发依赖的逻辑
export function triggerEffects(dep: Set<ReactiveEffect>) {
  for (const effect of dep) {
    effect.run()
  }
}

// 简化 track
export function track(target: object, key: string | symbol) {
  if (!activeEffect)
    return

  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, depsMap = new Map())
  }

  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, dep = new Set())
  }

  trackEffects(dep)
}

// 简化 trigger
export function trigger(target: object, key: string | symbol) {
  const depsMap = targetMap.get(target)
  if (!depsMap)
    return

  const dep = depsMap.get(key)
  if (dep) {
    triggerEffects(dep)
  }
}
```

**运行测试**: ✅ 仍然通过

---

## 示例 2: 实现 Effect 返回 Runner

### Step 1: 写测试

```typescript
it('should return runner when call effect', () => {
  let foo = 10

  const runner = effect(() => {
    foo++
    return 'foo'
  })

  expect(foo).toBe(11)

  // runner 可以手动执行
  const r = runner()
  expect(foo).toBe(12)
  expect(r).toBe('foo')
})
```

**运行测试**: ❌ 失败

### Step 2: 实现 runner

```typescript
export function effect(fn: Function) {
  const _effect = new ReactiveEffect(fn)
  _effect.run()

  // 返回 runner 函数
  const runner: any = _effect.run.bind(_effect)

  return runner
}
```

**运行测试**: ✅ 通过

---

## 示例 3: 实现 Effect Scheduler

### Step 1: 理解需求

scheduler 允许用户控制 effect 的执行时机：

- 第一次仍然立即执行
- 响应式数据变化时，调用 scheduler 而不是直接执行 effect
- 可以通过 runner 手动执行

### Step 2: 写测试

```typescript
it('scheduler', () => {
  let dummy
  let run: any
  const scheduler = vi.fn(() => {
    run = runner
  })

  const obj = reactive({ foo: 1 })
  const runner = effect(
    () => {
      dummy = obj.foo
    },
    { scheduler }
  )

  // scheduler 不应该在第一次执行
  expect(scheduler).not.toHaveBeenCalled()
  expect(dummy).toBe(1)

  // 数据变化时应该调用 scheduler
  obj.foo++
  expect(scheduler).toHaveBeenCalledTimes(1)
  // effect 不应该执行，dummy 还是旧值
  expect(dummy).toBe(1)

  // 手动执行 runner
  run()
  expect(dummy).toBe(2)
})
```

### Step 3: 实现 scheduler

```typescript
export class ReactiveEffect {
  private _fn: any
  public scheduler?: (...args: any[]) => any

  constructor(fn: any, scheduler?: any) {
    this._fn = fn
    this.scheduler = scheduler
  }

  run() {
    activeEffect = this
    const result = this._fn()
    activeEffect = undefined
    return result
  }
}

export function effect(fn: Function, options: any = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler)
  _effect.run()

  const runner: any = _effect.run.bind(_effect)
  return runner
}

// 修改 triggerEffects
export function triggerEffects(dep: Set<ReactiveEffect>) {
  for (const effect of dep) {
    // 如果有 scheduler，调用 scheduler
    // 否则直接执行 run
    if (effect.scheduler) {
      effect.scheduler()
    }
    else {
      effect.run()
    }
  }
}
```

**运行测试**: ✅ 通过

---

## 示例 4: 实现 Ref

### Step 1: 写测试

```typescript
import { describe, expect, it } from 'vitest'
import { effect } from '../src/effect'
import { ref } from '../src/ref'

describe('ref', () => {
  it('should hold a value', () => {
    const a = ref(1)
    expect(a.value).toBe(1)
    a.value = 2
    expect(a.value).toBe(2)
  })

  it('should be reactive', () => {
    const a = ref(1)
    let dummy
    let calls = 0

    effect(() => {
      calls++
      dummy = a.value
    })

    expect(calls).toBe(1)
    expect(dummy).toBe(1)

    a.value = 2
    expect(calls).toBe(2)
    expect(dummy).toBe(2)

    // 相同的值不应该触发更新
    a.value = 2
    expect(calls).toBe(2)
    expect(dummy).toBe(2)
  })
})
```

### Step 2: 实现基础 ref

```typescript
import { hasChanged } from '@mini-vue/shared'
import { createDep } from './dep'
import { isTracking, trackEffects, triggerEffects } from './effect'

export class RefImpl {
  private _value: any
  public dep: any
  public __v_isRef = true

  constructor(value: any) {
    this._value = value
    this.dep = createDep()
  }

  get value() {
    // 依赖收集
    trackRefValue(this)
    return this._value
  }

  set value(newValue) {
    // 值没变就不触发更新
    if (hasChanged(newValue, this._value)) {
      this._value = newValue
      // 触发依赖
      triggerRefValue(this)
    }
  }
}

function trackRefValue(ref: RefImpl) {
  if (isTracking()) {
    trackEffects(ref.dep)
  }
}

function triggerRefValue(ref: RefImpl) {
  triggerEffects(ref.dep)
}

export function ref(value: any) {
  return new RefImpl(value)
}
```

**运行测试**: ✅ 通过

### Step 3: 支持对象类型

```typescript
it('should make nested properties reactive', () => {
  const a = ref({
    count: 1,
  })

  let dummy
  effect(() => {
    dummy = a.value.count
  })

  expect(dummy).toBe(1)
  a.value.count = 2
  expect(dummy).toBe(2)
})
```

**修改实现**:

```typescript
import { isObject } from '@mini-vue/shared'
import { reactive } from './reactive'

function convert(value: any) {
  return isObject(value) ? reactive(value) : value
}

export class RefImpl {
  private _rawValue: any
  private _value: any
  public dep: any
  public __v_isRef = true

  constructor(value: any) {
    this._rawValue = value
    // 如果是对象，转换成 reactive
    this._value = convert(value)
    this.dep = createDep()
  }

  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newValue) {
    // 使用原始值做对比
    if (hasChanged(newValue, this._rawValue)) {
      this._rawValue = newValue
      this._value = convert(newValue)
      triggerRefValue(this)
    }
  }
}
```

**运行测试**: ✅ 通过

---

## TDD 实践要点总结

### 1. 测试先行

- 永远先写测试，再写实现
- 测试就是需求文档

### 2. 小步前进

- 每次只添加一个小功能的测试
- 让测试从失败到通过
- 不要一次写太多代码

### 3. 快速迭代

```
写测试 → 运行(失败) → 写实现 → 运行(通过) → 重构 → 继续
```

### 4. 保持绿灯

- 每次提交前确保所有测试通过
- 重构时不改变行为，只优化代码

### 5. 充分测试

- 正常情况（happy path）
- 边界情况（edge cases）
- 错误情况（error cases）

### 6. 可读性优先

- 测试代码就是文档
- 清晰的测试名称
- 明确的断言

---

## 更多示例

需要更多示例？查看：

1. 原仓库的测试文件：https://github.com/cuixiaorui/mini-vue/tree/master/packages
2. Vue 3 源码的测试：https://github.com/vuejs/core/tree/main/packages

每个功能都可以用类似的方式实现！
