import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, CheckCircle2 } from 'lucide-react';

export default function EmployeeDashboardPlaceholder() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8" />
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
          Employee Portal Authenticated
        </span>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome, {user?.name}!</h1>
        <p className="text-sm text-slate-500 mb-6">
          Role: <strong className="text-slate-800">{user?.role}</strong> • Email: <span className="text-slate-800">{user?.email}</span>
        </p>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs font-mono text-slate-700 mb-6 space-y-1">
          <p><strong>Department:</strong> {user?.department || 'Engineering'}</p>
          <p><strong>Designation:</strong> {user?.designation || 'Team Member'}</p>
          <p><strong>Session:</strong> Active JWT verified via MongoDB Atlas</p>
        </div>

        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}

