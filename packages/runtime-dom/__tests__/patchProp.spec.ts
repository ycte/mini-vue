import { describe, expect, it } from 'vitest'
import { patchProp } from '../src/patchProp'

// Mock DOM elements for testing
class MockElement {
  attributes: Map<string, any> = new Map()
  eventListeners: Map<string, any> = new Map()

  setAttribute(key: string, value: any) {
    this.attributes.set(key, value)
  }

  getAttribute(key: string) {
    return this.attributes.get(key) || null
  }

  removeAttribute(key: string) {
    this.attributes.delete(key)
  }

  addEventListener(event: string, handler: any) {
    this.eventListeners.set(event, handler)
  }

  click() {
    const handler = this.eventListeners.get('click')
    if (handler) handler()
  }

  dispatchEvent(event: { type: string }) {
    const handler = this.eventListeners.get(event.type)
    if (handler) handler()
  }
}

describe('patchProp', () => {
  it('should set attribute', () => {
    const el = new MockElement()
    patchProp(el, 'id', null, 'foo')
    expect(el.getAttribute('id')).toBe('foo')
  })

  it('should update attribute', () => {
    const el = new MockElement()
    patchProp(el, 'id', 'foo', 'bar')
    expect(el.getAttribute('id')).toBe('bar')
  })

  it('should remove attribute when value is null', () => {
    const el = new MockElement()
    el.setAttribute('id', 'foo')
    patchProp(el, 'id', 'foo', null)
    expect(el.getAttribute('id')).toBeNull()
  })

  it('should remove attribute when value is undefined', () => {
    const el = new MockElement()
    el.setAttribute('id', 'foo')
    patchProp(el, 'id', 'foo', undefined)
    expect(el.getAttribute('id')).toBeNull()
  })

  it('should add event listener', () => {
    const el = new MockElement()
    const onClick = vi.fn()
    patchProp(el, 'onClick', null, onClick)
    
    el.click()
    expect(onClick).toHaveBeenCalled()
  })

  it('should handle event with different case', () => {
    const el = new MockElement()
    const onInput = vi.fn()
    patchProp(el, 'onInput', null, onInput)
    
    el.dispatchEvent({ type: 'input' })
    expect(onInput).toHaveBeenCalled()
  })
})
