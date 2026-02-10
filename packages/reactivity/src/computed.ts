import { ReactiveEffect } from './effect'

class ComputedRefImpl {
  private _value: any
  private _dirty = true
  private _effect: ReactiveEffect
  public dep: any

  constructor(getter: any) {
    this._effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true
      }
    })
  }

  get value() {
    if (this._dirty) {
      this._dirty = false
      this._value = this._effect.run()
    }
    return this._value
  }
}

export function computed(getter: any) {
  return new ComputedRefImpl(getter)
}
