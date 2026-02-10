export * from './shapeFlags'
export * from './toDisplayString'

export const isObject = (val: any): val is object => {
  return val !== null && typeof val === 'object'
}

export const isString = (val: unknown): val is string => typeof val === 'string'

export const extend = Object.assign

// 必须是 on+一个大写字母的格式开头
export const isOn = (key: string) => /^on[A-Z]/.test(key)

export function hasChanged(value: any, oldValue: any): boolean {
  return !Object.is(value, oldValue)
}

export function hasOwn(val: object, key: string | symbol): boolean {
  return Object.prototype.hasOwnProperty.call(val, key)
}

const camelizeRE = /-(\w)/g
/**
 * @private
 * 把烤肉串命名方式转换成驼峰命名方式
 */
export const camelize = (str: string): string => {
  return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''))
}

/**
 * @private
 * 首字母大写
 */
export const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1)

/**
 * @private
 * 添加 on 前缀，并且首字母大写
 */
export const toHandlerKey = (str: string): string =>
  str ? 'on' + capitalize(str) : ''
