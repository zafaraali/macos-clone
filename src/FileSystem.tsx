import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export const homePath = '/Users/zafar'
export type FileEntry = { id: string; path: string; kind: 'file' | 'folder'; text: string; trashed?: boolean; trashRoot?: string }
export const parentPath = (path: string) => path.slice(0, path.lastIndexOf('/')) || '/'
export const fileName = (path: string) => path.split('/').pop() || '/'
export function resolvePath(path: string, cwd = homePath) {
  const expanded = path === '~' ? homePath : path.startsWith('~/') ? homePath + path.slice(1) : path
  const parts: string[] = []
  for (const part of (expanded.startsWith('/') ? expanded : `${cwd}/${expanded}`).split('/')) {
    if (part === '..') parts.pop()
    else if (part && part !== '.') parts.push(part)
  }
  return '/' + parts.join('/')
}
const key = 'golden-gate.files.v1'
function initial(): FileEntry[] {
  const folders = ['/', '/Users', homePath, `${homePath}/Desktop`, `${homePath}/Documents`, `${homePath}/Downloads`, `${homePath}/Documents/Projects`, `${homePath}/Desktop/Golden Gate`, `${homePath}/Shared`]
  const result: FileEntry[] = folders.map(path => ({ id: path, path, kind: 'folder', text: '' }))
  result.push({ id: 'welcome', path: `${homePath}/Desktop/Read Me.txt`, kind: 'file', text: 'Welcome to Golden Gate.\nFiles are shared between Finder, Terminal, and TextEdit.\nDeleted files can be restored from Trash.' }, { id: 'ideas', path: `${homePath}/Documents/Ideas.txt`, kind: 'file', text: 'Make something useful.\nTake a walk by the water.\nWrite down one good idea every day.' })
  try {
    const legacy = JSON.parse(localStorage.getItem('golden-gate.textedit.v1') ?? 'null')
    if (Array.isArray(legacy)) for (const doc of legacy) {
      if (typeof doc?.text !== 'string' || typeof doc?.name !== 'string') continue
      const name = doc.name.replace(/[\/\0]/g, '_').trim() || 'Untitled.txt'
      let path = `${homePath}/Documents/${name}`, suffix = 2
      while (result.some(f => f.path === path)) path = `${homePath}/Documents/${suffix++}-${name}`
      result.push({ id: crypto.randomUUID(), path, kind: 'file', text: doc.text })
    }
  } catch { /* Old editor storage is optional. */ }
  return result
}
function load(): FileEntry[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (Array.isArray(data) && data.length && data.every(f => f && typeof f.id === 'string' && typeof f.path === 'string' && f.path.startsWith('/') && (f.kind === 'file' || f.kind === 'folder') && typeof f.text === 'string' && (f.trashed === undefined || typeof f.trashed === 'boolean')) && new Set(data.map(f => f.id)).size === data.length && data.some(f => f.path === '/' && f.kind === 'folder' && !f.trashed)) return data
  } catch { /* Use defaults if storage is unavailable or invalid. */ }
  return initial()
}
const Context = createContext<{
  entries: FileEntry[]; status: string;
  create: (path: string, kind: 'file' | 'folder', text?: string) => string;
  write: (id: string, text: string) => void; rename: (id: string, name: string) => void;
  move: (id: string, folder: string) => void;
  trash: (id: string) => void; restore: (id: string) => void; emptyTrash: () => void;
  undoLabel: string; undo: () => void;
}>(null!)
export const useFileSystem = () => useContext(Context)
export function FileSystemProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState(load)
  const current = useRef(entries)
  const [status, setStatus] = useState('Saved in this browser')
  const history = useRef<{ label: string; changes: { before: FileEntry; after: FileEntry }[] }[]>([])
  const [undoLabel, setUndoLabel] = useState('')
  const commit = (next: FileEntry[], label?: string) => {
    if (label) {
      const changes = next.flatMap(after => {
        const before = current.current.find(f => f.id === after.id)
        return before && (before.path !== after.path || Boolean(before.trashed) !== Boolean(after.trashed) || before.trashRoot !== after.trashRoot) ? [{ before, after }] : []
      })
      if (changes.length) { history.current = [...history.current.slice(-29), { label, changes }]; setUndoLabel(label) }
    }
    current.current = next; setEntries(next)
  }
  const undo = () => {
    const operation = history.current.at(-1)
    if (!operation) return
    const files = current.current
    for (const { after } of operation.changes) {
      const file = files.find(f => f.id === after.id)
      if (!file || file.path !== after.path || Boolean(file.trashed) !== Boolean(after.trashed) || file.trashRoot !== after.trashRoot) throw new Error('This operation cannot be undone because the affected items have changed.')
    }
    const next = files.map(file => {
      const change = operation.changes.find(c => c.before.id === file.id)
      // Preserve text written since the file operation.
      if (change) return { ...file, path: change.before.path, trashed: change.before.trashed, trashRoot: change.before.trashRoot }
      const parentChange = operation.changes.filter(c => c.after.kind === 'folder' && c.before.path !== c.after.path && file.path.startsWith(c.after.path + '/') && !file.trashed).sort((a,b) => b.after.path.length - a.after.path.length)[0]
      return parentChange ? { ...file, path: parentChange.before.path + file.path.slice(parentChange.after.path.length) } : file
    })
    const active = next.filter(f => !f.trashed)
    if (new Set(active.map(f => f.path)).size !== active.length) throw new Error('Cannot undo: an item already exists at the original location. Rename or move it first.')
    for (const file of active) if (file.path !== '/' && !active.some(f => f.path === parentPath(file.path) && f.kind === 'folder')) throw new Error('Cannot undo: a parent folder would be missing. Move any new contents out first.')
    history.current.pop(); setUndoLabel(history.current.at(-1)?.label ?? ''); commit(next)
  }
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(entries)); setStatus('Saved in this browser') }
    catch { setStatus('Unable to save in this browser — download important files') }
  }, [entries])
  const create = (raw: string, kind: 'file' | 'folder', text = '') => {
    const path = resolvePath(raw)
    const files = current.current
    if (!fileName(path).trim() || path === '/' || raw.includes('\0')) throw new Error('Choose a valid file name.')
    if (files.some(f => !f.trashed && f.path === path)) throw new Error('An item with that name already exists.')
    if (!files.some(f => !f.trashed && f.path === parentPath(path) && f.kind === 'folder')) throw new Error('Parent folder does not exist.')
    const id = crypto.randomUUID(); commit([...files, { id, path, kind, text }]); return id
  }
  const write = (id: string, text: string) => commit(current.current.map(f => f.id === id && !f.trashed && f.kind === 'file' ? { ...f, text } : f))
  const rename = (id: string, name: string) => {
    const files = current.current, entry = files.find(f => f.id === id && !f.trashed)
    if (!entry) throw new Error('File no longer exists.')
    if (entry.path === '/' || entry.path === '/Users' || entry.path === homePath || ['Desktop', 'Documents', 'Downloads', 'Shared'].some(n => entry.path === `${homePath}/${n}`)) throw new Error('This system folder cannot be renamed.')
    if (!name.trim() || /[\/\0]/.test(name) || name === '.' || name === '..') throw new Error('Choose a name without slashes.')
    const path = `${parentPath(entry.path)}/${name}`.replace(/^\/\//, '/')
    if (files.some(f => !f.trashed && f.id !== id && f.path === path)) throw new Error('An item with that name already exists.')
    const group = files.filter(f => !f.trashed && (f.id === id || f.path.startsWith(entry.path + '/')))
    if (group.some(f => files.some(other => !other.trashed && !group.some(g => g.id === other.id) && other.path === path + f.path.slice(entry.path.length)))) throw new Error('An item with that name already exists.')
    commit(files.map(f => group.some(g => g.id === f.id) ? { ...f, path: path + f.path.slice(entry.path.length) } : f), `Rename ${fileName(entry.path)}`)
  }
  const trash = (id: string) => {
    const entry = current.current.find(f => f.id === id && !f.trashed)
    if (!entry) throw new Error('Item no longer exists.')
    if (entry.path === '/' || entry.path === '/Users' || entry.path === homePath || ['Desktop', 'Documents', 'Downloads', 'Shared'].some(n => entry.path === `${homePath}/${n}`)) throw new Error('This system folder cannot be deleted.')
    commit(current.current.map(f => !f.trashed && (f.id === id || f.path.startsWith(entry.path + '/')) ? { ...f, trashed: true, trashRoot: id } : f), `Move ${fileName(entry.path)} to Trash`)
  }
  const move = (id: string, folder: string) => {
    const files = current.current, entry = files.find(f => f.id === id && !f.trashed)
    if (!entry) throw new Error('Item no longer exists.')
    if (!files.some(f => !f.trashed && f.path === folder && f.kind === 'folder')) throw new Error('Destination folder does not exist.')
    if (entry.path === '/' || entry.path === '/Users' || entry.path === homePath || ['Desktop', 'Documents', 'Downloads', 'Shared'].some(n => entry.path === `${homePath}/${n}`)) throw new Error('This system folder cannot be moved.')
    if (folder === entry.path || folder.startsWith(entry.path + '/')) throw new Error('A folder cannot be moved into itself.')
    const path = `${folder}/${fileName(entry.path)}`.replace(/^\/\//, '/')
    if (path === entry.path) return
    const group = files.filter(f => !f.trashed && (f.id === id || f.path.startsWith(entry.path + '/')))
    if (group.some(f => files.some(other => !other.trashed && !group.some(g => g.id === other.id) && other.path === path + f.path.slice(entry.path.length)))) throw new Error('An item with that name already exists in this folder.')
    commit(files.map(f => group.some(g => g.id === f.id) ? { ...f, path: path + f.path.slice(entry.path.length) } : f), `Move ${fileName(entry.path)}`)
  }
  const restore = (id: string) => {
    const files = current.current, entry = files.find(f => f.id === id && f.trashed)
    if (!entry) return
    const group = files.filter(f => f.trashed && (f.id === id || f.trashRoot === id))
    if (!files.some(f => !f.trashed && f.path === parentPath(entry.path) && f.kind === 'folder')) throw new Error('Restore the parent folder first.')
    if (group.some(f => files.some(other => !other.trashed && other.path === f.path))) throw new Error('An item already exists at the original location. Rename or move it before restoring.')
    commit(files.map(f => group.some(g => g.id === f.id) ? { ...f, trashed: false, trashRoot: undefined } : f), `Restore ${fileName(entry.path)}`)
  }
  return <Context.Provider value={{ entries, status, create, write, rename, move, trash, restore, undoLabel, undo, emptyTrash: () => { history.current = []; setUndoLabel(''); commit(current.current.filter(f => !f.trashed)) } }}>{children}</Context.Provider>
}
