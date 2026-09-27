// − n + stepper markup shared by the bag page and the sheet's bag panel.
// removeAtOne: where there's no separate Remove button, − at 1 takes the line out.
export function stepper(item, { small = false, removeAtOne = false } = {}) {
  const stock = Number(item.stock) || item.quantity
  const title = item.title.replace(/"/g, '&quot;')
  const last = item.quantity <= 1
  return `<span class="qty${small ? ' sm' : ''}" data-item="${item.cartItemId}" data-qty="${item.quantity}" data-stock="${stock}">
    <button type="button" data-step="-1" aria-label="${last && removeAtOne ? 'Remove' : 'One fewer'} ${title}"${last && !removeAtOne ? ' disabled' : ''}>−</button>
    <output aria-live="polite">${item.quantity}</output>
    <button type="button" data-step="1" aria-label="One more ${title}"${item.quantity >= stock ? ' disabled' : ''}>+</button>
  </span>`
}
