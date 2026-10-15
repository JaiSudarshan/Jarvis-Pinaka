import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import CommandConsole from './components/CommandConsole';
import PlanReview from './components/PlanReview';
import ExecutionTracker from './components/ExecutionTracker';
import RemindersView from './components/RemindersView';
import TaskHistory from './components/TaskHistory';
import IntegrationsView from './components/IntegrationsView';
import FailureSandbox from './components/FailureSandbox';
import NotificationToast from './components/NotificationToast';
import { 
  fetchHealth, 
  createPlan, 
  executeTask, 
  getTask, 
  listReminders, 
  resetDemoInjections 
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('planner');
  const [health, setHealth] = useState(null);
  const [sseConnected, setSseConnected] = useState(false);
  
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);
  
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reminderCount, setReminderCount] = useState(0);

  const eventSourceRef = useRef(null);

  // Helper to add timestamped logs
  const addLog = (text) => {
    setLogs(prev => [
      { time: new Date().toLocaleTimeString(), text },
      ...prev.slice(0, 49) // Keep last 50 logs
    ]);
  };

  // Play audio chime for reminders
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      // AudioContext policy
    }
  };

  // 1. Initial Health & Reminders Count
  useEffect(() => {
    fetchHealth()
      .then(data => setHealth(data))
      .catch(err => console.error('Health fetch failed:', err));

    listReminders()
      .then(rems => setReminderCount(rems.filter(r => r.status === 'SCHEDULED').length))
      .catch(() => {});
  }, []);

  // 2. Real-time SSE Connection
  useEffect(() => {
    const sseUrl = '/api/events';
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setSseConnected(true);
      addLog('[SSE:CONNECTED] Live telemetry stream initialized.');
    };

    es.addEventListener('connected', () => {
      setSseConnected(true);
    });

    es.addEventListener('task_planned', (e) => {
      try {
        const data = JSON.parse(e.data);
        addLog(`[SSE:TASK_PLANNED] Task ${data.task_id.slice(0, 8)} persisted with status ${data.status}.`);
      } catch (err) {}
    });

    es.addEventListener('task_status_changed', async (e) => {
      try {
        const data = JSON.parse(e.data);
        addLog(`[SSE:TASK_STATUS] Overall task transitioned to: ${data.status}`);
        setIsExecuting(data.status === 'RUNNING');
        // Refresh active task
        if (data.task_id) {
          const fresh = await getTask(data.task_id);
          setCurrentTask(fresh);
        }
      } catch (err) {}
    });

    es.addEventListener('step_update', async (e) => {
      try {
        const data = JSON.parse(e.data);
        addLog(`[SSE:STEP_UPDATE] Step ${data.step_id.slice(0, 8)} status -> ${data.status}`);
        // Refresh active task to reflect new step status immediately
        if (data.task_id) {
          const fresh = await getTask(data.task_id);
          setCurrentTask(fresh);
        }
      } catch (err) {}
    });

    es.addEventListener('reminder_notification', (e) => {
      try {
        const data = JSON.parse(e.data);
        addLog(`[SSE:REMINDER_DUE] Triggered notification: "${data.message}"`);
        playChime();
        setNotifications(prev => [data, ...prev]);
        setReminderCount(prev => Math.max(0, prev - 1));
      } catch (err) {}
    });

    es.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      es.close();
    };
  }, []);

  // Handle Plan Generation
  const handlePlan = async (instruction, clarificationAnswers = {}) => {
    try {
      setIsPlanning(true);
      addLog(`[PLANNER:START] Analyzing instruction: "${instruction}"`);
      const plan = await createPlan(instruction, 'Asia/Kolkata', clarificationAnswers);
      setCurrentPlan(plan);
      setCurrentTask(null); // Clear previous executed task view
      addLog(`[PLANNER:SUCCESS] Generated ${plan.steps.length} step(s). Missing info: ${plan.missing_info.length}`);

      // Core Operating Guideline #1: Full Autonomy & Zero Approval
      // Automatically execute scheduling and communication actions instantly with zero confirmation delays
      const hasMissing = plan.missing_info && plan.missing_info.length > 0;
      const requiresManualConfirm = plan.steps.some(s => s.requires_approval);

      if (!hasMissing && !requiresManualConfirm) {
        addLog('[AUTONOMOUS:DISPATCH] Operating in Full Autonomy mode — zero confirmation delays. Dispatching immediately!');
        const allStepIds = plan.steps.map(s => s.id);
        await handleExecute(plan.task_id, allStepIds);
      }
    } catch (err) {
      alert(`Planning failed: ${err.message}`);
      addLog(`[PLANNER:ERROR] ${err.message}`);
    } finally {
      setIsPlanning(false);
    }
  };

  // Handle Execution
  const handleExecute = async (taskId, approvedStepIds) => {
    try {
      setIsExecuting(true);
      addLog(`[EXECUTION:START] Initiating execution for task ${taskId.slice(0, 8)} with ${approvedStepIds.length} approved actions.`);
      await executeTask(taskId, approvedStepIds);
      // Fetch initial task state
      const taskData = await getTask(taskId);
      setCurrentTask(taskData);
      setCurrentPlan(null); // Switch into execution tracker view
    } catch (err) {
      alert(`Execution failed: ${err.message}`);
      addLog(`[EXECUTION:ERROR] ${err.message}`);
      setIsExecuting(false);
    }
  };

  // Handle Inspect from History
  const handleSelectTaskFromHistory = (task) => {
    setCurrentTask(task);
    setCurrentPlan(null);
    setActiveTab('planner');
  };

  // Handle Reset Demo Injections
  const handleResetDemo = async () => {
    try {
      await resetDemoInjections();
      addLog('[CHAOS:RESET] All failure simulation flags have been cleared to default safe state.');
      alert('Sandbox failure injections successfully reset.');
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
    }
  };

  // Handle Launch Scenario from Sandbox
  const handleLaunchTestScenario = (promptText) => {
    setActiveTab('planner');
    handlePlan(promptText);
  };

  // Dismiss notification toast
  const handleDismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Refresh active task manually
  const handleRefreshTask = async () => {
    if (currentTask?.id) {
      const fresh = await getTask(currentTask.id);
      setCurrentTask(fresh);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] cyber-grid relative text-slate-100 selection:bg-cyan-500/30">
      
      {/* Top Ambient Glow */}
      <div className="fixed top-0 left-0 right-0 h-96 radial-glow pointer-events-none z-0"></div>

      {/* Real-time Notification Toasts */}
      <NotificationToast 
        notifications={notifications} 
        onDismiss={handleDismissNotification} 
      />

      {/* Main Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
        sseConnected={sseConnected}
        onResetDemo={handleResetDemo}
        reminderCount={reminderCount}
      />

      {/* Body Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Tab 1: Planner & Command Console */}
        {activeTab === 'planner' && (
          <div className="space-y-8">
            <CommandConsole
              onPlan={handlePlan}
              isPlanning={isPlanning}
            />

            {/* If Plan is generated and awaiting execution / review */}
            {currentPlan && (
              <PlanReview
                plan={currentPlan}
                onExecute={handleExecute}
                isExecuting={isExecuting}
                onRePlanWithAnswers={(inst, ans) => handlePlan(inst, ans)}
              />
            )}

            {/* If Task is executing or completed */}
            {currentTask && (
              <ExecutionTracker
                currentTask={currentTask}
                logs={logs}
                onRefreshTask={handleRefreshTask}
              />
            )}
          </div>
        )}

        {/* Tab 2: Task History */}
        {activeTab === 'history' && (
          <TaskHistory
            onSelectTask={handleSelectTaskFromHistory}
          />
        )}

        {/* Tab 3: Reminders Registry */}
        {activeTab === 'reminders' && (
          <RemindersView />
        )}

        {/* Tab 4: Integrations */}
        {activeTab === 'integrations' && (
          <IntegrationsView />
        )}

        {/* Tab 5: Chaos & Resilience Sandbox */}
        {activeTab === 'chaos' && (
          <FailureSandbox
            onLaunchTestScenario={handleLaunchTestScenario}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/5 py-8 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>JARVIS ONE • Autonomous Multi-Action AI Assistant</span>
          </div>
          <div>
            <span>Read-After-Write Verified • Self-Healing Architecture</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
