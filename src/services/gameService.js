import { db } from '../firebase'
import {
  ref,
  set,
  get,
  update,
  onValue,
  serverTimestamp,
} from 'firebase/database'


// ─── Initial game state schema ───────────────────────────────
// This matches the Realtime Database structure at /games/{roomId}
function createInitialGameState(playerAName) {
  return {
    // ── Chess ──
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',

    // ── RPS ──
    rpsTurn: 'A',               // 'A' | 'B' | 'reveal' | 'move'
    playerAChoice: null,        // 'rock' | 'paper' | 'scissors' | null
    playerBChoice: null,        // 'rock' | 'paper' | 'scissors' | null
    bothPicked: false,          // true when both have submitted
    rpsResult: null,            // 'A' | 'B' | 'tie' | null
    roundNumber: 1,

    // ── Move rights ──
    moveRights: null,           // 'w' | 'b' | null — who earned the chess move

    // ── Game status ──
    gameStatus: 'playing',      // 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw' | 'kingCapture'
    winningColor: null,         // 'w' | 'b' | null
    drawReason: null,           // null | 'stalemate' | 'insufficientMaterial' | 'fiftyMoveRule'

    // ── Stats ──
    consecutiveWins: { w: 0, b: 0 },
    totalRPSWins: { w: 0, b: 0 },

    // ── History (Firebase stores empty arrays as null; we default on read) ──
    moveHistory: [],
    capturedPieces: { w: [], b: [] },

    // ── Players ──
    playerA: {
      name: playerAName,
      color: 'w',
    },
    playerB: null,              // set when Player B joins

    // ── Metadata ──
    lastUpdated: serverTimestamp(),
    createdAt: serverTimestamp(),
  }
}

// ─── Generate a short, readable room code ────────────────────
function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I, O, 0, 1
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// ─── createGame ──────────────────────────────────────────────
/**
 * Creates a new game room in Firebase.
 *
 * @param {string} playerName – display name for Player A (White)
 * @returns {Promise<string>} roomId – the 6-char room code
 *
 * Writes initial game state to /games/{roomId}.
 * If the generated code collides (unlikely), retries once.
 */
export async function createGame(playerName) {
  const roomId = generateRoomId()
  const gameRef = ref(db, `games/${roomId}`)

  // Check for collision (very unlikely with 6 alphanumeric chars)
  const snapshot = await get(gameRef)
  if (snapshot.exists()) {
    // Retry with a different code
    return createGame(playerName)
  }

  const initialState = createInitialGameState(playerName)
  await set(gameRef, initialState)

  return roomId
}

// ─── joinGame ────────────────────────────────────────────────
/**
 * Joins an existing game room as Player B (Black).
 *
 * @param {string} roomId – the 6-char room code
 * @param {string} playerName – display name for Player B
 * @returns {Promise<Function>} unsubscribe – call to stop listening
 *
 * Writes Player B's info to/games/{roomId}/playerB,
 * then returns a real-time listener on the entire game state.
 *
 * @throws {Error} if room doesn't exist or is already full.
 */
export async function joinGame(roomId, playerName) {
  const gameRef = ref(db, `games/${roomId}`)

  // Verify the room exists
  const snapshot = await get(gameRef)
  if (!snapshot.exists()) {
    throw new Error(`Room "${roomId}" does not exist.`)
  }

  const gameData = snapshot.val()

  // Prevent joining a full room
  if (gameData.playerB !== null) {
    throw new Error(`Room "${roomId}" is already full.`)
  }

  // Write Player B's info + update timestamp
  await update(gameRef, {
    playerB: {
      name: playerName,
      color: 'b',
    },
    lastUpdated: serverTimestamp(),
  })

  // Return a real-time listener
  // The caller supplies a callback via the returned subscribe function
  return {
    /**
     * Subscribe to real-time game state changes.
     * @param {(gameState: object) => void} callback
     * @returns {Function} unsubscribe
     */
    subscribe(callback) {
      return onValue(gameRef, (snap) => {
        if (snap.exists()) {
          callback(snap.val())
        }
      })
    },

    /** The room reference for direct updates */
    gameRef,
  }
}

// ─── subscribeToGame ─────────────────────────────────────────
/**
 * Subscribe to real-time updates for a game room.
 * Useful for Player A who created the room and needs to listen
 * without calling joinGame.
 *
 * @param {string} roomId
 * @param {(gameState: object) => void} callback
 * @returns {Function} unsubscribe
 */
export function subscribeToGame(roomId, callback) {
  const gameRef = ref(db, `games/${roomId}`)
  return onValue(gameRef, (snap) => {
    if (snap.exists()) {
      callback(snap.val())
    }
  })
}

// ─── updateGameState ─────────────────────────────────────────
/**
 * Partially update the game state in Firebase.
 *
 * @param {string} roomId
 * @param {object} updates – partial game state to merge
 * @returns {Promise<void>}
 */
export async function updateGameState(roomId, updates) {
  const gameRef = ref(db, `games/${roomId}`)
  await update(gameRef, {
    ...updates,
    lastUpdated: serverTimestamp(),
  })
}
