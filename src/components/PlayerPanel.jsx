import { motion } from 'framer-motion'

// ─── Piece symbol mapping ────────────────────────────────────
// capturedPieces.w = pieces White has taken (Black's pieces)
// capturedPieces.b = pieces Black has taken (White's pieces)
const CAPTURED_SYMBOLS = {
  w: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' }, // black piece symbols
  b: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕' }, // white piece symbols
}

// Piece value for sorting: q > r > b > n > p
const PIECE_ORDER = { q: 0, r: 1, b: 2, n: 3, p: 4 }

export function PlayerPanel({
  color,           // 'w' | 'b'
  name,            // player display name
  isActive,        // is it this player's turn to act (RPS or chess move)
  consecutiveWins, // current streak number
  totalRPSWins,    // session total
  capturedPieces,  // array of piece type chars captured BY this player
}) {
  const icon = color === 'w' ? '♔' : '♚'
  const colorLabel = color === 'w' ? 'White' : 'Black'

  // Sort captured pieces by value (most valuable first)
  const sortedCaptures = [...capturedPieces].sort(
    (a, b) => PIECE_ORDER[a] - PIECE_ORDER[b]
  )

  return (
    <motion.div
      initial={{ opacity: 0, x: color === 'w' ? 30 : -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className={`player-panel ${isActive ? 'player-panel--active' : ''}`}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-2xl ${isActive ? 'gold-glow' : ''}`}>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <h3
            className={`font-heading text-lg font-semibold truncate
              ${isActive ? 'text-gold' : 'text-parchment/70'}`}
          >
            {name}
          </h3>
          <span className="font-mono text-[0.6rem] text-smoke/50 uppercase tracking-[0.15em]">
            {colorLabel}
          </span>
        </div>
      </div>

      <div className="gold-divider mb-3" />

      {/* ── RPS Stats ── */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="panel-stat">
          <span className="panel-stat-label">RPS Wins</span>
          <span className="panel-stat-value">{totalRPSWins}</span>
        </div>
        <div className="panel-stat">
          <span className="panel-stat-label">Streak</span>
          <span className="panel-stat-value">
            {consecutiveWins > 0 ? `${consecutiveWins}🔥` : '—'}
          </span>
        </div>
      </div>

      {/* ── Captured Pieces ── */}
      <div className="mb-1">
        <span className="font-mono text-[0.6rem] text-smoke/40 uppercase tracking-[0.12em]">
          Captured
        </span>
        <div className="mt-1 min-h-[1.5rem] flex flex-wrap gap-0.5">
          {sortedCaptures.length === 0 ? (
            <span className="font-mono text-xs text-smoke/25">—</span>
          ) : (
            sortedCaptures.map((piece, i) => (
              <span
                key={`${piece}-${i}`}
                className="text-lg leading-none opacity-80"
              >
                {CAPTURED_SYMBOLS[color][piece]}
              </span>
            ))
          )}
        </div>
      </div>
    </motion.div>
  )
}
