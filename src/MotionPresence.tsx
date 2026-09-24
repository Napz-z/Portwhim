import React from 'react';
import { AnimatePresence, motion } from 'motion/react';

// Keep descendants mounted through exit so their motion can finish and focus can return.
export function MotionPresence({ show, children }: { show: boolean; children: React.ReactNode }) {
  return <AnimatePresence>{show && <motion.div className="motion-presence" initial="closed" animate="open" exit="closed">{children}</motion.div>}</AnimatePresence>;
}
