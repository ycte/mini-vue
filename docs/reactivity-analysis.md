# Reactivity 响应式系统实现分析

本文档详细分析 `packages/reactivity` 包的实现原理和设计思路。

---

## 📚 目录

1. [核心概念](#核心概念)
2. [整体架构](#整体架构)
3. [Effect 系统](#effect-系统)
4. [Reactive 响应式对象](#reactive-响应式对象)
5. [Ref 响应式引用](#ref-响应式引用)
6. [Computed 计算属性](#computed-计算属性)
7. [依赖收集与触发流程](#依赖收集与触发流程)
8. [设计亮点](#设计亮点)

---

## 核心概念

### 响应式系统的核心思想

Vue 3 的响应式系统基于以下核心概念：

1. **依赖收集 (Dependency Collection)**: 在数据被读取时，收集正在执行的 effect
2. **触发更新 (Trigger Update)**: 在数据被修改时，触发所有依赖该数据的 effect
3. **副作用函数 (Effect)**: 会读取响应式数据的函数，数据变化时自动重新执行

### 数据结构设计

```
targetMap (WeakMap)
├── target1 (object) -> depsMap (Map)
│   ├── key1 -> dep (Set<ReactiveEffect>)
│   ├── key2 -> dep (Set<ReactiveEffect>)
│   └── ...
├── target2 (object) -> depsMap (Map)
│   └── ...
└── ...
```

- **targetMap**: 全局 WeakMap，存储所有响应式对象的依赖关系
- **depsMap**: Map，存储一个对象的每个属性的依赖
- **dep**: Set，存储依赖某个属性的所有 effect

---

## 整体架构

### 模块划分

```
packages/reactivity/src/
├── effect.ts          # 副作用系统核心
├── reactive.ts        # reactive/readonly API
├── ref.ts            # ref API
├── computed.ts       # computed API
├── baseHandlers.ts   # Proxy handlers
├── dep.ts            # 依赖集合类型定义
└── index.ts          # 导出文件
```

### 核心 API

| API                    | 功能               | 返回值          |
| ---------------------- | ------------------ | --------------- |
| `reactive(obj)`        | 创建响应式对象     | Proxy           |
| `readonly(obj)`        | 创建只读响应式对象 | Proxy           |
| `shallowReadonly(obj)` | 创建浅层只读对象   | Proxy           |
| `ref(value)`           | 创建响应式引用     | RefImpl         |
| `computed(getter)`     | 创建计算属性       | ComputedRefImpl |
| `effect(fn, options?)` | 创建副作用函数     | runner          |

---

## Effect 系统

### 1. ReactiveEffect 类

**文件**: `src/effect.ts`

```typescript
export class ReactiveEffect {
  private _fn: any // 副作用函数
  public deps: Dep[] = [] // 依赖列表（用于 cleanup）
  public active = true // 是否激活（stop 后为 false）
  public onStop?: () => void // stop 回调
  public scheduler?: (...args: any[]) => any // 调度器

  constructor(fn: any, scheduler?: any) {
    this._fn = fn
    this.scheduler = scheduler
  }

  run() {
    // 如果已经 stop，直接执行不收集依赖
    if (!this.active) {
      return this._fn()
    }

    // 设置全局标记，开始收集依赖
    shouldTrack = true
    activeEffect = this

    // 执行函数（触发 getter，进行依赖收集）
    const result = this._fn()

    // 重置标记
    shouldTrack = false
    activeEffect = undefined

    return result
  }

  stop() {
    if (this.active) {
      cleanupEffect(this) // 清理依赖
      if (this.onStop) {
        this.onStop() // 执行回调
      }
      this.active = false // 标记为非激活
    }
  }
}
```

**设计要点**：

1. **active 标志**: 用于实现 `stop` 功能，停止后不再收集依赖
2. **deps 双向收集**: effect 收集它依赖的 dep，同时 dep 也收集依赖它的 effect
3. **shouldTrack 控制**: 防止在不应该收集依赖的时候收集（如 stop 后）

### 2. effect 函数

```typescript
export function effect(fn: any, options: any = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler)

  // 扩展 options 到 _effect（如 onStop）
  extend(_effect, options)

  // 立即执行一次
  _effect.run()

  // 返回 runner 函数
  const runner: any = _effect.run.bind(_effect)
  runner.effect = _effect // 保存引用，用于 stop

  return runner
}
```

**功能**：

- ✅ 立即执行副作用函数
- ✅ 返回 runner 可手动触发
- ✅ 支持 scheduler 自定义调度
- ✅ 支持 onStop 回调

### 3. 依赖收集 - track

```typescript
export function track(target: object, type: string, key: string | symbol) {
  if (!isTracking()) {
    return
  }

  // 1. 获取或创建 target 的 depsMap
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  // 2. 获取或创建 key 的 dep
  let dep = depsMap.get(key)
  if (!dep) {
    dep = createDep()
    depsMap.set(key, dep)
  }

  // 3. 收集依赖
  trackEffects(dep)
}

export function trackEffects(dep: Dep) {
  // 双向收集
  if (!dep.has(activeEffect!)) {
    dep.add(activeEffect!) // dep 收集 effect
    activeEffect!.deps.push(dep) // effect 收集 dep
  }
}
```

**设计要点**：

- **懒加载**: depsMap 和 dep 都是按需创建
- **去重**: 使用 Set 自动去重，避免重复收集
- **双向收集**: 便于 cleanup 时从所有 dep 中移除 effect

### 4. 触发更新 - trigger

```typescript
export function trigger(target: object, type: string, key: string | symbol) {
  const depsMap = targetMap.get(target)
  if (!depsMap)
    return

  const dep = depsMap.get(key)
  triggerEffects(dep)
}

export function triggerEffects(dep: Dep) {
  for (const effect of dep) {
    if (effect.scheduler) {
      effect.scheduler() // 优先使用 scheduler
    }
    else {
      effect.run() // 否则直接执行
    }
  }
}
```

**调度机制**：

- 如果提供了 scheduler，由 scheduler 控制执行时机
- 否则立即执行 effect
- 这是实现 `nextTick` 等功能的基础

### 5. stop 功能

```typescript
function cleanupEffect(effect: ReactiveEffect) {
  // 从所有依赖的 dep 中移除自己
  effect.deps.forEach((dep: any) => {
    dep.delete(effect)
  })
  // 清空 deps 数组
  effect.deps.length = 0
}

export function stop(runner: any) {
  runner.effect.stop()
}
```

**cleanup 的必要性**：

- 避免内存泄漏
- 停止后不再响应数据变化

---

## Reactive 响应式对象

### 1. reactive 函数

**文件**: `src/reactive.ts`

```typescript
export function reactive(target: any) {
  return createReactiveObject(target, reactiveMap, mutableHandlers)
}

function createReactiveObject(
  target: any,
  proxyMap: WeakMap<any, any>,
  baseHandlers: ProxyHandler<any>,
) {
  // 1. 非对象不处理
  if (!isObject(target)) {
    console.warn(`value cannot be made reactive: ${String(target)}`)
    return target
  }

  // 2. 避免重复代理
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }

  // 3. 创建 Proxy
  const proxy = new Proxy(target, baseHandlers)

  // 4. 缓存 proxy
  proxyMap.set(target, proxy)

  return proxy
}
```

**设计要点**：

- **缓存机制**: 使用 WeakMap 缓存，同一个对象多次 reactive 返回同一个 proxy
- **类型检查**: 只对对象类型进行代理
- **baseHandlers**: 不同类型的 reactive 使用不同的 handlers

### 2. Proxy Handlers

**文件**: `src/baseHandlers.ts`

#### Get 拦截器

```typescript
function createGetter(isReadonly = false, shallow = false) {
  return function get(target: any, key: string | symbol, receiver: any) {
    // 1. 处理特殊 key（类型判断）
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    }
    else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    }

    // 2. 获取值
    const res = Reflect.get(target, key, receiver)

    // 3. shallow 模式直接返回
    if (shallow) {
      return res
    }

    // 4. 嵌套对象自动转换
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res)
    }

    // 5. 依赖收集
    if (!isReadonly) {
      track(target, 'get', key)
    }

    return res
  }
}
```

**功能**：

- ✅ 支持 `isReactive`/`isReadonly` 判断
- ✅ 嵌套对象自动转换（懒转换）
- ✅ readonly 不收集依赖
- ✅ shallow 模式只代理第一层

#### Set 拦截器

```typescript
function createSetter() {
  return function set(
    target: any,
    key: string | symbol,
    value: any,
    receiver: any,
  ) {
    // 1. 设置值
    const res = Reflect.set(target, key, value, receiver)

    // 2. 触发依赖
    trigger(target, 'set', key)

    return res
  }
}
```

### 3. readonly 实现

```typescript
export function readonly(target: any) {
  return createReactiveObject(target, readonlyMap, readonlyHandlers)
}

export const readonlyHandlers = {
  get: readonlyGet, // 不收集依赖
  set(target: any, key: string | symbol) {
    console.warn(
      `Set operation on key "${String(key)}" failed: target is readonly.`,
      target,
    )
    return true
  },
}
```

**特点**：

- 不收集依赖（性能优化）
- set 时发出警告
- 嵌套对象也是 readonly

### 4. shallowReadonly 实现

```typescript
export function shallowReadonly(target: any) {
  return createReactiveObject(
    target,
    shallowReadonlyMap,
    shallowReadonlyHandlers,
  )
}

const shallowReadonlyGet = createGetter(true, true)

export const shallowReadonlyHandlers = {
  get: shallowReadonlyGet, // shallow = true
  set(target: any, key: string | symbol) {
    console.warn(/* ... */)
    return true
  },
}
```

**用途**：

- 组件的 props 就是 shallowReadonly
- 只保护第一层，嵌套对象不转换
- 性能更好

---

## Ref 响应式引用

### 1. RefImpl 类

**文件**: `src/ref.ts`

```typescript
export class RefImpl {
  private _rawValue: any // 原始值
  private _value: any // 转换后的值
  public dep: Dep | undefined // 依赖集合
  public __v_isRef = true // 类型标记

  constructor(value: any) {
    this._rawValue = value
    // 对象类型自动转 reactive
    this._value = convert(value)
    this.dep = createDep()
  }

  get value() {
    // 依赖收集
    trackRefValue(this)
    return this._value
  }

  set value(newValue) {
    // 值变化才触发
    if (hasChanged(newValue, this._rawValue)) {
      this._rawValue = newValue
      this._value = convert(newValue)
      // 触发依赖
      triggerRefValue(this)
    }
  }
}

function convert(value: any) {
  return isObject(value) ? reactive(value) : value
}
```

**设计要点**：

1. **双值存储**：
   - `_rawValue`: 存储原始值，用于比较
   - `_value`: 存储转换后的值（对象 → reactive），用于返回

2. **自动转换**：
   - 如果 ref 包裹的是对象，自动转为 reactive
   - 这样可以响应嵌套属性的变化

3. **优化机制**：
   - `hasChanged` 检查，值不变不触发更新
   - 避免不必要的重新渲染

### 2. ref 工具函数

```typescript
// 创建 ref
export function ref(value: any) {
  return new RefImpl(value)
}

// 判断是否为 ref
export function isRef(ref: any): boolean {
  return !!(ref && ref.__v_isRef === true)
}

// 解包 ref
export function unRef(ref: any) {
  return isRef(ref) ? ref.value : ref
}
```

### 3. proxyRefs - 自动解包

```typescript
export function proxyRefs(objectWithRefs: any) {
  return new Proxy(objectWithRefs, {
    get(target, key, receiver) {
      // 访问时自动 unref
      return unRef(Reflect.get(target, key, receiver))
    },
    set(target, key, value, receiver) {
      const oldValue = target[key]
      // 如果原来是 ref，新值不是 ref，则更新 ref.value
      if (isRef(oldValue) && !isRef(value)) {
        oldValue.value = value
        return true
      }
      else {
        // 否则直接替换
        return Reflect.set(target, key, value, receiver)
      }
    },
  })
}
```

**用途**：

- 在 `setup()` 返回的对象上使用
- 在模板中访问 ref 不需要 `.value`
- 在组件实例的 `this` 中使用

**示例**：

```typescript
const state = proxyRefs({
  count: ref(0),
  name: ref('Vue')
})

console.log(state.count) // 0，自动解包
state.count = 1 // 相当于 count.value = 1
```

---

## Computed 计算属性

### ComputedRefImpl 类

**文件**: `src/computed.ts`

```typescript
class ComputedRefImpl {
  private _value: any // 缓存值
  private _dirty = true // 脏标记
  private _effect: ReactiveEffect
  public dep: any

  constructor(getter: any) {
    // 创建 effect，但不立即执行
    this._effect = new ReactiveEffect(getter, () => {
      // scheduler: 依赖变化时只标记脏，不计算
      if (!this._dirty) {
        this._dirty = true
      }
    })
  }

  get value() {
    // 只有脏的时候才重新计算
    if (this._dirty) {
      this._dirty = false
      this._value = this._effect.run()
    }
    return this._value
  }
}

export function computed(getter: any) {
  return new ComputedRefImpl(getter)
}
```

**核心机制**：

1. **懒计算 (Lazy)**：
   - 不访问 `.value` 就不计算
   - 通过 `_dirty` 标记控制

2. **缓存 (Cache)**：
   - `_dirty = false` 时返回缓存值
   - 多次访问不会重复计算

3. **自动更新**：
   - 依赖变化时，scheduler 设置 `_dirty = true`
   - 下次访问时重新计算

**执行流程**：

```
1. const sum = computed(() => a.value + b.value)
   - 创建 ComputedRefImpl，_dirty = true

2. console.log(sum.value)  // 第一次访问
   - _dirty = true，执行 getter
   - a.value 和 b.value 触发依赖收集
   - _dirty = false，返回结果

3. console.log(sum.value)  // 第二次访问
   - _dirty = false，直接返回缓存值

4. a.value++  // 依赖变化
   - 触发 scheduler
   - _dirty = true

5. console.log(sum.value)  // 再次访问
   - _dirty = true，重新计算
   - _dirty = false，返回新值
```

---

## 依赖收集与触发流程

### 完整示例

```typescript
const state = reactive({ count: 0 })

effect(() => {
  console.log(state.count)
})

state.count++
```

### 执行流程图

```
1. reactive({ count: 0 })
   └─> 创建 Proxy
       └─> 缓存到 reactiveMap

2. effect(() => { console.log(state.count) })
   ├─> 创建 ReactiveEffect
   ├─> 设置 activeEffect = _effect
   ├─> 设置 shouldTrack = true
   ├─> 执行副作用函数
   │   └─> 访问 state.count
   │       └─> 触发 get 拦截器
   │           └─> track(state, 'get', 'count')
   │               ├─> 获取或创建 targetMap.get(state)
   │               ├─> 获取或创建 depsMap.get('count')
   │               └─> dep.add(activeEffect)
   │                   activeEffect.deps.push(dep)
   └─> 重置 activeEffect = undefined
       重置 shouldTrack = false

3. state.count++
   └─> 触发 set 拦截器
       └─> trigger(state, 'set', 'count')
           └─> 获取 depsMap.get('count')
               └─> triggerEffects(dep)
                   └─> 遍历 dep 中的 effect
                       └─> effect.run()
                           └─> 重新执行副作用函数
                               └─> 输出新值
```

### 数据结构变化

```typescript
// 初始状态
targetMap = WeakMap {}

// 第一次执行 effect 后
targetMap = WeakMap {
  state => Map {
    'count' => Set {
      ReactiveEffect { _fn: [Function], deps: [...], ... }
    }
  }
}

// effect 对象
ReactiveEffect {
  _fn: () => { console.log(state.count) },
  deps: [
    Set { ReactiveEffect {...} }  // 指向 count 的 dep
  ],
  active: true,
  scheduler: undefined
}
```

---

## 设计亮点

### 1. WeakMap 的使用

```typescript
const targetMap = new WeakMap()
```

**优势**：

- **自动垃圾回收**: 当响应式对象不再被引用时，WeakMap 的条目会自动清除
- **避免内存泄漏**: 不会因为响应式系统持有引用而导致对象无法回收
- **性能优化**: key 必须是对象，符合响应式对象的特点

### 2. 懒转换嵌套对象

```typescript
if (isObject(res)) {
  return isReadonly ? readonly(res) : reactive(res)
}
```

**优势**：

- 只在访问时才转换嵌套对象
- 避免一次性转换深层嵌套的开销
- 未访问的对象不会被转换

### 3. 双向依赖收集

```typescript
dep.add(activeEffect!) // dep -> effect
activeEffect!.deps.push(dep) // effect -> dep
```

**优势**：

- 便于 cleanup：从 effect.deps 可以找到所有相关的 dep
- 便于 stop：可以快速从所有 dep 中移除 effect
- 内存管理更灵活

### 4. shouldTrack 机制

```typescript
export function isTracking() {
  return shouldTrack && activeEffect !== undefined
}
```

**优势**：

- 精确控制依赖收集时机
- stop 后的 effect 不会收集依赖
- 避免在不应该收集的时候收集

### 5. Scheduler 扩展点

```typescript
if (effect.scheduler) {
  effect.scheduler()
}
else {
  effect.run()
}
```

**优势**：

- 灵活的调度机制
- 可以实现批量更新（nextTick）
- 可以实现优先级调度
- 支持自定义更新策略

### 6. 缓存 Proxy

```typescript
const existingProxy = proxyMap.get(target)
if (existingProxy) {
  return existingProxy
}
```

**优势**：

- 同一对象多次 reactive 返回同一 proxy
- 保持对象引用一致性
- 避免重复创建 Proxy 的开销

### 7. Computed 的优化

```typescript
private _dirty = true
```

**优势**：

- 懒计算：不访问不计算
- 缓存机制：避免重复计算
- 只在依赖变化时标记脏，不立即计算
- 性能优化明显

---

## 与 Vue 2 的对比

| 特性         | Vue 2                     | Vue 3            |
| ------------ | ------------------------- | ---------------- |
| 实现方式     | Object.defineProperty     | Proxy            |
| 数组变异方法 | 需要特殊处理              | 原生支持         |
| 新增属性     | 需要 Vue.set              | 自动响应         |
| 删除属性     | 需要 Vue.delete           | 自动响应         |
| 嵌套对象     | 初始化时递归转换          | 懒转换           |
| 性能         | 初始化慢，运行快          | 初始化快，运行快 |
| 限制         | 无法检测数组索引和 length | 无限制           |

---

## 测试覆盖

当前实现的测试文件：

### effect.spec.ts

- ✅ 基础功能：立即执行、数据变化时重新执行
- ✅ 返回 runner 函数
- ✅ scheduler：自定义调度器
- ✅ stop：停止响应式更新
- ✅ onStop：停止时执行回调
- ✅ stop 后仍可手动执行

### reactive.spec.ts

- ✅ 基础功能：创建响应式对象、不等于原对象
- ✅ 嵌套对象自动转换为响应式
- ✅ readonly：创建只读对象、嵌套只读
- ✅ readonly 警告：set 操作发出警告
- ✅ isReactive：判断是否为响应式对象
- ✅ isReadonly：判断是否为只读对象
- ✅ isProxy：判断是否为代理对象
- ✅ shallowReadonly：浅层只读、允许嵌套属性修改

### ref.spec.ts

- ✅ 持有值
- ✅ 响应式更新
- ✅ 相同值不触发更新
- ✅ 嵌套对象自动 reactive
- ✅ isRef：判断是否为 ref
- ✅ unRef：解包 ref
- ✅ proxyRefs：自动解包和赋值

### computed.spec.ts

- ✅ 基础功能：计算属性
- ✅ 懒计算：不访问不计算
- ✅ 缓存机制：避免重复计算
- ✅ 依赖更新：依赖变化时重新计算

**测试统计**：

- 测试文件：4 个
- 测试用例：30 个 ✅
- 测试通过率：100%

**仍可增加的测试**：

- [ ] 循环引用处理
- [ ] 更多边界情况（null、undefined、Symbol 等）
- [ ] 数组操作测试（push、pop、splice 等）
- [ ] Map/Set 响应式
- [ ] toRaw 测试
- [ ] 性能测试

---

## 性能优化建议

### 1. 避免不必要的响应式

```typescript
// ❌ 大数据不需要响应式
const bigData = reactive(hugeArray)

// ✅ 使用普通对象
const bigData = hugeArray
```

### 2. 使用 shallowReactive

```typescript
// ❌ 深层对象全部响应式
const state = reactive(deepObject)

// ✅ 只响应第一层
const state = shallowReactive(deepObject)
```

### 3. 使用 computed 缓存

```typescript
// ❌ 每次都计算
effect(() => {
  const result = expensiveCalculation()
})

// ✅ 使用 computed
const result = computed(() => expensiveCalculation())
```

### 4. 及时 stop effect

```typescript
const runner = effect(() => {
  // ...
})

// 不需要时清理
onUnmounted(() => {
  stop(runner)
})
```

---

## 总结

Vue 3 的响应式系统通过以下核心机制实现：

1. **Proxy**: 拦截对象的读写操作
2. **Effect**: 副作用函数，自动追踪依赖
3. **Track**: 在读取时收集依赖
4. **Trigger**: 在修改时触发依赖

**设计优势**：

- ✅ 性能优秀（懒转换、缓存）
- ✅ 功能完善（支持所有操作）
- ✅ 扩展性强（scheduler、cleanup）
- ✅ 内存安全（WeakMap、双向收集）

这套系统不仅用于 Vue 的响应式，也可以作为独立的响应式库使用（`@vue/reactivity`）。
