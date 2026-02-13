import { isObject } from '@mini-vue/shared'
import { track, trigger } from './effect'
import { ReactiveFlags } from './reactive'

// 用于缓存，避免重复代理
const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

function createGetter(isReadonly = false, shallow = false) {
  return function get(target: any, key: string | symbol, receiver: any) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    }
    else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    }
    else if (key === '__v_raw') {
      return target
    }

    const res = Reflect.get(target, key, receiver)

    if (shallow) {
      return res
    }

    // 看看 res 是不是 object
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res)
    }

    if (!isReadonly) {
      track(target, 'get', key)
    }
    return res
  }
}

function createSetter() {
  return function set(
    target: any,
    key: string | symbol,
    value: any,
    receiver: any,
  ) {
    const res = Reflect.set(target, key, value, receiver)

    trigger(target, 'set', key)
    return res
  }
}

export const mutableHandlers = {
  get,
  set,
}

export const readonlyHandlers = {
  get: readonlyGet,
  set(target: any, key: string | symbol) {
    console.warn(
      `Set operation on key "${String(key)}" failed: target is readonly.`,
      target,
    )
    return true
  },
}

export const shallowReadonlyHandlers = {
  get: shallowReadonlyGet,
  set(target: any, key: string | symbol) {
    console.warn(
      `Set operation on key "${String(key)}" failed: target is readonly.`,
      target,
    )
    return true
  },
}

// 导入循环依赖，需要在函数内部导入
function reactive(target: any): any {
  return createReactiveObject(target, mutableHandlers)
}

function readonly(target: any): any {
  return createReactiveObject(target, readonlyHandlers)
}

function createReactiveObject(target: any, baseHandlers: ProxyHandler<any>) {
  if (!isObject(target)) {
    console.warn(`value cannot be made reactive: ${String(target)}`)
    return target
  }
  return new Proxy(target, baseHandlers)
}
