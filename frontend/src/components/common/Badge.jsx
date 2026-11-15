import React from 'react';

export const StatusBadge = ({ status }) => {
  const styles = {
    PLANNING: 'bg-slate-100 text-slate-700 border-slate-200',
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ON_HOLD: 'bg-amber-50 text-amber-700 border-amber-200',
    COMPLETED: 'bg-blue-50 text-blue-700 border-blue-200',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
    INACTIVE: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const labels = {
    PLANNING: 'Planning',
    ACTIVE: 'Active',
    ON_HOLD: 'On Hold',
    COMPLETED: 'Completed',
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    INACTIVE: 'Inactive',
  };

  const cleanStatus = status?.toUpperCase() || 'PENDING';
  const style = styles[cleanStatus] || 'bg-slate-50 text-slate-700 border-slate-200';
  const label = labels[cleanStatus] || status;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
      {label}
    </span>
  );
};

export const PriorityBadge = ({ priority }) => {
  const styles = {
    LOW: 'bg-slate-100 text-slate-600 border-slate-200',
    MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
    HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
    URGENT: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
  };

  const cleanPriority = priority?.toUpperCase() || 'MEDIUM';
  const style = styles[cleanPriority] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}
    >
      {cleanPriority}
    </span>
  );
};

