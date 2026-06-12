'use client'
import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import {
  collection, addDoc, deleteDoc, updateDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore'

const DEFAULT_LOCS = [
  'NIT Goa Campus','Panjim Bus Stand','Margao Railway Station',
  'Vasco da Gama','Calangute','Panaji','Old Goa','Mapusa',
  'Dabolim Airport','Colva Beach','Madgaon','Porvorim','Verna',
]

export function useLocations() {
  const [locations, setLocations] = useState(DEFAULT_LOCS)

  useEffect(() => {
    const q = query(collection(db, 'locations'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setLocations(snap.docs.map(d => d.data().name))
      }
    })
    return unsub
  }, [])

  return locations
}

export default function Locations({ user }) {
  const [locations, setLocations] = useState([])
  const [locDocs, setLocDocs]     = useState([])
  const [newLoc, setNewLoc]       = useState('')
  const [editId, setEditId]       = useState(null)
  const [editVal, setEditVal]     = useState('')
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'locations'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        // seed defaults
        DEFAULT_LOCS.forEach(name =>
          addDoc(collection(db, 'locations'), { name, createdAt: serverTimestamp() })
        )
      } else {
        setLocDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLocations(snap.docs.map(d => d.data().name))
      }
    })
    return unsub
  }, [])

  async function handleAdd() {
    if (!newLoc.trim()) return
    setSaving(true)
    await addDoc(collection(db, 'locations'), {
      name: newLoc.trim(),
      createdAt: serverTimestamp()
    })
    setNewLoc('')
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this location?')) return
    await deleteDoc(doc(db, 'locations', id))
  }

  async function handleEdit(id) {
    if (!editVal.trim()) return
    await updateDoc(doc(db, 'locations', id), { name: editVal.trim() })
    setEditId(null)
    setEditVal('')
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-5 pb-24 sm:pb-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center">
          <PinIcon className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-base font-medium text-gray-900">Manage Locations</h2>
      </div>

      {/* Add new */}
      <div className="card mb-5">
        <p className="text-xs text-gray-500 font-medium mb-3">Add new location</p>
        <div className="flex gap-2">
          <input
            className="inp flex-1"
            placeholder="e.g. Dona Paula"
            value={newLoc}
            onChange={e => setNewLoc(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={saving || !newLoc.trim()}
            className="btn-primary flex-shrink-0"
          >
            Add
          </button>
        </div>
      </div>

      {/* Location list */}
      <div className="card">
        <p className="text-xs text-gray-500 font-medium mb-3">
          All locations ({locDocs.length})
        </p>
        <div className="flex flex-col gap-2">
          {locDocs.map((loc) => (
            <div key={loc.id} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
              {editId === loc.id ? (
                <>
                  <input
                    className="inp flex-1 py-1.5 text-sm"
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEdit(loc.id)}
                    autoFocus
                  />
                  <button
                    onClick={() => handleEdit(loc.id)}
                    className="text-xs px-2 py-1 bg-brand text-white rounded-lg"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-500"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm text-gray-800 flex-1">{loc.name}</span>
                  <button
                    onClick={() => { setEditId(loc.id); setEditVal(loc.name) }}
                    className="text-xs text-brand hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(loc.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const PinIcon = ({className}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
