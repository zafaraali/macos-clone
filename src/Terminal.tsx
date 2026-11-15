import { useEffect, useRef, useState } from 'react'
import { useFileSystem } from './FileSystem'
import { useTextEdit } from './TextEdit'

const home = '/Users/zafar'
function resolve(path: string, cwd: string) {
  const expanded = path === '~' ? home : path.startsWith('~/') ? home + path.slice(1) : path
  const parts: string[] = []
  for (const part of (expanded.startsWith('/') ? expanded : `${cwd}/${expanded}`).split('/')) {
    if (part === '..') parts.pop()
    else if (part && part !== '.') parts.push(part)
  }
  return '/' + parts.join('/')
}
export default function Terminal({ onLaunch }: { onLaunch: (app: string) => void }) {
  const fs = useFileSystem()
  const editor = useTextEdit()
  const files: Record<string, string | null> = Object.fromEntries(fs.entries.filter(f => !f.trashed).map(f => [f.path, f.kind === 'folder' ? null : f.text]))
  const [cwd, setCwd] = useState(home)
  const [command, setCommand] = useState('')
  const [lines, setLines] = useState(['Golden Gate Terminal — simulated shell', 'Type help to see commands. Files are shared with Finder and TextEdit and saved in this browser.'])
  const [history, setHistory] = useState<string[]>([])
  const [cursor, setCursor] = useState(0)
  const draft = useRef('')
  const output = useRef<HTMLDivElement>(null)
  useEffect(() => { output.current?.scrollTo(0, output.current.scrollHeight) }, [lines])
  const run = () => {
    const raw = command.trim()
    if (!raw) return
    setCommand(''); setHistory(current => [...current, raw]); setCursor(history.length + 1); draft.current = ''
    const tokens = raw.match(/"[^"]*"|'[^']*'|\S+/g)?.map(token => token.replace(/^(["'])(.*)\1$/, '$2')) ?? []
    const [name, ...args] = tokens
    let result = ''
    const path = resolve(args.join(' ') || '.', cwd)
    try { switch (name) {
      case 'touch':
      case 'mkdir': {
        if (!args.length) throw new Error(`Usage: ${name} <path>`)
        if (name === 'touch' && Object.hasOwn(files, path)) break
        fs.create(path, name === 'mkdir' ? 'folder' : 'file'); break
      }
      case 'write': {
        if (args.length < 2) throw new Error('Usage: write <file> <text> (quote names with spaces)')
        const target = resolve(args[0], cwd)
        const entry = fs.entries.find(f => !f.trashed && f.path === target)
        if (entry?.kind === 'folder') throw new Error('Cannot write to a folder.')
        if (entry) fs.write(entry.id, args.slice(1).join(' '))
        else fs.create(target, 'file', args.slice(1).join(' '))
        break
      }
      case 'rm': {
        if (!args.length) throw new Error('Usage: rm <path> (moves to Trash)')
        const entry = fs.entries.find(f => !f.trashed && f.path === path)
        if (!entry) throw new Error('No such file or folder.')
        fs.trash(entry.id); result = 'Moved to Trash'; break
      }
      case 'help': result = 'help                Show commands\nls [path]           List demo files\ncd [path]           Change folder (supports ~ and ..)\npwd                 Show current folder\ncat <file>          Read a demo file (quote names with spaces)\nopen <app>          Launch Finder, Notes, Safari, Calendar, System Settings\necho <text>         Print text\ndate                Show local date and time\nwhoami              Show username\nhistory             Show command history\nclear               Clear output'; break
      case 'pwd': result = cwd; break
      case 'whoami': result = 'zafar'; break
      case 'date': result = new Date().toLocaleString(); break
      case 'echo': result = args.join(' '); break
      case 'history': result = [...history, raw].map((line, i) => `${i + 1}  ${line}`).join('\n'); break
      case 'clear': setLines([]); return
      case 'cd': {
        const destination = args.length ? path : home
        if (!Object.hasOwn(files, destination)) result = `cd: no such directory: ${args.join(' ')}`
        else if (files[destination] !== null) result = `cd: not a directory: ${args.join(' ')}`
        else setCwd(destination)
        break
      }
      case 'ls': {
        if (!Object.hasOwn(files, path)) result = `ls: no such path: ${args.join(' ')}`
        else if (files[path] !== null) result = path.split('/').pop() ?? path
        else {
          const prefix = path === '/' ? '/' : path + '/'
          result = Object.keys(files).filter(file => file.startsWith(prefix) && file !== path && !file.slice(prefix.length).includes('/')).map(file => file.slice(prefix.length) + (files[file] === null ? '/' : '')).join('   ')
        }
        break
      }
      case 'cat': result = !args.length ? 'Usage: cat <file>' : !Object.hasOwn(files, path) ? `cat: no such file: ${args.join(' ')}` : files[path] === null ? 'cat: this is a directory' : files[path]!; break
      case 'open': {
        const app = ['Finder', 'Notes', 'Safari', 'Calendar', 'TextEdit', 'System Settings', 'Terminal', 'Trash'].find(app => app.toLowerCase() === args.join(' ').toLowerCase())
        const entry = fs.entries.find(f => !f.trashed && f.kind === 'file' && f.path === path)
        if (app) { onLaunch(app); result = `Opened ${app}` }
        else if (entry) { editor.select(entry.id); onLaunch('TextEdit'); result = `Opened ${path}` }
        else result = 'Usage: open <app or text file>'
        break
      }
      default: result = `${name}: command not found. Type help for available commands.`
    } } catch (error) { result = `${name}: ${(error as Error).message}` }
    if (name === 'help') result += '\n\nShared browser filesystem:\ntouch <file>        Create a file\nmkdir <folder>      Create a folder\nwrite <file> <text>  Save text to a file\nrm <path>           Move a file or folder to Trash\nopen <file>         Edit a file in TextEdit\nopen Trash          Restore or empty deleted items'
    setLines(current => [...current, `${cwd.replace(home, '~')} % ${raw}`, ...(result ? [result] : [])].slice(-300))
  }
  return <div className="terminal-content"><div className="terminal-output" ref={output} role="log" aria-label="Terminal output">{lines.map((line, i) => <pre key={i}>{line}</pre>)}</div><form className="terminal-prompt" onSubmit={e => { e.preventDefault(); run() }}><label htmlFor="terminal-command">{cwd.replace(home, '~')} %</label><input id="terminal-command" aria-label="Terminal command" value={command} autoComplete="off" autoCapitalize="off" spellCheck={false} onChange={e => setCommand(e.target.value)} onKeyDown={e => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    if (cursor === history.length) draft.current = command
    const next = Math.max(0, Math.min(history.length, cursor + (e.key === 'ArrowUp' ? -1 : 1)))
    setCursor(next); setCommand(next === history.length ? draft.current : history[next])
  }} /><button type="submit" aria-label="Run command">↵</button></form></div>
}
