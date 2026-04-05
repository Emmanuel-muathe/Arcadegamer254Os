import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'motion/react';
import { useWindowManager, WindowState } from '../contexts/WindowManagerContext';
import { X, Square, Minus } from 'lucide-react';

export function Window({ window, children, index = 0, totalWindows = 1 }: { window: WindowState, children: React.ReactNode, key?: React.Key, index?: number, totalWindows?: number }) {
  const { closeWindow, focusWindow, updateWindow, minimizeWindow, toggleMaximize, overviewMode, setOverviewMode } = useWindowManager();
  const controls = useAnimation();
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (overviewMode) {
      // Calculate grid position
      const cols = Math.ceil(Math.sqrt(totalWindows));
      const rows = Math.ceil(totalWindows / cols);
      const padding = 40;
      const screenW = globalThis.window.innerWidth;
      const screenH = globalThis.window.innerHeight - 60; // account for dock
      
      const cellW = (screenW - padding * (cols + 1)) / cols;
      const cellH = (screenH - padding * (rows + 1)) / rows;
      
      // Calculate aspect ratio preserving scale
      const scale = Math.min(cellW / window.width, cellH / window.height, 0.8);
      
      const scaledW = window.width * scale;
      const scaledH = window.height * scale;
      
      const col = index % cols;
      const row = Math.floor(index / cols);
      
      const x = padding + col * (cellW + padding) + (cellW - scaledW) / 2;
      const y = padding + row * (cellH + padding) + (cellH - scaledH) / 2;
      
      controls.start({ 
        x, y, 
        width: window.width, height: window.height, 
        scale,
        transition: { type: 'spring', stiffness: 300, damping: 30 } 
      });
      return;
    }

    if (window.status === 'maximized') {
      controls.start({ x: 0, y: 0, width: '100vw', height: 'calc(100vh - 3rem)', scale: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } });
    } else if (window.status === 'snapped-left') {
      controls.start({ x: 0, y: 0, width: '50vw', height: 'calc(100vh - 3rem)', scale: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } });
    } else if (window.status === 'snapped-right') {
      controls.start({ x: '50vw', y: 0, width: '50vw', height: 'calc(100vh - 3rem)', scale: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } });
    } else {
      controls.start({ x: window.x, y: window.y, width: window.width, height: window.height, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } });
    }
  }, [window.status, window.x, window.y, window.width, window.height, overviewMode, controls, index, totalWindows]);

  if (window.status === 'minimized') return null;

  const handleDragEnd = (e: any, info: any) => {
    setIsDragging(false);
    if (window.status !== 'normal') return;

    const screenWidth = globalThis.window.innerWidth;
    const snapThreshold = 20;

    let newX = window.x + info.offset.x;
    let newY = window.y + info.offset.y;

    // Snapping logic
    if (e.clientX <= snapThreshold) {
      updateWindow(window.id, { status: 'snapped-left', previousState: { x: newX, y: newY, width: window.width, height: window.height } });
    } else if (e.clientX >= screenWidth - snapThreshold) {
      updateWindow(window.id, { status: 'snapped-right', previousState: { x: newX, y: newY, width: window.width, height: window.height } });
    } else if (e.clientY <= snapThreshold) {
      updateWindow(window.id, { status: 'maximized', previousState: { x: newX, y: newY, width: window.width, height: window.height } });
    } else {
      updateWindow(window.id, { x: newX, y: newY });
    }
  };

  const handleDragStart = () => {
    setIsDragging(true);
    focusWindow(window.id);
    if (window.status !== 'normal') {
      // Unsnap if dragging from snapped/maximized state
      const prev = window.previousState || { x: 100, y: 100, width: 800, height: 600 };
      updateWindow(window.id, { status: 'normal', x: prev.x, y: prev.y, width: prev.width, height: prev.height });
    }
  };

  // Overview mode styling is handled by the parent Desktop component, 
  // but we need to disable dragging and add a click handler to restore.
  const isInteractive = !overviewMode;

  return (
    <motion.div
      drag={isInteractive}
      dragMomentum={false}
      dragHandle=".window-handle"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={controls}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onPointerDown={() => {
        if (overviewMode) {
          setOverviewMode(false);
          focusWindow(window.id);
        } else {
          focusWindow(window.id);
        }
      }}
      style={{ zIndex: overviewMode ? 100 : window.zIndex }}
      className={`absolute bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden flex flex-col ${overviewMode ? 'cursor-pointer hover:ring-4 ring-blue-500 transition-shadow' : 'pointer-events-auto'}`}
    >
      <div className="window-handle h-10 bg-gray-800 flex items-center justify-between px-4 cursor-grab active:cursor-grabbing select-none border-b border-gray-700">
        <span className="text-sm font-semibold text-gray-200">{window.title}</span>
        <div className="flex items-center space-x-3">
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => minimizeWindow(window.id)} 
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => toggleMaximize(window.id)} 
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Square className="w-4 h-4" />
          </button>
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => closeWindow(window.id)} 
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto relative bg-gray-950 text-gray-100">
        {/* Disable pointer events inside the window during overview mode to prevent accidental clicks */}
        <div className={overviewMode ? 'pointer-events-none' : ''} style={{ width: '100%', height: '100%' }}>
          {children}
        </div>
      </div>
    </motion.div>
  );
}
