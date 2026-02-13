import { describe, expect, it } from 'vitest'
import { h } from '../src/h'
import { ShapeFlags } from '@mini-vue/shared'

describe('h', () => {
  it('should create vnode with type only', () => {
    const vnode = h('div')
    expect(vnode.type).toBe('div')
    expect(vnode.props).toEqual({})
    expect(vnode.children).toEqual([])
  })

  it('should create vnode with props', () => {
    const vnode = h('div', { id: 'foo' })
    expect(vnode.type).toBe('div')
    expect(vnode.props).toEqual({ id: 'foo' })
  })

  it('should create vnode with string children', () => {
    const vnode = h('div', null, 'hello')
    expect(vnode.children).toBe('hello')
  })

  it('should create vnode with array children', () => {
    const vnode = h('div', null, [h('span'), h('span')])
    expect(Array.isArray(vnode.children)).toBe(true)
    expect(vnode.children.length).toBe(2)
  })

  it('should create component vnode', () => {
    const Comp = { render() {} }
    const vnode = h(Comp)
    expect(vnode.type).toBe(Comp)
    expect(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT).toBeTruthy()
  })
})
