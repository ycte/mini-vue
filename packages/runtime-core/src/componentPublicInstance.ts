import { hasOwn } from '@mini-vue/shared'

const publicPropertiesMap: any = {
  $el: (i: any) => i.vnode.el,
  $slots: (i: any) => i.slots,
  $props: (i: any) => i.props,
}

export const PublicInstanceProxyHandlers = {
  get({ _: instance }: any, key: string) {
    const { setupState, props } = instance

    if (hasOwn(setupState, key)) {
      return setupState[key]
    } else if (hasOwn(props, key)) {
      return props[key]
    }

    const publicGetter = publicPropertiesMap[key]
    if (publicGetter) {
      return publicGetter(instance)
    }
  },
  has({ _: instance }: any, key: string) {
    const { setupState, props } = instance
    return (
      hasOwn(setupState, key) ||
      hasOwn(props, key) ||
      key in publicPropertiesMap
    )
  },
}
