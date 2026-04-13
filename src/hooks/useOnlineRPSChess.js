import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Chess } from 'chess.js'
import { ref, onValue, update, serverTimestamp } from 'firebase/database'
import { db } from '../firebase'

// ─── Re-export constants (same as local hook) ────────────────
export const RPS_CHOICES = ['rock', 'paper', 'scissors']

export const RPS_PHASE = {
  AWAITING_PLAYER_A: 'awaitingPlayerA',
  AWAITING_PLAYER_B: 'awaitingPlayerB',
  REVEALING: 'revealing',
  AWAITING_CHESS_MOVE: 'awaitingChessMove',
}

export const GAME_STATUS = {
  PLAYING: 'playing',
  CHECK: 'check',
  CHECKMATE: 'checkmate',
  KING_CAPTURE: 'kingCapture',
  STALEMATE: 'stalemate',
  DRAW: 'draw',
}

export const DRAW_REASON = {
  STALEMATE: 'stalemate',
  INSUFFICIENT_MATERIAL: 'insufficientMaterial',
  THREEFOLD_REPETITION: 'threefoldRepetition',
  FIFTY_MOVE_RULE: 'fiftyMoveRule',
}

// ─── RPS Resolution ──────────────────────────────────────────
function resolveRPS(pickA, pickB) {
  if (pickA === pickB) return 'tie'
  if (
    (pickA === 'rock' && pickB === 'scissors') ||
    (pickA === 'paper' && pickB === 'rock') ||
    (pickA === 'scissors' && pickB === 'paper')
  ) {
    return 'A'
  }
  return 'B'
}

// ─── FEN helpers ─────────────────────────────────────────────
const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function setFenActiveColor(fen, color) {
  const parts = fen.split(' ')
  parts[1] = color
  return parts.join(' ')
}

function getDrawReason(game) {
  if (game.isStalemate()) return DRAW_REASON.STALEMATE
  if (game.isInsufficientMaterial()) return DRAW_REASON.INSUFFICIENT_MATERIAL
  if (game.isDraw()) return DRAW_REASON.FIFTY_MOVE_RULE // fallback for 50-move
  return null
}

// ─── Firebase rpsTurn ↔ RPS_PHASE mapping ────────────────────
function rpsTurnToPhase(rpsTurn) {
  switch (rpsTurn) {
    case 'A': return RPS_PHASE.AWAITING_PLAYER_A
    case 'B': return RPS_PHASE.AWAITING_PLAYER_B
    case 'reveal': return RPS_PHASE.REVEALING
    case 'move': return RPS_PHASE.AWAITING_CHESS_MOVE
    default: return RPS_PHASE.AWAITING_PLAYER_A
  }
}

// ─── Serialise a chess.js move into a plain object for Firebase
function createMoveRecord(move, color, id) {
  return {
    id,
    san: move.san,
    lan: move.lan,
    color,
    from: move.from,
    to: move.to,
    piece: move.piece,
    captured: move.captured || null,
    promotion: move.promotion || null,
    flags: move.flags,
    isCapture: typeof move.isCapture === 'function' ? move.isCapture() : Boolean(move.captured),
    isPromotion: typeof move.isPromotion === 'function' ? move.isPromotion() : Boolean(move.promotion),
    isEnPassant: typeof move.isEnPassant === 'function' ? move.isEnPassant() : move.flags?.includes('e'),
    isCastle:
      (typeof move.isKingsideCastle === 'function' && move.isKingsideCastle()) ||
      (typeof move.isQueensideCastle === 'function' && move.isQueensideCastle()),
  }
}

// ─── Safe array getter (Firebase stores [] as null) ──────────
const safeArr = (val) => (Array.isArray(val) ? val : [])

// ═══════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════
/**
 * Firebase-synced version of useRPSChess.
 *
 * @param {string} roomId   – the 6-char room code
 * @param {'A'|'B'} identity  – which player you are
 *
 * Returns the **same API shape** as the local useRPSChess hook,
 * plus `connected` (bool) and `playerNames` ({ white, black }).
 *
 * Every mutation writes to Firebase; every read comes from the
 * real-time `onValue` listener.
 */
export function useOnlineRPSChess(roomId, identity) {
  const myColor = identity === 'A' ? 'w' : 'b'

  // ── Raw Firebase state ──
  const [fb, setFb] = useState(null)
  const [connected, setConnected] = useState(false)
  const gameRefObj = useRef(null)

  // ── Subscribe once ──
  useEffect(() => {
    if (!roomId) return
    const dbRef = ref(db, `games/${roomId}`)
    gameRefObj.current = dbRef

    const unsubscribe = onValue(dbRef, (snap) => {
      if (snap.exists()) {
        setFb(snap.val())
        setConnected(true)
      }
    })
    return () => { unsubscribe(); gameRefObj.current = null }
  }, [roomId])

  // ── Helper: write to Firebase ──
  const write = useCallback(
    (updates) => {
      if (!gameRefObj.current) return Promise.resolve()
      return update(gameRefObj.current, {
        ...updates,
        lastUpdated: serverTimestamp(),
      })
    },
    []
  )

  // ═══════════════════════════════════════════════════════════
  // Derived state from Firebase snapshot
  // ═══════════════════════════════════════════════════════════

  const fen = fb?.fen || INITIAL_FEN

  // Chess instance from FEN (for board rendering & validation)
  const game = useMemo(() => {
    try { return new Chess(fen) }
    catch { return new Chess() }
  }, [fen])

  const chessTurn = game.turn()

  // Map Firebase rpsTurn → hook RPS_PHASE
  const rpsPhase = useMemo(() => rpsTurnToPhase(fb?.rpsTurn), [fb?.rpsTurn])

  // ── Hidden picks ──
  // You can always see YOUR OWN pick.
  // You can only see your opponent's pick after bothPicked === true.
  const bothPicked = fb?.bothPicked ?? false
  const playerAPick = useMemo(() => {
    if (!fb?.playerAChoice) return null
    // Player A always sees their own pick; Player B only after reveal
    return (identity === 'A' || bothPicked) ? fb.playerAChoice : null
  }, [fb?.playerAChoice, identity, bothPicked])

  const playerBPick = useMemo(() => {
    if (!fb?.playerBChoice) return null
    return (identity === 'B' || bothPicked) ? fb.playerBChoice : null
  }, [fb?.playerBChoice, identity, bothPicked])

  const rpsResult = fb?.rpsResult ?? null
  const moveGrantedTo = fb?.moveRights ?? null
  const roundNumber = fb?.roundNumber ?? 1
  const consecutiveWins = fb?.consecutiveWins ?? { w: 0, b: 0 }
  const totalRPSWins = fb?.totalRPSWins ?? { w: 0, b: 0 }
  const moveHistory = useMemo(() => safeArr(fb?.moveHistory), [fb?.moveHistory])
  const capturedPieces = useMemo(() => ({
    w: safeArr(fb?.capturedPieces?.w),
    b: safeArr(fb?.capturedPieces?.b),
  }), [fb?.capturedPieces])

  // ── Game status ──
  const gameStatus = useMemo(() => {
    // Trust the Firebase value for terminal states
    const fbStatus = fb?.gameStatus ?? 'playing'
    if (fbStatus === 'kingCapture' || fbStatus === 'checkmate' ||
        fbStatus === 'stalemate' || fbStatus === 'draw') {
      return fbStatus
    }
    // Derive check from the live Chess instance
    if (game.isCheck()) return GAME_STATUS.CHECK
    return GAME_STATUS.PLAYING
  }, [fb?.gameStatus, game])

  const winningColor = fb?.winningColor ?? null
  const drawReason = fb?.drawReason ?? null

  const isGameOver = useMemo(() =>
    gameStatus === GAME_STATUS.KING_CAPTURE ||
    gameStatus === GAME_STATUS.CHECKMATE ||
    gameStatus === GAME_STATUS.STALEMATE ||
    gameStatus === GAME_STATUS.DRAW,
  [gameStatus])

  const statusLabel = useMemo(() => {
    const activeMoveColor = moveGrantedTo === 'w' ? 'White' : 'Black'
    switch (gameStatus) {
      case GAME_STATUS.KING_CAPTURE:
        return `King captured — ${winningColor === 'w' ? 'White' : 'Black'} wins`
      case GAME_STATUS.CHECKMATE: {
        const winner = chessTurn === 'w' ? 'Black' : 'White'
        return `Checkmate — ${winner} wins`
      }
      case GAME_STATUS.STALEMATE:
        return 'Stalemate — Draw'
      case GAME_STATUS.DRAW:
        if (drawReason === DRAW_REASON.INSUFFICIENT_MATERIAL) return 'Draw — Insufficient material'
        if (drawReason === DRAW_REASON.FIFTY_MOVE_RULE) return 'Draw — 50-move rule'
        return 'Draw'
      case GAME_STATUS.CHECK:
        if (rpsPhase === RPS_PHASE.AWAITING_CHESS_MOVE && moveGrantedTo) {
          return `${activeMoveColor} to move`
        }
        return `${chessTurn === 'w' ? 'White' : 'Black'} is in check`
      default:
        if (rpsPhase === RPS_PHASE.AWAITING_CHESS_MOVE && moveGrantedTo) {
          return `${activeMoveColor} to move`
        }
        return 'Win RPS to earn the next move'
    }
  }, [gameStatus, chessTurn, drawReason, rpsPhase, moveGrantedTo, winningColor])

  // Player names from Firebase
  const playerNames = useMemo(() => ({
    white: fb?.playerA?.name ?? 'Player 1',
    black: fb?.playerB?.name ?? 'Waiting…',
  }), [fb?.playerA?.name, fb?.playerB?.name])

  const opponentJoined = fb?.playerB != null

  // ═══════════════════════════════════════════════════════════
  // Actions → Firebase writes
  // ═══════════════════════════════════════════════════════════

  /**
   * Submit an RPS choice. Only the correct player for the current
   * turn can submit. Player B resolves the round atomically.
   */
  const submitRPSChoice = useCallback(
    async (choice) => {
      if (!fb || !RPS_CHOICES.includes(choice) || isGameOver) return

      // ── Player A picks ──
      if (identity === 'A' && fb.rpsTurn === 'A') {
        await write({
          playerAChoice: choice,
          rpsTurn: 'B',
        })
        return
      }

      // ── Player B picks → resolve the round atomically ──
      if (identity === 'B' && fb.rpsTurn === 'B') {
        const pickA = fb.playerAChoice
        if (!pickA) return // edge case: A hasn't picked yet

        const result = resolveRPS(pickA, choice)

        const updates = {
          playerBChoice: choice,
          bothPicked: true,
          rpsResult: result,
          rpsTurn: 'reveal',
        }

        if (result !== 'tie') {
          const winnerColor = result === 'A' ? 'w' : 'b'
          const loserColor = winnerColor === 'w' ? 'b' : 'w'
          updates.moveRights = winnerColor

          const prevCons = fb.consecutiveWins ?? { w: 0, b: 0 }
          updates.consecutiveWins = {
            [winnerColor]: (prevCons[winnerColor] || 0) + 1,
            [loserColor]: 0,
          }

          const prevTotal = fb.totalRPSWins ?? { w: 0, b: 0 }
          updates.totalRPSWins = {
            ...prevTotal,
            [winnerColor]: (prevTotal[winnerColor] || 0) + 1,
          }
        }

        await write(updates)
      }
    },
    [fb, identity, isGameOver, write]
  )

  /**
   * Advance from the reveal phase.
   * Both clients may call this (auto-dismiss timer); writes are idempotent.
   */
  const advanceFromReveal = useCallback(async () => {
    if (!fb || fb.rpsTurn !== 'reveal') return

    if (fb.rpsResult === 'tie') {
      // Replay — reset picks, back to Player A
      await write({
        playerAChoice: null,
        playerBChoice: null,
        bothPicked: false,
        rpsResult: null,
        rpsTurn: 'A',
      })
    } else {
      // Winner decided — move to chess phase
      await write({ rpsTurn: 'move' })
    }
  }, [fb, write])

  /**
   * Submit a chess move. Only the player with moveRights can submit.
   * Validates locally via chess.js, then writes the result to Firebase.
   */
  const submitChessMove = useCallback(
    async (from, to, promotion) => {
      if (!fb) return false
      if (fb.rpsTurn !== 'move') return false
      if (isGameOver) return false
      if (!fb.moveRights) return false

      // Only the player who has move rights can submit
      const moverColor = fb.moveRights
      if ((identity === 'A' && moverColor !== 'w') ||
          (identity === 'B' && moverColor !== 'b')) {
        return false
      }

      // Validate the move with chess.js
      const adjustedFen = setFenActiveColor(fb.fen, moverColor)
      let gameCopy
      try { gameCopy = new Chess(adjustedFen) }
      catch { return false }

      const move = gameCopy.move(
        promotion ? { from, to, promotion } : { from, to }
      )
      if (!move) return false

      const capturedKing = move.captured === 'k'
      const newFen = gameCopy.fen()

      // Build move record
      const prevHistory = safeArr(fb.moveHistory)
      const newRecord = createMoveRecord(move, moverColor, prevHistory.length + 1)

      // Build captures
      const prevCaptured = fb.capturedPieces ?? { w: [], b: [] }
      const newCaptured = { ...prevCaptured }
      if (move.captured) {
        newCaptured[moverColor] = [...safeArr(prevCaptured[moverColor]), move.captured]
      }

      // Determine new game status
      let newGameStatus = 'playing'
      let newWinningColor = null
      let newDrawReason = null

      if (capturedKing) {
        newGameStatus = 'kingCapture'
        newWinningColor = moverColor
      } else if (gameCopy.isCheckmate()) {
        newGameStatus = 'checkmate'
        newWinningColor = moverColor
      } else if (gameCopy.isStalemate()) {
        newGameStatus = 'stalemate'
        newDrawReason = 'stalemate'
      } else if (gameCopy.isDraw()) {
        newGameStatus = 'draw'
        newDrawReason = getDrawReason(gameCopy)
      } else if (gameCopy.isCheck()) {
        newGameStatus = 'check'
      }

      await write({
        fen: newFen,
        gameStatus: newGameStatus,
        winningColor: newWinningColor,
        drawReason: newDrawReason,
        moveHistory: [...prevHistory, newRecord],
        capturedPieces: newCaptured,
        // Reset RPS for next round
        rpsTurn: 'A',
        playerAChoice: null,
        playerBChoice: null,
        bothPicked: false,
        rpsResult: null,
        moveRights: null,
        roundNumber: (fb.roundNumber ?? 1) + 1,
      })

      return true
    },
    [fb, identity, isGameOver, write]
  )

  /**
   * Reset the game (new board, same room & players).
   */
  const resetGame = useCallback(async () => {
    if (!fb) return
    await write({
      fen: INITIAL_FEN,
      rpsTurn: 'A',
      playerAChoice: null,
      playerBChoice: null,
      bothPicked: false,
      rpsResult: null,
      moveRights: null,
      gameStatus: 'playing',
      winningColor: null,
      drawReason: null,
      consecutiveWins: { w: 0, b: 0 },
      totalRPSWins: { w: 0, b: 0 },
      moveHistory: [],
      capturedPieces: { w: [], b: [] },
      roundNumber: 1,
    })
  }, [fb, write])

  // ═══════════════════════════════════════════════════════════
  // Return — matches the local useRPSChess shape + extras
  // ═══════════════════════════════════════════════════════════
  return {
    // Connection
    connected,
    opponentJoined,
    playerNames,

    // Chess
    game,
    fen,
    chessTurn,
    gameStatus,
    winningColor,
    drawReason,
    statusLabel,
    isGameOver,

    // RPS
    rpsPhase,
    playerAPick,
    playerBPick,
    rpsResult,
    roundNumber,

    // Move rights & stats
    moveGrantedTo,
    consecutiveWins,
    totalRPSWins,
    moveHistory,
    capturedPieces,

    // Actions
    submitRPSChoice,
    advanceFromReveal,
    submitChessMove,
    resetGame,
  }
}
