import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import {
  CheckSquare,
  Search,
  Filter,
  Calendar,
  FolderKanban,
  Eye,
  MessageSquare,
  Send,
  CheckCircle2,
  Plus,
  Trash2,
  ListTodo,
  Check,
} from 'lucide-react';

export default function EmployeeTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [notification, setNotification] = useState(null);

  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // Subtask creation state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [subtaskLoading, setSubtaskLoading] = useState(false);

  const showToast = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks', {
        params: { search, status: statusFilter, priority: priorityFilter },
      });
      if (res.data?.success) {
        setTasks(res.data.tasks || []);
      }
    } catch (err) {
      console.error('Fetch employee tasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [search, statusFilter, priorityFilter]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      if (res.data?.success) {
        showToast(`Status updated to ${newStatus}`);
        fetchTasks();
        if (selectedTask && selectedTask._id === taskId) {
          openDetails({ _id: taskId });
        }
      }
    } catch (err) {
      alert('Status change error: ' + (err.response?.data?.message || err.message));
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

  // Add a subtask
  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !selectedTask) return;

    setSubtaskLoading(true);
    try {
      const res = await api.post(`/tasks/${selectedTask._id}/subtasks`, {
        title: newSubtaskTitle.trim(),
      });
      if (res.data?.success) {
        setNewSubtaskTitle('');
        setSelectedTask((prev) => ({
          ...prev,
          subtasks: res.data.subtasks,
          status: res.data.task?.status || prev.status,
        }));
        showToast('Subtask added');
        fetchTasks();
      }
    } catch (err) {
      alert('Failed to add subtask: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubtaskLoading(false);
    }
  };

  // Check / Uncheck a subtask
  const handleToggleSubtask = async (subtaskId, currentStatus) => {
    if (!selectedTask) return;

    try {
      const res = await api.patch(`/tasks/${selectedTask._id}/subtasks/${subtaskId}`, {
        isCompleted: !currentStatus,
      });

      if (res.data?.success) {
        const updatedSubtasks = res.data.subtasks;
        const updatedTask = res.data.task;

        setSelectedTask((prev) => ({
          ...prev,
          subtasks: updatedSubtasks,
          status: updatedTask?.status || prev.status,
        }));

        const isNowDone = !currentStatus;
        showToast(
          isNowDone ? '✓ Subtask marked complete!' : 'Subtask marked incomplete'
        );
        fetchTasks();
      }
    } catch (err) {
      alert('Failed to update subtask');
    }
  };

  // Delete a subtask
  const handleDeleteSubtask = async (subtaskId) => {
    if (!selectedTask) return;
    try {
      const res = await api.delete(`/tasks/${selectedTask._id}/subtasks/${subtaskId}`);
      if (res.data?.success) {
        setSelectedTask((prev) => ({
          ...prev,
          subtasks: res.data.subtasks,
        }));
        showToast('Subtask removed');
        fetchTasks();
      }
    } catch (err) {
      alert('Failed to delete subtask');
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
      alert('Failed to post comment');
    } finally {
      setCommentLoading(false);
    }
  };

  // Subtask progress calculations for modal
  const subtasks = selectedTask?.subtasks || [];
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter((s) => s.isCompleted).length;
  const progressPercent =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Assigned Tasks</h1>
        <p className="text-xs text-slate-500 mt-1">
          Track deliverables, manage step-by-step subtasks, and check off completed work.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by task title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Task</th>
                <th className="py-3.5 px-4">Project</th>
                <th className="py-3.5 px-4 text-center">Subtasks Progress</th>
                <th className="py-3.5 px-4 text-center">Priority</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Deadline</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    Loading tasks...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    No assigned tasks match criteria
                  </td>
                </tr>
              ) : (
                tasks.map((t) => {
                  const sList = t.subtasks || [];
                  const sTotal = sList.length;
                  const sDone = sList.filter((s) => s.isCompleted).length;
                  const sPercent = sTotal > 0 ? Math.round((sDone / sTotal) * 100) : 0;

                  return (
                    <tr key={t._id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{t.title}</p>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{t.description}</p>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {t.project?.title || 'Unknown Project'}
                      </td>

                      {/* Subtasks Progress Column */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {sTotal === 0 ? (
                          <button
                            onClick={() => openDetails(t)}
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-medium cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add subtask</span>
                          </button>
                        ) : (
                          <div
                            onClick={() => openDetails(t)}
                            className="inline-block cursor-pointer group"
                            title="Click to view & check subtasks"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <span
                                className={`text-[11px] font-bold ${
                                  sDone === sTotal ? 'text-emerald-600' : 'text-slate-700'
                                }`}
                              >
                                {sDone}/{sTotal} ({sPercent}%)
                              </span>
                            </div>
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1 mx-auto">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  sDone === sTotal ? 'bg-emerald-500' : 'bg-blue-600'
                                }`}
                                style={{ width: `${sPercent}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <PriorityBadge priority={t.priority} />
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <select
                          value={t.status}
                          onChange={(e) => handleStatusChange(t._id, e.target.value)}
                          className="text-xs font-semibold rounded-lg px-2.5 py-1 border border-slate-200 bg-white shadow-2xs focus:outline-none cursor-pointer"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(t.deadline).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openDetails(t)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Open Task & Subtasks"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Details & Subtasks Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={selectedTask?.title || 'Task Details'}
        maxWidth="max-w-2xl"
      >
        {selectedTask && (
          <div className="space-y-6 text-xs">
            {/* Task Overview Card */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <StatusBadge status={selectedTask.status} />
                <PriorityBadge priority={selectedTask.priority} />
              </div>
              <p className="text-slate-800 font-medium leading-relaxed">
                {selectedTask.description}
              </p>
              <p className="text-[11px] text-slate-500 pt-1">
                Project: <strong className="text-slate-700">{selectedTask.project?.title}</strong>{' '}
                • Due: {new Date(selectedTask.deadline).toLocaleDateString()}
              </p>
            </div>

            {/* SUBTASKS & CHECKLIST SECTION */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-slate-900 text-sm">
                    Subtasks & Checklist ({completedSubtasks}/{totalSubtasks})
                  </h4>
                </div>
                {totalSubtasks > 0 && (
                  <span
                    className={`text-[11px] font-bold ${
                      progressPercent === 100 ? 'text-emerald-600' : 'text-slate-500'
                    }`}
                  >
                    {progressPercent}% Complete
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {totalSubtasks > 0 && (
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              )}

              {/* All Completed Banner */}
              {totalSubtasks > 0 && progressPercent === 100 && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    All subtasks are finished!
                  </span>
                  {selectedTask.status !== 'COMPLETED' && (
                    <button
                      onClick={() => handleStatusChange(selectedTask._id, 'COMPLETED')}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] cursor-pointer"
                    >
                      Mark Task as Completed
                    </button>
                  )}
                </div>
              )}

              {/* Add Subtask Form */}
              <form onSubmit={handleAddSubtask} className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Type a subtask (e.g. Design mobile layout, get client signoff)..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                />
                <button
                  type="submit"
                  disabled={subtaskLoading || !newSubtaskTitle.trim()}
                  className="inline-flex items-center gap-1 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Subtask</span>
                </button>
              </form>

              {/* Subtasks Checklist List */}
              <div className="divide-y divide-slate-100 pt-1">
                {subtasks.length === 0 ? (
                  <p className="text-center py-4 text-slate-400 text-xs italic">
                    No subtasks added yet. Add checklist items above to break down this task.
                  </p>
                ) : (
                  subtasks.map((st) => (
                    <div
                      key={st._id}
                      className="py-2.5 flex items-center justify-between gap-3 group hover:bg-slate-50/50 px-2 rounded-lg transition-colors"
                    >
                      {/* Checkbox & Title */}
                      <div
                        onClick={() => handleToggleSubtask(st._id, st.isCompleted)}
                        className="flex items-center gap-3 flex-1 cursor-pointer select-none"
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            st.isCompleted
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 hover:border-blue-500 bg-white'
                          }`}
                        >
                          {st.isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        <span
                          className={`text-xs transition-colors ${
                            st.isCompleted
                              ? 'line-through text-slate-400 font-normal'
                              : 'text-slate-800 font-semibold'
                          }`}
                        >
                          {st.title}
                        </span>
                      </div>

                      {/* Delete icon */}
                      <button
                        onClick={() => handleDeleteSubtask(st._id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-opacity cursor-pointer"
                        title="Delete subtask"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Comments Thread */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2">Comments & Discussion</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto mb-3">
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
                      <p className="text-slate-700">{c.message}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add note or question..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
                />
                <button
                  type="submit"
                  disabled={commentLoading || !commentText.trim()}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
