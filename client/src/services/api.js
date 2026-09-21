import axios from 'axios'

const apiOrigin = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const api = axios.create({
  baseURL: apiOrigin ? `${apiOrigin}/api` : '/api',
  withCredentials: true,
})

let unauthorizedHandler = null
let refreshPromise = null

export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn
}

function shouldSkipRefresh(url = '') {
  return ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/reset-password'].some(
    (path) => url.includes(path)
  )
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fh_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  const method = (config.method || 'get').toLowerCase()
  if (!['get', 'head', 'options'].includes(method) && typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|; )fh_csrf=([^;]*)/)
    if (match) config.headers['X-CSRF-Token'] = decodeURIComponent(match[1])
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status
    const original = err.config || {}
    if (status === 401 && !original._retry && !shouldSkipRefresh(original.url || '')) {
      original._retry = true
      try {
        if (!refreshPromise) {
          refreshPromise = api.post('/auth/refresh').finally(() => {
            refreshPromise = null
          })
        }
        const { data } = await refreshPromise
        if (data?.token) {
          localStorage.setItem('fh_token', data.token)
          original.headers = original.headers || {}
          original.headers.Authorization = `Bearer ${data.token}`
          return api(original)
        }
      } catch {
        localStorage.removeItem('fh_token')
        unauthorizedHandler?.()
        return Promise.reject(err)
      }
    }
    if (status === 401) {
      localStorage.removeItem('fh_token')
      unauthorizedHandler?.()
    }
    return Promise.reject(err)
  }
)

export default api
