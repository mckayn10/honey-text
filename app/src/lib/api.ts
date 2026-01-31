import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Not authenticated')
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint}`
  let response: Response
  try {
    const headers = await getAuthHeaders()
    response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    })
  } catch (err: any) {
    if (err?.message === 'Failed to fetch') {
      throw new Error(`Cannot reach the API at ${url}. Make sure the API server is running (e.g. npm run dev from project root) and VITE_API_URL in app/.env is correct.`)
    }
    throw err
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || err.message || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function publicApiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || err.message || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}
