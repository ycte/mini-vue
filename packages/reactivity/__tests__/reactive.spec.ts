import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isProxy,
  isReactive,
  isReadonly,
  reactive,
  readonly,
  shallowReadonly,
} from '../src/reactive'

describe('reactive', () => {
  it('happy path', () => {
    const original = { foo: 1 }
    const observed = reactive(original)

    expect(observed).not.toBe(original)
    expect(observed.foo).toBe(1)
  })

  it('nested reactives', () => {
    const original = {
      nested: {
        foo: 1,
      },
      array: [{ bar: 2 }],
    }
    const observed = reactive(original)

    expect(isReactive(observed.nested)).toBe(true)
    expect(isReactive(observed.array)).toBe(true)
    expect(isReactive(observed.array[0])).toBe(true)
  })
})

describe('readonly', () => {
  let warnSpy: any

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('should make nested values readonly', () => {
    const original = { foo: 1, bar: { baz: 2 } }
    const wrapped = readonly(original)

    expect(wrapped).not.toBe(original)
    expect(isReadonly(wrapped)).toBe(true)
    expect(isReadonly(original)).toBe(false)
    expect(isReadonly(wrapped.bar)).toBe(true)
    expect(isReadonly(original.bar)).toBe(false)
    expect(wrapped.foo).toBe(1)
  })

  it('should call console.warn when set', () => {
    const user = readonly({
      age: 10,
    })

    user.age = 11

    expect(warnSpy).toHaveBeenCalled()
  })

  it('should not allow mutation', () => {
    const original = { foo: 1 }
    const wrapped = readonly(original)

    wrapped.foo = 2
    expect(wrapped.foo).toBe(1)
    expect(warnSpy).toHaveBeenCalled()
  })
})

describe('isReactive', () => {
  it('should work', () => {
    const original = { foo: 1 }
    const observed = reactive(original)

    expect(isReactive(observed)).toBe(true)
    expect(isReactive(original)).toBe(false)
  })

  it('isReactive for readonly', () => {
    const original = { foo: 1 }
    const wrapped = readonly(original)

    expect(isReactive(wrapped)).toBe(false)
  })
})

describe('isReadonly', () => {
  it('should work', () => {
    const original = { foo: 1 }
    const wrapped = readonly(original)

    expect(isReadonly(wrapped)).toBe(true)
    expect(isReadonly(original)).toBe(false)
  })

  it('isReadonly for reactive', () => {
    const original = { foo: 1 }
    const observed = reactive(original)

    expect(isReadonly(observed)).toBe(false)
  })
})

describe('isProxy', () => {
  it('should work for reactive', () => {
    const original = { foo: 1 }
    const observed = reactive(original)

    expect(isProxy(observed)).toBe(true)
    expect(isProxy(original)).toBe(false)
  })

  it('should work for readonly', () => {
    const original = { foo: 1 }
    const wrapped = readonly(original)

    expect(isProxy(wrapped)).toBe(true)
    expect(isProxy(original)).toBe(false)
  })
})

describe('shallowReadonly', () => {
  let warnSpy: any

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('should not make non-reactive properties reactive', () => {
    const props = shallowReadonly({ n: { foo: 1 } })

    expect(isReadonly(props)).toBe(true)
    expect(isReadonly(props.n)).toBe(false)
  })

  it('should make root level properties readonly', () => {
    const original = { foo: 1 }
    const wrapped = shallowReadonly(original)

    wrapped.foo = 2
    expect(wrapped.foo).toBe(1)
    expect(warnSpy).toHaveBeenCalled()
  })

  it('should allow mutation of nested properties', () => {
    const original = { nested: { foo: 1 } }
    const wrapped = shallowReadonly(original)

    wrapped.nested.foo = 2
    expect(wrapped.nested.foo).toBe(2)
  })
})
