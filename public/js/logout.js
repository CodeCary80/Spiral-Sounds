export async function logout() {
  try {
    await fetch('/api/auth/logout/')
  } catch (err) {
    console.warn('Failed to log out', err)
  }
  window.location.href = '/'
}
