import { describe, expect, it } from 'vitest'
import {
  clamp,
  cn,
  formatBytes,
  formatDuration,
  generateCode,
  shuffle,
  slugify,
  truncate,
} from '@/lib/utils'

describe('lib/utils — cn', () => {
  it('merges tailwind classes, last wins', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
  it('filters falsy values', () => {
    expect(cn('text-sm', false, null, undefined, 'font-bold')).toBe('text-sm font-bold')
  })
})

describe('lib/utils — slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })
  it('strips accents (NFD)', () => {
    expect(slugify('Canción de José')).toBe('cancion-de-jose')
  })
  it('collapses multiple dashes and strips punctuation', () => {
    expect(slugify('Foo -- Bar!! Baz??')).toBe('foo-bar-baz')
  })
})

describe('lib/utils — shuffle', () => {
  it('preserves length and elements', () => {
    const input = [1, 2, 3, 4, 5]
    const out = shuffle(input)
    expect(out.length).toBe(input.length)
    expect([...out].sort()).toEqual([...input].sort())
  })
  it('does not mutate input', () => {
    const input = [1, 2, 3]
    const snapshot = [...input]
    shuffle(input)
    expect(input).toEqual(snapshot)
  })
})

describe('lib/utils — clamp', () => {
  it('clamps above max', () => expect(clamp(15, 0, 10)).toBe(10))
  it('clamps below min', () => expect(clamp(-3, 0, 10)).toBe(0))
  it('passes through in-range', () => expect(clamp(5, 0, 10)).toBe(5))
})

describe('lib/utils — formatBytes', () => {
  it('handles zero', () => expect(formatBytes(0)).toBe('0 Bytes'))
  it('formats KB', () => expect(formatBytes(1536, 1)).toBe('1.5 KB'))
  it('formats MB', () => expect(formatBytes(1024 * 1024 * 3, 0)).toBe('3 MB'))
})

describe('lib/utils — formatDuration', () => {
  it('seconds only', () => expect(formatDuration(45)).toBe('45s'))
  it('minutes + seconds', () => expect(formatDuration(125)).toBe('2m 5s'))
  it('hours + minutes (drops seconds)', () => expect(formatDuration(3_660)).toBe('1h 1m'))
})

describe('lib/utils — truncate', () => {
  it('passes through short strings', () => expect(truncate('hello', 10)).toBe('hello'))
  it('truncates with ellipsis', () => expect(truncate('abcdefghij', 8)).toBe('abcde...'))
})

describe('lib/utils — generateCode', () => {
  it('generates requested length', () => {
    expect(generateCode(12)).toHaveLength(12)
  })
  it('uses only allowed characters', () => {
    expect(generateCode(50)).toMatch(/^[A-Z0-9]+$/)
  })
})
