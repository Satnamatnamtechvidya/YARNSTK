import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export interface DeleteModalState {
  isOpen: boolean;
  type: 'item' | 'purchase' | 'issue';
  id: string;
  title: string;
  subtitle?: string;
  details?: { label: string; value: string }[];
  warningMessage?: string;
}

interface DeleteConfirmModalProps {
  state: DeleteModalState | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  state,
  onClose,
  onConfirm,
}) => {
  if (!state || !state.isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="delete-confirm-overlay"
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Header with red warning indicator */}
          <div className="bg-rose-50 border-b border-rose-100 p-5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="flex-1 pr-6">
              <h3 className="text-base font-bold text-slate-900">
                {state.title}
              </h3>
              {state.subtitle && (
                <p className="text-xs text-slate-600 mt-0.5">
                  {state.subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors absolute top-4 right-4"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Details & Warning Box */}
          <div className="p-5 space-y-4">
            {state.details && state.details.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                {state.details.map((d, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">{d.label}:</span>
                    <span className="font-semibold text-slate-800 font-mono">{d.value}</span>
                  </div>
                ))}
              </div>
            )}

            {state.warningMessage && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{state.warningMessage}</p>
              </div>
            )}

            <p className="text-xs text-slate-500">
              Are you sure you want to delete this {state.type === 'item' ? 'item from master' : state.type === 'purchase' ? 'purchase entry' : 'issue entry'}? This action will immediately recalculate stock balances.
            </p>
          </div>

          {/* Actions */}
          <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              id="btn-cancel-delete"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-delete"
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Permanently</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
