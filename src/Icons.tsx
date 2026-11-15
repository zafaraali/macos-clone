export function NativeIcon({ name, className = '' }: { name: string; className?: string }) {
  if (name === 'TextEdit') return <svg className={`native-icon ${className}`} viewBox="0 0 64 64" aria-hidden="true">
    <rect x="8" y="5" width="45" height="55" rx="7" fill="#000" opacity=".15" />
    <rect x="8" y="3" width="45" height="55" rx="7" fill="#f9fbff" stroke="#b7c6d8" />
    <path d="M17 17h27M17 24h27M17 31h23M17 38h18M17 45h14" stroke="#94aecb" strokeWidth="2" strokeLinecap="round" />
    <path d="m27 46 4-12L51 9a4 4 0 0 1 6 5L37 39Z" fill="#f4bb49" stroke="#b47724" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="m27 46 4-12 6 5Z" fill="#f3dbb8" /><path d="m27 46 2-6 3 3Z" fill="#394657" />
    <path d="m49 12 6 5" stroke="#d38287" strokeWidth="5" /><path d="m33 33 17-21" stroke="#ffe3a1" strokeWidth="2" />
  </svg>
  if (name === 'Terminal') return <svg className={`native-icon ${className}`} viewBox="0 0 64 64" aria-hidden="true"><rect x="5" y="7" width="54" height="50" rx="11" fill="#bcbec5" /><rect x="8" y="10" width="48" height="44" rx="8" fill="#17191d" /><path d="m17 23 10 8-10 8m16 1h13" stroke="#eee" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
  const icons: Record<string, string> = {
    TextEdit: 'GenericDocumentIcon', Finder: 'finder', Safari: 'safari', Notes: 'notes', Calendar: 'calendar',
    'System Settings': 'settings', folder: 'GenericFolderIcon', document: 'GenericDocumentIcon',
    trash: 'TrashIcon', shared: 'GroupFolder', disk: 'SidebarInternalDisk',
    airdrop: 'SidebarAirDrop', recents: 'SidebarRecents', desktop: 'SidebarDesktopFolder',
    downloads: 'SidebarDownloadsFolder', documents: 'SidebarDocumentsFolder',
    cloud: 'SidebariCloud', network: 'SidebarNetwork',
  }
  return <img className={`native-icon ${className}`} src={`/icons/${icons[name] || name}.png`} alt="" draggable={false} />
}

export function Symbol({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    apple: <path fill="currentColor" stroke="none" d="M17.1 12.8c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.2.8-.6 0-1.6-.8-2.7-.7-1.4 0-2.8.8-3.5 2.1-1.5 2.5-.4 6.3 1 8.4.7 1 1.5 2.1 2.6 2 1 0 1.4-.6 2.7-.6s1.7.6 2.8.6c1.1 0 1.8-1 2.5-2 .8-1.2 1.1-2.3 1.1-2.4-.1 0-2.1-.8-2.1-3.4ZM14.9 6.7c.6-.8 1-1.8.9-2.9-1 .1-2.1.7-2.8 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.9-1.3Z" />,
    wifi: <><path d="M3 9a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0M9 15a5 5 0 0 1 6 0" /><circle cx="12" cy="18" r="1" fill="currentColor" /></>,
    search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></>,
    control: <><path d="M4 7h16M4 17h16" /><rect x="7" y="4" width="4" height="6" rx="2" fill="currentColor" /><rect x="14" y="14" width="4" height="6" rx="2" fill="currentColor" /></>,
    sidebar: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16M5 8h1M5 11h1M5 14h1" /></>,
    grid: <>{[4,14].flatMap(x => [4,14].map(y => <rect key={`${x}-${y}`} x={x} y={y} width="6" height="6" rx="1" />))}</>,
    list: <><path d="M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1" /></>,
    share: <><path d="M8 8H5v13h14V8h-3M12 15V2m-4 4 4-4 4 4" /></>,
    more: <><circle cx="12" cy="12" r="9" /><path d="M7 12h.1M12 12h.1M17 12h.1" /></>,
    bluetooth: <path d="m8 6 9 12-5 4V2l5 4-9 12" />,
    moon: <path d="M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11Z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1" /></>,
    volume: <><path d="M4 9h4l5-4v14l-5-4H4ZM17 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.more}</svg>
}
