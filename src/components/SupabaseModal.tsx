import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  KeyRound,
  FileCode2,
} from 'lucide-react';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  resetSupabaseCredentialsToDefault,
  isSupabaseConfigured,
  testSupabaseConnection,
  fetchAllFromSupabase,
  pushAllToSupabase,
  SUPABASE_SQL_SCHEMA,
  DEFAULT_SUPABASE_CONFIG,
} from '../utils/supabase';
import { ItemMaster, PurchaseRecord, IssueRecord, PartyMaster } from '../types';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  parties: PartyMaster[];
  items: ItemMaster[];
  purchases: PurchaseRecord[];
  issues: IssueRecord[];
  onDataLoaded: (data: {
    parties: PartyMaster[];
    items: ItemMaster[];
    purchases: PurchaseRecord[];
    issues: IssueRecord[];
  }) => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  parties,
  items,
  purchases,
  issues,
  onDataLoaded,
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'config' | 'sql'>('sync');
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [projectName, setProjectName] = useState('YARNSTOCK');
  const [projectId, setProjectId] = useState('hirwerrvnepnitbwusec');
  const [isConfigured, setIsConfigured] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    tablesExist?: boolean;
  } | null>(null);

  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ success?: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrl(creds.url);
      setAnonKey(creds.key);
      setProjectName(creds.projectName || DEFAULT_SUPABASE_CONFIG.projectName);
      setProjectId(creds.projectId || DEFAULT_SUPABASE_CONFIG.projectId);
      const configured = isSupabaseConfigured();
      setIsConfigured(configured);
      setSyncStatus(null);

      // Auto-run connection check on open
      if (configured) {
        setTesting(true);
        testSupabaseConnection().then((res) => {
          setTestResult(res);
          setTesting(false);
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(url, anonKey);
    const configured = isSupabaseConfigured();
    setIsConfigured(configured);
    setSyncStatus({ success: true, message: 'Supabase credentials saved successfully!' });
    handleTestConnection();
  };

  const handleResetToDefault = () => {
    resetSupabaseCredentialsToDefault();
    setUrl(DEFAULT_SUPABASE_CONFIG.url);
    setAnonKey(DEFAULT_SUPABASE_CONFIG.anonKey);
    setProjectName(DEFAULT_SUPABASE_CONFIG.projectName);
    setProjectId(DEFAULT_SUPABASE_CONFIG.projectId);
    setIsConfigured(true);
    setSyncStatus({ success: true, message: 'Reset to YARNSTOCK credentials!' });
    handleTestConnection();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection();
    setTestResult(res);
    setTesting(false);
  };

  const handlePushToSupabase = async () => {
    if (!isConfigured) {
      setActiveTab('config');
      return;
    }
    setPushing(true);
    setSyncStatus(null);
    const result = await pushAllToSupabase(parties, items, purchases, issues);
    setSyncStatus(result);
    setPushing(false);
  };

  const handlePullFromSupabase = async () => {
    if (!isConfigured) {
      setActiveTab('config');
      return;
    }
    setPulling(true);
    setSyncStatus(null);
    const remoteData = await fetchAllFromSupabase();
    if (remoteData) {
      onDataLoaded(remoteData);
      setSyncStatus({
        success: true,
        message: `Fetched ${remoteData.parties.length} parties, ${remoteData.items.length} items, ${remoteData.purchases.length} purchases, and ${remoteData.issues.length} issues from Supabase!`,
      });
    } else {
      setSyncStatus({
        success: false,
        message: 'Could not fetch data from Supabase. Ensure tables are created with the SQL schema.',
      });
    }
    setPulling(false);
  };

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                Supabase Database Connection
                {isConfigured && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Configured
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                PostgreSQL database persistence with instant real-time synchronization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6 gap-2 pt-2 text-xs">
          <button
            onClick={() => setActiveTab('sync')}
            className={`pb-2 px-3 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sync'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync & Status
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2 px-3 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'config'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Connection Keys
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`pb-2 px-3 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sql'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            SQL Schema Setup
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Status Message */}
          {syncStatus && (
            <div
              className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                syncStatus.success
                  ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-600/40 text-rose-200'
              }`}
            >
              {syncStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">{syncStatus.message}</div>
            </div>
          )}

          {/* TAB 1: SYNC & STATUS */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              {/* Connection Status Box */}
              <div className="p-4 rounded-lg bg-slate-800/60 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isConfigured ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400'
                      }`}
                    />
                    <div>
                      <span className="font-semibold text-slate-200 text-sm">
                        {isConfigured ? `Connected: ${projectName}` : 'Credentials Needed'}
                      </span>
                      {projectId && (
                        <span className="ml-2 text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                          ID: {projectId}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleTestConnection}
                    disabled={testing || !isConfigured}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
                    Test Connection
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`p-3 rounded text-[11px] border space-y-1.5 ${
                      testResult.success
                        ? testResult.tablesExist
                          ? 'bg-emerald-950/30 border-emerald-700/40 text-emerald-300'
                          : 'bg-amber-950/30 border-amber-700/40 text-amber-300'
                        : 'bg-rose-950/30 border-rose-700/40 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-medium">
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>{testResult.message}</span>
                    </div>

                    {testResult.success && !testResult.tablesExist && (
                      <div className="pt-1">
                        <button
                          onClick={() => setActiveTab('sql')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded text-[11px] transition-colors cursor-pointer shadow-xs"
                        >
                          <FileCode2 className="w-3.5 h-3.5" />
                          View SQL Schema & Copy Script
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {url && (
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 truncate">
                    <span className="text-slate-500">Project Endpoint:</span>
                    <code className="text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded truncate">
                      {url}
                    </code>
                  </div>
                )}
              </div>

              {/* Data Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-lg text-center">
                  <span className="text-[11px] text-slate-400 block">Parties</span>
                  <span className="text-lg font-bold text-white">{parties.length}</span>
                </div>
                <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-lg text-center">
                  <span className="text-[11px] text-slate-400 block">Items Master</span>
                  <span className="text-lg font-bold text-white">{items.length}</span>
                </div>
                <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-lg text-center">
                  <span className="text-[11px] text-slate-400 block">Purchases</span>
                  <span className="text-lg font-bold text-white">{purchases.length}</span>
                </div>
                <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-lg text-center">
                  <span className="text-[11px] text-slate-400 block">Issues</span>
                  <span className="text-lg font-bold text-white">{issues.length}</span>
                </div>
              </div>

              {/* Sync Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handlePushToSupabase}
                  disabled={pushing || !isConfigured}
                  className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium transition-all shadow-md cursor-pointer border border-emerald-400/40 text-center"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <UploadCloud className={`w-4 h-4 ${pushing ? 'animate-bounce' : ''}`} />
                    Push All Data to Supabase
                  </div>
                  <span className="text-[10px] text-emerald-100/80 font-normal">
                    Uploads current local items, parties, purchases & issues to PostgreSQL
                  </span>
                </button>

                <button
                  onClick={handlePullFromSupabase}
                  disabled={pulling || !isConfigured}
                  className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-medium transition-all border border-slate-700 text-center cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <DownloadCloud className={`w-4 h-4 ${pulling ? 'animate-bounce' : ''}`} />
                    Pull Data from Supabase
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Fetches the latest data saved in your Supabase cloud tables
                  </span>
                </button>
              </div>

              {/* Live sync note */}
              <div className="flex items-center gap-2 p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-lg text-slate-300 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Real-time Synchronized:</strong> When connected, all new entries, updates, and party additions automatically sync to your Supabase tables.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: CONNECTION KEYS CONFIG */}
          {activeTab === 'config' && (
            <form onSubmit={handleSaveCredentials} className="space-y-4">
              <div className="space-y-3 bg-slate-800/40 p-4 rounded-lg border border-slate-700/60">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-project.supabase.co"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500 font-mono text-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Found in Supabase Dashboard &rarr; Project Settings &rarr; API &rarr; Project URL
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Supabase Anon (Publishable) Key
                  </label>
                  <input
                    type="text"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500 font-mono text-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Found in Supabase Dashboard &rarr; Project Settings &rarr; API &rarr; Project API keys (`anon` / `public`)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs font-medium"
                >
                  Open Supabase Dashboard
                  <ExternalLink className="w-3 h-3" />
                </a>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="px-3 py-2 text-xs rounded-lg border border-emerald-700/60 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40 transition-colors cursor-pointer"
                  >
                    Reset to YARNSTOCK
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      saveSupabaseCredentials('', '');
                      setUrl('');
                      setAnonKey('');
                      setIsConfigured(false);
                      setSyncStatus({ success: true, message: 'Cleared saved Supabase configuration.' });
                    }}
                    className="px-3 py-2 text-xs rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Clear Keys
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save & Connect
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: SQL SCHEMA SETUP */}
          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-slate-300 text-xs">
                  Run this SQL in your <strong>Supabase SQL Editor</strong> to create the 4 required tables:
                </p>
                <button
                  onClick={copySqlToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium transition-colors cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSql ? 'Copied!' : 'Copy SQL Script'}
                </button>
              </div>

              <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 font-mono text-[11px] text-slate-300 max-h-72 overflow-y-auto p-4 select-all">
                <pre>{SUPABASE_SQL_SCHEMA}</pre>
              </div>

              <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] pt-1">
                <li>Create or open your Supabase project.</li>
                <li>Go to the <strong>SQL Editor</strong> tab on the left sidebar.</li>
                <li>Click <strong>New query</strong>, paste the copied SQL above, and click <strong>Run</strong>.</li>
                <li>Your tables (<code>parties</code>, <code>items</code>, <code>purchases</code>, <code>issues</code>) are instantly ready!</li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-slate-400 text-[11px]">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Supabase is compatible with Hostinger, Vercel, and all cloud hosts.
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
