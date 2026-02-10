export * from '@mini-vue/runtime-core'
import { createRenderer } from '@mini-vue/runtime-core'
import { extend } from '@mini-vue/shared'
import { patchProp } from './patchProp'

function createElement(type: string) {
  return document.createElement(type)
}

function createText(text: string) {
  return document.createTextNode(text)
}

function setText(node: any, text: string) {
  node.nodeValue = text
}

function setElementText(el: any, text: string) {
  el.textContent = text
}

function insert(child: any, parent: any, anchor: any = null) {
  parent.insertBefore(child, anchor)
}

function remove(child: any) {
  const parent = child.parentNode
  if (parent) {
    parent.removeChild(child)
  }
}

const renderer: any = createRenderer({
  createElement,
  patchProp,
  insert,
  remove,
  setElementText,
  createText,
  setText,
})

export function createApp(...args: any[]) {
  return renderer.createApp(...args)
}

export { createRenderer }
