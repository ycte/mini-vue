// ShapeFlags 用于标识 VNode 的类型
export const enum ShapeFlags {
  ELEMENT = 1, // 1
  STATEFUL_COMPONENT = 1 << 1, // 10 -> 2
  TEXT_CHILDREN = 1 << 2, // 100 -> 4
  ARRAY_CHILDREN = 1 << 3, // 1000 -> 8
  SLOTS_CHILDREN = 1 << 4, // 10000 -> 16
}
