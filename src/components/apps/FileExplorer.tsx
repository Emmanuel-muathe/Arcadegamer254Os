import React, { useState, useEffect, useRef } from 'react';
import { Folder, File, ChevronRight, ChevronLeft, Home, HardDrive, FileText, Image as ImageIcon, Music, Video, Archive, Code, Search, RefreshCw, AlertCircle, Plus, Trash2, Edit2, Save, Download, Clock, Terminal } from 'lucide-react';
import { format } from 'date-fns';

export function FileExplorer() {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, file: any | null } | null>(null);
  const [showNewDialog, setShowNewDialog] = useState<'file' | 'folder' | null>(null);
  const [showRenameDialog, setShowRenameDialog] = useState<any | null>(null);
  const [dialogInput, setDialogInput] = useState('');

  useEffect(() => {
    loadFiles(''); // Load home directory initially
    
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const loadFiles = async (path: string, addToHistory = true) => {
    setLoading(true);
    setError(null);
    setFileContent(null);
    setSelectedFile(null);
    setIsEditing(false);
    try {
      const res = await fetch(`/api/system/files/list?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setFiles(data.files);
        setCurrentPath(data.path);
        
        if (addToHistory) {
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(data.path);
          setHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      loadFiles(history[newIndex], false);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      loadFiles(history[newIndex], false);
    }
  };

  const goUp = () => {
    if (currentPath === '/') return;
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    loadFiles(parentPath);
  };

  const isMediaFile = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'mp4', 'webm', 'mp3', 'wav', 'ogg'].includes(ext || '');
  };

  const handleItemClick = async (item: any) => {
    if (item.isDirectory) {
      loadFiles(item.path);
    } else {
      setSelectedFile(item);
      setIsEditing(false);
      
      if (isMediaFile(item.name)) {
        setFileContent('media');
        return;
      }
      
      setLoading(true);
      try {
        const res = await fetch(`/api/system/files/read?path=${encodeURIComponent(item.path)}`);
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setFileContent(data.content);
        }
      } catch (err: any) {
        setError(err.message);
      }
      setLoading(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, file: any) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  const handleAction = async (action: string, path: string, newPath?: string, isDir?: boolean, content?: string) => {
    try {
      const res = await fetch('/api/system/files/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, path, newPath, isDir, content })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        if (action !== 'write') loadFiles(currentPath, false);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': return <ImageIcon className="w-5 h-5 text-blue-400" />;
      case 'mp3': case 'wav': case 'ogg': return <Music className="w-5 h-5 text-purple-400" />;
      case 'mp4': case 'webm': case 'mkv': return <Video className="w-5 h-5 text-red-400" />;
      case 'zip': case 'tar': case 'gz': case 'rar': return <Archive className="w-5 h-5 text-yellow-400" />;
      case 'js': case 'ts': case 'jsx': case 'tsx': case 'json': case 'html': case 'css': return <Code className="w-5 h-5 text-green-400" />;
      case 'txt': case 'md': case 'csv': return <FileText className="w-5 h-5 text-gray-400" />;
      default: return <File className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="flex h-full bg-gray-900 text-gray-100 font-sans relative" onContextMenu={(e) => {
      if (!fileContent) handleContextMenu(e, null);
    }}>
      {/* Sidebar */}
      <div className="w-48 bg-gray-800/50 border-r border-gray-700 flex flex-col py-2 overflow-y-auto">
        <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick Access</div>
        <button onClick={() => loadFiles('~/Recent')} className="flex items-center px-4 py-2 text-sm hover:bg-white/10 text-gray-300 hover:text-white transition-colors">
          <Clock className="w-4 h-4 mr-3" /> Recent
        </button>
        <button onClick={() => loadFiles('~/Audio')} className="flex items-center px-4 py-2 text-sm hover:bg-white/10 text-gray-300 hover:text-white transition-colors">
          <Music className="w-4 h-4 mr-3" /> Audio
        </button>
        <button onClick={() => loadFiles('~/Images')} className="flex items-center px-4 py-2 text-sm hover:bg-white/10 text-gray-300 hover:text-white transition-colors">
          <ImageIcon className="w-4 h-4 mr-3" /> Images
        </button>
        <button onClick={() => loadFiles('~/Videos')} className="flex items-center px-4 py-2 text-sm hover:bg-white/10 text-gray-300 hover:text-white transition-colors">
          <Video className="w-4 h-4 mr-3" /> Videos
        </button>
        
        <div className="px-4 py-2 mt-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Files</div>
        <button onClick={() => loadFiles('~')} className="flex items-center px-4 py-2 text-sm hover:bg-white/10 text-gray-300 hover:text-white transition-colors">
          <Folder className="w-4 h-4 mr-3" /> My files
        </button>
        <button onClick={() => loadFiles('~/Downloads')} className="flex items-center px-4 py-2 text-sm hover:bg-white/10 text-gray-300 hover:text-white transition-colors pl-8">
          <Download className="w-4 h-4 mr-3" /> Downloads
        </button>
        <button onClick={() => loadFiles('/')} className="flex items-center px-4 py-2 text-sm hover:bg-white/10 text-gray-300 hover:text-white transition-colors pl-8">
          <Terminal className="w-4 h-4 mr-3" /> Linux files
        </button>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center p-2 bg-gray-800 border-b border-gray-700 gap-2">
          <div className="flex gap-1">
            <button onClick={goBack} disabled={historyIndex <= 0} className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-transparent">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={goForward} disabled={historyIndex >= history.length - 1} className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-transparent">
              <ChevronRight className="w-5 h-5" />
            </button>
            <button onClick={goUp} disabled={currentPath === '/'} className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-transparent">
              <ChevronLeft className="w-5 h-5 rotate-90" />
            </button>
            <button onClick={() => loadFiles('')} className="p-1.5 rounded hover:bg-gray-700">
              <Home className="w-5 h-5" />
            </button>
            <button onClick={() => loadFiles(currentPath, false)} className="p-1.5 rounded hover:bg-gray-700">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="flex-1 flex items-center bg-gray-950 rounded px-3 py-1.5 border border-gray-700">
            <HardDrive className="w-4 h-4 text-gray-400 mr-2" />
            <input 
              type="text" 
              value={currentPath}
              onChange={(e) => setCurrentPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadFiles(currentPath)}
              className="bg-transparent border-none outline-none flex-1 text-sm text-gray-200"
            />
          </div>
          
          <div className="flex gap-1">
            <button onClick={() => { setDialogInput(''); setShowNewDialog('file'); }} className="p-1.5 rounded hover:bg-gray-700 text-gray-300" title="New File">
              <File className="w-5 h-5" />
            </button>
            <button onClick={() => { setDialogInput(''); setShowNewDialog('folder'); }} className="p-1.5 rounded hover:bg-gray-700 text-gray-300" title="New Folder">
              <Folder className="w-5 h-5" />
            </button>
          </div>
        </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 bg-gray-800/50 border-r border-gray-700 p-2 flex flex-col gap-1 overflow-y-auto">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-1 mt-2">Places</div>
          <button onClick={() => loadFiles('')} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700 text-sm text-gray-300">
            <Home className="w-4 h-4 text-blue-400" /> Home
          </button>
          <button onClick={() => loadFiles('/')} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700 text-sm text-gray-300">
            <HardDrive className="w-4 h-4 text-gray-400" /> Root
          </button>
        </div>

        {/* File List or File Viewer */}
        <div className="flex-1 overflow-y-auto bg-gray-900 p-4">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-400 gap-2">
              <AlertCircle className="w-12 h-12" />
              <p>{error}</p>
            </div>
          ) : fileContent !== null ? (
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {getFileIcon(selectedFile?.name || '')}
                  {selectedFile?.name}
                </h2>
                <div className="flex gap-2">
                  <a 
                    href={`/api/system/files/serve?path=${encodeURIComponent(selectedFile?.path)}`} 
                    download={selectedFile?.name}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" /> Download
                  </a>
                  {fileContent !== 'media' && (
                    <button 
                      onClick={() => {
                        if (isEditing) handleAction('write', selectedFile.path, undefined, false, fileContent);
                        setIsEditing(!isEditing);
                      }} 
                      className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${isEditing ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                      {isEditing ? <><Save className="w-4 h-4" /> Save</> : <><Edit2 className="w-4 h-4" /> Edit</>}
                    </button>
                  )}
                  <button onClick={() => setFileContent(null)} className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm">Close</button>
                </div>
              </div>
              
              {fileContent === 'media' ? (
                <div className="flex-1 flex items-center justify-center bg-black/50 rounded border border-gray-800 overflow-hidden">
                  {selectedFile?.name.match(/\.(mp4|webm|ogg)$/i) ? (
                    <video controls src={`/api/system/files/serve?path=${encodeURIComponent(selectedFile?.path)}`} className="max-w-full max-h-full" />
                  ) : selectedFile?.name.match(/\.(mp3|wav|ogg)$/i) ? (
                    <audio controls src={`/api/system/files/serve?path=${encodeURIComponent(selectedFile?.path)}`} />
                  ) : (
                    <img src={`/api/system/files/serve?path=${encodeURIComponent(selectedFile?.path)}`} alt={selectedFile?.name} className="max-w-full max-h-full object-contain" />
                  )}
                </div>
              ) : isEditing ? (
                <textarea 
                  value={fileContent} 
                  onChange={(e) => setFileContent(e.target.value)}
                  className="flex-1 p-4 bg-gray-950 rounded border border-gray-700 text-sm font-mono text-gray-300 outline-none resize-none"
                />
              ) : (
                <pre className="flex-1 p-4 bg-gray-950 rounded border border-gray-800 overflow-auto text-sm font-mono text-gray-300 whitespace-pre-wrap">
                  {fileContent}
                </pre>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-[minmax(200px,1fr)_100px_150px] gap-4 border-b border-gray-800 pb-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
              <div>Name</div>
              <div>Size</div>
              <div>Modified</div>
            </div>
          )}
          
          {!error && fileContent === null && (
            <div className="flex flex-col">
              {files.map((file, i) => (
                <div 
                  key={i} 
                  onClick={() => handleItemClick(file)}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                  className="grid grid-cols-[minmax(200px,1fr)_100px_150px] gap-4 items-center px-2 py-2 hover:bg-blue-600/20 rounded cursor-pointer group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {file.isDirectory ? <Folder className="w-5 h-5 text-blue-400 flex-shrink-0" /> : getFileIcon(file.name)}
                    <span className="truncate text-sm text-gray-200 group-hover:text-white">{file.name}</span>
                  </div>
                  <div className="text-xs text-gray-500">{file.isDirectory ? '--' : formatSize(file.size)}</div>
                  <div className="text-xs text-gray-500">{format(new Date(file.modified), 'MMM d, yyyy HH:mm')}</div>
                </div>
              ))}
              {files.length === 0 && !loading && (
                <div className="text-center text-gray-500 mt-10">This folder is empty</div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-3 py-1 text-xs text-gray-400 flex justify-between">
        <span>{files.length} items</span>
        <span>{selectedFile ? formatSize(selectedFile.size) : ''}</span>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed bg-gray-800 border border-gray-700 rounded shadow-xl py-1 z-50 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.file ? (
            <>
              <button 
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 flex items-center gap-2"
                onClick={() => {
                  setDialogInput(contextMenu.file.name);
                  setShowRenameDialog(contextMenu.file);
                  setContextMenu(null);
                }}
              >
                <Edit2 className="w-4 h-4" /> Rename
              </button>
              <button 
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-600 hover:text-white flex items-center gap-2"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ${contextMenu.file.name}?`)) {
                    handleAction('delete', contextMenu.file.path);
                  }
                  setContextMenu(null);
                }}
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </>
          ) : (
            <>
              <button 
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 flex items-center gap-2"
                onClick={() => { setDialogInput(''); setShowNewDialog('folder'); setContextMenu(null); }}
              >
                <Folder className="w-4 h-4" /> New Folder
              </button>
              <button 
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600 flex items-center gap-2"
                onClick={() => { setDialogInput(''); setShowNewDialog('file'); setContextMenu(null); }}
              >
                <File className="w-4 h-4" /> New File
              </button>
            </>
          )}
        </div>
      )}

      {/* Dialogs */}
      {(showNewDialog || showRenameDialog) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 w-80 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4 text-white">
              {showNewDialog === 'folder' ? 'New Folder' : showNewDialog === 'file' ? 'New File' : 'Rename'}
            </h3>
            <input 
              type="text" 
              autoFocus
              value={dialogInput}
              onChange={(e) => setDialogInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (showNewDialog) {
                    handleAction('create', `${currentPath}/${dialogInput}`, undefined, showNewDialog === 'folder');
                    setShowNewDialog(null);
                  } else if (showRenameDialog) {
                    const newPath = showRenameDialog.path.replace(showRenameDialog.name, dialogInput);
                    handleAction('rename', showRenameDialog.path, newPath);
                    setShowRenameDialog(null);
                  }
                } else if (e.key === 'Escape') {
                  setShowNewDialog(null);
                  setShowRenameDialog(null);
                }
              }}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white mb-4 outline-none focus:border-blue-500"
              placeholder="Name..."
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => { setShowNewDialog(null); setShowRenameDialog(null); }}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (showNewDialog) {
                    handleAction('create', `${currentPath}/${dialogInput}`, undefined, showNewDialog === 'folder');
                    setShowNewDialog(null);
                  } else if (showRenameDialog) {
                    const newPath = showRenameDialog.path.replace(showRenameDialog.name, dialogInput);
                    handleAction('rename', showRenameDialog.path, newPath);
                    setShowRenameDialog(null);
                  }
                }}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
