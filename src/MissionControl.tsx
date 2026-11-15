import { useEffect, useRef } from 'react'
import { NativeIcon } from './Icons'

type OverviewWindow = { name: string; minimized: boolean; active: boolean }
function Preview({ name, minimized }: { name: string; minimized: boolean }) {
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = container.current
    const source = Array.from(document.querySelectorAll<HTMLElement>('.window-layer > .app-window')).find(element => element.getAttribute('aria-label') === `${name} window`)
    if (!host || !source || minimized) return
    const clone = source.cloneNode(true) as HTMLElement
    clone.removeAttribute('aria-label'); clone.setAttribute('aria-hidden', 'true'); clone.inert = true
    clone.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'))
    clone.querySelectorAll('.window-resize').forEach(element => element.remove())
    const width = source.offsetWidth, height = source.offsetHeight
    clone.classList.remove('is-snapped', 'is-maximized', 'snap-left', 'snap-right')
    clone.style.cssText = `position:absolute!important;left:0!important;top:0!important;width:${width}px!important;height:${height}px!important;pointer-events:none!important;transform-origin:top left;opacity:1;`
    host.appendChild(clone)
    const fit = () => { clone.style.transform = `scale(${Math.min(host.clientWidth / width, host.clientHeight / height)})` }
    fit()
    const observer = new ResizeObserver(fit); observer.observe(host)
    return () => { observer.disconnect(); clone.remove() }
  }, [name, minimized])
  return <div ref={container} className="mission-preview" aria-hidden="true"><div className="mission-placeholder"><NativeIcon name={name === 'Trash' ? 'trash' : name} /><span>{minimized ? 'Minimized' : 'Open window'}</span></div></div>
}
export default function MissionControl({ windows, onSelect, onClose }: { windows: OverviewWindow[]; onSelect: (name: string) => void; onClose: () => void }) {
  const panel = useRef<HTMLElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const host = panel.current
    ;(host?.querySelector<HTMLButtonElement>('.mission-current') ?? host?.querySelector<HTMLButtonElement>('.mission-card, .mission-close'))?.focus()
    return () => { if (previous?.isConnected) previous.focus() }
  }, [])
  return <div className="mission-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section ref={panel} className="mission-control" role="dialog" aria-modal="true" aria-label="Mission Control" onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
      if (['Tab', 'ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key) && !(event.ctrlKey || event.metaKey || event.altKey)) {
        event.preventDefault()
        const buttons = Array.from(panel.current!.querySelectorAll<HTMLButtonElement>('.mission-card, .mission-close'))
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
        const backwards = event.key === 'ArrowLeft' || event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)
        buttons[(index + (backwards ? -1 : 1) + buttons.length) % buttons.length]?.focus()
      }
    }}>
      <header><div><p>YOUR WORKSPACE</p><h1>Mission Control</h1><span>{windows.length} open {windows.length === 1 ? 'app' : 'apps'} · Select a window to return</span></div><button className="mission-close" onClick={onClose} aria-label="Close Mission Control">Done <small>esc</small></button></header>
      {windows.length ? <div className="mission-grid">{windows.map(window => <button key={window.name} className={`mission-card ${window.active ? 'mission-current' : ''}`} aria-label={`Switch to ${window.name}${window.minimized ? ' (minimized)' : ''}`} onClick={() => onSelect(window.name)}><Preview name={window.name} minimized={window.minimized} /><span className="mission-caption"><NativeIcon name={window.name === 'Trash' ? 'trash' : window.name} /><b>{window.name}</b><small>{window.minimized ? 'Minimized' : window.active ? 'Active' : 'Open'}</small></span></button>)}</div> : <div className="mission-empty"><h2>A clear desktop.</h2><p>Open an app from the Dock to see it here.</p></div>}
      <footer>Arrow keys to navigate · Enter to switch · Escape to return</footer>
    </section>
  </div>
}
