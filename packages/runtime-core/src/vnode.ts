import { ShapeFlags } from '@mini-vue/shared'

export const Fragment = Symbol('Fragment')
export const Text = Symbol('Text')

export function createVNode(type: any, props?: any, children?: any) {
  const vnode = {
    type,
    props: props || {},
    children,
    el: null,
    shapeFlag: getShapeFlag(type),
    key: props?.key,
  }

  // 基于 children 再次设置 shapeFlag
  if (typeof children === 'string') {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
  } else if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  }

  // 判断是否是 slots children
  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    if (typeof children === 'object') {
      vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN
    }
  }

  return vnode
}

export function createTextVNode(text: string = ' ') {
  return createVNode(Text, {}, text)
}

export { createVNode as createElementVNode }

function getShapeFlag(type: any) {
  return typeof type === 'string'
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT
}

export function normalizeVNode(child: any) {
  if (typeof child === 'string' || typeof child === 'number') {
    return createVNode(Text, null, String(child))
  } else {
    return child
  }
}
