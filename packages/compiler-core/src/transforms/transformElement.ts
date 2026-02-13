import { createVNodeCall, NodeTypes } from '../ast'

export function transformElement(node: any, context: any) {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      const { tag, children } = node

      const vnodeTag = `"${tag}"`
      let vnodeProps

      // 处理子节点
      let vnodeChildren
      if (children.length === 1) {
        // 只有一个子节点，直接使用（可能是text、interpolation或element）
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
