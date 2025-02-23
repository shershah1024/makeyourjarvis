'use client';

import { motion } from 'framer-motion';

export default function SpeechAnimation({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          animate={isActive ? {
            scale: [1, 1.5, 1],
            backgroundColor: ['#22c55e', '#15803d', '#22c55e']
          } : {
            scale: 1,
            backgroundColor: '#6b7280'
          }}
          transition={{
            duration: 1,
            repeat: isActive ? Infinity : 0,
            delay: i * 0.2
          }}
          className="w-3 h-3 rounded-full"
        />
      ))}
    </div>
  );
} 