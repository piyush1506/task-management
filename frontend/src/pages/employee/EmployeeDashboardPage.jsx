import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  Calendar,
  Eye,
  RefreshCw,
  MessageSquare,
  Send,
} from 'lucide-react';

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [notification, setNotification] = useState(null);

  // Selected task for status update / details
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/employee');
      if (res.data?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Fetch employee dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleStatusChange = async (taskId, newStatus) => {
    setUpdatingTaskId(taskId);
    try {
      const res = await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      if (res.data?.success) {
        showToast(`Task status updated to ${newStatus}`);
        fetchDashboard();
        if (selectedTask && selectedTask._id === taskId) {
          openDetails({ _id: taskId });
        }
      }
    } catch (err) {
      alert('Failed to update status: ' + (err.response?.data?.message || err.message));
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const openDetails = async (task) => {
    try {
      const res = await api.get(`/tasks/${task._id}`);
      if (res.data?.success) {
        setSelectedTask(res.data.task);
        setIsDetailsOpen(true);
      }
    } catch (err) {
      alert('Could not load task details');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setCommentLoading(true);
    try {
      const res = await api.post(`/tasks/${selectedTask._id}/comments`, {
        message: commentText.trim(),
      });
      if (res.data?.success) {
        setCommentText('');
        openDetails(selectedTask);
      }
    } catch (err) {
      alert('Failed to add comment: ' + (err.response?.data?.message || err.message));
    } finally {
      setCommentLoading(false);
    }
  };

  const stats = data?.stats || {};
  const allTasks = data?.tasks || [];

  const filteredTasks = allTasks.filter((t) => {
    if (filter === 'ALL') return true;
    return t.status === filter;
  });

  const statCards = [
    {
      title: 'Total Assigned',
      value: stats.totalAssignedTasks || 0,
      icon: CheckSquare,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Pending',
      value: stats.pendingTasks || 0,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'In Progress',
      value: stats.inProgressTasks || 0,
      icon: FolderKanban,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Completed',
      value: stats.completedTasks || 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Overdue',
      value: stats.overdueTasks || 0,
      icon: AlertTriangle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Personal Task Dashboard • {user?.designation} ({user?.department})
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh My Tasks
        </button>
      </div>

      {/* 5 Personal Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.bg}`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* My Tasks Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Section Top Bar with Filters */}
        <div className="p-4 sm:px-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">My Assigned Tasks</h3>
            <p className="text-xs text-slate-400">Review task requirements and update work progress</p>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filter === st
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Tasks List */}
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading your tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No tasks found in {filter} status
            </div>
          ) : (
            filteredTasks.map((t) => (
              <div
                key={t._id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{t.title}</h4>
                    <PriorityBadge priority={t.priority} />
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">{t.description}</p>
                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <FolderKanban className="w-3.5 h-3.5" />
                      Project: <strong className="text-slate-600">{t.project?.title || 'Unknown'}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Deadline: <strong className="text-slate-600">{new Date(t.deadline).toLocaleDateString()}</strong>
                    </span>
                  </div>
                </div>

                {/* Status Updater & Details Button */}
                <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-500">Status:</label>
                    <select
                      value={t.status}
                      disabled={updatingTaskId === t._id}
                      onChange={(e) => handleStatusChange(t._id, e.target.value)}
                      className="text-xs font-semibold rounded-lg px-2.5 py-1.5 border border-slate-200 bg-white text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>

                  <button
                    onClick={() => openDetails(t)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Task Details Modal (Section 8.3 & 9.4) */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={selectedTask ? `Task: ${selectedTask.title}` : 'Task Details'}
        maxWidth="max-w-2xl"
      >
        {selectedTask && (
          <div className="space-y-6 text-xs">
            {/* Info Card */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedTask.status} />
                  <PriorityBadge priority={selectedTask.priority} />
                </div>
                <span className="text-slate-500">
                  Project: <strong className="text-slate-800">{selectedTask.project?.title}</strong>
                </span>
              </div>

              <p className="text-slate-800 leading-relaxed font-medium">{selectedTask.description}</p>

              <div className="grid grid-cols-2 gap-2 text-slate-500 pt-2 border-t border-slate-200/60 text-[11px]">
                <div>
                  Start Date:{' '}
                  <strong className="text-slate-800">
                    {new Date(selectedTask.startDate).toLocaleDateString()}
                  </strong>
                </div>
                <div>
                  Deadline:{' '}
                  <strong className="text-slate-800">
                    {new Date(selectedTask.deadline).toLocaleDateString()}
                  </strong>
                </div>
              </div>
            </div>

            {/* Quick Status Update Selector inside details */}
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
              <div>
                <h5 className="font-bold text-slate-900">Update Task Status</h5>
                <p className="text-[11px] text-slate-500">Record your latest work milestone</p>
              </div>
              <select
                value={selectedTask.status}
                onChange={(e) => handleStatusChange(selectedTask._id, e.target.value)}
                className="text-xs font-bold rounded-lg px-3 py-2 bg-white border border-blue-200 text-blue-700 shadow-2xs focus:outline-none"
              >
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            {/* Comments Thread */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <h4 className="font-bold text-slate-900">Comments & Work Updates</h4>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto mb-3">
                {selectedTask.comments?.length === 0 ? (
                  <p className="p-4 text-center text-slate-400">No comments yet</p>
                ) : (
                  selectedTask.comments?.map((c) => (
                    <div key={c._id} className="p-3 bg-white">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-slate-800">{c.user?.name}</span>
                        <span className="text-slate-400">
                          {new Date(c.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-normal">{c.message}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Post progress update or query..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="submit"
                  disabled={commentLoading || !commentText.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Post
                </button>
              </form>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

