import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  RotateCw, 
  ShieldCheck, 
  ShieldAlert, 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  Car, 
  Mail, 
  Bell,
  RefreshCw,
  Info,
  Check
} from 'lucide-react';

export default function ExecutionTracker({ currentTask, logs, onRefreshTask }) {
  const [expandedStep, setExpandedStep] = useState(null);

  if (!currentTask) return null;

  const { status, steps = [], instruction, summary } = currentTask;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>ALL ACTIONS COMPLETED & VERIFIED</span>
          </span>
        );
      case 'RECOVERED':
        return (
          <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-950/80 text-amber-400 border border-amber-500/40 text-xs font-bold">
            <ShieldAlert className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>AUTONOMOUSLY RECOVERED</span>
          </span>
        );
      case 'PARTIAL_COMPLETION':
        return (
          <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-orange-950/80 text-orange-400 border border-orange-500/40 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <span>PARTIALLY COMPLETED (NON-REVERSIBLE EXECUTED)</span>
          </span>
        );
      case 'RUNNING':
        return (
          <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 text-xs font-bold">
            <RotateCw className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>PIPELINE RUNNING & VERIFYING</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-950/80 text-rose-400 border border-rose-500/40 text-xs font-bold">
            <XCircle className="w-4 h-4 text-rose-400" />
            <span>EXECUTION FAILED</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-white/10 text-xs font-bold">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>{status}</span>
          </span>
        );
    }
  };

  const getStepIcon = (tool) => {
    switch (tool) {
      case 'reminder': return <Clock className="w-4 h-4" />;
      case 'gmail': return <Mail className="w-4 h-4" />;
      case 'cab': return <Car className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getStepStatusVisual = (step) => {
    const s = step.status;
    const v = step.verification_status;

    if (s === 'SUCCESS' && v === 'VERIFIED') {
      return {
        badge: 'VERIFIED SUCCESS',
        bg: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300',
        dot: 'bg-emerald-400 pulse-green',
        icon: <Check className="w-3.5 h-3.5 text-emerald-400" />
      };
    }
    if (s === 'RECOVERED') {
      return {
        badge: 'RECOVERED WITH ALTERNATIVE',
        bg: 'bg-amber-950/40 border-amber-500/30 text-amber-300',
        dot: 'bg-amber-400 pulse-amber',
        icon: <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
      };
    }
    if (s === 'VERIFYING') {
      return {
        badge: 'READ-AFTER-WRITE VERIFYING...',
        bg: 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300',
        dot: 'bg-cyan-400 animate-ping',
        icon: <RotateCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
      };
    }
    if (s === 'RUNNING') {
      return {
        badge: 'EXECUTING ACTION...',
        bg: 'bg-blue-950/40 border-blue-500/40 text-blue-300',
        dot: 'bg-blue-400 animate-pulse',
        icon: <RotateCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
      };
    }
    if (s === 'RECOVERING') {
      return {
        badge: 'RECOVERY IN PROGRESS...',
        bg: 'bg-purple-950/40 border-purple-500/40 text-purple-300',
        dot: 'bg-purple-400 animate-ping',
        icon: <RotateCw className="w-3.5 h-3.5 text-purple-400 animate-spin" />
      };
    }
    if (s === 'FAILED') {
      return {
        badge: 'VERIFICATION FAILED',
        bg: 'bg-rose-950/40 border-rose-500/30 text-rose-300',
        dot: 'bg-rose-500 pulse-red',
        icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />
      };
    }
    if (s === 'SKIPPED') {
      return {
        badge: 'SKIPPED (NO CONSENT)',
        bg: 'bg-slate-900 border-white/5 text-slate-500',
        dot: 'bg-slate-600',
        icon: <Info className="w-3.5 h-3.5 text-slate-500" />
      };
    }
    return {
      badge: 'QUEUED',
      bg: 'bg-slate-900/60 border-white/10 text-slate-400',
      dot: 'bg-slate-500',
      icon: <Clock className="w-3.5 h-3.5 text-slate-500" />
    };
  };

  return (
    <div className="space-y-6">
      
      {/* Task Header & Overall Outcome */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="text-xs font-mono text-cyan-400 uppercase font-semibold">
                TASK ID: {currentTask.id.slice(0, 8)}...
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400 font-mono">
                {new Date(currentTask.created_at).toLocaleTimeString()}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mt-1">
              "{instruction}"
            </h3>
          </div>

          <div className="flex items-center space-x-3">
            {getStatusBadge(status)}
            <button
              onClick={onRefreshTask}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 hover:text-white"
              title="Refresh Task Status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Execution Flow Pipeline */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Multi-Action Verification Pipeline</span>
            </h4>
            <span className="text-[11px] font-mono text-slate-400">
              {steps.filter(s => s.status === 'SUCCESS' || s.status === 'RECOVERED').length} / {steps.length} verified
            </span>
          </div>

          <div className="space-y-3.5">
            {steps.map((step, idx) => {
              const visual = getStepStatusVisual(step);
              const isExpanded = expandedStep === step.id;

              return (
                <div 
                  key={step.id || idx}
                  className={`rounded-xl border p-4 transition-all ${visual.bg}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* Left: Step Info */}
                    <div className="flex items-center space-x-3.5">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-950/70 border border-white/10 text-slate-200">
                        {getStepIcon(step.tool)}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            Step {idx + 1}: {step.tool.toUpperCase()} — {step.action.toUpperCase()}
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${visual.bg} flex items-center space-x-1`}>
                            {visual.icon}
                            <span>{visual.badge}</span>
                          </span>
                        </div>
                        
                        {/* Summary preview of params */}
                        <div className="text-[11px] text-slate-300/80 mt-0.5 flex flex-wrap gap-x-3">
                          {step.tool === 'reminder' && (
                            <>
                              <span>Time: <strong className="text-cyan-300 font-mono">{step.params?.time}</strong></span>
                              <span>Message: <strong className="text-slate-100">"{step.params?.message}"</strong></span>
                            </>
                          )}
                          {step.tool === 'gmail' && (
                            <>
                              <span>To: <strong className="text-slate-100 font-mono">{step.params?.recipient || 'N/A'}</strong></span>
                              <span>Subject: <strong className="text-slate-100">"{step.params?.subject}"</strong></span>
                            </>
                          )}
                          {step.tool === 'cab' && (
                            <>
                              <span>From: <strong className="text-slate-100">{step.params?.pickup}</strong></span>
                              <span>To: <strong className="text-slate-100">{step.params?.destination}</strong></span>
                              <span>Tier: <strong className="text-emerald-300">{step.params?.cab_type}</strong></span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Toggle inspect details */}
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-950 border border-white/10 text-xs text-slate-300 hover:text-white transition-all"
                      >
                        <span className="text-[11px] font-mono">{isExpanded ? 'Hide Verification' : 'Inspect Proof'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                  </div>

                  {/* Step Error Alert (e.g. Silent failure alert!) */}
                  {step.error_message && (
                    <div className="mt-3 p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold block">Verification Detection:</strong>
                          <span className="font-mono text-[11px]">{step.error_message}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recovery Note */}
                  {step.result?.recovery_note && (
                    <div className="mt-3 p-3 rounded-lg bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200">
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                        <span><strong>Autonomous Recovery:</strong> {step.result.recovery_note}</span>
                      </div>
                    </div>
                  )}

                  {/* Expandable Verification & Payload Drawer */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-white/10 space-y-2.5 text-xs font-mono">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="bg-slate-950 p-3 rounded-lg border border-white/5">
                          <span className="text-slate-500 block text-[10px] uppercase">Params Payload:</span>
                          <pre className="text-slate-300 text-[11px] overflow-x-auto whitespace-pre-wrap mt-1">
                            {JSON.stringify(step.params, null, 2)}
                          </pre>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-lg border border-white/5">
                          <span className="text-slate-500 block text-[10px] uppercase">Verification Result:</span>
                          <pre className="text-slate-300 text-[11px] overflow-x-auto whitespace-pre-wrap mt-1">
                            {JSON.stringify(step.result, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Real-time Telemetry & SSE Log Stream */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Real-Time Execution Telemetry Console (SSE Stream)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>STREAM LISTENER ACTIVE</span>
          </span>
        </div>

        <div className="bg-slate-950/90 rounded-xl p-4 border border-white/5 font-mono text-xs max-h-56 overflow-y-auto space-y-1.5">
          {logs && logs.length > 0 ? (
            logs.map((log, idx) => (
              <div key={idx} className="flex items-start space-x-2 text-slate-400 leading-relaxed">
                <span className="text-slate-600 text-[10px] select-none shrink-0 font-mono">
                  [{log.time || new Date().toLocaleTimeString()}]
                </span>
                <span className={
                  log.text.includes('FAILED') || log.text.includes('SILENT FAILURE') ? 'text-rose-400 font-semibold' :
                  log.text.includes('RECOVERED') || log.text.includes('RECOVERING') ? 'text-amber-300 font-semibold' :
                  log.text.includes('SUCCESS') || log.text.includes('VERIFIED') ? 'text-emerald-400' :
                  log.text.includes('VERIFYING') ? 'text-cyan-300' :
                  'text-slate-300'
                }>
                  {log.text}
                </span>
              </div>
            ))
          ) : (
            <div className="text-slate-600 text-center py-4 italic">
              Listening for pipeline execution events...
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
