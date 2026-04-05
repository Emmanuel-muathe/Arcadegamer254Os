import React, { useEffect } from 'react';
import { motion } from 'motion/react';

export function BootScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900 text-white overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-4 drop-shadow-2xl">
          Arcadegamer254 os
        </h1>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex items-center space-x-3"
        >
          <div className="h-[1px] w-12 bg-white/50" />
          <p className="text-lg md:text-xl font-medium text-blue-200 uppercase tracking-widest">
            made by arcadegamer254
          </p>
          <div className="h-[1px] w-12 bg-white/50" />
        </motion.div>

        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "200px" }}
          transition={{ delay: 1, duration: 1.5, ease: "easeInOut" }}
          className="h-1 bg-blue-400 mt-12 rounded-full shadow-[0_0_15px_rgba(96,165,250,0.5)]"
        />
      </motion.div>
    </div>
  );
}
