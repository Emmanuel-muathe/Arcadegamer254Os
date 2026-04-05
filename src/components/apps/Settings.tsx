import React, { useState, useEffect } from 'react';
import { 
  Info, Monitor, Volume2, Battery, HardDrive, Wifi, Bluetooth, 
  Palette, Image as ImageIcon, LayoutGrid, Clock, Globe, 
  AppWindow, PlayCircle, Lock, Shield, Search, ChevronRight,
  Cpu, Activity, Type, CheckCircle, WifiOff, Sun, Moon
} from 'lucide-react';

type Category = {
  id: string;
  label: string;
  icon: React.ElementType;
};

type Section = {
  title: string;
  items: Category[];
};

const SECTIONS: Section[] = [
  {
    title: 'System',
    items: [
      { id: 'about', label: 'About', icon: Info },
      { id: 'display', label: 'Display', icon: Monitor },
      { id: 'audio', label: 'Audio', icon: Volume2 },
      { id: 'power', label: 'Power', icon: Battery },
      { id: 'storage', label: 'Storage', icon: HardDrive },
    ]
  },
  {
    title: 'Network & Connectivity',
    items: [
      { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
      { id: 'bluetooth', label: 'Bluetooth', icon: Bluetooth },
    ]
  },
  {
    title: 'Personalization',
    items: [
      { id: 'appearance', label: 'Appearance', icon: Palette },
      { id: 'wallpaper', label: 'Wallpaper', icon: ImageIcon },
      { id: 'fonts', label: 'Fonts', icon: Type },
      { id: 'dock', label: 'Dock Settings', icon: LayoutGrid },
    ]
  },
  {
    title: 'Time & Language',
    items: [
      { id: 'datetime', label: 'Date & Time', icon: Clock },
      { id: 'region', label: 'Region', icon: Globe },
    ]
  },
  {
    title: 'Apps',
    items: [
      { id: 'defaultapps', label: 'Default Apps', icon: AppWindow },
      { id: 'startup', label: 'Startup Apps', icon: PlayCircle },
    ]
  },
  {
    title: 'Security & Privacy',
    items: [
      { id: 'lockscreen', label: 'Lock Screen', icon: Lock },
      { id: 'permissions', label: 'App Permissions', icon: Shield },
    ]
  }
];

export function Settings() {
  const [activeTab, setActiveTab] = useState('about');
  const [searchQuery, setSearchQuery] = useState('');

  // --- Data States ---
  const [aboutData, setAboutData] = useState<any>(null);
  const [storageData, setStorageData] = useState<any>(null);
  const [displayData, setDisplayData] = useState<any>(null);
  const [btData, setBtData] = useState<any>(null);
  const [powerData, setPowerData] = useState<any>(null);
  const [persData, setPersData] = useState<any>(null);
  const [wifiData, setWifiData] = useState<any>(null);
  const [audioData, setAudioData] = useState<any>(null);
  const [dateTimeData, setDateTimeData] = useState<any>(null);
  const [regionData, setRegionData] = useState<any>(null);
  const [defaultAppsData, setDefaultAppsData] = useState<any>(null);
  const [startupData, setStartupData] = useState<any>(null);
  const [permissionsData, setPermissionsData] = useState<any>(null);
  const [lockScreenData, setLockScreenData] = useState<any>(null);

  useEffect(() => {
    let interval: any;

    const fetchData = async () => {
      if (activeTab === 'about' && !aboutData) {
        fetch('/api/system/about').then(r => r.json()).then(setAboutData);
      }
      if (activeTab === 'storage' && !storageData) {
        fetch('/api/system/storage').then(r => r.json()).then(setStorageData);
      }
      if (activeTab === 'display' && !displayData) {
        fetch('/api/system/display').then(r => r.json()).then(setDisplayData);
      }
      if (['appearance', 'wallpaper', 'fonts', 'dock'].includes(activeTab) && !persData) {
        fetch('/api/system/personalization').then(r => r.json()).then(setPersData);
      }
      if (activeTab === 'datetime' && !dateTimeData) {
        fetch('/api/system/datetime').then(r => r.json()).then(setDateTimeData);
      }
      if (activeTab === 'region' && !regionData) {
        fetch('/api/system/region').then(r => r.json()).then(setRegionData);
      }
      if (activeTab === 'defaultapps' && !defaultAppsData) {
        fetch('/api/system/defaultapps').then(r => r.json()).then(setDefaultAppsData);
      }
      if (activeTab === 'startup' && !startupData) {
        fetch('/api/system/startup').then(r => r.json()).then(setStartupData);
      }
      if (activeTab === 'permissions' && !permissionsData) {
        fetch('/api/system/permissions').then(r => r.json()).then(setPermissionsData);
      }
      if (activeTab === 'lockscreen' && !lockScreenData) {
        fetch('/api/system/lockscreen').then(r => r.json()).then(setLockScreenData);
      }

      // Real-time polling for these tabs
      if (activeTab === 'bluetooth') {
        fetch('/api/system/bluetooth').then(r => r.json()).then(setBtData);
      }
      if (activeTab === 'power') {
        fetch('/api/system/power').then(r => r.json()).then(setPowerData);
      }
      if (activeTab === 'wifi') {
        fetch('/api/system/wifi').then(r => r.json()).then(setWifiData);
      }
      if (activeTab === 'audio') {
        fetch('/api/system/audio').then(r => r.json()).then(setAudioData);
      }
    };

    fetchData();

    if (['bluetooth', 'power', 'wifi', 'audio'].includes(activeTab)) {
      interval = setInterval(fetchData, 3000);
    }

    return () => clearInterval(interval);
  }, [activeTab]);

  const updatePers = async (updates: any) => {
    setPersData({ ...persData, ...updates });
    await fetch('/api/system/personalization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    window.dispatchEvent(new Event('pers-updated'));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'about':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-lg flex items-center justify-center border border-white/10">
                <Info className="w-12 h-12 text-white" />
              </div>
              <div>
                <h2 className="text-4xl font-bold tracking-tight text-white">Arcadegamer254 os</h2>
                <p className="text-blue-300 font-medium mt-1">Version {aboutData?.version || 'Loading...'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                <div className="flex items-center space-x-3 mb-4">
                  <Cpu className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Processor</h3>
                </div>
                <p className="text-gray-300 font-mono text-sm">{aboutData?.cpu || 'Loading...'}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                <div className="flex items-center space-x-3 mb-4">
                  <HardDrive className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Installed RAM</h3>
                </div>
                <p className="text-gray-300 font-mono">{aboutData?.ram || 'Loading...'}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                <div className="flex items-center space-x-3 mb-4">
                  <Activity className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Kernel Version</h3>
                </div>
                <p className="text-gray-300 font-mono">{aboutData?.kernel || 'Loading...'}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                <div className="flex items-center space-x-3 mb-4">
                  <Clock className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-semibold text-white">System Uptime</h3>
                </div>
                <p className="text-gray-300 font-mono">{aboutData?.uptime || 'Loading...'}</p>
              </div>
            </div>
          </div>
        );

      case 'storage':
        const percentage = storageData ? parseInt(storageData.usePercentage) : 0;
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Storage</h2>
              <p className="text-gray-400">Manage your disk space and partitions.</p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <HardDrive className="w-8 h-8 text-blue-400" />
                  <div>
                    <h3 className="text-xl font-semibold text-white">Root Partition (/)</h3>
                    <p className="text-gray-400 text-sm">Arch Linux System Drive</p>
                  </div>
                </div>
                <div className="text-right">
                  {storageData?.error ? (
                    <p className="text-red-400 text-sm">{storageData.error}</p>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-white">{storageData?.used || '0G'} <span className="text-gray-500 text-lg font-normal">used</span></p>
                      <p className="text-sm text-gray-400">{storageData?.available || '0G'} free of {storageData?.total || '0G'}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs font-mono text-gray-500">
                <span>0%</span>
                <span>{percentage}% Used</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        );

      case 'display':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Display</h2>
              <p className="text-gray-400">Configure your monitors and resolution.</p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
              <div className="flex items-center space-x-4 mb-4">
                <Monitor className="w-8 h-8 text-blue-400" />
                <div>
                  <h3 className="text-xl font-semibold text-white">Primary Display</h3>
                  <p className="text-gray-400 text-sm">Built-in Screen</p>
                </div>
              </div>

              {displayData?.error ? (
                <div className="text-red-400 text-sm">{displayData.error}</div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Resolution</label>
                    <div className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white">
                      {displayData?.resolution || 'Unknown'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Refresh Rate</label>
                    <div className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white">
                      {displayData?.refreshRate || 'Unknown'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'audio':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Audio</h2>
              <p className="text-gray-400">Manage sound devices and volume.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
              <div className="flex items-center space-x-4 mb-4">
                <Volume2 className="w-8 h-8 text-blue-400" />
                <div>
                  <h3 className="text-xl font-semibold text-white">Master Volume</h3>
                  <p className="text-gray-400 text-sm">Default Output Device</p>
                </div>
              </div>
              
              {audioData?.error ? (
                <div className="text-red-400 text-sm">{audioData.error}</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Volume2 className="w-5 h-5 text-gray-400" />
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={audioData?.volume || 0}
                      onChange={(e) => {
                        const vol = parseInt(e.target.value);
                        setAudioData({ ...audioData, volume: vol });
                        fetch('/api/system/audio', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ volume: vol })
                        });
                      }}
                      className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="text-white font-mono w-8">{audioData?.volume || 0}%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={audioData?.muted || false}
                      onChange={(e) => {
                        const muted = e.target.checked;
                        setAudioData({ ...audioData, muted });
                        fetch('/api/system/audio', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ muted })
                        });
                      }}
                      className="rounded bg-black/50 border-white/20 text-blue-500 focus:ring-blue-500"
                    />
                    <label className="text-sm text-gray-300">Mute</label>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'wifi':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Wi-Fi</h2>
              <p className="text-gray-400">Manage wireless networks.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <Wifi className="w-8 h-8 text-blue-400" />
                  <div>
                    <h3 className="text-xl font-semibold text-white">Wi-Fi</h3>
                    <p className="text-gray-400 text-sm">{wifiData?.enabled ? (wifiData?.networks?.length ? 'Connected' : 'Scanning...') : 'Disabled'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const enabled = !wifiData?.enabled;
                    setWifiData({ ...wifiData, enabled });
                    fetch('/api/system/wifi/toggle', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ enabled })
                    });
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative ${wifiData?.enabled ? 'bg-blue-500' : 'bg-gray-600'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${wifiData?.enabled ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              
              {wifiData?.enabled && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Available Networks</h4>
                  {wifiData?.error ? (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3 text-red-400">
                      <WifiOff className="w-5 h-5" />
                      <span>{wifiData.error}</span>
                    </div>
                  ) : wifiData?.networks?.map((net: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
                      <div>
                        <p className="font-medium text-white">{net.ssid}</p>
                        <p className="text-xs text-gray-500">{net.security}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Wifi className={`w-5 h-5 ${net.signal > 70 ? 'text-green-400' : net.signal > 30 ? 'text-yellow-400' : 'text-red-400'}`} />
                        <button 
                          onClick={() => {
                            fetch('/api/system/wifi/connect', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ ssid: net.ssid })
                            });
                          }}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Connect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'bluetooth':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Bluetooth</h2>
              <p className="text-gray-400">Manage wireless devices and connections.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <Bluetooth className="w-8 h-8 text-blue-400" />
                  <div>
                    <h3 className="text-xl font-semibold text-white">Bluetooth</h3>
                    <p className="text-gray-400 text-sm">{btData?.enabled ? 'Discoverable as "Arcadegamer254-PC"' : 'Disabled'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const enabled = !btData?.enabled;
                    setBtData({ ...btData, enabled });
                    fetch('/api/system/bluetooth/toggle', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ enabled })
                    });
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative ${btData?.enabled ? 'bg-blue-500' : 'bg-gray-600'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${btData?.enabled ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              
              {btData?.enabled && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Paired Devices</h4>
                  {btData?.devices?.map((dev: any) => (
                    <div key={dev.mac} className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
                      <div>
                        <p className="font-medium text-white">{dev.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{dev.mac}</p>
                      </div>
                      <button 
                        onClick={() => {
                          fetch('/api/system/bluetooth/connect', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ mac: dev.mac })
                          });
                        }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Connect
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'power':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Power & Battery</h2>
              <p className="text-gray-400">Monitor battery health and power usage.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center justify-center py-10">
                <Battery className="w-16 h-16 text-green-400 mb-4" />
                <h3 className="text-5xl font-bold text-white mb-2">{powerData?.capacity || '0'}%</h3>
                <p className="text-gray-400">{powerData?.status || 'Unknown'}</p>
              </div>
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Battery Health</h4>
                  <p className="text-2xl font-semibold text-white">{powerData?.health || 'Unknown'}</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Power Mode</h4>
                  <select className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none mt-2">
                    <option>Balanced</option>
                    <option>Power Saver</option>
                    <option>Performance</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Appearance</h2>
              <p className="text-gray-400">Customize the look and feel of your system.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
              <h3 className="text-xl font-semibold text-white">System Theme</h3>
              <div className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-xl">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl ${persData?.theme === 'light' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {persData?.theme === 'light' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="font-medium text-white text-lg">{persData?.theme === 'light' ? 'Light Mode' : 'Dark Mode'}</p>
                    <p className="text-sm text-gray-400">Switch between light and dark themes</p>
                  </div>
                </div>
                <button 
                  onClick={() => updatePers({ theme: persData?.theme === 'light' ? 'dark' : 'light' })}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${persData?.theme === 'light' ? 'bg-blue-500' : 'bg-gray-600'}`}
                >
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${persData?.theme === 'light' ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>
        );

      case 'wallpaper':
        const wallpapers = [
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2000&auto=format&fit=crop'
        ];
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Wallpaper</h2>
              <p className="text-gray-400">Choose your desktop background.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {wallpapers.map((wp, i) => (
                <button 
                  key={i}
                  onClick={() => updatePers({ wallpaper: wp })}
                  className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${persData?.wallpaper === wp ? 'border-blue-500 scale-[1.02] shadow-lg shadow-blue-500/20' : 'border-transparent hover:border-white/20'}`}
                >
                  <img src={wp} alt={`Wallpaper ${i+1}`} className="w-full h-full object-cover" />
                  {persData?.wallpaper === wp && (
                    <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 'fonts':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Fonts</h2>
              <p className="text-gray-400">Configure system typography.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Interface Font</label>
                <select 
                  value={persData?.font || 'Inter'}
                  onChange={(e) => updatePers({ font: e.target.value })}
                  className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option>Inter</option>
                  <option>Roboto</option>
                  <option>Open Sans</option>
                  <option>System Default</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Font Size ({persData?.fontSize || 14}px)</label>
                <input 
                  type="range" 
                  min="12" 
                  max="24" 
                  value={persData?.fontSize || 14}
                  onChange={(e) => updatePers({ fontSize: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          </div>
        );

      case 'datetime':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Date & Time</h2>
              <p className="text-gray-400">Configure system time and timezone.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
              {dateTimeData?.error ? (
                <div className="text-red-400 text-sm">{dateTimeData.error}</div>
              ) : (
                <pre className="text-gray-300 font-mono text-sm whitespace-pre-wrap">
                  {dateTimeData?.raw || 'Loading...'}
                </pre>
              )}
            </div>
          </div>
        );

      case 'region':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Region & Language</h2>
              <p className="text-gray-400">Configure system locale and keyboard layout.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
              {regionData?.error ? (
                <div className="text-red-400 text-sm">{regionData.error}</div>
              ) : (
                <pre className="text-gray-300 font-mono text-sm whitespace-pre-wrap">
                  {regionData?.raw || 'Loading...'}
                </pre>
              )}
            </div>
          </div>
        );

      case 'defaultapps':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Default Apps</h2>
              <p className="text-gray-400">Choose default applications for file types.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
              {defaultAppsData?.error ? (
                <div className="text-red-400 text-sm">{defaultAppsData.error}</div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Web Browser</label>
                    <div className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white">
                      {defaultAppsData?.browser || 'Not set'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">HTTP Handler</label>
                    <div className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white">
                      {defaultAppsData?.urlScheme || 'Not set'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'startup':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Startup Apps</h2>
              <p className="text-gray-400">Manage applications that start automatically.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
              {startupData?.error ? (
                <div className="text-red-400 text-sm">{startupData.error}</div>
              ) : startupData?.apps?.length === 0 ? (
                <p className="text-gray-400 text-sm">No startup applications found.</p>
              ) : (
                <div className="space-y-2">
                  {startupData?.apps?.map((app: string, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                      <span className="font-medium text-white">{app}</span>
                      <div className="w-10 h-5 bg-blue-500 rounded-full relative">
                        <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 left-5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'permissions':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">App Permissions</h2>
              <p className="text-gray-400">Manage granular permissions for sandboxed apps.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
              {permissionsData?.error ? (
                <div className="text-gray-400 text-sm">{permissionsData.error}</div>
              ) : (
                <>
                  <p className="text-sm text-blue-400">{permissionsData?.note}</p>
                  <div className="space-y-2">
                    {permissionsData?.apps?.map((app: string, i: number) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                        <span className="font-medium text-white">{app}</span>
                        <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg">Manage</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        );

      case 'lockscreen':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Lock Screen</h2>
              <p className="text-gray-400">Configure screen lock and timeout.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
              <p className="text-gray-300 text-sm">{lockScreenData?.status || 'Loading...'}</p>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Screen Timeout</label>
                <select className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none appearance-none">
                  <option>5 minutes</option>
                  <option>10 minutes</option>
                  <option>15 minutes</option>
                  <option>Never</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'dock':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Dock Settings</h2>
              <p className="text-gray-400">Customize the system dock.</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Dock Position</label>
                <select 
                  value={persData?.dockPosition || 'Bottom'}
                  onChange={(e) => updatePers({ dockPosition: e.target.value })}
                  className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none appearance-none"
                >
                  <option value="Bottom">Bottom</option>
                  <option value="Top">Top</option>
                  <option value="Left">Left</option>
                  <option value="Right">Right</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">Auto-hide Dock</span>
                <button 
                  onClick={() => updatePers({ dockAutoHide: !persData?.dockAutoHide })}
                  className={`w-10 h-5 rounded-full relative transition-colors ${persData?.dockAutoHide ? 'bg-blue-500' : 'bg-gray-600'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${persData?.dockAutoHide ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4 animate-in fade-in duration-500">
            <SettingsIcon className="w-16 h-16 opacity-20" />
            <p className="text-lg">Select a category from the sidebar</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full w-full bg-[#0f111a] text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-white/10 bg-black/20 backdrop-blur-xl flex flex-col h-full">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search settings..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-6 custom-scrollbar">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="px-3 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all ${
                        isActive 
                          ? 'bg-blue-600/20 text-blue-400' 
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-gradient-to-br from-transparent to-blue-900/10">
        <div className="max-w-3xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// Helper for the default empty state icon
function SettingsIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
