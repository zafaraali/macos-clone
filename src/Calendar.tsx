import { useContext, useEffect, useRef, useState } from 'react'
import { AppCommandContext } from './AppCommands'

type CalendarEvent = { id: string; title: string; date: string; time: string; calendar: 'Work' | 'Personal' }
const key = 'golden-gate.events.v1'
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(new Date(`${value}T12:00:00`)) === value
function load(): CalendarEvent[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (Array.isArray(data) && data.every(e => e && typeof e.id === 'string' && typeof e.title === 'string' && validDate(e.date) && typeof e.time === 'string' && (e.time === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(e.time)) && ['Work', 'Personal'].includes(e.calendar))) return data
  } catch { /* Keep the calendar available without storage. */ }
  return []
}
export default function Calendar() {
  const today = dateKey(new Date())
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selected, setSelected] = useState(today)
  const [events, setEvents] = useState(load)
  const [draft, setDraft] = useState<CalendarEvent | null>(null)
  const [saveError, setSaveError] = useState(false)
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(events)); setSaveError(false) } catch { setSaveError(true) }
  }, [events])
  const label = month.toLocaleDateString([], { month: 'long', year: 'numeric' })
  const offset = month.getDay()
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = Math.ceil((offset + count) / 7) * 7
  const dayEvents = events.filter(e => e.date === selected).sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title))
  const changeMonth = (delta: number) => setMonth(current => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  const add = () => { setDraft({ id: crypto.randomUUID(), title: '', date: selected, time: '', calendar: 'Work' }); setDeleting(false) }
  const command = useContext(AppCommandContext)
  const handled = useRef(0)
  useEffect(() => {
    if (command.app === 'Calendar' && command.action === 'new' && handled.current !== command.revision) { handled.current = command.revision; add(); command.consume() }
  }, [command])
  return <div className="calendar-content live-calendar"><aside className="calendar-sidebar"><h2>Calendar</h2><button className="calendar-add" onClick={add}>＋ New Event</button><h3>{new Date(`${selected}T12:00:00`).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</h3><div className="calendar-agenda">{dayEvents.map(event => <button key={event.id} className={`agenda-event ${event.calendar.toLowerCase()}`} onClick={() => { setDraft({ ...event }); setDeleting(false) }}><b>{event.title}</b><small>{event.time || 'All day'} · {event.calendar}</small></button>)}{!dayEvents.length && <p className="muted">No events. Enjoy the space.</p>}</div><span className="calendar-color">● Work</span><span className="calendar-color purple">● Personal</span><p className="calendar-save-status" role="status">{saveError ? 'Unable to save events in this browser.' : 'Events saved in this browser.'}</p></aside>
    <div className="month"><div className="month-head"><h1>{label}</h1><div><button className="calendar-today" onClick={() => { setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); setSelected(today) }}>Today</button><button aria-label="Previous month" onClick={() => changeMonth(-1)}>‹</button><button aria-label="Next month" onClick={() => changeMonth(1)}>›</button></div></div><div className="weekdays">{weekdays.map(day => <b key={day}>{day}</b>)}</div><div className="month-grid" style={{ gridTemplateRows: `repeat(${cells / 7},minmax(0,1fr))` }}>{Array.from({ length: cells }, (_, i) => {
      const day = i - offset + 1
      if (day < 1 || day > count) return <div className="calendar-blank" key={i} />
      const date = dateKey(new Date(month.getFullYear(), month.getMonth(), day))
      const scheduled = events.filter(e => e.date === date)
      return <button key={date} aria-label={new Date(`${date}T12:00:00`).toLocaleDateString([], { dateStyle: 'full' })} aria-pressed={selected === date} aria-current={date === today ? 'date' : undefined} className={`day ${date === today ? 'today' : ''} ${date === selected ? 'selected-day' : ''}`} onClick={() => setSelected(date)} onDoubleClick={() => { setSelected(date); setDraft({ id: crypto.randomUUID(), title: '', date, time: '', calendar: 'Work' }); setDeleting(false) }}><span>{day}</span>{scheduled.slice(0, 2).map(event => <small className={event.calendar === 'Personal' ? 'purple-text' : ''} key={event.id}>{event.title}</small>)}{scheduled.length > 2 && <em>+{scheduled.length - 2} more</em>}</button>
    })}</div></div>
    {draft && <div className="event-overlay" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setDraft(null) } }}><form className="event-form" aria-label={events.some(e => e.id === draft.id) ? 'Edit event' : 'New event'} onSubmit={e => {
      e.preventDefault()
      if (!draft.title.trim() || !validDate(draft.date)) return
      setEvents(current => [...current.filter(event => event.id !== draft.id), { ...draft, title: draft.title.trim() }])
      setSelected(draft.date); const date = new Date(`${draft.date}T12:00:00`); setMonth(new Date(date.getFullYear(), date.getMonth(), 1)); setDraft(null)
    }}><h2>{events.some(e => e.id === draft.id) ? 'Edit event' : 'New event'}</h2><label>Title<input autoFocus required maxLength={120} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label><div className="event-form-dates"><label>Date<input type="date" required min="1900-01-01" max="9999-12-31" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></label><label>Time (optional)<input type="time" value={draft.time} onChange={e => setDraft({ ...draft, time: e.target.value })} /></label></div><label>Calendar<select value={draft.calendar} onChange={e => setDraft({ ...draft, calendar: e.target.value as CalendarEvent['calendar'] })}><option>Work</option><option>Personal</option></select></label>
    {deleting && <div className="event-delete-confirm" role="alert">Delete this event?<button type="button" onClick={() => { setEvents(current => current.filter(e => e.id !== draft.id)); setDraft(null) }}>Confirm delete</button><button type="button" onClick={() => setDeleting(false)}>Keep event</button></div>}
    <footer>{events.some(e => e.id === draft.id) && <button type="button" className="event-delete" onClick={() => setDeleting(true)}>Delete event</button>}<button type="button" onClick={() => setDraft(null)}>Cancel</button><button className="event-save" type="submit" disabled={!draft.title.trim() || !validDate(draft.date)}>Save event</button></footer></form></div>}
  </div>
}
