import { describe, expect, it } from 'vitest'
import { baseParse } from '../src/parse'
import { NodeTypes } from '../src/ast'

describe('Parse', () => {
  describe('interpolation', () => {
    it('should parse simple interpolation', () => {
      const ast = baseParse('{{ message }}')
      
      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.INTERPOLATION,
        content: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: 'message',
        },
      })
    })
  })

  describe('element', () => {
    it('should parse simple element', () => {
      const ast = baseParse('<div></div>')
      
      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.ELEMENT,
        tag: 'div',
        children: [],
      })
    })

    it('should parse element with text content', () => {
      const ast = baseParse('<div>hello</div>')
      
      const element = ast.children[0]
      expect(element.type).toBe(NodeTypes.ELEMENT)
      expect(element.tag).toBe('div')
      expect(element.children.length).toBe(1)
      expect(element.children[0]).toStrictEqual({
        type: NodeTypes.TEXT,
        content: 'hello',
      })
    })

    it('should parse nested elements', () => {
      const ast = baseParse('<div><p>hello</p></div>')
      
      const div = ast.children[0]
      expect(div.type).toBe(NodeTypes.ELEMENT)
      expect(div.tag).toBe('div')
      
      const p = div.children[0]
      expect(p.type).toBe(NodeTypes.ELEMENT)
      expect(p.tag).toBe('p')
      expect(p.children[0].content).toBe('hello')
    })
  })

  describe('text', () => {
    it('should parse simple text', () => {
      const ast = baseParse('hello world')
      
      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.TEXT,
        content: 'hello world',
      })
    })

    it('should parse text with interpolation', () => {
      const ast = baseParse('hello {{ name }}')
      
      expect(ast.children.length).toBe(2)
      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.TEXT,
        content: 'hello ',
      })
      expect(ast.children[1].type).toBe(NodeTypes.INTERPOLATION)
    })
  })

  describe('complex template', () => {
    it('should parse complex template', () => {
      const ast = baseParse('<div>hi,{{ message }}</div>')
      
      const element = ast.children[0]
      expect(element.type).toBe(NodeTypes.ELEMENT)
      expect(element.children.length).toBe(2)
      
      const text = element.children[0]
      expect(text.type).toBe(NodeTypes.TEXT)
      expect(text.content).toBe('hi,')
      
      const interpolation = element.children[1]
      expect(interpolation.type).toBe(NodeTypes.INTERPOLATION)
      expect(interpolation.content.content).toBe('message')
    })
  })

  describe('error handling', () => {
    it('should throw error for missing end tag', () => {
      expect(() => baseParse('<div><span></div>')).toThrow('缺少结束标签: span')
    })
  })
})
