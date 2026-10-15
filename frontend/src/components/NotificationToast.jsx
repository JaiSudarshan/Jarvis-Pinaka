import React, { useEffect } from 'react';
import { Bell, X, Clock, CheckCircle2 } from 'lucide-react';

export default function NotificationToast({ notifications, onDismiss }) {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className="pointer-events-auto p-4 rounded-2xl glass-panel-glow border-cyan-500/40 bg-[#0d1321]/95 shadow-2xl flex items-start space-x-3.5 transform transition-all duration-300 animate-slide-in"
        >
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-cyan-400">
                JARVIS Reminder Due
              </span>
              <button
                onClick={() => onDismiss(notif.id)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <h4 className="text-sm font-bold text-white mt-0.5">
              {notif.message}
            </h4>
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-mono mt-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{new Date(notif.remind_at || Date.now()).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
