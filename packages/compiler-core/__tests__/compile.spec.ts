import { describe, expect, it } from 'vitest'
import { baseParse } from '../src/parse'
import { transform } from '../src/transform'
import { generate } from '../src/codegen'
import { transformElement } from '../src/transforms/transformElement'
import { transformText } from '../src/transforms/transformText'
import { transformExpression } from '../src/transforms/transformExpression'

describe('Compiler integration', () => {
  function compile(template: string) {
    const ast = baseParse(template)
    transform(ast, {
      nodeTransforms: [transformExpression, transformElement, transformText],
    })
    return generate(ast)
  }

  it('should compile simple template', () => {
    const { code } = compile('<div>hello</div>')
    expect(code).toMatchSnapshot()
  })

  it('should compile template with interpolation', () => {
    const { code } = compile('<div>hello, {{ name }}</div>')
    expect(code).toMatchSnapshot()
  })

  it('should compile template with nested elements', () => {
    const { code } = compile('<div><h1>Title</h1><p>Content</p></div>')
    expect(code).toMatchSnapshot()
  })

  it('should compile template with multiple interpolations', () => {
    const { code } = compile('<div>{{ greeting }}, {{ name }}!</div>')
    expect(code).toMatchSnapshot()
  })

  it('should compile complex template', () => {
    const { code } = compile(`
      <div>
        <h1>{{ title }}</h1>
        <p>Hello, {{ name }}!</p>
      </div>
    `)
    expect(code).toMatchSnapshot()
  })
})
