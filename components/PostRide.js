'use client'
import { useState, useEffect } from 'react'
import { postRide, triggerEmailAlerts } from '../lib/firebase'
import { db } from '../lib/firebase'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'

const DEFAULT_LOCS = [
  'NIT Goa Campus','Panjim Bus Stand','Margao Railway Station',
  'Vasco da Gama','Calangute','Panaji','Old Goa','Mapusa',
  'Dabolim Airport','Colva Beach','Madgaon','Porvorim','Verna',
]
const ROUTES = [
  'Via NH-66','Via NH-366','Via Old Goa','Via Dabolim',
  'Via NH-66 North','Via Cortalim Bridge','Via Ponda',
]
const EMPTY = {
  vehicle:'car',from:'',to:'',route:'',
  time:'',date:'',seats:2,payment:'free',payNote:'',note:'',
}

export default function PostRide({ user, onSuccess }) {
  const [form, setForm]       = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [locations, setLocations] = useState(DEFAULT_LOCS)

  useEffect(() => {
    const q = query(collection(db, 'locations'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) setLocations(snap.docs.map(d => d.data().name))
    })
    return unsub
  }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

 async function handleSubmit() {
    if (!form.from || !form.to || !form.time || !form.date) {
      setError('Please fill in From, To, Time and Date.')
      return
    }
    if (form.from === form.to) {
      setError('From and To cannot be the same.')
      return
    }
    setError('')
    setLoading(true)

    const rideData = {
      posterName:  user.displayName || user.email,
      posterEmail: user.email,
      vehicle:     form.vehicle,
      from:        form.from,
      to:          form.to,
      route:       form.route || 'Route TBD',
      time:        form.time,
      date:        form.date,
      totalSeats:  Number(form.seats),
      takenSeats:  0,
      payment:     form.payment,
      payNote:     form.payNote,
      note:        form.note,
    }

    try {
      await postRide(rideData)
      setForm(EMPTY)
      onSuccess()
    } catch (e) {
      console.error('Post ride error:', e)
      setError('Failed to post ride. Please try again.')
      setLoading(false)
      return
    }

    setLoading(false)

    // Send email alerts in the background — never blocks or fails the post
    triggerEmailAlerts(rideData).catch((e) => {
      console.error('Email alert error (non-blocking):', e)
    })
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-5 pb-24 sm:pb-5">
      <h2 className="text-base font-medium text-gray-900 mb-5">Post a new ride</h2>

      <Field label="Vehicle type">
        <div className="flex gap-2">
          {['car','bike'].map(v => (
            <button key={v} onClick={() => set('vehicle', v)}
              className={`flex-1 py-2.5 rounded-lg text-sm border transition-colors ${
                form.vehicle === v
                  ? 'border-brand bg-brand-light text-brand-dark font-medium'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {v === 'car' ? '🚗 Car' : '🏍 Bike'}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="From">
          <select className="inp" value={form.from} onChange={e => set('from', e.target.value)}>
            <option value="">Select pickup</option>
            {locations.map(l => <option key={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="To">
          <select className="inp" value={form.to} onChange={e => set('to', e.target.value)}>
            <option value="">Select destination</option>
            {locations.map(l => <option key={l}>{l}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Route">
        <select className="inp" value={form.route} onChange={e => set('route', e.target.value)}>
          <option value="">Select route</option>
          {ROUTES.map(r => <option key={r}>{r}</option>)}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Time">
          <input type="time" className="inp" value={form.time} onChange={e => set('time', e.target.value)} />
        </Field>
        <Field label="Date">
          <input type="date" className="inp" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
      </div>

      <Field label="Available seats (excluding yourself)">
        <input type="number" min="1" max="6" className="inp w-20"
          value={form.seats} onChange={e => set('seats', e.target.value)} />
      </Field>

      <Field label="Payment">
        <div className="flex gap-2">
          {['free','paid'].map(p => (
            <button key={p} onClick={() => set('payment', p)}
              className={`flex-1 py-2.5 rounded-lg text-sm border transition-colors ${
                form.payment === p
                  ? 'border-brand bg-brand-light text-brand-dark font-medium'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {p === 'free' ? '❤️ Free' : '💰 Fuel share'}
            </button>
          ))}
        </div>
      </Field>

      {form.payment === 'paid' && (
        <Field label="Amount">
          <input className="inp" placeholder="e.g. ₹50 per person"
            value={form.payNote} onChange={e => set('payNote', e.target.value)} />
        </Field>
      )}

      <Field label="Note (optional)">
        <input className="inp" placeholder="Extra info for co-riders"
          value={form.note} onChange={e => set('note', e.target.value)} />
      </Field>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg p-3 mb-4">{error}</p>
      )}

      <div className="flex gap-3">
        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Publishing…' : '✓ Publish ride'}
        </button>
       <button className="btn-ghost" onClick={() => setForm(EMPTY)}>Reset</button>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-xs text-gray-500 font-medium mb-1.5">{label}</label>
      {children}
    </div>
  )
}
