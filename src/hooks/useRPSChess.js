import { useState, useCallback, useMemo } from 'react'
import { Chess } from 'chess.js'

// ─── Constants ───────────────────────────────────────────────
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

// ─── FEN Helpers ─────────────────────────────────────────────
function setFenActiveColor(fen, color) {
  const parts = fen.split(' ')
  parts[1] = color
  return parts.join(' ')
}

function getDrawReason(game) {
  if (game.isStalemate()) return DRAW_REASON.STALEMATE
  if (game.isInsufficientMaterial()) return DRAW_REASON.INSUFFICIENT_MATERIAL
  if (game.isThreefoldRepetition()) return DRAW_REASON.THREEFOLD_REPETITION
  if (game.isDrawByFiftyMoves()) return DRAW_REASON.FIFTY_MOVE_RULE
  return null
}

function createMoveRecord(move, color, id) {
  const isKingsideCastle = move.isKingsideCastle()
  const isQueensideCastle = move.isQueensideCastle()

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
    isCapture: move.isCapture(),
    isPromotion: move.isPromotion(),
    isEnPassant: move.isEnPassant(),
    isCastle: isKingsideCastle || isQueensideCastle,
    castleSide: isKingsideCastle ? 'kingside' : isQueensideCastle ? 'queenside' : null,
  }
}

// ─── Hook ────────────────────────────────────────────────────
export function useRPSChess() {
  // ── Chess state ──
  const [game, setGame] = useState(new Chess())

  // ── RPS round state ──
  const [rpsPhase, setRpsPhase] = useState(RPS_PHASE.AWAITING_PLAYER_A)
  const [playerAPick, setPlayerAPick] = useState(null)
  const [playerBPick, setPlayerBPick] = useState(null)
  const [rpsResult, setRpsResult] = useState(null)

  // ── Move rights ──
  const [moveGrantedTo, setMoveGrantedTo] = useState(null)
  const [kingCapturedBy, setKingCapturedBy] = useState(null)

  // ── Streaks (consecutive RPS wins without the other player winning) ──
  const [consecutiveWins, setConsecutiveWins] = useState({ w: 0, b: 0 })

  // ── Total RPS wins across the entire session ──
  const [totalRPSWins, setTotalRPSWins] = useState({ w: 0, b: 0 })

  // ── Move history: array of { id, san, color, captured } ──
  const [moveHistory, setMoveHistory] = useState([])

  // ── Captured pieces: keyed by the capturing player's color ──
  // Each value is an array of piece types (e.g. ['p','n','q'])
  // capturedPieces.w = pieces White has taken from Black
  const [capturedPieces, setCapturedPieces] = useState({ w: [], b: [] })

  // ── Round counter ──
  const [roundNumber, setRoundNumber] = useState(1)

  // ── Derived ──
  const chessTurn = game.turn()
  const drawReason = useMemo(() => getDrawReason(game), [game])

  const gameStatus = useMemo(() => {
    if (kingCapturedBy) return GAME_STATUS.KING_CAPTURE
    if (game.isCheckmate()) return GAME_STATUS.CHECKMATE
    if (game.isStalemate()) return GAME_STATUS.STALEMATE
    if (game.isDraw()) return GAME_STATUS.DRAW
    if (game.isCheck()) return GAME_STATUS.CHECK
    return GAME_STATUS.PLAYING
  }, [game, kingCapturedBy])

  const winningColor = useMemo(() => {
    if (kingCapturedBy) return kingCapturedBy
    if (gameStatus === GAME_STATUS.CHECKMATE) {
      return chessTurn === 'w' ? 'b' : 'w'
    }
    return null
  }, [kingCapturedBy, gameStatus, chessTurn])

  const isGameOver = useMemo(
    () =>
      gameStatus === GAME_STATUS.KING_CAPTURE ||
      gameStatus === GAME_STATUS.CHECKMATE ||
      gameStatus === GAME_STATUS.STALEMATE ||
      gameStatus === GAME_STATUS.DRAW,
    [gameStatus]
  )

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
        if (drawReason === DRAW_REASON.INSUFFICIENT_MATERIAL) {
          return 'Draw — Insufficient material'
        }
        if (drawReason === DRAW_REASON.THREEFOLD_REPETITION) {
          return 'Draw — Threefold repetition'
        }
        if (drawReason === DRAW_REASON.FIFTY_MOVE_RULE) {
          return 'Draw — 50-move rule'
        }
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

  // ── submitRPSChoice ──
  const submitRPSChoice = useCallback(
    (choice) => {
      if (!RPS_CHOICES.includes(choice)) return
      if (isGameOver) return

      if (rpsPhase === RPS_PHASE.AWAITING_PLAYER_A) {
        setPlayerAPick(choice)
        setRpsPhase(RPS_PHASE.AWAITING_PLAYER_B)
        return
      }

      if (rpsPhase === RPS_PHASE.AWAITING_PLAYER_B) {
        setPlayerBPick(choice)
        const result = resolveRPS(playerAPick, choice)
        setRpsResult(result)
        setRpsPhase(RPS_PHASE.REVEALING)

        if (result !== 'tie') {
          const winnerColor = result === 'A' ? 'w' : 'b'
          setMoveGrantedTo(winnerColor)
          setConsecutiveWins((prev) => ({
            [winnerColor]: prev[winnerColor] + 1,
            [winnerColor === 'w' ? 'b' : 'w']: 0,
          }))
          setTotalRPSWins((prev) => ({
            ...prev,
            [winnerColor]: prev[winnerColor] + 1,
          }))
        }
      }
    },
    [rpsPhase, playerAPick, isGameOver]
  )

  // ── advanceFromReveal ──
  const advanceFromReveal = useCallback(() => {
    if (rpsPhase !== RPS_PHASE.REVEALING) return

    if (rpsResult === 'tie') {
      setPlayerAPick(null)
      setPlayerBPick(null)
      setRpsResult(null)
      setRpsPhase(RPS_PHASE.AWAITING_PLAYER_A)
    } else {
      setRpsPhase(RPS_PHASE.AWAITING_CHESS_MOVE)
    }
  }, [rpsPhase, rpsResult])

  // ── submitChessMove ──
  const submitChessMove = useCallback(
    (from, to, promotion) => {
      if (rpsPhase !== RPS_PHASE.AWAITING_CHESS_MOVE) return false
      if (isGameOver) return false
      if (!moveGrantedTo) return false

      const adjustedFen = setFenActiveColor(game.fen(), moveGrantedTo)
      const gameCopy = new Chess(adjustedFen)

      const move = gameCopy.move(
        promotion ? { from, to, promotion } : { from, to }
      )
      if (!move) return false

      const capturedKing = move.captured === 'k'

      // Track the move
      setMoveHistory((prev) => [
        ...prev,
        createMoveRecord(move, moveGrantedTo, prev.length + 1),
      ])

      // Track captures
      if (move.captured) {
        setCapturedPieces((prev) => ({
          ...prev,
          [moveGrantedTo]: [...prev[moveGrantedTo], move.captured],
        }))
      }

      // Persist new position
      setGame(gameCopy)
      if (capturedKing) {
        setKingCapturedBy(moveGrantedTo)
      }

      // Start fresh RPS round
      setPlayerAPick(null)
      setPlayerBPick(null)
      setRpsResult(null)
      setMoveGrantedTo(null)
      setRpsPhase(RPS_PHASE.AWAITING_PLAYER_A)
      setRoundNumber((n) => n + 1)

      return true
    },
    [game, rpsPhase, moveGrantedTo, isGameOver]
  )

  // ── resetGame ──
  const resetGame = useCallback(() => {
    setGame(new Chess())
    setRpsPhase(RPS_PHASE.AWAITING_PLAYER_A)
    setPlayerAPick(null)
    setPlayerBPick(null)
    setRpsResult(null)
    setMoveGrantedTo(null)
    setKingCapturedBy(null)
    setConsecutiveWins({ w: 0, b: 0 })
    setTotalRPSWins({ w: 0, b: 0 })
    setMoveHistory([])
    setCapturedPieces({ w: [], b: [] })
    setRoundNumber(1)
  }, [])

  return {
    // Chess
    game,
    fen: game.fen(),
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
