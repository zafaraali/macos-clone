import { useContext, useEffect, useRef, useState } from 'react'
import { AppCommandContext } from './AppCommands'
import { NativeIcon, Symbol } from './Icons'

type Entry = { name: string; folder?: string; text?: string; image?: string; app?: string; tag?: string }
const folders: Record<string, Entry[]> = {
  'Macintosh HD': [{ name: 'Applications', folder: 'Applications' }, { name: 'Desktop', folder: 'Desktop' }, { name: 'Documents', folder: 'Documents' }, { name: 'Downloads', folder: 'Downloads' }, { name: 'Golden Gate', folder: 'Golden Gate' }, { name: 'Read Me.md', text: 'Welcome to Golden Gate\n\nDouble-click folders to explore and documents to preview. Back and Forward retrace your steps. Select an item and press Enter to open it.\n\nThese are sample files for your desktop.' }],
  Applications: ['Finder', 'Safari', 'Notes', 'Calendar', 'Terminal', 'System Settings'].map(app => ({ name: app, app })),
  Desktop: [{ name: 'Golden Gate', folder: 'Golden Gate' }],
  Documents: [{ name: 'Projects', folder: 'Projects' }, { name: 'Ideas.txt', tag: 'Green', text: 'Ideas\n\n• Make something useful.\n• Take a walk by the water.\n• Write down one good idea every day.' }],
  Projects: [{ name: 'Desktop roadmap.md', tag: 'Red', text: 'Golden Gate desktop\n\nCompleted\n• Window controls\n• Spotlight\n• Notes\n• Finder navigation\n\nUp next\n• Calendar events\n• Personalization' }],
  Downloads: [{ name: 'Getting started.txt', tag: 'Orange', text: 'Getting started\n\nLaunch apps from the Dock. Search apps with Spotlight. Notes saves your writing in this browser automatically.' }],
  'Golden Gate': [{ name: 'Golden Gate.jpg', image: '/wallpapers/golden-gate.jpg' }, { name: 'About.txt', text: 'Golden Gate Bridge\n\nSan Francisco, California\n\nA little inspiration for your desktop.' }],
  'iCloud Drive': [], Shared: [], AirDrop: [], Network: [],
}
const favorites = [['airdrop', 'AirDrop'], ['recents', 'Recents'], ['folder', 'Applications'], ['desktop', 'Desktop'], ['documents', 'Documents'], ['downloads', 'Downloads']]
const allFiles = Object.values(folders).flat().filter(item => !item.folder && !item.app)

export default function Finder({ onLaunch, request }: { onLaunch: (app: string) => void; request: { location: string; revision: number } }) {
  const [navigation, setNavigation] = useState({ history: ['Macintosh HD'], index: 0 })
  const location = navigation.history[navigation.index]
  const [selected, setSelected] = useState('')
  const [query, setQuery] = useState('')
  const [grid, setGrid] = useState(true)
  const [preview, setPreview] = useState<Entry | null>(null)
  const previewClose = useRef<HTMLButtonElement>(null)
  const previewTrigger = useRef<HTMLElement | null>(null)
  const command = useContext(AppCommandContext)
  useEffect(() => {
    if (command.app === 'Finder' && command.action === 'search') { (document.querySelector('[aria-label="Search files"]') as HTMLInputElement | null)?.focus(); command.consume() }
  }, [command])
  useEffect(() => {
    if (!preview) return
    previewClose.current?.focus()
    return () => previewTrigger.current?.focus()
  }, [preview])
  const reset = () => { setSelected(''); setQuery(''); setPreview(null) }
  const navigate = (next: string) => {
    if (next === location) return
    setNavigation(current => ({ history: [...current.history.slice(0, current.index + 1), next], index: current.index + 1 })); reset()
  }
  useEffect(() => { navigate(request.location) }, [request])
  const go = (direction: number) => {
    setNavigation(current => ({ ...current, index: Math.max(0, Math.min(current.history.length - 1, current.index + direction)) })); reset()
  }
  const entries = location === 'Recents' ? allFiles : ['Red', 'Orange', 'Green'].includes(location) ? allFiles.filter(item => item.tag === location) : folders[location] ?? []
  const visible = entries.filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
  const open = (item: Entry) => {
    if (item.folder) navigate(item.folder)
    else if (item.app) onLaunch(item.app)
    else { previewTrigger.current = document.activeElement as HTMLElement; setPreview(item) }
  }
  const sidebar = (icon: string, label: string) => <button className={location === label ? 'chosen' : ''} key={label} onClick={() => navigate(label)}><NativeIcon name={icon} />{label}</button>
  return <div className="native-finder">
    <aside className="native-sidebar"><p>Favorites</p>{favorites.map(([icon, label]) => sidebar(icon, label))}<p>iCloud</p>{sidebar('cloud', 'iCloud Drive')}{sidebar('shared', 'Shared')}<p>Locations</p>{sidebar('disk', 'Macintosh HD')}{sidebar('network', 'Network')}<p>Tags</p>{['Red', 'Orange', 'Green'].map(tag => <button key={tag} className={location === tag ? 'chosen' : ''} onClick={() => navigate(tag)}><i className={`tag ${tag.toLowerCase()}`} />{tag}</button>)}</aside>
    <div className="native-files">
      <div className="native-toolbar"><button aria-label="Back" disabled={navigation.index === 0} onClick={() => go(-1)}>‹</button><button aria-label="Forward" disabled={navigation.index === navigation.history.length - 1} onClick={() => go(1)}>›</button><strong>{location}</strong><div className="toolbar-spacer" /><button aria-label="Icon view" className={grid ? 'pressed' : ''} onClick={() => setGrid(true)}><Symbol name="grid" /></button><button aria-label="List view" className={!grid ? 'pressed' : ''} onClick={() => setGrid(false)}><Symbol name="list" /></button><button className="finder-preview-button" disabled={!selected} onClick={() => { const item = visible.find(item => item.name === selected); if (item) open(item) }}>Open</button></div>
      <label className="finder-search"><Symbol name="search" size={13} /><input aria-label="Search files" placeholder="Search this folder" value={query} onChange={event => { setQuery(event.target.value); setSelected('') }} /></label>
      <div className={grid ? 'native-file-grid' : 'native-file-list'}>
        {visible.map(item => <button key={item.name} className={selected === item.name ? 'file-selected' : ''} onClick={() => setSelected(item.name)} onDoubleClick={() => open(item)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(item) } }}><NativeIcon name={item.folder ? 'folder' : item.app ?? 'document'} /><span>{item.name}</span>{!grid && <><small>{item.folder ? 'Folder' : item.app ? 'Application' : item.image ? 'Image' : 'Document'}</small><small>{item.text ? `${new TextEncoder().encode(item.text).length} B` : '—'}</small></>}</button>)}
        {!visible.length && <p className="empty-search">{query ? 'No matching items' : location === 'AirDrop' ? 'No nearby devices' : 'This folder is empty'}</p>}
      </div>
      <footer><span><NativeIcon name="disk" /><button onClick={() => navigate('Macintosh HD')}>Macintosh HD</button>{location !== 'Macintosh HD' && <>　›　{location}</>}</span><div>{visible.length} {visible.length === 1 ? 'item' : 'items'}{selected && ' · 1 selected'} · Sample files</div></footer>
    </div>
    {preview && <div className="file-preview-overlay" onClick={event => { if (event.target === event.currentTarget) setPreview(null) }}><section className="file-preview" role="dialog" aria-modal="true" aria-label={`Preview ${preview.name}`} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setPreview(null) } if (event.key === 'Tab') { event.preventDefault(); previewClose.current?.focus() } }}><header><strong>{preview.name}</strong><button ref={previewClose} aria-label="Close preview" onClick={() => setPreview(null)}>×</button></header>{preview.image ? <img src={preview.image} alt="Golden Gate Bridge over San Francisco Bay" /> : <pre>{preview.text}</pre>}</section></div>}
  </div>
}
