import { createDep, Dep } from './dep'
import { extend } from '@mini-vue/shared'

let activeEffect: ReactiveEffect | undefined = void 0
let shouldTrack = false
const targetMap = new WeakMap()

export class ReactiveEffect {
  private _fn: any
  public deps: Dep[] = []
  public active = true
  public onStop?: () => void
  public scheduler?: (...args: any[]) => any

  constructor(fn: any, scheduler?: any) {
    this._fn = fn
    this.scheduler = scheduler
  }

  run() {
    // 如果调用了 stop 就不应该收集依赖了
    if (!this.active) {
      return this._fn()
    }

    // 应该收集
    shouldTrack = true
    activeEffect = this as any

    const result = this._fn()
    // 重置
    shouldTrack = false
    activeEffect = undefined

    return result
  }

  stop() {
    if (this.active) {
      cleanupEffect(this)
      if (this.onStop) {
        this.onStop()
      }
      this.active = false
    }
  }
}

function cleanupEffect(effect: ReactiveEffect) {
  effect.deps.forEach((dep: any) => {
    dep.delete(effect)
  })
  effect.deps.length = 0
}

export function effect(fn: any, options: any = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler)

  // 用 extend 把 options 上的属性都扩展到 _effect 上
  extend(_effect, options)

  _effect.run()

  const runner: any = _effect.run.bind(_effect)
  runner.effect = _effect

  return runner
}

export function stop(runner: any) {
  runner.effect.stop()
}

export function track(target: object, type: string, key: string | symbol) {
  if (!isTracking()) {
    return
  }

  // 1. 先基于 target 找到对应的 dep
  // 如果是第一次的话，那么就需要初始化
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  let dep = depsMap.get(key)
  if (!dep) {
    dep = createDep()
    depsMap.set(key, dep)
  }

  trackEffects(dep)
}

export function trackEffects(dep: Dep) {
  // 用 dep 来存放所有的 effect
  if (!dep.has(activeEffect!)) {
    dep.add(activeEffect!)
    ;(activeEffect as any).deps.push(dep)
  }
}

export function isTracking() {
  return shouldTrack && activeEffect !== undefined
}

export function trigger(target: object, type: string, key: string | symbol) {
  let depsMap = targetMap.get(target)
  if (!depsMap) return

  let dep = depsMap.get(key)

  triggerEffects(dep)
}

export function triggerEffects(dep: Dep) {
  // 执行收集到的所有的 effect 的 run 方法
  for (const effect of dep) {
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }
}
