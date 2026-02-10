import { isObject } from '@mini-vue/shared'
import {
  mutableHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers,
} from './baseHandlers'

export const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
}

const reactiveMap = new WeakMap()
const readonlyMap = new WeakMap()
const shallowReadonlyMap = new WeakMap()

export function reactive(target: any) {
  return createReactiveObject(target, reactiveMap, mutableHandlers)
}

export function readonly(target: any) {
  return createReactiveObject(target, readonlyMap, readonlyHandlers)
}

export function shallowReadonly(target: any) {
  return createReactiveObject(
    target,
    shallowReadonlyMap,
    shallowReadonlyHandlers,
  )
}

function createReactiveObject(
  target: any,
  proxyMap: WeakMap<any, any>,
  baseHandlers: ProxyHandler<any>,
) {
  if (!isObject(target)) {
    console.warn(`value cannot be made reactive: ${String(target)}`)
    return target
  }

  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }

  const proxy = new Proxy(target, baseHandlers)
  proxyMap.set(target, proxy)
  return proxy
}

export function isReactive(value: any): boolean {
  return !!(value && value[ReactiveFlags.IS_REACTIVE])
}

export function isReadonly(value: any): boolean {
  return !!(value && value[ReactiveFlags.IS_READONLY])
}

export function isProxy(value: any): boolean {
  return isReactive(value) || isReadonly(value)
}

export function toRaw(observed: any): any {
  const original = observed && observed['__v_raw']
  return original ? toRaw(original) : observed
}
