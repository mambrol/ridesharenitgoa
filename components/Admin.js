'use client'
import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import {
  collection, onSnapshot, query, orderBy,
  deleteDoc, doc, setDoc, getDocs, serverTimestamp
} from 'firebase/firestore'

export const ADMIN_EMAILS = [
  'nijin@nitgoa.ac.in', // ← replace with your actual admin email
]

export function isAdmin(email) {
  return ADMIN_EMAILS.includes(email)
}

export default function Admin({ user }) {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [rides, setRides]         = useState([])
  const [users, setUsers]         = useState([])
  const [locations, setLocations] = useState([])
  const [requests, setRequests]   = useState({})
  const [newLoc, setNewLoc]       = useState('')
  const [editLocId, setEditLocId] = useState(null)
  const [editLocVal, setEditLocVal] = useState('')
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState({})

  // Subscribe to all rides
  useEffect(() => {
    const q = query(collection(db, 'rides'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => {
      const r = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setRides(r)
      // Load requests for each ride
      r.forEach(ride => {
        const rq = query(collection(db, 'rides', ride.id, 'requests'))
        onSnapshot(rq, rSnap => {
          setRequests(prev => ({
            ...prev,
            [ride.id]: rSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          }))
        })
      })
    })
  }, [])

  // Subscribe to locations
  useEffect(() => {
    const q = query(collection(db, 'locations'), orderBy('createdAt', 'asc'))
    return onSnapshot(q, snap =>
      setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  // Subscribe to users
  useEffect(() => {
    return onSnapshot(collection(db, 'users'), snap =>
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalRides    = rides.length
  const activeRides   = rides.filter(r => (r.totalSeats - (r.takenSeats ?? 0)) > 0).length
  const totalRequests = Object.values(requests).flat().length
  const acceptedReqs  = Object.values(requests).flat().filter(r => r.status === 'accepted').length
  const uniqueUsers   = [...new Set(rides.map(r => r.posterEmail))].length

  // Route frequency
  const routeMap = {}
  rides.forEach(r => {
    const key = `${r.from} → ${r.to}`
    routeMap[key] = (routeMap[key] || 0) + 1
  })
  const topRoutes = Object.entries(routeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  // Vehicle breakdown
  const carCount  = rides.filter(r => r.vehicle === 'car').length
  const bikeCount = rides.filter(r => r.vehicle === 'bike').length

  // Active posters
  const posterMap = {}
  rides.forEach(r => {
    posterMap[r.posterEmail] = (posterMap[r.posterEmail] || 0) + 1
  })
  const topPosters = Object.entries(posterMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // ── Location helpers ───────────────────────────────────────────────────────
  async function handleAddLoc() {
    if (!newLoc.trim()) return
    setSaving(true)
    await setDoc(doc(collection(db, 'locations')), {
      name: newLoc.trim(), createdAt: serverTimestamp()
    })
    setNewLoc('')
    setSaving(false)
  }

  async function handleEditLoc(id) {
    if (!editLocVal.trim()) return
    await setDoc(doc(db, 'locations', id), { name: editLocVal.trim(), createdAt: serverTimestamp() })
    setEditLocId(null)
    setEditLocVal('')
  }

  async function handleDeleteLoc(id) {
    if (!confirm('Delete this location?')) return
    await deleteDoc(doc(db, 'locations', id))
  }

  // ── Ride helpers ───────────────────────────────────────────────────────────
  async function handleDeleteRide(id) {
    if (!confirm('Delete this ride and all its requests?')) return
    setDeleting(p => ({ ...p, [id]: true }))
    // Delete requests first
    const rqs = await getDocs(collection(db, 'rides', id, 'requests'))
    for (const r of rqs.docs) await deleteDoc(r.ref)
    await deleteDoc(doc(db, 'rides', id))
    setDeleting(p => ({ ...p, [id]: false }))
  }

  function fmtDate(d, t) {
    try {
      const dt = new Date(`${d}T${t}`)
      return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' · ' +
             dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    } catch { return `${d} ${t}` }
  }

  const sections = [
    { id: 'dashboard', label: 'Dashboard',  icon: '📊' },
    { id: 'rides',     label: 'All Rides',  icon: '🚗' },
    { id: 'locations', label: 'Locations',  icon: '📍' },
    { id: 'users',     label: 'Users',      icon: '👥' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin topbar */}
      <div className="bg-gray-900 text-white px-5 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <span className="text-lg">🛡️</span>
          <span className="font-medium text-sm">NIT Goa RideShare — Admin</span>
        </div>
        <span className="text-xs text-gray-400">{user.email}</span>
      </div>

      <div className="flex max-w-5xl mx-auto">
        {/* Sidebar */}
        <div className="w-44 flex-shrink-0 pt-5 px-3 hidden sm:block">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors text-left ${
                activeSection === s.id
                  ? 'bg-brand text-white font-medium'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900'
              }`}
            >
              <span>{s.icon}</span>{s.label}
            </button>
          ))}
        </div>

        {/* Mobile section tabs */}
        <div className="sm:hidden flex overflow-x-auto px-4 py-3 gap-2 w-full">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap flex-shrink-0 ${
                activeSection === s.id
                  ? 'bg-brand text-white'
                  : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 min-w-0">

          {/* ── Dashboard ── */}
          {activeSection === 'dashboard' && (
            <div>
              <h2 className="text-base font-medium text-gray-900 mb-4">Dashboard</h2>

              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { n: totalRides,    l: 'Total rides',    c: 'bg-brand-light text-brand-dark',   e: '🚗' },
                  { n: activeRides,   l: 'Active rides',   c: 'bg-green-50 text-green-800',       e: '✅' },
                  { n: uniqueUsers,   l: 'Active users',   c: 'bg-purple-50 text-purple-800',     e: '👥' },
                  { n: acceptedReqs,  l: 'Seats filled',   c: 'bg-amber-50 text-amber-800',       e: '🪑' },
                ].map(s => (
                  <div key={s.l} className={`rounded-xl p-4 ${s.c}`}>
                    <p className="text-2xl mb-1">{s.e}</p>
                    <p className="text-2xl font-semibold">{s.n}</p>
                    <p className="text-xs mt-0.5 opacity-80">{s.l}</p>
                  </div>
                ))}
              </div>

              {/* Vehicle breakdown */}
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div className="card">
                  <h3 className="text-xs font-medium text-gray-500 mb-3">Vehicle breakdown</h3>
                  <div className="flex gap-4">
                    <div className="flex-1 bg-brand-light rounded-lg p-3 text-center">
                      <p className="text-2xl mb-1">🚗</p>
                      <p className="text-xl font-semibold text-brand-dark">{carCount}</p>
                      <p className="text-xs text-brand-dark opacity-80">Cars</p>
                    </div>
                    <div className="flex-1 bg-purple-50 rounded-lg p-3 text-center">
                      <p className="text-2xl mb-1">🏍</p>
                      <p className="text-xl font-semibold text-purple-800">{bikeCount}</p>
                      <p className="text-xs text-purple-800 opacity-80">Bikes</p>
                    </div>
                  </div>
                  {totalRides > 0 && (
                    <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full"
                        style={{ width: `${(carCount / totalRides) * 100}%` }}
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1 text-center">
                    {totalRides > 0 ? Math.round((carCount / totalRides) * 100) : 0}% cars
                  </p>
                </div>

                {/* Request stats */}
                <div className="card">
                  <h3 className="text-xs font-medium text-gray-500 mb-3">Seat requests</h3>
                  {[
                    { l: 'Total requests', n: totalRequests, c: 'bg-gray-100' },
                    { l: 'Accepted',       n: acceptedReqs,  c: 'bg-green-50' },
                    { l: 'Pending',        n: Object.values(requests).flat().filter(r => r.status === 'pending').length,  c: 'bg-amber-50' },
                    { l: 'Rejected',       n: Object.values(requests).flat().filter(r => r.status === 'rejected').length, c: 'bg-red-50' },
                  ].map(s => (
                    <div key={s.l} className={`flex items-center justify-between px-3 py-2 rounded-lg mb-1.5 ${s.c}`}>
                      <span className="text-xs text-gray-700">{s.l}</span>
                      <span className="text-sm font-semibold text-gray-900">{s.n}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top routes */}
              <div className="card mb-4">
                <h3 className="text-xs font-medium text-gray-500 mb-3">Most popular routes</h3>
                {topRoutes.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No rides yet</p>
                )}
                {topRoutes.map(([route, count], i) => (
                  <div key={route} className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{route}</p>
                      <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full"
                          style={{ width: `${(count / (topRoutes[0]?.[1] || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-600 flex-shrink-0">
                      {count} ride{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>

              {/* Top posters */}
              <div className="card">
                <h3 className="text-xs font-medium text-gray-500 mb-3">Most active users</h3>
                {topPosters.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No users yet</p>
                )}
                {topPosters.map(([email, count]) => (
                  <div key={email} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-7 h-7 rounded-full bg-brand-light flex items-center justify-center text-xs font-medium text-brand-dark flex-shrink-0">
                      {email.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm text-gray-700 truncate">{email}</span>
                    <span className="text-xs font-medium text-gray-500">{count} ride{count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── All Rides ── */}
          {activeSection === 'rides' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-medium text-gray-900">All Rides ({rides.length})</h2>
              </div>
              {rides.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm card">
                  <p className="text-3xl mb-2">🚗</p>No rides yet
                </div>
              )}
              <div className="flex flex-col gap-3">
                {rides.map(ride => {
                  const reqs = requests[ride.id] || []
                  const free = ride.totalSeats - (ride.takenSeats ?? 0)
                  return (
                    <div key={ride.id} className="card">
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {ride.from} → {ride.to}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {fmtDate(ride.date, ride.time)} · {ride.route}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            free > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                          }`}>
                            {free > 0 ? `${free} free` : 'Full'}
                          </span>
                          <button
                            onClick={() => handleDeleteRide(ride.id)}
                            disabled={deleting[ride.id]}
                            className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 px-2 py-0.5 rounded transition-colors"
                          >
                            {deleting[ride.id] ? '…' : 'Delete'}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>👤 {ride.posterEmail}</span>
                        <span>🪑 {reqs.length} request{reqs.length !== 1 ? 's' : ''}</span>
                        <span className={ride.vehicle === 'car' ? 'badge-car' : 'badge-bike'}>
                          {ride.vehicle}
                        </span>
                        <span className={ride.payment === 'free' ? 'badge-free' : 'badge-paid'}>
                          {ride.payment === 'paid' ? ride.payNote || 'Paid' : 'Free'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Locations ── */}
          {activeSection === 'locations' && (
            <div>
              <h2 className="text-base font-medium text-gray-900 mb-4">
                Manage Locations ({locations.length})
              </h2>

              {/* Add */}
              <div className="card mb-4">
                <p className="text-xs text-gray-500 font-medium mb-3">Add new location</p>
                <div className="flex gap-2">
                  <input
                    className="inp flex-1"
                    placeholder="e.g. Dona Paula"
                    value={newLoc}
                    onChange={e => setNewLoc(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddLoc()}
                  />
                  <button
                    onClick={handleAddLoc}
                    disabled={saving || !newLoc.trim()}
                    className="btn-primary flex-shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="card">
                <div className="flex flex-col gap-1">
                  {locations.map((loc, i) => (
                    <div key={loc.id}
                      className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                      <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                      {editLocId === loc.id ? (
                        <>
                          <input
                            className="inp flex-1 py-1.5 text-sm"
                            value={editLocVal}
                            onChange={e => setEditLocVal(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleEditLoc(loc.id)}
                            autoFocus
                          />
                          <button
                            onClick={() => handleEditLoc(loc.id)}
                            className="text-xs px-2 py-1 bg-brand text-white rounded-lg"
                          >Save</button>
                          <button
                            onClick={() => setEditLocId(null)}
                            className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-500"
                          >Cancel</button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-gray-800">{loc.name}</span>
                          <button
                            onClick={() => { setEditLocId(loc.id); setEditLocVal(loc.name) }}
                            className="text-xs text-brand hover:underline"
                          >Edit</button>
                          <button
                            onClick={() => handleDeleteLoc(loc.id)}
                            className="text-xs text-red-400 hover:text-red-600"
                          >Delete</button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Users ── */}
          {activeSection === 'users' && (
            <div>
              <h2 className="text-base font-medium text-gray-900 mb-4">
                Active Users ({uniqueUsers})
              </h2>
              <div className="card">
                {[...new Set(rides.map(r => r.posterEmail))].length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-8">No users yet</p>
                )}
                {[...new Set(rides.map(r => r.posterEmail))].map(email => {
                  const userRides    = rides.filter(r => r.posterEmail === email)
                  const userRequests = Object.entries(requests)
                    .filter(([rideId]) => rides.find(r => r.id === rideId)?.posterEmail === email)
                    .flatMap(([, reqs]) => reqs)
                  return (
                    <div key={email} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                      <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center text-sm font-medium text-brand-dark flex-shrink-0">
                        {email.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{email}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {userRides.length} ride{userRides.length !== 1 ? 's' : ''} posted
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-500">
                          {userRequests.filter(r => r.status === 'accepted').length} accepted
                        </p>
                        <p className="text-xs text-gray-400">
                          {userRequests.length} total req.
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
