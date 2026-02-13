import { describe, expect, it } from 'vitest'
import { inject, provide } from '../src/apiInject'
import { createComponentInstance, setupComponent } from '../src/component'
import { h } from '../src/h'

describe('apiInject', () => {
  it('should provide and inject', () => {
    let injectedValue: any

    const ChildComp = {
      setup() {
        injectedValue = inject('foo')
        return {}
      },
      render() {},
    }

    const ParentComp = {
      setup() {
        provide('foo', 'bar')
        return {}
      },
      render() {
        return h(ChildComp)
      },
    }

    const parentVnode = h(ParentComp)
    const parentInstance = createComponentInstance(parentVnode, null)
    setupComponent(parentInstance)

    const childVnode = h(ChildComp)
    const childInstance = createComponentInstance(childVnode, parentInstance)
    setupComponent(childInstance)

    expect(injectedValue).toBe('bar')
  })

  it('should inject with default value', () => {
    const Comp = {
      setup() {
        const value = inject('foo', 'default')
        expect(value).toBe('default')
        return {}
      },
      render() {},
    }

    const vnode = h(Comp)
    const instance = createComponentInstance(vnode, null)
    setupComponent(instance)
  })

  it('should inject with default factory function', () => {
    const Comp = {
      setup() {
        const value = inject('foo', () => 'default')
        expect(value).toBe('default')
        return {}
      },
      render() {},
    }

    const vnode = h(Comp)
    const instance = createComponentInstance(vnode, null)
    setupComponent(instance)
  })

  it('should support nested provide/inject', () => {
    let injectedValue: any

    const GrandChildComp = {
      setup() {
        injectedValue = inject('foo')
        return {}
      },
      render() {},
    }

    const ChildComp = {
      setup() {
        provide('bar', 'baz')
        return {}
      },
      render() {
        return h(GrandChildComp)
      },
    }

    const ParentComp = {
      setup() {
        provide('foo', 'bar')
        return {}
      },
      render() {
        return h(ChildComp)
      },
    }

    const parentVnode = h(ParentComp)
    const parentInstance = createComponentInstance(parentVnode, null)
    setupComponent(parentInstance)

    const childVnode = h(ChildComp)
    const childInstance = createComponentInstance(childVnode, parentInstance)
    setupComponent(childInstance)

    const grandChildVnode = h(GrandChildComp)
    const grandChildInstance = createComponentInstance(
      grandChildVnode,
      childInstance,
    )
    setupComponent(grandChildInstance)

    expect(injectedValue).toBe('bar')
  })
})
