export const enum NodeTypes {
  ELEMENT = 'element',
  TEXT = 'text',
}

let nodeId = 0

function createElement(tag: string) {
  const node = {
    tag,
    id: nodeId++,
    type: NodeTypes.ELEMENT,
    children: [],
    props: {},
    parentNode: null,
  }
  return node
}

function insert(child: any, parent: any, anchor: any = null) {
  child.parentNode = parent
  if (anchor) {
    const index = parent.children.indexOf(anchor)
    if (index !== -1) {
      parent.children.splice(index, 0, child)
    }
    else {
      parent.children.push(child)
    }
  }
  else {
    parent.children.push(child)
  }
}

function remove(child: any) {
  const parent = child.parentNode
  if (parent) {
    const index = parent.children.indexOf(child)
    if (index !== -1) {
      parent.children.splice(index, 1)
    }
  }
}

function setElementText(el: any, text: string) {
  el.children = [
    {
      id: nodeId++,
      type: NodeTypes.TEXT,
      text,
      parentNode: el,
    },
  ]
}

function parentNode(node: any) {
  return node.parentNode
}

function createText(text: string) {
  return {
    id: nodeId++,
    type: NodeTypes.TEXT,
    text,
    parentNode: null,
  }
}

function setText(node: any, text: string) {
  node.text = text
}

function patchProp(el: any, key: string, prevValue: any, nextValue: any) {
  el.props[key] = nextValue
}

export const nodeOps = {
  createElement,
  insert,
  remove,
  setElementText,
  parentNode,
  createText,
  setText,
  patchProp,
}
