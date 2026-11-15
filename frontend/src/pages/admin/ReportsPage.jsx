import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  BarChart3,
  Download,
  FolderKanban,
  CheckSquare,
  Users,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('projects');
  const [projectReports, setProjectReports] = useState(null);
  const [taskReports, setTaskReports] = useState(null);
  const [employeeReports, setEmployeeReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [projRes, taskRes, empRes] = await Promise.all([
        api.get('/reports/projects'),
        api.get('/reports/tasks'),
        api.get('/reports/employees'),
      ]);
      if (projRes.data?.success) setProjectReports(projRes.data);
      if (taskRes.data?.success) setTaskReports(taskRes.data);
      if (empRes.data?.success) setEmployeeReports(empRes.data.employees || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Export to CSV Function
  const exportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (activeTab === 'projects') {
      csvContent += 'Project Title,Status,Manager,Total Tasks,Completed Tasks,Progress Percentage,Deadline\n';
      projectReports?.projects?.forEach((p) => {
        csvContent += `"${p.title}","${p.status}","${p.manager}",${p.totalTasks},${p.completedTasks},${p.progressPercentage}%,"${new Date(p.deadline).toLocaleDateString()}"\n`;
      });
    } else if (activeTab === 'tasks') {
      csvContent += 'Task Title,Project,Assigned Employee,Priority,Status,Deadline\n';
      taskReports?.tasks?.forEach((t) => {
        csvContent += `"${t.title}","${t.project?.title || ''}","${t.assignedTo?.name || ''}","${t.priority}","${t.status}","${new Date(t.deadline).toLocaleDateString()}"\n`;
      });
    } else {
      csvContent += 'Employee Name,Department,Designation,Assigned Tasks,Completed Tasks,Pending Tasks,Completion Rate\n';
      employeeReports.forEach((e) => {
        csvContent += `"${e.name}","${e.department}","${e.designation}",${e.assignedTasks},${e.completedTasks},${e.pendingTasks},${e.completionPercentage}%\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WorkSphere_${activeTab}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Reports & Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate and export performance metrics for projects, task velocity, and personnel
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow transition-all self-start sm:self-auto"
        >
          <Download className="w-4 h-4" /> Export CSV Report
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'projects'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FolderKanban className="w-4 h-4" /> Project Reports
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'tasks'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckSquare className="w-4 h-4" /> Task Reports
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'employees'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" /> Employee Performance
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Compiling report data...</div>
      ) : activeTab === 'projects' ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Projects</span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{projectReports?.summary?.total || 0}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Active</span>
              <p className="text-2xl font-extrabold text-emerald-800 mt-1">{projectReports?.summary?.active || 0}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 shadow-2xs">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Completed</span>
              <p className="text-2xl font-extrabold text-blue-800 mt-1">{projectReports?.summary?.completed || 0}</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-2xs">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">On Hold</span>
              <p className="text-2xl font-extrabold text-amber-800 mt-1">{projectReports?.summary?.onHold || 0}</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Project Title</th>
                    <th className="py-3.5 px-4">Manager</th>
                    <th className="py-3.5 px-4 text-center">Tasks</th>
                    <th className="py-3.5 px-4 text-center">Completed</th>
                    <th className="py-3.5 px-4">Progress</th>
                    <th className="py-3.5 px-4">Deadline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {projectReports?.projects?.map((proj) => (
                    <tr key={proj._id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{proj.title}</td>
                      <td className="py-3.5 px-4">{proj.manager}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">{proj.totalTasks}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600">{proj.completedTasks}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${proj.progressPercentage}%` }}
                            ></div>
                          </div>
                          <span className="font-bold text-blue-600">{proj.progressPercentage}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(proj.deadline).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'tasks' ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tasks</span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{taskReports?.summary?.total || 0}</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-2xs">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pending</span>
              <p className="text-2xl font-extrabold text-amber-800 mt-1">{taskReports?.summary?.pending || 0}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 shadow-2xs">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">In Progress</span>
              <p className="text-2xl font-extrabold text-blue-800 mt-1">{taskReports?.summary?.inProgress || 0}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Completed</span>
              <p className="text-2xl font-extrabold text-emerald-800 mt-1">{taskReports?.summary?.completed || 0}</p>
            </div>
            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 shadow-2xs">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Overdue</span>
              <p className="text-2xl font-extrabold text-rose-800 mt-1">{taskReports?.summary?.overdue || 0}</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Task Title</th>
                    <th className="py-3.5 px-4">Project</th>
                    <th className="py-3.5 px-4">Assigned To</th>
                    <th className="py-3.5 px-4 text-center">Priority</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4">Deadline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {taskReports?.tasks?.map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{t.title}</td>
                      <td className="py-3.5 px-4">{t.project?.title || 'Unknown'}</td>
                      <td className="py-3.5 px-4">{t.assignedTo?.name || 'Unassigned'}</td>
                      <td className="py-3.5 px-4 text-center">{t.priority}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-blue-600">{t.status}</td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(t.deadline).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Employee Performance Tab */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Employee Name</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Designation</th>
                  <th className="py-3.5 px-4 text-center">Assigned</th>
                  <th className="py-3.5 px-4 text-center">Completed</th>
                  <th className="py-3.5 px-4 text-center">Pending</th>
                  <th className="py-3.5 px-4">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {employeeReports.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{emp.name}</td>
                    <td className="py-3.5 px-4">{emp.department}</td>
                    <td className="py-3.5 px-4">{emp.designation}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">{emp.assignedTasks}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-600">{emp.completedTasks}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-amber-600">{emp.pendingTasks}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-600 h-2 rounded-full"
                            style={{ width: `${emp.completionPercentage}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-emerald-700">{emp.completionPercentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

