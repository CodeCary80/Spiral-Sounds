// Home page hero: a sleeve with the record peeking out. Preview slides the record
// further out and asks Spotify to play; the record only spins, and the player only
// appears, once Spotify reports that playback has actually begun.
// The player is created before the first tap, because browsers can refuse to start
// audio that begins long after the click that asked for it.

import { handOffCover } from './handoff.js'

const SPOTIFY_API = 'https://open.spotify.com/embed/iframe-api/v1'
const START_LIMIT = 8000 // how long to wait for Spotify before giving up on a tap

const LABELS = {
  idle: ['&#9654;', 'Preview'],
  starting: ['', 'Starting…'],
  playing: ['&#10074;&#10074;', 'Pause'],
  paused: ['&#9654;', 'Resume'],
}

export function initHeroRecord({ record, reduced }) {
  const $ = id => document.getElementById(id)
  const deck = $('deck'), sleeve = $('hero-sleeve'), button = $('hero-preview'), endButton = $('hero-end'), player = $('hero-player'), note = $('hero-note')

  sleeve.src = `/images/${record.image}`
  sleeve.alt = `${record.title} by ${record.artist}, with the record peeking out of its sleeve`
  $('featured-name').textContent = record.title
  $('featured-about').textContent = [record.artist, record.genre.replace(/^./, c => c.toUpperCase()), record.year].filter(Boolean).join(' · ')
  document.querySelectorAll('[data-view-album]').forEach(link => { link.href = `/detail.html?id=${record.id}` })

  // The spin runs through the Web Animations API so its playbackRate can ramp up
  // and down instead of stopping dead.
  const spin = deck.querySelector('.record-rotor').animate(
    [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
    { duration: 8000, iterations: Infinity, easing: 'linear' })
  spin.pause()
  spin.playbackRate = 0
  let rampId = null

  function rampTo(target, ms) {
    if (rampId) cancelAnimationFrame(rampId)
    if (reduced) { spin.pause(); return }
    const from = spin.playbackRate, t0 = performance.now()
    if (spin.playState !== 'running') spin.play()
    const step = now => {
      const t = Math.min(1, (now - t0) / ms)
      spin.playbackRate = from + (target - from) * t
      if (t < 1) rampId = requestAnimationFrame(step)
      else if (target === 0) { spin.pause(); rampId = null }
    }
    rampId = requestAnimationFrame(step)
  }

  // ---------- state ----------
  const track = record.previewTrack
  let state = 'idle', limit = null, api = null, ctrl = null, wanted = false, ended = false

  function setState(next) {
    state = next
    deck.classList.toggle('is-playing', next === 'playing')
    const [icon, text] = LABELS[next]
    button.innerHTML = `${icon ? `<span aria-hidden="true">${icon}</span> ` : ''}${text}`
    button.setAttribute('aria-busy', next === 'starting')
  }
  // End is there whenever the record is out, however it got there.
  function slide(out) {
    deck.classList.toggle('is-out', out)
    endButton.hidden = !out
  }
  function showPlayer(on) {
    player.classList.toggle('on', on)
    player.inert = !on
  }

  function start() {
    ended = false
    note.textContent = ''
    slide(true)
    setState('starting')
    clearTimeout(limit)
    limit = setTimeout(gaveUp, START_LIMIT)
    if (ctrl) ctrl.play()
    else { wanted = true; loadSpotify() }
  }

  // No word from Spotify. With a player on the page the browser probably blocked
  // the start (phones can), so show it for its own play button; without one,
  // Spotify didn't load at all.
  function gaveUp() {
    wanted = false
    setState('idle')
    if (ctrl) { showPlayer(true); return }
    slide(false)
    note.textContent = 'Couldn’t reach Spotify. Try again in a moment.'
  }

  function finished() {
    setState('idle')
    slide(false)
    showPlayer(false)
    rampTo(0, 600)
  }

  // The End button: stop, and put everything back as it was before Preview. Focus
  // moves to Preview, since the button that had it is about to disappear.
  function end() {
    ended = true
    clearTimeout(limit)
    wanted = false
    ctrl?.pause()
    finished()
    button.focus({ preventScroll: true })
  }

  // Also runs when someone uses the buttons inside Spotify's own player. Spotify's
  // first report comes at position 0, just before the audio does, so playback only
  // counts once the position has moved. A track ending isn't reported as a pause:
  // the position simply reaches the duration.
  function onPlayback({ isPaused, isBuffering, position, duration }) {
    if (ended) return // reports still on their way from before End was pressed
    const atEnd = duration > 0 && position >= duration
    if (atEnd) {
      if (state === 'playing' || state === 'paused') finished()
    } else if (!isPaused && !isBuffering && position > 0) {
      clearTimeout(limit)
      note.textContent = ''
      slide(true)
      showPlayer(true)
      if (state !== 'playing') { setState('playing'); rampTo(1, 900) }
    } else if (isPaused && state === 'playing') {
      if (position === 0) finished()
      else { setState('paused'); rampTo(0, 600) }
    }
  }

  button.addEventListener('click', () => {
    if (state === 'idle') start()
    else if (state === 'playing') ctrl.pause()
    else if (state === 'paused') ctrl.resume()
  })
  endButton.addEventListener('click', end)

  // ---------- Spotify (Embed iFrame API) ----------
  let apiRequested = false
  window.onSpotifyIframeApiReady = IFrameAPI => { api = IFrameAPI; ensurePlayer() }
  function loadSpotify() {
    if (apiRequested) return
    apiRequested = true
    const script = document.createElement('script')
    script.src = SPOTIFY_API
    script.async = true
    document.head.append(script)
  }
  function ensurePlayer() {
    if (ctrl || !api || !track) return
    api.createController($('hero-spotify'), { uri: `spotify:track:${track.spotifyId}`, width: '100%', height: 80, theme: 'dark' }, c => {
      ctrl = c
      c.addListener('playback_update', e => onPlayback(e.data))
      if (wanted) { wanted = false; c.play() }
    })
  }

  // A record with no Spotify id has nothing to preview, so only its album link remains.
  button.hidden = !track
  if (track) {
    const whenIdle = window.requestIdleCallback || (fn => setTimeout(fn, 1200))
    const preload = () => whenIdle(loadSpotify, { timeout: 2500 })
    if (document.readyState === 'complete') preload()
    else addEventListener('load', preload, { once: true })
  }

  // ---------- on to the detail page: the sleeve carries over as the cover ----------
  document.querySelectorAll('[data-view-album]').forEach(link => link.addEventListener('click', () => {
    sleeve.style.viewTransitionName = 'record-cover'
    handOffCover({ id: record.id, image: record.image })
  }))

  showPlayer(false)
  setState('idle')
}
