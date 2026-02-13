import { describe, expect, it } from 'vitest'
import { baseParse } from '../src/parse'
import { generate } from '../src/codegen'
import { transform } from '../src/transform'
import { transformElement } from '../src/transforms/transformElement'
import { transformText } from '../src/transforms/transformText'
import { transformExpression } from '../src/transforms/transformExpression'

describe('Codegen', () => {
  it('should generate code for string', () => {
    const ast = baseParse('hello')
    transform(ast)
    const { code } = generate(ast)
    
    expect(code).toMatchSnapshot()
  })

  it('should generate code for interpolation', () => {
    const ast = baseParse('{{ message }}')
    transform(ast, {
      nodeTransforms: [transformExpression],
    })
    const { code } = generate(ast)
    
    expect(code).toMatch(`_toDisplayString`)
    expect(code).toMatch(`_ctx.message`)
    expect(code).toMatchSnapshot()
  })

  it('should generate code for element', () => {
    const ast = baseParse('<div></div>')
    transform(ast, {
      nodeTransforms: [transformElement],
    })
    const { code } = generate(ast)
    
    expect(code).toMatch(`_createElementVNode`)
    expect(code).toMatch(`"div"`)
    expect(code).toMatchSnapshot()
  })

  it('should generate code for element with text', () => {
    const ast = baseParse('<div>hello</div>')
    transform(ast, {
      nodeTransforms: [transformElement, transformText],
    })
    const { code } = generate(ast)
    
    expect(code).toMatch(`_createElementVNode`)
    expect(code).toMatch(`"div"`)
    expect(code).toMatch(`hello`)
    expect(code).toMatchSnapshot()
  })

  it('should generate code for element with interpolation', () => {
    const ast = baseParse('<div>hello, {{ message }}</div>')
    transform(ast, {
      nodeTransforms: [transformExpression, transformElement, transformText],
    })
    const { code } = generate(ast)
    
    expect(code).toMatch(`_createElementVNode`)
    expect(code).toMatch(`_toDisplayString`)
    expect(code).toMatch(`_ctx.message`)
    expect(code).toMatchSnapshot()
  })

  it('should generate code for nested elements', () => {
    const ast = baseParse('<div><p>hello</p></div>')
    transform(ast, {
      nodeTransforms: [transformElement, transformText],
    })
    const { code } = generate(ast)
    
    expect(code).toMatch(`_createElementVNode`)
    expect(code).toMatch(`"div"`)
    expect(code).toMatch(`"p"`)
    expect(code).toMatchSnapshot()
  })

  it('should generate render function', () => {
    const ast = baseParse('<div>hello</div>')
    transform(ast, {
      nodeTransforms: [transformElement, transformText],
    })
    const { code } = generate(ast)
    
    expect(code).toMatch(`function render`)
    expect(code).toMatch(`return`)
    expect(code).toMatchSnapshot()
  })
})
