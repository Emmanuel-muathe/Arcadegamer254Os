import React, { useState, useEffect } from 'react';
import { Battery, BatteryCharging, BatteryFull, BatteryLow, BatteryMedium, BatteryWarning, Wifi, WifiOff, Clock, Settings as SettingsIcon, Package, Activity, Terminal, Chrome, Music, Video, Image as ImageIcon, Folder, Mail, Play, Box, Circle, LayoutGrid } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { useWindowManager } from '../contexts/WindowManagerContext';
import { AppLauncher } from './AppLauncher';
import { QuickSettings } from './QuickSettings';
import { getAppIcon, AIcon } from '../utils/icons';

export function SystemTray() {
  const { windows, openWindow, focusWindow, overviewMode, setOverviewMode } = useWindowManager();
  const [time, setTime] = useState(new Date());
  const [battery, setBattery] = useState<{ capacity: number; status: string; device: string } | null>(null);
  const [wifiNetworks, setWifiNetworks] = useState<any[]>([]);
  const [wifiError, setWifiError] = useState<string | null>(null);
  const [batteryError, setBatteryError] = useState<string | null>(null);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [pers, setPers] = useState<any>({ dockPosition: 'Bottom', dockAutoHide: false });
  const [hoveredWindow, setHoveredWindow] = useState<string | null>(null);
  const [isDockHovered, setIsDockHovered] = useState(false);

  // Fetch Personalization
  useEffect(() => {
    const fetchPers = async () => {
      try {
        const res = await fetch('/api/system/personalization');
        const data = await res.json();
        setPers(data);
      } catch (e) {}
    };
    fetchPers();
    const interval = setInterval(fetchPers, 2000);
    return () => clearInterval(interval);
  }, []);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Battery
  useEffect(() => {
    const fetchBattery = async () => {
      try {
        const res = await fetch('/api/system/battery');
        const data = await res.json();
        if (data.error) {
          setBatteryError(data.error);
        } else {
          setBattery(data);
          setBatteryError(null);
        }
      } catch (err) {
        setBatteryError('Failed to fetch battery');
      }
    };

    fetchBattery();
    const interval = setInterval(fetchBattery, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Fetch Wi-Fi
  useEffect(() => {
    const fetchWifi = async () => {
      try {
        const res = await fetch('/api/system/wifi');
        const data = await res.json();
        if (data.error || !data.enabled) {
          setWifiError(data.error || 'Wi-Fi Disabled');
          setWifiNetworks([]);
        } else {
          setWifiNetworks(data.networks || []);
          setWifiError(null);
        }
      } catch (err) {
        setWifiError('Failed to fetch Wi-Fi');
        setWifiNetworks([]);
      }
    };

    fetchWifi();
    const interval = setInterval(fetchWifi, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const renderBatteryIcon = () => {
    if (!battery) return <Battery className="w-4 h-4 text-gray-400" />;
    if (battery.status === 'Charging') return <BatteryCharging className="w-4 h-4 text-green-400" />;
    if (battery.capacity > 90) return <BatteryFull className="w-4 h-4" />;
    if (battery.capacity > 50) return <BatteryMedium className="w-4 h-4" />;
    if (battery.capacity > 20) return <BatteryLow className="w-4 h-4 text-yellow-400" />;
    return <BatteryWarning className="w-4 h-4 text-red-500" />;
  };

  const getHitAreaClasses = () => {
    let base = "fixed z-50 flex justify-center ";
    let transform = "";
    
    switch (pers.dockPosition) {
      case 'Top':
        base += "w-full top-0 h-16";
        transform = pers.dockAutoHide && !isDockHovered && !isLauncherOpen && !isQuickSettingsOpen ? '-translate-y-full' : 'translate-y-0';
        break;
      case 'Left':
        base += "h-full left-0 w-16 flex-col items-center";
        transform = pers.dockAutoHide && !isDockHovered && !isLauncherOpen && !isQuickSettingsOpen ? '-translate-x-full' : 'translate-x-0';
        break;
      case 'Right':
        base += "h-full right-0 w-16 flex-col items-center";
        transform = pers.dockAutoHide && !isDockHovered && !isLauncherOpen && !isQuickSettingsOpen ? 'translate-x-full' : 'translate-x-0';
        break;
      case 'Bottom':
      default:
        base += "w-full bottom-0 h-16";
        transform = pers.dockAutoHide && !isDockHovered && !isLauncherOpen && !isQuickSettingsOpen ? 'translate-y-full' : 'translate-y-0';
        break;
    }
    
    return `${base} transition-transform duration-300 ${transform}`;
  };

  const getDockClasses = () => {
    let base = "bg-gray-900/80 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-full flex items-center ";
    
    switch (pers.dockPosition) {
      case 'Left':
      case 'Right':
        return base + "flex-col w-12 py-2 mx-2 space-y-2";
      case 'Top':
      case 'Bottom':
      default:
        return base + "h-12 px-2 mt-2 space-x-2";
    }
  };

  const getAppIconComponent = (component: string) => {
    switch(component) {
      case 'settings': return <SettingsIcon className="w-5 h-5 text-gray-300" />;
      case 'appstore': return <AIcon className="w-5 h-5 text-blue-500" />;
      case 'monitor': return <Activity className="w-5 h-5 text-gray-300" />;
      case 'terminal': return <Terminal className="w-5 h-5 text-gray-300" />;
      case 'browser': return <Chrome className="w-5 h-5 text-gray-300" />;
      case 'files': return <Folder className="w-5 h-5 text-gray-300" />;
      default: 
        if (component.startsWith('webapp-')) {
          if (component.toLowerCase().includes('spotify')) return <Music className="w-5 h-5 text-gray-300" />;
          if (component.toLowerCase().includes('youtube')) return <Video className="w-5 h-5 text-gray-300" />;
          return <Box className="w-5 h-5 text-gray-300" />;
        }
        return <Box className="w-5 h-5 text-gray-300" />;
    }
  };

  // Group windows by component to show multiple instances
  const groupedWindows = windows.reduce((acc, win) => {
    if (!acc[win.component]) {
      acc[win.component] = [];
    }
    acc[win.component].push(win);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <>
      <div 
        className={getHitAreaClasses()}
        onMouseEnter={() => setIsDockHovered(true)}
        onMouseLeave={() => setIsDockHovered(false)}
      >
        <div className={getDockClasses()}>
          
          {/* Launcher Button (Chrome OS style circle) */}
          <button 
            onClick={() => setIsLauncherOpen(!isLauncherOpen)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all mx-1 ${isLauncherOpen ? 'bg-white/20' : 'hover:bg-white/10'}`}
          >
            <AIcon className="w-6 h-6 text-blue-500" />
          </button>

          {/* Overview Mode Button (Square thing) */}
          <button 
            onClick={() => setOverviewMode(!overviewMode)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all mx-1 ${overviewMode ? 'bg-white/30 scale-110' : 'hover:bg-white/20 hover:scale-110'}`}
            title="Overview Mode (F5) - View all open windows"
          >
            <LayoutGrid className="w-4 h-4 text-white" />
          </button>

          {/* Divider */}
          <div className={`bg-white/10 ${pers.dockPosition === 'Left' || pers.dockPosition === 'Right' ? 'w-6 h-px my-2' : 'w-px h-6 mx-2'}`}></div>

          {/* Open Apps */}
          <div className={`flex ${pers.dockPosition === 'Left' || pers.dockPosition === 'Right' ? 'flex-col space-y-1' : 'items-center space-x-1'}`}>
            {(Object.entries(groupedWindows) as [string, any[]][]).map(([component, wins]) => {
              const isActive = wins.some(w => w.isFocused);
              const mainWin = wins[0];
              
              return (
                <div 
                  key={component}
                  className="relative group flex flex-col items-center"
                  onMouseEnter={() => setHoveredWindow(component)}
                  onMouseLeave={() => setHoveredWindow(null)}
                >
                  <button
                    onClick={() => {
                      if (isActive) {
                        // If active, minimize all
                        // (Requires minimize function in context, for now just focus)
                        focusWindow(mainWin.id);
                      } else {
                        focusWindow(mainWin.id);
                      }
                    }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${isActive ? 'bg-white/20 scale-110' : 'hover:bg-white/10 hover:scale-110'}`}
                  >
                    {getAppIconComponent(component)}
                  </button>
                  
                  {/* Chrome OS style active indicator (dot underneath) */}
                  <div className={`absolute ${pers.dockPosition === 'Left' ? '-left-1 top-1/2 -translate-y-1/2' : pers.dockPosition === 'Right' ? '-right-1 top-1/2 -translate-y-1/2' : pers.dockPosition === 'Top' ? '-top-1 left-1/2 -translate-x-1/2' : '-bottom-1 left-1/2 -translate-x-1/2'} w-1 h-1 rounded-full transition-all ${isActive ? 'bg-white scale-100' : 'bg-white/50 scale-75 group-hover:scale-100'}`} />

                  {/* Tooltip */}
                  {hoveredWindow === component && (
                    <div className={`absolute ${pers.dockPosition === 'Left' ? 'left-full ml-3 top-1/2 -translate-y-1/2' : pers.dockPosition === 'Right' ? 'right-full mr-3 top-1/2 -translate-y-1/2' : pers.dockPosition === 'Top' ? 'top-full mt-3 left-1/2 -translate-x-1/2' : 'bottom-full mb-3 left-1/2 -translate-x-1/2'} px-3 py-1.5 bg-gray-900/90 backdrop-blur-md text-white text-xs rounded-lg shadow-xl whitespace-nowrap border border-white/10 pointer-events-none z-50`}>
                      {mainWin.title} {wins.length > 1 ? `(${wins.length})` : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Spacer to push quick settings to the end */}
          <div className="flex-1 min-w-[20px] min-h-[20px]"></div>

          {/* Quick Settings Area */}
          <button 
            onClick={() => setIsQuickSettingsOpen(!isQuickSettingsOpen)}
            className={`px-3 rounded-full flex items-center justify-center transition-all ${pers.dockPosition === 'Left' || pers.dockPosition === 'Right' ? 'w-10 h-auto py-3 flex-col space-y-2' : 'h-10 space-x-3 ml-2'} ${isQuickSettingsOpen ? 'bg-white/20' : 'hover:bg-white/10 bg-white/5'}`}
          >
            <div className={`flex items-center text-gray-300 ${pers.dockPosition === 'Left' || pers.dockPosition === 'Right' ? 'flex-col space-y-2' : 'space-x-2'}`}>
              {wifiError ? <WifiOff className="w-4 h-4 text-gray-500" /> : <Wifi className="w-4 h-4" />}
              {renderBatteryIcon()}
            </div>
            <span className={`text-sm font-medium text-white ${pers.dockPosition === 'Left' || pers.dockPosition === 'Right' ? 'text-xs' : ''}`}>{format(time, 'h:mm')}</span>
          </button>
        </div>
      </div>

      <AppLauncher isOpen={isLauncherOpen} onClose={() => setIsLauncherOpen(false)} />
      <QuickSettings isOpen={isQuickSettingsOpen} onClose={() => setIsQuickSettingsOpen(false)} position={pers.dockPosition || 'Bottom'} />
    </>
  );
}
