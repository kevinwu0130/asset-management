const BASE = '/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(method, path, body, isForm = false) {
  const headers = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!isForm) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : (body ? JSON.stringify(body) : undefined)
  })

  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
    return
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '請求失敗')
  return data
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
  upload: (path, form) => request('POST', path, form, true),

  // Typed helpers
  auth: {
    login: (email, password) => request('POST', '/auth/login', { email, password }),
    me: () => request('GET', '/auth/me')
  },
  assets: {
    list: (params = {}) => request('GET', '/assets?' + new URLSearchParams(params)),
    get: (id) => request('GET', `/assets/${id}`),
    create: (data) => request('POST', '/assets', data),
    update: (id, data) => request('PUT', `/assets/${id}`, data),
    delete: (id) => request('DELETE', `/assets/${id}`),
    exportCsv: () => {
      const token = getToken()
      window.open(`${BASE}/assets/export/csv?token=${token}`)
    },
    importCsv: (file) => {
      const form = new FormData()
      form.append('file', file)
      return request('POST', '/assets/import/csv', form, true)
    }
  },
  loans: {
    list: (params = {}) => request('GET', '/loans?' + new URLSearchParams(params)),
    create: (data) => request('POST', '/loans', data),
    approve: (id) => request('PUT', `/loans/${id}/approve`),
    reject: (id, rejectReason) => request('PUT', `/loans/${id}/reject`, { rejectReason }),
    return: (id) => request('PUT', `/loans/${id}/return`)
  },
  categories: {
    list: () => request('GET', '/categories'),
    create: (data) => request('POST', '/categories', data),
    delete: (id) => request('DELETE', `/categories/${id}`)
  },
  locations: {
    list: () => request('GET', '/locations'),
    create: (data) => request('POST', '/locations', data),
    delete: (id) => request('DELETE', `/locations/${id}`)
  },
  users: {
    list: () => request('GET', '/users'),
    create: (data) => request('POST', '/users', data),
    update: (id, data) => request('PUT', `/users/${id}`, data),
    delete: (id) => request('DELETE', `/users/${id}`)
  },
  dashboard: {
    get: () => request('GET', '/dashboard')
  },
  logs: {
    list: (params = {}) => request('GET', '/logs?' + new URLSearchParams(params))
  },
  reports: {
    summary: (params = {}) => request('GET', '/reports/summary?' + new URLSearchParams(params)),
    inventory: (params = {}) => request('GET', '/reports/inventory?' + new URLSearchParams(params)),
    exportInventory: (params = {}) => {
      const token = getToken()
      const qs = new URLSearchParams({ ...params, token })
      window.open(`${BASE}/reports/inventory/export?${qs}`)
    },
    exportInventoryXlsx: (params = {}) => {
      const token = getToken()
      const qs = new URLSearchParams({ ...params, token })
      window.open(`${BASE}/reports/inventory/export-xlsx?${qs}`)
    },
    exportAssetsXlsx: () => {
      const token = getToken()
      window.open(`${BASE}/reports/assets/export-xlsx?token=${token}`)
    }
  },
  maintenance: {
    listByAsset: (assetId) => request('GET', `/maintenance/asset/${assetId}`),
    create: (data) => request('POST', '/maintenance', data),
    update: (id, data) => request('PUT', `/maintenance/${id}`, data),
    delete: (id) => request('DELETE', `/maintenance/${id}`)
  },
  attachments: {
    listByAsset: (assetId) => request('GET', `/attachments/asset/${assetId}`),
    upload: (assetId, file) => {
      const form = new FormData()
      form.append('file', file)
      return request('POST', `/attachments/asset/${assetId}`, form, true)
    },
    delete: (id) => request('DELETE', `/attachments/${id}`),
    url: (filename) => `/uploads/${filename}`
  }
}
