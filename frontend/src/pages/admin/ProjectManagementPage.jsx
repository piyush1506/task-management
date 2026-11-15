import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  PlusCircle,
  TrendingUp,
} from 'lucide-react';

export default function ProjectManagementPage() {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [notification, setNotification] = useState(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  const [selectedProject, setSelectedProject] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Project Form
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    deadline: '',
    manager: '',
    status: 'ACTIVE',
  });

  // Task Form inside project details
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'MEDIUM',
    deadline: '',
    status: 'PENDING',
  });

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects', {
        params: { search, status: statusFilter },
      });
      if (res.data?.success) {
        setProjects(res.data.projects || []);
      }
    } catch (err) {
      console.error('Fetch projects error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchManagersAndEmployees = async () => {
    try {
      const res = await api.get('/employees');
      if (res.data?.success) {
        setEmployees(res.data.employees || []);
      }
    } catch (err) {
      console.warn('Could not load employees for dropdown:', err.message);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [search, statusFilter]);

  useEffect(() => {
    fetchManagersAndEmployees();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title || !formData.description || !formData.deadline || !formData.manager) {
      setFormError('Please complete all mandatory fields');
      return;
    }

    if (new Date(formData.deadline) < new Date(formData.startDate)) {
      setFormError('Deadline cannot be earlier than start date');
      return;
    }

    setFormLoading(true);
    try {
      const res = await api.post('/projects', formData);
      if (res.data?.success) {
        showToast('Project created successfully!');
        setIsCreateOpen(false);
        setFormData({
          title: '',
          description: '',
          startDate: new Date().toISOString().split('T')[0],
          deadline: '',
          manager: '',
          status: 'ACTIVE',
        });
        fetchProjects();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to create project');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      const res = await api.put(`/projects/${selectedProject._id}`, selectedProject);
      if (res.data?.success) {
        showToast('Project updated successfully!');
        setIsEditOpen(false);
        fetchProjects();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to update project');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteProject = async (proj) => {
    if (
      !window.confirm(
        `Are you sure you want to delete project "${proj.title}"? All associated tasks will also be deleted.`
      )
    ) {
      return;
    }
    try {
      const res = await api.delete(`/projects/${proj._id}`);
      if (res.data?.success) {
        showToast('Project deleted successfully!');
        fetchProjects();
      }
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const openDetails = async (proj) => {
    try {
      const res = await api.get(`/projects/${proj._id}`);
      if (res.data?.success) {
        setSelectedProject(res.data.project);
        setIsDetailsOpen(true);
      }
    } catch (err) {
      alert('Could not load project details');
    }
  };

  const handleCreateTaskFromProject = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!taskFormData.title || !taskFormData.description || !taskFormData.assignedTo || !taskFormData.deadline) {
      setFormError('Please fill in all task fields');
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        ...taskFormData,
        project: selectedProject._id,
      };
      const res = await api.post('/tasks', payload);
      if (res.data?.success) {
        showToast('Task added to project successfully!');
        setIsCreateTaskOpen(false);
        setTaskFormData({
          title: '',
          description: '',
          assignedTo: '',
          priority: 'MEDIUM',
          deadline: '',
          status: 'PENDING',
        });
        // Refresh project details and list
        openDetails(selectedProject);
        fetchProjects();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to create task');
    } finally {
      setFormLoading(false);
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Project Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track project lifecycle, deadlines, task completion percentages, and managers
          </p>
        </div>
        <button
          onClick={() => {
            setFormError('');
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by project name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PLANNING">Planning</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
      </div>

      {/* Projects Grid / Cards */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
          No projects found matching the criteria
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => (
            <div
              key={proj._id}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                {/* Status & Actions */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <StatusBadge status={proj.status} />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openDetails(proj)}
                      title="View Details & Tasks"
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProject({
                          ...proj,
                          manager: proj.manager?._id || proj.manager,
                        });
                        setFormError('');
                        setIsEditOpen(true);
                      }}
                      title="Edit Project"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProject(proj)}
                      title="Delete Project"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 tracking-tight mb-1">
                  {proj.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4">{proj.description}</p>
              </div>

              <div className="space-y-4 pt-3 border-t border-slate-100">
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-600">Progress</span>
                    <span className="font-bold text-blue-600">{proj.progressPercentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${proj.progressPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Meta details */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{proj.manager?.name || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>
                      {proj.completedTasks}/{proj.totalTasks} Tasks
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Due: {new Date(proj.deadline).toLocaleDateString()}</span>
                  </div>
                  {proj.isOverdue && (
                    <div className="text-right font-bold text-rose-600">Overdue</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Project">
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {formError}
          </div>
        )}
        <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Project Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Mobile Attendance System"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description *</label>
            <textarea
              required
              rows={3}
              placeholder="Detailed project summary..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              />
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Project Manager *</label>
              <select
                required
                value={formData.manager}
                onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              >
                <option value="">Select Manager</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Project Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              >
                <option value="PLANNING">Planning</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
              </select>
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
              {formLoading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Project Details">
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {formError}
          </div>
        )}
        {selectedProject && (
          <form onSubmit={handleUpdateProject} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={selectedProject.title || ''}
                onChange={(e) =>
                  setSelectedProject({ ...selectedProject, title: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Description</label>
              <textarea
                rows={3}
                required
                value={selectedProject.description || ''}
                onChange={(e) =>
                  setSelectedProject({ ...selectedProject, description: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={
                    selectedProject.startDate
                      ? new Date(selectedProject.startDate).toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) =>
                    setSelectedProject({ ...selectedProject, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deadline</label>
                <input
                  type="date"
                  value={
                    selectedProject.deadline
                      ? new Date(selectedProject.deadline).toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) =>
                    setSelectedProject({ ...selectedProject, deadline: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Manager</label>
                <select
                  value={selectedProject.manager || ''}
                  onChange={(e) =>
                    setSelectedProject({ ...selectedProject, manager: e.target.value })
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
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={selectedProject.status || 'ACTIVE'}
                  onChange={(e) =>
                    setSelectedProject({ ...selectedProject, status: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                >
                  <option value="PLANNING">Planning</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                </select>
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

      {/* Project Details Modal (Section 7.3) */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={selectedProject ? `Project Details: ${selectedProject.title}` : 'Project Details'}
        maxWidth="max-w-3xl"
      >
        {selectedProject && (
          <div className="space-y-6 text-xs">
            {/* Top Info Banner */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <StatusBadge status={selectedProject.status} />
                <span className="text-slate-500">
                  Manager: <strong className="text-slate-800">{selectedProject.manager?.name || 'Unassigned'}</strong>
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed">{selectedProject.description}</p>
              <div className="flex items-center gap-6 mt-3 text-slate-500">
                <span>Start: {new Date(selectedProject.startDate).toLocaleDateString()}</span>
                <span>Deadline: {new Date(selectedProject.deadline).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Progress & Stat Cards */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Total Tasks</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedProject.stats?.totalTasks || 0}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <p className="text-[10px] font-semibold text-emerald-600 uppercase">Completed</p>
                <p className="text-lg font-bold text-emerald-800 mt-0.5">
                  {selectedProject.stats?.completedTasks || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-[10px] font-semibold text-blue-600 uppercase">In Progress</p>
                <p className="text-lg font-bold text-blue-800 mt-0.5">
                  {selectedProject.stats?.inProgressTasks || 0}
                </p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                <p className="text-[10px] font-semibold text-indigo-600 uppercase">Progress</p>
                <p className="text-lg font-bold text-indigo-800 mt-0.5">
                  {selectedProject.stats?.progressPercentage || 0}%
                </p>
              </div>
            </div>

            {/* Task list inside project with Add Task Button */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-900">Project Tasks</h4>
                <button
                  onClick={() => {
                    setFormError('');
                    setIsCreateTaskOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Add Task
                </button>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                {selectedProject.tasks?.length === 0 ? (
                  <p className="p-4 text-center text-slate-400">No tasks created yet for this project</p>
                ) : (
                  selectedProject.tasks?.map((t) => (
                    <div
                      key={t._id}
                      className="p-3 flex items-center justify-between bg-white hover:bg-slate-50"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{t.title}</p>
                        <p className="text-[11px] text-slate-400">
                          Assigned to: {t.assignedTo?.name || 'Unassigned'} • Due:{' '}
                          {new Date(t.deadline).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={t.priority} />
                        <StatusBadge status={t.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Task Directly to Project Modal */}
      <Modal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        title={`Add Task to "${selectedProject?.title}"`}
      >
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {formError}
          </div>
        )}
        <form onSubmit={handleCreateTaskFromProject} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Task Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Design Landing Page"
              value={taskFormData.title}
              onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description *</label>
            <textarea
              rows={2}
              required
              placeholder="Task instructions..."
              value={taskFormData.description}
              onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assign Employee *</label>
              <select
                required
                value={taskFormData.assignedTo}
                onChange={(e) => setTaskFormData({ ...taskFormData, assignedTo: e.target.value })}
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
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={taskFormData.priority}
                onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Deadline *</label>
              <input
                type="date"
                required
                value={taskFormData.deadline}
                onChange={(e) => setTaskFormData({ ...taskFormData, deadline: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={taskFormData.status}
                onChange={(e) => setTaskFormData({ ...taskFormData, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              >
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateTaskOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm"
            >
              {formLoading ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

