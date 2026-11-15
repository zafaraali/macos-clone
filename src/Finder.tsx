import { useContext, useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { AppCommandContext } from './AppCommands'
import { NativeIcon, Symbol } from './Icons'
import { fileName, homePath, parentPath, useFileSystem } from './FileSystem'
import { useTextEdit } from './TextEdit'
import QuickLook from './QuickLook'

const locations: Record<string, string> = { 'Macintosh HD': homePath, Desktop: `${homePath}/Desktop`, Documents: `${homePath}/Documents`, Downloads: `${homePath}/Downloads`, 'Golden Gate': `${homePath}/Desktop/Golden Gate`, Shared: `${homePath}/Shared` }
const apps = ['Finder', 'Safari', 'Notes', 'Calendar', 'TextEdit', 'Terminal', 'System Settings']
const dragType = 'application/x-golden-gate-file'
export default function Finder({ onLaunch, request }: { onLaunch: (app: string) => void; request: { location: string; revision: number } }) {
  const fs = useFileSystem(), editor = useTextEdit()
  const [navigation, setNavigation] = useState({ history: [homePath], index: 0 })
  const location = navigation.history[navigation.index]
  const [selected, setSelected] = useState('')
  const [query, setQuery] = useState('')
  const [grid, setGrid] = useState(true)
  const [sort, setSort] = useState('name')
  const [descending, setDescending] = useState(false)
  const [error, setError] = useState('')
  const [action, setAction] = useState<'file' | 'folder' | 'rename' | 'move' | null>(null)
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [preview, setPreview] = useState('')
  const [dropTarget, setDropTarget] = useState('')
  const previousEntries = useRef(fs.entries)
  const command = useContext(AppCommandContext)
  const reset = () => { setSelected(''); setQuery(''); setError(''); setAction(null); setPreview('') }
  const navigate = (next: string) => { setNavigation(current => ({ history: [...current.history.slice(0, current.index + 1), next], index: current.index + 1 })); reset() }
  useEffect(() => { navigate(locations[request.location] ?? request.location) }, [request])
  // Keep navigation valid when a folder is renamed or moved from another app.
  useEffect(() => {
    const previous = previousEntries.current; previousEntries.current = fs.entries
    setNavigation(current => ({ ...current, history: current.history.map(path => {
      const old = previous.find(f => f.path === path && f.kind === 'folder' && !f.trashed)
      if (!old) return path
      const updated = fs.entries.find(f => f.id === old.id && !f.trashed)
      return updated?.path ?? homePath
    }) }))
  }, [fs.entries])
  useEffect(() => {
    if (command.app === 'Finder' && command.action === 'search') { document.querySelector<HTMLInputElement>('[aria-label="Search files"]')?.focus(); command.consume() }
  }, [command])
  const files = fs.entries.filter(f => !f.trashed && (location === 'Recents' ? f.kind === 'file' : parentPath(f.path) === location && f.path !== location))
  const entries = location === 'Applications' ? apps.map(app => ({ id: app, name: app, app, kind: 'app', text: '', path: '' })) : files.map(f => ({ ...f, name: fileName(f.path), app: '' }))
  const type = (item: typeof entries[number]) => item.kind === 'file' ? fileName(item.path).split('.').slice(1).pop()?.toLowerCase() || 'text' : item.kind
  const compareName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  const visible = entries.filter(f => f.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => (sort === 'type' ? compareName(type(a), type(b)) || compareName(a.name, b.name) : compareName(a.name, b.name)) * (descending ? -1 : 1))
  const selectedEntry = entries.find(f => f.id === selected)
  const writable = fs.entries.some(f => f.path === location && f.kind === 'folder' && !f.trashed)
  const editable = Boolean(selectedEntry && !selectedEntry.app)
  const destinations = fs.entries.filter(f => !f.trashed && f.kind === 'folder' && f.path.startsWith(homePath) && f.path !== selectedEntry?.path && !(selectedEntry?.kind === 'folder' && f.path.startsWith(selectedEntry.path + '/')) && f.path !== parentPath(selectedEntry?.path ?? '/')).sort((a,b) => compareName(a.path,b.path))
  const attempt = (fn: () => void) => { try { fn(); setError('') } catch (error) { setError((error as Error).message) } }
  const open = (id: string) => {
    const entry = entries.find(f => f.id === id)
    if (!entry) return
    if (entry.app) onLaunch(entry.app)
    else if (entry.kind === 'folder') navigate(entry.path)
    else { editor.select(id); onLaunch('TextEdit') }
  }
  const startRename = () => { if (!editable) return; setAction('rename'); setName(selectedEntry!.name); setError('') }
  const drop = (event: DragEvent, path: string) => {
    if (!event.dataTransfer.types.includes(dragType)) return
    event.preventDefault(); event.stopPropagation(); setDropTarget('')
    attempt(() => { fs.move(event.dataTransfer.getData(dragType), path); setSelected(''); setAction(null) })
  }
  const dragOver = (event: DragEvent, path: string) => {
    if (!event.dataTransfer.types.includes(dragType)) return
    event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; setDropTarget(path)
  }
  const sidebar = (icon: string, label: string) => {
    const path = locations[label] ?? label
    return <button key={label} className={`${location === path ? 'chosen' : ''} ${dropTarget === path ? 'finder-drop-target' : ''}`} onClick={() => navigate(path)} onDragOver={event => { if (locations[label]) dragOver(event, path) }} onDragLeave={() => setDropTarget('')} onDrop={event => { if (locations[label]) drop(event, path) }}><NativeIcon name={icon} />{label}</button>
  }
  return <div className="native-finder">
    <aside className="native-sidebar"><p>Favorites</p>{[['recents', 'Recents'], ['folder', 'Applications'], ['desktop', 'Desktop'], ['documents', 'Documents'], ['downloads', 'Downloads'], ['shared', 'Shared'], ['disk', 'Macintosh HD']].map(([icon,label]) => sidebar(icon,label))}<p>Locations</p><button onClick={() => onLaunch('Trash')}><NativeIcon name="trash" />Trash</button></aside>
    <div className="native-files">
      <div className="native-toolbar"><button aria-label="Back" disabled={navigation.index === 0} onClick={() => { setNavigation(n => ({ ...n, index: n.index - 1 })); reset() }}>‹</button><button aria-label="Forward" disabled={navigation.index === navigation.history.length - 1} onClick={() => { setNavigation(n => ({ ...n, index: n.index + 1 })); reset() }}>›</button><strong>{location === homePath ? 'Macintosh HD' : fileName(location)}</strong><div className="toolbar-spacer" /><button aria-label="Icon view" aria-pressed={grid} onClick={() => setGrid(true)}><Symbol name="grid" /></button><button aria-label="List view" aria-pressed={!grid} onClick={() => setGrid(false)}><Symbol name="list" /></button><button disabled={!selectedEntry} onClick={() => open(selected)}>Open</button></div>
      <div className="filesystem-actions finder-file-actions"><button disabled={!writable} onClick={() => { setAction('file'); setName('Untitled.txt') }}>New File</button><button disabled={!writable} onClick={() => { setAction('folder'); setName('New Folder') }}>New Folder</button><button disabled={!editable} onClick={startRename}>Rename</button><button disabled={!editable} onClick={() => { setAction('move'); setDestination(destinations[0]?.path ?? ''); setError('') }}>Move…</button><button disabled={!editable} onClick={() => setPreview(selected)}>Quick Look</button><button disabled={!editable} onClick={() => attempt(() => { fs.trash(selected); reset() })}>Move to Trash</button>
        <label className="finder-sort">Sort<select aria-label="Sort files" value={sort} onChange={e => setSort(e.target.value)}><option value="name">Name</option><option value="type">Type</option></select></label><button aria-label={descending ? 'Sort ascending' : 'Sort descending'} onClick={() => setDescending(v => !v)}>{descending ? '↓' : '↑'}</button>
      </div>
      {action && <form className="filesystem-actions" onSubmit={e => { e.preventDefault(); attempt(() => {
        if (action === 'move') { if (!destination) throw new Error('Choose a destination folder.'); fs.move(selected,destination); setSelected('') }
        else if (action === 'rename') fs.rename(selected,name)
        else { if (!name.trim() || /[\/\0]/.test(name) || name === '.' || name === '..') throw new Error('Choose a valid name without slashes.'); setSelected(fs.create(`${location}/${name}`,action)) }
        setAction(null)
      }) }} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setAction(null) } }}>
        {action === 'move' ? <select autoFocus className="finder-move-select" aria-label="Destination folder" value={destination} onChange={e => setDestination(e.target.value)}>{!destinations.length && <option value="">No destination available</option>}{destinations.map(folder => <option key={folder.id} value={folder.path}>{folder.path === homePath ? 'Macintosh HD' : folder.path.slice(homePath.length + 1)}</option>)}</select> : <input key={`${action}-${selected}`} autoFocus className="finder-rename-input" aria-label={action === 'rename' ? 'Rename item' : 'New item name'} value={name} onFocus={e => e.target.select()} onChange={e => setName(e.target.value)} />}
        <button type="submit">{action === 'move' ? 'Move' : action === 'rename' ? 'Save Name' : 'Create'}</button><button type="button" onClick={() => setAction(null)}>Cancel</button>
      </form>}
      {error && <p className="filesystem-error" role="alert">{error}</p>}
      <label className="finder-search"><Symbol name="search" size={13} /><input aria-label="Search files" placeholder="Search this folder" value={query} onChange={e => { setQuery(e.target.value); setSelected(''); setAction(null) }} /></label>
      <div className={`${grid ? 'native-file-grid' : 'native-file-list'} ${dropTarget === location ? 'finder-drop-target' : ''}`} onDragOver={e => { if (writable) dragOver(e,location) }} onDragLeave={() => setDropTarget('')} onDrop={e => { if (writable) drop(e,location) }}>
        {visible.map(item => <button key={item.id} aria-label={item.name} draggable={!item.app} onDragStart={e => { e.dataTransfer.setData(dragType,item.id); e.dataTransfer.effectAllowed = 'move'; setSelected(item.id); setAction(null) }} onDragEnd={() => setDropTarget('')} onDragOver={e => { if (item.kind === 'folder') dragOver(e,item.path) }} onDragLeave={() => setDropTarget('')} onDrop={e => { if (item.kind === 'folder') drop(e,item.path) }} className={`${selected === item.id ? 'file-selected' : ''} ${dropTarget === item.path ? 'finder-drop-target' : ''}`} onClick={() => { setSelected(item.id); setAction(null) }} onDoubleClick={() => open(item.id)} onKeyDown={event => {
          if (event.key === 'Enter') { event.preventDefault(); open(item.id) }
          if (event.key === ' ' && !item.app) { event.preventDefault(); setSelected(item.id); setPreview(item.id) }
          if (event.key === 'F2' && !item.app) { event.preventDefault(); setSelected(item.id); setAction('rename'); setName(item.name) }
        }}><NativeIcon name={item.kind === 'folder' ? 'folder' : item.app || 'document'} /><span>{item.name}</span>{!grid && <><small>{item.kind === 'folder' ? 'Folder' : item.app ? 'Application' : `${type(item).toUpperCase()} document`}</small><small>{item.kind === 'file' ? `${new TextEncoder().encode(item.text).length} B` : '—'}</small></>}</button>)}
        {!visible.length && <p className="empty-search">{query ? 'No matching items' : 'This folder is empty'}</p>}
      </div>
      <footer><span>{location}</span><div>{visible.length} items · {fs.status}</div></footer>
    </div>
    {preview && <QuickLook id={preview} onClose={() => setPreview('')} onOpen={() => { const id = preview; setPreview(''); open(id) }} />}
  </div>
}
