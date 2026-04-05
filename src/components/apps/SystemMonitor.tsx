import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive } from 'lucide-react';

export function SystemMonitor() {
  const [cpu, setCpu] = useState(0);
  const [ram, setRam] = useState(0);
  const [memTotal, setMemTotal] = useState(0);
  const [memAvail, setMemAvail] = useState(0);

  useEffect(() => {
    const fetchMonitor = async () => {
      try {
        const res = await fetch('/api/system/monitor');
        const data = await res.json();
        if (data.cpu !== undefined) setCpu(data.cpu);
        if (data.ram !== undefined) setRam(data.ram);
        if (data.memTotal !== undefined) setMemTotal(data.memTotal);
        if (data.memAvail !== undefined) setMemAvail(data.memAvail);
      } catch (e) {
        console.error("Failed to fetch system monitor data", e);
      }
    };

    fetchMonitor();
    const interval = setInterval(fetchMonitor, 1000);
    return () => clearInterval(interval);
  }, []);

  const memUsed = memTotal - memAvail;

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100 p-6">
      <div className="flex items-center space-x-3 mb-8">
        <Activity className="w-7 h-7 text-green-400" />
        <h1 className="text-2xl font-bold">System Monitor</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CPU Monitor */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Cpu className="w-6 h-6 text-blue-400" />
              <h2 className="text-lg font-semibold">CPU Usage</h2>
            </div>
            <span className="text-xl font-mono font-bold text-blue-400">{cpu.toFixed(1)}%</span>
          </div>
          
          <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-500 ease-out" 
              style={{ width: `${cpu}%` }}
            />
          </div>
          
          <div className="mt-4 text-xs text-gray-500 font-mono">
            Reading from /proc/stat
          </div>
        </div>

        {/* RAM Monitor */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <HardDrive className="w-6 h-6 text-purple-400" />
              <h2 className="text-lg font-semibold">RAM Usage</h2>
            </div>
            <span className="text-xl font-mono font-bold text-purple-400">{ram.toFixed(1)}%</span>
          </div>
          
          <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden mb-2">
            <div 
              className="bg-purple-500 h-full transition-all duration-500 ease-out" 
              style={{ width: `${ram}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-gray-400 font-mono">
            <span>Used: {(memUsed / 1024).toFixed(1)} MB</span>
            <span>Total: {(memTotal / 1024).toFixed(1)} MB</span>
          </div>
          <div className="mt-2 text-xs text-gray-500 font-mono">
            Reading from /proc/meminfo
          </div>
        </div>
      </div>
    </div>
  );
}
