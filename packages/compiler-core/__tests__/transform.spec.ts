import { describe, expect, it } from 'vitest'
import { baseParse } from '../src/parse'
import { transform } from '../src/transform'
import { NodeTypes } from '../src/ast'
import { TO_DISPLAY_STRING } from '../src/runtimeHelpers'
import { transformElement } from '../src/transforms/transformElement'
import { transformText } from '../src/transforms/transformText'

describe('Transform', () => {
  it('should transform simple template', () => {
    const ast = baseParse('<div>hello</div>')
    transform(ast, {
      nodeTransforms: [transformElement, transformText],
    })
    
    expect(ast.codegenNode).toBeDefined()
  })

  it('should add TO_DISPLAY_STRING helper for interpolation', () => {
    const ast = baseParse('{{ message }}')
    transform(ast, {
      nodeTransforms: [],
    })
    
    expect(ast.helpers).toContain(TO_DISPLAY_STRING)
  })

  it('should call nodeTransforms', () => {
    const ast = baseParse('<div>hello</div>')
    let called = false
    
    transform(ast, {
      nodeTransforms: [
        (node: any) => {
          if (node.type === NodeTypes.TEXT) {
            called = true
          }
        },
      ],
    })
    
    expect(called).toBe(true)
  })

  it('should support exit functions from transforms', () => {
    const ast = baseParse('<div>hello</div>')
    const calls: string[] = []
    
    transform(ast, {
      nodeTransforms: [
        (node: any) => {
          if (node.type === NodeTypes.ELEMENT) {
            calls.push('enter-element')
            return () => {
              calls.push('exit-element')
            }
          }
        },
        (node: any) => {
          if (node.type === NodeTypes.TEXT) {
            calls.push('enter-text')
            return () => {
              calls.push('exit-text')
            }
          }
        },
      ],
    })
    
    expect(calls).toEqual([
      'enter-element',
      'enter-text',
      'exit-text',
      'exit-element',
    ])
  })

  it('should traverse all nodes', () => {
    const ast = baseParse('<div><p>hello {{ name }}</p></div>')
    const visitedTypes: number[] = []
    
    transform(ast, {
      nodeTransforms: [
        (node: any) => {
          visitedTypes.push(node.type)
        },
      ],
    })
    
    expect(visitedTypes).toContain(NodeTypes.ROOT)
    expect(visitedTypes).toContain(NodeTypes.ELEMENT)
    expect(visitedTypes).toContain(NodeTypes.TEXT)
    expect(visitedTypes).toContain(NodeTypes.INTERPOLATION)
  })
})
