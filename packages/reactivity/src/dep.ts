import type { ReactiveEffect } from './effect'

// 用于存储所有的 effect 对象
export function createDep(effects?: any): Dep {
  const dep = new Set(effects) as Dep
  return dep
}

export type Dep = Set<ReactiveEffect> & {
  cleanup?: () => void
  computed?: any
}
