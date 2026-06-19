'use client'
import { useState, useEffect } from 'react'
import { sendRequest, notifyDriverOfRequest, db } from '../lib/firebase'
import { format } from 'date-fns'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'

const DEFAULT_LOCS = [
  'NIT Goa Campus','Panjim Bus Stand','Margao Railway Station',
  'Vasco da Gama','Calangute','Panaji','Old Goa','Mapusa',
  'Dabolim Airport','Colva Beach','Madgaon','Porvorim','Verna',
]

export default function Browse({ rides, user, onMessage }) {
  const [from, setFrom]             = useState('')
  const [to, setTo]                 = useState('')
  const [fromSuggestions, setFromSuggestions] = useState([])
  const [toSuggestions, setToSuggestions]     = useState([])
  const [showFromList, setShowFromList]       = useState(false)
  const [showToList, setShowToList]           = useState(false)
  const [requesting, setRequesting] = useState({})
  const [requested, setRequested]   = useState({})
  const [locations, setLocations]   = useState(DEFAULT_LOCS)

  // Load locations from Firestore
  useEffect(() => {
    const q = query(collection(db, 'locations'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      if (!snap.empty) setLocations(snap.docs.map(d => d.data().name))
    })
    return unsub
  }, [])

  // Filter suggestions
  useEffect(() => {
    if (!from.trim()) { setFromSuggestions([]); return }
    setFromSuggestions(
      locations.filter(l => l.toLowerCase().includes(from.toLowerCase()))
    )
  }, [from, locations])

  useEffect(() => {
    if (!to.trim()) { setToSuggestions([]); return }
    setToSuggestions(
      locations.filter(l => l.toLowerCase().includes(to.toLowerCase()))
    )
  }, [to, locations])

  const now = new Date()

  const filtered = rides.filter((r) => {
    try {
      if (new Date(`${r.date}T${r.time}`) < now) return false
    } catch { }
    const fMatch = !from.trim() || r.from.toLowerCase().includes(from.toLowerCase())
    const tMatch = !to.trim()   || r.to.toLowerCase().includes(to.toLowerCase())
    return fMatch && tMatch
  })

  const free = (r) => r.totalSeats - (r.takenSeats ?? 0)

  async function handleRequest(ride) {
    if (requesting[ride.id] || requested[ride.id]) return
    setRequesting(p => ({ ...p, [ride.id]: true }))
    try {
      await sendRequest(ride.id, {
        requesterEmail: user.email,
        requesterName:  user.displayName || user.email,
      })
      setRequested(p => ({ ...p, [ride.id]: true }))
    } finally {
      setRequesting(p => ({ ...p, [ride.id]: false }))
    }
  }

  function fmtDate(dateStr, timeStr) {
    try {
      return format(new Date(`${dateStr}T${timeStr}`), 'EEE d MMM · h:mm a')
    } catch { return `${dateStr} ${timeStr}` }
  }

  const avail = filtered.filter(r => free(r) > 0).length
  const cars  = filtered.filter(r => r.vehicle === 'car').length

  return (
    <div className="max-w-3xl mx-auto px-4 py-5">

      {/* Search bar with autocomplete */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4 grid sm:grid-cols-3 gap-3 items-end">
        {/* From */}
        <div className="relative">
          <label className="text-xs text-gray-500 font-medium mb-1 block">From</label>
          <input
            className="inp"
            placeholder="e.g. NIT Goa Campus"
            value={from}
            onChange={e => { setFrom(e.target.value); setShowFromList(true) }}
            onFocus={() => setShowFromList(true)}
            onBlur={() => setTimeout(() => setShowFromList(false), 150)}
            autoComplete="off"
          />
          {showFromList && fromSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-30 mt-1 overflow-hidden">
              {fromSuggestions.map(l => (
                <button key={l}
                  onMouseDown={() => { setFrom(l); setShowFromList(false) }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-light hover:text-brand-dark transition-colors border-b border-gray-50 last:border-0">
                  📍 {l}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* To */}
        <div className="relative">
          <label className="text-xs text-gray-500 font-medium mb-1 block">To</label>
          <input
            className="inp"
            placeholder="e.g. Panjim"
            value={to}
            onChange={e => { setTo(e.target.value); setShowToList(true) }}
            onFocus={() => setShowToList(true)}
            onBlur={() => setTimeout(() => setShowToList(false), 150)}
            autoComplete="off"
          />
          {showToList && toSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-30 mt-1 overflow-hidden">
              {toSuggestions.map(l => (
                <button key={l}
                  onMouseDown={() => { setTo(l); setShowToList(false) }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-light hover:text-brand-dark transition-colors border-b border-gray-50 last:border-0">
                  📍 {l}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => { setFrom(''); setTo('') }} className="btn-ghost justify-center">
          Clear
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { n: filtered.length, l: 'Upcoming rides' },
          { n: avail,           l: 'Seats free'     },
          { n: cars,            l: 'Cars'            },
        ].map(s => (
          <div key={s.l} className="bg-gray-50 rounded-xl p-3">
            <p className="text-2xl font-medium text-gray-900">{s.n}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.l}</p>
          </div>
        ))}
      </div>

      {(from || to) && (
        <p className="text-xs text-gray-500 mb-3">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "
          {[from, to].filter(Boolean).join(' → ')}"
        </p>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm card">
          <p className="text-3xl mb-2">🚗</p>
          No upcoming rides found. Try different locations or post your own!
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {filtered.map((ride) => {
          const isMine     = ride.posterEmail === user.email
          const seats      = free(ride)
          const alreadyReq = requested[ride.id] || ride.myRequestStatus != null
          const dots       = Array.from({ length: ride.totalSeats }, (_, i) => i)

          return (
            <div key={ride.id} className="card hover:border-gray-200 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <span className={ride.vehicle === 'car' ? 'badge-car' : 'badge-bike'}>
                  {ride.vehicle === 'car' ? '🚗 Car' : '🏍 Bike'}
                </span>
                <span className={ride.payment === 'paid' ? 'badge-paid' : 'badge-free'}>
                  {ride.payment === 'paid' ? (ride.payNote || 'Paid') : 'Free'}
                </span>
              </div>

              <p className="font-medium text-sm text-gray-900 mb-1">
                <span className="text-brand">●</span> {ride.from}
                <span className="text-gray-400 mx-1">→</span>
                <span className="text-red-400">●</span> {ride.to}
              </p>

              <p className="text-xs text-gray-500 mb-1">{fmtDate(ride.date, ride.time)}</p>
              <p className="text-xs text-gray-400 mb-3">📍 {ride.route}</p>

              {ride.note && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 mb-3">{ride.note}</p>
              )}

              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    {seats} of {ride.totalSeats} seat{ride.totalSeats !== 1 ? 's' : ''} free
                  </p>
                  <div className="flex gap-1">
                    {dots.map((i) => (
                      <div key={i}
                        className={`w-3 h-3 rounded-sm ${i < (ride.takenSeats ?? 0) ? 'bg-gray-200' : 'bg-brand'}`}
                      />
                    ))}
                  </div>
                </div>
                {seats === 0 && <span className="text-xs text-red-500 font-medium">Full</span>}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                <Avatar name={ride.posterName} email={ride.posterEmail} size={20} />
                <span className="text-xs text-gray-500 flex-1 truncate">{ride.posterName}</span>

                {!isMine && (
                  <>
                    <button onClick={() => onMessage(ride)}
                      className="text-xs px-2 py-1 rounded-lg bg-brand-light text-brand-dark hover:bg-green-100 transition-colors flex items-center gap-1">
                      💬 Message
                    </button>
                    <button
                      onClick={() => handleRequest(ride)}
                      disabled={alreadyReq || seats === 0 || requesting[ride.id]}
                      className={`text-xs px-2 py-1 rounded-lg border transition-colors disabled:cursor-not-allowed ${
                        alreadyReq
                          ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}>
                      {requesting[ride.id] ? '…' : alreadyReq ? '✓ Requested' : 'Request seat'}
                    </button>
                  </>
                )}
                {isMine && <span className="text-xs text-brand">Your ride</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Avatar({ name, email, size = 24 }) {
  const initials = (name || email || '?').slice(0, 2).toUpperCase()
  const colors   = ['#E1F5EE', '#EEEDFE', '#FAEEDA', '#FBEAF0', '#E6F1FB']
  const idx      = (email || '').charCodeAt(0) % colors.length
  return (
    <div style={{ width: size, height: size, background: colors[idx], fontSize: size * 0.4 }}
      className="rounded-full flex items-center justify-center font-medium text-gray-700 flex-shrink-0">
      {initials}
    </div>
  )
}
