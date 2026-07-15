import { supabase } from './supabase'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'

const NATIVE_AUTH_CALLBACK_URL = 'allio.life://auth/callback'

export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

export function getAuthRedirectUrl() {
  if (isNativeApp()) return NATIVE_AUTH_CALLBACK_URL
  return `${window.location.origin}/auth/callback`
}

export async function signInWithGoogle() {
  if (!isNativeApp()) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl(),
      },
    })
    if (error) throw error
    return
  }

  const redirectTo = NATIVE_AUTH_CALLBACK_URL
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  })

  if (error) throw error
  const authUrl = data?.url
  if (!authUrl) throw new Error('Google sign-in did not return an auth URL')

  return new Promise((resolve, reject) => {
    let settled = false
    let listenerHandle = null

    const cleanup = async () => {
      if (listenerHandle) {
        await listenerHandle.remove()
        listenerHandle = null
      }
    }

    const fail = async (err) => {
      if (settled) return
      settled = true
      await cleanup()
      try {
        await Browser.close()
      } catch {}
      reject(err)
    }

    const succeed = async () => {
      if (settled) return
      settled = true
      await cleanup()
      try {
        await Browser.close()
      } catch {}
      resolve()
    }

    CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
      if (!url || !url.startsWith(redirectTo)) return
      try {
        const parsed = new URL(url)
        const code = parsed.searchParams.get('code')
        const errorCode = parsed.searchParams.get('error_code') || parsed.searchParams.get('error')
        const errorDescription = parsed.searchParams.get('error_description')

        if (errorCode) {
          throw new Error(errorDescription || errorCode)
        }

        if (!code) {
          throw new Error('Google sign-in callback did not include an auth code')
        }

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(url)
        if (exchangeError) throw exchangeError
        await succeed()
      } catch (err) {
        await fail(err)
      }
    }).then(async (handle) => {
      listenerHandle = handle
      try {
        await Browser.open({ url: authUrl, windowName: '_self' })
      } catch (err) {
        await fail(err)
      }
    }).catch(reject)
  })
}
