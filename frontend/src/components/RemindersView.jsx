import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Send
} from 'lucide-react';
import { listReminders, createReminder, cancelReminder } from '../services/api';

export default function RemindersView() {
  const [reminders, setReminders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [remindAt, setRemindAt] = useState('');

  const loadReminders = async () => {
    try {
      setIsLoading(true);
      const data = await listReminders();
      setReminders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
    // Default time: 30 minutes from now
    const d = new Date(Date.now() + 30 * 60 * 1000);
    // Format for datetime-local: YYYY-MM-DDTHH:mm
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setRemindAt(localIso);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!message.trim() || !remindAt) return;
    try {
      setIsSubmitting(true);
      await createReminder(message.trim(), new Date(remindAt).toISOString());
      setMessage('');
      await loadReminders();
    } catch (err) {
      alert(`Error scheduling reminder: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancelReminder(id);
      await loadReminders();
    } catch (err) {
      alert(`Error cancelling reminder: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Persistent Reminders Engine
              </h2>
              <p className="text-xs text-slate-400">
                Backed by APScheduler with SQLite persistence across server restarts
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadReminders}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-white/10 text-xs text-slate-300 hover:text-white"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Grid: Create Reminder & List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Schedule Form */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10 h-fit">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>Create Scheduled Reminder</span>
          </h3>

          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Reminder Message</label>
              <input
                type="text"
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Project architecture sync"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Due Date & Time</label>
              <input
                type="datetime-local"
                required
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-slate-100 focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold transition-all shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50"
            >
              <Clock className="w-4 h-4" />
              <span>{isSubmitting ? 'Scheduling...' : 'Schedule Reminder'}</span>
            </button>
          </form>
        </div>

        {/* Right: Active & Past Reminders */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-white/10">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Scheduled Registry ({reminders.length})</span>
            </div>
          </h3>

          {isLoading ? (
            <div className="text-center py-12 text-slate-500 text-xs italic">
              Loading reminders from SQLite...
            </div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs italic">
              No reminders scheduled. Use the Assistant or form to create one!
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map((rem) => {
                const isDelivered = rem.status === 'DELIVERED';
                const isCancelled = rem.status === 'CANCELLED';
                const isScheduled = rem.status === 'SCHEDULED';

                return (
                  <div
                    key={rem.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      isDelivered 
                        ? 'bg-slate-900/40 border-white/5 opacity-75' 
                        : isCancelled
                          ? 'bg-rose-950/20 border-rose-500/20 opacity-60'
                          : 'bg-slate-900/80 border-cyan-500/20 shadow-sm'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2.5">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          isScheduled ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40' :
                          isDelivered ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' :
                          'bg-rose-950/80 text-rose-300 border-rose-500/40'
                        }`}>
                          {rem.status}
                        </span>
                        <h4 className="text-sm font-bold text-slate-200">
                          {rem.message}
                        </h4>
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{new Date(rem.remind_at).toLocaleString()}</span>
                        </span>
                        {rem.task_id && (
                          <span className="text-slate-500 text-[11px]">
                            via Task {rem.task_id.slice(0, 6)}...
                          </span>
                        )}
                      </div>
                    </div>

                    {isScheduled && (
                      <button
                        onClick={() => handleCancel(rem.id)}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold self-end sm:self-center transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
