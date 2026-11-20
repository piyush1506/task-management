import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Clock,
  Calendar,
  User,
  FolderKanban,
  AlertCircle,
  MessageSquare,
  Send,
  History,
  CheckCircle2,
  ListTodo,
  Check,
} from 'lucide-react';

export default function TaskManagementPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const [notification, setNotification] = useState(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [selectedTask, setSelectedTask] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // Subtask management
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [subtaskLoading, setSubtaskLoading] = useState(false);

  // Task Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project: '',
    assignedTo: '',
    priority: 'MEDIUM',
    startDate: new Date().toISOString().split('T')[0],
    deadline: '',
    status: 'PENDING',
  });

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks', {
        params: {
          search,
          status: statusFilter,
          project: projectFilter,
          assignedTo: employeeFilter,
          priority: priorityFilter,
        },
      });
      if (res.data?.success) {
        setTasks(res.data.tasks || []);
      }
    } catch (err) {
      console.error('Fetch tasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [projRes, empRes] = await Promise.all([api.get('/projects'), api.get('/employees')]);
      if (projRes.data?.success) setProjects(projRes.data.projects || []);
      if (empRes.data?.success) setEmployees(empRes.data.employees || []);
    } catch (err) {
      console.warn('Could not load dropdown data:', err.message);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [search, statusFilter, projectFilter, employeeFilter, priorityFilter]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title || !formData.description || !formData.project || !formData.assignedTo || !formData.deadline) {
      setFormError('Please fill in all mandatory fields');
      return;
    }

    setFormLoading(true);
    try {
      const res = await api.post('/tasks', formData);
      if (res.data?.success) {
        showToast('Task created and assigned successfully!');
        setIsCreateOpen(false);
        setFormData({
          title: '',
          description: '',
          project: '',
          assignedTo: '',
          priority: 'MEDIUM',
          startDate: new Date().toISOString().split('T')[0],
          deadline: '',
          status: 'PENDING',
        });
        fetchTasks();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to create task');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      const res = await api.put(`/tasks/${selectedTask._id}`, selectedTask);
      if (res.data?.success) {
        showToast('Task updated successfully!');
        setIsEditOpen(false);
        fetchTasks();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to update task');
    } finally {
      setFormLoading(false);
    }
  };

  const handleQuickStatusChange = async (taskId, newStatus) => {
    try {
      const res = await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      if (res.data?.success) {
        showToast(`Task status updated to ${newStatus}`);
        fetchTasks();
        if (selectedTask && selectedTask._id === taskId) {
          openDetails({ _id: taskId });
        }
      }
    } catch (err) {
      alert('Status change error: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Are you sure you want to delete task "${task.title}"?`)) {
      return;
    }
    try {
      const res = await api.delete(`/tasks/${task._id}`);
      if (res.data?.success) {
        showToast('Task deleted successfully!');
        fetchTasks();
      }
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
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
        // Refresh details modal comments
        openDetails(selectedTask);
      }
    } catch (err) {
      alert('Failed to post comment: ' + (err.response?.data?.message || err.message));
    } finally {
      setCommentLoading(false);
    }
  };

  // Subtask handlers
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

  const handleToggleSubtask = async (subtaskId, currentStatus) => {
    if (!selectedTask) return;

    try {
      const res = await api.patch(`/tasks/${selectedTask._id}/subtasks/${subtaskId}`, {
        isCompleted: !currentStatus,
      });

      if (res.data?.success) {
        setSelectedTask((prev) => ({
          ...prev,
          subtasks: res.data.subtasks,
          status: res.data.task?.status || prev.status,
        }));
        showToast(!currentStatus ? 'Subtask marked complete' : 'Subtask marked incomplete');
        fetchTasks();
      }
    } catch (err) {
      alert('Failed to update subtask');
    }
  };

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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Task Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, assign, filter, and track task progress across all active projects
          </p>
        </div>
        <button
          onClick={() => {
            setFormError('');
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Task
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search tasks by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="OVERDUE">Overdue</option>
            </select>

            {/* Project Filter */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.title}
                </option>
              ))}
            </select>

            {/* Employee Filter */}
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Employees</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Task Title</th>
                <th className="py-3.5 px-4">Project</th>
                <th className="py-3.5 px-4">Assigned To</th>
                <th className="py-3.5 px-4 text-center">Subtasks</th>
                <th className="py-3.5 px-4 text-center">Priority</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Deadline</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    Loading task records...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    No tasks found matching current filters
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const sList = task.subtasks || [];
                  const sTotal = sList.length;
                  const sDone = sList.filter((s) => s.isCompleted).length;
                  const sPercent = sTotal > 0 ? Math.round((sDone / sTotal) * 100) : 0;

                  return (
                  <tr key={task._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{task.title}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{task.description}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800">
                        {task.project?.title || 'Unknown Project'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                          {task.assignedTo?.name?.charAt(0) || 'U'}
                        </div>
                        <span className="text-slate-800">
                          {task.assignedTo?.name || 'Unassigned'}
                        </span>
                      </div>
                    </td>
                    {/* Subtasks Column */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {sTotal === 0 ? (
                        <button
                          onClick={() => openDetails(task)}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-medium cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add subtask</span>
                        </button>
                      ) : (
                        <div
                          onClick={() => openDetails(task)}
                          className="inline-block cursor-pointer group"
                          title="Click to view & check subtasks"
                        >
                          <span
                            className={`text-[11px] font-bold ${
                              sDone === sTotal ? 'text-emerald-600' : 'text-slate-700'
                            }`}
                          >
                            {sDone}/{sTotal} ({sPercent}%)
                          </span>
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1 mx-auto">
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
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {/* Inline Status Dropdown */}
                      <select
                        value={task.status}
                        onChange={(e) => handleQuickStatusChange(task._id, e.target.value)}
                        className={`text-xs font-semibold rounded-full px-2.5 py-0.5 border cursor-pointer focus:outline-none ${
                          task.status === 'COMPLETED'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : task.status === 'IN_PROGRESS'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(task.deadline).toLocaleDateString()}</span>
                        {task.isOverdue && (
                          <span className="text-[10px] text-rose-600 font-bold ml-1">Overdue</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDetails(task)}
                          title="View Details & Comments"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTask({
                              ...task,
                              project: task.project?._id || task.project,
                              assignedTo: task.assignedTo?._id || task.assignedTo,
                            });
                            setFormError('');
                            setIsEditOpen(true);
                          }}
                          title="Edit Task"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task)}
                          title="Delete Task"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Task Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Task">
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {formError}
          </div>
        )}
        <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Task Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Design Homepage"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description *</label>
            <textarea
              required
              rows={2}
              placeholder="Detailed instructions..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Project *</label>
              <select
                required
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assign Employee *</label>
              <select
                required
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Deadline *</label>
              <input
                type="date"
                required
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm"
            >
              {formLoading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Task Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Task Details">
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {formError}
          </div>
        )}
        {selectedTask && (
          <form onSubmit={handleUpdateTask} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Task Title</label>
              <input
                type="text"
                required
                value={selectedTask.title || ''}
                onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Description</label>
              <textarea
                rows={2}
                required
                value={selectedTask.description || ''}
                onChange={(e) =>
                  setSelectedTask({ ...selectedTask, description: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project</label>
                <select
                  value={selectedTask.project || ''}
                  onChange={(e) => setSelectedTask({ ...selectedTask, project: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                >
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assignee</label>
                <select
                  value={selectedTask.assignedTo || ''}
                  onChange={(e) =>
                    setSelectedTask({ ...selectedTask, assignedTo: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                >
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={selectedTask.priority || 'MEDIUM'}
                  onChange={(e) =>
                    setSelectedTask({ ...selectedTask, priority: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={selectedTask.status || 'PENDING'}
                  onChange={(e) => setSelectedTask({ ...selectedTask, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deadline</label>
                <input
                  type="date"
                  value={
                    selectedTask.deadline
                      ? new Date(selectedTask.deadline).toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) =>
                    setSelectedTask({ ...selectedTask, deadline: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm"
              >
                {formLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Task Details Modal with Comments & Audit Activity (Section 8.3) */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={selectedTask ? `Task Details: ${selectedTask.title}` : 'Task Details'}
        maxWidth="max-w-2xl"
      >
        {selectedTask && (
          <div className="space-y-6 text-xs">
            {/* Top Info Banner */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedTask.status} />
                  <PriorityBadge priority={selectedTask.priority} />
                </div>
                <span className="text-slate-500">
                  Project: <strong className="text-slate-800">{selectedTask.project?.title || 'Unknown'}</strong>
                </span>
              </div>

              <p className="text-slate-800 leading-relaxed font-medium">{selectedTask.description}</p>

              <div className="grid grid-cols-2 gap-2 text-slate-500 pt-2 border-t border-slate-200/60 text-[11px]">
                <div>
                  Assigned To: <strong className="text-slate-800">{selectedTask.assignedTo?.name || 'Unassigned'}</strong>
                </div>
                <div>
                  Deadline: <strong className="text-slate-800">{new Date(selectedTask.deadline).toLocaleDateString()}</strong>
                </div>
              </div>
            </div>

            {/* Subtasks & Checklist Section */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-slate-900 text-sm">
                    Subtasks & Checklist (
                    {(selectedTask.subtasks || []).filter((s) => s.isCompleted).length}/
                    {(selectedTask.subtasks || []).length})
                  </h4>
                </div>
                {(selectedTask.subtasks || []).length > 0 && (
                  <span className="text-[11px] font-bold text-slate-500">
                    {Math.round(
                      ((selectedTask.subtasks || []).filter((s) => s.isCompleted).length /
                        (selectedTask.subtasks || []).length) *
                        100
                    )}
                    % Done
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {(selectedTask.subtasks || []).length > 0 && (
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      (selectedTask.subtasks || []).filter((s) => s.isCompleted).length ===
                      (selectedTask.subtasks || []).length
                        ? 'bg-emerald-500'
                        : 'bg-blue-600'
                    }`}
                    style={{
                      width: `${Math.round(
                        ((selectedTask.subtasks || []).filter((s) => s.isCompleted).length /
                          (selectedTask.subtasks || []).length) *
                          100
                      )}%`,
                    }}
                  ></div>
                </div>
              )}

              {/* Add Subtask Form */}
              <form onSubmit={handleAddSubtask} className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Add a new subtask (press Enter to save)..."
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
                  <span>Add</span>
                </button>
              </form>

              {/* Subtasks List */}
              <div className="divide-y divide-slate-100 pt-1">
                {(selectedTask.subtasks || []).length === 0 ? (
                  <p className="text-center py-3 text-slate-400 text-xs italic">
                    No subtasks yet. Add checklist items above to track progress.
                  </p>
                ) : (
                  selectedTask.subtasks.map((st) => (
                    <div
                      key={st._id}
                      className="py-2.5 flex items-center justify-between gap-3 group hover:bg-slate-50/50 px-2 rounded-lg transition-colors"
                    >
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
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <h4 className="font-bold text-slate-900">Task Comments & Discussion</h4>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto mb-3">
                {selectedTask.comments?.length === 0 ? (
                  <p className="p-4 text-center text-slate-400">No comments yet. Start the conversation!</p>
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

              {/* Add Comment Input */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a comment or status update..."
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

            {/* Activity History */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <History className="w-4 h-4 text-slate-500" />
                <h4 className="font-bold text-slate-900">Audit History</h4>
              </div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-36 overflow-y-auto">
                {selectedTask.activities?.length === 0 ? (
                  <p className="p-3 text-center text-slate-400">No activity logged for this task</p>
                ) : (
                  selectedTask.activities?.map((act) => (
                    <div key={act._id} className="p-2.5 flex items-center justify-between text-[11px]">
                      <span className="text-slate-700">{act.description}</span>
                      <span className="text-slate-400">
                        {new Date(act.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

