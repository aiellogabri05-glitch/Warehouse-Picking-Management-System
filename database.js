const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const databaseDirectory = path.join(__dirname, "database");

if (!fs.existsSync(databaseDirectory)) {
  fs.mkdirSync(databaseDirectory, { recursive: true });
}

const databasePath = path.join(databaseDirectory, "picking.db");

const db = new Database(databasePath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS ports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OFFLINE',
    last_seen DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    port_id INTEGER NOT NULL,

    order_number TEXT,
    item_code TEXT,
    quantity INTEGER,

    title TEXT NOT NULL,
    description TEXT,

    order_type TEXT NOT NULL DEFAULT 'OTHER',
    operation_type TEXT NOT NULL DEFAULT 'GENERIC',

    priority TEXT NOT NULL DEFAULT 'NORMAL',
    status TEXT NOT NULL DEFAULT 'PENDING',

    estimated_minutes INTEGER NOT NULL,

    started_at DATETIME,
    completed_at DATETIME,

    problem_type TEXT,
    problem_description TEXT,

    problem_status TEXT,
    problem_assigned_to TEXT,
    problem_assigned_at DATETIME,
    problem_resolved_at DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (port_id)
      REFERENCES ports(id)
  );
`);

// ============================================================
// TASK OPERATORS
// ============================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS task_operators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    task_id INTEGER NOT NULL,

    operator_name TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'PENDING',

    started_at DATETIME,
    completed_at DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(task_id, operator_name),

    FOREIGN KEY (task_id)
      REFERENCES tasks(id)
      ON DELETE CASCADE
  );
`);

// ============================================================
// TASK ITEMS
// ============================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS task_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    task_id INTEGER NOT NULL,

    task_operator_id INTEGER,

    -- Identificativi prodotto
    product_id TEXT,
    sku TEXT,
    sku_fba TEXT,
    ean TEXT,

    -- Informazioni prodotto
    product_name TEXT,

    -- Quantità
    pieces_per_box REAL,
    number_of_boxes REAL,
    quantity REAL,

    -- Informazioni aggiuntive
    note TEXT,

    -- Stato lavorazione
    status TEXT NOT NULL DEFAULT 'PENDING',

    -- Utilizzato soprattutto per INSPECTION
    inspection_status TEXT,

    completed_at DATETIME,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (task_id)
      REFERENCES tasks(id)
      ON DELETE CASCADE,

    FOREIGN KEY (task_operator_id)
      REFERENCES task_operators(id)
      ON DELETE SET NULL
  );
`);

// ============================================================
// INDEXES
// ============================================================

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_task_operators_task_id
  ON task_operators(task_id);

  CREATE INDEX IF NOT EXISTS idx_task_items_task_id
  ON task_items(task_id);

  CREATE INDEX IF NOT EXISTS idx_task_items_operator_id
  ON task_items(task_operator_id);
`);


// ========================================
// DATABASE MIGRATIONS
// ========================================

function addColumnIfMissing(
  tableName,
  columnName,
  columnDefinition
) {

  const columns = db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all();

  const exists = columns.some(
    column => column.name === columnName
  );

  if (!exists) {

    db.exec(`
      ALTER TABLE ${tableName}
      ADD COLUMN ${columnName}
      ${columnDefinition}
    `);

    console.log(
      `Database migration: added ${tableName}.${columnName}`
    );
  }
}


// ========================================
// TASK MIGRATIONS
// ========================================

addColumnIfMissing(
  "tasks",
  "order_number",
  "TEXT"
);

addColumnIfMissing(
  "tasks",
  "item_code",
  "TEXT"
);

addColumnIfMissing(
  "tasks",
  "quantity",
  "INTEGER"
);

addColumnIfMissing(
  "tasks",
  "order_type",
  "TEXT DEFAULT 'OTHER'"
);

addColumnIfMissing(
  "tasks",
  "operation_type",
  "TEXT DEFAULT 'GENERIC'"
);

addColumnIfMissing(
  "tasks",
  "operation_type",
  "TEXT DEFAULT 'GENERIC'"
);

addColumnIfMissing(
  "tasks",
  "responsible",
  "TEXT"
);

addColumnIfMissing(
  "tasks",
  "problem_type",
  "TEXT"
);

addColumnIfMissing(
  "tasks",
  "problem_type",
  "TEXT"
);

addColumnIfMissing(
  "tasks",
  "problem_description",
  "TEXT"
);

addColumnIfMissing(
  "tasks",
  "problem_status",
  "TEXT"
);

addColumnIfMissing(
  "tasks",
  "problem_assigned_to",
  "TEXT"
);

addColumnIfMissing(
  "tasks",
  "problem_assigned_at",
  "DATETIME"
);

addColumnIfMissing(
  "tasks",
  "problem_resolved_at",
  "DATETIME"
);


// ========================================
// FIX EXISTING TASKS
// ========================================

db.prepare(`
  UPDATE tasks
  SET order_type = 'OTHER'
  WHERE order_type IS NULL
`).run();

db.prepare(`
  UPDATE tasks
  SET operation_type = 'GENERIC'
  WHERE operation_type IS NULL
`).run();

db.prepare(`
  UPDATE tasks
  SET problem_status = 'OPEN'
  WHERE status = 'PROBLEM'
    AND problem_status IS NULL
`).run();


// ========================================
// DEFAULT PORTS
// ========================================

const insertPort = db.prepare(`
  INSERT OR IGNORE INTO ports (
    number,
    name
  )
  VALUES (?, ?)
`);

for (
  let number = 101;
  number <= 108;
  number++
) {

  insertPort.run(
    number,
    `Porta ${number}`
  );
}


console.log("Database initialized successfully.");
console.log("Ports 101-108 are ready.");

module.exports = db;