import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

function getMoveBadge(move) {
  if (move.isEnPassant) return 'e.p.'
  if (move.isPromotion) return `=${move.promotion?.toUpperCase() ?? 'Q'}`
  if (move.isCastle) return move.castleSide === 'kingside' ? 'O-O' : 'O-O-O'
  return null
}

export function MoveHistory({ moves, playerNames }) {
  const scrollRef = useRef(null)

  // Auto-scroll to bottom when new moves arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [moves.length])

  // Show last 10 moves
  const recentMoves = moves.slice(-10)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="move-history-panel"
    >
      <h4 className="font-mono text-[0.65rem] text-smoke/50 uppercase tracking-[0.18em] mb-2">
        Move Log
      </h4>
      <div className="gold-divider mb-2" />

      <div
        ref={scrollRef}
        className="move-history-scroll"
      >
        {moves.length === 0 ? (
          <p className="font-mono text-xs text-smoke/25 text-center py-3">
            No moves yet
          </p>
        ) : (
          recentMoves.map((move) => {
            const playerName =
              move.color === 'w' ? playerNames.white : playerNames.black
            const colorDot = move.color === 'w' ? 'bg-ivory' : 'bg-charcoal-mid border border-smoke/40'
            const moveBadge = getMoveBadge(move)
            return (
              <div
                key={move.id}
                className="flex items-center gap-2 py-1 px-1 rounded-sm
                           hover:bg-charcoal-mid/40 transition-colors duration-100"
              >
                {/* Move number */}
                <span className="font-mono text-[0.6rem] text-smoke/30 w-5 text-right shrink-0">
                  {move.id}.
                </span>
                {/* Color dot */}
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${colorDot}`}
                />
                {/* SAN notation */}
                <span className="font-mono text-xs text-gold font-medium">
                  {move.san}
                </span>
                {moveBadge && (
                  <span className="rounded-sm border border-gold-dim/20 bg-gold/8 px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.12em] text-gold/80">
                    {moveBadge}
                  </span>
                )}
                {/* Player name */}
                <span className="font-mono text-[0.6rem] text-smoke/40 truncate ml-auto">
                  {playerName}
                </span>
                {/* Capture indicator */}
                {move.captured && (
                  <span className="text-[0.6rem] text-red-400/70">✕</span>
                )}
              </div>
            )
          })
        )}
      </div>
    </motion.div>
  )
}
