// Mockup-only session, standing in for /api/me ({ isLoggedIn, name }) and /api/auth/logout.
// Any element with [data-account] becomes "Log in" when logged out, or an
// initials avatar + first name with a small menu when logged in.
(() => {
  const KEY = 'ss-mock-user';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
  const write = v => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch {} };
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const initials = n => n.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const css = `
  .acct { position: relative; }
  .acct-link { color: inherit; text-decoration: none; }
  .acct-link:hover { color: #8b2e22; }
  .acct-btn { display: inline-flex; align-items: center; gap: .6em; background: none; border: 0; padding: 0; cursor: pointer; color: inherit; font: inherit; letter-spacing: inherit; text-transform: inherit; }
  .acct-btn:hover .acct-av, .acct.open .acct-av { background: #1c1a17; box-shadow: 0 0 0 2px #efebe4, 0 0 0 3px #1c1a17; }
  .acct-av { display: grid; place-items: center; width: max(30px, 2.3em); height: max(30px, 2.3em); font-size: max(14px, 1.05em) !important; border-radius: 50%; flex: none;
    background: #8b2e22; color: #f3f0ed; font: 400 1.05em/1 'Oranienbaum', serif; letter-spacing: .02em; text-transform: uppercase;
    box-shadow: 0 0 0 2px #efebe4, 0 0 0 3px #8b2e22; }
  .acct-menu { position: absolute; right: 0; top: calc(100% + .9em); z-index: 120; min-width: 13em; background: #efebe4; border: 1.5px solid #1c1a17;
    box-shadow: 0 1.2em 2.4em -1em rgba(28,26,23,.45); padding: .4em 0; display: none;
    font: 500 14px 'Public Sans', sans-serif; letter-spacing: normal; text-transform: none; }
  .acct.open .acct-menu { display: block; }
  .acct-menu p { margin: 0; padding: .7em 1.1em .8em; border-bottom: 1px solid #ddd6cb; color: #6b655c; font-size: 12px; }
  .acct-menu p b { display: block; color: #1c1a17; font-size: 14px; }
  .acct-menu a, .acct-menu button { display: block; width: 100%; text-align: left; padding: .65em 1.1em; background: none; border: 0; cursor: pointer;
    font: inherit; color: #1c1a17; text-decoration: none; }
  .acct-menu a:hover, .acct-menu button:hover { background: #e4ddd2; color: #8b2e22; }`;
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);

  function render() {
    const u = read();
    document.querySelectorAll('[data-account]').forEach(slot => {
      slot.classList.add('acct'); slot.classList.remove('open');
      if (!u) { slot.innerHTML = `<a class="acct-link" href="auth.html">Log in</a>`; return; }
      slot.innerHTML = `
        <button class="acct-btn" aria-haspopup="true" aria-expanded="false" aria-label="Account menu for ${esc(u.name)}" title="${esc(u.name)}">
          <span class="acct-av" aria-hidden="true">${esc(initials(u.name))}</span>
        </button>
        <div class="acct-menu" role="menu">
          <p>Signed in as<b>${esc(u.name)}</b></p>
          <a href="cart.html" role="menuitem">Your bag</a>
          <button type="button" role="menuitem" data-logout>Log out</button>
        </div>`;
    });
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('.acct-btn');
    document.querySelectorAll('.acct.open').forEach(a => { if (!btn || !a.contains(btn)) { a.classList.remove('open'); a.querySelector('.acct-btn')?.setAttribute('aria-expanded', 'false'); } });
    if (btn) { const a = btn.closest('.acct'); a.classList.toggle('open'); btn.setAttribute('aria-expanded', a.classList.contains('open')); }
    if (e.target.closest('[data-logout]')) { write(null); render(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.acct.open').forEach(a => a.classList.remove('open')); });
  addEventListener('storage', e => { if (e.key === KEY) render(); });

  window.User = { get: read, login(name) { write({ name }); render(); }, logout() { write(null); render(); } };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', render); else render();
})();
