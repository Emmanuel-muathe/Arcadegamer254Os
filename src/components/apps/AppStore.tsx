import React, { useState, useEffect } from 'react';
import { Search, Download, Check, Trash2, ShoppingBag, ChevronLeft, Star, Monitor, Gamepad2, Image as ImageIcon, Code, Box, RefreshCw, LayoutGrid, Globe } from 'lucide-react';
import { getAppIcon, AIcon } from '../../utils/icons';

type ViewState = 'home' | 'category' | 'details' | 'updates';

export function AppStore() {
  const [query, setQuery] = useState('');
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [installingPkg, setInstallingPkg] = useState<string | null>(null);
  const [uninstallingPkg, setUninstallingPkg] = useState<string | null>(null);
  
  const [viewState, setViewState] = useState<ViewState>('home');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [updatingAll, setUpdatingAll] = useState(false);

  useEffect(() => {
    fetchSuggestions();
    // Simulate finding updates for installed apps
    setTimeout(() => {
      setUpdates([
        { name: 'Firefox', version: '115.0.2', newVersion: '116.0', icon: 'browser', isWebApp: false },
        { name: 'Spotify', version: '1.2.14', newVersion: '1.2.15', icon: 'music', isWebApp: true }
      ]);
    }, 2000);
  }, []);

  const handleUpdateAll = async () => {
    setUpdatingAll(true);
    // Simulate update process
    await new Promise(resolve => setTimeout(resolve, 3000));
    setUpdates([]);
    setUpdatingAll(false);
  };

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

  const searchPackages = async (e: React.FormEvent | string) => {
    if (typeof e !== 'string') e.preventDefault();
    const searchQuery = typeof e === 'string' ? e : query;
    
    if (!searchQuery) {
      fetchSuggestions();
      setViewState('home');
      return;
    }
    
    setLoading(true);
    setViewState('category');
    setSelectedCategory('Search Results');
    try {
      const res = await fetch(`/api/system/packages/search?q=${encodeURIComponent(searchQuery)}`);
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
        if (selectedApp && selectedApp.name === pkg.name) {
          setSelectedApp({ ...selectedApp, installed: true });
        }
        window.dispatchEvent(new CustomEvent('pers-updated'));
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
        if (selectedApp && selectedApp.name === pkg.name) {
          setSelectedApp({ ...selectedApp, installed: false });
        }
        window.dispatchEvent(new CustomEvent('pers-updated'));
      }
    } catch (e) {
      console.error(e);
    }
    setUninstallingPkg(null);
  };

  const categories = [
    { id: 'Development', name: 'Development', icon: Code },
    { id: 'Games', name: 'Games', icon: Gamepad2 },
    { id: 'Graphics', name: 'Graphics & Design', icon: ImageIcon },
    { id: 'Internet', name: 'Internet', icon: Monitor },
    { id: 'Media', name: 'Media', icon: Star },
    { id: 'System', name: 'System', icon: Box },
  ];

  const featuredApps = packages.filter(p => p.isWebApp && ['vscode', 'spotify', 'discord', 'photopea'].includes(p.name));
  
  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setViewState('category');
    setQuery('');
  };

  const handleAppClick = (app: any) => {
    setSelectedApp(app);
    setViewState('details');
  };

  const renderAppCard = (pkg: any) => (
    <div 
      key={pkg.name} 
      onClick={() => handleAppClick(pkg)}
      className="bg-gray-900 border border-gray-800 p-5 rounded-xl flex flex-col justify-between hover:border-gray-700 transition-colors shadow-sm cursor-pointer group"
    >
      <div className="mb-4">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-gray-800 rounded-xl group-hover:scale-105 transition-transform">
            {getAppIcon(pkg)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-gray-100 truncate" title={pkg.name}>{pkg.name}</h3>
            <p className="text-xs text-gray-400 truncate">{pkg.isWebApp ? 'Web App' : 'Native Package'}</p>
          </div>
        </div>
        <p className="text-sm text-gray-400 line-clamp-2 mb-2" title={pkg.description}>{pkg.description}</p>
      </div>
      
      <div className="mt-auto pt-4 border-t border-gray-800/50 flex justify-between items-center">
        <span className="inline-block text-xs font-mono bg-gray-800 px-2 py-1 rounded text-gray-300">{pkg.version}</span>
        {pkg.installed ? (
          <span className="text-green-400 text-sm font-medium flex items-center"><Check className="w-4 h-4 mr-1" /> Installed</span>
        ) : (
          <span className="text-blue-400 text-sm font-medium group-hover:underline">Install</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-gray-950 text-gray-100 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        <div className="p-6 flex items-center space-x-3">
          <ShoppingBag className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-bold">Software</h1>
        </div>
        
        <div className="px-4 pb-4">
          <form onSubmit={searchPackages} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </form>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          <button 
            onClick={() => { setViewState('home'); setQuery(''); }}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${viewState === 'home' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-gray-800 text-gray-300'}`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span>Explore</span>
          </button>
          <button 
            onClick={() => { setViewState('updates'); setQuery(''); }}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${viewState === 'updates' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-gray-800 text-gray-300'}`}
          >
            <RefreshCw className="w-5 h-5" />
            <span>Updates</span>
          </button>
          
          <div className="pt-4 pb-2 px-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Categories</p>
          </div>
          
          {categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${viewState === 'category' && selectedCategory === cat.id ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-gray-800 text-gray-300'}`}
            >
              <cat.icon className="w-5 h-5" />
              <span>{cat.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">
        <div className="flex-1 overflow-y-auto p-8">
          
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* Home View */}
              {viewState === 'home' && (
                <div className="space-y-10 animate-in fade-in duration-500">
                  {/* Featured Carousel */}
                  {featuredApps.length > 0 && (
                    <div className="space-y-4">
                      <h2 className="text-2xl font-bold">Featured</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {featuredApps.slice(0, 2).map(pkg => (
                          <div 
                            key={pkg.name}
                            onClick={() => handleAppClick(pkg)}
                            className="relative overflow-hidden rounded-2xl aspect-[2/1] cursor-pointer group border border-gray-800 hover:border-gray-600 transition-colors"
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-purple-900/40 group-hover:scale-105 transition-transform duration-700"></div>
                            <div className="absolute inset-0 p-6 flex flex-col justify-end bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent">
                              <div className="flex items-center space-x-4">
                                <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center shadow-xl border border-gray-800">
                                  {getAppIcon(pkg)}
                                </div>
                                <div>
                                  <h3 className="text-2xl font-bold text-white">{pkg.name}</h3>
                                  <p className="text-gray-300 line-clamp-1">{pkg.description}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended */}
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Recommended</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {packages.filter(p => !featuredApps.includes(p)).slice(0, 9).map(renderAppCard)}
                    </div>
                  </div>
                </div>
              )}

              {/* Category / Search Results View */}
              {viewState === 'category' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <h2 className="text-3xl font-bold">{selectedCategory}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {packages
                      .filter(p => selectedCategory === 'Search Results' || p.category === selectedCategory)
                      .map(renderAppCard)}
                    {packages.filter(p => selectedCategory === 'Search Results' || p.category === selectedCategory).length === 0 && (
                      <div className="col-span-full text-center py-20 text-gray-500">
                        <Box className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p>No applications found in this category.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* App Details View */}
              {viewState === 'details' && selectedApp && (
                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <button 
                    onClick={() => setViewState('home')}
                    className="flex items-center text-gray-400 hover:text-white mb-8 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 mr-1" /> Back
                  </button>
                  
                  <div className="flex items-start space-x-8 mb-10">
                    <div className="w-32 h-32 shrink-0 bg-gray-900 border border-gray-800 rounded-3xl flex items-center justify-center shadow-2xl">
                      {getAppIcon(selectedApp)}
                    </div>
                    <div className="flex-1 pt-2">
                      <h1 className="text-4xl font-bold text-white mb-2">{selectedApp.name}</h1>
                      <p className="text-xl text-gray-400 mb-6">{selectedApp.description}</p>
                      
                      <div className="flex items-center space-x-4">
                        {selectedApp.installed ? (
                          <>
                            <button 
                              className="px-8 py-3 bg-gray-800 text-white rounded-xl font-medium flex items-center space-x-2"
                            >
                              <Check className="w-5 h-5 text-green-400" />
                              <span>Installed</span>
                            </button>
                            <button 
                              onClick={() => uninstallPackage(selectedApp)}
                              disabled={uninstallingPkg !== null}
                              className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center space-x-2"
                            >
                              {uninstallingPkg === selectedApp.name ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-400"></div>
                              ) : (
                                <Trash2 className="w-5 h-5" />
                              )}
                              <span>Uninstall</span>
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => installPackage(selectedApp)}
                            disabled={installingPkg !== null}
                            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center space-x-2 shadow-lg shadow-blue-500/20"
                          >
                            {installingPkg === selectedApp.name ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                              <Download className="w-5 h-5" />
                            )}
                            <span>Install</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6 mb-10">
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl">
                      <p className="text-sm text-gray-500 mb-1">Version</p>
                      <p className="font-mono text-gray-200">{selectedApp.version}</p>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl">
                      <p className="text-sm text-gray-500 mb-1">Source</p>
                      <p className="text-gray-200 flex items-center">
                        {selectedApp.isWebApp ? (
                          <><Globe className="w-4 h-4 mr-2 text-blue-400" /> Web App</>
                        ) : (
                          <><Box className="w-4 h-4 mr-2 text-purple-400" /> Native Package</>
                        )}
                      </p>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl">
                      <p className="text-sm text-gray-500 mb-1">Category</p>
                      <p className="text-gray-200">{selectedApp.category || 'Unknown'}</p>
                    </div>
                  </div>

                  <div className="mb-10">
                    <h3 className="text-xl font-bold mb-4">Screenshots</h3>
                    <div className="flex space-x-4 overflow-x-auto pb-4 snap-x">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="shrink-0 w-[600px] aspect-video bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden snap-center relative">
                          <img 
                            src={`https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop&sig=${selectedApp.name}${i}`} 
                            alt="Screenshot" 
                            className="w-full h-full object-cover opacity-50"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-gray-700" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="prose prose-invert max-w-none">
                    <h3 className="text-xl font-bold mb-4">About this app</h3>
                    <p className="text-gray-300 leading-relaxed">
                      {selectedApp.description}. This application is available as a {selectedApp.isWebApp ? 'Web Application, meaning it runs securely within the browser environment without requiring deep system access.' : 'Native Linux Package, providing deep system integration and performance.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Updates View */}
              {viewState === 'updates' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold">Updates</h2>
                    <button 
                      onClick={handleUpdateAll}
                      disabled={updatingAll || updates.length === 0}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                    >
                      {updatingAll ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      <span>{updatingAll ? 'Updating...' : 'Update All'}</span>
                    </button>
                  </div>
                  
                  {updates.length > 0 ? (
                    <div className="space-y-4">
                      {updates.map(pkg => (
                        <div key={pkg.name} className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                              {getAppIcon(pkg)}
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-white">{pkg.name}</h3>
                              <p className="text-sm text-gray-400">Version {pkg.version} → <span className="text-blue-400">{pkg.newVersion}</span></p>
                            </div>
                          </div>
                          <button 
                            disabled={updatingAll}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Update
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
                      <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-white mb-2">System is up to date</h3>
                      <p className="text-gray-400">All your installed applications are running the latest versions.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
