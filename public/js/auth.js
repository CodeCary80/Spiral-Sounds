// Log in / sign up (redesign) — one script for both pages; <body data-mode>
// says which. Reference: design/mockups/auth.html.

const mode = document.body.dataset.mode            // 'login' | 'signup'
const $ = id => document.getElementById(id)
const form = document.querySelector('form')
const error = $('error-message')
const submit = $('submit')

// Only known destinations — never redirect to an arbitrary URL from the query string.
const next = new URLSearchParams(location.search).get('next') === 'cart' ? 'cart' : null
const destination = next === 'cart' ? '/cart.html' : '/'

// Same rule the server enforces (authController): 1–20 of letters, numbers, _ or -.
const USERNAME = /^[a-zA-Z0-9_-]{1,20}$/

// giant SPIRAL / SOUNDS, letter by letter
document.querySelectorAll('.word').forEach(w => {
  w.innerHTML = [...w.dataset.text].map((c, i) => `<span class="ch"><span style="--i:${i}">${c}</span></span>`).join('')
})

// arriving from the cart: say why, and carry the destination across the log in <-> sign up switch
if (next) {
  $('notice').hidden = false
  const swap = $('swap')
  swap.href += '?next=cart'
}

// show / hide password
form.addEventListener('click', e => {
  const btn = e.target.closest('.show')
  if (!btn) return
  const pw = $('password')
  const reveal = pw.type === 'password'
  pw.type = reveal ? 'text' : 'password'
  btn.textContent = reveal ? 'Hide' : 'Show'
  btn.setAttribute('aria-pressed', reveal)
})

function markBad(id, bad, message) {
  $(id).classList.toggle('bad', bad)
  $(id).setAttribute('aria-invalid', bad)
  const hint = $(`${id}-hint`)
  if (hint) {
    hint.classList.toggle('bad', bad)
    if (message) hint.textContent = message
  }
}

// live checks (sign-up only — logging in just needs both fields)
form.addEventListener('input', e => {
  error.textContent = ''
  e.target.classList.remove('bad')
  e.target.removeAttribute('aria-invalid')
  if (mode === 'signup' && e.target.id === 'username') {
    const v = e.target.value
    $('username-count').textContent = `${v.length} / 20`
    const bad = v !== '' && !USERNAME.test(v)
    markBad('username', bad, bad ? 'Only letters, numbers, _ or - (no spaces)' : 'Letters, numbers, _ or -')
  }
})
form.addEventListener('focusout', e => {
  if (mode === 'signup' && e.target.id === 'email' && e.target.value) markBad('email', !e.target.checkValidity())
})

form.addEventListener('submit', async e => {
  e.preventDefault()
  const fields = [...form.querySelectorAll('input')]
  const values = Object.fromEntries(fields.map(f => [f.name, f.name === 'password' ? f.value : f.value.trim()]))

  const empty = fields.filter(f => !values[f.name])
  empty.forEach(f => markBad(f.id, true))
  if (empty.length) { error.textContent = 'All fields are required.'; empty[0].focus(); return }
  if (mode === 'signup') {
    if (!$('email').checkValidity()) { markBad('email', true); error.textContent = 'Invalid email format.'; $('email').focus(); return }
    if (!USERNAME.test(values.username)) { error.textContent = 'Username must be 1–20 characters, using letters, numbers, _ or -.'; $('username').focus(); return }
  }

  const label = submit.firstChild
  const idle = label.textContent
  submit.disabled = true
  label.textContent = mode === 'signup' ? 'Creating account… ' : 'Logging in… '
  try {
    const res = await fetch(mode === 'signup' ? '/api/auth/register' : '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(values),
    })
    if (res.ok) { location.href = destination; return }
    const data = await res.json().catch(() => ({}))
    error.textContent = data.error || (mode === 'signup' ? 'Registration failed. Please try again.' : 'Login failed. Please try again.')
    if (mode === 'login' && res.status === 401) markBad('password', true)
  } catch {
    error.textContent = 'Unable to connect. Please try again.'
  }
  submit.disabled = false
  label.textContent = idle
})
