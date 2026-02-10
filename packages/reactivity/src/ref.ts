import type { Dep } from './dep'
import { hasChanged, isObject } from '@mini-vue/shared'
import { createDep } from './dep'
import { isTracking, trackEffects, triggerEffects } from './effect'
import { reactive } from './reactive'

export class RefImpl {
  private _rawValue: any
  private _value: any
  public dep: Dep | undefined
  public __v_isRef = true

  constructor(value: any) {
    this._rawValue = value
    this._value = convert(value)
    this.dep = createDep()
  }

  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newValue) {
    if (hasChanged(newValue, this._rawValue)) {
      this._rawValue = newValue
      this._value = convert(newValue)
      triggerRefValue(this)
    }
  }
}

function convert(value: any) {
  return isObject(value) ? reactive(value) : value
}

function trackRefValue(ref: RefImpl) {
  if (isTracking()) {
    trackEffects(ref.dep)
  }
}

function triggerRefValue(ref: RefImpl) {
  triggerEffects(ref.dep)
}

export function ref(value: any) {
  return new RefImpl(value)
}

export function isRef(ref: any): boolean {
  return !!(ref && ref.__v_isRef === true)
}

export function unRef(ref: any) {
  return isRef(ref) ? ref.value : ref
}

export function proxyRefs(objectWithRefs: any) {
  return new Proxy(objectWithRefs, {
    get(target, key, receiver) {
      return unRef(Reflect.get(target, key, receiver))
    },
    set(target, key, value, receiver) {
      const oldValue = target[key]
      if (isRef(oldValue) && !isRef(value)) {
        oldValue.value = value
        return true
      }
      else {
        return Reflect.set(target, key, value, receiver)
      }
    },
  })
}
