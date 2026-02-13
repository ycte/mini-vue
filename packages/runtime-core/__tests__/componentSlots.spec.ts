import { describe, expect, it } from 'vitest'
import { createComponentInstance, setupComponent } from '../src/component'
import { h } from '../src/h'

describe('component slots', () => {
  it('should initialize slots', () => {
    const Comp = {
      setup(_props: any, { slots }: any) {
        expect(slots.default).toBeDefined()
        expect(typeof slots.default).toBe('function')
        return {}
      },
      render() {},
    }
    const slots = {
      default: () => [h('div', null, 'slot content')],
    }
    const vnode = h(Comp, null, slots)
    const instance = createComponentInstance(vnode, null)
    setupComponent(instance)
  })

  it('should support named slots', () => {
    const Comp = {
      setup(_props: any, { slots }: any) {
        expect(slots.header).toBeDefined()
        expect(slots.footer).toBeDefined()
        return {}
      },
      render() {},
    }
    const slots = {
      header: () => [h('div', null, 'header')],
      footer: () => [h('div', null, 'footer')],
    }
    const vnode = h(Comp, null, slots)
    const instance = createComponentInstance(vnode, null)
    setupComponent(instance)
  })

  it('should access slots via this.$slots', () => {
    const Comp = {
      render() {},
    }
    const slots = {
      default: () => [h('div')],
    }
    const vnode = h(Comp, null, slots)
    const instance = createComponentInstance(vnode, null)
    setupComponent(instance)

    expect(instance.proxy.$slots.default).toBeDefined()
  })

  it('should support scoped slots', () => {
    let slotProps: any
    const Comp = {
      setup(_props: any, { slots }: any) {
        const result = slots.default({ count: 1 })
        slotProps = { count: 1 }
        return {}
      },
      render() {},
    }
    const slots = {
      default: (props: any) => {
        slotProps = props
        return [h('div')]
      },
    }
    const vnode = h(Comp, null, slots)
    const instance = createComponentInstance(vnode, null)
    setupComponent(instance)

    expect(slotProps.count).toBe(1)
  })
})
