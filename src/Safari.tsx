import { useState } from 'react'
import './safari.css'

const pages = [
  { address: 'apple.com', name: 'Apple', eyebrow: 'THINK DIFFERENT', title: 'Made for your imagination.', description: 'Explore a fictional collection of beautifully simple devices.', cards: ['Mac · Room for big ideas', 'iPhone · A little everyday magic', 'iPad · Your next blank canvas'] },
  { address: 'wikipedia.org', name: 'Wikipedia', eyebrow: 'THE FREE ENCYCLOPEDIA', title: 'A world of discovery.', description: 'Today’s featured article: the Golden Gate Bridge, a suspension bridge connecting San Francisco and Marin County.', cards: ['History · The bridge opened in 1937', 'Engineering · A landmark across the strait', 'Explore · Art, science, and culture'] },
  { address: 'readwise.io', name: 'Readwise', eyebrow: 'KEEP YOUR BEST IDEAS', title: 'Read. Remember. Rediscover.', description: 'Your demo reading list gathers little ideas worth coming back to.', cards: ['Daily review · Make time for curiosity', 'Highlights · Collect what inspires you', 'Library · A home for your reading'] },
  { address: 'figma.com', name: 'Figma', eyebrow: 'A SPACE TO CREATE', title: 'Good ideas start here.', description: 'Imagine your next project with this sample design workspace.', cards: ['Golden Gate · Desktop concept', 'Design system · Colors and typography', 'Untitled · Your next great idea'] },
]

export default function Safari() {
  const [address, setAddress] = useState('')
  const [history, setHistory] = useState([''])
  const [position, setPosition] = useState(0)
  const [error, setError] = useState('')
  const current = history[position]
  const page = pages.find(item => item.address === current)
  const navigate = (raw: string) => {
    const value = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0]
    if (!value) { setError('Enter a demo address or choose a favorite.'); return }
    setHistory(previous => [...previous.slice(0, position + 1), value])
    setPosition(position + 1); setAddress(value); setError('')
  }
  const travel = (next: number) => { setPosition(next); setAddress(history[next]); setError('') }
  const home = () => { setHistory(previous => [...previous.slice(0, position + 1), '']); setPosition(position + 1); setAddress(''); setError('') }
  return <div className="safari-content live-safari">
    <form className="browser-toolbar" onSubmit={event => { event.preventDefault(); navigate(address) }}>
      <button type="button" aria-label="Back" disabled={position === 0} onClick={() => travel(position - 1)}>‹</button>
      <button type="button" aria-label="Forward" disabled={position === history.length - 1} onClick={() => travel(position + 1)}>›</button>
      <button type="button" aria-label="Safari home" onClick={home}>⌂</button>
      <input className="address" type="text" aria-label="Demo website address" placeholder="Search demo websites" value={address} onChange={event => setAddress(event.target.value)} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      <button type="submit">Go</button>
    </form>
    {error && <p className="safari-address-error" role="alert">{error}</p>}
    <div className="safari-embed-notice"><span>Demo browser · All pages are local samples. No external websites are loaded.</span></div>
    <div className="safari-page">
      <div className="compass">◈</div>
      <p className="eyebrow">{page?.eyebrow ?? (current ? 'DEMO PAGE UNAVAILABLE' : 'WELCOME TO THE WEB')}</p>
      <h1>{page?.title ?? (current ? 'A little off the map.' : <>It’s a bright<br /><em>new day.</em></>)}</h1>
      <p className="muted">{page?.description ?? (current ? `There is no sample page for “${current}”. Choose a demo favorite below.` : 'Explore a few sample websites from your Golden Gate desktop.')}</p>
      {page && <div className="safari-demo-cards">{page.cards.map(card => <article key={card}>{card}</article>)}</div>}
      <div className="quick-links">{pages.map(item => <button key={item.address} aria-pressed={current === item.address} onClick={() => navigate(item.address)}>{item.name}</button>)}</div>
    </div>
  </div>
}
