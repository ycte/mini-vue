import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, queueJob } from '../src/scheduler'

describe('scheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  describe('queueJob', () => {
    it('should queue jobs', async () => {
      const calls: number[] = []
      const job1 = () => calls.push(1)
      const job2 = () => calls.push(2)

      queueJob(job1)
      queueJob(job2)

      expect(calls).toEqual([])

      await vi.runAllTimersAsync()

      expect(calls).toEqual([1, 2])
    })

    it('should deduplicate queued jobs', async () => {
      const calls: number[] = []
      const job = () => calls.push(1)

      queueJob(job)
      queueJob(job)
      queueJob(job)

      await vi.runAllTimersAsync()

      expect(calls).toEqual([1])
    })

    it('should execute jobs in order', async () => {
      const calls: number[] = []
      const job1 = () => calls.push(1)
      const job2 = () => calls.push(2)
      const job3 = () => calls.push(3)

      queueJob(job1)
      queueJob(job2)
      queueJob(job3)

      await vi.runAllTimersAsync()

      expect(calls).toEqual([1, 2, 3])
    })
  })

  describe('nextTick', () => {
    it('should return a promise', () => {
      const promise = nextTick()
      expect(promise).toBeInstanceOf(Promise)
    })

    it('should resolve after current tick', async () => {
      let resolved = false
      nextTick(() => {
        resolved = true
      })

      expect(resolved).toBe(false)

      await vi.runAllTimersAsync()

      expect(resolved).toBe(true)
    })

    it('should work without callback', async () => {
      let resolved = false
      nextTick().then(() => {
        resolved = true
      })

      expect(resolved).toBe(false)

      await vi.runAllTimersAsync()

      expect(resolved).toBe(true)
    })

    it('should execute after queued jobs', async () => {
      const calls: string[] = []
      const job = () => calls.push('job')

      queueJob(job)
      nextTick(() => calls.push('nextTick'))

      await vi.runAllTimersAsync()

      expect(calls).toEqual(['job', 'nextTick'])
    })
  })
})
