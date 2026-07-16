const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8756'

function getToken() {
  return localStorage.getItem('inspire_token')
}

async function request(path, { method = 'GET', body, form, auth = true } = {}) {
  const headers = {}
  if (!form) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: form ? body : body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let detail = 'Something went wrong.'
    try {
      const data = await res.json()
      detail = data.detail || detail
    } catch (_) {}
    const err = new Error(detail)
    err.status = res.status
    throw err
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (email, password) => {
    const form = new URLSearchParams()
    form.set('username', email)
    form.set('password', password)
    return request('/auth/login', { method: 'POST', body: form, form: true, auth: false })
  },
  googleLogin: (credential) => request('/auth/google', { method: 'POST', body: { credential }, auth: false }),
  listStories: (category) => request(`/stories${category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : ''}`, { auth: false }),
  createStory: (payload) => request('/stories', { method: 'POST', body: payload }),
  reactToStory: (storyId, reaction) => request('/stories/react', { method: 'POST', body: { story_id: storyId, reaction } }),
  ariaUsage: () => request('/aria/usage'),
  ariaChat: (message) => request('/aria/chat', { method: 'POST', body: { message } }),
  me: () => request('/auth/me'),
  createCheckoutSession: () => request('/premium/checkout', { method: 'POST' }),
}

export { getToken }
