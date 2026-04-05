import React, { createContext, useState, useContext, ReactNode } from 'react';

export type WindowStatus = 'normal' | 'maximized' | 'minimized' | 'snapped-left' | 'snapped-right';

export interface WindowState {
  id: string;
  title: string;
  component: string;
  url?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  status: WindowStatus;
  previousState?: { x: number; y: number; width: number; height: number };
}

interface WindowManagerContextType {
  windows: WindowState[];
  overviewMode: boolean;
  setOverviewMode: (active: boolean) => void;
  openWindow: (id: string, title: string, component: string, url?: string) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindow: (id: string, updates: Partial<WindowState>) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
}

const WindowManagerContext = createContext<WindowManagerContextType | undefined>(undefined);

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [highestZ, setHighestZ] = useState(10);
  const [overviewMode, setOverviewMode] = useState(false);

  const openWindow = (id: string, title: string, component: string, url?: string) => {
    setWindows(prev => {
      if (prev.find(w => w.id === id)) {
        focusWindow(id);
        return prev;
      }
      const newZ = highestZ + 1;
      setHighestZ(newZ);
      return [...prev, {
        id, title, component, url,
        x: 100 + (prev.length * 30),
        y: 100 + (prev.length * 30),
        width: 800,
        height: 600,
        zIndex: newZ,
        status: 'normal'
      }];
    });
  };

  const closeWindow = (id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  };

  const focusWindow = (id: string) => {
    setWindows(prev => {
      const win = prev.find(w => w.id === id);
      if (!win) return prev;
      
      let newWindows = [...prev];
      
      // If it was minimized, restore it to normal or its previous maximized/snapped state
      // For simplicity, we'll restore to normal if it was minimized
      if (win.status === 'minimized') {
        newWindows = newWindows.map(w => w.id === id ? { ...w, status: 'normal' } : w);
      }

      if (win.zIndex === highestZ && win.status !== 'minimized') return newWindows;
      
      const newZ = highestZ + 1;
      setHighestZ(newZ);
      return newWindows.map(w => w.id === id ? { ...w, zIndex: newZ } : w);
    });
  };

  const updateWindow = (id: string, updates: Partial<WindowState>) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const minimizeWindow = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, status: 'minimized' } : w));
  };

  const restoreWindow = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, status: 'normal' } : w));
    focusWindow(id);
  };

  const toggleMaximize = (id: string) => {
    setWindows(prev => prev.map(w => {
      if (w.id !== id) return w;
      if (w.status === 'maximized') {
        return { ...w, status: 'normal' };
      } else {
        return { ...w, status: 'maximized', previousState: { x: w.x, y: w.y, width: w.width, height: w.height } };
      }
    }));
    focusWindow(id);
  };

  return (
    <WindowManagerContext.Provider value={{ 
      windows, overviewMode, setOverviewMode, 
      openWindow, closeWindow, focusWindow, updateWindow, 
      minimizeWindow, restoreWindow, toggleMaximize 
    }}>
      {children}
    </WindowManagerContext.Provider>
  );
}

export function useWindowManager() {
  const context = useContext(WindowManagerContext);
  if (!context) throw new Error("useWindowManager must be used within WindowManagerProvider");
  return context;
}
