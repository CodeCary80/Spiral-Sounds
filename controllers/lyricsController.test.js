import { describe, it, expect, vi, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { cleanTitle, mainArtist, pickLyrics } from './lyricsController.js'
import { lyricsRouter } from '../routes/lyrics.js'

const app = express().use('/api/lyrics', lyricsRouter)

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers })
const busy = () => json({ name: 'ServerOverloaded' }, 503, { 'retry-after': '0' })

function stubLrclib(...responses) {
  const mock = vi.fn()
  for (const response of responses) mock.mockResolvedValueOnce(response)
  vi.stubGlobal('fetch', mock)
  return mock
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('cleanTitle', () => {

  it('drops a remaster suffix', () => {
    expect(cleanTitle('Dreams - 2004 Remaster')).toBe('Dreams')
  })

  it('drops bracketed notes', () => {
    expect(cleanTitle('Pannonica (feat. Sonny Rollins) [Incomplete]')).toBe('Pannonica')
  })

  it('keeps a title that is only brackets', () => {
    expect(cleanTitle('(Untitled)')).toBe('(Untitled)')
  })

})

describe('mainArtist', () => {

  it('keeps the first name of a credit', () => {
    expect(mainArtist('Prince & The Revolution')).toBe('Prince')
    expect(mainArtist('Brian Eno, Daniel Lanois & Roger Eno')).toBe('Brian Eno')
  })

  it('leaves a single artist alone', () => {
    expect(mainArtist('Fleetwood Mac')).toBe('Fleetwood Mac')
  })

})

describe('pickLyrics', () => {

  it('prefers a result with lyrics over an instrumental one', () => {
    const results = [{ instrumental: true, plainLyrics: null }, { instrumental: false, plainLyrics: ' Words\n' }]
    expect(pickLyrics(results)).toEqual({ lyrics: 'Words', instrumental: false })
  })

  it('reports an instrumental when nothing has lyrics', () => {
    expect(pickLyrics([{ instrumental: true, plainLyrics: null }])).toEqual({ lyrics: null, instrumental: true })
  })

  it('reports nothing found for no results', () => {
    expect(pickLyrics([])).toEqual({ lyrics: null, instrumental: false })
  })

})

describe('GET /api/lyrics', () => {

  it('returns 400 without a track or an artist', async () => {
    const fetchMock = stubLrclib()

    expect((await request(app).get('/api/lyrics?track=Dreams')).status).toBe(400)
    expect((await request(app).get('/api/lyrics?artist=Prince')).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 400 for a repeated query parameter', async () => {
    const res = await request(app).get('/api/lyrics?track=a&track=b&artist=Prince')

    expect(res.status).toBe(400)
  })

  it('returns lyrics from the exact lookup without searching', async () => {
    const fetchMock = stubLrclib(json({ plainLyrics: 'Thunder only happens', instrumental: false }))

    const res = await request(app).get('/api/lyrics').query({ track: 'Dreams - 2004 Remaster', artist: 'Fleetwood Mac' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ lyrics: 'Thunder only happens', instrumental: false })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.pathname).toBe('/api/get')
    expect(url.searchParams.get('track_name')).toBe('Dreams')
  })

  it('falls back to search when the exact lookup has no match', async () => {
    const fetchMock = stubLrclib(json({}, 404), json([{ plainLyrics: 'Found by search', instrumental: false }]))

    const res = await request(app).get('/api/lyrics').query({ track: 'Search Song', artist: 'Someone' })

    expect(res.body.lyrics).toBe('Found by search')
    expect(new URL(fetchMock.mock.calls[1][0]).pathname).toBe('/api/search')
  })

  it('retries while LRCLIB is busy', async () => {
    const fetchMock = stubLrclib(busy(), busy(), json({ plainLyrics: 'Third time lucky', instrumental: false }))

    const res = await request(app).get('/api/lyrics').query({ track: 'Busy Song', artist: 'Someone' })

    expect(res.status).toBe(200)
    expect(res.body.lyrics).toBe('Third time lucky')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('returns 502 and caches nothing when LRCLIB stays busy', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    stubLrclib(busy(), busy(), busy(), busy())
    const query = { track: 'Down Song', artist: 'Someone' }

    expect((await request(app).get('/api/lyrics').query(query)).status).toBe(502)

    stubLrclib(json({ plainLyrics: 'Back up', instrumental: false }))
    expect((await request(app).get('/api/lyrics').query(query)).body.lyrics).toBe('Back up')
  })

  it('serves a repeat request from the cache', async () => {
    const fetchMock = stubLrclib(json({ plainLyrics: 'Once only', instrumental: false }))
    const query = { track: 'Cached Song', artist: 'Someone' }

    await request(app).get('/api/lyrics').query(query)
    const res = await request(app).get('/api/lyrics').query(query)

    expect(res.body.lyrics).toBe('Once only')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

})
