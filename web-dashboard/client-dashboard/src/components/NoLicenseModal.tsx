import React from 'react';
import { ShoppingCart, ShieldAlert, ArrowRight, X } from 'lucide-react';

interface NoLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToBuyNow: () => void;
  onNavigateToPairing?: () => void;
}

export const NoLicenseModal: React.FC<NoLicenseModalProps> = ({
  isOpen,
  onClose,
  onNavigateToBuyNow
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs font-sans">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Icon Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Badge Icon */}
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner border border-amber-200/60">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Modal Text Header */}
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-slate-900">
            No Active License Plan Found
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed font-medium">
            Your parent account has no active ChildCare Protection Plan. Please purchase a license plan to pair and protect target devices.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={() => {
              onClose();
              onNavigateToBuyNow();
            }}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-full shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Buy Protection Plan Now ➔</span>
          </button>
        </div>

      </div>
    </div>
  );
};
