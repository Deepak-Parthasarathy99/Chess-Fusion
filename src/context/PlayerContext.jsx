import { createContext, useContext } from 'react'

/**
 * Player identity context.
 *
 * Value shape:
 * {
 *   identity: 'A' | 'B',    // which player you are
 *   color:    'w' | 'b',    // your chess colour
 *   name:     string,       // your display name
 *   roomId:   string,       // the current room code
 * }
 */
const PlayerContext = createContext(null)

export function PlayerProvider({ children, value }) {
  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  )
}

/**
 * Hook to access the current player's identity from any component.
 * Returns { identity, color, name, roomId } or null if outside a game.
 */
export function usePlayer() {
  return useContext(PlayerContext)
}
