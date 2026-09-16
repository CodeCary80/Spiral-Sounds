// Hero turntable player. One `playing` flag drives everything: the audio
// element, the record rotation, the knob's pressed look, the indicator lamp
// and the button's accessible name — so the UI can't drift out of sync with
// what is actually audible.
//
// Rotation runs through the Web Animations API rather than a CSS animation
// because playbackRate can be eased frame by frame; a CSS animation can only
// be frozen outright, which reads as the platter hitting a wall.

const stage = document.getElementById('turntable-stage')
const powerBtn = document.getElementById('tt-power')
const audio = document.getElementById('tt-audio')
const rotor = stage?.querySelector('.record-rotor')

if (stage && powerBtn && audio && rotor) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const spin = rotor.animate(
    [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
    { duration: 5200, iterations: Infinity, easing: 'linear' }
  )
  spin.pause()
  spin.playbackRate = 0

  let rampId = null
  let playing = false

  function rampTo(target, ms) {
    if (rampId) cancelAnimationFrame(rampId)
    if (reducedMotion) {
      spin.pause()
      return
    }
    const from = spin.playbackRate
    const start = performance.now()
    if (spin.playState !== 'running') spin.play()

    function step(now) {
      const t = Math.min(1, (now - start) / ms)
      spin.playbackRate = from + (target - from) * t
      if (t < 1) {
        rampId = requestAnimationFrame(step)
      } else if (target === 0) {
        spin.pause()
        rampId = null
      }
    }
    rampId = requestAnimationFrame(step)
  }

  function render() {
    stage.classList.toggle('is-playing', playing)
    powerBtn.setAttribute('aria-label', playing ? 'Pause record' : 'Play record')
  }

  function stop() {
    playing = false
    audio.pause()
    rampTo(0, 600)
    render()
  }

  async function start() {
    playing = true
    stage.classList.add('has-played')
    render()
    rampTo(1, 900)
    try {
      await audio.play()
    } catch {
      stop()
    }
  }

  powerBtn.addEventListener('click', () => {
    if (playing) stop()
    else start()
  })

  audio.addEventListener('ended', stop)
  audio.addEventListener('error', stop)

  render()
}
