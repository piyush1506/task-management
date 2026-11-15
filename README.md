# WorkSphere – Smart Project & Task Management System

WorkSphere is a full-stack web application designed for modern project coordination, task tracking, employee performance monitoring, and team collaboration. Developed as a comprehensive BCA Final Year College Project.

---

## 🚀 Key Highlights & Features

- **Role-Based Access Control (RBAC):**
  - **Admin / Project Manager:** Full control over employee accounts, project lifecycle, task assignment, progress calculation, and system-wide reports.
  - **Employee:** Personalized dashboard to track assigned tasks, update real-time progress, view project details, and add comments.
- **Dynamic Dashboards:** Real-time statistics, task distribution charts (Recharts), and recent audit activity logs.
- **Automated Project Progress:** Dynamically calculated based on verified completed tasks:
  $$\text{Progress Percentage} = \left(\frac{\text{Completed Tasks}}{\text{Total Tasks}}\right) \times 100$$
- **Reports & Data Export:** Filterable project, task, and employee performance reports with client-side **CSV export**.
- **RESTful Architecture:** Secure JWT authentication, password hashing with bcrypt, schema validation, and structured error handling.
- **Responsive UI:** Clean SaaS design built with Tailwind CSS, Lucide icons, and responsive layouts for mobile, tablet, and desktop.
- **Persistent Database:** Connected directly to live MongoDB Atlas with automatic embedded fallback.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React (Vite), Tailwind CSS, Lucide React, Recharts, Axios, React Router v6 |
| **Backend** | Node.js, Express.js, JWT, bcryptjs, Mongoose, express-validator |
| **Database** | MongoDB Atlas (`cluster0.3ndsnxh.mongodb.net`) |

---

## 📁 Project Structure

```
p2/
├── backend/
│   ├── config/          # Database connection & configurations (MongoDB Atlas)
│   ├── controllers/     # Route controllers (Auth, Dashboard, Employee, Project, Task, Report, Notification)
│   ├── middleware/      # Auth & RBAC middleware (JWT protect, role authorization)
│   ├── models/          # Mongoose data models (User, Project, Task, Comment, ActivityLog, Notification)
│   ├── routes/          # RESTful route definitions
│   ├── seeders/         # Database seeding script for sample demo data
│   ├── scripts/         # Automated test scripts (e.g. test-demo-workflow.js)
│   ├── server.js        # Express application entry point
│   ├── .env             # Environment variables (configured with MongoDB Atlas)
│   ├── .env.example     # Environment variable documentation
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable UI components (Navbar, Sidebar, Modal, Badge, etc.)
│   │   ├── context/     # React Context (AuthContext for session and RBAC)
│   │   ├── layouts/     # Admin and Employee dashboard layouts
│   │   ├── pages/       # Login, Admin Pages (Dashboard, Employees, Projects, Tasks, Reports), Employee Pages
│   │   ├── services/    # Axios HTTP client with JWT interceptor
│   │   ├── App.jsx      # Protected routing configuration
│   │   └── main.jsx
│   ├── .env             # Frontend API URL configuration
│   └── package.json
└── README.md
```

---

## ⚙️ Installation & Running the Application

### 1. Backend Setup
```bash
cd backend
npm install
npm run seed     # (Optional) Reset/Populate initial Admin and sample demo records
npm start        # Start backend server on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev      # Start frontend Vite dev server on http://localhost:5173
```

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Admin / Project Manager** | `admin@worksphere.com` | `Admin@123` |
| **Employee** | `rahul@worksphere.com` | `Employee@123` |
| **Employee** | `priya@worksphere.com` | `Employee@123` |
| **Employee** | `amit@worksphere.com` | `Employee@123` |

*(The Login page includes **Quick Fill Demo** buttons to fill these credentials in one click).*

---

## 🎓 BCA College Presentation Demonstration Workflow

You can demonstrate the entire end-to-end functionality live in under 5 minutes:

1. **Open Login Page**: Visit `http://localhost:5173/login`.
2. **Log in as Admin**: Click **Admin Demo** and sign in.
3. **Admin Dashboard**: Highlight dynamic statistics cards, Task Status distribution (Pie Chart), and Project Progress (Bar Chart).
4. **Employee Directory**: Navigate to **Employees**, view team members, toggle an account status or register a new employee.
5. **Create Project**: Navigate to **Projects**, create a new project with title, description, manager, and deadline.
6. **Assign Task**: Navigate to **Tasks**, create a new task (e.g., "Design Homepage") and assign it to **Rahul Sharma**.
7. **Switch to Employee**: Log out and click **Employee Demo** (`rahul@worksphere.com`).
8. **Employee Dashboard**: View personal assigned tasks, project deadline, and update task status from **Pending** to **In Progress** or **Completed**.
9. **Add Comment**: Open task details and post a progress comment.
10. **Re-login as Admin**: Switch back to Admin to demonstrate that the task status, completion percentage, and audit log updated in real time!
