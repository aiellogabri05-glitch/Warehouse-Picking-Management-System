# 📦 Warehouse Picking Management System

> Local warehouse operations management system designed to coordinate picking activities, operators, workstations and inspection workflows from a central control system.

---

## 📌 Overview

**Warehouse Picking Management System** is a web-based application designed to replace fragmented manual workflows with a centralized digital system for managing warehouse picking operations.

The system is built around a **central server** that coordinates multiple warehouse workstations ("ports") through a local network.

Each port can have its own active tasks, operators and products, while the central dashboard provides an overview of the entire warehouse.

The application is currently being developed for **local/LAN usage** and is **not yet considered production-ready**.

---

# 🎯 Main Goals

The project aims to provide:

- Centralized warehouse task management
- Real-time visibility of all warehouse ports
- Operator-oriented task interfaces
- Product-level picking and inspection tracking
- Multiple order and operation types
- Operator assignment and progress tracking
- Problem reporting and resolution
- Excel-based task importing
- Real-time synchronization between clients
- Automatic task completion
- A foundation for future multi-PC warehouse deployment

---

# 🏗️ Architecture

The application uses a centralized architecture with **one server managing the entire warehouse**.

```text
                         ┌─────────────────────────┐
                         │      CENTRAL SERVER      │
                         │                         │
                         │ Node.js + Express       │
                         │ SQLite                  │
                         │ WebSocket               │
                         │                         │
                         └────────────┬────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
              ┌──────────┐      ┌──────────┐      ┌──────────┐
              │ Port 101 │      │ Port 102 │      │ Port ... │
              │ Browser  │      │ Browser  │      │ Browser  │
              └──────────┘      └──────────┘      └──────────┘
```

There is **one central server**, not one server per port.

All connected warehouse clients communicate with the same backend and database.

---

# 🧰 Technology Stack

| Technology | Purpose |
|---|---|
| Node.js | Application runtime |
| Express | HTTP server and REST API |
| SQLite | Local database |
| better-sqlite3 | SQLite database interface |
| WebSocket (`ws`) | Real-time communication |
| HTML | Frontend structure |
| CSS | Frontend styling |
| JavaScript | Frontend logic |
| XLSX | Excel file processing |
| Multer | File upload handling |
| Git | Version control |
| GitHub | Remote repository |

The frontend is currently served directly by Express.

There is currently **no separate frontend framework**.

---

# 📁 Project Structure

```text
warehouse-Picking-Management-System/
│
├── database/
│   └── picking.db
│
├── public/
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   ├── manager.html
│   ├── port.html
│   ├── port.js
│   └── port_backup.js
│
├── importers/
│   └── amazonParser.js
│
├── database.js
├── server.js
├── package.json
├── package-lock.json
│
├── node_modules/
│
└── uploads/
```

### Runtime / local files

The following are local runtime files and should not be committed to Git:

```text
node_modules/
database/picking.db
uploads/
```

Dependencies can be restored with:

```powershell
npm install
```

---

# 🖥️ Application Interfaces

The application currently provides two main operational interfaces:

```text
Dashboard
Port Interface
```

---

# 📊 Dashboard

The main dashboard is available at:

```text
/
```

Example:

```text
http://localhost:3000/
```

The dashboard provides a global overview of the warehouse.

It displays:

- Warehouse ports
- Active task counts
- Task states
- Port status
- Task information
- Problems
- Problem counts
- Task progress
- Real-time updates

Port cards are clickable and open the corresponding port interface.

---

# 🚪 Warehouse Ports

The current warehouse configuration contains eight ports:

```text
101
102
103
104
105
106
107
108
```

Each port has its own URL:

```text
/port/101
/port/102
/port/103
/port/104
/port/105
/port/106
/port/107
/port/108
```

Example:

```text
http://localhost:3000/port/101
```

---

# 👷 Port Interface

Each port has an operator-oriented interface.

The port page displays the active tasks assigned to that port.

Task information includes:

- Order number
- Order type
- Operation type
- Task status
- Responsible person
- Operators
- Priority
- Estimated time
- Progress
- Products
- Quantities
- Boxes
- Pieces per box
- Product status
- Problems

Completed and cancelled tasks are removed from the active port interface.

---

# 📦 Order Types

The system currently supports four order types:

| Order Type | Code |
|---|---|
| B2B | `B2B` |
| Kosice | `KOSICE` |
| Amazon FBA | `AMAZON_FBA` |
| Other | `OTHER` |

---

# ⚙️ Operation Types

The system currently supports:

| Operation | Code |
|---|---|
| Inspection | `INSPECTION` |
| Single Pick List | `SINGLE_PICK_LIST` |
| Generic | `GENERIC` |

---

# 📋 Business Rules

## Amazon FBA

Amazon FBA orders must always use:

```text
Order Type:
AMAZON_FBA

Operation Type:
INSPECTION
```

The backend enforces this rule.

Amazon FBA cannot currently be created as:

```text
SINGLE_PICK_LIST
```

or:

```text
GENERIC
```

---

## B2B

B2B orders can use different workflows depending on the actual warehouse process.

Currently supported operation types include:

```text
INSPECTION
SINGLE_PICK_LIST
```

The complete B2B workflow is still under development and will be based on the real warehouse process and the actual B2B workbook structure.

---

## Kosice

Kosice orders are represented as:

```text
KOSICE
```

The operation type depends on the real warehouse workflow.

The system does **not** automatically assume that every Kosice order is a Single Pick List.

---

# 🔍 Inspection Workflow

Inspection is currently the most developed operational workflow.

An Inspection task can contain:

- Operator assignments
- Product IDs
- SKU FBA
- EAN
- Product names
- Pieces per box
- Number of boxes
- Quantity
- Notes
- Item status

Example:

```text
INSPECTION TASK
│
├── OPERATORE 1
│   ├── Product A → COMPLETED
│   ├── Product B → PENDING
│   └── Product C → PENDING
│
├── OPERATORE 2
│   └── Product D → COMPLETED
│
└── Progress
    └── 2 / 4 completed
```

Products are tracked individually.

---

# 📥 Amazon Excel Import

The project contains a dedicated Amazon parser:

```text
importers/amazonParser.js
```

The parser converts Amazon Excel data into the application's internal task structure.

The parser currently handles:

- Order Number
- Responsible
- Number of Operators
- Operators
- Product ID
- SKU FBA
- Number of pieces per box
- Number of boxes
- QTY to send
- Note
- EAN
- Name of Product

Rows containing:

```text
TOTALE
```

are ignored.

---

# 🧪 Amazon Parser Validation

The parser has been tested against the existing Amazon workbook structure.

A real order was successfully parsed with:

```text
Order:
40002297406

Responsible:
Jonathan

Operators:
OPERATORE 1
OPERATORE 2
OPERATORE 3
```

The parser successfully extracted the real product rows while ignoring total rows.

---

# 📊 Task Management

Tasks currently support the following states:

```text
PENDING
IN_PROGRESS
PROBLEM
COMPLETED
CANCELLED
```

Task information can include:

- Port
- Order number
- Order type
- Operation type
- Title
- Description
- Priority
- Estimated minutes
- Responsible
- Operators
- Items
- Timestamps
- Problem information

---

# 👷 Operator Management

Operators are stored separately from the main task.

This allows the system to track:

- Assigned operators
- Operator status
- Operator progress
- Assigned items
- Operator completion

Operators can have their own task items.

Example:

```text
TASK
│
├── OPERATORE 1
│   ├── Item 1
│   ├── Item 2
│   └── Item 3
│
└── OPERATORE 2
    ├── Item 4
    └── Item 5
```

---

# 📦 Item-Level Progress

Products/items are tracked individually.

Current item states:

```text
PENDING
COMPLETED
```

When an item is completed:

1. The item status is updated.
2. The completion timestamp is recorded.
3. Operator progress is recalculated.
4. Task progress is recalculated.
5. WebSocket events are broadcast.
6. Connected interfaces are updated.

---

# ✅ Automatic Task Completion

The system automatically completes a task when all of its items are completed.

Example:

```text
Item 1 → COMPLETED
Item 2 → COMPLETED
Item 3 → COMPLETED
        ↓
Task → COMPLETED
```

When this happens:

- All task operators are marked as completed.
- Task items are marked as completed.
- The task is marked `COMPLETED`.
- The task disappears from the active port interface.

---

# 🚨 Problem Management

The system includes a complete problem workflow.

```text
TASK
 │
 ▼
REPORT PROBLEM
 │
 ▼
PROBLEM
 │
 ▼
TAKE IN CHARGE
 │
 ▼
PROBLEM IN PROGRESS
 │
 ▼
RESOLVE PROBLEM
 │
 ▼
PROBLEM RESOLVED
```

A problem stores:

- Problem type
- Problem description
- Problem status
- Assigned operator
- Assignment timestamp
- Resolution timestamp

---

# 🟠 Problem Assignment

When a problem is reported:

```text
problem_status = OPEN
```

The dashboard displays the problem and allows the problem to be taken in charge.

The manager can select the operator responsible for handling the problem.

The system then stores:

```text
problem_status = IN_PROGRESS
problem_assigned_to = operator
problem_assigned_at = timestamp
```

---

# 🟢 Problem Resolution

When the problem is resolved:

```text
problem_status = RESOLVED
```

The system records:

```text
problem_resolved_at
```

The task state is then recalculated.

### If unfinished items remain

```text
PROBLEM
   ↓
RESOLVED
   ↓
IN_PROGRESS
```

The task remains active.

### If all items are already completed

```text
PROBLEM
   ↓
RESOLVED
   ↓
COMPLETED
```

The task is completed and disappears from the active port interface.

---

# 📡 WebSocket / Real-Time Communication

The application uses WebSocket to synchronize connected clients.

Current event types include:

```text
TASK_CREATED
TASK_IMPORTED
TASK_ITEM_UPDATED
TASK_STATUS_UPDATED
TASK_PROBLEM
TASK_PROBLEM_UPDATED
TASK_PROBLEM_TAKEN
TASK_PROBLEM_RESOLVED
```

The objective is to allow the dashboard and port interfaces to update in real time without requiring manual page refreshes.

---

# 🗄️ Database

The application uses SQLite through `better-sqlite3`.

Main tables:

```text
ports
tasks
task_operators
task_items
```

Database relationship:

```text
PORT
 │
 └── TASK
      │
      ├── TASK OPERATORS
      │
      └── TASK ITEMS
             │
             └── OPERATOR
```

The database is local to the central server.

---

# 🔗 REST API

## Ports

```http
GET /api/ports
GET /api/ports/:number
GET /api/ports/:number/tasks
```

## Tasks

```http
GET /api/tasks
POST /api/tasks
POST /api/tasks/import
POST /api/tasks/import/amazon
DELETE /api/tasks/:id
PATCH /api/tasks/:id/status
```

## Task Items

```http
PATCH /api/task-items/:id/status
```

## Problems

```http
PATCH /api/tasks/:id/problem
POST /api/tasks/:id/problem/take
POST /api/tasks/:id/problem/resolve
```

---

# 🛠️ Installation

## Requirements

The project requires:

- Node.js
- npm
- Git

Verify Node.js:

```powershell
node --version
```

Verify npm:

```powershell
npm --version
```

Verify Git:

```powershell
git --version
```

---

# 📥 Clone Repository

Clone the repository:

```powershell
git clone <repository-url>
```

Enter the project directory:

```powershell
cd warehouse-Picking-Management-System
```

Install dependencies:

```powershell
npm install
```

---

# ▶️ Start Application

Run:

```powershell
node server.js
```

The application runs on:

```text
http://localhost:3000
```

Open the dashboard:

```text
http://localhost:3000
```

---

# 🌐 LAN Deployment

The final architecture is designed for one central warehouse PC.

Example:

```text
Central Server
192.168.1.100:3000
```

Other warehouse PCs should connect using:

```text
http://192.168.1.100:3000
```

They should **not** use:

```text
http://localhost:3000
```

because `localhost` always refers to the computer currently being used.

---

# 💻 Multi-PC Architecture

The intended final setup is:

```text
                       CENTRAL SERVER
                     192.168.x.x:3000
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
         PC 101           PC 102           PC 103
         Browser          Browser          Browser
            │                │                │
            └────────────────┼────────────────┘
                             │
                         WebSocket
```

All clients communicate with:

- The same backend
- The same database
- The same WebSocket server

The central server is the single source of truth for warehouse task data.

---

# 🌿 Git Workflow

The project uses Git and GitHub for version control.

Check repository status:

```powershell
git status
```

Add changes:

```powershell
git add .
```

Commit changes:

```powershell
git commit -m "Description of changes"
```

Push changes:

```powershell
git push
```

Before moving development to another computer:

```powershell
git status
git push
```

On another computer:

```powershell
git pull
```

---

# 🔄 Recommended Development Workflow

Every feature should follow this process:

```text
PLAN
  ↓
IMPLEMENT
  ↓
TEST
  ↓
FIX
  ↓
VERIFY DATABASE
  ↓
VERIFY FRONTEND
  ↓
VERIFY REALTIME
  ↓
VERIFY REAL WORKFLOW
  ↓
UPDATE ROADMAP
  ↓
COMMIT
  ↓
PUSH TO GITHUB
```

---

# ⚠️ Development Rules

## Do not commit the local database

Do not commit:

```text
database/picking.db
```

The database contains local runtime data.

---

## Do not commit node_modules

Do not commit:

```text
node_modules/
```

Dependencies can be restored with:

```powershell
npm install
```

---

## Do not commit temporary repair scripts

Temporary scripts created for one-time database repairs or testing should be deleted after use.

Example:

```text
fix-task-4.js
```

---

## Do not modify multiple systems unnecessarily

When developing a new feature:

1. Modify the backend.
2. Test the backend.
3. Modify the frontend.
4. Test the frontend.
5. Test WebSocket behavior.
6. Verify the database.
7. Test the complete workflow.
8. Commit the feature.

Existing working functionality should not be changed unless required by the new feature.

---

# 🔐 Security

The application is currently intended for controlled local/LAN use.

Authentication and authorization are not yet implemented as a complete production system.

Future versions should include:

- User authentication
- Operator accounts
- Manager accounts
- Roles
- Permissions
- Protected API endpoints
- Audit logging
- Secure session/token handling

---

# 🧪 Testing Strategy

The system should eventually be tested at three levels.

## Backend Testing

Test:

- API endpoints
- Database operations
- Validation
- Task state changes
- Item state changes
- Operator state changes
- Problem state changes
- Automatic completion
- Invalid requests
- Edge cases

---

## Frontend Testing

Test:

- Dashboard
- Port interface
- Buttons
- Modals
- Task creation
- Task deletion
- Progress display
- Item completion
- Problem reporting
- Problem assignment
- Problem resolution
- Task visibility
- Real-time updates

---

## End-to-End Testing

Test complete warehouse workflows:

```text
Create Task
    ↓
Assign Port
    ↓
Assign Operators
    ↓
Start Task
    ↓
Pick / Inspect
    ↓
Complete Items
    ↓
Update Progress
    ↓
Report Problem if required
    ↓
Take Problem in Charge
    ↓
Resolve Problem
    ↓
Continue Task
    ↓
Complete All Items
    ↓
Complete Task
```

---

# 🚧 Current Status

## Completed

- Central server architecture
- Node.js backend
- Express API
- SQLite database
- Ports 101–108
- Dashboard
- Port interface
- Task creation
- Task deletion
- Task status management
- Item status management
- Operator assignment infrastructure
- Amazon FBA workflow
- Amazon Excel parser
- Inspection import
- Product-level progress
- Automatic task completion
- Problem reporting
- Problem assignment
- Problem resolution
- WebSocket updates
- Git/GitHub workflow

## In Development

- B2B workflow
- Kosice workflow
- Multi-operator workflow refinement
- Manager / Control Center
- History and audit
- Authentication
- LAN deployment
- Production reliability
- Extended testing

---

# 📌 Project Development Philosophy

The system is being developed incrementally.

The priority is:

```text
1. Correct warehouse workflow
2. Reliable backend
3. Correct database state
4. Clear operator interface
5. Real-time synchronization
6. Validation
7. Testing
8. Production deployment
```

A feature should not be considered complete simply because the UI works.

The complete workflow must also be verified through:

```text
Frontend
   +
Backend
   +
Database
   +
WebSocket
   +
Real warehouse process
```

---

# 🗺️ Roadmap

The complete development roadmap is maintained separately in:

```text
ROADMAP.md
```

The roadmap tracks:

- Completed phases
- Current development
- Next objectives
- Future features
- Testing
- Production preparation

---

# 📦 Project Status

```text
🟢 Core Platform          COMPLETE
🟢 Database               COMPLETE
🟢 Backend                COMPLETE
🟢 Dashboard              COMPLETE
🟢 Port Interface         COMPLETE
🟢 Inspection             COMPLETE
🟢 Problem Management     COMPLETE
🟢 WebSocket              COMPLETE

🟡 B2B                    NEXT
🟡 Kosice                 FUTURE
🟡 Multi-Operator         IN PROGRESS
🟡 Manager                FUTURE
🟡 History / Audit        FUTURE
🟡 Authentication         FUTURE
🟡 LAN Deployment         FUTURE
🟡 Extended Testing       IN PROGRESS

🔴 Production             NOT READY
```

---

# 🎯 Current Development Target

The next major development target is:

```text
B2B WORKFLOW
```

The planned sequence is:

```text
B2B ANALYSIS
      ↓
B2B DATA MODEL
      ↓
B2B INSPECTION
      ↓
B2B SINGLE PICK LIST
      ↓
B2B TESTING
      ↓
KOSICE WORKFLOW
      ↓
MULTI-OPERATOR REFINEMENT
      ↓
MANAGER / CONTROL CENTER
      ↓
HISTORY / AUDIT
      ↓
AUTHENTICATION
      ↓
LAN DEPLOYMENT
      ↓
PRODUCTION READINESS
```

---

# 📚 Documentation

Main project documentation:

```text
README.md
ROADMAP.md
```

`README.md` describes:

- Project purpose
- Architecture
- Technologies
- Current functionality
- Installation
- API
- Development rules
- Current status

`ROADMAP.md` describes:

- Development phases
- Completed work
- Current objectives
- Future features
- Testing requirements
- Production requirements

---

# 🚀 Final Objective

The final objective is to create a reliable centralized warehouse management system capable of coordinating the entire warehouse from one central server while providing every operator with a simple, clear and real-time interface.

```text
                    WAREHOUSE CONTROL SYSTEM
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
            TASKS         OPERATORS         PORTS
              │               │               │
              └───────────────┼───────────────┘
                              │
                              ▼
                       REAL-TIME DATA
                              │
                              ▼
                       MANAGER CONTROL
                              │
                              ▼
                    WAREHOUSE OPERATIONS
```

---

# 🟡 Project Status

**ACTIVE DEVELOPMENT**

The core platform, Inspection workflow, item-level progress, automatic task completion and problem management are currently implemented.

The next major development phase is the **B2B workflow**.

Production deployment will only be considered after the warehouse workflows, reliability, security, LAN deployment and end-to-end testing requirements have been completed.