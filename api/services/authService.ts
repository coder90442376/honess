import { apiClient } from '@/lib/api'
import type { User } from '@/store/authStore'

/**
 * Authentication API Service
 * Handles all auth-related API calls
 */

export interface AuthResponse {
  success: boolean
  data?: {
    user: User
    token: string
  }
  error?: string
  message?: string
}

export interface ResetTokenData {
  valid: boolean
  email?: string
  error?: string
}

class AuthService {
  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<
        | {
            success: boolean
            message: string
            data: {
              user: User
              token: string
            }
          }
        | {
            user: User
            token: string
          }
      >('/auth/login', {
        email: email.toLowerCase(),
        password,
      })

      // API can return either:
      // 1. { success, message, data: { user, token } } (wrapped)
      // 2. { user, token } (already unwrapped by interceptor)
      
      const responsePayload = response.data as any
      let responseData: { user: User; token: string } | undefined

      // Check if the response has the wrapped structure
      if (responsePayload.data?.user && responsePayload.data?.token) {
        responseData = responsePayload.data
      }
      // Check if the response is already unwrapped
      else if (responsePayload.user && responsePayload.token) {
        responseData = responsePayload
      }

      if (!responseData?.user || !responseData?.token) {
        console.error('[Auth Service] Invalid response structure:', response.data)
        return {
          success: false,
          error: 'Invalid response from server',
        }
      }

      // Persist the refresh token so the API client can silently renew the
      // access token when it expires (see lib/api.ts interceptor).
      const refreshToken = responsePayload.data?.refreshToken || responsePayload.refreshToken
      if (refreshToken && typeof window !== 'undefined') {
        localStorage.setItem('refresh_token', refreshToken)
      }

      console.log('[Auth Service] Login successful:', { userId: responseData.user.id })
      return {
        success: true,
        data: responseData,
      }
    } catch (error: any) {
      console.error('[Auth Service] Login error:', error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Login failed',
      }
    }
  }

  /**
   * Register new user
   */
  async register(
    email: string,
    displayName: string,
    password: string
  ): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<
        | {
            success: boolean
            message: string
            data: {
              user: User
              token: string
            }
          }
        | {
            user: User
            token: string
          }
      >('/auth/register', {
        email: email.toLowerCase(),
        displayName,
        password,
      })

      // API can return either:
      // 1. { success, message, data: { user, token } } (wrapped)
      // 2. { user, token } (already unwrapped by interceptor)
      
      const responsePayload = response.data as any
      let responseData: { user: User; token: string } | undefined

      // Check if the response has the wrapped structure
      if (responsePayload.data?.user && responsePayload.data?.token) {
        responseData = responsePayload.data
      }
      // Check if the response is already unwrapped
      else if (responsePayload.user && responsePayload.token) {
        responseData = responsePayload
      }

      if (!responseData?.user || !responseData?.token) {
        console.error('[Auth Service] Invalid response structure:', response.data)
        return {
          success: false,
          error: 'Invalid response from server',
        }
      }

      const refreshToken = responsePayload.data?.refreshToken || responsePayload.refreshToken
      if (refreshToken && typeof window !== 'undefined') {
        localStorage.setItem('refresh_token', refreshToken)
      }

      console.log('[Auth Service] Registration successful:', { userId: responseData.user.id })
      return {
        success: true,
        data: responseData,
      }
    } catch (error: any) {
      // Backend wraps errors as { success:false, error:{ code, message, details } }.
      // Fall back to the legacy flat shape and axios' own message.
      const message =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message
      console.error('[Auth Service] Registration error:', error.response?.data || error.message)
      return {
        success: false,
        error:
          message === 'Email already exists'
            ? 'This email is already registered'
            : message || 'Registration failed',
      }
    }
  }

  /**
   * Request password reset email
   */
  async requestPasswordReset(email: string): Promise<{
    success: boolean
    message?: string
    error?: string
  }> {
    try {
      // The API requires resetUrl as well as email — it builds the link in the
      // email from it, and rejects the request outright without it. Omitting it
      // made every password reset fail validation, so a user who forgot their
      // password had no way back into their account.
      const response = await apiClient.post<{ message: string }>(
        '/auth/request-password-reset',
        {
          email: email.toLowerCase(),
          // The ORIGIN only. The API appends `/reset-password?token=…` itself
          // (utils/emailService.js builds the link), so including the path here
          // would produce /reset-password/reset-password and a dead link.
          resetUrl:
            typeof window !== 'undefined'
              ? window.location.origin
              : process.env.NEXT_PUBLIC_SITE_URL || 'https://honestneed.com',
        }
      )

      return {
        success: true,
        message: response.data.message || 'Reset link sent to your email',
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message
      return {
        success: false,
        error:
          message === 'Email not found'
            ? 'Email address not found'
            : message === 'Rate limited'
              ? 'Too many requests. Please try again later.'
              : message || 'Failed to request password reset',
      }
    }
  }

  /**
   * Verify reset token
   */
  async verifyResetToken(token: string): Promise<ResetTokenData> {
    try {
      const response = await apiClient.get<{ email: string }>(
        `/auth/verify-reset-token/${token}`
      )

      return {
        valid: true,
        email: response.data.email,
      }
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.data?.message || 'Invalid or expired token',
      }
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(
    token: string,
    password: string
  ): Promise<{
    success: boolean
    message?: string
    error?: string
  }> {
    try {
      const response = await apiClient.post<{ message: string }>(
        '/auth/reset-password',
        {
          token,
          password,
        }
      )

      return {
        success: true,
        message: response.data.message || 'Password reset successfully',
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message
      return {
        success: false,
        error:
          message === 'Invalid token'
            ? 'Reset link has expired. Please request a new one.'
            : message || 'Failed to reset password',
      }
    }
  }

  /**
   * Check if email exists (for unique check on registration)
   */
  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const response = await apiClient.post<{ exists: boolean }>(
        '/auth/check-email',
        {
          email: email.toLowerCase(),
        }
      )

      return response.data.exists
    } catch (error) {
      // On error, assume email doesn't exist to allow user to proceed
      return false
    }
  }

  /**
   * Logout (clear token on backend)
   */
  async logout(): Promise<{
    success: boolean
  }> {
    try {
      await apiClient.post('/auth/logout')
      return { success: true }
    } catch (error) {
      // Even if logout fails on backend, we still clear local auth
      return { success: true }
    }
  }
}

export const authService = new AuthService()
