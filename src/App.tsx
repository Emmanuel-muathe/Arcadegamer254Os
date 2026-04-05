import React, { useState, useEffect } from 'react';
import { SystemTray } from './components/SystemTray';
import { WindowManagerProvider, useWindowManager } from './contexts/WindowManagerContext';
import { Window } from './components/Window';
import { Settings } from './components/apps/Settings';
import { AppStore } from './components/apps/AppStore';
import { ArcadeBrowser } from './components/apps/ArcadeBrowser';
import { SystemMonitor } from './components/apps/SystemMonitor';
import { Terminal } from './components/apps/Terminal';
import { FileExplorer } from './components/apps/FileExplorer';
import { WelcomeScreen } from './components/WelcomeScreen';
import { getAppIcon } from './utils/icons';
import { X } from 'lucide-react';
import { playSound } from './utils/sounds';

import { getEmbedUrl } from './utils/url';

function Desktop() {
  const { windows, openWindow, overviewMode, setOverviewMode } = useWindowManager();
  const [pers, setPers] = useState<any>({
    wallpaper: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
    font: 'Inter',
    theme: 'dark',
    desktopApps: []
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        setOverviewMode(!overviewMode);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [overviewMode, setOverviewMode]);

  useEffect(() => {
    const fetchPers = async () => {
      try {
        const res = await fetch('/api/system/personalization');
        const data = await res.json();
        setPers(data);
      } catch (e) { }
    };
    fetchPers();
    const interval = setInterval(fetchPers, 2000); // Poll for changes
    window.addEventListener('pers-updated', fetchPers);
    return () => {
      clearInterval(interval);
      window.removeEventListener('pers-updated', fetchPers);
    };
  }, []);

  const launchApp = async (app: any) => {
    playSound('click');
    if (app.exec.startsWith('internal:')) {
      const component = app.exec.split(':')[1];
      openWindow(component, app.name, component);
      return;
    }
    
    if (app.exec.startsWith('web:')) {
      const url = app.exec.split('web:')[1];
      const embedUrl = getEmbedUrl(url);
      openWindow(`webapp-${app.name}`, app.name, 'webapp', embedUrl);
      return;
    }
    
    try {
      await fetch('/api/system/apps/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exec: app.exec })
      });
    } catch (e) {
      console.error("Failed to launch app", e);
    }
  };

  const removeFromDesktop = async (e: React.MouseEvent, appToRemove: any) => {
    e.stopPropagation();
    try {
      const newDesktopApps = pers.desktopApps.filter((app: any) => app.name !== appToRemove.name);
      await fetch('/api/system/personalization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ desktopApps: newDesktopApps })
      });
      setPers({ ...pers, desktopApps: newDesktopApps });
    } catch (e) {
      console.error(e);
    }
  };

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setTimeout(() => setDraggedIndex(index), 0);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newDesktopApps = [...(pers.desktopApps || [])];
    const [draggedApp] = newDesktopApps.splice(draggedIndex, 1);
    newDesktopApps.splice(dropIndex, 0, draggedApp);

    setPers({ ...pers, desktopApps: newDesktopApps });
    setDraggedIndex(null);

    try {
      await fetch('/api/system/personalization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ desktopApps: newDesktopApps })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const renderComponent = (win: any) => {
    if (win.component === 'webapp') {
      return (
        <iframe 
          src={win.url} 
          className="w-full h-full border-none bg-white" 
          title={win.title}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads allow-pointer-lock allow-presentation"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen; microphone; camera; midi; vr; xr-spatial-tracking"
        />
      );
    }
    switch (win.component) {
      case 'settings': return <Settings />;
      case 'appstore': return <AppStore />;
      case 'browser': return <ArcadeBrowser initialUrl={win.url} />;
      case 'monitor': return <SystemMonitor />;
      case 'terminal': return <Terminal />;
      case 'files': return <FileExplorer />;
      default: return <div className="p-4 text-white">Unknown App</div>;
    }
  };

  return (
    <div className={`relative w-screen h-screen overflow-hidden bg-gray-900 font-sans ${pers.theme === 'light' ? 'theme-light' : ''}`} style={{ fontFamily: pers.font }}>
      {/* Desktop Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-500 no-invert"
        style={{ backgroundImage: `url("${pers.wallpaper}")` }}
      >
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Desktop Icons */}
      <div className="absolute inset-0 z-0 p-4 flex flex-col flex-wrap gap-4 content-start">
        {pers.desktopApps?.map((app: any, i: number) => (
          <div 
            key={i}
            draggable
            onDragStart={(e) => handleDragStart(e, i)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, i)}
            className={`group relative flex flex-col items-center justify-center w-24 h-24 rounded-xl hover:bg-white/10 cursor-pointer transition-all ${draggedIndex === i ? 'opacity-50' : ''} ${dragOverIndex === i ? 'bg-white/20 scale-105' : ''}`}
            onDoubleClick={() => launchApp(app)}
          >
            <div className="w-12 h-12 flex items-center justify-center bg-black/20 rounded-xl shadow-sm mb-2 pointer-events-none">
              {getAppIcon(app)}
            </div>
            <span className="text-white text-xs text-center drop-shadow-md px-1 line-clamp-2 leading-tight pointer-events-none">
              {app.name}
            </span>
            <button
              onClick={(e) => removeFromDesktop(e, app)}
              className="absolute top-0 right-0 p-1 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all shadow-md"
              title="Remove from Desktop"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Desktop Area (Where windows go) */}
      <div className="absolute inset-0 z-10 p-4 overflow-hidden pointer-events-none">
        {windows.map((win, index) => (
          <Window key={win.id} window={win} index={index} totalWindows={windows.filter(w => w.status !== 'minimized').length}>
            {renderComponent(win)}
          </Window>
        ))}
      </div>

      {/* System Tray */}
      <SystemTray />
    </div>
  );
}

export default function App() {
  const [booting, setBooting] = useState(true);

  return (
    <>
      {booting && <WelcomeScreen onComplete={() => setBooting(false)} />}
      {!booting && (
        <WindowManagerProvider>
          <Desktop />
        </WindowManagerProvider>
      )}
    </>
  );
}
