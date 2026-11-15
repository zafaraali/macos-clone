import { useState } from 'react'
import { fileName, useFileSystem } from './FileSystem'
import { NativeIcon } from './Icons'
export default function Trash() {
  const fs = useFileSystem()
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')
  const items = fs.entries.filter(f => f.trashed)
  const roots = items.filter(f => !items.some(parent => parent.kind === 'folder' && f.path.startsWith(parent.path + '/')))
  return <div className="filesystem-trash"><header><strong>{items.length} items in Trash</strong><button disabled={!items.length} onClick={() => setConfirm(true)}>Empty Trash…</button></header>
    {confirm && <div className="filesystem-actions" role="alert"><span>Permanently delete all {items.length} items?</span><button onClick={() => { fs.emptyTrash(); setConfirm(false); setError('') }}>Delete Permanently</button><button onClick={() => setConfirm(false)}>Cancel</button></div>}
    {error && <p className="filesystem-error" role="alert">{error}</p>}
    {!items.length && <div className="filesystem-empty"><NativeIcon name="trash" /><h2>Trash is empty</h2><p>Deleted files and folders will appear here.</p></div>}
    {roots.map(item => <div className="filesystem-trash-row" key={item.id}><NativeIcon name={item.kind === 'folder' ? 'folder' : 'document'} /><span><b>{fileName(item.path)}</b><small>{item.path}</small></span><button onClick={() => { try { fs.restore(item.id); setError('') } catch (error) { setError((error as Error).message) } }}>Restore</button></div>)}
    <footer>{fs.status}</footer>
  </div>
}
