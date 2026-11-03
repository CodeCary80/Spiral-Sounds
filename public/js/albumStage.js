// The "album open" stage on the record detail page: click the cover and the record
// and a tracklist insert slide out of the sleeve. Tracks play as Spotify previews,
// the insert switches to that song's lyrics, and the background turns to the
// blurred cover while one plays. Reference: design/mockups/album-open.html.

const $ = id => document.getElementById(id)
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

const E = { out: 'cubic-bezier(.2,.8,.2,1)', pull: 'cubic-bezier(.3,.7,.2,1)', fall: 'cubic-bezier(.55,0,.85,.35)', inOut: 'cubic-bezier(.65,0,.25,1)' }
const SKELETON = [86, 70, 92, 58, 80, 66].map(w => `<span class="ph" style="width:${w}%"></span>`).join('')

// Label colour: average the cover (a 24px copy — drawing straight to one pixel
// just samples the middle), turn the hue halfway round, and print in ink or
// cream depending on how light the result is.
function paintLabel(src) {
  const art = new Image()
  art.onload = () => {
    const N = 24, c = document.createElement('canvas'); c.width = c.height = N
    const g = c.getContext('2d'); g.drawImage(art, 0, 0, N, N)
    const px = g.getImageData(0, 0, N, N).data, sum = [0, 0, 0]
    for (let i = 0; i < px.length; i += 4) { sum[0] += px[i]; sum[1] += px[i + 1]; sum[2] += px[i + 2] }
    const [r, gr, b] = sum.map(v => v / (N * N) / 255)
    const max = Math.max(r, gr, b), min = Math.min(r, gr, b), d = max - min
    const h = d === 0 ? 40 : max === r ? 60 * (((gr - b) / d) % 6) : max === gr ? 60 * ((b - r) / d + 2) : 60 * ((r - gr) / d + 4)
    const light = (max + min) / 2 < .5 ? 62 : 34 // dark cover → light label, and the other way round
    const lbl = $('lbl')
    lbl.style.setProperty('--lbl', `hsl(${Math.round(h + 180)} ${d < .08 ? 18 : 42}% ${light}%)`)
    lbl.style.setProperty('--lbl-ink', light > 50 ? 'var(--ink)' : 'var(--cream)')
  }
  art.src = src
}

export function initAlbumStage(rec) {
  const tracks = (rec.tracklist || []).map((t, i) => ({ ...t, n: i + 1 }))
  if (!tracks.length) return

  const stage = $('stage'), deck = $('deck'), disc = $('disc'), insert = $('insert'), sleeve = $('sleeve'), base = $('stage-base')
  const cover = $('cover'), closeBtn = $('stage-close'), player = $('player')
  // everything behind the stage, so keyboard focus can't wander out of it
  const backdrop = [...document.body.children].filter(el => ['HEADER', 'MAIN', 'FOOTER'].includes(el.tagName) || el.id === 'buybar')

  stage.style.setProperty('--cover', `url("/images/${rec.image}")`)
  paintLabel(`/images/${rec.image}`)
  $('ins-meta').textContent = rec.year ? `${rec.artist} · ${rec.year}` : rec.artist
  $('ins-title').textContent = rec.title
  $('lbl-title').textContent = rec.title
  $('lbl-artist').textContent = rec.artist
  $('ins-tracks').innerHTML = tracks.map(t => `<li><button type="button" data-n="${t.n}" ${t.spotifyId ? '' : 'disabled title="No Spotify preview for this track"'}>
    <span class="n">${String(t.n).padStart(2, '0')}</span><span class="t">${esc(t.title)}</span><span class="d">${esc(t.duration || '')}</span></button></li>`).join('')

  // ---------- motion helpers ----------
  // Every moving piece remembers where it is ({x, y, s, r, o}); mv() sets the new
  // place as its resting style and animates from the old one, so a sequence can
  // be reversed from wherever it stands.
  const at = new Map()
  const css = p => `translate(${p.x}px, ${p.y}px) scale(${p.s ?? 1}) rotate(${p.r ?? 0}deg)`
  function place(el, p) { at.set(el, p); el.style.transform = css(p); el.style.opacity = p.o ?? 1 }
  function mv(el, p, duration, easing, delay = 0) {
    const from = at.get(el)
    place(el, p)
    return el.animate([{ transform: css(from), opacity: from.o ?? 1 }, { transform: css(p), opacity: p.o ?? 1 }],
      { duration, easing, delay, fill: 'backwards' }).finished
  }
  function fade(el, from, to, duration, delay = 0) {
    el.style.opacity = to
    return el.animate([{ opacity: from }, { opacity: to }], { duration, delay, fill: 'backwards', easing: 'ease' }).finished
  }

  // Offsets that put an in-flow piece (disc/insert) at a given viewport spot,
  // measured from its settled layout box.
  let home
  function measure() {
    disc.style.transform = insert.style.transform = ''
    const d = disc.getBoundingClientRect(), i = insert.getBoundingClientRect()
    const D = d.width
    const row = i.top < d.bottom - 1 // insert beside the record (desktop) or below it (phone)
    const C = { x: (innerWidth - D) / 2, y: (innerHeight - D) / 2 } // sleeve centred on the page
    const rel = (box, x, y) => ({ x: x - box.left, y: y - box.top })
    const insetX = (D - i.width) / 2, insetY = Math.max(0, (D - i.height) / 2)
    home = {
      D, row, C,
      disc: { centre: rel(d, C.x, C.y), out: rel(d, ...(row ? [C.x + .5 * D, C.y] : [C.x, C.y + .55 * D])) },
      insert: {
        centre: rel(i, C.x + insetX, C.y + insetY),
        out: rel(i, ...(row ? [C.x + 1.42 * D, C.y + insetY] : [C.x + insetX, C.y + .95 * D])),
      },
      sleeve: {
        centre: { x: C.x, y: C.y },
        out: row ? { x: C.x - .6 * D, y: C.y } : { x: C.x, y: C.y - .5 * D },
        gone: { x: (row ? C.x - .6 * D : C.x) - .35 * innerWidth, y: innerHeight + .2 * D, r: -34, o: 0 },
      },
    }
  }
  function coverBox() {
    const r = cover.getBoundingClientRect()
    return { x: r.left, y: r.top, s: r.width / home.D }
  }

  // ---------- open / close ----------
  let state = 'closed'

  async function openAlbum() {
    if (state !== 'closed') return
    state = 'busy'
    stage.hidden = false
    document.body.classList.add('locked')
    backdrop.forEach(el => { el.inert = true })
    measure()
    loadPlayer()

    if (reduced) {
      place(disc, { x: 0, y: 0 }); place(insert, { x: 0, y: 0 })
      await fade(base, 0, 1, 250)
      return opened()
    }

    // 1) the album lifts off the page into the centre; the page fades back
    sleeve.hidden = false
    place(sleeve, coverBox())
    cover.style.visibility = 'hidden'
    place(disc, { ...home.disc.centre, o: 0 }); place(insert, { ...home.insert.centre, o: 0 })
    await Promise.all([mv(sleeve, home.sleeve.centre, 750, E.out), fade(base, 0, 1, 600)])

    // 2) record and insert slide out to the right (down on phones)
    place(disc, home.disc.centre); place(insert, home.insert.centre)
    await Promise.all([
      mv(sleeve, home.sleeve.out, 950, E.pull),
      mv(disc, home.disc.out, 950, E.pull),
      mv(insert, home.insert.out, 1050, E.pull, 120),
    ])

    // 3) fully out: the sleeve drops away bottom-left, the pair settles in the middle
    stage.classList.add('open')
    await Promise.all([
      mv(sleeve, home.sleeve.gone, 700, E.fall),
      mv(disc, { x: 0, y: 0 }, 850, E.out, 140),
      mv(insert, { x: 0, y: 0 }, 850, E.out, 140),
    ])
    sleeve.hidden = true
    opened()
  }

  function opened() {
    state = 'open'
    stage.classList.add('open')
    closeBtn.focus({ preventScroll: true })
  }

  async function closeAlbum() {
    if (state !== 'open') return
    state = 'busy'
    pause()
    stage.classList.remove('open', 'playing')
    player.classList.remove('on')
    stage.querySelectorAll('.ins-tracks button.on').forEach(x => x.classList.remove('on'))

    if (!reduced) {
      measure()
      place(disc, { x: 0, y: 0 }); place(insert, { x: 0, y: 0 })
      sleeve.hidden = false
      place(sleeve, home.sleeve.gone)
      // the sleeve comes back up, the pair slides out to meet it, then back inside
      await Promise.all([mv(sleeve, home.sleeve.out, 650, E.out), mv(disc, home.disc.out, 650, E.out), mv(insert, home.insert.out, 650, E.out)])
      await Promise.all([mv(sleeve, home.sleeve.centre, 700, E.inOut), mv(disc, home.disc.centre, 700, E.inOut), mv(insert, home.insert.centre, 760, E.inOut)])
      place(disc, { ...home.disc.centre, o: 0 }); place(insert, { ...home.insert.centre, o: 0 })
      await Promise.all([mv(sleeve, coverBox(), 650, E.inOut), fade(base, 1, 0, 550, 100)])
    } else {
      await fade(base, 1, 0, 250)
    }

    sleeve.hidden = true
    stage.hidden = true
    cover.style.visibility = ''
    backdrop.forEach(el => { el.inert = false })
    document.body.classList.remove('locked')
    showTracks()
    state = 'closed'
    cover.focus({ preventScroll: true })
  }

  cover.disabled = false
  cover.setAttribute('aria-label', `Open ${rec.title}`)
  cover.addEventListener('click', openAlbum)
  $('open-record')?.addEventListener('click', openAlbum)
  closeBtn.addEventListener('click', closeAlbum)
  stage.addEventListener('click', e => { if (!deck.contains(e.target) && e.target !== closeBtn) closeAlbum() })
  addEventListener('keydown', e => { if (e.key === 'Escape') closeAlbum() })

  // ---------- insert: tracklist ⇄ lyrics ----------
  function showTracks() {
    lyricsTurn++
    $('view-tracks').classList.remove('off'); $('view-lyrics').classList.add('off')
  }

  let lyricsTurn = 0
  async function showLyrics(t) {
    const turn = ++lyricsTurn
    $('ly-n').textContent = `Track ${String(t.n).padStart(2, '0')}${t.duration ? ` · ${t.duration}` : ''}`
    $('ly-title').textContent = t.title
    $('lyrics').innerHTML = SKELETON
    $('lyrics-note').textContent = ''
    $('view-tracks').classList.add('off'); $('view-lyrics').classList.remove('off')
    $('lyrics').scrollTop = 0

    let text, note = ''
    try {
      const res = await fetch(`/api/lyrics?${new URLSearchParams({ track: t.title, artist: rec.artist })}`)
      if (!res.ok) throw new Error(`lyrics: ${res.status}`)
      const { lyrics, instrumental } = await res.json()
      text = lyrics || (instrumental ? 'Instrumental — no words to this one.' : 'No lyrics found for this track.')
      if (lyrics) note = 'Lyrics from LRCLIB'
    } catch {
      text = 'Couldn’t load the lyrics right now.'
    }
    if (turn !== lyricsTurn) return // moved on while this one loaded
    $('lyrics').textContent = text
    $('lyrics-note').textContent = note
  }

  $('to-tracks').addEventListener('click', showTracks)
  $('ins-tracks').addEventListener('click', e => {
    const b = e.target.closest('button[data-n]')
    if (!b || b.disabled) return
    const t = tracks[b.dataset.n - 1]
    stage.querySelectorAll('.ins-tracks button.on').forEach(x => x.classList.remove('on'))
    b.classList.add('on')
    play(t)
    showLyrics(t)
  })

  // ---------- Spotify (Embed iFrame API) ----------
  // Fetched on the first open, so a page view that never opens the record loads
  // nothing from Spotify. 30-second previews when not logged in.
  let api = null, ctrl = null, wanted = null, apiRequested = false
  window.onSpotifyIframeApiReady = IFrameAPI => { api = IFrameAPI; ensurePlayer() }
  function loadPlayer() {
    if (!apiRequested && tracks.some(t => t.spotifyId)) {
      apiRequested = true
      const script = document.createElement('script')
      script.src = 'https://open.spotify.com/embed/iframe-api/v1'
      script.async = true
      document.head.append(script)
    }
    ensurePlayer()
  }
  function ensurePlayer() {
    if (ctrl || !api) return
    const first = wanted || tracks.find(t => t.spotifyId)
    ctrl = 'pending'
    api.createController($('spotify'), { uri: `spotify:track:${first.spotifyId}`, width: '100%', height: 80 }, c => {
      ctrl = c
      c.addListener('playback_update', e => {
        const { isPaused, isBuffering, position, duration } = e.data
        stage.classList.toggle('playing', state !== 'busy' && !isPaused && !isBuffering && position < duration)
      })
      if (wanted) play(wanted)
    })
  }
  function play(t) {
    player.classList.add('on')
    if (!ctrl || ctrl === 'pending') { wanted = t; return }
    wanted = null
    ctrl.loadUri(`spotify:track:${t.spotifyId}`)
    ctrl.play()
  }
  function pause() {
    wanted = null
    if (ctrl && ctrl !== 'pending') ctrl.pause()
  }
}
