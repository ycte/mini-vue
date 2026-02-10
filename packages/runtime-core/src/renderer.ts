import { effect } from '@mini-vue/reactivity'
import { ShapeFlags } from '@mini-vue/shared'
import { createComponentInstance, setupComponent } from './component'
import { createAppAPI } from './createApp'
import { queueJob } from './scheduler'
import { Fragment, normalizeVNode, Text } from './vnode'

export function createRenderer(options: any) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
    createText: hostCreateText,
    setText: _hostSetText,
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

  function processFragment(
    n1: any,
    n2: any,
    container: any,
    parentComponent: any,
  ) {
    mountChildren(n2.children, container, parentComponent)
  }

  function processText(n1: any, n2: any, container: any) {
    const { children } = n2
    const textNode = (n2.el = hostCreateText(children))
    hostInsert(textNode, container)
  }

  function processElement(
    n1: any,
    n2: any,
    container: any,
    parentComponent: any,
  ) {
    if (!n1) {
      mountElement(n2, container, parentComponent)
    }
    else {
      patchElement(n1, n2, container, parentComponent)
    }
  }

  function patchElement(
    n1: any,
    n2: any,
    container: any,
    parentComponent: any,
  ) {
    const oldProps = n1.props || {}
    const newProps = n2.props || {}
    const el = (n2.el = n1.el)

    patchProps(el, oldProps, newProps)
    patchChildren(n1, n2, el, parentComponent)
  }

  function patchProps(el: any, oldProps: any, newProps: any) {
    if (oldProps !== newProps) {
      for (const key in newProps) {
        const prevProp = oldProps[key]
        const nextProp = newProps[key]
        if (prevProp !== nextProp) {
          hostPatchProp(el, key, prevProp, nextProp)
        }
      }

      if (Object.keys(oldProps).length > 0) {
        for (const key in oldProps) {
          if (!(key in newProps)) {
            hostPatchProp(el, key, oldProps[key], null)
          }
        }
      }
    }
  }

  function patchChildren(
    n1: any,
    n2: any,
    container: any,
    parentComponent: any,
  ) {
    const { shapeFlag: prevShapeFlag, children: c1 } = n1
    const { shapeFlag, children: c2 } = n2

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1)
      }
      if (c1 !== c2) {
        hostSetElementText(container, c2)
      }
    }
    else {
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText(container, '')
        mountChildren(c2, container, parentComponent)
      }
      else {
        patchKeyedChildren(c1, c2, container, parentComponent)
      }
    }
  }

  function patchKeyedChildren(
    c1: any,
    c2: any,
    container: any,
    parentComponent: any,
  ) {
    let i = 0
    const l2 = c2.length
    let e1 = c1.length - 1
    let e2 = l2 - 1

    function isSameVNodeType(n1: any, n2: any) {
      return n1.type === n2.type && n1.key === n2.key
    }

    // 左侧
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

    // 右侧
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

    // 新的比老的长
    if (i > e1) {
      if (i <= e2) {
        const nextPos = e2 + 1
        const _anchor = nextPos < l2 ? c2[nextPos].el : null
        while (i <= e2) {
          patch(null, c2[i], container, parentComponent)
          i++
        }
      }
    }
    else if (i > e2) {
      // 老的比新的长
      while (i <= e1) {
        hostRemove(c1[i].el)
        i++
      }
    }
    else {
      // 中间对比
      const s1 = i
      const s2 = i

      const toBePatched = e2 - s2 + 1
      let patched = 0

      const keyToNewIndexMap = new Map()
      const newIndexToOldIndexMap = new Array(toBePatched)
      let moved = false
      let maxNewIndexSoFar = 0

      for (let i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0

      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i]
        keyToNewIndexMap.set(nextChild.key, i)
      }

      for (let i = s1; i <= e1; i++) {
        const prevChild = c1[i]

        if (patched >= toBePatched) {
          hostRemove(prevChild.el)
          continue
        }

        let newIndex
        if (prevChild.key != null) {
          newIndex = keyToNewIndexMap.get(prevChild.key)
        }
        else {
          for (let j = s2; j <= e2; j++) {
            if (isSameVNodeType(prevChild, c2[j])) {
              newIndex = j
              break
            }
          }
        }

        if (newIndex === undefined) {
          hostRemove(prevChild.el)
        }
        else {
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex
          }
          else {
            moved = true
          }

          newIndexToOldIndexMap[newIndex - s2] = i + 1
          patch(prevChild, c2[newIndex], container, parentComponent)
          patched++
        }
      }

      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : []
      let j = increasingNewIndexSequence.length - 1

      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = i + s2
        const nextChild = c2[nextIndex]
        const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null

        if (newIndexToOldIndexMap[i] === 0) {
          patch(null, nextChild, container, parentComponent)
        }
        else if (moved) {
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            hostInsert(nextChild.el, container, anchor)
          }
          else {
            j--
          }
        }
      }
    }
  }

  function unmountChildren(children: any) {
    for (let i = 0; i < children.length; i++) {
      const el = children[i].el
      hostRemove(el)
    }
  }

  function mountElement(vnode: any, container: any, parentComponent: any) {
    const el = (vnode.el = hostCreateElement(vnode.type))

    const { children, shapeFlag, props } = vnode

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children)
    }
    else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el, parentComponent)
    }

    for (const key in props) {
      const val = props[key]
      hostPatchProp(el, key, null, val)
    }

    hostInsert(el, container)
  }

  function mountChildren(children: any, container: any, parentComponent: any) {
    children.forEach((v: any) => {
      patch(null, v, container, parentComponent)
    })
  }

  function processComponent(
    n1: any,
    n2: any,
    container: any,
    parentComponent: any,
  ) {
    if (!n1) {
      mountComponent(n2, container, parentComponent)
    }
    else {
      updateComponent(n1, n2)
    }
  }

  function updateComponent(n1: any, n2: any) {
    const instance = (n2.component = n1.component)
    if (shouldUpdateComponent(n1, n2)) {
      instance.next = n2
      instance.update()
    }
    else {
      n2.el = n1.el
      instance.vnode = n2
    }
  }

  function mountComponent(
    initialVNode: any,
    container: any,
    parentComponent: any,
  ) {
    const instance = (initialVNode.component = createComponentInstance(
      initialVNode,
      parentComponent,
    ))

    setupComponent(instance)
    setupRenderEffect(instance, initialVNode, container)
  }

  function setupRenderEffect(instance: any, initialVNode: any, container: any) {
    instance.update = effect(
      () => {
        if (!instance.isMounted) {
          const { proxy } = instance
          const subTree = (instance.subTree = normalizeVNode(
            instance.render.call(proxy, proxy),
          ))

          patch(null, subTree, container, instance)

          initialVNode.el = subTree.el
          instance.isMounted = true
        }
        else {
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

  function updateComponentPreRender(instance: any, nextVNode: any) {
    instance.vnode = nextVNode
    instance.next = null
    instance.props = nextVNode.props
  }

  function shouldUpdateComponent(prevVNode: any, nextVNode: any): boolean {
    const { props: prevProps } = prevVNode
    const { props: nextProps } = nextVNode

    for (const key in nextProps) {
      if (nextProps[key] !== prevProps[key]) {
        return true
      }
    }

    return false
  }

  return {
    createApp: createAppAPI(render),
  }
}

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
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  return result
}
