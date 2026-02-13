import { describe, expect, it, vi } from 'vitest'
import { createComponentInstance, setupComponent } from '../src/component'
import { h } from '../src/h'

describe('component emit', () => {
  it('should emit event', () => {
    const onAdd = vi.fn()
    const Comp = {
      setup(_props: any, { emit }: any) {
        emit('add')
        return {}
      },
      render() {},
    }
    const vnode = h(Comp, { onAdd })
    const instance = createComponentInstance(vnode, null)
    setupComponent(instance)

    expect(onAdd).toHaveBeenCalled()
  })

  it('should emit with kebab-case', () => {
    const onAddFoo = vi.fn()
    const Comp = {
      setup(_props: any, { emit }: any) {
        emit('add-foo')
        return {}
      },
      render() {},
    }
    const vnode = h(Comp, { onAddFoo })
    const instance = createComponentInstance(vnode, null)
    setupComponent(instance)

    expect(onAddFoo).toHaveBeenCalled()
  })

  it('should emit with arguments', () => {
    const onAdd = vi.fn()
    const Comp = {
      setup(_props: any, { emit }: any) {
        emit('add', 1, 2)
        return {}
      },
      render() {},
    }
    const vnode = h(Comp, { onAdd })
    const instance = createComponentInstance(vnode, null)
    setupComponent(instance)

    expect(onAdd).toHaveBeenCalledWith(1, 2)
  })

  it('should support camelCase event name', () => {
    const onAddFoo = vi.fn()
    const Comp = {
      setup(_props: any, { emit }: any) {
        emit('addFoo')
        return {}
      },
      render() {},
    }
    const vnode = h(Comp, { onAddFoo })
    const instance = createComponentInstance(vnode, null)
    setupComponent(instance)

    expect(onAddFoo).toHaveBeenCalled()
  })
})
