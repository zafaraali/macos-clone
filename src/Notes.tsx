import { useContext, useEffect, useRef, useState } from 'react'
import { AppCommandContext } from './AppCommands'

type Note = { id: string; title: string; body: string; updated: number }
const key = 'golden-gate.notes.v1'
function load(): Note[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (Array.isArray(data) && data.every(n => n && typeof n.id === 'string' && typeof n.title === 'string' && typeof n.body === 'string' && typeof n.updated === 'number')) return data
  } catch { /* Keep editing available without storage. */ }
  return [{ id: 'welcome', title: 'Welcome', body: 'A little more you.\n\nCreate a note, collect your ideas, and pick up where you left off. Your notes are saved in this browser.', updated: Date.now() }]
}
export default function Notes() {
  const [notes, setNotes] = useState(load)
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const title = useRef<HTMLInputElement>(null)
  const note = notes.find(n => n.id === selected) ?? notes[0]
  const visible = notes.filter(n => `${n.title} ${n.body}`.toLowerCase().includes(query.toLowerCase()))
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(notes)); setError(false) } catch { setError(true) }
  }, [notes])
  const edit = (patch: Partial<Pick<Note, 'title' | 'body'>>) => {
    if (note) setNotes(current => current.map(n => n.id === note.id ? { ...n, ...patch, updated: Date.now() } : n))
  }
  const create = () => {
    const next = { id: crypto.randomUUID(), title: '', body: '', updated: Date.now() }
    setNotes(current => [next, ...current]); setSelected(next.id); setQuery(''); setDeleting(false)
    requestAnimationFrame(() => title.current?.focus())
  }
  const command = useContext(AppCommandContext)
  const handled = useRef(0)
  useEffect(() => {
    if (command.app !== 'Notes' || handled.current === command.revision) return
    handled.current = command.revision
    if (command.action === 'new') create()
    if (command.action === 'search') (document.querySelector('[aria-label="Search notes"]') as HTMLInputElement | null)?.focus()
    command.consume()
  }, [command])
  return <div className="notes-content editable-notes"><aside className="notes-sidebar">
    <button className="new-note" onClick={create}>＋ New Note</button>
    <input className="notes-search" aria-label="Search notes" placeholder="Search notes" value={query} onChange={e => setQuery(e.target.value)} />
    <div className="note-list">{visible.map(n => <button key={n.id} className={n.id === note?.id ? 'note-selected' : ''} onClick={() => { setSelected(n.id); setDeleting(false) }}><b>{n.title.trim() || 'Untitled note'}</b><small>{n.body.trim().slice(0, 65) || 'No additional text'}</small></button>)}</div>
    {!visible.length && <p className="muted">{notes.length ? 'No matching notes' : 'No notes yet'}</p>}<small className="muted">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</small>
  </aside>{note ? <article className="note-editor">
    <div className="note-editor-toolbar"><span role="status">{error ? 'Unable to save in this browser' : 'Saved in this browser'}</span><button aria-label="Delete note" onClick={() => setDeleting(true)}>Delete</button></div>
    {deleting && <div className="note-delete-confirm" role="alert">Delete “{note.title.trim() || 'Untitled note'}”?<button onClick={() => { setNotes(current => current.filter(n => n.id !== note.id)); setSelected(null); setDeleting(false) }}>Delete note</button><button onClick={() => setDeleting(false)}>Cancel</button></div>}
    <input ref={title} className="note-title-input" aria-label="Note title" placeholder="Untitled note" value={note.title} onChange={e => edit({ title: e.target.value })} />
    <textarea aria-label="Note body" placeholder="Start writing…" value={note.body} onChange={e => edit({ body: e.target.value })} /><small className="muted">Edited {new Date(note.updated).toLocaleString()}</small>
  </article> : <div className="notes-empty"><h2>Your next idea starts here.</h2><button onClick={create}>Create a note</button></div>}</div>
}
