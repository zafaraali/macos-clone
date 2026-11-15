import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { fileName, useFileSystem } from './FileSystem'
import { NativeIcon } from './Icons'
import './quicklook.css'

export default function QuickLook({ id, onClose, onOpen }: { id: string; onClose: () => void; onOpen: () => void }) {
  const fs = useFileSystem()
  const file = fs.entries.find(f => f.id === id && !f.trashed)
  const panel = useRef<HTMLElement>(null)
  const closeRef = useRef(onClose); closeRef.current = onClose
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => { if (previous?.isConnected) previous.focus() }
  }, [])
  useEffect(() => { if (!file) closeRef.current() }, [file])
  if (!file) return null
  const children = fs.entries.filter(f => !f.trashed && f.path.startsWith(file.path + '/') && !f.path.slice(file.path.length + 1).includes('/'))
  const bytes = new TextEncoder().encode(file.text).length
  return createPortal(<div className="quicklook-backdrop" onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <section ref={panel} className="quicklook-panel" role="dialog" aria-modal="true" aria-label={`Quick Look: ${fileName(file.path)}`} onKeyDown={e => {
      if (e.key === 'Escape' || (e.key === ' ' && !(e.target instanceof HTMLButtonElement))) { e.preventDefault(); e.stopPropagation(); onClose() }
      if (e.key === 'Tab') {
        e.preventDefault()
        const buttons = Array.from(panel.current!.querySelectorAll<HTMLButtonElement>('button'))
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
        buttons[(index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus()
      }
    }}>
      <header><button aria-label="Close Quick Look" onClick={onClose}>×</button><strong>{fileName(file.path)}</strong><button onClick={onOpen}>{file.kind === 'folder' ? 'Open in Finder' : 'Open in TextEdit'}</button></header>
      {file.kind === 'file' ? <pre className="quicklook-text">{file.text || 'This document is empty.'}</pre> : <div className="quicklook-folder"><NativeIcon name="folder" /><h2>{fileName(file.path)}</h2><p>{children.length} items</p><ul>{children.map(child => <li key={child.id}><NativeIcon name={child.kind === 'folder' ? 'folder' : 'document'} />{fileName(child.path)}</li>)}</ul></div>}
      <footer><span>{file.path}</span><span>{file.kind === 'folder' ? 'Folder' : `${bytes.toLocaleString()} bytes · Plain text`}</span></footer>
    </section>
  </div>, document.body)
}
