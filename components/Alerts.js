'use client'
import { useState, useEffect } from 'react'
import { saveAlert, subscribeAlerts, deleteAlert } from '@/lib/firebase'

export default function Alerts({ user, notifications, onDismiss }) {
  const [alerts, setAlerts]     = useState([])
  const [from, setFrom]         = useState('')
  const [to, setTo]             = useState('')
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    const unsub = subscribeAlerts(user.email, setAlerts)
    return unsub
  }, [user.email])

  async function handleAdd() {
    if (!from.trim() && !to.trim()) return
    setSaving(true)
    try {
      await saveAlert(user.email, { from: from.trim(), to: to.trim() })
      setFrom(''); setTo('')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(alertId) {
    await deleteAlert(user.email, alertId)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-5">

      {/* Add alert */}
      <div className="card mb-5">
        <h2 className="text-sm font-medium text-gray-900 mb-1">Route alerts</h2>
        <p className="text-xs text-gray-400 mb-4">
          Get notified instantly when someone posts a ride on your route.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From (partial ok)</label>
            <input className="inp" placeholder="e.g. NIT Goa" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To (partial ok)</label>
            <input className="inp" placeholder="e.g. Panjim" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>
        <button className="btn-primary" onClick={handleAdd} disabled={saving || (!from.trim() && !to.trim())}>
          {saving ? 'Adding…' : '🔔 Add alert'}
        </button>
      </div>

      {/* Existing alerts */}
      {alerts.length > 0 && (
        <div className="card mb-5">
          <h3 className="text-xs font-medium text-gray-500 mb-3">Your alerts ({alerts.length})</h3>
          <div className="flex flex-col gap-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm">🔔</span>
                <span className="flex-1 text-sm font-medium text-gray-800">
                  {a.from || 'Any'} → {a.to || 'Any'}
                </span>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">
          Notifications ({notifications.length})
        </h3>
        {notifications.length > 0 && (
          <button
            onClick={() => notifications.forEach(n => onDismiss(n.id))}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Clear all
          </button>
        )}
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">
          <p className="text-3xl mb-2">🔕</p>
          No notifications yet. Add a route alert above.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {notifications.map((n) => (
          <div key={n.id} className="flex items-start gap-3 bg-brand-light border border-green-200 rounded-xl px-4 py-3">
            <span className="text-brand text-base mt-0.5">🔔</span>
            <p className="flex-1 text-sm text-brand-dark">{n.msg}</p>
            <button onClick={() => onDismiss(n.id)} className="text-brand-dark opacity-50 hover:opacity-100 text-xs mt-0.5">✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
