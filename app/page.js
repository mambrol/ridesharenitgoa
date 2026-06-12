'use client'
import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from '../components/AuthProvider'
import SignIn     from '../components/SignIn'
import Topbar     from '../components/Topbar'
import Browse     from '../components/Browse'
import PostRide   from '../components/PostRide'
import Messages   from '../components/Messages'
import Alerts     from '../components/Alerts'
import MyRides    from '../components/MyRides'
import Locations  from '../components/Locations'
import { subscribeRides, subscribeAlerts } from '../lib/firebase'

export default function RootPage() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  )
}

function App() {
  const user = useAuth()
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading…</p>
        </div>
      </div>
    )
  }
  if (!user) return <SignIn />
  return <Dashboard user={user} />
}

function Dashboard({ user }) {
  const [tab, setTab]                 = useState('browse')
  const [rides, setRides]             = useState([])
  const [alerts, setAlerts]           = useState([])
  const [notifications, setNotifs]    = useState([])
  const [messageRide, setMessageRide] = useState(null)

  useEffect(() => {
    const unsub = subscribeRides((newRides) => {
      setRides(prev => {
        const prevIds = new Set(prev.map(r => r.id))
        newRides.forEach(r => {
          if (!prevIds.has(r.id) && r.posterEmail !== user.email) {
            checkAlertMatch(r)
          }
        })
        return newRides
      })
    })
    return unsub
  }, [user.email])

  useEffect(() => {
    const unsub = subscribeAlerts(user.email, setAlerts)
    return unsub
  }, [user.email])

  function checkAlertMatch(ride) {
    setAlerts(currentAlerts => {
      currentAlerts.forEach(a => {
        const fm = !a.from || ride.from.toLowerCase().includes(a.from.toLowerCase())
        const tm = !a.to   || ride.to.toLowerCase().includes(a.to.toLowerCase())
        if (fm && tm) {
          setNotifs(prev => [...prev, {
            id:  Date.now() + Math.random(),
            msg: `New ride: ${ride.from} → ${ride.to} by ${ride.posterName} at ${ride.time}`,
          }])
        }
      })
      return currentAlerts
    })
  }

  function dismissNotif(id) {
    setNotifs(p => p.filter(n => n.id !== id))
  }

  function handleMessage(ride) {
    setMessageRide(ride)
    setTab('messages')
  }

  const pendingRequests = rides
    .filter(r => r.posterEmail === user.email)
    .reduce((s, r) => s + (r.pendingCount ?? 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification banners */}
      {notifications.length > 0 && (
        <div className="fixed top-12 sm:top-0 left-0 right-0 z-50 flex flex-col gap-1 p-3 pointer-events-none">
          {notifications.map(n => (
            <div key={n.id}
              className="flex items-center gap-3 bg-brand-light border border-green-300 rounded-xl px-4 py-3 shadow-sm max-w-xl mx-auto w-full pointer-events-auto">
              <span className="text-brand text-base">🔔</span>
              <p className="flex-1 text-sm text-brand-dark">{n.msg}</p>
              <button onClick={() => dismissNotif(n.id)} className="text-brand-dark opacity-60 hover:opacity-100 text-sm">✕</button>
            </div>
          ))}
        </div>
      )}

      <Topbar
        user={user}
        tab={tab}
        setTab={setTab}
        unreadMessages={0}
        pendingRequests={pendingRequests}
        alertCount={notifications.length}
      />

      {/* Main content — extra bottom padding on mobile for bottom nav */}
      <main className="pb-20 sm:pb-0">
        {tab === 'browse'    && <Browse     rides={rides} user={user} onMessage={handleMessage} />}
        {tab === 'post'      && <PostRide   user={user} onSuccess={() => setTab('browse')} />}
        {tab === 'messages'  && <Messages   user={user} initialRide={messageRide} />}
        {tab === 'alerts'    && <Alerts     user={user} notifications={notifications} onDismiss={dismissNotif} />}
        {tab === 'my'        && <MyRides    rides={rides} user={user} />}
        {tab === 'locations' && <Locations  user={user} />}
      </main>
    </div>
  )
}
