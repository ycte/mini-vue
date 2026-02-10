import { proxyRefs, shallowReadonly } from '@mini-vue/reactivity'
import { emit } from './componentEmits'
import { initProps } from './componentProps'
import { PublicInstanceProxyHandlers } from './componentPublicInstance'
import { initSlots } from './componentSlots'

export function createComponentInstance(vnode: any, parent: any) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
    props: {},
    slots: {},
    provides: parent ? parent.provides : {},
    parent,
    isMounted: false,
    subTree: null,
    emit: () => {},
    proxy: null,
    next: null,
  }

  component.emit = emit as any

  return component
}

export function setupComponent(instance: any) {
  const { props, children } = instance.vnode
  initProps(instance, props)
  initSlots(instance, children)
  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance: any) {
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers)

  const Component = instance.type

  const { setup } = Component
  if (setup) {
    setCurrentInstance(instance)

    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit.bind(null, instance),
    })

    setCurrentInstance(null)

    handleSetupResult(instance, setupResult)
  }
  else {
    finishComponentSetup(instance)
  }
}

function handleSetupResult(instance: any, setupResult: any) {
  if (typeof setupResult === 'object') {
    instance.setupState = proxyRefs(setupResult)
  }

  finishComponentSetup(instance)
}

function finishComponentSetup(instance: any) {
  const Component = instance.type

  if (Component.render) {
    instance.render = Component.render
  }
}

let currentInstance: any = null

export function getCurrentInstance() {
  return currentInstance
}

export function setCurrentInstance(instance: any) {
  currentInstance = instance
}

let _compile: any

export function registerRuntimeCompiler(__compile: any) {
  _compile = __compile
}
