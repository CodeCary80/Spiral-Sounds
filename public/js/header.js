// Header controls shared by every redesigned page:
//   [data-account]  "Log in" when logged out; an initials avatar with a small
//                   menu (your bag, log out) when logged in.
//   [data-bag]      tote-bag icon with a count badge, linking to the cart.

import { checkAuth } from './authUI.js'
import { getCartCount } from './cartApi.js'
import { logout } from './logout.js'

const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const initials = name => name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

let lastCount = null

export function setBagCount(n) {
  const bumped = lastCount !== null && n > lastCount
  lastCount = n
  document.querySelectorAll('[data-bag]').forEach(link => {
    link.setAttribute('aria-label', `Bag, ${n} item${n === 1 ? '' : 's'}`)
    link.innerHTML = `<span class="bag-ic"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
        <path d="M4.5 8h15l-1.2 12.5H5.7z"/><path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10" stroke-linecap="round"/></svg>
        <span class="bag-n${n ? '' : ' zero'}" aria-hidden="true">${n}</span></span>`
  })
  if (bumped) {
    requestAnimationFrame(() => document.querySelectorAll('.bag-n').forEach(b => {
      b.classList.add('pop')
      setTimeout(() => b.classList.remove('pop'), 220)
    }))
  }
}

function renderAccount(name) {
  document.querySelectorAll('[data-account]').forEach(slot => {
    slot.classList.add('acct')
    slot.classList.remove('open')
    if (!name) {
      slot.innerHTML = `<a class="acct-link" href="/login.html">Log in</a>`
      return
    }
    slot.innerHTML = `
      <button class="acct-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Account menu for ${esc(name)}" title="${esc(name)}">
        <span class="acct-av" aria-hidden="true">${esc(initials(name))}</span>
      </button>
      <div class="acct-menu" role="menu">
        <p>Signed in as<b>${esc(name)}</b></p>
        <a href="/cart.html" role="menuitem">Your bag</a>
        <button type="button" role="menuitem" data-logout>Log out</button>
      </div>`
  })
}

document.addEventListener('click', e => {
  const btn = e.target.closest('.acct-btn')
  document.querySelectorAll('.acct.open').forEach(a => {
    if (!btn || !a.contains(btn)) {
      a.classList.remove('open')
      a.querySelector('.acct-btn')?.setAttribute('aria-expanded', 'false')
    }
  })
  if (btn) {
    const acct = btn.closest('.acct')
    acct.classList.toggle('open')
    btn.setAttribute('aria-expanded', acct.classList.contains('open'))
  }
  if (e.target.closest('[data-logout]')) logout()
})
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.acct.open').forEach(a => a.classList.remove('open'))
})

// Returns the signed-in user's name, or false.
export async function initHeader() {
  const name = await checkAuth()
  renderAccount(name)
  setBagCount(name ? await getCartCount() : 0)
  return name
}
