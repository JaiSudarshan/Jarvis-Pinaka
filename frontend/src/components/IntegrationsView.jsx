import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Sparkles, 
  Mail, 
  Car, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Key, 
  ShieldCheck, 
  RefreshCw,
  LogOut,
  Info,
  Search,
  Eye,
  Inbox,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  getIntegrations, 
  triggerLocalOAuthFlow, 
  disconnectGoogle,
  fetchLatestEmails,
  fetchEmailDetail,
  searchEmails
} from '../services/api';

export default function IntegrationsView() {
  const [integrations, setIntegrations] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Live Gmail operations state
  const [emails, setEmails] = useState([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const loadIntegrations = async () => {
    try {
      setIsLoading(true);
      const data = await getIntegrations();
      setIntegrations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleStartOAuth = async () => {
    try {
      setIsAuthenticating(true);
      const res = await triggerLocalOAuthFlow();
      await loadIntegrations();
      alert(`Successfully authenticated as ${res.email}!`);
      // Auto-fetch latest emails
      handleLoadEmails();
    } catch (err) {
      alert(`OAuth flow could not complete: ${err.message}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectGoogle();
      setEmails([]);
      setSelectedEmail(null);
      await loadIntegrations();
    } catch (err) {
      alert(`Error disconnecting: ${err.message}`);
    }
  };

  const handleLoadEmails = async (query = '') => {
    try {
      setIsLoadingEmails(true);
      const res = await fetchLatestEmails(10, query);
      setEmails(res.messages || []);
      setSelectedEmail(null);
    } catch (err) {
      alert(`Failed to load emails: ${err.message}`);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    handleLoadEmails(searchQuery);
  };

  const handleViewDetail = async (messageId) => {
    if (selectedEmail?.id === messageId) {
      setSelectedEmail(null);
      return;
    }
    try {
      setIsLoadingDetail(true);
      const detail = await fetchEmailDetail(messageId);
      setSelectedEmail(detail);
    } catch (err) {
      alert(`Failed to load email details: ${err.message}`);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  if (isLoading || !integrations) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center text-slate-500 text-xs italic">
        Loading integration credentials and services...
      </div>
    );
  }

  const { gemini, gmail, cab } = integrations;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Integration Architecture & API Access
              </h2>
              <p className="text-xs text-slate-400">
                Connected tools, OAuth 2.0 desktop authentication, and Gmail API operations
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadIntegrations}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-white/10 text-xs text-slate-300 hover:text-white"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 1. Gemini AI Engine */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                gemini.is_configured 
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                  : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
              }`}>
                {gemini.is_configured ? 'ACTIVE (GEMINI 3.8 FLASH)' : 'LOCAL SEMANTIC ENGINE'}
              </span>
            </div>

            <h3 className="text-base font-bold text-white">{gemini.name}</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Provides multi-action intent parsing, semantic parameter extraction, and ambiguity detection.
            </p>

            <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-white/5 space-y-1.5 text-xs font-mono">
              <div className="text-slate-500 text-[10px]">MODEL CONFIG</div>
              <div className="text-cyan-300 font-bold">{gemini.model}</div>
              <div className="text-slate-400 text-[11px] pt-1">{gemini.notes}</div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 text-[11px] text-slate-400">
            {gemini.is_configured ? (
              <span className="flex items-center space-x-1.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Gemini API Key Active</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 text-amber-400">
                <Info className="w-4 h-4" />
                <span>Deterministic local parser active</span>
              </span>
            )}
          </div>
        </div>

        {/* 2. Gmail OAuth 2.0 (Desktop App) */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <Mail className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                gmail.is_authenticated 
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                  : 'bg-slate-800 text-slate-400 border-white/10'
              }`}>
                {gmail.is_authenticated ? 'AUTHENTICATED' : 'DISCONNECTED'}
              </span>
            </div>

            <h3 className="text-base font-bold text-white">{gmail.name}</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Desktop OAuth 2.0 client hooked to Google Cloud project <strong>jarvis-one-511709</strong>.
            </p>

            <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-white/5 space-y-1.5 text-xs font-mono">
              <div className="text-slate-500 text-[10px]">AUTHENTICATED ACCOUNT</div>
              <div className="text-rose-300 font-bold truncate">
                {gmail.connected_account || 'No account authorized'}
              </div>
              <div className="text-slate-400 text-[11px] pt-1">
                Scopes: <span className="text-slate-200">Gmail (Read, Send) + Google Calendar</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
            {gmail.is_authenticated ? (
              <>
                <button
                  onClick={handleStartOAuth}
                  disabled={isAuthenticating}
                  className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-all"
                  title="Run OAuth sign-in to grant Google Calendar scopes"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-Auth / Grant Calendar Scopes</span>
                </button>
                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect Google Account</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleStartOAuth}
                disabled={isAuthenticating}
                className="w-full flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-500/20 active:scale-95 disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Opening Browser for OAuth...</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Run Local OAuth Sign-in</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 3. Demo Cab Provider */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Car className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                SIMULATED ONLINE
              </span>
            </div>

            <h3 className="text-base font-bold text-white">{cab.name}</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Ride provider with multi-tier dispatch (Sedan, Prime SUV, Auto), fare estimation, and read-after-write verification.
            </p>

            <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-white/5 space-y-1.5 text-xs font-mono">
              <div className="text-slate-500 text-[10px]">FLEET & ESTIMATES</div>
              <div className="text-emerald-300 font-bold">Sedan: ₹420 | SUV: ₹650 | Auto: ₹180</div>
              <div className="text-slate-400 text-[11px] pt-1">
                Supports Silent Failure Simulation (HTTP 200 without DB record)
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 text-[11px] text-slate-400 flex items-center space-x-1.5 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>SQLite Backing Registry Active</span>
          </div>
        </div>

      </div>

      {/* Saved Contacts Directory Panel (Guideline #3) */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Executive Saved Contacts Directory
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                Zero Confirmation Auto-Resolution
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              JARVIS automatically resolves the contacts below without prompting or confirmation delays:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-300 text-sm">
                A
              </div>
              <div>
                <div className="text-sm font-bold text-white">Arpit</div>
                <div className="text-xs font-mono text-cyan-400">arpitagrawal666@gmail.com</div>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Auto-Resolved
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-pink-500/20 border border-pink-500/30 flex items-center justify-center font-bold text-pink-300 text-sm">
                A
              </div>
              <div>
                <div className="text-sm font-bold text-white">Aditya</div>
                <div className="text-xs font-mono text-pink-400">adityaupadhyay7764@gmail.com</div>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Auto-Resolved
            </span>
          </div>
        </div>
      </div>

      {/* Gmail API Operations Workspace */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center space-x-2">
              <Inbox className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Live Gmail API Operations Explorer
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Test operations: <code>users.messages.list</code>, <code>users.messages.get</code>, and <code>search (q="...")</code>
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleLoadEmails()}
              disabled={isLoadingEmails || !gmail.is_authenticated}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-semibold text-rose-300 transition-all disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEmails ? 'animate-spin' : ''}`} />
              <span>Fetch Latest Emails</span>
            </button>
          </div>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="mt-4 flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search query (e.g. from:google, subject:welcome, is:unread)..."
              disabled={!gmail.is_authenticated}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-400 font-mono disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={isLoadingEmails || !gmail.is_authenticated}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-bold text-slate-200 transition-all disabled:opacity-50"
          >
            Search
          </button>
        </form>

        {/* Email list */}
        <div className="mt-5 space-y-3">
          {!gmail.is_authenticated ? (
            <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-white/5 space-y-2">
              <p className="text-xs text-slate-400">
                Gmail account not connected yet. Click <strong>Run Local OAuth Sign-in</strong> above to sign in with your test account.
              </p>
            </div>
          ) : isLoadingEmails ? (
            <div className="text-center py-10 text-xs text-slate-500 italic">
              Querying Gmail API (users.messages.list)...
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500 italic">
              No emails found. Click "Fetch Latest Emails" to pull real messages.
            </div>
          ) : (
            emails.map((msg) => {
              const isSelected = selectedEmail?.id === msg.id;

              return (
                <div
                  key={msg.id}
                  className="p-4 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-white/5 transition-all space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white">{msg.subject}</span>
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-slate-950 text-slate-400 border border-white/5">
                          ID: {msg.id.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-3">
                        <span>From: <strong className="text-rose-300">{msg.from}</strong></span>
                        <span>•</span>
                        <span>{msg.date}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewDetail(msg.id)}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-white/10 text-xs text-slate-300 hover:text-white transition-all self-end sm:self-center"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isSelected ? 'Hide Body' : 'Read Detail (users.messages.get)'}</span>
                      {isSelected ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Snippet */}
                  <p className="text-xs text-slate-300/80 line-clamp-2">
                    {msg.snippet}
                  </p>

                  {/* Expanded Body (users.messages.get) */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-white/10 text-xs font-mono">
                      <div className="bg-slate-950 p-4 rounded-xl border border-white/10 space-y-2">
                        <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase">
                          <span>Decoded Payload Body</span>
                          <span>Message ID: {selectedEmail.id}</span>
                        </div>
                        <pre className="text-slate-200 text-xs font-sans whitespace-pre-wrap max-h-72 overflow-y-auto">
                          {selectedEmail.body || selectedEmail.snippet}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
