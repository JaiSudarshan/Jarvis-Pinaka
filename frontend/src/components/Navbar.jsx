import React from 'react';
import { 
  Bot, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Radio, 
  ShieldAlert, 
  Zap, 
  Bell, 
  History, 
  RotateCcw 
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, health, sseConnected, onResetDemo, reminderCount }) {
  const [time, setTime] = React.useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'planner', label: 'Command & Execution', icon: Zap },
    { id: 'history', label: 'Task Timeline', icon: History },
    { id: 'reminders', label: 'Reminders', icon: Bell, badge: reminderCount },
    { id: 'integrations', label: 'Integrations', icon: Layers },
    { id: 'chaos', label: 'Resilience Sandbox', icon: ShieldAlert, highlight: true },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07090e]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & App Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('planner')}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-lg shadow-cyan-500/25 border border-cyan-400/30">
              <Bot className="w-5 h-5 text-white animate-pulse" />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#07090e] pulse-green"></div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
                  JARVIS ONE
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 uppercase tracking-widest">
                  Autonomous
                </span>
              </div>
              <p className="text-[11px] text-slate-400 tracking-tight">
                Multi-Action Assistant • Read-After-Write Verified
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center space-x-1.5 p-1 rounded-xl bg-slate-900/60 border border-white/5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive 
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Status Pill & Reset */}
          <div className="flex items-center space-x-3">
            {/* Live SSE & Time Indicator */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-white/10 text-xs">
              <span className="flex items-center space-x-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono text-[11px] text-slate-300">{time}</span>
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center space-x-1.5" title={sseConnected ? 'SSE Stream Online' : 'Connecting to SSE...'}>
                <Radio className={`w-3.5 h-3.5 ${sseConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
                <span className={`text-[11px] font-semibold ${sseConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {sseConnected ? 'LIVE SYNC' : 'OFFLINE'}
                </span>
              </span>
            </div>

            {/* Reset Injections Button */}
            <button
              onClick={onResetDemo}
              title="Reset all failure injection simulations"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-xs text-slate-300 hover:text-white transition-all shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden lg:inline text-[11px]">Reset Sandbox</span>
            </button>
          </div>
        </div>

        {/* Mobile Tab Row */}
        <div className="flex md:hidden items-center space-x-1 py-2 overflow-x-auto border-t border-white/5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                  isActive 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
}
