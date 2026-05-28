import { motion } from 'framer-motion'

export function PlaceholderScreen() {
  return (
    <div className="relative min-h-screen bg-void-900 flex flex-col items-center justify-center p-8 overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,212,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Radial glow behind title */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(0,212,255,0.8) 0%, transparent 70%)',
        }}
      />

      <motion.div
        className="relative z-10 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {/* Journey badge */}
        <motion.div
          className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/5 text-accent text-xs tracking-[0.25em] uppercase"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Civilian → Caped Baldy
        </motion.div>

        {/* Main title */}
        <motion.h1
          className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tight leading-none mb-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
        >
          <span className="text-white">HERO</span>
          <motion.span
            className="text-accent inline-block"
            animate={{
              textShadow: [
                '0 0 15px rgba(0,212,255,0.3)',
                '0 0 50px rgba(0,212,255,0.8)',
                '0 0 15px rgba(0,212,255,0.3)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            PATH
          </motion.span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-void-300 text-base sm:text-lg mb-10 max-w-xs mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          Your anime-inspired fitness RPG journey
        </motion.p>

        {/* Glowing divider */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <motion.div
            className="h-px bg-gradient-to-r from-transparent to-accent/60"
            initial={{ width: 0 }}
            animate={{ width: 80 }}
            transition={{ delay: 0.7, duration: 0.7 }}
          />
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-accent"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="h-px bg-gradient-to-l from-transparent to-accent/60"
            initial={{ width: 0 }}
            animate={{ width: 80 }}
            transition={{ delay: 0.7, duration: 0.7 }}
          />
        </div>

        {/* Rank ladder preview */}
        <motion.div
          className="flex items-center justify-center gap-1.5 mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          {['civilian', 'trainee', 'fighter', 'hunter', 'elite', 'candidate', 'hero', 'caped'].map(
            (rank, i) => (
              <motion.div
                key={rank}
                className="w-2 rounded-full"
                style={{
                  height: `${8 + i * 4}px`,
                  backgroundColor:
                    i === 0
                      ? '#6b7280'
                      : i === 1
                        ? '#10b981'
                        : i === 2
                          ? '#3b82f6'
                          : i === 3
                            ? '#8b5cf6'
                            : i === 4
                              ? '#f59e0b'
                              : i === 5
                                ? '#ef4444'
                                : i === 6
                                  ? '#ec4899'
                                  : '#e2e8f0',
                  opacity: 0.7,
                  boxShadow:
                    i === 7 ? '0 0 8px rgba(226, 232, 240, 0.5)' : undefined,
                }}
                animate={{ opacity: [0.5, 0.9, 0.5] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ),
          )}
        </motion.div>

        {/* Status indicator */}
        <motion.div
          className="flex items-center justify-center gap-2 text-void-400 text-xs tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-accent/60"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          Shell initialized — features coming soon
        </motion.div>
      </motion.div>
    </div>
  )
}
