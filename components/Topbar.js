'use client'
import { logOut } from '../lib/firebase'

export default function Topbar({ user, tab, setTab, unreadMessages, pendingRequests, alertCount }) {
  const tabs = [
    { id: 'browse', label: 'Browse', icon: SearchIcon },
    { id: 'post',   label: 'Post ride', icon: PlusIcon },
    { id: 'messages', label: 'Messages', icon: ChatIcon, badge: unreadMessages },
    { id: 'alerts', label: 'Alerts', icon: BellIcon, badge: alertCount },
    { id: 'my',     label: 'My rides', icon: UserIcon, badge: pendingRequests },
  ]

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-14">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center">
            <CarIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium text-sm text-gray-900">NIT Goa RideShare</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden sm:block">{user.email}</span>
          <button
            onClick={logOut}
            className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto px-4 scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors relative flex-shrink-0
              ${tab === t.id
                ? 'border-brand text-brand font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.badge > 0 && (
              <span className="absolute top-1.5 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

const CarIcon  = ({className}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10m0 0h10m0 0h2l2-4.5V9H13"/></svg>
const SearchIcon=({className})=><svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>
const PlusIcon =({className})=><svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
const ChatIcon =({className})=><svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10z"/></svg>
const BellIcon =({className})=><svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14V11a6 6 0 00-9.33-5M9 17H4l1.4-1.4A2 2 0 006 14v-3a6 6 0 0112 0v3a2 2 0 00.59 1.42M9 17v1a3 3 0 006 0v-1M9 17h6"/></svg>
const UserIcon =({className})=><svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
