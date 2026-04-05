import React, { useState, useEffect } from 'react';
import { Search, Download, Check, Package as PackageIcon } from 'lucide-react';

export function PackageManager() {
  const [activeTab, setActiveTab] = useState('search');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [installedPackages, setInstalledPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [installingPkg, setInstallingPkg] = useState<string | null>(null);
  const [installLog, setInstallLog] = useState<string>('');

  useEffect(() => {
    if (activeTab === 'installed') fetchInstalled();
  }, [activeTab]);

  const searchPackages = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/system/packages/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.packages || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchInstalled = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/packages/installed');
      const data = await res.json();
      setInstalledPackages(data.packages || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const installPackage = async (pkgName: string) => {
    setInstallingPkg(pkgName);
    setInstallLog(`Requesting polkit authorization to install ${pkgName}...\n`);
    try {
      const res = await fetch('/api/system/packages/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pkg: pkgName })
      });
      const data = await res.json();
      if (data.error) {
        setInstallLog(prev => prev + `\nError: ${data.error}`);
      } else {
        setInstallLog(prev => prev + `\nSuccess:\n${data.output}`);
        // Update search results to show as installed
        setSearchResults(prev => prev.map(p => p.name === pkgName ? { ...p, installed: true } : p));
      }
    } catch (e: any) {
      setInstallLog(prev => prev + `\nException: ${e.message}`);
    }
    setInstallingPkg(null);
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100">
      {/* Header / Tabs */}
      <div className="flex items-center space-x-4 px-6 py-4 bg-gray-900 border-b border-gray-800">
        <PackageIcon className="w-6 h-6 text-blue-500" />
        <h1 className="text-lg font-bold mr-8">Pacman GUI</h1>
        <button 
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'search' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Discover
        </button>
        <button 
          onClick={() => setActiveTab('installed')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'installed' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Installed
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'search' && (
          <div className="p-6 flex flex-col h-full">
            <form onSubmit={searchPackages} className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search Arch Repositories (e.g., firefox, htop)..."
                className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-12 pr-4 py-4 text-lg focus:outline-none focus:border-blue-500 transition-colors"
              />
            </form>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {loading ? (
                <p className="text-center text-gray-500 mt-10">Searching...</p>
              ) : searchResults.map((pkg, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex items-center justify-between hover:border-gray-700 transition-colors">
                  <div>
                    <h3 className="font-bold text-lg">{pkg.name}</h3>
                    <p className="text-sm text-gray-400 mb-1">{pkg.description}</p>
                    <span className="text-xs font-mono bg-gray-800 px-2 py-1 rounded text-gray-300">{pkg.version}</span>
                  </div>
                  <div>
                    {pkg.installed ? (
                      <button disabled className="flex items-center space-x-2 bg-gray-800 text-green-400 px-4 py-2 rounded-lg font-medium cursor-default">
                        <Check className="w-4 h-4" />
                        <span>Installed</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => installPackage(pkg.name)}
                        disabled={installingPkg !== null}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {installingPkg === pkg.name ? (
                          <span>Installing...</span>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>Install</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Install Log Terminal */}
            {installLog && (
              <div className="mt-4 h-48 bg-black border border-gray-800 rounded-xl p-4 font-mono text-xs text-green-400 overflow-y-auto whitespace-pre-wrap">
                {installLog}
              </div>
            )}
          </div>
        )}

        {activeTab === 'installed' && (
          <div className="p-6 flex flex-col h-full">
            <h2 className="text-xl font-bold mb-4">Installed Packages ({installedPackages.length})</h2>
            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-4 pr-2 content-start">
              {loading ? (
                <p className="text-gray-500 col-span-2">Loading installed packages...</p>
              ) : installedPackages.map((pkg, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                  <span className="font-medium truncate mr-4">{pkg.name}</span>
                  <span className="text-xs font-mono text-gray-500 shrink-0">{pkg.version}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
