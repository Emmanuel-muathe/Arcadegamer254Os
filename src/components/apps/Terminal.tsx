import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Plus, X } from 'lucide-react';

export function Terminal() {
  const [history, setHistory] = useState<{ type: 'input' | 'output', text: string }[]>([
    { type: 'output', text: 'Welcome to Penguin (Linux container)' },
    { type: 'output', text: 'Type "help" for a list of available commands.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input.trim();
    setInput('');
    setHistory(prev => [...prev, { type: 'input', text: `arcadegamer254@penguin:~$ ${cmd}` }]);

    if (cmd === 'clear') {
      setHistory([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/system/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      });
      const data = await res.json();
      setHistory(prev => [...prev, { type: 'output', text: data.output || '' }]);
    } catch (err: any) {
      setHistory(prev => [...prev, { type: 'output', text: `Error: ${err.message}` }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#202124] text-gray-100 font-sans overflow-hidden">
      {/* Chrome OS Terminal Tab Bar */}
      <div className="flex items-center bg-[#292a2d] h-10 border-b border-black/20 px-2 select-none">
        <div className="flex items-center bg-[#3c4043] h-8 px-4 rounded-t-md min-w-[150px] max-w-[200px] border-t border-x border-white/10 relative group">
          <TerminalIcon className="w-4 h-4 text-blue-400 mr-2" />
          <span className="text-sm text-gray-200 truncate flex-1">penguin</span>
          <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded-full transition-opacity">
            <X className="w-3 h-3 text-gray-400" />
          </button>
        </div>
        <button className="w-8 h-8 flex items-center justify-center ml-1 hover:bg-white/10 rounded-full transition-colors text-gray-400">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 flex flex-col p-4 font-mono text-[15px] leading-relaxed overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5">
          {history.map((line, i) => (
            <div key={i} className={`whitespace-pre-wrap ${line.type === 'input' ? 'text-gray-100' : 'text-gray-300'}`}>
              {line.text}
            </div>
          ))}
          {loading && <div className="text-gray-500">Executing...</div>}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={handleCommand} className="flex items-center mt-1">
          <span className="text-green-400 font-bold mr-2">arcadegamer254@penguin:~$</span>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-1 bg-transparent outline-none text-gray-100 caret-gray-100"
            autoFocus
            disabled={loading}
            spellCheck={false}
            autoComplete="off"
          />
        </form>
      </div>
    </div>
  );
}
