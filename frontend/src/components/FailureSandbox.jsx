import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  RotateCcw, 
  AlertTriangle, 
  Zap, 
  CheckCircle2, 
  Info, 
  Flame, 
  Terminal, 
  Car, 
  Mail, 
  Clock, 
  Bug
} from 'lucide-react';
import { listDemoInjections, toggleDemoInjection, resetDemoInjections } from '../services/api';

export default function FailureSandbox({ onLaunchTestScenario }) {
  const [injections, setInjections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadInjections = async () => {
    try {
      setIsLoading(true);
      const data = await listDemoInjections();
      setInjections(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInjections();
  }, []);

  const handleToggle = async (key, currentVal) => {
    try {
      await toggleDemoInjection(key, !currentVal);
      await loadInjections();
    } catch (err) {
      alert(`Error toggling failure injection: ${err.message}`);
    }
  };

  const handleReset = async () => {
    try {
      await resetDemoInjections();
      await loadInjections();
    } catch (err) {
      alert(`Error resetting: ${err.message}`);
    }
  };

  const activeCount = injections.filter(i => i.enabled === 1).length;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="glass-panel-glow rounded-2xl p-6 border-amber-500/30 bg-amber-950/15">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Resilience Sandbox & Chaos Engineering
                </h2>
                <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Read-After-Write Verification Testbed
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Test how JARVIS ONE prevents real-world catastrophes. Standard LLM agents assume an HTTP 200 OK means success. JARVIS executes an independent read-after-write verification to expose silent drops, provider timeouts, and immediately triggers alternative fallback strategies.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleReset}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-slate-200 transition-all shadow-md active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Reset All Injections ({activeCount} Active)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Failure Injection Toggles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {injections.map((item) => {
          const isEnabled = item.enabled === 1;

          return (
            <div
              key={item.key}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                isEnabled
                  ? 'bg-amber-950/30 border-amber-500/40 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-900/50 border-white/10 hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 rounded-lg bg-slate-950 border border-white/10">
                      {item.key.includes('cab') ? <Car className="w-4 h-4 text-emerald-400" /> :
                       item.key.includes('email') ? <Mail className="w-4 h-4 text-rose-400" /> :
                       item.key.includes('reminder') ? <Clock className="w-4 h-4 text-cyan-400" /> :
                       <Bug className="w-4 h-4 text-amber-400" />}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-200 uppercase">
                      {item.key}
                    </span>
                  </div>

                  {/* Switch */}
                  <button
                    onClick={() => handleToggle(item.key, isEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isEnabled ? 'bg-amber-500' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Explanatory test scenario launch button */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <span className={`text-[10px] font-mono font-bold ${isEnabled ? 'text-amber-400' : 'text-slate-500'}`}>
                  {isEnabled ? '● INJECTION ARMED' : '○ INACTIVE'}
                </span>

                {isEnabled && (
                  <button
                    onClick={() => {
                      if (item.key.includes('cab')) {
                        onLaunchTestScenario('Book a cab to Central Station for tomorrow 7 AM');
                      } else if (item.key.includes('email')) {
                        onLaunchTestScenario('Email team@company.com with project updates');
                      } else {
                        onLaunchTestScenario('Remind me tomorrow at 9 AM about project status');
                      }
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-[11px] font-bold text-amber-300 transition-all"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Run Test Scenario</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deep-Dive Educational Box */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>Why Read-After-Write Verification Matters for Autonomous Agents</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400 mt-2">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-2">
            <h4 className="font-bold text-slate-200">1. Silent Failure Prevention</h4>
            <p className="leading-relaxed">
              Third-party APIs frequently return <code className="text-cyan-400 font-mono">200 OK</code> acknowledging request receipt, but fail downstream (e.g., driver queue dropped). JARVIS queries the actual state to confirm the entity exists before proceeding.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-2">
            <h4 className="font-bold text-slate-200">2. Autonomous Recovery Strategies</h4>
            <p className="leading-relaxed">
              If an action fails or verification drops, JARVIS doesn't crash. It initiates contextual fallback (e.g. automatically upgrading from Sedan to Prime SUV or Auto) to satisfy user intent without manual intervention.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-2">
            <h4 className="font-bold text-slate-200">3. Non-Reversible Safeguards</h4>
            <p className="leading-relaxed">
              If a multi-step sequence fails midway (e.g. Email sent, but Cab failed), JARVIS correctly marks the task as <code className="text-orange-400 font-mono">PARTIAL_COMPLETION</code>, prevents illegal rollbacks of sent emails, and rolls back pending reversible reminders.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
