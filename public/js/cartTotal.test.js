import { describe, it, expect } from 'vitest'
import { calculateCartTotal } from './cartTotal.js'

describe('calculateCartTotal', () => {

  it('sums price × quantity across multiple items', () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 3 },
    ]
    expect(calculateCartTotal(items)).toBe(35)
  })

  it('returns 0 for an empty cart', () => {
    expect(calculateCartTotal([])).toBe(0)
  })

  it('defaults quantity to 1 when missing or 0', () => {
    const items = [
      { price: 10, quantity: undefined },
      { price: 5, quantity: 0 },
    ]
    expect(calculateCartTotal(items)).toBe(15)
  })

  it('handles price as a string, like the API returns it', () => {
    const items = [
      { price: '44.99', quantity: 1 },
    ]
    expect(calculateCartTotal(items)).toBeCloseTo(44.99)
  })

})
