import React, { useState, useEffect } from 'react';
import { 
  History, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldAlert, 
  ChevronRight, 
  RefreshCw,
  Search
} from 'lucide-react';
import { listTasks, getTask } from '../services/api';

export default function TaskHistory({ onSelectTask }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const data = await listTasks(20);
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const filtered = tasks.filter(t => 
    t.instruction.toLowerCase().includes(search.toLowerCase()) ||
    t.status.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUCCESS':
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">SUCCESS</span>;
      case 'RECOVERED':
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-500/30 text-[10px] font-bold">RECOVERED</span>;
      case 'PARTIAL_COMPLETION':
        return <span className="px-2.5 py-0.5 rounded-full bg-orange-950/80 text-orange-400 border border-orange-500/30 text-[10px] font-bold">PARTIAL</span>;
      case 'FAILED':
        return <span className="px-2.5 py-0.5 rounded-full bg-rose-950/80 text-rose-400 border border-rose-500/30 text-[10px] font-bold">FAILED</span>;
      case 'RUNNING':
        return <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold animate-pulse">RUNNING</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10 text-[10px] font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Task Execution Timeline & Audit Log
              </h2>
              <p className="text-xs text-slate-400">
                Complete history of planned and verified autonomous task executions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="px-3.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
          />
          <button
            onClick={loadTasks}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-white/10 text-slate-300 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10">
        {isLoading ? (
          <div className="text-center py-12 text-slate-500 text-xs italic">
            Loading task history...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs italic">
            No matching tasks found.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => (
              <div
                key={t.id}
                onClick={async () => {
                  const fullTask = await getTask(t.id);
                  onSelectTask(fullTask);
                }}
                className="p-4 rounded-xl bg-slate-900/60 hover:bg-slate-800/70 border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2.5">
                    {getStatusBadge(t.status)}
                    <span className="text-xs font-mono text-slate-500">
                      ID: {t.id.slice(0, 8)}...
                    </span>
                    <span className="text-slate-700">•</span>
                    <span className="text-xs font-mono text-slate-400">
                      {new Date(t.created_at).toLocaleString()}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                    "{t.instruction}"
                  </h4>
                </div>

                <div className="flex items-center space-x-3 text-xs self-end sm:self-center">
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-white/5">
                    {t.step_count} Steps
                  </span>
                  <div className="flex items-center space-x-1 text-cyan-400 group-hover:translate-x-1 transition-transform">
                    <span>Inspect</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
