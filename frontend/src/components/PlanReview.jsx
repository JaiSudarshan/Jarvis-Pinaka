import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Mail, 
  Car, 
  ShieldCheck, 
  ShieldAlert, 
  Play, 
  HelpCircle, 
  ArrowRight,
  UserCheck,
  DollarSign,
  MapPin,
  Calendar
} from 'lucide-react';

export default function PlanReview({ plan, onExecute, isExecuting, onRePlanWithAnswers }) {
  const [approvedSteps, setApprovedSteps] = useState(() => {
    // Default: Check steps that require approval
    const initial = {};
    plan?.steps?.forEach(s => {
      if (s.requires_approval) {
        initial[s.id] = false; // User must explicitly confirm
      } else {
        initial[s.id] = true;
      }
    });
    return initial;
  });

  const [clarificationInputs, setClarificationInputs] = useState(() => {
    const map = {};
    if (plan?.clarification_questions?.length) {
      plan.clarification_questions.forEach((q, idx) => {
        // Pre-fill smart defaults for seamless demo if user wants
        if (q.toLowerCase().includes('rahul') || q.toLowerCase().includes('email')) {
          map['recipient'] = 'rahul.sharma@example.com';
        } else if (q.toLowerCase().includes('pickup') || q.toLowerCase().includes('where')) {
          map['pickup'] = 'Indiranagar 100ft Road, Bangalore';
        } else if (q.toLowerCase().includes('destination')) {
          map['destination'] = 'Bangalore International Airport (BLR)';
        } else {
          map[`answer_${idx}`] = '';
        }
      });
    }
    return map;
  });

  if (!plan) return null;

  const hasMissingInfo = plan.missing_info && plan.missing_info.length > 0;
  const requiresClarification = plan.clarification_questions && plan.clarification_questions.length > 0;

  const handleToggleApproval = (stepId) => {
    setApprovedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const handleExecute = () => {
    const approvedIds = Object.keys(approvedSteps).filter(id => approvedSteps[id]);
    onExecute(plan.task_id, approvedIds);
  };

  const handleClarificationSubmit = (e) => {
    e.preventDefault();
    onRePlanWithAnswers(plan.instruction, clarificationInputs);
  };

  // Check if all steps that require approval are approved
  const pendingApprovalsCount = plan.steps.filter(s => s.requires_approval && !approvedSteps[s.id]).length;

  return (
    <div className="space-y-6">
      
      {/* 1. Clarification & Disambiguation Card (If missing info detected) */}
      {requiresClarification && (
        <div className="glass-panel-glow rounded-2xl p-6 border-amber-500/40 bg-amber-950/20 shadow-xl shadow-amber-500/10">
          <div className="flex items-start space-x-3.5 mb-4">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-amber-200">
                  Disambiguation & Clarification Required
                </h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Strict Rule: Never Invent Info
                </span>
              </div>
              <p className="text-xs text-amber-300/80 mt-1">
                JARVIS identified incomplete specifications in your prompt. Please clarify the details below to ensure accurate autonomous execution.
              </p>
            </div>
          </div>

          <form onSubmit={handleClarificationSubmit} className="space-y-3.5 mt-3">
            {plan.clarification_questions.map((question, idx) => {
              let fieldKey = `answer_${idx}`;
              if (question.toLowerCase().includes('email') || question.toLowerCase().includes('rahul')) fieldKey = 'recipient';
              else if (question.toLowerCase().includes('pickup') || question.toLowerCase().includes('where')) fieldKey = 'pickup';
              else if (question.toLowerCase().includes('destination')) fieldKey = 'destination';

              return (
                <div key={idx} className="bg-slate-900/80 p-3.5 rounded-xl border border-white/10">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>{question}</span>
                  </label>
                  <input
                    type="text"
                    value={clarificationInputs[fieldKey] || ''}
                    onChange={(e) => setClarificationInputs({ ...clarificationInputs, [fieldKey]: e.target.value })}
                    placeholder={`Provide ${fieldKey}...`}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400"
                  />
                </div>
              );
            })}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95"
              >
                <span>Submit Clarifications & Generate Actionable Plan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Plan Structure Summary */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="text-xs uppercase font-extrabold px-2.5 py-1 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {plan.intent.replace('_', ' ')}
              </span>
              <h3 className="text-base font-bold text-white">
                Proposed Action Sequence ({plan.steps.length} Steps)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {plan.summary}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <span className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${
              hasMissingInfo
                ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
            }`}>
              {hasMissingInfo ? '⚠️ Clarification Needed' : '✓ Verified & Ready'}
            </span>
          </div>
        </div>

        {/* 3. Steps List */}
        <div className="mt-6 space-y-4">
          {plan.steps.map((step, idx) => {
            const isApproved = approvedSteps[step.id];
            const hasMissingInStep = step.missing_fields && step.missing_fields.length > 0;

            return (
              <div
                key={step.id || idx}
                className={`relative p-4 sm:p-5 rounded-xl border transition-all ${
                  hasMissingInStep 
                    ? 'bg-amber-950/15 border-amber-500/30' 
                    : isApproved
                      ? 'bg-slate-900/60 border-cyan-500/30 shadow-sm shadow-cyan-500/5'
                      : 'bg-slate-900/40 border-white/10'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  {/* Tool Badge & Order */}
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 border border-white/10 text-xs font-mono font-bold text-slate-300">
                      {idx + 1}
                    </span>

                    {/* Tool Specific Icon & Label */}
                    {step.tool === 'reminder' && (
                      <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>REMINDER SCHEDULER</span>
                      </div>
                    )}
                    {step.tool === 'gmail' && (
                      <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                        <Mail className="w-3.5 h-3.5 text-rose-400" />
                        <span>GMAIL DISPATCH</span>
                      </div>
                    )}
                    {step.tool === 'cab' && (
                      <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                        <Car className="w-3.5 h-3.5 text-emerald-400" />
                        <span>CAB PROVIDER (DEMO)</span>
                      </div>
                    )}

                    <span className="text-xs font-mono text-slate-400">
                      ACTION: <span className="text-slate-200 uppercase">{step.action}</span>
                    </span>
                  </div>

                  {/* Approval Toggle for sensitive actions */}
                  {step.requires_approval ? (
                    <div className="flex items-center space-x-2">
                      <label 
                        onClick={() => handleToggleApproval(step.id)}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                          isApproved 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                            : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!isApproved}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 accent-emerald-500 rounded"
                        />
                        <span className="font-semibold">
                          {isApproved ? 'Approved by User' : 'Consent Required (Click to Approve)'}
                        </span>
                      </label>
                    </div>
                  ) : (
                    <span className="text-[11px] font-mono text-slate-500 flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>Non-Destructive • Auto-Executable</span>
                    </span>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-2 text-xs">
                  {step.tool === 'reminder' && (
                    <>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">Scheduled Time</span>
                        <span className="font-mono text-cyan-300">{step.time || 'Next hour'}</span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5 md:col-span-2">
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">Reminder Text</span>
                        <span className="text-slate-200">{step.message || 'Notification'}</span>
                      </div>
                    </>
                  )}

                  {step.tool === 'gmail' && (
                    <>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">Recipient</span>
                        <span className={`font-mono ${step.recipient ? 'text-slate-200' : 'text-amber-400 font-bold'}`}>
                          {step.recipient || '⚠️ Missing Email Address'}
                        </span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">Subject</span>
                        <span className="text-slate-200 truncate block">{step.subject || '(Draft)'}</span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">Scopes Used</span>
                        <span className="text-slate-400 font-mono text-[11px]">gmail.send (Least-Privilege)</span>
                      </div>
                    </>
                  )}

                  {step.tool === 'cab' && (
                    <>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">Pickup</span>
                        <span className={step.pickup ? 'text-slate-200' : 'text-amber-400 font-bold'}>
                          {step.pickup || '⚠️ Missing Pickup'}
                        </span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">Destination</span>
                        <span className={step.destination ? 'text-slate-200' : 'text-amber-400 font-bold'}>
                          {step.destination || '⚠️ Missing Destination'}
                        </span>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">Vehicle & Estimated Fare</span>
                        <span className="text-emerald-400 font-semibold">{step.cab_type} • ₹{step.fare_estimate || 420.0}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Missing Fields Alert Inside Step */}
                {hasMissingInStep && (
                  <div className="mt-2.5 p-2 rounded-lg bg-amber-950/40 border border-amber-500/20 text-[11px] text-amber-300 flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Unresolved parameters: <strong>{step.missing_fields.join(', ')}</strong></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 4. Execution Controls Footer */}
        <div className="mt-8 pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            {pendingApprovalsCount > 0 ? (
              <span className="text-amber-400 flex items-center space-x-1.5 font-medium">
                <AlertTriangle className="w-4 h-4" />
                <span>{pendingApprovalsCount} sensitive action(s) require your explicit consent checkbox before running.</span>
              </span>
            ) : hasMissingInfo ? (
              <span className="text-amber-400 flex items-center space-x-1.5 font-medium">
                <AlertTriangle className="w-4 h-4" />
                <span>Please complete the clarification fields above to enable execution.</span>
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center space-x-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>All actions approved and verified. Ready for autonomous execution.</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleExecute}
              disabled={isExecuting || hasMissingInfo || pendingApprovalsCount > 0}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                isExecuting || hasMissingInfo || pendingApprovalsCount > 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25 border border-emerald-400/40 active:scale-95'
              }`}
            >
              {isExecuting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Orchestrating...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Execute Approved Sequence</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
