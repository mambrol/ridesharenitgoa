'use client'
import { useState, useEffect } from 'react'
import { subscribeRequests, updateRequestStatus, deleteRide, convoId, ensureConversation, notifyRequesterOfDecision } from '../lib/firebase'
import { format } from 'date-fns'

export default function MyRides({ rides, user, onMessage }) {
  const myRides = rides.filter(r => r.posterEmail === user.email)

  function fmtDate(d, t) {
    try { return format(new Date(`${d}T${t}`), 'EEE d MMM · h:mm a') }
    catch { return `${d} ${t}` }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-24 sm:pb-5">
      <h2 className="text-sm font-medium text-gray-900 mb-3">Rides I posted</h2>

      {myRides.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm card mb-6">
          <p className="text-3xl mb-2">🚗</p>
          You haven't posted any rides yet.
        </div>
      )}

      {myRides.map((ride) => (
        <RideWithRequests key={ride.id} ride={ride} user={user} fmtDate={fmtDate} onMessage={onMessage} />
      ))}

      <h2 className="text-sm font-medium text-gray-900 mb-3 mt-6">Rides I've requested</h2>
      <RequestedRides rides={rides} user={user} fmtDate={fmtDate} onMessage={onMessage} />
    </div>
  )
}

function RideWithRequests({ ride, user, fmtDate, onMessage }) {
  const [requests, setRequests] = useState([])
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const unsub = subscribeRequests(ride.id, setRequests)
    return unsub
  }, [ride.id])

  async function handleStatus(reqId, status) {
    const req = requests.find(r => r.id === reqId)
    await updateRequestStatus(ride.id, reqId, status)
    if (req) {
      notifyRequesterOfDecision(req.requesterEmail, ride, status).catch(console.error)
    }
  }
  async function handleDelete() {
    if (!confirm('Delete this ride?')) return
    setDeleting(true)
    await deleteRide(ride.id)
  }

  function handleMessageRequester(req) {
    onMessage({
      from: ride.from,
      to: ride.to,
      posterEmail: req.requesterEmail,
      posterName: req.requesterName,
    })
  }

  const free = ride.totalSeats - (ride.takenSeats ?? 0)
  const isExpired = (() => {
    try { return new Date(`${ride.date}T${ride.time}`) < new Date() }
    catch { return false }
  })()

  return (
    <div className={`card mb-3 ${isExpired ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">{ride.from} → {ride.to}</p>
            {isExpired && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Expired</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{fmtDate(ride.date, ride.time)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${free > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {free > 0 ? `${free} free` : 'Full'}
          </span>
          <button onClick={handleDelete} disabled={deleting}
            className="text-xs text-red-400 hover:text-red-600 transition-colors">
            {deleting ? '…' : 'Delete'}
          </button>
        </div>
      </div>

      {requests.length === 0 && (
        <p className="text-xs text-gray-400 pt-2 border-t border-gray-50">No seat requests yet.</p>
      )}

      {requests.length > 0 && (
        <div className="border-t border-gray-50 pt-2 mt-1">
          <p className="text-xs text-gray-500 mb-2">Seat requests ({requests.length})</p>
          <div className="flex flex-col gap-2">
            {requests.map((req) => (
              <div key={req.id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-brand-light flex items-center justify-center text-xs font-medium text-brand-dark flex-shrink-0">
                  {req.requesterEmail?.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{req.requesterName}</p>
                  <p className="text-xs text-gray-400 truncate">{req.requesterEmail}</p>
                </div>
                <button
                  onClick={() => handleMessageRequester(req)}
                  className="text-xs px-2 py-1 rounded-lg bg-brand-light text-brand-dark hover:bg-green-100 transition-colors flex-shrink-0"
                >
                  💬
                </button>
                {req.status === 'pending' ? (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button className="btn-success" onClick={() => handleStatus(req.id, 'accepted')}>✓ Accept</button>
                    <button className="btn-danger"  onClick={() => handleStatus(req.id, 'rejected')}>✕ Reject</button>
                  </div>
                ) : (
                  <span className={`status-${req.status} flex-shrink-0`}>{req.status}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RequestedRides({ rides, user, fmtDate, onMessage }) {
  const [allRequests, setAllRequests] = useState({})

  useEffect(() => {
    const unsubs = rides
      .filter(r => r.posterEmail !== user.email)
      .map(r => subscribeRequests(r.id, (reqs) => {
        const mine = reqs.find(rq => rq.requesterEmail === user.email)
        if (mine) {
          setAllRequests(prev => ({ ...prev, [r.id]: { req: mine, ride: r } }))
        }
      }))
    return () => unsubs.forEach(u => u())
  }, [rides, user.email])

  const myBookings = Object.values(allRequests)

  if (myBookings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm card">
        <p className="text-3xl mb-2">🪑</p>
        You haven't requested any rides yet.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {myBookings.map(({ req, ride }) => {
        const isExpired = (() => {
          try { return new Date(`${ride.date}T${ride.time}`) < new Date() }
          catch { return false }
        })()
        return (
          <div key={ride.id} className={`card ${isExpired ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{ride.from} → {ride.to}</p>
                  {isExpired && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Expired</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{fmtDate(ride.date, ride.time)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Driver: {ride.posterName}</p>
              </div>
              <span className={`status-${req.status}`}>{req.status}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => onMessage(ride)}
                className="text-xs px-2 py-1 rounded-lg bg-brand-light text-brand-dark hover:bg-green-100 transition-colors"
              >
                💬 Message driver
              </button>
            </div>
            {req.status === 'accepted' && (
              <div className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2 mt-2">
                <span className="text-sm">✉️</span>
                <p className="text-xs text-green-800">Driver email: <strong>{ride.posterEmail}</strong></p>
              </div>
            )}
            {req.status === 'rejected' && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mt-2">Your request was rejected.</p>
            )}
            {req.status === 'pending' && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-2">Waiting for driver confirmation…</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
