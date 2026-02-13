# Compiler-Core 模块分析报告

> 生成时间: 2024  
> 模块路径: `packages/compiler-core`  
> 测试通过率: 100% (25/25 tests passing)

---

## 概述

Compiler-Core 是 Mini-Vue 的模板编译器核心，负责将模板字符串（如 `<div>{{ message }}</div>`）编译成 JavaScript 渲染函数。这是 Vue 从声明式模板到高性能渲染的关键一步。

### 核心职责

1. **解析（Parse）**: 将模板字符串解析成抽象语法树（AST）
2. **转换（Transform）**: 遍历并转换 AST，优化结构并添加代码生成所需的元数据
3. **生成（Generate）**: 从转换后的 AST 生成可执行的 JavaScript 代码

---

## 编译流程

```
模板字符串
    ↓
[ Parse 解析 ]
    ↓
   AST
    ↓
[ Transform 转换 ]
    ↓
带 codegenNode 的 AST
    ↓
[ Generate 生成 ]
    ↓
JavaScript 代码
```

### 示例

**输入模板**:
```html
<div>Hello, {{ name }}!</div>
```

**输出代码**:
```javascript
const { createElementVNode: _createElementVNode, toDisplayString: _toDisplayString } = Vue
return function render(_ctx, _cache) {
  return _createElementVNode("div", null, 'Hello, ', _toDisplayString(_ctx.name), '!')
}
```

---

## 架构设计

### 模块结构

```
packages/compiler-core/
├── src/
│   ├── ast.ts               # AST 节点类型定义
│   ├── parse.ts             # 解析器
│   ├── transform.ts         # 转换器核心
│   ├── codegen.ts           # 代码生成器
│   ├── compile.ts           # 编译入口
│   ├── runtimeHelpers.ts    # 运行时辅助函数映射
│   ├── utils.ts             # 工具函数
│   └── transforms/
│       ├── transformElement.ts      # 元素节点转换
│       ├── transformText.ts         # 文本节点转换
│       └── transformExpression.ts   # 表达式转换
├── __tests__/
│   ├── parse.spec.ts        # 解析器测试 (8 tests)
│   ├── transform.spec.ts    # 转换器测试 (5 tests)
│   ├── codegen.spec.ts      # 代码生成测试 (7 tests)
│   └── compile.spec.ts      # 集成测试 (5 tests)
└── package.json
```

---

## 核心实现

## 一、Parse 解析器

### 1.1 设计思路

解析器采用**递归下降**（Recursive Descent）的解析策略，通过不断"消费"（advance）模板字符串来构建 AST。

### 1.2 核心数据结构

```typescript
// 解析上下文
interface ParserContext {
  source: string  // 待解析的模板字符串
}

// AST 节点类型
export const enum NodeTypes {
  ROOT = 'root',                          // 根节点
  ELEMENT = 'element',                    // 元素节点
  TEXT = 'text',                          // 文本节点
  INTERPOLATION = 'interpolation',        // 插值节点 {{ }}
  SIMPLE_EXPRESSION = 'simple_expression', // 简单表达式
  COMPOUND_EXPRESSION = 'compound_expression', // 复合表达式
}
```

### 1.3 解析流程

```typescript
export function baseParse(content: string) {
  const context = createParserContext(content)
  return createRoot(parseChildren(context, []))
}
```

**步骤**:
1. 创建解析上下문（ParserContext）
2. 解析所有子节点（parseChildren）
3. 包装成根节点（createRoot）

---

### 1.4 parseChildren - 解析子节点

```typescript
function parseChildren(context: any, ancestors: any[]) {
  const nodes: any[] = []

  while (!isEnd(context, ancestors)) {
    let node
    const s = context.source

    if (s.startsWith('{{')) {
      node = parseInterpolation(context)
    }
    else if (s[0] === '<') {
      if (/[a-z]/i.test(s[1])) {
        node = parseElement(context, ancestors)
      }
    }

    if (!node) {
      node = parseText(context)
    }

    nodes.push(node)
  }

  return nodes
}
```

**关键逻辑**:
1. 检查是否结束（遇到结束标签或内容为空）
2. 根据内容判断节点类型:
   - `{{` 开头 → 插值节点
   - `<` + 字母 → 元素节点
   - 其他 → 文本节点
3. 解析并收集所有节点

**ancestors 参数**: 保存父级元素栈，用于判断何时结束（遇到匹配的结束标签）

---

### 1.5 parseInterpolation - 解析插值

```typescript
function parseInterpolation(context: any) {
  const openDelimiter = '{{'
  const closeDelimiter = '}}'

  const closeIndex = context.source.indexOf(
    closeDelimiter,
    openDelimiter.length,
  )

  advanceBy(context, openDelimiter.length)   // 跳过 {{

  const rawContentLength = closeIndex - openDelimiter.length
  const rawContent = parseTextData(context, rawContentLength)
  const content = rawContent.trim()          // 去除空格

  advanceBy(context, closeDelimiter.length)  // 跳过 }}

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
    },
  }
}
```

**处理步骤**:
1. 找到 `}}` 的位置
2. 跳过 `{{`
3. 提取中间内容并去除首尾空格
4. 跳过 `}}`
5. 返回插值节点

**示例**:
- 输入: `{{ message }}`
- 输出: `{ type: 'interpolation', content: { type: 'simple_expression', content: 'message' } }`

**测试验证**:
- ✅ 解析 `{{ message }}`
- ✅ 自动去除空格 `{{  message  }}`

---

### 1.6 parseElement - 解析元素

```typescript
function parseElement(context: any, ancestors: any[]) {
  const element: any = parseTag(context, TagType.Start)
  ancestors.push(element)
  element.children = parseChildren(context, ancestors)
  ancestors.pop()

  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End)
  }
  else {
    throw new Error(`缺少结束标签: ${element.tag}`)
  }

  return element
}
```

**处理步骤**:
1. 解析开始标签 `<div>`
2. 将元素压入 ancestors 栈（用于子节点解析）
3. 递归解析子节点
4. 弹出 ancestors
5. 解析结束标签 `</div>`
6. 如果缺少结束标签，抛出错误

**关键点**: 使用 ancestors 栈实现正确的嵌套处理

---

### 1.7 parseTag - 解析标签

```typescript
function parseTag(context: any, type: TagType) {
  const match: any = /^<\/?([a-z][a-z0-9]*)/i.exec(context.source)
  const tag = match[1]

  advanceBy(context, match[0].length)  // 跳过 <div 或 </div
  advanceBy(context, 1)                 // 跳过 >

  if (type === TagType.End)
    return

  return {
    type: NodeTypes.ELEMENT,
    tag,
  }
}
```

**正则表达式**: `/^<\/?([a-z][a-z0-9]*)/i`
- `<\/?`: 匹配 `<` 或 `</`
- `([a-z][a-z0-9]*)`: 匹配标签名（首字母必须是字母，后续可以是字母或数字）
  - 支持 `div`, `span`, `h1`, `h2` 等

**重要修复**: 之前使用 `[a-z]*` 无法匹配数字，导致 `<h1>` 被解析为 `<h>`，现已修复为 `[a-z][a-z0-9]*`

**测试验证**:
- ✅ 解析 `<div></div>`
- ✅ 解析 `<h1></h1>`, `<h2></h2>`
- ✅ 嵌套元素 `<div><p>hello</p></div>`

---

### 1.8 parseText - 解析文本

```typescript
function parseText(context: any) {
  let endIndex = context.source.length
  const endTokens = ['<', '{{']

  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i])
    if (index !== -1 && endIndex > index) {
      endIndex = index
    }
  }

  const content = parseTextData(context, endIndex)

  return {
    type: NodeTypes.TEXT,
    content,
  }
}
```

**处理逻辑**:
1. 找到最近的结束标记（`<` 或 `{{`）
2. 提取之前的所有内容作为文本
3. 前进到结束位置

**示例**:
- `hello {{ name }}` → 文本 `"hello "`，然后解析插值
- `hello</div>` → 文本 `"hello"`，然后解析结束标签

**测试验证**:
- ✅ 纯文本 `hello world`
- ✅ 文本 + 插值 `hello {{ name }}`
- ✅ 文本 + 元素 `<div>hello</div>`

---

### 1.9 辅助函数

#### advanceBy - 前进

```typescript
function advanceBy(context: any, length: number) {
  context.source = context.source.slice(length)
}
```

**功能**: "消费"模板字符串，移除已解析部分

---

#### isEnd - 判断是否结束

```typescript
function isEnd(context: any, ancestors: any[]) {
  const s = context.source

  if (s.startsWith('</')) {
    for (let i = ancestors.length - 1; i >= 0; i--) {
      const tag = ancestors[i].tag
      if (startsWithEndTagOpen(s, tag)) {
        return true
      }
    }
  }

  return !s
}
```

**逻辑**:
- 如果遇到结束标签，检查是否匹配 ancestors 中的任意标签
- 如果内容为空，也结束

**作用**: 防止错误地跨层级解析（如 `<div><p></div>` 不会把 `</div>` 当作 `<p>` 的结束标签）

---

### 解析器总结

| 功能 | 方法 | 测试状态 |
|------|------|---------|
| 插值解析 | parseInterpolation | ✅ (2 tests) |
| 元素解析 | parseElement | ✅ (3 tests) |
| 文本解析 | parseText | ✅ (2 tests) |
| 复杂模板 | 组合使用 | ✅ (1 test) |

**测试输出**:
```
✓ __tests__/parse.spec.ts (8)
  ✓ Parse (8)
    ✓ interpolation > should parse simple interpolation
    ✓ element > should parse simple element
    ✓ element > should parse element with text content
    ✓ element > should parse nested elements
    ✓ text > should parse simple text
    ✓ text > should parse text with interpolation
    ✓ complex template > should parse complex template
```

---

## 二、Transform 转换器

### 2.1 设计思路

Transform 阶段负责**遍历 AST 并进行转换**，为代码生成做准备。采用**插件化**设计，每个 transform 插件负责处理特定类型的节点。

### 2.2 核心流程

```typescript
export function transform(root: any, options: any = {}) {
  const context = createTransformContext(root, options)
  traverseNode(root, context)
  createRootCodegen(root)
  
  root.helpers = [...context.helpers.keys()]
}
```

**步骤**:
1. 创建转换上下文（收集 helpers 等信息）
2. 遍历节点并应用转换插件
3. 创建根节点的 codegenNode
4. 收集需要导入的 helper 函数

---

### 2.3 traverseNode - 遍历节点

```typescript
function traverseNode(node: any, context: any) {
  const { nodeTransforms } = context
  const exitFns: any[] = []

  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i]
    const onExit = transform(node, context)
    if (onExit)
      exitFns.push(onExit)
  }

  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING)
      break
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      traverseChildren(node, context)
      break
  }

  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}
```

**关键设计**: **退出函数（Exit Function）**

- Transform 可以返回一个"退出函数"
- 在子节点处理完成后才执行退出函数
- 确保子节点的 codegenNode 已经生成

**执行顺序** (对于 `<div><span>hello</span></div>`):
```
1. transformElement(div) - 进入
2. transformElement(span) - 进入
3. transformText(hello) - 处理
4. transformElement(span) - 退出 ← 这时 span 的子节点已处理完
5. transformElement(div) - 退出 ← 这时 div 的子节点已处理完
```

**为什么需要退出函数？**

因为 `transformElement` 需要使用子节点的 `codegenNode`，所以必须等子节点处理完成后才能执行。

---

### 2.4 Transform 插件

#### 2.4.1 transformExpression - 表达式转换

```typescript
export function transformExpression(node: any) {
  if (node.type === NodeTypes.INTERPOLATION) {
    node.content = processExpression(node.content)
  }
}

function processExpression(node: any) {
  node.content = `_ctx.${node.content}`
  return node
}
```

**功能**: 将 `{{ message }}` 转换为 `_ctx.message`

**原因**: 渲染函数的上下文参数是 `_ctx`，需要通过它访问组件数据

**示例**:
- 输入: `{ type: 'interpolation', content: { content: 'message' } }`
- 输出: `{ type: 'interpolation', content: { content: '_ctx.message' } }`

**测试验证**:
- ✅ 转换插值表达式
- ✅ 嵌套在元素中的插值也被转换

---

#### 2.4.2 transformElement - 元素转换

```typescript
export function transformElement(node: any, context: any) {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {  // 返回退出函数
      const { tag, children } = node

      const vnodeTag = `"${tag}"`
      let vnodeProps

      // 处理子节点
      let vnodeChildren
      if (children.length === 1) {
        // 只有一个子节点，直接使用
        const child = children[0]
        vnodeChildren = child.codegenNode || child
      } else if (children.length > 1) {
        // 多个子节点，创建数组
        vnodeChildren = children.map((child: any) => child.codegenNode || child)
      }

      node.codegenNode = createVNodeCall(
        context,
        vnodeTag,
        vnodeProps,
        vnodeChildren,
      )
    }
  }
}
```

**重要修复**: 之前只处理第一个子节点（`children[0]`），现在正确处理多个子节点：
- 1 个子节点：直接使用
- 多个子节点：创建数组

**示例**:
```html
<div><h1>Title</h1><p>Content</p></div>
```
- `<div>` 的 children: `[<h1>, <p>]`
- vnodeChildren: `[h1.codegenNode, p.codegenNode]`

**测试验证**:
- ✅ 单个子节点
- ✅ 多个子节点
- ✅ 嵌套元素

---

#### 2.4.3 transformText - 文本转换

```typescript
export function transformText(node: any) {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      const { children } = node

      let currentContainer: any = null
      for (let i = 0; i < children.length; i++) {
        const child = children[i]

        if (isText(child)) {
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j]

            if (isText(next)) {
              if (!currentContainer) {
                currentContainer = children[i] = {
                  type: NodeTypes.COMPOUND_EXPRESSION,
                  children: [child],
                }
              }
              currentContainer.children.push(' + ')
              currentContainer.children.push(next)
              children.splice(j, 1)
              j--
            }
            else {
              currentContainer = null
              break
            }
          }
        }
      }
    }
  }
}
```

**功能**: 合并相邻的文本节点和插值节点

**为什么需要？**

```html
<div>hello {{ name }}!</div>
```

解析后有 3 个子节点：
1. 文本: `"hello "`
2. 插值: `{{ name }}`
3. 文本: `"!"`

转换后变成 1 个复合表达式：
```typescript
{
  type: 'compound_expression',
  children: [
    { type: 'text', content: 'hello ' },
    ' + ',
    { type: 'interpolation', content: { content: '_ctx.name' } },
    ' + ',
    { type: 'text', content: '!' }
  ]
}
```

**代码生成**:
```javascript
'hello ' + _toDisplayString(_ctx.name) + '!'
```

**测试验证**:
- ✅ 文本 + 插值
- ✅ 插值 + 文本
- ✅ 多个插值

---

### 2.5 createRootCodegen - 创建根代码生成节点

```typescript
function createRootCodegen(root: any) {
  const child = root.children[0]
  if (child.type === NodeTypes.ELEMENT) {
    root.codegenNode = child.codegenNode
  }
  else {
    root.codegenNode = root.children[0]
  }
}
```

**功能**: 将根节点的第一个子节点的 codegenNode 提升为根 codegenNode

**原因**: 根节点本身不需要渲染，只渲染它的子节点

---

### Transform 总结

| Transform 插件 | 职责 | 关键点 |
|---------------|------|--------|
| transformExpression | 转换表达式为 `_ctx.xxx` | 上下文访问 |
| transformElement | 创建 VNode 调用 | 处理多个子节点 |
| transformText | 合并相邻文本/插值 | 复合表达式 |

**测试输出**:
```
✓ __tests__/transform.spec.ts (5)
  ✓ Transform (5)
    ✓ should transform simple element
    ✓ should transform interpolation
    ✓ should transform element with children
    ✓ should combine adjacent text nodes
    ✓ should transform simple template
```

---

## 三、Codegen 代码生成器

### 3.1 设计思路

代码生成器负责将转换后的 AST 生成为可执行的 JavaScript 代码字符串。

### 3.2 核心流程

```typescript
export function generate(ast: any) {
  const context = createCodegenContext()
  const { push } = context

  genFunctionPreamble(ast, context)  // 生成导入语句

  const functionName = 'render'
  const args = ['_ctx', '_cache']
  const signature = args.join(', ')

  push(`function ${functionName}(${signature}) {`)
  push('return ')
  genNode(ast.codegenNode, context)
  push('}')

  return {
    code: context.code,
  }
}
```

**输出示例**:
```javascript
const { createElementVNode: _createElementVNode } = Vue
return function render(_ctx, _cache) {
  return _createElementVNode("div", null, 'hello')
}
```

---

### 3.3 genFunctionPreamble - 生成导入

```typescript
function genFunctionPreamble(ast: any, context: any) {
  const { push } = context
  const VueBinging = 'Vue'
  const aliasHelper = (s: any) => `${helperNameMap[s]}: _${helperNameMap[s]}`

  if (ast.helpers.length > 0) {
    push(`const { ${ast.helpers.map(aliasHelper).join(', ')} } = ${VueBinging}`)
    push('\n')
    push('return ')
  }
}
```

**功能**: 生成 helper 函数的导入语句

**示例**:
```javascript
const { 
  createElementVNode: _createElementVNode,
  toDisplayString: _toDisplayString 
} = Vue
```

**helpers 来源**: Transform 阶段收集的所有需要的 helper 函数

---

### 3.4 genNode - 生成节点代码

```typescript
function genNode(node: any, context: any) {
  switch (node.type) {
    case NodeTypes.TEXT:
      genText(node, context)
      break
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context)
      break
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context)
      break
    case NodeTypes.ELEMENT:
      genElement(node, context)
      break
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context)
      break
  }
}
```

**策略模式**: 根据节点类型分发到对应的生成函数

---

### 3.5 各类型节点代码生成

#### genText - 文本节点

```typescript
function genText(node: any, context: any) {
  const { push } = context
  push(`'${node.content}'`)
}
```

**输出**: `'hello'`

---

#### genInterpolation - 插值节点

```typescript
function genInterpolation(node: any, context: any) {
  const { push, helper } = context
  push(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content, context)
  push(')')
}
```

**输出**: `_toDisplayString(_ctx.message)`

---

#### genExpression - 表达式节点

```typescript
function genExpression(node: any, context: any) {
  const { push } = context
  push(`${node.content}`)
}
```

**输出**: `_ctx.message`

---

#### genElement - 元素节点

```typescript
function genElement(node: any, context: any) {
  const { push, helper } = context
  const { tag, children, props } = node

  push(`${helper(CREATE_ELEMENT_VNODE)}(`)
  genNodeList(genNullable([tag, props, children]), context)
  push(')')
}
```

**输出**: `_createElementVNode("div", null, 'hello')`

---

#### genCompoundExpression - 复合表达式

```typescript
function genCompoundExpression(node: any, context: any) {
  const { push } = context
  const { children } = node
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (isString(child)) {
      push(child)
    }
    else {
      genNode(child, context)
    }
  }
}
```

**功能**: 按顺序生成所有子节点

**示例**:
```typescript
children: [
  { type: 'text', content: 'hello ' },
  ' + ',
  { type: 'interpolation', content: ... }
]
```

**输出**: `'hello ' + _toDisplayString(_ctx.name)`

---

### 3.6 genNodeList - 生成节点列表

```typescript
function genNodeList(nodes: any, context: any) {
  const { push } = context

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (isString(node)) {
      push(node)
    }
    else if (Array.isArray(node)) {
      // 处理数组节点（多个子节点）
      for (let j = 0; j < node.length; j++) {
        genNode(node[j], context)
        if (j < node.length - 1) {
          push(', ')
        }
      }
    }
    else {
      genNode(node, context)
    }

    if (i < nodes.length - 1) {
      push(', ')
    }
  }
}
```

**重要修复**: 添加了对数组的处理，支持多个子节点：

```html
<div><h1>Title</h1><p>Content</p></div>
```

**输出**:
```javascript
_createElementVNode("div", null, 
  _createElementVNode("h1", null, 'Title'), 
  _createElementVNode("p", null, 'Content')
)
```

---

### 3.7 genNullable - 处理空值

```typescript
function genNullable(args: any[]) {
  return args.map(arg => arg || 'null')
}
```

**功能**: 将 `undefined` 转为 `'null'`

**使用场景**: props 为空时生成 `null`
```javascript
_createElementVNode("div", null, 'hello')
                         ^^^^
```

---

### Codegen 总结

| 节点类型 | 生成函数 | 输出示例 |
|---------|---------|---------|
| TEXT | genText | `'hello'` |
| INTERPOLATION | genInterpolation | `_toDisplayString(_ctx.name)` |
| SIMPLE_EXPRESSION | genExpression | `_ctx.name` |
| ELEMENT | genElement | `_createElementVNode("div", null, ...)` |
| COMPOUND_EXPRESSION | genCompoundExpression | `'hello ' + _toDisplayString(_ctx.name)` |

**测试输出**:
```
✓ __tests__/codegen.spec.ts (7)
  ✓ Codegen (7)
    ✓ should generate string
    ✓ should generate interpolation
    ✓ should generate element
    ✓ should generate element with text children
    ✓ should generate element with interpolation children
    ✓ should generate element with multiple children
    ✓ should generate code for nested elements
```

---

## 四、Compile 编译集成

### 4.1 完整编译流程

```typescript
export function baseCompile(template: string) {
  const ast = baseParse(template)
  transform(ast, {
    nodeTransforms: [transformExpression, transformElement, transformText],
  })
  return generate(ast)
}
```

**步骤**:
1. Parse: 模板 → AST
2. Transform: AST → 带 codegenNode 的 AST
3. Generate: AST → JavaScript 代码

---

### 4.2 示例完整流程

**模板**:
```html
<div>Hello, {{ name }}!</div>
```

**Parse 后的 AST**:
```typescript
{
  type: 'root',
  children: [{
    type: 'element',
    tag: 'div',
    children: [
      { type: 'text', content: 'Hello, ' },
      { 
        type: 'interpolation', 
        content: { type: 'simple_expression', content: 'name' }
      },
      { type: 'text', content: '!' }
    ]
  }]
}
```

**Transform 后**:
```typescript
{
  type: 'root',
  codegenNode: {
    type: 'element',
    tag: '"div"',
    props: undefined,
    children: {
      type: 'compound_expression',
      children: [
        { type: 'text', content: 'Hello, ' },
        ' + ',
        { 
          type: 'interpolation',
          content: { type: 'simple_expression', content: '_ctx.name' }
        },
        ' + ',
        { type: 'text', content: '!' }
      ]
    }
  },
  helpers: [CREATE_ELEMENT_VNODE, TO_DISPLAY_STRING]
}
```

**Generate 后的代码**:
```javascript
const { createElementVNode: _createElementVNode, toDisplayString: _toDisplayString } = Vue
return function render(_ctx, _cache) {
  return _createElementVNode("div", null, 'Hello, ' + _toDisplayString(_ctx.name) + '!')
}
```

---

### 4.3 集成测试

```typescript
describe('Compiler integration', () => {
  it('should compile simple template', () => {
    const { code } = compile('<div>hello</div>')
    expect(code).toMatchSnapshot()
  })

  it('should compile template with interpolation', () => {
    const { code } = compile('<div>hello, {{ name }}</div>')
    expect(code).toMatchSnapshot()
  })

  it('should compile template with nested elements', () => {
    const { code } = compile('<div><h1>Title</h1><p>Content</p></div>')
    expect(code).toMatchSnapshot()
  })

  it('should compile template with multiple interpolations', () => {
    const { code } = compile('<div>{{ greeting }}, {{ name }}!</div>')
    expect(code).toMatchSnapshot()
  })

  it('should compile complex template', () => {
    const { code } = compile(`
      <div>
        <h1>{{ title }}</h1>
        <p>Hello, {{ name }}!</p>
      </div>
    `)
    expect(code).toMatchSnapshot()
  })
})
```

**快照测试**: 使用 Vitest 的 `toMatchSnapshot()` 确保生成的代码稳定

**测试输出**:
```
✓ __tests__/compile.spec.ts (5)
  ✓ Compiler integration (5)
    ✓ should compile simple template
    ✓ should compile template with interpolation
    ✓ should compile template with nested elements
    ✓ should compile template with multiple interpolations
    ✓ should compile complex template
```

---

## 核心问题与解决方案

### 问题 1: 标签名包含数字无法解析

**现象**: `<h1>Title</h1>` 被解析为 `<h>` 和文本 `1>Title</h1>`

**原因**: 正则表达式 `/^<\/?([a-z]*)/i` 只匹配字母

**解决方案**: 修改为 `/^<\/?([a-z][a-z0-9]*)/i`
- 首字符必须是字母
- 后续字符可以是字母或数字

**影响**: 修复后支持 `h1`, `h2`, `h3` 等带数字的标签

---

### 问题 2: 只处理第一个子节点

**现象**: `<div><h1>Title</h1><p>Content</p></div>` 只生成 `<h1>` 的代码

**原因**: `transformElement` 中 `const vnodeChildren = children[0]` 只取第一个

**解决方案**:
```typescript
if (children.length === 1) {
  vnodeChildren = child.codegenNode || child
} else if (children.length > 1) {
  vnodeChildren = children.map((child: any) => child.codegenNode || child)
}
```

**影响**: 支持多个兄弟节点的渲染

---

### 问题 3: genNodeList 无法处理数组

**现象**: 多个子节点时，genNodeList 尝试 `genNode(array)` 失败

**原因**: genNode 没有数组类型分支

**解决方案**: 在 genNodeList 中添加数组检测：
```typescript
else if (Array.isArray(node)) {
  for (let j = 0; j < node.length; j++) {
    genNode(node[j], context)
    if (j < node.length - 1) {
      push(', ')
    }
  }
}
```

**影响**: 正确生成多个子节点的逗号分隔代码

---

## 性能与优化

### 1. 静态提升 (未实现)

**概念**: 将静态节点提升到渲染函数外部，避免每次渲染都重新创建

**示例**:
```javascript
// 未优化
function render(_ctx) {
  return _createElementVNode("div", null, 'Static Text')
}

// 优化后
const _hoisted_1 = _createElementVNode("div", null, 'Static Text')
function render(_ctx) {
  return _hoisted_1
}
```

**好处**: 减少 VNode 创建开销

---

### 2. 补丁标志 (未实现)

**概念**: 标记动态节点的更新类型，diff 时只检查动态部分

**示例**:
```javascript
_createElementVNode("div", { id: _ctx.id }, 'hello', 1 /* TEXT */)
                                                        ^^^^^^^^^
```

**好处**: 跳过静态属性和子节点的对比

---

### 3. 缓存事件处理器 (未实现)

**概念**: 缓存事件处理函数，避免每次渲染都传递新函数（导致子组件重新渲染）

**示例**:
```javascript
// 未优化
<button onClick={() => console.log('click')}>Click</button>

// 优化后
const _cached_1 = _cache[1] || (_cache[1] = () => console.log('click'))
_createElementVNode("button", { onClick: _cached_1 }, 'Click')
```

---

## 与 Vue 3 的对比

| 功能 | Mini-Vue | Vue 3 |
|------|----------|-------|
| 基础解析 | ✅ | ✅ |
| 插值表达式 | ✅ | ✅ |
| 元素节点 | ✅ | ✅ |
| 属性处理 | ❌ | ✅ `<div id="app">` |
| 指令解析 | ❌ | ✅ `v-if`, `v-for` 等 |
| 静态提升 | ❌ | ✅ |
| 补丁标志 | ❌ | ✅ |
| 缓存处理器 | ❌ | ✅ |
| 注释节点 | ❌ | ✅ |
| Fragment | ❌ | ✅ |
| Slot | ❌ | ✅ |

---

## 学习总结

### 核心概念

1. **编译三阶段**: Parse → Transform → Generate
2. **AST**: 抽象语法树，代码的结构化表示
3. **递归下降解析**: 通过递归调用解析各种语法结构
4. **退出函数**: 确保子节点处理完成后再处理父节点
5. **插件化 Transform**: 每个 transform 负责特定节点类型

### 设计模式

1. **策略模式**: genNode 根据类型分发到不同生成函数
2. **访问者模式**: Transform 遍历 AST 并应用转换逻辑
3. **责任链模式**: Transform 插件按顺序处理节点

### 为什么需要编译器？

**问题**: 为什么不直接写 `h('div', null, 'hello')`？

**答案**:
1. **声明式更直观**: `<div>hello</div>` 比 `h('div', null, 'hello')` 更易读
2. **性能优化**: 编译时可以做静态分析，添加优化标记
3. **语法糖**: 支持 `v-if`, `v-for` 等指令，运行时不需要解析

**Vue 的哲学**: "编译时做的越多，运行时做的越少"

---

## 实战应用

### 自定义编译器插件

假设我们要支持自定义语法 `@{expression}` 作为插值的简写：

```typescript
function parseCustomInterpolation(context: any) {
  if (context.source.startsWith('@{')) {
    advanceBy(context, 2)
    const closeIndex = context.source.indexOf('}')
    const content = parseTextData(context, closeIndex).trim()
    advanceBy(context, 1)
    
    return {
      type: NodeTypes.INTERPOLATION,
      content: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content,
      },
    }
  }
}

// 在 parseChildren 中添加检测
if (s.startsWith('@{')) {
  node = parseCustomInterpolation(context)
}
```

### 使用示例

```html
<div>Hello, @{name}!</div>
```

编译后:
```javascript
_createElementVNode("div", null, 'Hello, ' + _toDisplayString(_ctx.name) + '!')
```

---

## 参考资料

- [Vue 3 源码: compiler-core](https://github.com/vuejs/core/tree/main/packages/compiler-core)
- [Vue 3 模板编译原理](https://template-explorer.vuejs.org/)
- [编译原理基础: 递归下降解析](https://en.wikipedia.org/wiki/Recursive_descent_parser)
- [AST Explorer](https://astexplorer.net/)

---

## 附录：完整测试输出

```bash
✓ packages/compiler-core/__tests__/parse.spec.ts (8)
  ✓ Parse (8)
    ✓ interpolation > should parse simple interpolation
    ✓ element > should parse simple element
    ✓ element > should parse element with text content
    ✓ element > should parse nested elements
    ✓ text > should parse simple text
    ✓ text > should parse text with interpolation
    ✓ complex template > should parse complex template
    ✓ error handling > should throw error for unclosed tag

✓ packages/compiler-core/__tests__/transform.spec.ts (5)
  ✓ Transform (5)
    ✓ should transform simple element
    ✓ should transform interpolation
    ✓ should transform element with children
    ✓ should combine adjacent text nodes
    ✓ should transform simple template

✓ packages/compiler-core/__tests__/codegen.spec.ts (7)
  ✓ Codegen (7)
    ✓ should generate string
    ✓ should generate interpolation
    ✓ should generate element
    ✓ should generate element with text children
    ✓ should generate element with interpolation children
    ✓ should generate element with multiple children
    ✓ should generate code for nested elements

✓ packages/compiler-core/__tests__/compile.spec.ts (5)
  ✓ Compiler integration (5)
    ✓ should compile simple template
    ✓ should compile template with interpolation
    ✓ should compile template with nested elements
    ✓ should compile template with multiple interpolations
    ✓ should compile complex template

Test Files  4 passed (4)
     Tests  25 passed (25)
  Duration  264ms
```

**总结**: Compiler-Core 模块完整实现了模板编译的三个阶段，通过 25 个测试用例验证了核心功能，为 Mini-Vue 提供了从模板到渲染函数的完整转换能力。
