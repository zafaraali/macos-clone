import { useState } from 'react'
import { Symbol } from './Icons'
import { usePreferences } from './Preferences'
export default function ControlCenter({ brightness, onBrightness }: { brightness: number; onBrightness: (value: number) => void }) {
  const [wifi, setWifi] = useState(true)
  const [bluetooth, setBluetooth] = useState(true)
  const [focus, setFocus] = useState(false)
  const [airdrop, setAirdrop] = useState(false)
  const [volume, setVolume] = useState(80)
  const { dark, update } = usePreferences()
  const tiles = [{ name: 'Wi-Fi', icon: 'wifi', on: wifi, detail: wifi ? 'Golden Gate' : 'Off', action: () => setWifi(v => !v) }, { name: 'Bluetooth', icon: 'bluetooth', on: bluetooth, detail: bluetooth ? 'On' : 'Off', action: () => setBluetooth(v => !v) }, { name: 'Focus', icon: 'moon', on: focus, detail: focus ? 'On' : 'Off', action: () => setFocus(v => !v) }, { name: 'AirDrop', icon: 'share', on: airdrop, detail: airdrop ? 'Contacts Only' : 'Off', action: () => setAirdrop(v => !v) }]
  return <aside className="control-center" aria-label="Control Center" onClick={e => e.stopPropagation()}><h3>Control Center</h3><div className="control-grid">{tiles.map(tile => <button key={tile.name} className={`control-tile ${tile.on ? 'active' : ''}`} aria-label={tile.name} aria-pressed={tile.on} onClick={tile.action}><b><Symbol name={tile.icon} />{tile.name}</b><small>{tile.detail}</small></button>)}</div><label className="slider"><Symbol name="sun" /><input aria-label="Display brightness" type="range" min="40" max="100" value={brightness} onChange={e => onBrightness(Number(e.target.value))} /><small>{brightness}%</small></label><label className="slider"><Symbol name="volume" /><input aria-label="Demo volume" type="range" min="0" max="100" value={volume} onChange={e => setVolume(Number(e.target.value))} /><small>{volume}%</small></label><button className="control-appearance" aria-pressed={dark} onClick={() => update({ appearance: dark ? 'light' : 'dark' })}>Dark appearance {dark ? 'On' : 'Off'}</button><p className="muted">Connection and volume controls are simulated.</p></aside>
}
