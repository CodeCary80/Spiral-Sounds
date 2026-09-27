// Returns the signed-in user's name, or false when logged out.
export async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me')
    if (!res.ok) return false
    const user = await res.json()
    return user.isLoggedIn ? user.name : false
  } catch (err) {
    console.warn('Auth check failed', err)
    return false
  }
}
