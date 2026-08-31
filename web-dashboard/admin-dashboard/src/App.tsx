import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-8 shadow-sm text-center space-y-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-50 text-purple-600 border border-purple-100 mb-2">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Admin Control Center</h1>
        <p className="text-sm text-slate-600">
          Clean, high-functionality dashboard for Internal Operations, Support & Billing staff.
        </p>
        <div className="pt-4 border-t border-slate-100 flex justify-around text-xs font-medium text-slate-500">
          <span>Tenants</span>
          <span>•</span>
          <span>License Generator</span>
          <span>•</span>
          <span>System Metrics</span>
        </div>
      </div>
    </div>
  );
}
