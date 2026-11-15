import { useState } from 'react'
const links = [{ name: 'Apple', url: 'https://www.apple.com' }, { name: 'Wikipedia', url: 'https://www.wikipedia.org' }, { name: 'Readwise', url: 'https://readwise.io' }, { name: 'Figma', url: 'https://www.figma.com' }]
export default function Safari() {
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')
  return <div className="safari-content"><form className="browser-toolbar" onSubmit={event => {
    event.preventDefault()
    try {
      const url = new URL(address.includes('://') ? address : `https://${address}`)
      if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.')) throw new Error()
      window.open(url.href, '_blank', 'noopener,noreferrer'); setError('')
    } catch { setError('Enter a valid website address, such as apple.com.') }
  }}><button type="button" aria-label="Safari home" onClick={() => { setAddress(''); setError('') }}>⌂</button><input className="address" aria-label="Website address" placeholder="Enter a website address" value={address} onChange={event => setAddress(event.target.value)} /><button type="submit">Go ↗</button></form><div className="safari-page"><div className="compass">◈</div><p className="eyebrow">WELCOME TO THE WEB</p><h1>It’s a bright<br /><em>new day.</em></h1><p className="muted">Websites open in a new browser tab.</p>{error && <p className="safari-error" role="alert">{error}</p>}<div className="quick-links">{links.map(link => <a href={link.url} key={link.name} target="_blank" rel="noopener noreferrer">{link.name} ↗</a>)}</div></div></div>
}
