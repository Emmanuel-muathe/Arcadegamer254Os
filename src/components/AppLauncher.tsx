import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Box, Power, Plus, ChevronUp, Pin, PinOff, ExternalLink } from 'lucide-react';
import { useWindowManager } from '../contexts/WindowManagerContext';
import { getAppIcon } from '../utils/icons';
import { playSound } from '../utils/sounds';
import { getEmbedUrl } from '../utils/url';
import { ContextMenu, ContextMenuItem } from './ContextMenu';

export function AppLauncher({ isOpen, onClose, pers, onTogglePin }: { isOpen: boolean; onClose: () => void; pers: any; onTogglePin: (app: any) => void }) {
  const [apps, setApps] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { openWindow } = useWindowManager();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const longPressTimer = useRef<any>(null);

  const handlePointerDown = (e: React.PointerEvent, app: any) => {
    longPressTimer.current = setTimeout(() => {
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setSelectedApp(app);
      setIsContextMenuOpen(true);
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, app: any) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedApp(app);
    setIsContextMenuOpen(true);
  };

  useEffect(() => {
    if (isOpen) {
      fetchApps();
      // Focus search bar when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/apps');
      const data = await res.json();
      setApps(data.apps || []);
    } catch (e) {
      console.error("Failed to fetch apps", e);
    }
    setLoading(false);
  };

  const launchApp = async (app: any) => {
    playSound('click');
    if (app.exec.startsWith('internal:')) {
      const component = app.exec.split(':')[1];
      openWindow(component, app.name, component);
      onClose();
      return;
    }
    
    if (app.exec.startsWith('web:')) {
      const url = app.exec.split('web:')[1];
      const embedUrl = getEmbedUrl(url);
      openWindow(`webapp-${app.name}`, app.name, 'webapp', embedUrl);
      onClose();
      return;
    }
    
    try {
      // If it's a native app, open the Terminal and run it
      openWindow('terminal', 'Arcade Terminal', 'terminal');
      await fetch('/api/system/apps/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exec: app.exec })
      });
      onClose();
    } catch (e) {
      console.error("Failed to launch app", e);
    }
  };

  const filteredApps = apps.filter(app => {
    return app.name.toLowerCase().includes(search.toLowerCase()) || app.exec.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Chrome OS style full-screen blurred background */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[40] bg-black/40 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed z-[45] left-1/2 bottom-20 -translate-x-1/2 w-[90%] max-w-2xl h-[60vh] max-h-[500px] bg-gray-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 flex flex-col overflow-hidden"
          >
            {/* Search Bar Area */}
            <div className="p-6 pb-2">
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Search your device, apps, web..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white/10 border border-white/5 rounded-full py-3 pl-12 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Apps Grid */}
            <div className="flex-1 overflow-y-auto p-6 pt-4 custom-scrollbar">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              ) : filteredApps.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Search className="w-12 h-12 mb-4 opacity-50" />
                  <p>No apps found for "{search}"</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-x-4 gap-y-6 max-w-xl mx-auto">
                  {filteredApps.map((app, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.01 }}
                      onClick={() => launchApp(app)}
                      onPointerDown={(e) => handlePointerDown(e, app)}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                      onContextMenu={(e) => handleContextMenu(e, app)}
                      className="flex flex-col items-center justify-start group p-2 rounded-2xl hover:bg-white/10 transition-colors"
                    >
                      <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform duration-200">
                        {getAppIcon(app)}
                      </div>
                      <span className="text-xs text-center text-gray-200 group-hover:text-white line-clamp-2 leading-tight px-1 font-medium">
                        {app.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Bottom Chevron (Chrome OS style) */}
            <div className="h-10 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors border-t border-white/5" onClick={onClose}>
              <ChevronUp className="w-5 h-5 text-gray-400" />
            </div>
          </motion.div>
        </>
      )}
      <ContextMenu
        x={contextMenuPos.x}
        y={contextMenuPos.y}
        isOpen={isContextMenuOpen}
        onClose={() => setIsContextMenuOpen(false)}
        items={[
          { label: 'Open', icon: <ExternalLink className="w-4 h-4" />, onClick: () => launchApp(selectedApp) },
          { 
            label: pers?.dockApps?.some((a: any) => a.name === selectedApp?.name) ? 'Unpin from shelf' : 'Pin to shelf', 
            icon: pers?.dockApps?.some((a: any) => a.name === selectedApp?.name) ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />, 
            onClick: () => onTogglePin(selectedApp) 
          },
        ] as ContextMenuItem[]}
      />
    </AnimatePresence>
  );
}
