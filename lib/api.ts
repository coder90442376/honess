import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { toast } from 'react-toastify'
import { useConnectivityStore } from '@/store/connectivityStore'

interface ApiErrorResponse {
  message?: string
  error?: string
}

// Augment axios config so per-request options below are recognised at call
// sites (apiClient.get(url, { silentStatuses: [...] })), not just internally.
declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * Status codes that are an EXPECTED outcome for this request (e.g. a 404
     * when probing /business/profile/me before the user has created a profile).
     * When the response status is in this list, handleApiError stays silent —
     * no console.error and no toast — and lets the caller handle it.
     */
    silentStatuses?: number[]
  }
}

interface RetryConfig extends InternalAxiosRequestConfig {
  retryCount?: number
  skipRetry?: boolean
  _authRetried?: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
const isDev = process.env.NODE_ENV === 'development'
const MAX_RETRIES = 3
const BASE_DELAY = 1000 // 1 second

/**
 * Calculate exponential backoff delay
 * Formula: baseDelay * (2 ^ retryCount) + jitter (random 0-1000ms)
 */
const getExponentialBackoffDelay = (retryCount: number): number => {
  const exponentialDelay = BASE_DELAY * Math.pow(2, retryCount)
  const jitter = Math.random() * 1000
  return exponentialDelay + jitter
}

/**
 * Check if error is retryable (network error or 5xx server error)
 */
const isRetryableError = (error: AxiosError): boolean => {
  if (!error.response) {
    // Network error
    return true
  }
  // Retry on 5xx server errors
  return error.response.status >= 500
}

/**
 * Classify an error as a connectivity issue and push it to the global banner
 * store (lib/components/ConnectivityBanner). Safe to call repeatedly — the
 * store no-ops if nothing changed.
 */
const reportConnectivityFromError = (error: AxiosError): void => {
  if (typeof window === 'undefined') return

  if (error.code === 'ECONNABORTED') {
    useConnectivityStore.getState().reportIssue('timeout')
  } else if (!error.response) {
    useConnectivityStore.getState().reportIssue(
      navigator.onLine === false ? 'browser-offline' : 'network-error'
    )
  } else if (error.response.status >= 500) {
    useConnectivityStore.getState().reportIssue('server-error')
  }
}

/**
 * Remove every client-side session artifact — localStorage keys AND the
 * cookies the proxy middleware reads. Clearing localStorage but leaving the
 * `auth_token` cookie behind traps users in a redirect loop: proxy.ts bounces
 * /login → /dashboard on cookie existence, the dashboard's API calls 401, and
 * the user is stuck on a blank loading shell with no way back to the login
 * form. Always clear both together.
 */
export function clearSessionArtifacts(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('auth_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  const past = new Date(0).toUTCString()
  document.cookie = `auth_token=; expires=${past}; path=/; SameSite=Lax`
  document.cookie = `user_role=; expires=${past}; path=/; SameSite=Lax`
  document.cookie = `user_id=; expires=${past}; path=/; SameSite=Lax`
}

/**
 * Single in-flight refresh promise, shared across all concurrent 401s so we
 * only hit /auth/refresh once even if several requests expire at the same time.
 */
let refreshPromise: Promise<string | null> | null = null

/**
 * Exchange the stored refresh token for a new access token.
 * Uses a bare axios call (not apiClient) to avoid interceptor recursion.
 * Returns the new access token, or null if refresh is impossible.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null

  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) return null

  try {
    const { data } = await axios.post(
      `${API_URL}/auth/refresh`,
      { refreshToken },
      { withCredentials: true, timeout: 30000 }
    )

    // Backend responds with { success, message, data: { accessToken } }
    const newToken: string | undefined = data?.data?.accessToken || data?.accessToken
    if (!newToken) return null

    // Persist the renewed access token everywhere the app reads it from.
    localStorage.setItem('auth_token', newToken)
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString()
    document.cookie = `auth_token=${newToken}; expires=${expires}; path=/; SameSite=Lax`

    return newToken
  } catch {
    return null
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  withCredentials: true, // Enable sending cookies with requests
  // Don't set default Content-Type - let axios auto-detect based on data type
  // FormData needs its own boundary, JSON needs application/json
  headers: {},
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage (client-side only)
    let token = null
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('auth_token')
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    } else {
      // Check if this is a known public endpoint to avoid spamming console warnings
      const url = config.url || ''
      const isPublic = 
        url.includes('/auth/') ||
        url.includes('/public') ||
        url.includes('/sponsorships/create') ||
        url.includes('/onboard') ||
        (config.method?.toLowerCase() === 'get' && (
          url.includes('/campaigns') ||
          url.includes('/need-types') ||
          url.includes('/trending') ||
          url.includes('/related') ||
          (url.includes('/sponsorships/') && !url.includes('/sponsorships/admin'))
        ))

      if (!isPublic) {
        console.warn('[API] ✗ No auth token found for private endpoint - request will fail with 401', {
          url: config.url,
          method: config.method
        })
      } else if (isDev) {
        console.log('[API] Public endpoint request (no auth token needed)', {
          url: config.url,
          method: config.method
        })
      }
    }

    // Handle FormData requests - don't set Content-Type so browser can set proper boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    
    if (isDev) {
      console.log('[API Request]', config.method?.toUpperCase(), config.url, config.data instanceof FormData ? '[FormData]' : config.data || {})
    }
    return config
  },
  (error) => {
    if (isDev) {
      console.error('[API Request Error]', error)
    }
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors with retry logic
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (isDev) {
      console.log('[API Response]', response.status, response.config.url, response.data)
    }
    // Any successful response means we're connected — clear a stale banner.
    useConnectivityStore.getState().reportSuccess()
    return response
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const config = error.config as RetryConfig | undefined

    if (!config) {
      handleApiError(error)
      return Promise.reject(error)
    }

    // --- 401 handling: try to silently refresh the access token, then replay ---
    const isAuthEndpoint = (config.url || '').includes('/auth/')
    if (
      error.response?.status === 401 &&
      !config._authRetried &&
      !isAuthEndpoint &&
      typeof window !== 'undefined' &&
      localStorage.getItem('refresh_token')
    ) {
      config._authRetried = true

      // Share one refresh across all concurrent 401s.
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null
        })
      }

      const newToken = await refreshPromise

      if (newToken) {
        config.headers.Authorization = `Bearer ${newToken}`
        return apiClient.request(config)
      }
      // Refresh failed → fall through to handleApiError which clears auth.
    }

    if (config.skipRetry) {
      handleApiError(error)
      return Promise.reject(error)
    }

    // Initialize retry count
    if (!config.retryCount) {
      config.retryCount = 0
    }

    // Check if we should retry
    if (isRetryableError(error) && config.retryCount < MAX_RETRIES) {
      // Surface the connectivity banner immediately — don't make the user
      // wait through 3 silent retries before learning something's wrong.
      reportConnectivityFromError(error)

      config.retryCount++
      const delay = getExponentialBackoffDelay(config.retryCount - 1)

      if (isDev) {
        console.log(
          `[API Retry] Attempt ${config.retryCount}/${MAX_RETRIES} after ${delay.toFixed(0)}ms`,
          config.url
        )
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))

      // Retry the request
      return apiClient.request(config)
    }

    // If no more retries, handle the error
    handleApiError(error)
    return Promise.reject(error)
  }
)

/**
 * Handle API errors with appropriate user feedback
 */
function handleApiError(error: AxiosError<ApiErrorResponse>): void {
  // Caller-declared expected statuses (e.g. 404 on /business/profile/me before
  // a profile exists) are handled by the caller — stay silent here.
  const status = error.response?.status
  if (status && error.config?.silentStatuses?.includes(status)) {
    return
  }

  if (isDev) {
    console.error('[API Error] Full details:', {
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        hasAuthHeader: !!error.config?.headers?.Authorization
      }
    })
  }

  if (error.response?.status === 401) {
    // Unauthorized - only clear auth if token exists but is invalid
    // Don't clear if no token was sent (let subsequent request try again)
    if (typeof window !== 'undefined') {
      const currentToken = localStorage.getItem('auth_token')
      const currentUser = localStorage.getItem('user')
      
      console.warn('[API] 401 Error - Auth status:', {
        hadToken: !!currentToken,
        hadUser: !!currentUser,
        url: error.config?.url,
        hadAuthHeader: !!error.config?.headers?.Authorization
      })
      
      // Only clear auth if we had a token (session expired), not if token was missing
      if (currentToken && currentUser) {
        console.warn('[API] Clearing auth due to session expiration')
        clearSessionArtifacts()

        // Store the redirect URL to return after login
        const currentPath = window.location.pathname + window.location.search
        if (!currentPath.startsWith('/login')) {
          localStorage.setItem('redirect_after_login', currentPath)
        }
        // `expired=1` tells proxy.ts NOT to bounce us back to /dashboard even
        // if a stale auth cookie somehow survives — guarantees the login form
        // is reachable after a dead session.
        window.location.href = '/login?expired=1'
        toast.error('Session expired. Please login again.')
      } else {
        // No token in localStorage. Two distinct cases:
        //
        // 1. TRAPPED SESSION: a stale `auth_token` cookie survives (e.g. an
        //    earlier cleanup only removed localStorage). proxy.ts keeps
        //    bouncing /login → /dashboard on cookie existence while every API
        //    call here 401s — the user sees a permanent blank loading shell.
        //    Clear the cookies and, if we're on a protected route, send them
        //    to the login form to recover.
        const hasStaleAuthCookie = document.cookie
          .split(';')
          .some((c) => {
            const [name, value] = c.trim().split('=')
            return name === 'auth_token' && !!value
          })

        if (hasStaleAuthCookie) {
          console.warn('[API] 401 with stale auth cookie but no localStorage token — clearing trapped session')
          clearSessionArtifacts()

          const path = window.location.pathname
          const isProtectedPath = ['/dashboard', '/creator', '/admin', '/profile', '/donations']
            .some((p) => path.startsWith(p))
          if (isProtectedPath) {
            window.location.href = '/login?expired=1'
            toast.error('Session expired. Please login again.')
          }
          return
        }

        // 2. Anonymous/public browsing. A 401 on a background request (e.g. a
        //    public campaign page that also probes an authed-only endpoint like
        //    analytics) is EXPECTED and must NOT nag the visitor with a login
        //    toast. Explicit auth-required actions surface their own messaging
        //    where the user took the action.
        console.warn('[API] 401 with no auth token (anonymous browsing). Endpoint:', error.config?.url)
      }
    }
  } else if (error.response?.status === 403) {
    // Forbidden - user lacks permissions
    toast.error('You do not have permission to perform this action.')
  } else if (error.response?.status === 404) {
    // Not found
    toast.error(getApiErrorMessage(error, 'Resource not found'))
  } else if (error.response?.status === 400 || error.response?.status === 422) {
    // Bad request / unprocessable - validation errors
    toast.error(getApiErrorMessage(error, 'Invalid request'))
  } else if (error.response?.status === 409) {
    // Conflict. The server's message is the ONLY thing that tells the user what
    // to do — "A user with this email already exists" means sign in or reset,
    // not "try again". Without this branch a 409 fell through to the generic
    // toast, so people retried a registration that could never succeed.
    toast.error(getApiErrorMessage(error, 'That already exists.'))
  } else if (error.response?.status && error.response.status >= 500) {
    // Server error — the global ConnectivityBanner already explains this and
    // offers a Retry action; a toast on top would just be noise.
    reportConnectivityFromError(error)
  } else if (error.code === 'ECONNABORTED') {
    // Timeout — same as above, surfaced via the connectivity banner.
    reportConnectivityFromError(error)
  } else if (!error.response) {
    // Network/offline error — same as above.
    reportConnectivityFromError(error)
  } else {
    // Generic error
    toast.error('An error occurred. Please try again.')
  }
}

/**
 * Backend error envelope: `{ success:false, error:{ code, message, statusCode } }`.
 * Older endpoints use a flat `{ message }` or `{ error: '…' }`. These helpers
 * read the machine-readable code and a human-readable message from either shape.
 */
type BackendError = {
  message?: string
  error?: string | { code?: string; message?: string }
}

/** Machine-readable error code (e.g. 'NO_VOLUNTEER_PROFILE'), or undefined. */
export function getApiErrorCode(err: unknown): string | undefined {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as BackendError | undefined
    if (data && typeof data.error === 'object') return data.error.code
  }
  return undefined
}

/** Human-readable message from the backend, falling back to a sensible default. */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as BackendError | undefined
    if (data) {
      if (typeof data.error === 'object' && data.error.message) return data.error.message
      if (typeof data.error === 'string' && data.error) return data.error
      if (data.message) return data.message
    }
  }
  return err instanceof Error ? err.message || fallback : fallback
}

export default apiClient
