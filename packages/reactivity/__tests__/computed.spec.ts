import { describe, expect, it, vi } from 'vitest'
import { computed } from '../src/computed'
import { reactive } from '../src/reactive'

describe('computed', () => {
  it('happy path', () => {
    const user = reactive({
      age: 1,
    })

    const age = computed(() => {
      return user.age
    })

    expect(age.value).toBe(1)
  })

  it('should compute lazily', () => {
    const value = reactive({
      foo: 1,
    })
    const getter = vi.fn(() => {
      return value.foo
    })
    const cValue = computed(getter)

    // lazy
    expect(getter).not.toHaveBeenCalled()

    expect(cValue.value).toBe(1)
    expect(getter).toHaveBeenCalledTimes(1)

    // should not compute again
    cValue.value
    expect(getter).toHaveBeenCalledTimes(1)

    // should not compute until needed
    value.foo = 2
    expect(getter).toHaveBeenCalledTimes(1)

    // now it should compute
    expect(cValue.value).toBe(2)
    expect(getter).toHaveBeenCalledTimes(2)

    // should not compute again
    cValue.value
    expect(getter).toHaveBeenCalledTimes(2)
  })

  it('should work with reactive', () => {
    const value = reactive({ foo: 1 })
    const cValue = computed(() => value.foo)

    expect(cValue.value).toBe(1)

    value.foo = 2
    expect(cValue.value).toBe(2)
  })

  it('should return updated value when dependencies change', () => {
    const value = reactive({ foo: 1 })
    const cValue = computed(() => value.foo * 2)

    expect(cValue.value).toBe(2)

    value.foo = 2
    expect(cValue.value).toBe(4)

    value.foo = 3
    expect(cValue.value).toBe(6)
  })
})
