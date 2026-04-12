import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RPS_PHASE, RPS_CHOICES } from '../hooks/useRPSChess'

// ─── Choice display config ──────────────────────────────────
const CHOICE_MAP = {
  rock: { emoji: '✊', label: 'Rock' },
  paper: { emoji: '✋', label: 'Paper' },
  scissors: { emoji: '✌️', label: 'Scissors' },
}

// ─── Framer variants ────────────────────────────────────────
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.88, y: 24 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 28, stiffness: 340 },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: -16,
    transition: { duration: 0.25, ease: 'easeIn' },
  },
}

const choiceRevealVariants = {
  hidden: { opacity: 0, scale: 0.5, rotateY: 90 },
  visible: {
    opacity: 1,
    scale: 1,
    rotateY: 0,
    transition: { type: 'spring', damping: 18, stiffness: 260, delay: 0.15 },
  },
}

const buttonVariants = {
  idle: { scale: 1 },
  hover: { scale: 1.07, y: -2 },
  tap: { scale: 0.94 },
}

const resultTextVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { delay: 0.45, duration: 0.35 } },
}

// ─── Sub-components ─────────────────────────────────────────

/** Three RPS buttons for the active player */
function RPSButtonGroup({ onPick }) {
  return (
    <div className="flex flex-col gap-2.5">
      {RPS_CHOICES.map((choice) => (
        <motion.button
          key={choice}
          variants={buttonVariants}
          initial="idle"
          whileHover="hover"
          whileTap="tap"
          onClick={() => onPick(choice)}
          className="flex items-center justify-center gap-2
                     px-5 py-2.5 rounded-sm cursor-pointer
                     border border-gold-dim/60 bg-charcoal-mid/60
                     font-mono text-sm text-ivory tracking-wide
                     transition-colors duration-150
                     hover:border-gold hover:bg-gold/10"
        >
          <span className="text-xl">{CHOICE_MAP[choice].emoji}</span>
          <span>{CHOICE_MAP[choice].label}</span>
        </motion.button>
      ))}
    </div>
  )
}

/** Locked placeholder when a player has already picked */
function LockedPlaceholder() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-center h-full
                 px-4 py-8 rounded-sm
                 border border-charcoal-mid bg-charcoal-mid/40
                 font-mono text-sm text-smoke/60 tracking-wider"
    >
      Choice locked 🔒
    </motion.div>
  )
}

/** Large emoji reveal for a single choice */
function ChoiceReveal({ choice, isWinner }) {
  return (
    <motion.div
      variants={choiceRevealVariants}
      initial="hidden"
      animate="visible"
      className={`flex flex-col items-center gap-2 py-4 px-6 rounded-sm
                  ${isWinner ? 'rps-winner-glow' : ''}`}
    >
      <motion.span
        className="text-5xl"
        animate={
          isWinner
            ? { scale: [1, 1.15, 1], transition: { repeat: 2, duration: 0.5 } }
            : {}
        }
      >
        {CHOICE_MAP[choice].emoji}
      </motion.span>
      <span className={`font-mono text-xs uppercase tracking-widest
                        ${isWinner ? 'text-gold' : 'text-smoke'}`}>
        {CHOICE_MAP[choice].label}
      </span>
    </motion.div>
  )
}

// ─── Main Component ─────────────────────────────────────────
export function RPSModal({
  rpsPhase,
  playerAPick,
  playerBPick,
  rpsResult,
  roundNumber,
  submitRPSChoice,
  advanceFromReveal,
  isGameOver,
}) {
  const isVisible =
    !isGameOver &&
    (rpsPhase === RPS_PHASE.AWAITING_PLAYER_A ||
      rpsPhase === RPS_PHASE.AWAITING_PLAYER_B ||
      rpsPhase === RPS_PHASE.REVEALING)

  const isPlayerAPicking = rpsPhase === RPS_PHASE.AWAITING_PLAYER_A
  const isPlayerBPicking = rpsPhase === RPS_PHASE.AWAITING_PLAYER_B
  const isRevealing = rpsPhase === RPS_PHASE.REVEALING

  // Auto-advance after reveal
  useEffect(() => {
    if (rpsPhase !== RPS_PHASE.REVEALING) return
    const delay = rpsResult === 'tie' ? 1400 : 1800
    const timer = setTimeout(advanceFromReveal, delay)
    return () => clearTimeout(timer)
  }, [rpsPhase, rpsResult, advanceFromReveal])

  // Determine heading text
  let heading = 'Rock — Paper — Scissors'
  let activePlayer = ''
  if (isPlayerAPicking) activePlayer = "White's turn"
  if (isPlayerBPicking) activePlayer = "Black's turn"
  if (isRevealing) heading = 'Reveal'

  // Result text
  let resultText = ''
  if (isRevealing) {
    if (rpsResult === 'tie') {
      resultText = "It's a draw — play again."
    } else {
      const winnerName = rpsResult === 'A' ? 'White' : 'Black'
      resultText = `${winnerName} wins! Make your chess move.`
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={`rps-round-${roundNumber}-${rpsPhase}`}
          className="fixed inset-0 z-50 flex items-center justify-center"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.2 }}
        >
          {/* ── Backdrop ── */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px]" />

          {/* ── Modal Card ── */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full max-w-md mx-4
                       bg-charcoal-light border border-gold-dim/50 rounded-lg
                       p-6 md:p-8 gold-border-glow"
          >
            {/* Round badge */}
            <div className="flex justify-center mb-3">
              <span className="font-mono text-[0.65rem] text-smoke/50 uppercase tracking-[0.2em]">
                Round {roundNumber}
              </span>
            </div>

            {/* Heading */}
            <h2 className="font-heading text-2xl md:text-3xl text-gold text-center mb-1 gold-glow">
              {heading}
            </h2>

            {/* Active player indicator */}
            {activePlayer && (
              <motion.p
                key={activePlayer}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center font-mono text-xs text-parchment/70 uppercase tracking-widest mb-5"
              >
                {activePlayer}
              </motion.p>
            )}

            {/* Divider */}
            <div className="gold-divider mb-6" />

            {/* ── Two Columns ── */}
            <div className="flex items-stretch gap-3">
              {/* ── Player A (White) ── */}
              <div className="flex-1 flex flex-col items-center">
                <p className="font-mono text-xs text-gold/80 uppercase tracking-[0.15em] mb-3">
                  ♔ White
                </p>

                {isPlayerAPicking && (
                  <RPSButtonGroup onPick={submitRPSChoice} />
                )}

                {isPlayerBPicking && <LockedPlaceholder />}

                {isRevealing && playerAPick && (
                  <ChoiceReveal
                    choice={playerAPick}
                    isWinner={rpsResult === 'A'}
                  />
                )}
              </div>

              {/* ── VS Divider ── */}
              <div className="flex items-center px-2">
                <span className="font-heading text-xl text-gold/40 select-none">
                  VS
                </span>
              </div>

              {/* ── Player B (Black) ── */}
              <div className="flex-1 flex flex-col items-center">
                <p className="font-mono text-xs text-gold/80 uppercase tracking-[0.15em] mb-3">
                  ♚ Black
                </p>

                {isPlayerAPicking && <LockedPlaceholder />}

                {isPlayerBPicking && (
                  <RPSButtonGroup onPick={submitRPSChoice} />
                )}

                {isRevealing && playerBPick && (
                  <ChoiceReveal
                    choice={playerBPick}
                    isWinner={rpsResult === 'B'}
                  />
                )}
              </div>
            </div>

            {/* ── Result Text ── */}
            <AnimatePresence>
              {isRevealing && (
                <motion.div
                  variants={resultTextVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="mt-6 text-center"
                >
                  <div className="gold-divider mb-4" />
                  <p
                    className={`font-mono text-sm tracking-wider
                      ${rpsResult === 'tie' ? 'text-smoke' : 'text-gold gold-glow'}`}
                  >
                    {resultText}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
