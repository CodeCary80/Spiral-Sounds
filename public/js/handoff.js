// Remember which cover was clicked so detail.html can paint it before first
// render — the cross-page cover transition needs its target on the first frame.
export function handOffCover({ id, image }) {
  try { sessionStorage.setItem('ss-cover', JSON.stringify({ id, image })) } catch {}
}
