import { createContext } from 'react'
export const AppCommandContext = createContext({ app: '', action: '', revision: 0, consume: () => {} })
