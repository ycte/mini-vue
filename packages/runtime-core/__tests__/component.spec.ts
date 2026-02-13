import { reactive } from '@mini-vue/reactivity'
import { describe, expect, it } from 'vitest'
import {
  createComponentInstance,
  getCurrentInstance,
  setupComponent,
} from '../src/component'
import { h } from '../src/h'

describe('component', () => {
  describe('createComponentInstance', () => {
    it('should create component instance', () => {
      const vnode = h({
        setup() {},
        render() {},
      })
      const instance = createComponentInstance(vnode, null)

      expect(instance.vnode).toBe(vnode)
      expect(instance.type).toBe(vnode.type)
      expect(instance.setupState).toEqual({})
      expect(instance.props).toEqual({})
      expect(instance.emit).toBeDefined()
    })

    it('should inherit parent provides', () => {
      const parent = {
        provides: { foo: 1 },
      }
      const vnode = h({ render() {} })
      const instance = createComponentInstance(vnode, parent)

      expect(instance.provides).toBe(parent.provides)
    })
  })

  describe('setupComponent', () => {
    it('should call setup and handle return value', () => {
      const Comp = {
        setup() {
          return {
            count: 1,
          }
        },
        render() {},
      }
      const vnode = h(Comp)
      const instance = createComponentInstance(vnode, null)
      setupComponent(instance)

      expect(instance.setupState.count).toBe(1)
      expect(instance.render).toBe(Comp.render)
    })

    it('should pass props to setup', () => {
      let propsInSetup: any
      const Comp = {
        props: ['count'],
        setup(props: any) {
          propsInSetup = props
          return {}
        },
        render() {},
      }
      const vnode = h(Comp, { count: 1 })
      const instance = createComponentInstance(vnode, null)
      setupComponent(instance)

      expect(propsInSetup.count).toBe(1)
    })

    it('should pass emit to setup context', () => {
      let emitInSetup: any
      const Comp = {
        setup(_props: any, { emit }: any) {
          emitInSetup = emit
          return {}
        },
        render() {},
      }
      const vnode = h(Comp)
      const instance = createComponentInstance(vnode, null)
      setupComponent(instance)

      expect(typeof emitInSetup).toBe('function')
    })

    it('should create proxy for accessing setupState in render', () => {
      const Comp = {
        setup() {
          return {
            msg: 'hello',
          }
        },
        render() {},
      }
      const vnode = h(Comp)
      const instance = createComponentInstance(vnode, null)
      setupComponent(instance)

      expect(instance.proxy.msg).toBe('hello')
    })

    it('should support accessing props via proxy', () => {
      const Comp = {
        props: ['msg'],
        setup() {
          return {}
        },
        render() {},
      }
      const vnode = h(Comp, { msg: 'hello' })
      const instance = createComponentInstance(vnode, null)
      setupComponent(instance)

      expect(instance.proxy.msg).toBe('hello')
    })
  })

  describe('getCurrentInstance', () => {
    it('should get current instance in setup', () => {
      let instance: any
      const Comp = {
        setup() {
          instance = getCurrentInstance()
          return {}
        },
        render() {},
      }
      const vnode = h(Comp)
      const componentInstance = createComponentInstance(vnode, null)
      setupComponent(componentInstance)

      expect(instance).toBe(componentInstance)
    })

    it('should return null outside setup', () => {
      expect(getCurrentInstance()).toBeNull()
    })
  })
})
