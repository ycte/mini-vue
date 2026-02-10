import { createRenderer } from '@mini-vue/runtime-core'
import { extend } from '@mini-vue/shared'
import { nodeOps } from './nodeOps'

const renderer = createRenderer(extend({}, nodeOps))

export const render = renderer.createApp ? undefined : renderer.render

export * from './nodeOps'
export * from '@mini-vue/runtime-core'
