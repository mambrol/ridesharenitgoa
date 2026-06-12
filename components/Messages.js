'use client'
import { useState, useEffect, useRef } from 'react'
import {
  convoId, ensureConversation,
  sendMessage, subscribeMessages, subscribeConversations,
} from '../lib/firebase'
import { format } from 'date-fns'

export default function Messages({ user, initialRide, onConvoOpen }) {
  const [convos, setConvos]         = useState([])
  const [activeId, setActiveId]     = useState(null)
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [sending, setSending]       = useState(false)
  const bottomRef                   = useRef(null)

  // Subscribe to all conversations for this user
  useEffect(() => {
    const unsub = subscribeConversations(user.email, setConvos)
    return unsub
  }, [user.email])

  // Open conversation from Browse tab click
  useEffect(() => {
    if (initialRide) openConvo(initialRide)
  }, [initialRide])

  // Subscribe to messages in active conversation
  useEffect(() => {
    if (!activeId) return
    const unsub = subscribeMessages(activeId, setMessages)
    return unsub
  }, [activeId])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function openConvo(ride) {
    const cid = convoId(user.email, ride.posterEmail)
    await ensureConversation(cid, user.email, ride.posterEmail, `${ride.from} → ${ride.to}`)
    setActiveId(cid)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || !activeId) return
    setSending(true)
    setInput('')
    try {
      await sendMessage(activeId, user.email, text)
    } finally {
      setSending(false)
    }
  }

  const activeConvo = convos.find(c => c.id === activeId)
  const otherEmail  = activeConvo?.participants?.find(p => p !== user.email)

  function fmtTime(ts) {
    if (!ts) return ''
    try {
      return format(ts.toDate ? ts.toDate() : new Date(ts), 'h:mm a')
    } catch { return '' }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-5">
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden flex" style={{ minHeight: 520 }}>

        {/* Sidebar */}
        <div className="w-56 border-r border-gray-100 flex-shrink-0 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">Messages</span>
            <span className="text-xs text-gray-400">{convos.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convos.length === 0 && (
              <p className="text-xs text-gray-400 text-center p-4 mt-4 leading-relaxed">
                No messages yet.<br />Message a driver from Browse.
              </p>
            )}
            {convos.map((c) => {
              const other = c.participants?.find(p => p !== user.email) ?? ''
              const unread = c.unreadCount?.[user.email] ?? 0
              return (
                <button
                  key={c.id}
                  onClick={() => { setActiveId(c.id); setMessages([]) }}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    activeId === c.id ? 'bg-brand-light' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-medium text-gray-900 truncate flex-1">
                      {other.split('@')[0]}
                    </span>
                    {unread > 0 && (
                      <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{c.rideRoute}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{c.lastMessage || 'No messages yet'}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Chat pane */}
        {activeConvo ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center text-xs font-medium text-brand-dark">
                {(otherEmail || '?').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{otherEmail?.split('@')[0]}</p>
                <p className="text-xs text-gray-400 truncate">{activeConvo.rideRoute}</p>
              </div>
              <span className="ml-auto text-xs text-gray-400 hidden sm:block">{otherEmail}</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2" style={{ minHeight: 360 }}>
              {messages.length === 0 && (
                <p className="text-xs text-gray-400 text-center mt-8">Say hello! 👋</p>
              )}
              {messages.map((m) => {
                const isMe = m.from === user.email
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`px-3 py-2 rounded-2xl text-sm max-w-xs leading-relaxed ${
                      isMe
                        ? 'bg-brand text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                    }`}>
                      {m.text}
                    </div>
                    <span className="text-xs text-gray-400 mt-0.5 px-1">{fmtTime(m.createdAt)}</span>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-100 flex gap-2 items-center">
              <input
                className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-brand transition-colors"
                placeholder="Type a message…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col gap-2 text-gray-400">
            <span className="text-4xl">💬</span>
            <p className="text-sm">Select a conversation</p>
            <p className="text-xs">or message a driver from Browse</p>
          </div>
        )}
      </div>
    </div>
  )
}
