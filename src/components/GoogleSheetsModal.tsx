import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  X, 
  ExternalLink, 
  RefreshCw, 
  Upload, 
  Download, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  LogOut, 
  Search, 
  Link as LinkIcon,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { User } from 'firebase/auth';
import { ItemMaster, PurchaseRecord, IssueRecord, StockBalanceItem, GoogleSheetConnection, DriveSpreadsheetFile } from '../types';
import { googleSignIn, logoutGoogle } from '../utils/googleAuth';
import { 
  fetchUserSpreadsheets, 
  createGoogleSpreadsheet, 
  exportToGoogleSpreadsheet, 
  importFromGoogleSpreadsheet, 
  getSpreadsheetDetails, 
  extractSpreadsheetId 
} from '../utils/googleSheets';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  accessToken: string | null;
  onAuthSuccess: (user: User, token: string) => void;
  onAuthLogout: () => void;
  items: ItemMaster[];
  purchases: PurchaseRecord[];
  issues: IssueRecord[];
  stockBalances: StockBalanceItem[];
  connection: GoogleSheetConnection | null;
  onUpdateConnection: (conn: GoogleSheetConnection | null) => void;
  onImportData: (data: { items: ItemMaster[]; purchases: PurchaseRecord[]; issues: IssueRecord[] }) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  accessToken,
  onAuthSuccess,
  onAuthLogout,
  items,
  purchases,
  issues,
  stockBalances,
  connection,
  onUpdateConnection,
  onImportData,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'create' | 'drive' | 'link'>('status');
  
  // Auth state
  const [isSigningIn, setIsSigningIn] = useState(false);
  
  // Create state
  const [newTitle, setNewTitle] = useState(`Textile Stock Register - ${new Date().toISOString().slice(0, 10)}`);
  const [isCreating, setIsCreating] = useState(false);

  // Link manual state
  const [manualInput, setManualInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  // Drive picker state
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [driveSearch, setDriveSearch] = useState('');

  // Sync operations state
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [confirmPushOpen, setConfirmPushOpen] = useState(false);
  const [confirmPullOpen, setConfirmPullOpen] = useState(false);

  // Load Drive files if authenticated
  const loadDriveFiles = async (token: string) => {
    setIsLoadingDrive(true);
    try {
      const files = await fetchUserSpreadsheets(token);
      setDriveFiles(files);
    } catch (err: any) {
      console.error('Failed to list Google Sheets:', err);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  useEffect(() => {
    if (isOpen && accessToken) {
      loadDriveFiles(accessToken);
    }
  }, [isOpen, accessToken]);

  // Adjust default tab based on whether a sheet is already connected
  useEffect(() => {
    if (connection) {
      setActiveTab('status');
    } else if (currentUser && accessToken) {
      setActiveTab('create');
    }
  }, [connection, currentUser, accessToken]);

  if (!isOpen) return null;

  // Handle Google Sign In
  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        onAuthSuccess(res.user, res.accessToken);
        showToast(`Signed in as ${res.user.email || 'Google User'}`);
        loadDriveFiles(res.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      showToast(err.message || 'Google sign-in failed', 'error');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Handle Google Sign Out
  const handleGoogleLogout = async () => {
    try {
      await logoutGoogle();
      onAuthLogout();
      showToast('Signed out of Google account');
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  // Create New Spreadsheet
  const handleCreateSpreadsheet = async () => {
    if (!accessToken) {
      showToast('Please sign in with Google first', 'error');
      return;
    }
    setIsCreating(true);
    try {
      const result = await createGoogleSpreadsheet(
        accessToken,
        newTitle.trim() || 'Textile Stock Register',
        items,
        purchases,
        issues,
        stockBalances
      );

      const newConn: GoogleSheetConnection = {
        spreadsheetId: result.spreadsheetId,
        spreadsheetTitle: result.title,
        spreadsheetUrl: result.spreadsheetUrl,
        lastSyncedAt: new Date().toISOString(),
      };

      onUpdateConnection(newConn);
      setActiveTab('status');
      showToast(`Created & synced "${result.title}" on Google Sheets!`);
    } catch (err: any) {
      console.error('Creation error:', err);
      showToast(err.message || 'Failed to create Google Sheet', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Link from Drive or Manual ID
  const handleLinkSpreadsheet = async (idOrUrl: string) => {
    if (!accessToken) {
      showToast('Please sign in with Google first', 'error');
      return;
    }
    const cleanId = extractSpreadsheetId(idOrUrl);
    if (!cleanId) {
      showToast('Please provide a valid Google Sheet URL or ID', 'error');
      return;
    }

    setIsLinking(true);
    try {
      const details = await getSpreadsheetDetails(accessToken, cleanId);
      const newConn: GoogleSheetConnection = {
        spreadsheetId: cleanId,
        spreadsheetTitle: details.title,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
        lastSyncedAt: undefined,
      };

      onUpdateConnection(newConn);
      setActiveTab('status');
      showToast(`Connected to "${details.title}"`);
    } catch (err: any) {
      console.error('Link error:', err);
      showToast(err.message || 'Could not access spreadsheet', 'error');
    } finally {
      setIsLinking(false);
    }
  };

  // Push local data to Google Sheet
  const handlePushData = async () => {
    if (!accessToken || !connection) return;
    setIsPushing(true);
    setConfirmPushOpen(false);
    try {
      await exportToGoogleSpreadsheet(
        accessToken,
        connection.spreadsheetId,
        items,
        purchases,
        issues,
        stockBalances
      );

      const updatedConn: GoogleSheetConnection = {
        ...connection,
        lastSyncedAt: new Date().toISOString(),
      };
      onUpdateConnection(updatedConn);
      showToast('Successfully synced all local records to Google Sheet!');
    } catch (err: any) {
      console.error('Push error:', err);
      showToast(err.message || 'Failed to sync to Google Sheet', 'error');
    } finally {
      setIsPushing(false);
    }
  };

  // Pull / Import data from Google Sheet
  const handlePullData = async () => {
    if (!accessToken || !connection) return;
    setIsPulling(true);
    setConfirmPullOpen(false);
    try {
      const imported = await importFromGoogleSpreadsheet(accessToken, connection.spreadsheetId);
      onImportData({
        items: imported.items,
        purchases: imported.purchases,
        issues: imported.issues,
      });

      const updatedConn: GoogleSheetConnection = {
        ...connection,
        lastSyncedAt: new Date().toISOString(),
      };
      onUpdateConnection(updatedConn);
      showToast(
        `Imported ${imported.stats.itemsCount} items, ${imported.stats.purchasesCount} purchases, ${imported.stats.issuesCount} issues from Google Sheet!`
      );
    } catch (err: any) {
      console.error('Pull error:', err);
      showToast(err.message || 'Failed to import data from Google Sheet', 'error');
    } finally {
      setIsPulling(false);
    }
  };

  // Filter drive files
  const filteredDriveFiles = driveFiles.filter(f => 
    f.name.toLowerCase().includes(driveSearch.toLowerCase())
  );

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-sheets-modal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-emerald-900 text-white p-5 flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center text-emerald-300 shadow-inner">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="google-sheets-modal-title" className="text-lg font-bold">Google Sheets Sync</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-700/80 text-emerald-100 rounded-full">
                  Live Integration
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-0.5">
                Real-time 2-way synchronization with Google Drive & Google Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-300 hover:text-white p-1.5 rounded-lg hover:bg-emerald-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          {currentUser && accessToken ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-slate-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                    {(currentUser.email?.[0] || 'U').toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {currentUser.displayName || currentUser.email}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Connected to Google Workspace</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleGoogleLogout}
                className="text-xs font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1 px-2.5 py-1 rounded hover:bg-slate-100 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
              <div className="text-xs text-slate-600">
                Sign in with your Google account to connect, export, or sync spreadsheets.
              </div>
              {/* Official Google Sign-in styled button */}
              <button
                onClick={handleGoogleLogin}
                disabled={isSigningIn}
                className="px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg shadow-xs flex items-center gap-2.5 transition-all cursor-pointer shrink-0"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-5 gap-1">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'status'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sync Status</span>
            {connection && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Sheet</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('drive');
              if (accessToken) loadDriveFiles(accessToken);
            }}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'drive'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Browse My Drive</span>
          </button>

          <button
            onClick={() => setActiveTab('link')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'link'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Connect by URL / ID</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* TAB 1: STATUS & ACTIONS */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              {connection ? (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4.5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <h4 className="text-sm font-bold text-slate-900">
                          {connection.spreadsheetTitle}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-mono">
                        ID: {connection.spreadsheetId}
                      </p>
                      <div className="text-xs text-slate-600 mt-2 flex items-center gap-2">
                        <span>Last Synced:</span>
                        <span className="font-semibold text-slate-800">
                          {connection.lastSyncedAt
                            ? new Date(connection.lastSyncedAt).toLocaleString()
                            : 'Not yet synced in this session'}
                        </span>
                      </div>
                    </div>

                    <a
                      href={connection.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
                    >
                      <span>Open in Sheets</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* 4 Sheets Info */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 text-xs">
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      <div className="text-slate-500 text-[11px]">Stock Balance</div>
                      <div className="font-bold text-emerald-800">{stockBalances.length} Items</div>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      <div className="text-slate-500 text-[11px]">Purchases</div>
                      <div className="font-bold text-blue-800">{purchases.length} Bills</div>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      <div className="text-slate-500 text-[11px]">Issues</div>
                      <div className="font-bold text-amber-800">{issues.length} Slips</div>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                      <div className="text-slate-500 text-[11px]">Item Master</div>
                      <div className="font-bold text-purple-800">{items.length} Master</div>
                    </div>
                  </div>

                  {/* Sync Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                    <button
                      onClick={() => setConfirmPushOpen(true)}
                      disabled={isPushing || !accessToken}
                      className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{isPushing ? 'Pushing Data...' : 'Push Local Data to Sheet'}</span>
                    </button>

                    <button
                      onClick={() => setConfirmPullOpen(true)}
                      disabled={isPulling || !accessToken}
                      className="flex-1 py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-4 h-4 text-emerald-600" />
                      <span>{isPulling ? 'Importing Data...' : 'Import Data from Sheet'}</span>
                    </button>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => onUpdateConnection(null)}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline"
                    >
                      Unlink Google Sheet
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No Google Sheet Connected Yet</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                    Create a new Google Spreadsheet in your Google Drive or connect an existing spreadsheet to enable 2-way live sync.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      onClick={() => setActiveTab('create')}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create New Sheet</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('drive')}
                      className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5"
                    >
                      <Layers className="w-4 h-4 text-emerald-600" />
                      <span>Pick from My Drive</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE NEW SPREADSHEET */}
          {activeTab === 'create' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Spreadsheet Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Textile Stock Inventory Register 2026"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-emerald-600"
                />
                <p className="text-[11px] text-slate-500 mt-2">
                  This will generate a new Google Spreadsheet directly in your Google Drive with 4 structured tabs: <strong>STOCK BALANCE REPORT</strong>, <strong>PURCHASE (INVOICES)</strong>, <strong>ISSUE (SLIPS)</strong>, and <strong>ITEM MASTER</strong>.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setActiveTab('status')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSpreadsheet}
                  disabled={isCreating || !accessToken || !newTitle.trim()}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isCreating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{isCreating ? 'Creating in Google Drive...' : 'Create & Sync Now'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: BROWSE MY DRIVE */}
          {activeTab === 'drive' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={driveSearch}
                    onChange={(e) => setDriveSearch(e.target.value)}
                    placeholder="Search spreadsheets in Google Drive..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-emerald-600"
                  />
                </div>
                <button
                  onClick={() => accessToken && loadDriveFiles(accessToken)}
                  disabled={isLoadingDrive || !accessToken}
                  className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-300 transition-colors"
                  title="Refresh Drive List"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {isLoadingDrive ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                  Loading spreadsheets from Google Drive...
                </div>
              ) : filteredDriveFiles.length > 0 ? (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {filteredDriveFiles.map((file) => (
                    <div
                      key={file.id}
                      className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-800 truncate">
                            {file.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {file.modifiedTime
                              ? `Modified: ${new Date(file.modifiedTime).toLocaleDateString()}`
                              : 'Google Spreadsheet'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
                          title="View on Google Sheets"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleLinkSpreadsheet(file.id)}
                          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                        >
                          <span>Connect</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  {driveSearch
                    ? 'No matching spreadsheets found.'
                    : currentUser
                    ? 'No spreadsheets found in your Google Drive. Create a new one!'
                    : 'Sign in to see spreadsheets from your Google Drive.'}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CONNECT BY URL / ID */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Paste Google Sheet URL or ID
                </label>
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-emerald-600"
                />
                <p className="text-[11px] text-slate-500 mt-2">
                  You can copy the link from your browser address bar when viewing any Google Sheet you have access to.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setActiveTab('status')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleLinkSpreadsheet(manualInput)}
                  disabled={isLinking || !accessToken || !manualInput.trim()}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <LinkIcon className="w-4 h-4" />
                  <span>{isLinking ? 'Connecting...' : 'Connect Sheet'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Google Drive & Sheets v4 API</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>

      {/* Confirmation Dialog for Push / Overwrite Google Sheet */}
      <AnimatePresence>
        {confirmPushOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Push Local Records to Google Sheet?
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Target: <strong>{connection?.spreadsheetTitle}</strong>
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  This will update the 4 sheets in your Google Spreadsheet with:
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 font-medium">
                    <li>{items.length} Item Master records</li>
                    <li>{purchases.length} Purchase invoices</li>
                    <li>{issues.length} Issue slips</li>
                    <li>{stockBalances.length} Stock Balance calculations</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmPushOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePushData}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Confirm & Push Data</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog for Pull / Overwrite Local State from Google Sheet */}
      <AnimatePresence>
        {confirmPullOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Import Records from Google Sheet?
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Source: <strong>{connection?.spreadsheetTitle}</strong>
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-3 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  This will pull all items, purchase invoices, and issue slips from your Google Spreadsheet into this application.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmPullOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePullData}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Confirm & Import Data</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
