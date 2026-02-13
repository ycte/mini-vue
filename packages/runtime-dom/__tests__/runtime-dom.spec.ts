import { describe, expect, it } from 'vitest'
import { createApp, h } from '../src'

describe('runtime-dom', () => {
  it('should create app', () => {
    const app = createApp({
      render() {
        return h('div', { id: 'root' }, 'hello')
      },
    })
    expect(app).toBeDefined()
    expect(app.mount).toBeDefined()
  })

  it.skip('should mount app', () => {
    // This test requires a real DOM environment
    // Skipped for now, as we're testing without jsdom
  })

  it.skip('should handle nested elements', () => {
    // This test requires a real DOM environment
    // Skipped for now, as we're testing without jsdom
  })

  it.skip('should handle events', () => {
    // This test requires a real DOM environment
    // Skipped for now, as we're testing without jsdom
  })
})
