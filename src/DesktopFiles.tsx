import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { NativeIcon } from './Icons'
import { fileName, homePath, parentPath, useFileSystem } from './FileSystem'
import { useTextEdit } from './TextEdit'
import './desktop-files.css'
import QuickLook from './QuickLook'

type Cell = { col: number; row: number }
const storageKey = 'golden-gate.desktop-icons.v1'
const cellWidth = 100, cellHeight = 102
function load(): Record<string, Cell> {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? '{}')
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) return Object.fromEntries(Object.entries(saved).filter(([, cell]) => {
      const c = cell as Cell
      return c && Number.isInteger(c.col) && c.col >= 0 && Number.isInteger(c.row) && c.row >= 0
    })) as Record<string, Cell>
  } catch { /* Default positions work without local storage. */ }
  return {}
}
export default function DesktopFiles({ onFolder, onTextEdit }: { onFolder: (path: string) => void; onTextEdit: () => void }) {
  const fs = useFileSystem(), editor = useTextEdit()
  const [positions, setPositions] = useState(load)
  const [size, setSize] = useState({ width: Math.max(100, innerWidth - 24), height: Math.max(102, innerHeight - 152) })
  const [selected, setSelected] = useState('')
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null)
  const [target, setTarget] = useState('')
  const section = useRef<HTMLElement>(null)
  const gesture = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const items = [
    { id: 'disk-shortcut', name: 'Macintosh HD', icon: 'disk', path: homePath, shortcut: true, folder: true },
    { id: 'shared-shortcut', name: 'Shared', icon: 'shared', path: `${homePath}/Shared`, shortcut: true, folder: true },
    ...fs.entries.filter(f => !f.trashed && parentPath(f.path) === `${homePath}/Desktop`).map(f => ({ id: f.id, name: fileName(f.path), icon: f.kind === 'folder' ? 'folder' : 'document', path: f.path, shortcut: false, folder: f.kind === 'folder' })),
  ]
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    if (section.current) observer.observe(section.current)
    return () => observer.disconnect()
  }, [])
  const [saveError, setSaveError] = useState(false)
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(positions)); setSaveError(false) } catch { setSaveError(true) } }, [positions])
  const cols = Math.max(1, Math.floor(size.width / cellWidth)), rows = Math.max(1, Math.floor(size.height / cellHeight))
  const occupied = new Set<string>()
  const layout: Record<string, Cell> = {}
  const free = (candidate?: Cell): Cell => {
    if (candidate && candidate.col < cols && candidate.row < rows && !occupied.has(`${candidate.col}:${candidate.row}`)) return candidate
    for (let col = 0; col < cols; col++) for (let row = 0; row < rows; row++) if (!occupied.has(`${col}:${row}`)) return { col, row }
    return { col: 0, row: occupied.size }
  }
  // Reserve saved locations first so new files don't displace existing icons.
  for (const item of items) if (positions[item.id]) {
    const cell = free(positions[item.id]); layout[item.id] = cell; occupied.add(`${cell.col}:${cell.row}`)
  }
  for (const item of items) if (!layout[item.id]) { const cell = free(); layout[item.id] = cell; occupied.add(`${cell.col}:${cell.row}`) }
  const open = (id: string) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    if (item.folder) onFolder(item.path)
    else { editor.select(id); onTextEdit() }
  }
  const dropTarget = (x: number, y: number, id: string) => {
    const element = document.elementFromPoint(x, y)
    if (element?.closest('.dock-app[aria-label="Trash"]')) return 'trash'
    const folder = element?.closest<HTMLElement>('[data-desktop-folder]')
    return folder && folder.dataset.desktopId !== id ? folder.dataset.desktopFolder ?? '' : ''
  }
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const g = gesture.current
    if (!g || g.id !== event.currentTarget.dataset.desktopId) return
    if (!g.moved && Math.hypot(event.clientX - g.x, event.clientY - g.y) < 5) return
    g.moved = true
    const bounds = section.current!.getBoundingClientRect()
    setDrag({ id: g.id, x: event.clientX - bounds.left - 46, y: event.clientY - bounds.top - 35 })
    setTarget(dropTarget(event.clientX, event.clientY, g.id))
  }
  const finish = (event: PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const g = gesture.current
    if (!g) return
    gesture.current = null; setDrag(null); setTarget('')
    if (!g.moved || cancelled) return
    suppressClick.current = true
    const item = items.find(i => i.id === g.id)
    const destination = dropTarget(event.clientX, event.clientY, g.id)
    try {
      if (!item?.shortcut && destination) {
        if (destination === 'trash') fs.trash(g.id)
        else fs.move(g.id, destination)
      } else {
        const bounds = section.current!.getBoundingClientRect()
        const candidate = { col: Math.max(0, Math.min(cols - 1, Math.floor((bounds.right - event.clientX) / cellWidth))), row: Math.max(0, Math.min(rows - 1, Math.floor((event.clientY - bounds.top) / cellHeight))) }
        const next = { ...layout }
        const other = items.find(i => i.id !== g.id && layout[i.id].col === candidate.col && layout[i.id].row === candidate.row)
        if (other) next[other.id] = layout[g.id]
        next[g.id] = candidate; setPositions(current => ({ ...current, ...next }))
      }
      setError('')
    } catch (error) { setError((error as Error).message) }
  }
  return <>
    <section ref={section} className="desktop-icons desktop-files" aria-label="Desktop files" onClick={event => { if (event.target === event.currentTarget) setSelected('') }}>
      {items.map(item => {
        const cell = layout[item.id]
        return <button key={item.id} data-desktop-id={item.id} data-desktop-folder={item.folder ? item.path : undefined} className={`desktop-icon ${selected === item.id ? 'desktop-file-selected' : ''} ${target === item.path ? 'desktop-folder-target' : ''}`} aria-label={item.name} aria-pressed={selected === item.id} style={{ right: cell.col * cellWidth, top: cell.row * cellHeight }} onClick={() => setSelected(item.id)} onDoubleClick={() => { if (suppressClick.current) { suppressClick.current = false; return } open(item.id) }} onKeyDown={event => {
          if (event.key === ' ' && !item.shortcut) { event.preventDefault(); setSelected(item.id); setPreview(item.id) }
          if (event.key === 'Enter') { event.preventDefault(); open(item.id) }
          if ((event.key === 'Delete' || event.key === 'Backspace') && !item.shortcut) { event.preventDefault(); try { fs.trash(item.id) } catch (error) { setError((error as Error).message) } }
        }} onPointerDown={event => { if (event.button !== 0) return; suppressClick.current = false; setSelected(item.id); gesture.current = { id: item.id, x: event.clientX, y: event.clientY, moved: false }; event.currentTarget.setPointerCapture(event.pointerId) }} onPointerMove={move} onPointerUp={event => finish(event)} onPointerCancel={event => finish(event, true)} onLostPointerCapture={() => { gesture.current = null; setDrag(null); setTarget('') }}><NativeIcon name={item.icon} /><small>{item.name}</small></button>
      })}
      {drag && <div className="desktop-drag-ghost" style={{ left: drag.x, top: drag.y }}><NativeIcon name={items.find(i => i.id === drag.id)?.icon ?? 'document'} /><small>{items.find(i => i.id === drag.id)?.name}</small></div>}
    </section>
    {preview && <QuickLook id={preview} onClose={() => setPreview('')} onOpen={() => { const id = preview; setPreview(''); open(id) }} />}
    {(error || saveError) && <div className="desktop-file-message" role="alert">{error || 'Icon positions could not be saved in this browser.'}<button aria-label="Dismiss desktop message" onClick={() => { setError(''); setSaveError(false) }}>×</button></div>}
  </>
}
