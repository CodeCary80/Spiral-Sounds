import 'dotenv/config'
import { describe, it, expect } from 'vitest'
import { isValidAmount, amountMatchesCart } from './paymentsController.js'

describe('isValidAmount', () => {

  it('accepts a normal amount', () => {
    expect(isValidAmount(1000)).toBe(true)
  })

  it('accepts the boundary value of exactly 50', () => {
    expect(isValidAmount(50)).toBe(true)
  })

  it('rejects an amount just under the boundary', () => {
    expect(isValidAmount(49)).toBe(false)
  })

  it('rejects 0', () => {
    expect(isValidAmount(0)).toBe(false)
  })

  it('rejects a negative amount', () => {
    expect(isValidAmount(-100)).toBe(false)
  })

  it('rejects undefined', () => {
    expect(isValidAmount(undefined)).toBe(false)
  })

  it('rejects NaN', () => {
    expect(isValidAmount(NaN)).toBe(false)
  })

  it('rejects Infinity', () => {
    expect(isValidAmount(Infinity)).toBe(false)
  })

  it('rejects a numeric string, since Number.isFinite does not coerce', () => {
    expect(isValidAmount('1000')).toBe(false)
  })

})

describe('amountMatchesCart', () => {

  it('accepts an amount that matches the real cart total', () => {
    const cartItems = [{ price: 10, quantity: 2 }, { price: 5, quantity: 3 }] // $35.00
    expect(amountMatchesCart(3500, cartItems)).toBe(true)
  })

  it('rejects a tampered amount that is lower than the real cart total', () => {
    // the exact scenario the original validation missed: a small, plausible-looking
    // tamper still passes isValidAmount's format check, but not this one
    const cartItems = [{ price: 50, quantity: 1 }] // $50.00 = 5000 cents
    expect(amountMatchesCart(50, cartItems)).toBe(false)
  })

  it('rejects an amount that is higher than the real cart total', () => {
    const cartItems = [{ price: 10, quantity: 1 }] // $10.00 = 1000 cents
    expect(amountMatchesCart(2000, cartItems)).toBe(false)
  })

  it('matches an empty cart against an amount of 0', () => {
    expect(amountMatchesCart(0, [])).toBe(true)
  })

  it('handles price as a string, like the database actually returns it', () => {
    const cartItems = [{ price: '44.99', quantity: 1 }]
    expect(amountMatchesCart(4499, cartItems)).toBe(true)
  })

  it('rounds correctly for a total with more than 2 decimal places of floating-point error', () => {
    const cartItems = [{ price: 19.99, quantity: 1 }, { price: 24.99, quantity: 1 }] // $44.98
    expect(amountMatchesCart(4498, cartItems)).toBe(true)
  })

})
