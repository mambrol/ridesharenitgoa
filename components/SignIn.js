'use client'
import { signInWithGoogle } from '@/lib/firebase'
import { useState } from 'react'

export default function SignIn() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignIn() {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-100 rounded-2xl p-10 w-full max-w-sm text-center shadow-sm">
        <div className="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
          </svg>
        </div>

        <h1 className="text-xl font-medium text-gray-900 mb-2">NIT Goa RideShare</h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          Pool rides safely within the NIT Goa community.<br />
          Sign in with your university Google account.
        </p>

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <GoogleIcon />
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        {error && (
          <p className="mt-4 text-xs text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
        )}

        <p className="mt-5 text-xs text-gray-400">
          🔒 Only @nitgoa.ac.in accounts are permitted
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.5 30.3 0 24 0 14.7 0 6.7 5.5 2.7 13.5l7.9 6.1C12.6 13.2 17.8 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.6 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.2-10.1 7.2-17z"/>
      <path fill="#FBBC05" d="M10.6 28.4A14.8 14.8 0 0 1 9.5 24c0-1.5.3-3 .8-4.4l-7.9-6.1A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.7 10.7l7.9-6.3z"/>
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.2 1.5-5 2.3-8.4 2.3-6.2 0-11.4-3.7-13.4-9.3l-7.9 6.3C6.7 42.5 14.7 48 24 48z"/>
    </svg>
  )
}
