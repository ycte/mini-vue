import { createVNodeCall, NodeTypes } from '../ast'

export function transformElement(node: any, context: any) {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      const { tag, children } = node

      const vnodeTag = `"${tag}"`
      let vnodeProps

      const vnodeChildren = children[0]

      node.codegenNode = createVNodeCall(
        context,
        vnodeTag,
        vnodeProps,
        vnodeChildren,
      )
    }
  }
}
