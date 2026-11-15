import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AppCommandContext } from './AppCommands'
import { fileName, homePath, parentPath, useFileSystem } from './FileSystem'
import './textedit.css'

type Document = { id: string; name: string; text: string }
const EditorContext = createContext<{
  documents: Document[]; selected: string; select: (id: string) => void;
  create: () => void; edit: (patch: Partial<Pick<Document, 'name' | 'text'>>) => void;
  importFiles: (files: File[]) => Promise<void>; status: string;
}>(null!)
export const useTextEdit = () => useContext(EditorContext)

export function TextEditProvider({ children }: { children: ReactNode }) {
  const fs = useFileSystem()
  const documents = fs.entries.filter(f => !f.trashed && f.kind === 'file').map(f => ({ id: f.id, name: fileName(f.path), text: f.text }))
  const [selection, select] = useState('')
  const selected = documents.some(d => d.id === selection) ? selection : documents[0]?.id ?? ''
  const status = fs.status
  const add = (name: string, text = '', folder = `${homePath}/Documents`) => {
    let candidate = name, suffix = 2
    while (fs.entries.some(f => !f.trashed && f.path === `${folder}/${candidate}`)) candidate = `${suffix++}-${name}`
    return fs.create(`${folder}/${candidate}`, 'file', text)
  }
  const create = () => { try { select(add('Untitled.txt')) } catch (error) { setImportError((error as Error).message) } }
  const edit = (patch: Partial<Pick<Document, 'name' | 'text'>>) => {
    try {
      if (patch.name !== undefined) fs.rename(selected, patch.name)
      if (patch.text !== undefined) fs.write(selected, patch.text)
    } catch (error) { setImportError((error as Error).message) }
  }
  const importFiles = async (files: File[]) => {
    const imported: Document[] = []
    const errors: string[] = []
    for (const file of files) {
      if (!(file.type.startsWith('text/') || /\.(txt|md|markdown|csv|json|log|css|html|js|ts|tsx|jsx|xml|yaml|yml)$/i.test(file.name))) { errors.push(`${file.name}: choose a text file`); continue }
      if (file.size > 2 * 1024 * 1024) { errors.push(`${file.name}: maximum size is 2 MB`); continue }
      try {
        const text = await file.text()
        if (text.includes('\0')) { errors.push(`${file.name}: appears to be a binary file`); continue }
        imported.push({ id: crypto.randomUUID(), name: file.name, text })
      } catch { errors.push(`${file.name}: could not read file`) }
    }
    let first = ''
    for (const doc of imported) {
      try { const id = add(doc.name, doc.text, `${homePath}/Downloads`); if (!first) first = id }
      catch (error) { errors.push(`${doc.name}: ${(error as Error).message}`) }
    }
    if (first) select(first)
    setImportError(errors.join('. '))
  }
  const [importError, setImportError] = useState('')
  return <EditorContext.Provider value={{ documents, selected, select, create, edit, importFiles, status }}>
    {children}
    {importError && <div className="textedit-import-error" role="alert">{importError}<button onClick={() => setImportError('')} aria-label="Dismiss import error">×</button></div>}
  </EditorContext.Provider>
}

export default function TextEdit() {
  const { documents, selected, select, create, edit, importFiles, status } = useTextEdit()
  const doc = documents.find(d => d.id === selected) ?? documents[0]
  const picker = useRef<HTMLInputElement>(null)
  const command = useContext(AppCommandContext)
  const handled = useRef(0)
  useEffect(() => {
    if (command.app !== 'TextEdit' || handled.current === command.revision) return
    handled.current = command.revision
    if (command.action === 'new') create()
    command.consume()
  }, [command, create])
  const fs = useFileSystem()
  const [nameDraft, setNameDraft] = useState('')
  useEffect(() => { setNameDraft(doc?.name ?? '') }, [doc?.id, doc?.name])
  const download = () => {
    if (!doc) return
    const url = URL.createObjectURL(new Blob([doc.text], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url; link.download = doc.name.trim() || 'Untitled.txt'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  if (!doc) return <div className="trash-content"><h2>No documents</h2><button onClick={create}>New Document</button></div>
  return <div className="textedit-content" onKeyDown={event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); download() }
  }}>
    <div className="textedit-toolbar"><button onClick={create}>New</button><button onClick={() => picker.current?.click()}>Import…</button><button onClick={download}>Download</button>
      <input ref={picker} hidden type="file" multiple accept="text/*,.txt,.md,.json,.csv,.log,.yaml,.yml" onChange={event => { void importFiles(Array.from(event.target.files ?? [])); event.target.value = '' }} />
    </div>
    <div className="textedit-tabs" role="tablist" aria-label="Documents">{documents.map(d => <button key={d.id} role="tab" aria-selected={doc.id === d.id} aria-controls="textedit-document" onClick={() => select(d.id)}>{d.name || 'Untitled.txt'}</button>)}</div>
    <div id="textedit-document" role="tabpanel" aria-label={doc.name || 'Untitled document'} className="textedit-document">
      <label className="textedit-name">File name<input aria-label="File name" value={nameDraft} onChange={e => setNameDraft(e.target.value)} onBlur={() => { if (nameDraft !== doc.name) edit({ name: nameDraft }); setNameDraft(doc.name) }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} /></label>
      <textarea aria-label="Document text" placeholder="Start writing, or drop text files here…" value={doc.text} onChange={e => edit({ text: e.target.value })} spellCheck />
    </div>
    <footer><span role="status">{status}</span><span>{parentPath(fs.entries.find(f => f.id === doc.id)?.path ?? '/')} · {doc.text.length} characters</span></footer>
  </div>
}
