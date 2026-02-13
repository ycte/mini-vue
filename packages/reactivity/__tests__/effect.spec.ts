import { describe, expect, it, vi } from 'vitest'
import { effect, stop } from '../src/effect'
import { reactive } from '../src/reactive'

describe('effect', () => {
  it('happy path', () => {
    const user = reactive({
      age: 10,
    })

    let nextAge
    effect(() => {
      nextAge = user.age + 1
    })

    expect(nextAge).toBe(11)

    // update
    user.age++
    expect(nextAge).toBe(12)
  })

  it('should return runner when call effect', () => {
    let foo = 10
    const runner = effect(() => {
      foo++
      return 'foo'
    })

    expect(foo).toBe(11)
    const r = runner()
    expect(foo).toBe(12)
    expect(r).toBe('foo')
  })

  it('scheduler', () => {
    let dummy
    let run: any
    const scheduler = vi.fn(() => {
      run = runner
    })
    const obj = reactive({ foo: 1 })
    const runner = effect(
      () => {
        dummy = obj.foo
      },
      { scheduler },
    )

    expect(scheduler).not.toHaveBeenCalled()
    expect(dummy).toBe(1)

    // should be called on first trigger
    obj.foo++
    expect(scheduler).toHaveBeenCalledTimes(1)
    // should not run yet
    expect(dummy).toBe(1)

    // manually run
    run()
    // should have run
    expect(dummy).toBe(2)
  })

  it('stop', () => {
    let dummy
    const obj = reactive({ prop: 1 })
    const runner = effect(() => {
      dummy = obj.prop
    })

    obj.prop = 2
    expect(dummy).toBe(2)

    stop(runner)
    obj.prop = 3
    expect(dummy).toBe(2)

    // stopped effect should still be manually callable
    runner()
    expect(dummy).toBe(3)
  })

  it('onStop', () => {
    const obj = reactive({
      foo: 1,
    })
    const onStop = vi.fn()
    let dummy
    const runner = effect(
      () => {
        dummy = obj.foo
      },
      {
        onStop,
      },
    )

    stop(runner)
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('should not run when stopped after update', () => {
    let dummy
    const obj = reactive({ prop: 1 })
    const runner = effect(() => {
      dummy = obj.prop
    })

    obj.prop = 2
    expect(dummy).toBe(2)

    stop(runner)
    obj.prop++
    expect(dummy).toBe(2)
  })

  it('should avoid duplicate dependency collection', () => {
    const obj = reactive({ prop: 1 })
    const fnSpy = vi.fn(() => {
      // 多次访问同一属性
      obj.prop
      obj.prop
      obj.prop
    })

    effect(fnSpy)
    expect(fnSpy).toHaveBeenCalledTimes(1)

    // 触发更新应该只执行一次
    obj.prop = 2
    expect(fnSpy).toHaveBeenCalledTimes(2)
  })

  it('should handle branch switching (cleanup)', () => {
    let dummy
    const obj = reactive({ ok: true, text: 'hello' })
    const runner = effect(() => {
      dummy = obj.ok ? obj.text : 'not ok'
    })

    expect(dummy).toBe('hello')

    // 改变分支条件
    obj.ok = false
    expect(dummy).toBe('not ok')

    // 改变 text 不应该触发 effect（因为已经不在那个分支了）
    obj.text = 'world'
    expect(dummy).toBe('not ok')

    // 恢复分支
    obj.ok = true
    expect(dummy).toBe('world')
  })
})
