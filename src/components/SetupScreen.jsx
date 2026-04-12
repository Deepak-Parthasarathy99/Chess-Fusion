import { useState } from 'react'
import { motion } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
  exit: {
    opacity: 0,
    y: -30,
    transition: { duration: 0.4, ease: 'easeIn' },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export function SetupScreen({ onStart }) {
  const [whiteName, setWhiteName] = useState('')
  const [blackName, setBlackName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onStart({
      white: whiteName.trim() || 'Player 1',
      black: blackName.trim() || 'Player 2',
    })
  }

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
      <motion.form
        onSubmit={handleSubmit}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full max-w-md"
      >
        {/* Logo */}
        <motion.div variants={itemVariants} className="text-center mb-10">
          <span className="text-5xl block mb-3 select-none">♔</span>
          <h1 className="font-heading text-5xl md:text-6xl font-bold text-gold gold-glow tracking-tight">
            RPS Chess
          </h1>
          <div className="gold-divider w-40 mx-auto mt-4 mb-3" />
          <p className="font-mono text-smoke text-xs tracking-[0.2em] uppercase">
            Enter the arena
          </p>
        </motion.div>

        {/* White player input */}
        <motion.div variants={itemVariants} className="mb-5">
          <label
            htmlFor="setup-white-name"
            className="flex items-center gap-2 font-mono text-xs text-gold/80 uppercase tracking-[0.15em] mb-2"
          >
            <span className="text-base">♔</span> Player 1 — White
          </label>
          <input
            id="setup-white-name"
            type="text"
            value={whiteName}
            onChange={(e) => setWhiteName(e.target.value)}
            placeholder="Enter name…"
            maxLength={20}
            autoFocus
            className="setup-input"
          />
        </motion.div>

        {/* Black player input */}
        <motion.div variants={itemVariants} className="mb-8">
          <label
            htmlFor="setup-black-name"
            className="flex items-center gap-2 font-mono text-xs text-gold/80 uppercase tracking-[0.15em] mb-2"
          >
            <span className="text-base">♚</span> Player 2 — Black
          </label>
          <input
            id="setup-black-name"
            type="text"
            value={blackName}
            onChange={(e) => setBlackName(e.target.value)}
            placeholder="Enter name…"
            maxLength={20}
            className="setup-input"
          />
        </motion.div>

        {/* Start button */}
        <motion.div variants={itemVariants} className="text-center">
          <motion.button
            type="submit"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="font-mono text-sm uppercase tracking-[0.2em] px-10 py-3
                       border-2 border-gold text-charcoal bg-gold rounded-sm
                       cursor-pointer transition-colors duration-200
                       hover:bg-gold-glow hover:border-gold-glow
                       w-full md:w-auto"
          >
            Start Match
          </motion.button>
        </motion.div>

        {/* Subtle footer */}
        <motion.p
          variants={itemVariants}
          className="text-center mt-8 font-mono text-[0.6rem] text-smoke/30 tracking-widest uppercase"
        >
          Win RPS to earn your chess move
        </motion.p>
      </motion.form>
    </div>
  )
}
