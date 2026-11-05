import 'dotenv/config'
import { describe, it, expect } from 'vitest'
import { pickFeatured } from './productsController.js'

const WEEK = 7 * 24 * 60 * 60 * 1000
const MONDAY = Date.UTC(2026, 10, 2) // Monday 2 Nov 2026, 00:00 UTC

const record = (id, extra = {}) => ({
  id, stock: 5, tracklist: [{ title: `Song ${id}`, spotifyId: `spotify${id}` }], ...extra
})
const catalogue = n => Array.from({ length: n }, (_, i) => record(i + 1))
const idAt = (products, time) => pickFeatured(products, time).id

describe('pickFeatured', () => {

  it('keeps the same record from Monday morning to Sunday night', () => {
    const products = catalogue(60)
    expect(idAt(products, MONDAY + WEEK - 1)).toBe(idAt(products, MONDAY))
  })

  it('changes the record when the next week starts', () => {
    const products = catalogue(60)
    expect(idAt(products, MONDAY + WEEK)).not.toBe(idAt(products, MONDAY))
  })

  it('gives every visitor the same pick, whatever order the rows arrive in', () => {
    const products = catalogue(60)
    expect(idAt([...products].reverse(), MONDAY)).toBe(idAt(products, MONDAY))
  })

  it('shows every record once before any comes round again', () => {
    const products = catalogue(60)
    const firstOfPass = Math.ceil((MONDAY - 4 * 24 * 60 * 60 * 1000) / WEEK / 60) * 60
    const start = 4 * 24 * 60 * 60 * 1000 + firstOfPass * WEEK
    const seen = products.map((_, i) => idAt(products, start + i * WEEK))
    expect(new Set(seen).size).toBe(60)
  })

  it('is not simply in catalogue order', () => {
    const products = catalogue(60)
    const run = [0, 1, 2, 3, 4].map(i => idAt(products, MONDAY + i * WEEK))
    expect(run.some((id, i) => i > 0 && id !== run[i - 1] + 1)).toBe(true)
  })

  it('passes over a sold-out record', () => {
    const products = catalogue(3)
    const usual = idAt(products, MONDAY)
    const soldOut = products.map(p => (p.id === usual ? { ...p, stock: 0 } : p))
    expect(idAt(soldOut, MONDAY)).not.toBe(usual)
  })

  it('still picks something when everything is sold out', () => {
    const products = catalogue(3).map(p => ({ ...p, stock: 0 }))
    expect(pickFeatured(products, MONDAY)).not.toBeNull()
  })

  it('never picks a record with no Spotify ids', () => {
    const products = [record(1, { tracklist: [{ title: 'No id' }] }), record(2, { tracklist: null }), record(3)]
    expect(idAt(products, MONDAY)).toBe(3)
  })

  it('returns null when no record can be previewed', () => {
    expect(pickFeatured([record(1, { tracklist: [] })], MONDAY)).toBeNull()
  })

  it('previews the first song with a Spotify id', () => {
    const product = record(5, { tracklist: [{ title: 'No id' }, { title: 'Second', spotifyId: 'b' }, { title: 'Third', spotifyId: 'c' }] })
    expect(pickFeatured([product], MONDAY).previewTrack.title).toBe('Second')
  })

  it('previews Sir Duke on Songs in the Key of Life', () => {
    const product = record(36, { tracklist: [{ title: 'Opener', spotifyId: 'a' }, { title: 'Sir Duke', spotifyId: 'b' }] })
    expect(pickFeatured([product], MONDAY).previewTrack.spotifyId).toBe('b')
  })

})
