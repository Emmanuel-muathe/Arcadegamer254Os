import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { Wifi, WifiOff, Bluetooth, BluetoothOff, Battery, BatteryCharging, BatteryFull, BatteryLow, BatteryMedium, BatteryWarning, ChevronLeft, ChevronRight, Settings as SettingsIcon, Volume2, VolumeX } from 'lucide-react';
import { useWindowManager } from '../contexts/WindowManagerContext';

export function QuickSettings({ isOpen, onClose, position }: { isOpen: boolean, onClose: () => void, position: string }) {
  const { openWindow } = useWindowManager();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [battery, setBattery] = useState<any>(null);
  const [wifiNetworks, setWifiNetworks] = useState<any[]>([]);
  const [bluetooth, setBluetooth] = useState<any>(null);
  const [audio, setAudio] = useState<any>(null);
  
  const [wifiEnabled, setWifiEnabled] = useState(false);
  const [btEnabled, setBtEnabled] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    // Fetch system states when opened
    fetch('/api/system/battery').then(r => r.json()).then(d => !d.error && setBattery(d)).catch(() => {});
    fetch('/api/system/wifi').then(r => r.json()).then(d => {
      if (!d.error) {
        setWifiNetworks(d.networks || []);
        setWifiEnabled(d.enabled);
      } else {
        setWifiEnabled(false);
      }
    }).catch(() => setWifiEnabled(false));
    
    fetch('/api/system/bluetooth').then(r => r.json()).then(d => {
      if (!d.error) {
        setBluetooth(d);
        setBtEnabled(d.enabled);
      } else {
        setBtEnabled(false);
      }
    }).catch(() => setBtEnabled(false));
    
    fetch('/api/system/audio').then(r => r.json()).then(d => !d.error && setAudio(d)).catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const renderCalendar = () => {
    const startDate = startOfWeek(currentDate);
    const days = [];
    for (let i = 0; i < 42; i++) {
      days.push(addDays(startDate, i));
    }

    return (
      <div className="bg-gray-800/50 rounded-2xl p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold text-lg">{format(currentDate, 'MMMM yyyy')}</span>
          <div className="flex space-x-2">
            <button onClick={() => setCurrentDate(subWeeks(currentDate, 4))} className="p-1 hover:bg-white/10 rounded-full"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => setCurrentDate(addWeeks(currentDate, 4))} className="p-1 hover:bg-white/10 rounded-full"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {days.map((day, i) => {
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            return (
              <div 
                key={i} 
                className={`p-1.5 rounded-full flex items-center justify-center ${isToday ? 'bg-blue-500 text-white font-bold' : isCurrentMonth ? 'text-gray-200 hover:bg-white/10 cursor-pointer' : 'text-gray-600'}`}
              >
                {format(day, 'd')}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'Top': return 'top-16 right-4';
      case 'Left': return 'bottom-4 left-20';
      case 'Right': return 'bottom-4 right-20';
      case 'Bottom': default: return 'bottom-16 right-4';
    }
  };

  const toggleWifi = async () => {
    const newState = !wifiEnabled;
    setWifiEnabled(newState);
    try {
      await fetch('/api/system/wifi/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState })
      });
    } catch (e) {
      setWifiEnabled(!newState);
    }
  };

  const toggleBluetooth = async () => {
    const newState = !btEnabled;
    setBtEnabled(newState);
    try {
      await fetch('/api/system/bluetooth/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState })
      });
    } catch (e) {
      setBtEnabled(!newState);
    }
  };

  const changeVolume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseInt(e.target.value);
    setAudio({ ...audio, volume });
    try {
      await fetch('/api/system/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume })
      });
    } catch (err) {}
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className={`fixed z-50 w-80 bg-gray-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-4 text-gray-100 ${getPositionClasses()} animate-in fade-in slide-in-from-bottom-4 duration-200`}>
        
        {/* Header / Date */}
        <div className="flex justify-between items-center mb-4 px-1">
          <span className="text-sm font-medium">{format(new Date(), 'EEEE, MMM d')}</span>
          <button 
            onClick={() => { onClose(); openWindow('settings', 'System Settings', 'settings'); }}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
          >
            <SettingsIcon className="w-4 h-4 text-gray-300" />
          </button>
        </div>

        {/* Quick Toggles */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div 
            className={`p-3 rounded-xl flex items-center space-x-3 cursor-pointer transition-colors ${wifiEnabled ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
            onClick={toggleWifi}
          >
            <div className={`p-2 rounded-full ${wifiEnabled ? 'bg-blue-500 text-white' : 'bg-white/10'}`}>
              {wifiEnabled ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-sm leading-tight">Wi-Fi</span>
              <span className="text-[10px] opacity-70 truncate max-w-[80px]">{wifiEnabled ? (wifiNetworks[0]?.ssid || 'On') : 'Off'}</span>
            </div>
          </div>

          <div 
            className={`p-3 rounded-xl flex items-center space-x-3 cursor-pointer transition-colors ${btEnabled ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
            onClick={toggleBluetooth}
          >
            <div className={`p-2 rounded-full ${btEnabled ? 'bg-blue-500 text-white' : 'bg-white/10'}`}>
              {btEnabled ? <Bluetooth className="w-4 h-4" /> : <BluetoothOff className="w-4 h-4" />}
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-sm leading-tight">Bluetooth</span>
              <span className="text-[10px] opacity-70 truncate max-w-[80px]">{btEnabled ? (bluetooth?.devices?.find((d:any) => d.connected)?.name || 'On') : 'Off'}</span>
            </div>
          </div>
        </div>

        {/* Sliders */}
        <div className="bg-white/5 rounded-xl p-3 mb-4 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-6 flex justify-center">
              {audio?.muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
            </div>
            <div className="flex-1 flex flex-col space-y-1">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={audio?.volume || 0}
                onChange={changeVolume}
                className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[8px] text-gray-500 font-mono">
                <span>0%</span>
                <span>{audio?.volume || 0}%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 flex justify-center">
              <Battery className="w-4 h-4 text-gray-300" />
            </div>
            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400" style={{ width: `${battery?.capacity || 100}%` }} />
            </div>
            <span className="text-[10px] text-gray-400 w-6 text-right">{battery?.capacity || 100}%</span>
          </div>
        </div>

        {/* Calendar */}
        {renderCalendar()}
      </div>
    </>
  );
}
