import React from 'react';
import { ShieldCheck, Lock, Sparkles, X, ShoppingCart, Check } from 'lucide-react';
import { DeviceInfo } from '../types/dashboard.types';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredTier: string;
  featureName: string;
  currentDevice: DeviceInfo;
  onUpgradeToPlan: (planCode: string) => void;
}

export const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({
  isOpen,
  onClose,
  requiredTier,
  featureName,
  currentDevice,
  onUpgradeToPlan,
}) => {
  if (!isOpen) return null;

  const currentPlan = (currentDevice.planCode || 'basic').toUpperCase();

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-6 text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Requires {requiredTier.toUpperCase()} Plan</span>
            </div>
            <h3 className="text-xl font-bold text-white leading-tight">
              Unlock {featureName}
            </h3>
            <p className="text-xs text-slate-400">
              Active device is currently on <strong className="text-indigo-400 font-semibold">{currentPlan}</strong>
            </p>
          </div>
        </div>

        {/* Description Banner */}
        <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/70 text-xs text-slate-300 space-y-2">
          <p>
            <strong className="text-white">{featureName}</strong> is an enterprise-grade parental capability reserved for <strong>{requiredTier} Plan</strong> subscribers.
          </p>
          <ul className="space-y-1.5 pt-1 text-[11px] text-slate-400">
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Instant remote activation across all paired Android devices</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Zero-lag real-time hardware capture without target device notification</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Universal Cashfree UPI & Card checkout with auto-license provisioning</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => onUpgradeToPlan(requiredTier.toLowerCase())}
            className="flex-1 py-3 px-5 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Upgrade to {requiredTier} Plan Now ➔</span>
          </button>

          <button
            onClick={onClose}
            className="py-3 px-5 rounded-full bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};
