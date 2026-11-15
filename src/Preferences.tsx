import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AppCommandContext } from './AppCommands'

export const wallpapers = [
  { id: 'golden-gate', name: 'Golden Gate', background: "#465d50 url('/wallpapers/golden-gate.jpg') center/cover no-repeat" },
  { id: 'sonoma', name: 'Sonoma', background: "#465d50 url('/wallpapers/sonoma.jpg') center/cover no-repeat" },
  { id: 'dusk', name: 'Dusk', background: 'linear-gradient(145deg,#172c52,#695689 55%,#e7a588)' },
] as const
export const accents = { Blue: '#0063df', Purple: '#9250c7', Pink: '#cb347c', Orange: '#b75b09', Green: '#217a47' }
type Preferences = { appearance: 'light' | 'dark' | 'auto'; wallpaper: string; accent: keyof typeof accents; dock: 'show' | 'auto' | 'hidden' }
const defaults: Preferences = { appearance: 'light', wallpaper: 'golden-gate', accent: 'Blue', dock: 'show' }
const Context = createContext<{ preferences: Preferences; update: (patch: Partial<Preferences>) => void; dark: boolean; saveError: boolean } | null>(null)
function load(): Preferences {
  try {
    const data = JSON.parse(localStorage.getItem('golden-gate.preferences.v1') ?? 'null')
    if (data && ['light', 'dark', 'auto'].includes(data.appearance) && wallpapers.some(w => w.id === data.wallpaper) && Object.hasOwn(accents, data.accent)) return { ...data, dock: ['show', 'auto', 'hidden'].includes(data.dock) ? data.dock : 'show' }
  } catch { /* Use defaults if saved preferences cannot be read. */ }
  return defaults
}
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(load)
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)
  const [saveError, setSaveError] = useState(false)
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const change = () => setSystemDark(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  useEffect(() => {
    try { localStorage.setItem('golden-gate.preferences.v1', JSON.stringify(preferences)); setSaveError(false) } catch { setSaveError(true) }
  }, [preferences])
  return <Context.Provider value={{ preferences, update: patch => setPreferences(current => ({ ...current, ...patch })), dark: preferences.appearance === 'dark' || (preferences.appearance === 'auto' && systemDark), saveError }}>{children}</Context.Provider>
}
export function usePreferences() {
  const context = useContext(Context)
  if (!context) throw new Error('PreferencesProvider is required')
  return context
}

export default function Settings() {
  const { preferences, update, saveError } = usePreferences()
  const [page, setPage] = useState('Appearance')
  const command = useContext(AppCommandContext)
  useEffect(() => {
    if (command.app === 'System Settings' && ['Appearance', 'Wallpaper', 'Dock', 'About'].includes(command.action)) { setPage(command.action); command.consume() }
  }, [command])
  return <div className="settings-content live-settings"><aside className="settings-sidebar"><div className="profile"><span>ZA</span><div><b>Zafar Ali</b><small>Golden Gate</small></div></div>{['Appearance', 'Wallpaper', 'Dock', 'About'].map(name => <button key={name} className={page === name ? 'setting-selected' : ''} onClick={() => setPage(name)}>{name === 'Appearance' ? '◉' : name === 'Wallpaper' ? '▣' : name === 'Dock' ? '▤' : 'ⓘ'} {name}</button>)}</aside><div className="settings-page"><h1>{page}</h1>
    {page === 'Dock' && <><p className="settings-description">Choose when the Dock is visible. You can always launch apps with Spotlight or the Go menu.</p><div className="dock-settings" role="group" aria-label="Dock visibility">{([['show', 'Always show', 'Keep the Dock on screen.'], ['auto', 'Auto-hide', 'Reveal it at the bottom edge.'], ['hidden', 'Hidden', 'Hide it until you change this setting.']] as const).map(([value, label, description]) => <button key={value} aria-pressed={preferences.dock === value} onClick={() => update({ dock: value })}><b>{label}</b><small>{description}</small><span>{preferences.dock === value ? '✓' : ''}</span></button>)}</div><p className="settings-description">Shortcut: ⌘⌥D (Ctrl+Alt+D) toggles auto-hide.</p></>}
    {page === 'Appearance' && <><p className="settings-description">Make this desktop feel like yours.</p><div className="appearance-options" role="group" aria-label="Appearance">{(['light', 'dark', 'auto'] as const).map(mode => <button key={mode} aria-pressed={preferences.appearance === mode} onClick={() => update({ appearance: mode })}><div className={`appearance-preview ${mode}`}><i /><span /></div><b>{mode === 'auto' ? 'Auto' : mode === 'dark' ? 'Dark' : 'Light'}</b></button>)}</div><p className="settings-description">Auto follows your device’s appearance.</p><div className="setting-row"><div><b>Accent color</b><small>{preferences.accent}</small></div><div className="accent-options" role="group" aria-label="Accent color">{Object.entries(accents).map(([name, color]) => <button key={name} aria-label={`${name} accent`} aria-pressed={preferences.accent === name} style={{ background: color }} onClick={() => update({ accent: name as keyof typeof accents })}>{preferences.accent === name ? '✓' : ''}</button>)}</div></div></>}
    {page === 'Wallpaper' && <><p className="settings-description">Choose a background for your desktop.</p><div className="wallpaper-options">{wallpapers.map(wallpaper => <button key={wallpaper.id} aria-pressed={preferences.wallpaper === wallpaper.id} onClick={() => update({ wallpaper: wallpaper.id })}><div style={{ background: wallpaper.background }} /><b>{wallpaper.name}</b>{preferences.wallpaper === wallpaper.id && <span> ✓</span>}</button>)}</div></>}
    {page === 'About' && <div className="about-desktop"><h2>Golden Gate</h2><p>Your familiar little corner of the web.</p><p>Version 0.1.0</p><small>Notes, calendar events, and preferences are stored locally in this browser.</small></div>}
    <p className="settings-save-status" role="status">{saveError ? 'Unable to save preferences in this browser.' : 'Preferences saved in this browser.'}</p>
  </div></div>
}
