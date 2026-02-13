import { ShapeFlags } from '@mini-vue/shared'
import { describe, expect, it } from 'vitest'
import { createTextVNode, createVNode, Fragment, Text } from '../src/vnode'

describe('vnode', () => {
  describe('createVNode', () => {
    it('should create element vnode', () => {
      const vnode = createVNode('div')
      expect(vnode.type).toBe('div')
      expect(vnode.props).toEqual({})
      expect(vnode.shapeFlag).toBe(ShapeFlags.ELEMENT)
    })

    it('should create component vnode', () => {
      const Comp = { render() {} }
      const vnode = createVNode(Comp)
      expect(vnode.type).toBe(Comp)
      expect(vnode.shapeFlag).toBe(ShapeFlags.STATEFUL_COMPONENT)
    })

    it('should handle string children', () => {
      const vnode = createVNode('div', null, 'hello')
      expect(vnode.children).toBe('hello')
      expect(vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN).toBeTruthy()
    })

    it('should handle array children', () => {
      const vnode = createVNode('div', null, [
        createVNode('span'),
        createVNode('span'),
      ])
      expect(Array.isArray(vnode.children)).toBe(true)
      expect(vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN).toBeTruthy()
    })

    it('should handle slots children for component', () => {
      const Comp = { render() {} }
      const slots = { default: () => [] }
      const vnode = createVNode(Comp, null, slots)
      expect(vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN).toBeTruthy()
    })

    it('should normalize props', () => {
      const vnode = createVNode('div', { id: 'foo', class: 'bar' })
      expect(vnode.props).toEqual({ id: 'foo', class: 'bar' })
    })

    it('should capture key from props', () => {
      const vnode = createVNode('div', { key: 'my-key' })
      expect(vnode.key).toBe('my-key')
    })
  })

  describe('createTextVNode', () => {
    it('should create text vnode', () => {
      const vnode = createTextVNode('hello')
      expect(vnode.type).toBe(Text)
      expect(vnode.children).toBe('hello')
    })

    it('should create text vnode with default space', () => {
      const vnode = createTextVNode()
      expect(vnode.children).toBe(' ')
    })
  })

  describe('fragment', () => {
    it('should have Fragment symbol', () => {
      expect(Fragment).toBeDefined()
      expect(typeof Fragment).toBe('symbol')
    })
  })
})
