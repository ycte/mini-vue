import { describe, expect, it } from 'vitest'
import { createComponentInstance, setupComponent } from '../src/component'
import { h } from '../src/h'

describe('component props', () => {
  it('should initialize props', () => {
    const Comp = {
      props: ['foo', 'bar'],
      render() {},
    }
    const vnode = h(Comp, { foo: 1, bar: 2 })
    const instance = createComponentInstance(vnode, null)
    setupComponent(instance)

    expect(instance.props.foo).toBe(1)
    expect(instance.props.bar).toBe(2)
  })

  it('should pass props to setup', () => {
    let props: any
    const Comp = {
      props: ['count'],
      setup(p: any) {
        props = p
        return {}
      },
      render() {},
    }
    const vnode = h(Comp, { count: 1 })
    const instance = createComponentInstance(vnode, null)
    setupComponent(instance)

    expect(props.count).toBe(1)
  })

  it('should access props in render via this', () => {
    const Comp = {
      props: ['msg'],
      render() {},
    }
    const vnode = h(Comp, { msg: 'hello' })
    const instance = createComponentInstance(vnode, null)
    setupComponent(instance)

    expect(instance.proxy.msg).toBe('hello')
  })

  it('should be readonly', () => {
    let props: any
    const Comp = {
      props: ['count'],
      setup(p: any) {
        props = p
        return {}
      },
      render() {},
    }
    const vnode = h(Comp, { count: 1 })
    const instance = createComponentInstance(vnode, null)
    setupComponent(instance)

    // 在 shallowReadonly 中, 设置会发出警告但不会改变值
    expect(() => {
      props.count = 2
    }).not.toThrow()
    expect(props.count).toBe(1)
  })
})
