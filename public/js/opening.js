// Opening animation for the home page (see css/opening.css). Runs only when
// the <head> script in index.html has decided to play it (html.opening).
//
// timeline (ms)
// 0     SPIRAL drops in from the top, SOUNDS rises from the bottom
// 250   the record is held just above the paper, then lowered onto it
// 1250  it touches down softly; the grooves catch the light and it spins up
// 2350  the poster lifts away; the record glides down onto the hero's platter
const root = document.documentElement
const poster = document.getElementById('opening')

if (root.classList.contains('opening') && poster) run()

function run() {
  const $ = id => document.getElementById(id)
  const E = { drop: 'cubic-bezier(.22,1.12,.36,1)', out: 'cubic-bezier(.2,.8,.2,1)', inOut: 'cubic-bezier(.65,0,.25,1)', place: 'cubic-bezier(.25,.1,.2,1)' }
  const LAND = 1250, LIFT = 2350
  const anims = []
  const play = (el, frames, opts) => { const a = el.animate(frames, { fill: 'both', ...opts }); anims.push(a); return a }

  // a bigger record on phones held upright, where the width is the short side
  const D = Math.min(innerWidth * (innerWidth < innerHeight ? .72 : .48), innerHeight * .66)
  poster.style.setProperty('--D', D + 'px')

  play($('op-one'), [{ transform: 'translateY(-170%)' }, { transform: 'translateY(0)' }], { duration: 750, easing: E.drop })
  play($('op-two'), [{ transform: 'translateY(170%)' }, { transform: 'translateY(0)' }], { duration: 750, delay: 80, easing: E.drop })

  // lowered by hand: comes in slightly above and larger (closer to us), slows right down before it touches
  play($('op-record'), [
    { opacity: 0, transform: 'translateY(-4vh) scale(1.12)' },
    { opacity: 1, transform: 'translateY(-3vh) scale(1.1)', offset: .2 },
    { opacity: 1, transform: 'translateY(0) scale(1)' },
  ], { duration: LAND - 250, delay: 250, easing: E.place })
  // its shadow: wide and faint while it's held up, closing in and firming as it comes down
  play($('op-shadow'), [
    { opacity: 0, transform: 'translate(2.5vmin, 5vmin) scale(1.12)', filter: 'blur(5vmin)' },
    { opacity: .45, transform: 'translate(2vmin, 4vmin) scale(1.1)', filter: 'blur(4vmin)', offset: .2 },
    { opacity: .7, transform: 'translate(.6vmin, 1.2vmin) scale(1)', filter: 'blur(1.4vmin)' },
  ], { duration: LAND - 250, delay: 250, easing: E.place })
  play($('op-grooves'), [{ clipPath: 'circle(18.7% at 50% 50%)' }, { clipPath: 'circle(50% at 50% 50%)' }], { duration: 700, delay: LAND - 120, easing: E.out })
  play($('op-skip'), [{ opacity: 0 }, { opacity: .7, offset: .15 }, { opacity: .7 }], { duration: LIFT })

  // the record spins up like a motor catching up (smoothstep on the playback rate)
  const spin = $('op-spin').animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 2400, iterations: Infinity })
  spin.playbackRate = 0
  let done = false
  setTimeout(() => {
    const t0 = performance.now()
    const step = now => {
      const k = Math.min(1, (now - t0) / 700)
      spin.playbackRate = k * k * (3 - 2 * k)
      if (k < 1 && !done) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, LAND - 50)

  // The hero deck starts its own entrance once fonts and art are ready (home.js),
  // which can be late on a cold server. Only land on the platter once it has settled.
  const deck = document.getElementById('deck')
  const settled = () => document.getElementById('hero')?.classList.contains('play') &&
    deck.getAnimations().every(a => a.playState === 'finished')
  function platterRect() {
    const r = settled() && deck.querySelector('.record-plane')?.getBoundingClientRect()
    return r && r.width && r.bottom > 0 && r.top < innerHeight ? r : null
  }

  function reveal(fast) {
    if (done) return
    done = true
    anims.forEach(a => a.finish())
    $('op-skip').style.display = 'none'
    root.classList.remove('opening-lock')
    const T = fast ? .45 : 1

    // lift the record out of the poster so it stays put while the poster goes up
    const rec = $('op-record')
    poster.appendChild(rec)
    rec.style.zIndex = 210

    $('op-one').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-8vh)' }], { duration: 700 * T, easing: E.inOut, fill: 'forwards' })
    $('op-two').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(6vh)' }], { duration: 700 * T, easing: E.inOut, fill: 'forwards' })
    $('op-poster').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-105%)' }],
      { duration: 750 * T, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' })
      .finished.then(() => $('op-poster').remove())

    // wind the spin down so the label comes to rest upright, matching the deck's
    const angle = (spin.currentTime % 2400) / 2400 * 360
    spin.cancel()
    const stopAt = Math.ceil((angle + 120) / 360) * 360
    $('op-spin').animate([{ transform: `rotate(${angle}deg)` }, { transform: `rotate(${stopAt}deg)` }], { duration: 900 * T, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' })

    // glide down onto the platter: centre on it, match its width, squash to the deck's perspective
    const p = platterRect()
    const land = p
      ? rec.animate([{ transform: 'translate(0,0) scale(1, 1)' },
          { transform: `translate(${p.left + p.width / 2 - innerWidth / 2}px, ${p.top + p.height / 2 - innerHeight / 2}px) scale(${p.width / D}, ${p.height / D})` }],
          { duration: 900 * T, delay: 150 * T, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' })
      : rec.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' })
    $('op-sheen').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600 * T, delay: 300 * T, fill: 'forwards' })
    // cross-fade into the deck's own record near the end, so the tonearm is never covered
    if (p) rec.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320 * T, delay: (150 + 900 * .68) * T, fill: 'forwards' })
    land.finished.then(() => { poster.remove(); root.classList.remove('opening') })
  }

  // lift at LIFT, or as soon after as the deck has settled (giving up after a few seconds)
  const start = performance.now()
  setTimeout(function wait() {
    if (settled() || performance.now() - start > 5500) reveal(false)
    else setTimeout(wait, 100)
  }, LIFT)
  $('op-poster').addEventListener('click', () => reveal(true))
  addEventListener('keydown', () => reveal(true), { once: true })
}
