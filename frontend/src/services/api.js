const BASE_URL = '';

export async function fetchHealth() {
  const res = await fetch(`${BASE_URL}/api/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function createPlan(instruction, timezone = 'Asia/Kolkata', clarificationAnswers = {}) {
  const res = await fetch(`${BASE_URL}/api/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instruction,
      timezone,
      clarification_answers: clarificationAnswers
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create plan');
  }
  return res.json();
}

export async function executeTask(taskId, approvedStepIds = []) {
  const res = await fetch(`${BASE_URL}/api/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task_id: taskId,
      approved_step_ids: approvedStepIds
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Execution request failed');
  }
  return res.json();
}

export async function getTask(taskId) {
  const res = await fetch(`${BASE_URL}/api/tasks/${taskId}`);
  if (!res.ok) throw new Error('Failed to fetch task');
  return res.json();
}

export async function listTasks(limit = 15) {
  const res = await fetch(`${BASE_URL}/api/tasks?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to list tasks');
  return res.json();
}

export async function listReminders() {
  const res = await fetch(`${BASE_URL}/api/reminders`);
  if (!res.ok) throw new Error('Failed to list reminders');
  return res.json();
}

export async function createReminder(message, remindAt) {
  const res = await fetch(`${BASE_URL}/api/reminders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, remind_at: remindAt })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create reminder');
  }
  return res.json();
}

export async function cancelReminder(reminderId) {
  const res = await fetch(`${BASE_URL}/api/reminders/${reminderId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to cancel reminder');
  return res.json();
}

export async function getIntegrations() {
  const res = await fetch(`${BASE_URL}/api/integrations`);
  if (!res.ok) throw new Error('Failed to fetch integrations');
  return res.json();
}

export async function triggerLocalOAuthFlow() {
  const res = await fetch(`${BASE_URL}/api/auth/google/local-flow`, {
    method: 'POST'
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Local OAuth flow failed');
  }
  return res.json();
}

export async function disconnectGoogle() {
  const res = await fetch(`${BASE_URL}/api/auth/google/disconnect`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to disconnect');
  return res.json();
}

export async function fetchLatestEmails(maxResults = 10, q = '') {
  const queryParam = q ? `&q=${encodeURIComponent(q)}` : '';
  const res = await fetch(`${BASE_URL}/api/gmail/messages?max_results=${maxResults}${queryParam}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch emails');
  }
  return res.json();
}

export async function fetchEmailDetail(messageId) {
  const res = await fetch(`${BASE_URL}/api/gmail/messages/${messageId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch email detail');
  }
  return res.json();
}

export async function searchEmails(query, maxResults = 10) {
  const res = await fetch(`${BASE_URL}/api/gmail/search?q=${encodeURIComponent(query)}&max_results=${maxResults}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to search emails');
  }
  return res.json();
}

export async function listDemoInjections() {
  const res = await fetch(`${BASE_URL}/api/demo/injections`);
  if (!res.ok) throw new Error('Failed to load injections');
  return res.json();
}

export async function toggleDemoInjection(key, enabled) {
  const res = await fetch(`${BASE_URL}/api/demo/injections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, enabled })
  });
  if (!res.ok) throw new Error('Failed to toggle injection');
  return res.json();
}

export async function resetDemoInjections() {
  const res = await fetch(`${BASE_URL}/api/demo/reset`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to reset injections');
  return res.json();
}
