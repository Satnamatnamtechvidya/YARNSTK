import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  KeyRound, 
  Lock, 
  Unlock, 
  X, 
  Check, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserRole } from '../types';
import { 
  verifyAdminPin, 
  saveStoredAdminPin, 
  DEFAULT_ADMIN_PIN,
  resetAdminPinToDefault
} from '../utils/authRoles';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  onRoleChange: (newRole: UserRole) => void;
  actionReason?: string; // Optional message explaining why admin authorization is requested
}

export const RoleModal: React.FC<RoleModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  onRoleChange,
  actionReason,
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Changing PIN state
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  if (!isOpen) return null;

  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pin) {
      setError('Please enter the Admin PIN');
      return;
    }

    if (verifyAdminPin(pin)) {
      onRoleChange('admin');
      setPin('');
      onClose();
    } else {
      setError(`Incorrect Admin PIN. Default PIN is ${DEFAULT_ADMIN_PIN}`);
    }
  };

  const handleResetAdminPin = () => {
    resetAdminPinToDefault();
    setPin(DEFAULT_ADMIN_PIN);
    setError(null);
    setSuccessMsg(`Admin PIN reset to default: ${DEFAULT_ADMIN_PIN}`);
  };

  const handleSwitchToUser = () => {
    onRoleChange('user');
    onClose();
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!verifyAdminPin(oldPin)) {
      setError('Current Admin PIN is incorrect');
      return;
    }
    if (newPin.trim().length < 4) {
      setError('New PIN must be at least 4 characters');
      return;
    }
    if (newPin !== confirmPin) {
      setError('New PIN and confirmation do not match');
      return;
    }

    const saved = saveStoredAdminPin(newPin);
    if (saved) {
      setSuccessMsg('Admin PIN updated successfully!');
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      setTimeout(() => setIsChangingPin(false), 1500);
    } else {
      setError('Failed to save new PIN');
    }
  };

  return (
    <AnimatePresence>
      <div 
        id="role-modal-overlay"
        className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full overflow-hidden text-slate-800 my-8"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${
                currentRole === 'admin' 
                  ? 'bg-amber-100 border-amber-200 text-amber-700' 
                  : 'bg-blue-100 border-blue-200 text-blue-700'
              }`}>
                {currentRole === 'admin' ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : (
                  <UserCheck className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Access Control & Roles
                </h3>
                <p className="text-xs text-slate-500">
                  Current Mode:{' '}
                  <span className={`font-semibold ${currentRole === 'admin' ? 'text-amber-700' : 'text-blue-700'}`}>
                    {currentRole === 'admin' ? 'Administrator (Full Access)' : 'User (Data Entry Only)'}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Reason Banner if triggered by restricted click */}
          {actionReason && currentRole === 'user' && (
            <div className="bg-amber-50 border-b border-amber-200 p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-950">Admin Authorization Required:</span>
                <p className="text-[11px] text-amber-800 mt-0.5">{actionReason}</p>
              </div>
            </div>
          )}

          <div className="p-5 space-y-5 text-xs">
            {/* Roles Matrix Comparison */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Role Permissions Summary
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className={`p-2.5 rounded-lg border ${
                  currentRole === 'user' ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'
                }`}>
                  <div className="font-bold text-blue-700 mb-1 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>User (Staff)</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-600">
                    <li className="text-emerald-700">✓ Create Item Master</li>
                    <li className="text-emerald-700">✓ Create Party Master</li>
                    <li className="text-emerald-700">✓ Enter Purchases & Issues</li>
                    <li className="text-rose-600 font-semibold">✗ Cannot modify entries</li>
                    <li className="text-rose-600 font-semibold">✗ Cannot delete data</li>
                  </ul>
                </div>

                <div className={`p-2.5 rounded-lg border ${
                  currentRole === 'admin' ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'
                }`}>
                  <div className="font-bold text-amber-700 mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Administrator</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-600">
                    <li className="text-emerald-700">✓ Create Item & Party</li>
                    <li className="text-emerald-700">✓ Enter all transactions</li>
                    <li className="text-emerald-700 font-semibold">✓ Modify / Edit entries</li>
                    <li className="text-emerald-700 font-semibold">✓ Delete records</li>
                    <li className="text-emerald-700">✓ Clear / Reset workbook</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Error or Success feedback */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center gap-2 text-xs">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Switch from User to Admin Form */}
            {currentRole === 'user' && (
              <form onSubmit={handleUnlockAdmin} className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Enter Admin PIN to switch to Administrator Mode:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="input-admin-pin"
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter Admin PIN (Default: admin123)"
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Default PIN: <code className="text-amber-800 font-mono bg-amber-50 border border-amber-200 px-1 py-0.5 rounded">{DEFAULT_ADMIN_PIN}</code></span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPin(DEFAULT_ADMIN_PIN)}
                      className="text-amber-700 hover:underline cursor-pointer"
                    >
                      Autofill PIN
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleResetAdminPin}
                      className="text-emerald-700 hover:underline cursor-pointer"
                      title="Reset stored admin PIN to default admin123"
                    >
                      Reset to Default
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    id="btn-confirm-unlock-admin"
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Unlock Admin Role</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Currently Admin Options */}
            {currentRole === 'admin' && (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <div>
                      <div className="font-semibold text-amber-950">Administrator Mode is Active</div>
                      <div className="text-[11px] text-amber-800">You have full modification and deletion rights.</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    id="btn-switch-to-user-mode"
                    type="button"
                    onClick={handleSwitchToUser}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Switch to User Mode (Lock)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsChangingPin(!isChangingPin)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl border border-slate-300 transition-colors cursor-pointer"
                  >
                    {isChangingPin ? 'Cancel' : 'Change PIN'}
                  </button>
                </div>

                {/* Change PIN Accordion */}
                {isChangingPin && (
                  <form onSubmit={handleSaveNewPin} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="font-semibold text-slate-800">Change Admin PIN</div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Current PIN</label>
                      <input
                        type="password"
                        value={oldPin}
                        onChange={(e) => setOldPin(e.target.value)}
                        placeholder="Current PIN"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">New PIN</label>
                        <input
                          type="password"
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value)}
                          placeholder="New PIN"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">Confirm New PIN</label>
                        <input
                          type="password"
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value)}
                          placeholder="Confirm"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Update Admin PIN
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
