import { AnimatePresence, motion } from 'framer-motion'

const PROMOTION_OPTIONS = [
  { piece: 'q', label: 'Queen', whiteIcon: '♕', blackIcon: '♛' },
  { piece: 'r', label: 'Rook', whiteIcon: '♖', blackIcon: '♜' },
  { piece: 'b', label: 'Bishop', whiteIcon: '♗', blackIcon: '♝' },
  { piece: 'n', label: 'Knight', whiteIcon: '♘', blackIcon: '♞' },
]

export function PromotionModal({ pendingPromotion, onSelect, onCancel }) {
  const isVisible = Boolean(pendingPromotion)
  const activeColor = pendingPromotion?.color ?? 'w'

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[55] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            className="relative z-10 w-full max-w-sm mx-4 rounded-lg border border-gold-dim/50
                       bg-charcoal-light p-6 gold-border-glow"
          >
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-smoke/50 text-center mb-2">
              Pawn Promotion
            </p>
            <h2 className="font-heading text-3xl text-gold gold-glow text-center mb-2">
              Choose a piece
            </h2>
            <p className="font-mono text-xs text-parchment/70 text-center tracking-wide mb-5">
              Complete the move by selecting the promoted piece.
            </p>

            <div className="gold-divider mb-5" />

            <div className="grid grid-cols-2 gap-3">
              {PROMOTION_OPTIONS.map((option) => (
                <motion.button
                  key={option.piece}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onSelect(option.piece)}
                  className="promotion-option"
                >
                  <span className="promotion-option__icon">
                    {activeColor === 'w' ? option.whiteIcon : option.blackIcon}
                  </span>
                  <span className="promotion-option__label">{option.label}</span>
                </motion.button>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCancel}
              className="mt-5 w-full rounded-sm border border-smoke/20 px-4 py-2
                         font-mono text-xs uppercase tracking-[0.15em] text-smoke
                         transition-colors duration-200 hover:border-smoke/40 hover:text-ivory"
            >
              Cancel
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
