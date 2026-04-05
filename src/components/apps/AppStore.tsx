import React, { useState, useEffect } from 'react';
import { Search, Download, Check, Trash2, ShoppingBag } from 'lucide-react';
import { getAppIcon, AIcon } from '../../utils/icons';

export function AppStore() {
  const [query, setQuery] = useState('');
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [installingPkg, setInstallingPkg] = useState<string | null>(null);
  const [uninstallingPkg, setUninstallingPkg] = useState<string | null>(null);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/system/packages/search?q=`);
      const data = await res.json();
      setPackages(data.packages || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const searchPackages = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) {
      fetchSuggestions();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/system/packages/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setPackages(data.packages || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const installPackage = async (pkg: any) => {
    setInstallingPkg(pkg.name);
    try {
      const res = await fetch('/api/system/packages/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pkg: pkg.name, isWebApp: pkg.isWebApp })
      });
      const data = await res.json();
      if (!data.error) {
        setPackages(prev => prev.map(p => p.name === pkg.name ? { ...p, installed: true } : p));
      }
    } catch (e) {
      console.error(e);
    }
    setInstallingPkg(null);
  };

  const uninstallPackage = async (pkg: any) => {
    setUninstallingPkg(pkg.name);
    try {
      const res = await fetch('/api/system/packages/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pkg: pkg.name, isWebApp: pkg.isWebApp })
      });
      const data = await res.json();
      if (!data.error) {
        setPackages(prev => prev.map(p => p.name === pkg.name ? { ...p, installed: false } : p));
      }
    } catch (e) {
      console.error(e);
    }
    setUninstallingPkg(null);
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100">
      <div className="flex items-center space-x-4 px-6 py-5 bg-gray-900 border-b border-gray-800">
        <AIcon className="w-7 h-7 text-blue-500" />
        <h1 className="text-xl font-bold">App Store</h1>
      </div>

      <div className="p-6 flex flex-col h-full overflow-hidden">
        <form onSubmit={searchPackages} className="relative mb-6 shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search App Store..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-12 pr-4 py-4 text-lg focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
          />
        </form>

        <div className="flex-1 overflow-y-auto pr-2">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>Search for native Linux applications to install.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 p-5 rounded-xl flex flex-col justify-between hover:border-gray-700 transition-colors shadow-sm">
                  <div className="mb-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-gray-800 rounded-lg">
                        {getAppIcon(pkg)}
                      </div>
                      <h3 className="font-bold text-lg text-blue-100 truncate" title={pkg.name}>{pkg.name}</h3>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2 mb-2" title={pkg.description}>{pkg.description}</p>
                    <span className="inline-block text-xs font-mono bg-gray-800 px-2 py-1 rounded text-gray-300">{pkg.version}</span>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-gray-800/50">
                    {pkg.installed ? (
                      <div className="flex space-x-2">
                        <button disabled className="flex-1 flex justify-center items-center space-x-2 bg-gray-800/50 text-green-400 px-4 py-2 rounded-lg font-medium cursor-default">
                          <Check className="w-4 h-4" />
                          <span>Installed</span>
                        </button>
                        <button 
                          onClick={() => uninstallPackage(pkg)}
                          disabled={uninstallingPkg !== null}
                          className="flex justify-center items-center bg-red-600/20 hover:bg-red-600/40 text-red-400 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                          title="Uninstall"
                        >
                          {uninstallingPkg === pkg.name ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => installPackage(pkg)}
                        disabled={installingPkg !== null}
                        className="w-full flex justify-center items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
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
          )}
        </div>
      </div>
    </div>
  );
}
