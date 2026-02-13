# Mini-Vue 功能清单

使用这个清单追踪你的学习进度。每完成一个功能，就打上 ✅。

---

## 阶段 1: Reactivity（响应式系统）

### 1.1 Effect 基础

- [x] effect 函数立即执行
- [x] effect 在响应式数据变化时重新执行
- [x] effect 返回 runner 函数
- [x] runner 函数可以手动执行 effect
- [x] runner 返回 effect 函数的返回值

**测试文件**: `packages/reactivity/__tests__/effect.spec.ts`

**参考测试用例**:

```typescript
it('should run the passed function once (effect)')
it('should observe basic properties')
it('should return runner when call effect')
it('effect should return the return value of the passed function')
```

---

### 1.2 Effect Scheduler

- [x] scheduler 选项基础功能
- [x] 响应式数据变化时调用 scheduler，而不是直接执行 effect
- [x] runner 函数仍然正常执行

**测试用例**:

```typescript
it('scheduler')
```

---

### 1.3 Effect Stop

- [x] stop 函数停止 effect 的执行
- [x] stop 后响应式数据变化不再触发 effect
- [x] onStop 回调函数
- [x] stop 后 runner 仍可手动执行

**测试用例**:

```typescript
it('stop')
it('onStop')
it('should still be manually callable after stop')
```

---

### 1.4 Reactive 基础

- [x] reactive 创建响应式对象
- [x] 响应式对象不等于原始对象
- [x] 读取响应式对象的属性返回正确的值
- [x] 修改响应式对象的属性触发依赖更新

**测试文件**: `packages/reactivity/__tests__/reactive.spec.ts`

**测试用例**:

```typescript
it('happy path')
it('nested reactives')
```

---

### 1.5 Readonly

- [x] readonly 创建只读对象
- [x] 只读对象不能被修改
- [x] 修改只读对象时输出警告
- [x] 只读对象的嵌套属性也是只读的

**测试文件**: `packages/reactivity/__tests__/reactive.spec.ts`

**测试用例**:

```typescript
it('should make nested values readonly')
it('warn when call set')
```

---

### 1.6 类型判断

- [x] isReactive 判断是否为响应式对象
- [x] isReadonly 判断是否为只读对象
- [x] isProxy 判断是否为代理对象
- [x] 嵌套对象的类型判断正确

**测试用例**:

```typescript
it('isReactive')
it('isReadonly')
it('isProxy')
it('nested reactive')
```

---

### 1.7 ShallowReadonly

- [x] shallowReadonly 只对第一层属性只读
- [x] 嵌套对象不是只读的
- [x] 第一层属性修改时输出警告

**测试文件**: `packages/reactivity/__tests__/reactive.spec.ts`

**测试用例**:

```typescript
it('should not make non-reactive properties reactive')
```

---

### 1.8 Ref

- [x] ref 创建响应式引用
- [x] ref.value 访问值
- [x] ref.value 修改值触发依赖更新
- [x] ref 包裹对象时自动 reactive
- [x] 在 effect 中访问 ref 触发依赖收集

**测试文件**: `packages/reactivity/__tests__/ref.spec.ts`

**测试用例**:

```typescript
it('happy path')
it('should be reactive')
it('should make nested properties reactive')
```

---

### 1.9 Ref 工具函数

- [x] isRef 判断是否为 ref
- [x] unRef 获取 ref 的值或原始值
- [x] proxyRefs 自动解包 ref

**测试用例**:

```typescript
it('isRef')
it('unRef')
it('proxyRefs')
it('proxyRefs set')
```

---

### 1.10 Computed

- [x] computed 创建计算属性
- [x] computed 具有缓存
- [x] 依赖变化时重新计算
- [x] 不访问时不计算（lazy）

**测试文件**: `packages/reactivity/__tests__/computed.spec.ts`

**测试用例**:

```typescript
it('happy path')
it('should compute lazily')
```

---

### 1.11 优化与边界情况

- [x] 同一个对象多次 reactive 返回同一个代理
- [x] 避免重复收集依赖
- [x] cleanup 机制（分支切换）
- [x] toRaw 获取原始对象

---

## 阶段 2: Runtime-Core（运行时核心）

### 2.1 VNode 与 h 函数

- [x] createVNode 创建虚拟节点
- [x] h 函数作为 createVNode 的便捷方式
- [x] shapeFlag 标识 vnode 类型
- [x] 支持 string children
- [x] 支持 array children

**测试文件**: `packages/runtime-core/__tests__/vnode.spec.ts`

---

### 2.2 Component 初始化

- [x] createComponentInstance 创建组件实例
- [x] setupComponent 初始化组件
- [x] 支持 setup 函数
- [x] setup 返回值可以在 render 中访问
- [x] 支持 render 函数

**测试文件**: `packages/runtime-core/__tests__/component.spec.ts`

---

### 2.3 Component Props

- [x] initProps 初始化 props
- [x] props 在 setup 中可访问
- [x] props 在 render 中可访问（通过 this）
- [x] props 是 shallowReadonly 的
- [x] props 修改时输出警告

**测试文件**: `packages/runtime-core/__tests__/componentProps.spec.ts`

---

### 2.4 Component Emit

- [x] emit 触发事件
- [x] 支持驼峰命名
- [x] 支持短横线命名
- [x] 传递参数给事件处理函数
- [x] emit 在 setup context 中可用

**测试文件**: `packages/runtime-core/__tests__/componentEmits.spec.ts`

**测试用例**:

```typescript
it('emit')
it('emit with kebab-case')
```

---

### 2.5 Component Slots

- [x] 基础 slots 功能
- [x] 具名 slots
- [x] 作用域 slots（传递数据）
- [x] renderSlot 渲染 slot

**测试文件**: `packages/runtime-core/__tests__/componentSlots.spec.ts`

---

### 2.6 Component Proxy

- [x] $el 访问根元素
- [x] $slots 访问 slots
- [x] $props 访问 props
- [x] setup 返回值在 this 中可访问
- [x] props 在 this 中可访问

**测试文件**: `packages/runtime-core/__tests__/componentPublicInstance.spec.ts`

---

### 2.7 Fragment 与 Text

- [x] Fragment 类型节点
- [x] Text 类型节点
- [x] createTextVNode 创建文本节点

---

### 2.8 Provide/Inject

- [x] provide 提供数据
- [x] inject 注入数据
- [x] 支持跨层级注入
- [x] inject 默认值
- [x] inject 默认值为函数时执行

**测试文件**: `packages/runtime-core/__tests__/apiInject.spec.ts`

---

### 2.9 getCurrentInstance

- [x] getCurrentInstance 获取当前组件实例
- [x] 只在 setup 中可用

---

### 2.10 Element 渲染

- [x] mountElement 挂载元素
- [x] 支持 props
- [x] 支持 children
- [x] 支持事件监听

---

### 2.11 Element 更新

- [x] patchElement 更新元素
- [x] patchProps 更新属性
- [x] patchChildren 更新子节点

---

### 2.12 Children 更新场景

- [x] text -> text
- [x] text -> array
- [x] array -> text
- [x] array -> array (diff)

---

### 2.13 Diff 算法 - 双端对比

- [x] 左侧对比
- [x] 右侧对比
- [x] 新节点比老节点多 - 新增
- [x] 老节点比新节点多 - 删除
- [x] 中间对比 - 乱序

**测试文件**: `packages/runtime-core/__tests__/renderer.spec.ts`

---

### 2.14 Diff 算法 - 最长递增子序列

- [x] 移动节点
- [x] 使用最长递增子序列优化
- [x] 新增节点
- [x] 删除节点

---

### 2.15 Component 更新

- [x] shouldUpdateComponent 判断是否需要更新
- [x] props 变化时更新组件
- [x] 更新时重新执行 render
- [x] 使用 scheduler 异步更新

---

### 2.16 nextTick

- [x] nextTick 在 DOM 更新后执行
- [x] 支持 Promise
- [x] 支持回调函数

**测试文件**: `packages/runtime-core/__tests__/scheduler.spec.ts`

---

### 2.17 自定义渲染器

- [x] createRenderer 创建渲染器
- [x] 支持自定义节点操作
- [x] createApp API
- [ ] 支持自定义节点操作
- [ ] createApp API

---

## 阶段 3: Runtime-DOM

### 3.1 DOM 操作

- [x] createElement
- [x] insert
- [x] remove
- [x] setElementText
- [x] createText
- [x] setText

---

### 3.2 Props 处理

- [x] patchProp
- [x] 处理 class
- [x] 处理 style
- [x] 处理事件
- [x] 处理属性

---

### 3.3 createApp

- [x] createApp 创建应用实例
- [x] mount 挂载应用

---

## 阶段 4: Compiler-Core（编译器）

### 4.1 Parser（解析器）

- [x] baseParse 解析模板
- [x] 解析插值 `{{ expression }}`
- [x] 解析 element 开始标签
- [x] 解析 element 结束标签
- [x] 解析 text
- [x] 生成 AST

**测试文件**: `packages/compiler-core/__tests__/parse.spec.ts`

**测试用例**:

```typescript
it('interpolation')
it('element')
it('text')
```

---

### 4.2 Transform（转换器）

- [x] transform 遍历 AST
- [x] transformExpression 转换表达式
- [x] transformElement 转换元素
- [x] transformText 转换文本
- [x] 合并相邻文本节点和插值

**测试文件**: `packages/compiler-core/__tests__/transform.spec.ts`

---

### 4.3 Codegen（代码生成）

- [x] generate 生成代码
- [x] 生成 import 语句
- [x] 生成 render 函数
- [x] 处理 interpolation
- [x] 处理 element
- [x] 处理 text

**测试文件**: `packages/compiler-core/__tests__/codegen.spec.ts`

**测试用例**:

```typescript
it('string')
it('interpolation')
it('element')
```

---

### 4.4 编译整合

- [x] baseCompile 完整编译流程
- [x] parse -> transform -> generate
- [x] 生成可执行的 render 函数

---

## 阶段 5: Vue 整合

### 5.1 完整版 Vue

- [ ] 整合 runtime-dom 和 compiler-core
- [ ] registerRuntimeCompiler
- [ ] compileToFunction
- [ ] 支持 template 选项

---

## 进度统计

- Reactivity: `40/40` (100%) ✅
- Runtime-Core: `60/60` (100%) ✅
- Runtime-DOM: `13/13` (100%) ✅
- Compiler-Core: `20/20` (100%) ✅
- Vue: `0/5` (0%)

**总进度**: `133/138` (96.4%)

---

## 如何使用这个清单

1. **按顺序实现**: 从上到下，从简单到复杂
2. **写测试 -> 实现 -> 打勾**: 每个功能都要有测试
3. **定期回顾**: 每完成一个阶段，回顾一下之前的内容
4. **记录问题**: 遇到困难的地方记录下来，便于后续复习

**提示**: 复制这个文件到你的笔记中，随时更新进度！
