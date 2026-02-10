import { CREATE_ELEMENT_VNODE } from './runtimeHelpers'

export const enum NodeTypes {
  INTERPOLATION,
  SIMPLE_EXPRESSION,
  ELEMENT,
  TEXT,
  ROOT,
  COMPOUND_EXPRESSION,
}

export const enum ElementTypes {
  ELEMENT,
}

export function createSimpleExpression(content: string) {
  return {
    type: NodeTypes.SIMPLE_EXPRESSION,
    content,
  }
}

export function createInterpolation(content: any) {
  return {
    type: NodeTypes.INTERPOLATION,
    content,
  }
}

export function createVNodeCall(
  context: any,
  tag: any,
  props?: any,
  children?: any,
) {
  if (context) {
    context.helper(CREATE_ELEMENT_VNODE)
  }

  return {
    type: NodeTypes.ELEMENT,
    tag,
    props,
    children,
  }
}
