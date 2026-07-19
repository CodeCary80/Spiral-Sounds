export function calculateCartTotal(items) {
  return items.reduce((sum, item) => sum + Number(item.price) * (item.quantity || 1), 0)
}
