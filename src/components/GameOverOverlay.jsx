import { motion, AnimatePresence } from 'framer-motion'

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.82, y: 36 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 24, stiffness: 280, delay: 0.1 },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -20,
    transition: { duration: 0.3 },
  },
}

const crownVariants = {
  hidden: { opacity: 0, scale: 0, rotate: -30 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', damping: 12, stiffness: 200, delay: 0.3 },
  },
}

function getDrawCopy(drawReason) {
  switch (drawReason) {
    case 'insufficientMaterial':
      return {
        title: 'Draw',
        subtitle: 'Insufficient material remains on the board',
        icon: '½',
      }
    case 'threefoldRepetition':
      return {
        title: 'Draw',
        subtitle: 'The same position occurred three times',
        icon: '½',
      }
    case 'fiftyMoveRule':
      return {
        title: 'Draw',
        subtitle: 'No pawn move or capture occurred in 50 moves',
        icon: '½',
      }
    default:
      return {
        title: 'Draw',
        subtitle: 'The game ends in a draw',
        icon: '½',
      }
  }
}

export function GameOverOverlay({ isGameOver, gameStatus, drawReason, chessTurn, winningColor, onRestart }) {
  // chessTurn = the side whose turn it is = the side that's been mated/staled
  let title = ''
  let subtitle = ''
  let icon = ''

  if (gameStatus === 'kingCapture') {
    const winner = winningColor === 'w' ? 'White' : 'Black'
    title = 'King Captured'
    subtitle = `${winner} wins immediately`
    icon = winningColor === 'w' ? '♔' : '♚'
  } else if (gameStatus === 'checkmate') {
    const winner = chessTurn === 'w' ? 'Black' : 'White'
    title = 'Checkmate'
    subtitle = `${winner} wins the game`
    icon = chessTurn === 'w' ? '♚' : '♔'
  } else if (gameStatus === 'stalemate') {
    title = 'Stalemate'
    subtitle = 'The game ends in a draw'
    icon = '½'
  } else if (gameStatus === 'draw') {
    const drawCopy = getDrawCopy(drawReason)
    title = drawCopy.title
    subtitle = drawCopy.subtitle
    icon = drawCopy.icon
  }

  return (
    <AnimatePresence>
      {isGameOver && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Card */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 text-center w-full max-w-sm mx-4
                       bg-charcoal-light border border-gold-dim/60 rounded-lg
                       p-8 md:p-10 gold-border-glow"
          >
            {/* Winner icon */}
            <motion.div
              variants={crownVariants}
              initial="hidden"
              animate="visible"
              className="text-6xl mb-4 gold-glow select-none"
            >
              {icon}
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="font-heading text-4xl md:text-5xl text-gold gold-glow mb-2"
            >
              {title}
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="font-mono text-sm text-parchment/80 tracking-wider mb-8"
            >
              {subtitle}
            </motion.p>

            {/* Divider */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="gold-divider mb-8"
            />

            {/* Restart button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.3 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRestart}
              className="font-mono text-sm uppercase tracking-[0.15em] px-8 py-3
                         border-2 border-gold text-charcoal bg-gold rounded-sm
                         cursor-pointer transition-colors duration-200
                         hover:bg-gold-glow hover:border-gold-glow"
            >
              Restart
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
