import { useState, useMemo, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnlineRPSChess, RPS_PHASE, GAME_STATUS } from '../hooks/useOnlineRPSChess'
import { RPSModal } from '../components/RPSModal'
import { GameOverOverlay } from '../components/GameOverOverlay'
import { PromotionModal } from '../components/PromotionModal'
import { PlayerPanel } from '../components/PlayerPanel'
import { MoveHistory } from '../components/MoveHistory'
import { PlayerProvider, usePlayer } from '../context/PlayerContext'

// ─── localStorage helpers ────────────────────────────────────
function loadPlayerIdentity(roomId) {
  try {
    const raw = localStorage.getItem(`rps-chess-${roomId}`)
    if (!raw) return null
    return JSON.parse(raw) // { identity: 'A'|'B', name: string }
  } catch {
    return null
  }
}

// ─── FEN helper ──────────────────────────────────────────────
function setFenActiveColor(fen, color) {
  const parts = fen.split(' ')
  parts[1] = color
  return parts.join(' ')
}

function isPromotionMove(move) {
  if (typeof move?.isPromotion === 'function') return move.isPromotion()
  return Boolean(move?.promotion) || move?.flags?.includes('p')
}

// ─── Square style constants ─────────────────────────────────
const SELECTED_STYLE = { backgroundColor: 'rgba(201, 168, 76, 0.4)' }
const VALID_MOVE_STYLE = {
  background: 'radial-gradient(circle, rgba(201,168,76,0.45) 24%, transparent 25%)',
  cursor: 'pointer',
}
const VALID_CAPTURE_STYLE = {
  background: 'radial-gradient(transparent 51%, rgba(201,168,76,0.45) 51%)',
  cursor: 'pointer',
}
const CHECK_STYLE = {
  background: 'radial-gradient(ellipse at center, rgba(220,38,38,0.7) 0%, rgba(220,38,38,0.25) 60%, transparent 100%)',
}

function findKingSquare(game, color) {
  for (const row of game.board()) {
    for (const piece of row) {
      if (piece && piece.type === 'k' && piece.color === color) return piece.square
    }
  }
  return null
}

// ═══════════════════════════════════════════════════════════════
// Waiting screen (shown while Player B hasn't joined)
// ═══════════════════════════════════════════════════════════════
function WaitingForOpponent({ roomId }) {
  return (
    <div className="app-shell min-h-screen flex items-center justify-center px-4 bg-charcoal">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <span className="text-5xl block mb-4 select-none">♔</span>
        <h1 className="font-heading text-4xl text-gold gold-glow mb-2">
          Waiting for Opponent
        </h1>
        <div className="gold-divider w-32 mx-auto mt-2 mb-6" />

        <p className="font-mono text-sm text-parchment/70 mb-2">
          Share this room code:
        </p>
        <motion.div
          className="inline-block px-6 py-3 border-2 border-gold rounded-sm
                     font-mono text-2xl text-gold tracking-[0.4em] gold-border-glow
                     select-all cursor-pointer"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigator.clipboard?.writeText(roomId)}
          title="Click to copy"
        >
          {roomId}
        </motion.div>
        <p className="font-mono text-[0.6rem] text-smoke/30 mt-3 tracking-wider">
          CLICK TO COPY • WAITING FOR PLAYER 2…
        </p>

        {/* Pulsing dots */}
        <div className="flex justify-center gap-2 mt-6">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-gold/50"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Inner game component (has access to PlayerContext + online hook)
// ═══════════════════════════════════════════════════════════════
function GameInner({
  game, fen, chessTurn, gameStatus, winningColor, drawReason, statusLabel,
  isGameOver, rpsPhase, playerAPick, playerBPick, rpsResult, roundNumber,
  moveGrantedTo, consecutiveWins, totalRPSWins, moveHistory, capturedPieces,
  resetGame, submitChessMove, submitRPSChoice, advanceFromReveal,
  playerNames,
}) {
  const player = usePlayer()
  const navigate = useNavigate()

  // ── Board interaction state ──
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [validMoves, setValidMoves] = useState([])
  const [pendingPromotion, setPendingPromotion] = useState(null)

  const isChessMovePhase = rpsPhase === RPS_PHASE.AWAITING_CHESS_MOVE && !isGameOver

  const clearBoardSelection = useCallback(() => {
    setSelectedSquare(null)
    setValidMoves([])
  }, [])

  const getInteractiveGame = useCallback(() => {
    if (!moveGrantedTo || !isChessMovePhase) return null
    try {
      return new Chess(setFenActiveColor(game.fen(), moveGrantedTo))
    } catch { return null }
  }, [game, moveGrantedTo, isChessMovePhase])

  const getMoveOptions = useCallback(
    (from, to) => {
      const temp = getInteractiveGame()
      if (!temp) return []
      return temp.moves({ square: from, verbose: true }).filter((m) => m.to === to)
    },
    [getInteractiveGame]
  )

  const activeColor = useMemo(() => {
    if (isChessMovePhase) return moveGrantedTo
    if (rpsPhase === RPS_PHASE.AWAITING_PLAYER_A) return 'w'
    if (rpsPhase === RPS_PHASE.AWAITING_PLAYER_B) return 'b'
    return null
  }, [rpsPhase, moveGrantedTo, isChessMovePhase])

  const computeValidMoves = useCallback(
    (square) => {
      const temp = getInteractiveGame()
      if (!temp) return []
      return temp.moves({ square, verbose: true })
    },
    [getInteractiveGame]
  )

  const selectSquare = useCallback(
    (square) => {
      const temp = getInteractiveGame()
      if (!temp) { clearBoardSelection(); return }
      const piece = temp.get(square)
      if (piece && piece.color === moveGrantedTo) {
        setSelectedSquare(square)
        setValidMoves(computeValidMoves(square))
        return
      }
      clearBoardSelection()
    },
    [getInteractiveGame, moveGrantedTo, computeValidMoves, clearBoardSelection]
  )

  const attemptMove = useCallback(
    (from, to) => {
      if (!isChessMovePhase) return false
      // Only the player with move rights can interact
      if (player && moveGrantedTo !== player.color) return false

      const moveOptions = getMoveOptions(from, to)
      if (moveOptions.length === 0) return false

      const promotionChoices = moveOptions
        .filter(isPromotionMove)
        .map((m) => m.promotion)
        .filter(Boolean)

      if (promotionChoices.length > 0) {
        setPendingPromotion({ from, to, color: moveGrantedTo, options: [...new Set(promotionChoices)] })
        clearBoardSelection()
        return false
      }

      const ok = submitChessMove(from, to)
      clearBoardSelection()
      return ok
    },
    [isChessMovePhase, player, moveGrantedTo, getMoveOptions, submitChessMove, clearBoardSelection]
  )

  const kingInCheckSquare = useMemo(() => {
    if (gameStatus !== GAME_STATUS.CHECK && gameStatus !== GAME_STATUS.CHECKMATE) return null
    return findKingSquare(game, game.turn())
  }, [game, gameStatus])

  const customSquareStyles = useMemo(() => {
    const styles = {}
    if (selectedSquare) styles[selectedSquare] = SELECTED_STYLE
    for (const move of validMoves) {
      const isCapture =
        (typeof move.isCapture === 'function' && move.isCapture()) ||
        Boolean(move.captured) || move.flags?.includes('e')
      styles[move.to] = isCapture ? VALID_CAPTURE_STYLE : VALID_MOVE_STYLE
    }
    if (kingInCheckSquare) {
      styles[kingInCheckSquare] = { ...styles[kingInCheckSquare], ...CHECK_STYLE }
    }
    return styles
  }, [selectedSquare, validMoves, kingInCheckSquare])

  const canDragPiece = useCallback(
    ({ piece, square }) => {
      if (!isChessMovePhase || !piece || !square) return false
      // Only the player whose turn it is can drag
      if (player && moveGrantedTo !== player.color) return false
      const pieceColor = piece.pieceType?.[0] === 'w' ? 'w' : 'b'
      return pieceColor === moveGrantedTo
    },
    [isChessMovePhase, moveGrantedTo, player]
  )

  const onPieceDrag = useCallback(({ square }) => {
    if (square) selectSquare(square)
  }, [selectSquare])

  const onPieceClick = useCallback(({ square }) => {
    if (square) selectSquare(square)
  }, [selectSquare])

  const onDrop = useCallback(
    ({ sourceSquare, targetSquare }) => {
      if (!sourceSquare || !targetSquare) { clearBoardSelection(); return false }
      return attemptMove(sourceSquare, targetSquare)
    },
    [attemptMove, clearBoardSelection]
  )

  const onSquareClick = useCallback(
    ({ square }) => {
      if (!isChessMovePhase) { clearBoardSelection(); return }
      if (player && moveGrantedTo !== player.color) { clearBoardSelection(); return }

      const targetMoves = validMoves.filter((m) => m.to === square)
      if (targetMoves.length > 0) {
        if (targetMoves.some(isPromotionMove)) {
          const promotionChoices = targetMoves.map((m) => m.promotion).filter(Boolean)
          setPendingPromotion({ from: targetMoves[0].from, to: square, color: moveGrantedTo, options: [...new Set(promotionChoices)] })
          clearBoardSelection()
          return
        }
        submitChessMove(targetMoves[0].from, targetMoves[0].to)
        clearBoardSelection()
        return
      }
      selectSquare(square)
    },
    [isChessMovePhase, player, moveGrantedTo, validMoves, submitChessMove, selectSquare, clearBoardSelection]
  )

  const onSquareRightClick = useCallback(() => clearBoardSelection(), [clearBoardSelection])

  const handleNewGame = useCallback(() => {
    clearBoardSelection()
    setPendingPromotion(null)
    resetGame()
  }, [clearBoardSelection, resetGame])

  const handleLeave = useCallback(() => {
    clearBoardSelection()
    setPendingPromotion(null)
    navigate('/')
  }, [clearBoardSelection, navigate])

  const handlePromotionSelect = useCallback(
    (piece) => {
      if (!pendingPromotion) return
      submitChessMove(pendingPromotion.from, pendingPromotion.to, piece)
      setPendingPromotion(null)
      clearBoardSelection()
    },
    [pendingPromotion, submitChessMove, clearBoardSelection]
  )

  const handlePromotionCancel = useCallback(() => {
    setPendingPromotion(null)
    clearBoardSelection()
  }, [clearBoardSelection])

  const chessboardOptions = useMemo(
    () => ({
      id: 'rps-chess-board',
      position: fen,
      onPieceDrop: onDrop,
      onSquareClick,
      onSquareRightClick,
      onPieceClick,
      onPieceDrag,
      canDragPiece,
      squareStyles: customSquareStyles,
      boardStyle: { borderRadius: '0px', width: '100%' },
      darkSquareStyle: { backgroundColor: '#3d3426' },
      lightSquareStyle: { backgroundColor: '#c9a84c' },
      dropSquareStyle: { boxShadow: 'inset 0 0 1px 6px rgba(201,168,76,0.4)' },
      animationDurationInMs: 200,
    }),
    [fen, onDrop, onSquareClick, onSquareRightClick, onPieceClick, onPieceDrag, canDragPiece, customSquareStyles]
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="app-shell min-h-screen flex flex-col items-center px-3 py-5 bg-charcoal"
    >
      {/* ── Overlays ── */}
      <RPSModal
        rpsPhase={rpsPhase}
        playerAPick={playerAPick}
        playerBPick={playerBPick}
        rpsResult={rpsResult}
        roundNumber={roundNumber}
        submitRPSChoice={submitRPSChoice}
        advanceFromReveal={advanceFromReveal}
        isGameOver={isGameOver}
      />
      <PromotionModal
        pendingPromotion={pendingPromotion}
        onSelect={handlePromotionSelect}
        onCancel={handlePromotionCancel}
      />
      <GameOverOverlay
        isGameOver={isGameOver}
        gameStatus={gameStatus}
        drawReason={drawReason}
        chessTurn={chessTurn}
        winningColor={winningColor}
        onRestart={handleNewGame}
      />

      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-2"
      >
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-gold gold-glow tracking-tight">
          RPS Chess
        </h1>
        <div className="gold-divider w-32 mx-auto mt-2 mb-1" />
        {player?.roomId && (
          <p className="font-mono text-[0.6rem] text-smoke/40 tracking-[0.2em] uppercase mt-1">
            Room: {player.roomId}
          </p>
        )}
      </motion.header>

      {/* ── Phase / Your-Move Indicator ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={rpsPhase + (moveGrantedTo || '')}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="mb-4"
        >
          {isChessMovePhase ? (
            <div className="move-indicator status-badge">
              <span className={`move-indicator-dot ${
                moveGrantedTo === 'w' ? 'move-indicator-dot--white' : 'move-indicator-dot--black'
              }`} />
              <span>
                {moveGrantedTo === 'w' ? playerNames.white : playerNames.black} — Your move
              </span>
            </div>
          ) : (
            <div className="status-badge">
              {rpsPhase === RPS_PHASE.AWAITING_PLAYER_A && `${playerNames.white}: Pick RPS`}
              {rpsPhase === RPS_PHASE.AWAITING_PLAYER_B && `${playerNames.black}: Pick RPS`}
              {rpsPhase === RPS_PHASE.REVEALING && 'Revealing…'}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Arena: Side Panels + Board ── */}
      <div className="game-arena">
        <PlayerPanel
          color="b"
          name={playerNames.black}
          isActive={activeColor === 'b'}
          consecutiveWins={consecutiveWins.b}
          totalRPSWins={totalRPSWins.b}
          capturedPieces={capturedPieces.b}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="board-container board-frame"
        >
          <Chessboard options={chessboardOptions} />
        </motion.div>

        <PlayerPanel
          color="w"
          name={playerNames.white}
          isActive={activeColor === 'w'}
          consecutiveWins={consecutiveWins.w}
          totalRPSWins={totalRPSWins.w}
          capturedPieces={capturedPieces.w}
        />
      </div>

      {/* ── Move History ── */}
      <div className="mt-4 w-full flex justify-center">
        <MoveHistory moves={moveHistory} playerNames={playerNames} />
      </div>

      {/* ── Status + Controls ── */}
      <motion.div
        className="mt-4 flex flex-col items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={statusLabel}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="status-badge"
          >
            {statusLabel}
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleNewGame}
            className="font-mono text-xs uppercase tracking-[0.12em] px-5 py-2
                       border border-gold-dim text-gold bg-transparent rounded-sm
                       cursor-pointer transition-all duration-200
                       hover:bg-gold hover:text-charcoal hover:border-gold"
          >
            New Game
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleLeave}
            className="font-mono text-xs uppercase tracking-[0.12em] px-5 py-2
                       border border-smoke/30 text-smoke bg-transparent rounded-sm
                       cursor-pointer transition-all duration-200
                       hover:border-smoke/50 hover:text-ivory"
          >
            Leave
          </motion.button>
        </div>
      </motion.div>

      {/* ── Footer ── */}
      <footer className="mt-6 text-smoke/30 text-[0.6rem] font-mono tracking-wider">
        ♔ RPS CHESS — ALL RIGHTS RESERVED
      </footer>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Outer wrapper: reads identity, connects to Firebase, provides
// PlayerContext to all children.
// ═══════════════════════════════════════════════════════════════
export function GameScreen() {
  const { roomId } = useParams()
  const navigate = useNavigate()

  // Load player identity from localStorage
  const stored = loadPlayerIdentity(roomId)

  // If no identity found, redirect home
  useEffect(() => {
    if (!stored) {
      navigate('/', { replace: true })
    }
  }, [stored, navigate])

  // Use the Firebase-synced hook
  const hookData = useOnlineRPSChess(roomId, stored?.identity ?? 'A')

  if (!stored) return null

  // Build PlayerContext value
  const playerValue = {
    identity: stored.identity,
    color: stored.identity === 'A' ? 'w' : 'b',
    name: stored.name,
    roomId,
  }

  // Show loading until first Firebase snapshot arrives
  if (!hookData.connected) {
    return (
      <div className="app-shell min-h-screen flex items-center justify-center bg-charcoal">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-mono text-sm text-smoke/50 tracking-wider"
        >
          Connecting…
        </motion.p>
      </div>
    )
  }

  // Player A waits for Player B to join
  if (stored.identity === 'A' && !hookData.opponentJoined) {
    return <WaitingForOpponent roomId={roomId} />
  }

  // Player names come from Firebase now
  const { playerNames } = hookData

  return (
    <PlayerProvider value={playerValue}>
      <GameInner
        {...hookData}
        playerNames={playerNames}
      />
    </PlayerProvider>
  )
}
