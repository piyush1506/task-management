const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args)).catch(() => globalThis.fetch(...args));

const BASE_URL = 'http://localhost:5000/api';

async function runDemoWorkflowTest() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING COLLEGE PRESENTATION DEMO WORKFLOW TEST');
  console.log('======================================================\n');

  try {
    // Step 1: Health check
    console.log('▶ Step 1: Verifying Server & Atlas DB Health...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    console.log('  Health:', health.success ? 'ONLINE' : 'OFFLINE', '| DB:', health.database);
    if (!health.success || health.database !== 'connected') {
      throw new Error('Server or database is not connected');
    }

    // Step 2: Log in as Admin
    console.log('\n▶ Step 2: Admin Login (admin@worksphere.com)...');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@worksphere.com', password: 'Admin@123' }),
    });
    const adminAuth = await adminLoginRes.json();
    if (!adminAuth.success || !adminAuth.token) {
      throw new Error('Admin login failed: ' + adminAuth.message);
    }
    const adminToken = adminAuth.token;
    console.log(`  Admin Logged In: ${adminAuth.user.name} (${adminAuth.user.role})`);

    // Step 3: Admin Dashboard Statistics
    console.log('\n▶ Step 3: Fetching Admin Dashboard Statistics...');
    const dashRes = await fetch(`${BASE_URL}/dashboard/admin`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dashData = await dashRes.json();
    console.log('  Projects:', dashData.stats.totalProjects);
    console.log('  Employees:', dashData.stats.totalEmployees);
    console.log('  Total Tasks:', dashData.stats.totalTasks);
    console.log('  Completed Tasks:', dashData.stats.completedTasks);

    // Step 4: Employee List
    console.log('\n▶ Step 4: Fetching Employee Directory...');
    const empRes = await fetch(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const empData = await empRes.json();
    const rahul = empData.employees.find((e) => e.email === 'rahul@worksphere.com');
    if (!rahul) throw new Error('Rahul Sharma not found in database');
    console.log(`  Found Employee: ${rahul.name} (${rahul.designation})`);

    // Step 5: Check or Create Project
    console.log('\n▶ Step 5: Verifying / Creating Project "College Website Development"...');
    const projRes = await fetch(`${BASE_URL}/projects`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const projData = await projRes.json();
    let collegeProject = projData.projects.find((p) => p.title.includes('College Website'));
    if (!collegeProject) {
      const createProjRes = await fetch(`${BASE_URL}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: 'College Website Development',
          description: 'Development of a responsive college website.',
          startDate: new Date().toISOString(),
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          manager: adminAuth.user._id,
          status: 'ACTIVE',
        }),
      });
      const newProj = await createProjRes.json();
      collegeProject = newProj.project;
      console.log('  Created Project:', collegeProject.title);
    } else {
      console.log('  Existing Project verified:', collegeProject.title, '| Progress:', collegeProject.progressPercentage + '%');
    }

    // Step 6 & 7: Create Task "Design Homepage Demo" assigned to Rahul
    console.log('\n▶ Step 6 & 7: Creating Task & Assigning to Rahul Sharma...');
    const createTaskRes = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: `Design Homepage (Run ${Date.now().toString().slice(-4)})`,
        description: 'Design a clean, responsive layout with admissions banner.',
        project: collegeProject._id,
        assignedTo: rahul._id,
        priority: 'HIGH',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'PENDING',
      }),
    });
    const taskResult = await createTaskRes.json();
    if (!taskResult.success) throw new Error('Task creation failed: ' + taskResult.message);
    const createdTask = taskResult.task;
    console.log(`  Task Created: "${createdTask.title}" | Status: ${createdTask.status}`);

    // Step 8: Log out Admin (simulated by dropping admin token)
    console.log('\n▶ Step 8: Admin Logged Out.');

    // Step 9: Log in as Employee (Rahul Sharma)
    console.log('\n▶ Step 9: Employee Login (rahul@worksphere.com)...');
    const empLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul@worksphere.com', password: 'Employee@123' }),
    });
    const empAuth = await empLoginRes.json();
    if (!empAuth.success) throw new Error('Employee login failed');
    const empToken = empAuth.token;
    console.log(`  Employee Logged In: ${empAuth.user.name}`);

    // Step 10: Open My Tasks
    console.log('\n▶ Step 10: Employee Fetching Assigned Tasks...');
    const myTasksRes = await fetch(`${BASE_URL}/tasks`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const myTasksData = await myTasksRes.json();
    const foundTask = myTasksData.tasks.find((t) => t._id === createdTask._id);
    if (!foundTask) throw new Error('Assigned task was not received by Rahul');
    console.log(`  Task Found in Rahul's Inbox: "${foundTask.title}" (${foundTask.status})`);

    // Step 11: Change task status from Pending to In Progress
    console.log('\n▶ Step 11: Updating Task Status: PENDING ➔ IN_PROGRESS...');
    const updateRes = await fetch(`${BASE_URL}/tasks/${createdTask._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    const updateResult = await updateRes.json();
    if (!updateResult.success) throw new Error('Status update failed');
    console.log('  Task status updated successfully to:', updateResult.task.status);

    // Step 12: Re-login as Admin
    console.log('\n▶ Step 12: Admin Re-login to Inspect Updated Dashboard...');
    const reAdminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@worksphere.com', password: 'Admin@123' }),
    });
    const reAdminAuth = await reAdminRes.json();

    // Step 13: Verify updated task status and dashboard statistics
    console.log('\n▶ Step 13: Verifying Real-Time Dashboard Updates...');
    const updatedDashRes = await fetch(`${BASE_URL}/dashboard/admin`, {
      headers: { Authorization: `Bearer ${reAdminAuth.token}` },
    });
    const updatedDash = await updatedDashRes.json();
    console.log('  Updated Total Tasks:', updatedDash.stats.totalTasks);
    console.log('  Updated In-Progress Tasks:', updatedDash.stats.inProgressTasks);
    console.log('  Recent Activity Logged:', updatedDash.recentActivities[0]?.description);

    console.log('\n======================================================');
    console.log('🎉 ALL 13 STEPS OF THE COLLEGE DEMO WORKFLOW PASSED!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Workflow Test Failed:', err.message);
    process.exit(1);
  }
}

runDemoWorkflowTest();

