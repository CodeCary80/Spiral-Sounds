// Mockup-only bag shared by page.html, detail.html and cart.html.
// Stands in for /api/cart: entries are { id, q }. Kept in localStorage so the
// flow survives page navigation; falls back to memory if storage is blocked.
(() => {
  const KEY = 'ss-mock-bag';
  let mem = [];
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return mem; } };
  const write = list => { mem = list; try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} emit(); };
  const subs = [];
  const emit = () => subs.forEach(fn => fn());
  addEventListener('storage', e => { if (e.key === KEY) emit(); });

  document.head.insertAdjacentHTML('beforeend', `<style>
  .bag-ic { position: relative; display: inline-grid; place-items: center; width: max(30px, 2.3em); height: max(30px, 2.3em); vertical-align: middle; }
  .bag-ic svg { width: 100%; height: 100%; }
  .bag-n { position: absolute; top: -.25em; right: -.5em; min-width: 1.55em; height: 1.55em; padding: 0 .3em; border-radius: 999px;
    display: grid; place-items: center; background: #8b2e22; color: #f3f0ed; box-shadow: 0 0 0 2px #efebe4;
    font: 700 max(10px, .7em)/1 'Public Sans', sans-serif; letter-spacing: 0; transition: transform .25s cubic-bezier(.2,1.6,.4,1); }
  .bag-n.zero { display: none; }
  .bag-n.pop { transform: scale(1.35); }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  </style>`);
  let last = null;
  // little bump on the badge whenever the count goes up
  subs.push(() => { const n = window.Bag.count(); if (last !== null && n > last) requestAnimationFrame(() =>
    document.querySelectorAll('.bag-n').forEach(b => { b.classList.add('pop'); setTimeout(() => b.classList.remove('pop'), 220); })); last = n; });
  window.Bag = {
    items: () => read(),
    has: id => read().some(x => x.id === id),
    count: () => read().reduce((a, x) => a + x.q, 0),
    add(id) {
      const list = read(), hit = list.find(x => x.id === id);
      hit ? hit.q++ : list.push({ id, q: 1 });
      write(list);
    },
    // mirrors the API: removing takes the whole line out
    remove(id) { write(read().filter(x => x.id !== id)); },
    clear() { write([]); },
    onChange(fn) { subs.push(fn); },
    // tote-bag icon with a count badge; the text stays for screen readers
    icon(n) {
      return `<span class="bag-ic"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
        <path d="M4.5 8h15l-1.2 12.5H5.7z"/><path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10" stroke-linecap="round"/></svg>
        <span class="bag-n${n ? '' : ' zero'}" aria-hidden="true">${n}</span><span class="sr">Bag, ${n} item${n === 1 ? '' : 's'}</span></span>`;
    },
  };
})();
