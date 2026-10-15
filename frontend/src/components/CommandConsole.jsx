import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Mic, 
  MicOff, 
  CornerDownLeft, 
  Compass, 
  CheckCircle2, 
  ShieldAlert, 
  AlertTriangle,
  Lightbulb
} from 'lucide-react';

const PRESETS = [
  {
    title: 'Autonomous Multi-Action (Zero Delay)',
    badge: 'Executive Autonomy',
    badgeColor: 'cyan',
    instruction: 'Remind me tomorrow at 9 AM about project review and email Arpit the update',
    desc: 'Auto-resolves Arpit (arpitagrawal666@gmail.com), creates Google Calendar event with active alerts, and dispatches email with zero confirmation delay.'
  },
  {
    title: 'Instant Dispatch to Aditya',
    badge: 'Zero Approval',
    badgeColor: 'emerald',
    instruction: 'Email Aditya the sprint status and schedule a reminder for 5 PM to review server logs',
    desc: 'Auto-resolves Aditya (adityaupadhyay7764@gmail.com), sets Google Calendar reminder with alerts, and executes immediately.'
  },
  {
    title: 'Multi-Action (with Ambiguity)',
    badge: 'Disambiguation',
    badgeColor: 'blue',
    instruction: 'Remind me tomorrow at 9 AM about project meeting, email Rahul the update, and book a cab to the airport for 8:30 AM',
    desc: 'Tests 3-action sequence, asks for Rahul email & pickup location.'
  },
  {
    title: 'Silent Failure Stress Test',
    badge: 'Resilience',
    badgeColor: 'amber',
    instruction: 'Book a cab to Central Station for tomorrow 7 AM',
    desc: 'Simulates Cab API returning HTTP 200 without DB record — JARVIS detects and recovers!'
  }
];

export default function CommandConsole({ onPlan, isPlanning }) {
  const [instruction, setInstruction] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!instruction.trim() || isPlanning) return;
    onPlan(instruction.trim());
  };

  const handleSelectPreset = (presetText) => {
    setInstruction(presetText);
    onPlan(presetText);
  };

  const handleToggleMic = () => {
    // Simulated Voice Input Feedback
    if (!isListening) {
      setIsListening(true);
      const simulatedVoices = [
        "Remind me tomorrow at 9 AM about project meeting, email Rahul the update, and book a cab to the airport for 8:30 AM",
        "Book a cab from MG Road to Tech Park at 10 AM"
      ];
      const randomPrompt = simulatedVoices[Math.floor(Math.random() * simulatedVoices.length)];
      setTimeout(() => {
        setInstruction(randomPrompt);
        setIsListening(false);
      }, 1800);
    } else {
      setIsListening(false);
    }
  };

  return (
    <div className="relative">
      {/* Background ambient lighting */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-cyan-500/10 blur-3xl pointer-events-none rounded-full"></div>

      <div className="relative glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Autonomous Mission Controller
              </h2>
              <p className="text-xs text-slate-400">
                Natural language multi-tool orchestration with read-after-write verification
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-white/5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 pulse-cyan"></span>
            <span>MODEL: GEMINI 3.8 FLASH / SEMANTIC PARSER</span>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="relative mt-2">
          <div className="relative flex items-center">
            <textarea
              rows={3}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Give JARVIS an instruction, e.g. 'Remind me tomorrow at 9 AM about project meeting, email Rahul the update, and book a cab to the airport for 8:30 AM'..."
              className="w-full pl-4 pr-32 py-3.5 rounded-xl bg-slate-950/80 border border-white/10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none font-sans"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />

            {/* Action Buttons inside Input */}
            <div className="absolute right-3 bottom-3 flex items-center space-x-2">
              <button
                type="button"
                onClick={handleToggleMic}
                title={isListening ? "Listening... (Simulated)" : "Simulate Voice Input"}
                className={`p-2 rounded-lg transition-all border ${
                  isListening 
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse' 
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border-white/10 hover:bg-slate-700/80'
                }`}
              >
                {isListening ? <Mic className="w-4 h-4 text-rose-400" /> : <MicOff className="w-4 h-4" />}
              </button>

              <button
                type="submit"
                disabled={!instruction.trim() || isPlanning}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg font-medium text-xs transition-all ${
                  !instruction.trim() || isPlanning
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 border border-cyan-400/40 active:scale-95'
                }`}
              >
                {isPlanning ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Planning...</span>
                  </>
                ) : (
                  <>
                    <span>Execute</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-500">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-white/10 text-slate-300 font-mono text-[10px]">Enter</kbd> to generate plan</span>
            <span>{instruction.length} chars</span>
          </div>
        </form>

        {/* Quick Presets Carousel/Grid */}
        <div className="mt-6 pt-5 border-t border-white/5">
          <div className="flex items-center space-x-2 mb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>Interactive Demo Scenarios:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(p.instruction)}
                className="text-left p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 hover:border-cyan-500/40 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                      {p.title}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${
                      p.badgeColor === 'cyan' ? 'bg-cyan-950/60 text-cyan-400 border-cyan-500/30' :
                      p.badgeColor === 'amber' ? 'bg-amber-950/60 text-amber-400 border-amber-500/30' :
                      p.badgeColor === 'emerald' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30' :
                      'bg-blue-950/60 text-blue-400 border-blue-500/30'
                    }`}>
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                    {p.desc}
                  </p>
                </div>
                <div className="mt-2.5 flex items-center text-[10px] text-cyan-400 font-medium group-hover:translate-x-1 transition-transform">
                  <span>Launch scenario</span>
                  <span className="ml-1">→</span>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
