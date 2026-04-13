import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { createGame, joinGame } from '../services/gameService'

// ─── localStorage helpers ────────────────────────────────────
function storePlayerIdentity(roomId, identity, name) {
  localStorage.setItem(
    `rps-chess-${roomId}`,
    JSON.stringify({ identity, name })
  )
}

// ─── Animation variants ─────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

// ─── Component ───────────────────────────────────────────────
export function HomeScreen() {
  const navigate = useNavigate()

  // UI mode: 'idle' | 'create' | 'join'
  const [mode, setMode] = useState('idle')
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleCreate = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const playerName = name.trim() || 'Player 1'
      const roomId = await createGame(playerName)
      storePlayerIdentity(roomId, 'A', playerName)
      navigate(`/game/${roomId}`)
    } catch (err) {
      setError(err.message || 'Failed to create game')
      setLoading(false)
    }
  }, [name, navigate])

  const handleJoin = useCallback(async () => {
    const code = roomCode.trim().toUpperCase()
    if (!code) {
      setError('Please enter a room code')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const playerName = name.trim() || 'Player 2'
      await joinGame(code, playerName)
      storePlayerIdentity(code, 'B', playerName)
      navigate(`/game/${code}`)
    } catch (err) {
      setError(err.message || 'Failed to join game')
      setLoading(false)
    }
  }, [name, roomCode, navigate])

  const handleBack = useCallback(() => {
    setMode('idle')
    setError(null)
    setRoomCode('')
  }, [])

  return (
    <div className="app-shell min-h-screen flex items-center justify-center px-4 bg-charcoal">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md"
      >
        {/* ── Logo ── */}
        <motion.div variants={itemVariants} className="text-center mb-10">
          <span className="text-5xl block mb-3 select-none">♔</span>
          <h1 className="font-heading text-5xl md:text-6xl font-bold text-gold gold-glow tracking-tight">
            RPS Chess
          </h1>
          <div className="gold-divider w-40 mx-auto mt-4 mb-3" />
          <p className="font-mono text-smoke text-xs tracking-[0.2em] uppercase">
            Strategic Warfare Reimagined
          </p>
        </motion.div>

        {/* ── Idle: Create / Join buttons ── */}
        {mode === 'idle' && (
          <>
            <motion.div variants={itemVariants} className="flex flex-col gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setMode('create')}
                className="font-mono text-sm uppercase tracking-[0.18em] px-8 py-3.5
                           border-2 border-gold text-charcoal bg-gold rounded-sm
                           cursor-pointer transition-colors duration-200
                           hover:bg-gold-glow hover:border-gold-glow w-full"
              >
                Create Game
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setMode('join')}
                className="font-mono text-sm uppercase tracking-[0.18em] px-8 py-3.5
                           border border-gold-dim text-gold bg-transparent rounded-sm
                           cursor-pointer transition-all duration-200
                           hover:bg-gold hover:text-charcoal hover:border-gold w-full"
              >
                Join Game
              </motion.button>
            </motion.div>
            <motion.p
              variants={itemVariants}
              className="text-center mt-8 font-mono text-[0.6rem] text-smoke/30 tracking-widest uppercase"
            >
              Win RPS to earn your chess move
            </motion.p>
          </>
        )}

        {/* ── Create mode ── */}
        {mode === 'create' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <label
              htmlFor="create-name"
              className="flex items-center gap-2 font-mono text-xs text-gold/80 uppercase tracking-[0.15em] mb-2"
            >
              <span className="text-base">♔</span> Your Name (White)
            </label>
            <input
              id="create-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name…"
              maxLength={20}
              autoFocus
              className="setup-input mb-5"
            />

            {error && (
              <p className="font-mono text-xs text-red-400 mb-3">{error}</p>
            )}

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleCreate}
                disabled={loading}
                className="font-mono text-sm uppercase tracking-[0.15em] px-6 py-3
                           border-2 border-gold text-charcoal bg-gold rounded-sm
                           cursor-pointer transition-colors duration-200
                           hover:bg-gold-glow hover:border-gold-glow flex-1
                           disabled:opacity-50 disabled:cursor-wait"
              >
                {loading ? 'Creating…' : 'Create Room'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleBack}
                className="font-mono text-xs uppercase tracking-[0.12em] px-4 py-3
                           border border-smoke/30 text-smoke bg-transparent rounded-sm
                           cursor-pointer transition-all duration-200
                           hover:border-smoke/50 hover:text-ivory"
              >
                Back
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── Join mode ── */}
        {mode === 'join' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <label
              htmlFor="join-code"
              className="flex items-center gap-2 font-mono text-xs text-gold/80 uppercase tracking-[0.15em] mb-2"
            >
              Room Code
            </label>
            <input
              id="join-code"
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="e.g. A3BK9X"
              maxLength={6}
              autoFocus
              className="setup-input mb-4 uppercase tracking-[0.3em] text-center text-lg"
            />

            <label
              htmlFor="join-name"
              className="flex items-center gap-2 font-mono text-xs text-gold/80 uppercase tracking-[0.15em] mb-2"
            >
              <span className="text-base">♚</span> Your Name (Black)
            </label>
            <input
              id="join-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name…"
              maxLength={20}
              className="setup-input mb-5"
            />

            {error && (
              <p className="font-mono text-xs text-red-400 mb-3">{error}</p>
            )}

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleJoin}
                disabled={loading}
                className="font-mono text-sm uppercase tracking-[0.15em] px-6 py-3
                           border-2 border-gold text-charcoal bg-gold rounded-sm
                           cursor-pointer transition-colors duration-200
                           hover:bg-gold-glow hover:border-gold-glow flex-1
                           disabled:opacity-50 disabled:cursor-wait"
              >
                {loading ? 'Joining…' : 'Join Room'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleBack}
                className="font-mono text-xs uppercase tracking-[0.12em] px-4 py-3
                           border border-smoke/30 text-smoke bg-transparent rounded-sm
                           cursor-pointer transition-all duration-200
                           hover:border-smoke/50 hover:text-ivory"
              >
                Back
              </motion.button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
