import { getCurrentInstance } from './component'

export function provide(key: string | symbol, value: any) {
  const currentInstance: any = getCurrentInstance()

  if (currentInstance) {
    let { provides } = currentInstance
    const parentProvides = currentInstance.parent?.provides

    if (provides === parentProvides) {
      provides = currentInstance.provides = Object.create(parentProvides)
    }

    provides[key] = value
  }
}

export function inject(key: string | symbol, defaultValue?: any) {
  const currentInstance: any = getCurrentInstance()

  if (currentInstance) {
    const parentProvides = currentInstance.parent?.provides

    if (parentProvides && key in parentProvides) {
      return parentProvides[key]
    } else if (defaultValue !== undefined) {
      if (typeof defaultValue === 'function') {
        return defaultValue()
      }
      return defaultValue
    }
  }
}
