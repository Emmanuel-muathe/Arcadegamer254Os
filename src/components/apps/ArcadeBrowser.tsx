import React, { useState, useEffect } from 'react';
import { Globe, Search, ArrowLeft, ArrowRight, RotateCw, Home, AlertTriangle, Shield, ShieldOff } from 'lucide-react';
import { getEmbedUrl } from '../../utils/url';

export function ArcadeBrowser({ initialUrl }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl || 'https://www.google.com/webhp?igu=1');
  const [inputUrl, setInputUrl] = useState(initialUrl || 'https://www.google.com');
  const [loading, setLoading] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [useProxy, setUseProxy] = useState(false);
  const [useAdblock, setUseAdblock] = useState(true);

  useEffect(() => {
    if (initialUrl) {
      handleNavigate(undefined, false, true, initialUrl);
    }
  }, [initialUrl]);

  const handleNavigate = (e?: React.FormEvent, forceProxy?: boolean, forceAdblock?: boolean, targetUrl?: string) => {
    if (e) e.preventDefault();
    let finalUrl = (targetUrl || inputUrl).trim();
    
    // Check if it's a search query (no dot, or contains spaces)
    if (!finalUrl.includes('.') || finalUrl.includes(' ')) {
      finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}&igu=1`;
    } else if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    
    const embedUrl = getEmbedUrl(finalUrl);
    const isEmbed = embedUrl !== finalUrl;
    
    const shouldProxy = forceProxy !== undefined ? forceProxy : useProxy;
    const shouldAdblock = forceAdblock !== undefined ? forceAdblock : useAdblock;
    
    let proxiedUrl = embedUrl;
    if (shouldProxy && !isEmbed) {
      proxiedUrl = `/api/proxy?url=${encodeURIComponent(embedUrl)}&adblock=${shouldAdblock}`;
    }
    
    setUrl(proxiedUrl);
    setInputUrl(finalUrl);
    setIframeError(false);
  };

  const toggleProxy = () => {
    const newProxyState = !useProxy;
    setUseProxy(newProxyState);
    handleNavigate(undefined, newProxyState, useAdblock);
  };

  const toggleAdblock = () => {
    const newAdblockState = !useAdblock;
    setUseAdblock(newAdblockState);
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'TOGGLE_ADBLOCK',
        enabled: newAdblockState
      });
    }
    handleNavigate(undefined, useProxy, newAdblockState);
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-900">
      {/* Browser Chrome */}
      <div className="flex items-center space-x-2 px-4 py-2 bg-gray-100 border-b border-gray-300">
        <div className="flex space-x-1">
          <button className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-600">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-600">
            <ArrowRight className="w-4 h-4" />
          </button>
          <button 
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
            onClick={() => {
              setLoading(true);
              setIframeError(false);
              setTimeout(() => setLoading(false), 500);
            }}
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
            onClick={() => {
              setUrl('https://www.google.com/webhp?igu=1');
              setInputUrl('https://www.google.com');
              setIframeError(false);
            }}
          >
            <Home className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleNavigate} className="flex-1 flex items-center bg-white border border-gray-300 rounded-full px-4 py-1.5 shadow-sm">
          <Globe className="w-4 h-4 text-gray-400 mr-2" />
          <input 
            type="text" 
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="w-full bg-transparent border-none focus:outline-none text-sm"
            placeholder="Search or enter web address"
          />
        </form>
        
        <button
          onClick={toggleAdblock}
          className={`p-2 rounded-full transition-colors ml-2 ${useAdblock ? 'bg-red-100 text-red-600' : 'hover:bg-gray-200 text-gray-600'}`}
          title={useAdblock ? "Adblock Enabled (Blocks known ad domains)" : "Adblock Disabled"}
        >
          <AlertTriangle className="w-4 h-4" />
        </button>

        <button
          onClick={toggleProxy}
          className={`p-2 rounded-full transition-colors ml-1 ${useProxy ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200 text-gray-600'}`}
          title={useProxy ? "Proxy Enabled (Bypasses X-Frame-Options but may break complex sites)" : "Proxy Disabled (Complex sites work, but some may refuse to connect)"}
        >
          {useProxy ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
        </button>
      </div>

      {/* Browser Content */}
      <div className="flex-1 bg-white relative">
        {loading && (
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 animate-pulse z-10" />
        )}
        
        {iframeError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Connection Refused</h2>
            <p className="text-gray-600 mb-6 max-w-md">
              This website does not allow itself to be embedded inside other applications (X-Frame-Options: DENY).
            </p>
          </div>
        ) : (
          <>
            {/* For Electron/Tauri desktop builds, swap this <iframe> for a <webview src={url} className="..." /> */}
            <iframe 
              src={url} 
              className="w-full h-full border-none"
              title="Arcade Browser"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads allow-pointer-lock allow-presentation"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen; microphone; camera; midi; vr; xr-spatial-tracking"
              onLoad={() => setLoading(false)}
              onError={() => setIframeError(true)}
            />
          </>
        )}
      </div>
    </div>
  );
}
