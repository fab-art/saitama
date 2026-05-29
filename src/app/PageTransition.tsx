import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

// Enter and exit stay under 250 ms; sync mode means they overlap so total is
// max(enterMs, exitMs) = 220 ms — fast enough to feel snappy.
const variants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
}

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="h-full w-full"
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  )
}
