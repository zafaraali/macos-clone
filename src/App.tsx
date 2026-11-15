import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { NativeIcon, Symbol } from './Icons'
import Finder from './Finder'
import Notes from './Notes'
import Calendar from './Calendar'
import Terminal from './Terminal'
import Safari from './Safari'
import ControlCenter from './ControlCenter'
import { AppCommandContext } from './AppCommands'
import Settings, { PreferencesProvider, usePreferences, wallpapers, accents } from './Preferences'
import type { CSSProperties } from 'react'
import './macos.css'
import './personalization.css'
import './desktop-features.css'

type AppName = 'Finder' | 'Notes' | 'Safari' | 'Calendar' | 'System Settings' | 'Terminal' | 'Trash'
type WindowState = { open: boolean; minimized: boolean; maximized?: boolean; x: number; y: number; w: number; h: number }

const initialWindows: Record<AppName, WindowState> = {
  Finder: { open: true, minimized: false, x: 196, y: 103, w: 700, h: 430 },
  Notes: { open: false, minimized: false, x: 285, y: 130, w: 620, h: 425 },
  Safari: { open: false, minimized: false, x: 165, y: 100, w: 760, h: 450 },
  Calendar: { open: false, minimized: false, x: 340, y: 120, w: 600, h: 430 },
  'System Settings': { open: false, minimized: false, x: 245, y: 86, w: 720, h: 490 },
  Terminal: { open: false, minimized: false, x: 230, y: 130, w: 650, h: 410 },
  Trash: { open: false, minimized: false, x: 260, y: 140, w: 520, h: 340 },
}

const dockApps: AppName[] = ['Finder', 'Safari', 'Notes', 'Calendar', 'Terminal', 'System Settings']
const apps = Object.keys(initialWindows) as AppName[]
function loadSession() {
  const result = { windows: { ...initialWindows }, active: 'Finder' as AppName, order: [...apps] }
  try {
    const data = JSON.parse(localStorage.getItem('golden-gate.session.v1') ?? 'null')
    for (const app of apps) {
      const saved = data?.windows?.[app]
      if (saved && typeof saved.open === 'boolean' && typeof saved.minimized === 'boolean' && ['x','y','w','h'].every(key => Number.isFinite(saved[key]))) {
        const w = Math.max(Math.min(360, innerWidth), Math.min(innerWidth, saved.w))
        const h = Math.max(240, Math.min(Math.max(240, innerHeight - 118), saved.h))
        result.windows[app] = { open: saved.open, minimized: saved.minimized, maximized: saved.maximized === true, w, h, x: Math.max(0, Math.min(innerWidth - w, saved.x)), y: Math.max(0, Math.min(Math.max(0, innerHeight - h - 118), saved.y)) }
      }
    }
    if (apps.includes(data?.active)) result.active = data.active
    if (Array.isArray(data?.order)) result.order = [...apps.filter(app => !data.order.includes(app)), ...data.order.filter((app: AppName, index: number, all: AppName[]) => apps.includes(app) && all.indexOf(app) === index)]
  } catch { /* Invalid or unavailable storage uses the default layout. */ }
  return result
}

function Desktop() {
  const [session] = useState(loadSession)
  const [windows, setWindows] = useState(session.windows)
  const [active, setActive] = useState<AppName>(session.active)
  const { preferences, dark, update } = usePreferences()
  const [showControl, setShowControl] = useState(false)
  const [menu, setMenu] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())
  const [order, setOrder] = useState<AppName[]>(session.order)
  const [spotlight, setSpotlight] = useState(false)
  const [menuLeft, setMenuLeft] = useState(9)
  const [context, setContext] = useState<{ x: number; y: number } | null>(null)
  const [info, setInfo] = useState<{ title: string; body: string } | null>(null)
  const [brightness, setBrightness] = useState(100)
  const [dockReveal, setDockReveal] = useState(false)
  const [folderRequest, setFolderRequest] = useState({ location: 'Macintosh HD', revision: 0 })
  const [command, setCommand] = useState({ app: '', action: '', revision: 0 })
  const commandContext = useMemo(() => ({ ...command, consume: () => setCommand(current => ({ ...current, app: '', action: '' })) }), [command])
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    try { localStorage.setItem('golden-gate.session.v1', JSON.stringify({ windows, active, order })) } catch { /* Session restore is optional when storage is full. */ }
  }, [windows, active, order])
  useEffect(() => {
    if (!windows[active].open || windows[active].minimized) {
      const visible = [...order].reverse().find(app => windows[app].open && !windows[app].minimized)
      if (visible) setActive(visible)
    }
  }, [windows, active, order])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.code === 'Space') {
        event.preventDefault()
        setSpotlight(value => !value)
        setMenu(null)
        setShowControl(false)
      }
      if (event.key === 'Escape') { setSpotlight(false); setMenu(null); setShowControl(false); setContext(null); setInfo(null) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.altKey && event.code === 'KeyD') { event.preventDefault(); update({ dock: preferences.dock === 'show' ? 'auto' : 'show' }) }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [preferences.dock, update])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const clock = useMemo(() => now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), [now])
  const date = useMemo(() => now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }), [now])

  const launch = (app: AppName) => {
    setMenu(null); setContext(null); setShowControl(false)
    focus(app)
    setWindows((current) => ({ ...current, [app]: { ...current[app], open: true, minimized: false } }))
  }
  const close = (app: AppName) => setWindows((current) => ({ ...current, [app]: { ...current[app], open: false } }))
  const minimize = (app: AppName) => setWindows((current) => ({ ...current, [app]: { ...current[app], minimized: true } }))
  const focus = (app: AppName) => {
    setActive(app)
    setOrder(current => [...current.filter(name => name !== app), app])
  }
  const updateBounds = (app: AppName, bounds: Partial<WindowState>) =>
    setWindows(current => ({ ...current, [app]: { ...current[app], ...bounds } }))
  const openFolder = (location: string) => { setFolderRequest(current => ({ location, revision: current.revision + 1 })); launch('Finder') }
  const showDesktop = () => { setWindows(current => Object.fromEntries(apps.map(app => [app, { ...current[app], minimized: current[app].open }])) as Record<AppName, WindowState>); setMenu(null); setContext(null) }
  const restoreWindows = () => { setWindows(current => Object.fromEntries(apps.map(app => [app, { ...current[app], minimized: false }])) as Record<AppName, WindowState>); setMenu(null); setContext(null) }
  const runCommand = (app: AppName, action: string) => { setCommand(current => ({ app, action, revision: current.revision + 1 })); launch(app) }
  const settings = (page = 'Appearance') => runCommand('System Settings', page)
  const message = (title: string, body: string) => { setInfo({ title, body }); setMenu(null); setContext(null) }
  const resetLayout = () => { setWindows(current => Object.fromEntries(apps.map(app => [app, { ...initialWindows[app], open: current[app].open, minimized: false }])) as Record<AppName, WindowState>); setMenu(null); setContext(null) }
  const find = (app: 'Finder' | 'Notes') => runCommand(app, 'search')
  const menuOptions: Record<string, { label: string; action: () => void; disabled?: boolean }[]> = {
    apple: [{ label: 'About Golden Gate', action: () => settings('About') }, { label: 'System Settings…', action: () => settings() }, { label: 'Show Desktop', action: showDesktop }, { label: 'Restore Windows', action: restoreWindows }],
    app: [{ label: `About ${active}`, action: () => message(active, `${active} is part of your Golden Gate desktop. Your notes, events, preferences, and window layout are saved in this browser.`) }, { label: `Hide ${active}`, action: () => minimize(active), disabled: !windows[active].open || windows[active].minimized }, { label: `Quit ${active}`, action: () => close(active), disabled: !windows[active].open }],
    File: [{ label: 'Open Finder', action: () => openFolder('Macintosh HD') }, { label: 'New Note', action: () => runCommand('Notes', 'new') }, { label: 'New Event', action: () => runCommand('Calendar', 'new') }, { label: 'Close Window', action: () => close(active), disabled: !windows[active].open || windows[active].minimized }],
    Edit: [{ label: 'Search Files…', action: () => find('Finder') }, { label: 'Search Notes…', action: () => find('Notes') }, { label: 'Search Applications…', action: () => { setSpotlight(true); setMenu(null) } }],
    View: [{ label: dark ? 'Use Light Appearance' : 'Use Dark Appearance', action: () => update({ appearance: dark ? 'light' : 'dark' }) }, { label: preferences.dock === 'hidden' ? 'Show Dock' : 'Hide Dock', action: () => update({ dock: preferences.dock === 'hidden' ? 'show' : 'hidden' }) }, { label: preferences.dock === 'auto' ? 'Turn Off Dock Auto-hide' : 'Automatically Hide Dock', action: () => update({ dock: preferences.dock === 'auto' ? 'show' : 'auto' }) }, { label: 'Show Desktop', action: showDesktop }],
    Go: [...['Macintosh HD', 'Desktop', 'Documents', 'Downloads', 'Applications'].map(location => ({ label: location, action: () => openFolder(location) })), { label: 'Terminal', action: () => launch('Terminal') }, { label: 'Trash', action: () => launch('Trash') }],
    Window: [{ label: 'Minimize', action: () => minimize(active), disabled: !windows[active].open || windows[active].minimized }, { label: windows[active].maximized ? 'Restore Size' : 'Zoom', action: () => updateBounds(active, { maximized: !windows[active].maximized }), disabled: !windows[active].open || windows[active].minimized }, { label: 'Bring All to Front', action: restoreWindows }, { label: 'Reset Window Positions', action: resetLayout }, ...dockApps.map(app => ({ label: app, action: () => launch(app) }))],
    Help: [{ label: 'Desktop Guide', action: () => message('Desktop Guide', 'Launch apps from the Dock or Go menu. Drag title bars to move windows and drag their bottom-right corners to resize. The green button maximizes and restores. Double-click Finder items to open them. Notes and Calendar save locally. Terminal is a simulated shell: type help for commands.') }, { label: 'Keyboard Shortcuts', action: () => message('Keyboard Shortcuts', '⌘ Space / Ctrl Space: Spotlight\n⌘⌥D / Ctrl+Alt+D: toggle Dock auto-hide\nEscape: dismiss menus and panels\nSpotlight: ↑ ↓ to select, Enter to open\nFinder: Enter or Space to open a focused item\nTerminal: ↑ ↓ for command history') }],
  }
  const expanded = Boolean(menu || showControl || spotlight)
  const openMenu = (name: string, target: HTMLElement) => {
    setMenu(name); setMenuLeft(Math.max(4, Math.min(target.getBoundingClientRect().left, innerWidth - 244))); setShowControl(false); setSpotlight(false); setContext(null)
  }
  const toggleMenu = (name: string, target: HTMLElement) => menu === name ? setMenu(null) : openMenu(name, target)

  return (
    <AppCommandContext.Provider value={commandContext}>
    <main className={`${dark ? 'desktop dark' : 'desktop'} dock-mode-${preferences.dock}`} style={{ background: wallpapers.find(w => w.id === preferences.wallpaper)?.background, '--accent': accents[preferences.accent], '--wallpaper-dim': 1 - brightness / 100 } as CSSProperties} onClick={() => { setMenu(null); setContext(null); setShowControl(false) }} onContextMenu={event => { if ((event.target as HTMLElement).closest('.app-window,.menubar,.dock')) return; event.preventDefault(); setMenu(null); setContext({ x: Math.max(4, Math.min(event.clientX, innerWidth - 244)), y: Math.max(30, Math.min(event.clientY, innerHeight - 250)) }) }}>
      <div className="wallpaper-dimmer" />
      <div className="wallpaper-glow" />
      <header className="menubar" onClick={(event) => event.stopPropagation()}>
        <div className="menu-left">
          <button aria-label="Apple menu" aria-haspopup="menu" aria-expanded={menu === 'apple'} className="apple-mark" onMouseEnter={e => { if (expanded) openMenu('apple', e.currentTarget) }} onClick={e => toggleMenu('apple', e.currentTarget)}><Symbol name="apple" size={22} /></button>
          <button className="menu-item bold" aria-haspopup="menu" aria-expanded={menu === 'app'} onMouseEnter={e => { if (expanded) openMenu('app', e.currentTarget) }} onClick={e => toggleMenu('app', e.currentTarget)}>{active}</button>
          {['File', 'Edit', 'View', 'Go', 'Window', 'Help'].map(item => <button key={item} className="menu-item" aria-haspopup="menu" aria-expanded={menu === item} onMouseEnter={e => { if (expanded) openMenu(item, e.currentTarget) }} onClick={e => toggleMenu(item, e.currentTarget)}>{item}</button>)}
        </div>
        <div className="menu-right">
          <span className="battery"><i /></span><Symbol name="wifi" /><button aria-label="Spotlight" className="status-button" onMouseEnter={() => { if (expanded) { setSpotlight(true); setMenu(null); setShowControl(false) } }} onClick={() => { setSpotlight(value => !value); setMenu(null); setShowControl(false) }}><Symbol name="search" size={16} /></button><button aria-label="Control Center" className="control-button" onMouseEnter={() => { if (expanded) { setShowControl(true); setMenu(null); setSpotlight(false) } }} onClick={() => { setShowControl(value => !value); setMenu(null); setSpotlight(false) }}><Symbol name="control" size={17} /></button><button aria-label="Open Calendar" className="menu-clock" onClick={() => launch('Calendar')}><span className="date">{date}</span> {clock}</button>
        </div>
        {menu && <div ref={menuRef} className="menu-popover functional-menu" role="menu" aria-label={menu === 'apple' ? 'Apple' : menu === 'app' ? active : menu} style={{ left: menuLeft }} onKeyDown={e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')); const index = buttons.indexOf(document.activeElement as HTMLButtonElement); buttons[(index + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus() } }}>{menuOptions[menu]?.map(option => <button role="menuitem" key={option.label} disabled={option.disabled} onClick={() => { option.action(); setMenu(null) }}>{option.label}</button>)}</div>}
      </header>

      <section className="desktop-icons">
        <DesktopIcon label="Macintosh HD" icon="disk" onOpen={() => openFolder('Macintosh HD')} />
        <DesktopIcon label="Golden Gate" icon="folder" onOpen={() => openFolder('Golden Gate')} />
        <DesktopIcon label="Shared" icon="shared" onOpen={() => openFolder('Shared')} />
      </section>

      <div className="window-layer">
        {(Object.keys(windows) as AppName[]).map((app) => windows[app].open && !windows[app].minimized && (
          <AppWindow key={app} app={app} state={windows[app]} active={active === app} zIndex={order.indexOf(app) + 1} folderRequest={folderRequest} onLaunch={name => { if (apps.includes(name as AppName)) launch(name as AppName) }} onBounds={bounds => updateBounds(app, bounds)} onFocus={() => { focus(app); setMenu(null); setContext(null); setShowControl(false) }} onClose={() => close(app)} onMinimize={() => minimize(app)} />
        ))}
      </div>

      {showControl && <ControlCenter brightness={brightness} onBrightness={setBrightness} />}

      {preferences.dock === 'auto' && <div className="dock-reveal-edge" onMouseEnter={() => setDockReveal(true)} />}
      <nav aria-label="Dock" className={`dock ${dockReveal ? 'dock-revealed' : ''}`} onMouseEnter={() => setDockReveal(true)} onMouseLeave={() => setDockReveal(false)} onFocus={() => setDockReveal(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDockReveal(false) }} onClick={(event) => event.stopPropagation()}>
        <div className="dock-inner">
          {dockApps.map((app) => <button aria-label={app} key={app} className={`dock-app ${windows[app].open ? 'selected' : ''}`} onClick={() => launch(app)}><NativeIcon name={app} /><small>{app}</small></button>)}
          <div className="dock-divider" />
          <button aria-label="Trash" className={`dock-app ${windows.Trash.open ? 'selected' : ''}`} onClick={() => launch('Trash')}><NativeIcon name="trash" /><small>Trash</small></button>
        </div>
      </nav>
      {spotlight && <Spotlight onClose={() => setSpotlight(false)} onLaunch={app => { launch(app); setSpotlight(false) }} />}
      {context && <div className="desktop-context functional-menu" role="menu" aria-label="Desktop" style={{ left: context.x, top: context.y }} onClick={e => e.stopPropagation()}>{[{ label: 'Open Finder', action: () => openFolder('Desktop') }, { label: 'Open Terminal', action: () => launch('Terminal') }, { label: 'Change Wallpaper…', action: () => settings('Wallpaper') }, { label: preferences.dock === 'hidden' ? 'Show Dock' : 'Hide Dock', action: () => update({ dock: preferences.dock === 'hidden' ? 'show' : 'hidden' }) }, { label: preferences.dock === 'auto' ? 'Turn Off Dock Auto-hide' : 'Automatically Hide Dock', action: () => update({ dock: preferences.dock === 'auto' ? 'show' : 'auto' }) }, { label: 'Show Desktop', action: showDesktop }, { label: 'Restore Windows', action: restoreWindows }].map(option => <button role="menuitem" key={option.label} onClick={() => { option.action(); setContext(null) }}>{option.label}</button>)}</div>}
      {info && <div className="desktop-info-overlay" onClick={() => setInfo(null)}><section role="dialog" aria-modal="true" aria-label={info.title} onClick={e => e.stopPropagation()}><h2>{info.title}</h2><p>{info.body}</p><button autoFocus onClick={() => setInfo(null)}>Done</button></section></div>}
    </main>
    </AppCommandContext.Provider>
  )
}

function DesktopIcon({ label, icon, onOpen }: { label: string; icon: string; onOpen: () => void }) {
  return <button className="desktop-icon" onDoubleClick={onOpen} onKeyDown={event => { if (event.key === 'Enter') onOpen() }}><NativeIcon name={icon} /><small>{label}</small></button>
}

function AppWindow({ app, state, active, zIndex, onBounds, onFocus, onClose, onMinimize, onLaunch, folderRequest }: { app: AppName; state: WindowState; active: boolean; zIndex: number; onBounds: (bounds: Partial<WindowState>) => void; onFocus: () => void; onClose: () => void; onMinimize: () => void; onLaunch: (app: string) => void; folderRequest: { location: string; revision: number } }) {
  const maximized = state.maximized
  const gesture = useRef<{ mode: 'move' | 'resize'; x: number; y: number; bounds: WindowState } | null>(null)
  const toggleMaximize = () => {
    onBounds({ maximized: !maximized })
    onFocus()
  }
  const start = (event: ReactPointerEvent<HTMLElement>, mode: 'move' | 'resize') => {
    if (event.button !== 0 || maximized || (event.target as HTMLElement).closest('button')) return
    event.preventDefault()
    onFocus()
    gesture.current = { mode, x: event.clientX, y: event.clientY, bounds: state }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const move = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = gesture.current
    if (!drag) return
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y
    const width = window.innerWidth, height = Math.max(200, window.innerHeight - 118)
    const b = drag.bounds
    if (drag.mode === 'move') onBounds({ ...b, x: Math.max(0, Math.min(width - Math.min(b.w, width), b.x + dx)), y: Math.max(0, Math.min(height - 43, b.y + dy)) })
    else onBounds({ ...b, w: Math.max(Math.min(360, width - b.x), Math.min(width - b.x, b.w + dx)), h: Math.max(Math.min(240, height - b.y), Math.min(height - b.y, b.h + dy)) })
  }
  const end = () => { gesture.current = null }
  return <section aria-label={`${app} window`} className={`app-window ${active ? 'is-active' : ''} ${maximized ? 'is-maximized' : ''}`} style={{ left: state.x, top: state.y, width: state.w, height: state.h, zIndex }} onPointerDownCapture={onFocus} onClick={(event) => event.stopPropagation()}>
    <div className="window-titlebar" onDoubleClick={event => { if (!(event.target as HTMLElement).closest('button')) toggleMaximize() }} onPointerDown={event => start(event, 'move')} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}><div className="traffic"><button aria-label={`Close ${app}`} className="close" onClick={onClose}>×</button><button aria-label={`Minimize ${app}`} className="minimize" onClick={onMinimize}>−</button><button aria-label={maximized ? `Restore ${app}` : `Maximize ${app}`} className="zoom" onClick={toggleMaximize}>+</button></div><strong>{app === 'Finder' ? 'Macintosh HD' : app}</strong><span className="titlebar-tools">⌁ ︙</span></div>
    <WindowContent app={app} onLaunch={onLaunch} folderRequest={folderRequest} />
    {!maximized && <div className="window-resize" title="Drag to resize" onPointerDown={event => start(event, 'resize')} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} />}
  </section>
}

function Spotlight({ onClose, onLaunch }: { onClose: () => void; onLaunch: (app: AppName) => void }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const previousFocus = useRef(document.activeElement as HTMLElement | null)
  const results = dockApps.filter(app => app.toLowerCase().includes(query.trim().toLowerCase()))
  useEffect(() => {
    input.current?.focus()
    const previous = previousFocus.current
    return () => previous?.focus()
  }, [])
  return <div className="spotlight-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="spotlight-panel" role="dialog" aria-modal="true" aria-label="Spotlight Search" onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        setSelected(value => results.length ? (value + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length : 0)
      }
      if (event.key === 'Enter' && results[selected]) { event.preventDefault(); onLaunch(results[selected]) }
      if (event.key === 'Tab') { event.preventDefault(); input.current?.focus() }
    }}>
      <label className="spotlight-search"><Symbol name="search" size={25} /><input ref={input} aria-label="Search applications" placeholder="Spotlight Search" value={query} onChange={event => { setQuery(event.target.value); setSelected(0) }} aria-controls="spotlight-results" aria-activedescendant={results[selected] ? `spotlight-${selected}` : undefined} role="combobox" aria-expanded="true" aria-autocomplete="list" /><button aria-label="Close Spotlight" onClick={onClose}>esc</button></label>
      <div className="spotlight-results" id="spotlight-results" role="listbox" aria-label="Applications">
        {results.map((app, index) => <button id={`spotlight-${index}`} role="option" aria-selected={index === selected} className={index === selected ? 'highlighted' : ''} key={app} onMouseEnter={() => setSelected(index)} onClick={() => onLaunch(app)}><NativeIcon name={app} /><span>{app}<small>Application</small></span>{index === selected && <span className="spotlight-return">↵</span>}</button>)}
        {!results.length && <p className="spotlight-empty">No applications found for “{query}”</p>}
      </div>
      <footer>↑ ↓ to navigate <span>↵ to open · esc to close</span></footer>
    </section>
  </div>
}

function WindowContent({ app, onLaunch, folderRequest }: { app: AppName; onLaunch: (app: string) => void; folderRequest: { location: string; revision: number } }) {
  if (app === 'Finder') return <Finder onLaunch={onLaunch} request={folderRequest} />
  if (app === 'Notes') return <Notes />
  if (app === 'Safari') return <Safari />
  if (app === 'Terminal') return <Terminal onLaunch={onLaunch} />
  if (app === 'Trash') return <div className="trash-content"><NativeIcon name="trash" /><h2>Trash is empty</h2><p>There are no items to restore or remove.</p><button onClick={() => onLaunch('Finder')}>Open Finder</button></div>
  if (app === 'Calendar') return <Calendar />
  return <Settings />
}

function App() { return <PreferencesProvider><Desktop /></PreferencesProvider> }

export default App
