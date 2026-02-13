import { describe, expect, it } from 'vitest'
import { createComponentInstance, setupComponent } from '../src/component'
import { h } from '../src/h'

describe('component public instance', () => {
  it('should access setupState via this', () => {
    const Comp = {
      setup() {
        return {
          count: 1,
          msg: 'hello',
        }
      },
      render() {},
    }

    const vnode = h(Comp)
    const instance = createComponentInstance(vnode, null)
    setupComponent(instance)

    expect(instance.proxy.count).toBe(1)
    expect(instance.proxy.msg).toBe('hello')
  })

  it('should access props via this', () => {
    const Comp = {
      props: ['foo', 'bar'],
      render() {},
    }

    const vnode = h(Comp, { foo: 1, bar: 2 })
    const instance = createComponentInstance(vnode, null)
    setupComponent(instance)

    expect(instance.proxy.foo).toBe(1)
    expect(instance.proxy.bar).toBe(2)
  })

  it('should access $el via this', () => {
    const Comp = {
      render() {},
    }

    const vnode = h(Comp)
    const instance = createComponentInstance(vnode, null)
    setupComponent(instance)

    expect('$el' in instance.proxy).toBe(true)
  })

  it('should access $slots via this', () => {
    const Comp = {
      render() {},
    }

    const slots = {
      default: () => [h('div')],
    }
    const vnode = h(Comp, null, slots)
    const instance = createComponentInstance(vnode, null)
    setupComponent(instance)

    expect(instance.proxy.$slots).toBe(instance.slots)
  })

  it('should access $props via this', () => {
    const Comp = {
      props: ['foo'],
      render() {},
    }

    const vnode = h(Comp, { foo: 1 })
    const instance = createComponentInstance(vnode, null)
    setupComponent(instance)

    expect(instance.proxy.$props).toBe(instance.props)
  })

  it('should prioritize setupState over props', () => {
    const Comp = {
      props: ['foo'],
      setup() {
        return {
          foo: 'setupState',
        }
      },
      render() {},
    }

    const vnode = h(Comp, { foo: 'props' })
    const instance = createComponentInstance(vnode, null)
    setupComponent(instance)

    expect(instance.proxy.foo).toBe('setupState')
  })
})
