const express = require("express");
const xlsx = require("xlsx");
const http = require("http");
const WebSocket = require("ws");
const db = require("./database");
const multer = require("multer");
const path = require("path");

const app = express();
const server = http.createServer(app);

const PORT = 3000;

const upload = multer({
    dest: path.join(__dirname, "uploads"),
});

// ========================================
// WEBSOCKET
// ========================================

const wss = new WebSocket.Server({
  server
});


wss.on("connection", (ws) => {

  console.log("WebSocket client connected.");

  ws.send(JSON.stringify({
    type: "CONNECTED",
    message: "WebSocket connected successfully."
  }));


  ws.on("close", () => {

    console.log("WebSocket client disconnected.");

  });

});


// ========================================
// BROADCAST
// ========================================

function broadcast(event) {

  const message = JSON.stringify(event);

  wss.clients.forEach((client) => {

    if (client.readyState === WebSocket.OPEN) {

      client.send(message);

    }

  });

}


// ========================================
// MIDDLEWARE
// ========================================

app.use(express.json());

app.use(express.static("public"));


// ========================================
// DASHBOARD
// ========================================

app.get("/", (req, res) => {

  res.sendFile(
    __dirname + "/public/index.html"
  );

});


// ========================================
// GET ALL PORTS
// ========================================

app.get("/api/ports", (req, res) => {

  try {

    const ports = db
      .prepare(`
        SELECT *
        FROM ports
        ORDER BY number
      `)
      .all();

    res.json(ports);

  } catch (error) {

    console.error(
      "Error getting ports:",
      error
    );

    res.status(500).json({
      error: "Errore nel recupero delle porte."
    });

  }

});


// ========================================
// GET ONE PORT
// ========================================

app.get("/api/ports/:number", (req, res) => {

  try {

    const portNumber =
      Number(req.params.number);


    if (!Number.isInteger(portNumber)) {

      return res.status(400).json({
        error: "Numero porta non valido."
      });

    }


    const port = db
      .prepare(`
        SELECT *
        FROM ports
        WHERE number = ?
      `)
      .get(portNumber);


    if (!port) {

      return res.status(404).json({
        error: "Porta non trovata."
      });

    }


    res.json(port);

  } catch (error) {

    console.error(
      "Error getting port:",
      error
    );

    res.status(500).json({
      error: "Errore nel recupero della porta."
    });

  }

});


// ========================================
// GET ALL TASKS
// ========================================

app.get("/api/tasks", (req, res) => {

  try {

    const tasks = db
      .prepare(`
        SELECT

          tasks.*,

          ports.number AS port_number,
          ports.name AS port_name

        FROM tasks

        INNER JOIN ports
          ON tasks.port_id = ports.id

        ORDER BY

          CASE tasks.priority

            WHEN 'URGENT' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'NORMAL' THEN 3
            WHEN 'LOW' THEN 4

            ELSE 5

          END,

          tasks.created_at ASC
      `)
      .all();


    res.json(tasks);

  } catch (error) {

    console.error(
      "Error getting tasks:",
      error
    );

    res.status(500).json({
      error: "Errore nel recupero delle task."
    });

  }

});


// ========================================
// GET TASKS FOR PORT
// ========================================

app.get(
  "/api/ports/:number/tasks",
  (req, res) => {

    try {

      const portNumber =
        Number(req.params.number);


      if (!Number.isInteger(portNumber)) {

        return res.status(400).json({
          error: "Numero porta non valido."
        });

      }


      const port = db
        .prepare(`
          SELECT id
          FROM ports
          WHERE number = ?
        `)
        .get(portNumber);


      if (!port) {

        return res.status(404).json({
          error: "Porta non trovata."
        });

      }


      const tasks = db
        .prepare(`
          SELECT

            tasks.*,

            ports.number AS port_number,
            ports.name AS port_name

          FROM tasks

          INNER JOIN ports
            ON tasks.port_id = ports.id

          WHERE ports.number = ?

          ORDER BY

            CASE tasks.priority

              WHEN 'URGENT' THEN 1
              WHEN 'HIGH' THEN 2
              WHEN 'NORMAL' THEN 3
              WHEN 'LOW' THEN 4

              ELSE 5

            END,

            tasks.created_at ASC
        `)
        .all(portNumber);


      // ========================================
      // AGGIUNGE OPERATORI E ARTICOLI
      // ========================================

      const tasksWithDetails =
        tasks.map(task => {

          const operators =
            db.prepare(`
              SELECT *
              FROM task_operators
              WHERE task_id = ?
              ORDER BY id
            `)
            .all(task.id);


          const items =
            db.prepare(`
              SELECT
                ti.*,
                toper.operator_name
              FROM task_items ti
              LEFT JOIN task_operators toper
                ON toper.id = ti.task_operator_id
              WHERE ti.task_id = ?
              ORDER BY ti.id
            `)
            .all(task.id);


          return {
            ...task,
            operators,
            items
          };

        });


      res.json(tasksWithDetails);


    } catch (error) {

      console.error(
        "Error getting port tasks:",
        error
      );

      res.status(500).json({
        error:
          "Errore nel recupero delle task della porta."
      });

    }

  }
);


// ========================================
// CREATE TASK
// ========================================

app.post("/api/tasks", (req, res) => {

  try {

    const {
        port_number,
        order_number,
        item_code,
        quantity,
        title,
        description,
        priority,
        estimated_minutes,
        order_type,
        operation_type
    } = req.body;

    // ------------------------------------
    // VALIDATION
    // ------------------------------------

    if (!port_number) {

      return res.status(400).json({
        error: "La porta è obbligatoria."
      });

    }


    if (!title || !title.trim()) {

      return res.status(400).json({
        error: "L'operazione è obbligatoria."
      });

    }


    if (!priority) {

      return res.status(400).json({
        error: "La priorità è obbligatoria."
      });

    }

    // ------------------------------------
// ORDER TYPE / OPERATION VALIDATION
// ------------------------------------

const allowedOrderTypes = [
  "B2B",
  "KOSICE",
  "AMAZON_FBA",
  "OTHER"
];

const allowedOperationTypes = [
  "INSPECTION",
  "SINGLE_PICK_LIST",
  "GENERIC"
];

if (!order_type) {

  return res.status(400).json({
    error: "Il tipo di ordine è obbligatorio."
  });

}

if (!allowedOrderTypes.includes(order_type)) {

  return res.status(400).json({
    error: "Tipo di ordine non valido."
  });

}

if (!operation_type) {

  return res.status(400).json({
    error: "Il tipo di operazione è obbligatorio."
  });

}

if (!allowedOperationTypes.includes(operation_type)) {

  return res.status(400).json({
    error: "Tipo di operazione non valido."
  });

}


// ------------------------------------
// BUSINESS RULES
// ------------------------------------

// Amazon FBA → solo Inspection

if (
  order_type === "AMAZON_FBA" &&
  operation_type !== "INSPECTION"
) {

  return res.status(400).json({
    error:
      "Per gli ordini Amazon FBA è disponibile solo INSPECTION."
  });

}


    if (
      !estimated_minutes ||
      Number(estimated_minutes) <= 0
    ) {

      return res.status(400).json({
        error:
          "Il tempo previsto deve essere maggiore di 0."
      });

    }


    if (
      quantity !== undefined &&
      quantity !== null &&
      quantity !== "" &&
      Number(quantity) <= 0
    ) {

      return res.status(400).json({
        error:
          "La quantità deve essere maggiore di 0."
      });

    }

if (!order_type) {
  return res.status(400).json({
    error: "order_type è obbligatorio."
  });
}

if (!allowedOrderTypes.includes(order_type)) {
  return res.status(400).json({
    error: "order_type non valido."
  });
}

if (!operation_type) {
  return res.status(400).json({
    error: "operation_type è obbligatorio."
  });
}

if (!allowedOperationTypes.includes(operation_type)) {
  return res.status(400).json({
    error: "operation_type non valido."
  });
}

if (
  order_type === "AMAZON_FBA" &&
  operation_type !== "INSPECTION"
) {
  return res.status(400).json({
    error: "Per gli ordini Amazon FBA è disponibile solo INSPECTION."
  });
}


    // ------------------------------------
    // FIND PORT
    // ------------------------------------

    const port = db
      .prepare(`
        SELECT id
        FROM ports
        WHERE number = ?
      `)
      .get(Number(port_number));


    if (!port) {

      return res.status(404).json({
        error: "Porta non trovata."
      });

    }


    // ------------------------------------
    // CREATE TASK
    // ------------------------------------

    const result = db.prepare(`
    INSERT INTO tasks (
        port_id,
        order_number,
        item_code,
        quantity,
        title,
        description,
        priority,
        status,
        estimated_minutes,
        order_type,
        operation_type
    )
    VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
    )
`).run(
    port.id,
    order_number ? String(order_number).trim() : null,
    item_code ? String(item_code).trim() : null,

    quantity !== undefined &&
    quantity !== null &&
    quantity !== ""
        ? Number(quantity)
        : null,

    title.trim(),

    description
        ? description.trim()
        : null,

    priority,

    "PENDING",

    Number(estimated_minutes),

    order_type,

    operation_type
);


    const task = db
      .prepare(`
        SELECT

          tasks.*,

          ports.number AS port_number,
          ports.name AS port_name

        FROM tasks

        INNER JOIN ports
          ON tasks.port_id = ports.id

        WHERE tasks.id = ?
      `)
      .get(result.lastInsertRowid);


    broadcast({

      type: "TASK_CREATED",

      task

    });


    res.status(201).json(task);

  } catch (error) {

    console.error(
      "Error creating task:",
      error
    );

    res.status(500).json({
      error: "Errore durante la creazione della task."
    });

  }

});

// ============================================================
// IMPORT TASK COMPLETO
// Crea TASK + OPERATORI + ITEMS in una sola transazione
// ============================================================

// ============================================================
// IMPORT AMAZON EXCEL
// ============================================================

// ============================================================
// IMPORT AMAZON EXCEL
// ============================================================

app.post(
  "/api/tasks/import/amazon",
  upload.single("file"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "Nessun file Excel ricevuto"
        });
      }

      const {
        parseAmazonFile
      } = require("./importers/amazonParser");

      const parsedData = parseAmazonFile(req.file.path);

      const portNumber = req.body.port_number;

      if (!portNumber) {
        return res.status(400).json({
          error: "Porta non specificata"
        });
      }

      const port = db
        .prepare(`
          SELECT *
          FROM ports
          WHERE number = ?
        `)
        .get(Number(portNumber));

      if (!port) {
        return res.status(404).json({
          error: "Porta non trovata"
        });
      }

      const createAmazonTask = db.transaction(() => {

        // ----------------------------------------------------
        // CREA TASK
        // ----------------------------------------------------

        const taskResult = db.prepare(`
  INSERT INTO tasks (
      port_id,
      order_number,
      responsible,
      title,
      description,
      priority,
      status,
      estimated_minutes,
      order_type,
      operation_type
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  port.id,
  String(order_number).trim(),
  responsible
    ? String(responsible).trim()
    : null,
  title
    ? String(title).trim()
    : `${operation_type} ordine ${order_number}`,
  description
    ? String(description).trim()
    : null,
  priority || "NORMAL",
  "PENDING",
  estimated_minutes
    ? Number(estimated_minutes)
    : 0,
  order_type,
  operation_type
);

        const taskId = taskResult.lastInsertRowid;

        // ----------------------------------------------------
        // CREA OPERATORI
        // ----------------------------------------------------

        const operatorIds = new Map();

        const insertOperator = db.prepare(`
          INSERT INTO task_operators (
            task_id,
            operator_name,
            status
          )
          VALUES (?, ?, 'PENDING')
        `);

        for (const operator of parsedData.operators) {

          const result = insertOperator.run(
            taskId,
            operator.name
          );

          operatorIds.set(
            operator.name,
            result.lastInsertRowid
          );
        }

        // ----------------------------------------------------
        // CREA PRODOTTI
        // ----------------------------------------------------

        const insertItem = db.prepare(`
          INSERT INTO task_items (
            task_id,
            task_operator_id,
            product_id,
            sku_fba,
            ean,
            product_name,
            pieces_per_box,
            number_of_boxes,
            quantity,
            note,
            status,
            inspection_status
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'PENDING'
          )
        `);

        for (const item of parsedData.items) {

          const operatorId =
            operatorIds.get(item.operator_name);

          insertItem.run(
            taskId,
            operatorId || null,
            item.product_id || null,
            item.sku_fba || null,
            item.ean || null,
            item.product_name || null,
            item.pieces_per_box ?? null,
            item.number_of_boxes ?? null,
            item.quantity ?? null,
            item.note || null
          );
        }

        return taskId;
      });

      const taskId = createAmazonTask();

      // ------------------------------------------------------
      // RILEGGI LA TASK COMPLETA
      // ------------------------------------------------------

      const task = db.prepare(`
        SELECT
          t.*,
          p.number AS port_number,
          p.name AS port_name
        FROM tasks t
        JOIN ports p
          ON p.id = t.port_id
        WHERE t.id = ?
      `).get(taskId);

      const operators = db.prepare(`
        SELECT *
        FROM task_operators
        WHERE task_id = ?
        ORDER BY id
      `).all(taskId);

      const items = db.prepare(`
        SELECT
          ti.*,
          o.operator_name
        FROM task_items ti
        LEFT JOIN task_operators o
          ON o.id = ti.task_operator_id
        WHERE ti.task_id = ?
        ORDER BY ti.id
      `).all(taskId);

      const result = {
        success: true,
        task,
        operators,
        items
      };

      broadcast({
        type: "TASK_IMPORTED",
        task,
        operators,
        items
      });

      return res.status(201).json(result);

    } catch (error) {

      console.error(
        "Errore importazione Amazon:",
        error
      );

      return res.status(500).json({
        error: "Errore durante l'importazione Amazon",
        details: error.message
      });
    }
  }
);

app.post("/api/tasks/import", (req, res) => {
  const {
    port_number,
    order_number,
    responsible,
    order_type,
    operation_type,
    title,
    description,
    priority,
    estimated_minutes,
    operators,
    items
  } = req.body;

  try {
    // --------------------------------------------------------
    // VALIDAZIONE BASE
    // --------------------------------------------------------

    if (!port_number) {
      return res.status(400).json({
        error: "port_number è obbligatorio."
      });
    }

    if (!order_number) {
      return res.status(400).json({
        error: "order_number è obbligatorio."
      });
    }

    if (!order_type) {
      return res.status(400).json({
        error: "order_type è obbligatorio."
      });
    }

    if (!operation_type) {
      return res.status(400).json({
        error: "operation_type è obbligatorio."
      });
    }

    const allowedOrderTypes = [
      "B2B",
      "KOSICE",
      "AMAZON_FBA",
      "OTHER"
    ];

    const allowedOperationTypes = [
      "INSPECTION",
      "SINGLE_PICK_LIST",
      "GENERIC"
    ];

    if (!allowedOrderTypes.includes(order_type)) {
      return res.status(400).json({
        error: "order_type non valido."
      });
    }

    if (!allowedOperationTypes.includes(operation_type)) {
      return res.status(400).json({
        error: "operation_type non valido."
      });
    }

    if (
      order_type === "AMAZON_FBA" &&
      operation_type !== "INSPECTION"
    ) {
      return res.status(400).json({
        error: "Per gli ordini Amazon FBA è disponibile solo INSPECTION."
      });
    }

    if (!Array.isArray(operators) || operators.length === 0) {
      return res.status(400).json({
        error: "È necessario specificare almeno un operatore."
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "È necessario specificare almeno un prodotto."
      });
    }

    // --------------------------------------------------------
    // PORTA
    // --------------------------------------------------------

    const port = db
      .prepare("SELECT * FROM ports WHERE number = ?")
      .get(port_number);

    if (!port) {
      return res.status(404).json({
        error: `Porta ${port_number} non trovata.`
      });
    }

    // --------------------------------------------------------
    // TRANSAZIONE
    // --------------------------------------------------------

    const importTask = db.transaction(() => {

      // ------------------------------------------------------
      // 1. CREA TASK
      // ------------------------------------------------------

     const taskResult = db.prepare(`
  INSERT INTO tasks (
      port_id,
      order_number,
      responsible,
      title,
      description,
      priority,
      status,
      estimated_minutes,
      order_type,
      operation_type
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  port.id,
  String(order_number).trim(),
  responsible
    ? String(responsible).trim()
    : null,
  title
    ? String(title).trim()
    : `${operation_type} ordine ${order_number}`,
  description
    ? String(description).trim()
    : null,
  priority || "NORMAL",
  "PENDING",
  estimated_minutes
    ? Number(estimated_minutes)
    : 0,
  order_type,
  operation_type
);

      const taskId = Number(taskResult.lastInsertRowid);

      // ------------------------------------------------------
      // 2. CREA OPERATORI
      // ------------------------------------------------------

      const operatorIds = new Map();

      const insertOperator = db.prepare(`
        INSERT INTO task_operators (
          task_id,
          operator_name,
          status
        )
        VALUES (?, ?, 'PENDING')
      `);

      for (const operator of operators) {

        const operatorName =
          typeof operator === "string"
            ? operator.trim()
            : String(operator.name || "").trim();

        if (!operatorName) {
          throw new Error("Nome operatore non valido.");
        }

        const result = insertOperator.run(
          taskId,
          operatorName
        );

        operatorIds.set(
          operatorName,
          Number(result.lastInsertRowid)
        );
      }

      // ------------------------------------------------------
      // 3. CREA ITEMS
      // ------------------------------------------------------

      const insertItem = db.prepare(`
        INSERT INTO task_items (
          task_id,
          task_operator_id,
          product_id,
          sku,
          sku_fba,
          ean,
          product_name,
          pieces_per_box,
          number_of_boxes,
          quantity,
          note,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `);

      for (const item of items) {

        const operatorName =
          item.operator_name
            ? String(item.operator_name).trim()
            : null;

        let taskOperatorId = null;

        if (operatorName) {
          taskOperatorId =
            operatorIds.get(operatorName) || null;

          if (!taskOperatorId) {
            throw new Error(
              `Operatore "${operatorName}" non trovato nella lista operatori.`
            );
          }
        }

        insertItem.run(
          taskId,
          taskOperatorId,
          item.product_id
            ? String(item.product_id).trim()
            : null,
          item.sku
            ? String(item.sku).trim()
            : null,
          item.sku_fba
            ? String(item.sku_fba).trim()
            : null,
          item.ean
            ? String(item.ean).trim()
            : null,
          item.product_name
            ? String(item.product_name).trim()
            : null,
          item.pieces_per_box !== undefined &&
          item.pieces_per_box !== null &&
          item.pieces_per_box !== ""
            ? Number(item.pieces_per_box)
            : null,
          item.number_of_boxes !== undefined &&
          item.number_of_boxes !== null &&
          item.number_of_boxes !== ""
            ? Number(item.number_of_boxes)
            : null,
          item.quantity !== undefined &&
          item.quantity !== null &&
          item.quantity !== ""
            ? Number(item.quantity)
            : null,
          item.note
            ? String(item.note).trim()
            : null
        );
      }

      return taskId;
    });

    // Esegue tutta l'importazione
    const taskId = importTask();

    // --------------------------------------------------------
    // RECUPERA TASK COMPLETO
    // --------------------------------------------------------

    const task = db.prepare(`
      SELECT
        t.*,
        p.number AS port_number
      FROM tasks t
      JOIN ports p ON p.id = t.port_id
      WHERE t.id = ?
    `).get(taskId);

    const taskOperators = db.prepare(`
      SELECT *
      FROM task_operators
      WHERE task_id = ?
      ORDER BY id
    `).all(taskId);

    const taskItems = db.prepare(`
      SELECT
        ti.*,
        toper.operator_name
      FROM task_items ti
      LEFT JOIN task_operators toper
        ON toper.id = ti.task_operator_id
      WHERE ti.task_id = ?
      ORDER BY ti.id
    `).all(taskId);

    const result = {
      task,
      operators: taskOperators,
      items: taskItems
    };

    // --------------------------------------------------------
    // REALTIME
    // --------------------------------------------------------

    broadcast({
      type: "TASK_IMPORTED",
      ...result
    });

    res.status(201).json(result);

  } catch (error) {

    console.error(
      "Errore importazione task:",
      error
    );

    res.status(500).json({
      error: error.message || "Errore durante l'importazione del task."
    });
  }
});


// ============================================================
// DELETE TASK
// ============================================================

app.delete("/api/tasks/:id", (req, res) => {
  try {
    const taskId = Number(req.params.id);

    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({
        error: "ID task non valido"
      });
    }

    const task = db.prepare(`
      SELECT *
      FROM tasks
      WHERE id = ?
    `).get(taskId);

    if (!task) {
      return res.status(404).json({
        error: "Task non trovata"
      });
    }

    db.prepare(`
      DELETE FROM tasks
      WHERE id = ?
    `).run(taskId);

    broadcast({
      type: "TASK_DELETED",
      task_id: taskId
    });

    return res.json({
      success: true,
      message: `Task ${taskId} eliminata`
    });

  } catch (error) {
    console.error(
      "Errore eliminazione task:",
      error
    );

    return res.status(500).json({
      error: "Errore durante l'eliminazione della task",
      details: error.message
    });
  }
});


// ========================================
// UPDATE ITEM STATUS
// ========================================

app.patch(
  "/api/task-items/:id/status",
  (req, res) => {

    try {

      const itemId = Number(req.params.id);

      const {
        status
      } = req.body;


      const allowedStatuses = [
        "PENDING",
        "COMPLETED"
      ];


      // --------------------------------------------------
      // VALIDAZIONE
      // --------------------------------------------------

      if (!Number.isInteger(itemId)) {

        return res.status(400).json({
          error: "ID articolo non valido."
        });

      }


      if (!allowedStatuses.includes(status)) {

        return res.status(400).json({
          error: "Stato articolo non valido."
        });

      }


      // --------------------------------------------------
      // TROVA ARTICOLO
      // --------------------------------------------------

      const item = db
        .prepare(`
          SELECT *
          FROM task_items
          WHERE id = ?
        `)
        .get(itemId);


      if (!item) {

        return res.status(404).json({
          error: "Articolo non trovato."
        });

      }


      // --------------------------------------------------
      // 1. AGGIORNA ARTICOLO
      // --------------------------------------------------

      if (status === "COMPLETED") {

        db.prepare(`
          UPDATE task_items
          SET
            status = 'COMPLETED',
            inspection_status = 'COMPLETED',
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(itemId);

      } else {

        db.prepare(`
          UPDATE task_items
          SET
            status = 'PENDING',
            inspection_status = 'PENDING',
            completed_at = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(itemId);

      }


      // --------------------------------------------------
      // 2. STATO OPERATORE
      // --------------------------------------------------

      if (item.task_operator_id) {

        const operatorProgress = db
          .prepare(`
            SELECT
              COUNT(*) AS total_items,
              SUM(
                CASE
                  WHEN status = 'COMPLETED'
                  THEN 1
                  ELSE 0
                END
              ) AS completed_items
            FROM task_items
            WHERE task_operator_id = ?
          `)
          .get(item.task_operator_id);


        const operatorTotal =
          Number(
            operatorProgress.total_items || 0
          );


        const operatorCompleted =
          Number(
            operatorProgress.completed_items || 0
          );


        // Tutti gli articoli dell'operatore completati

        if (
          operatorTotal > 0 &&
          operatorCompleted === operatorTotal
        ) {

          db.prepare(`
            UPDATE task_operators
            SET
              status = 'COMPLETED',
              completed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(item.task_operator_id);

        } else {

          // Se c'è almeno un articolo ancora da fare

          db.prepare(`
            UPDATE task_operators
            SET
              status = 'IN_PROGRESS',
              completed_at = NULL,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(item.task_operator_id);

        }

      }


      // --------------------------------------------------
      // 3. CONTROLLA TUTTI GLI ARTICOLI DELLA TASK
      // --------------------------------------------------

      const taskProgress = db
        .prepare(`
          SELECT
            COUNT(*) AS total_items,

            SUM(
              CASE
                WHEN status = 'COMPLETED'
                THEN 1
                ELSE 0
              END
            ) AS completed_items

          FROM task_items

          WHERE task_id = ?
        `)
        .get(item.task_id);


      const totalItems =
        Number(
          taskProgress.total_items || 0
        );


      const completedItems =
        Number(
          taskProgress.completed_items || 0
        );


      const allItemsCompleted =
        totalItems > 0 &&
        completedItems === totalItems;


      // --------------------------------------------------
      // 4. SE TUTTI GLI ARTICOLI SONO COMPLETATI
      //    COMPLETA TUTTI GLI OPERATORI
      // --------------------------------------------------

      if (allItemsCompleted) {

        db.prepare(`
          UPDATE task_operators
          SET
            status = 'COMPLETED',
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE task_id = ?
        `).run(item.task_id);


        // ------------------------------------------------
        // COMPLETA TUTTI GLI ARTICOLI DELL'INSPECTION
        // ------------------------------------------------

        db.prepare(`
          UPDATE task_items
          SET
            inspection_status = 'COMPLETED',
            updated_at = CURRENT_TIMESTAMP
          WHERE task_id = ?
        `).run(item.task_id);


        // ------------------------------------------------
        // COMPLETA TASK
        // ------------------------------------------------

        db.prepare(`
          UPDATE tasks
          SET
            status = 'COMPLETED',
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(item.task_id);


        console.log(
          `Task ${item.task_id} completata automaticamente.`
        );


      } else {

        // ------------------------------------------------
        // SE NON È TUTTO COMPLETATO
        // LA TASK DEVE ESSERE IN_PROGRESS
        // ------------------------------------------------

        db.prepare(`
          UPDATE tasks
          SET
            status = 'IN_PROGRESS',
            completed_at = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
            AND status != 'PROBLEM'
        `).run(item.task_id);

      }


      // --------------------------------------------------
      // 5. RECUPERA ARTICOLO AGGIORNATO
      // --------------------------------------------------

      const updatedItem = db
        .prepare(`
          SELECT
            ti.*,
            toper.operator_name
          FROM task_items ti
          LEFT JOIN task_operators toper
            ON toper.id = ti.task_operator_id
          WHERE ti.id = ?
        `)
        .get(itemId);


      // --------------------------------------------------
      // 6. RECUPERA TASK AGGIORNATA
      // --------------------------------------------------

      const updatedTask = db
        .prepare(`
          SELECT
            t.*,
            p.number AS port_number,
            p.name AS port_name
          FROM tasks t
          JOIN ports p
            ON p.id = t.port_id
          WHERE t.id = ?
        `)
        .get(item.task_id);


      // --------------------------------------------------
      // 7. REALTIME - ARTICOLO
      // --------------------------------------------------

      broadcast({
        type: "TASK_ITEM_UPDATED",
        item: updatedItem
      });


      // --------------------------------------------------
      // 8. REALTIME - TASK
      // --------------------------------------------------

      broadcast({
        type: "TASK_STATUS_UPDATED",
        task: updatedTask
      });


      // --------------------------------------------------
      // 9. RISPOSTA
      // --------------------------------------------------

      res.json({

        success: true,

        item: updatedItem,

        task: updatedTask,

        task_completed:
          allItemsCompleted

      });


    } catch (error) {

      console.error(
        "Error updating item status:",
        error
      );


      res.status(500).json({

        error:
          "Errore durante l'aggiornamento dell'articolo."

      });

    }

  }
);

// ========================================
// UPDATE TASK STATUS
// ========================================

app.patch(
  "/api/tasks/:id/status",
  (req, res) => {

    try {

      const taskId = Number(req.params.id);

      const {
        status
      } = req.body;


      const allowedStatuses = [
        "PENDING",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED"
      ];


      if (!Number.isInteger(taskId)) {

        return res.status(400).json({
          error: "ID task non valido."
        });

      }


      if (!allowedStatuses.includes(status)) {

        return res.status(400).json({
          error: "Stato task non valido."
        });

      }


      // Trova il task

      const task = db
        .prepare(`
          SELECT *
          FROM tasks
          WHERE id = ?
        `)
        .get(taskId);


      if (!task) {

        return res.status(404).json({
          error: "Task non trovato."
        });

      }


      // Aggiorna stato

      db.prepare(`
        UPDATE tasks
        SET
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        status,
        taskId
      );


      // Recupera task aggiornato

      const updatedTask = db
        .prepare(`
          SELECT
            t.*,
            p.number AS port_number
          FROM tasks t
          JOIN ports p
            ON p.id = t.port_id
          WHERE t.id = ?
        `)
        .get(taskId);


      // Notifica tutti i client collegati

      broadcast({
        type: "TASK_STATUS_UPDATED",
        task: updatedTask
      });


      res.json({
        success: true,
        task: updatedTask
      });


    } catch (error) {

      console.error(
        "Error updating task status:",
        error
      );


      res.status(500).json({
        error:
          "Errore durante l'aggiornamento dello stato della task."
      });

    }

  }
);

// ========================================
// REPORT PROBLEM
// ========================================

app.patch(
  "/api/tasks/:id/problem",
  (req, res) => {

    try {

      const taskId =
        Number(req.params.id);


      const {
        problem_type,
        problem_description
      } = req.body;


      if (!problem_type) {

        return res.status(400).json({
          error:
            "Il tipo di problema è obbligatorio."
        });

      }


      const task = db
        .prepare(`
          SELECT id
          FROM tasks
          WHERE id = ?
        `)
        .get(taskId);


      if (!task) {

        return res.status(404).json({
          error: "Task non trovata."
        });

      }


      db.prepare(`
        UPDATE tasks

        SET

          status = 'PROBLEM',

          problem_type = ?,

          problem_description = ?,

          problem_status = 'OPEN',

          problem_assigned_to = NULL,

          problem_assigned_at = NULL,

          problem_resolved_at = NULL,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id = ?
      `)
      .run(

        problem_type,

        problem_description ||
          null,

        taskId

      );


      const updatedTask = db
        .prepare(`
          SELECT

            tasks.*,

            ports.number AS port_number,
            ports.name AS port_name

          FROM tasks

          INNER JOIN ports
            ON tasks.port_id = ports.id

          WHERE tasks.id = ?
        `)
        .get(taskId);


      broadcast({

        type: "TASK_PROBLEM",

        task: updatedTask

      });


      res.json(updatedTask);

    } catch (error) {

      console.error(
        "Error reporting problem:",
        error
      );

      res.status(500).json({
        error:
          "Errore durante la segnalazione del problema."
      });

    }

  }
);


// ========================================
// TAKE PROBLEM
// ========================================

app.post(
  "/api/tasks/:id/problem/take",
  (req, res) => {

    try {

      const taskId =
        Number(req.params.id);


      const assignedTo =
        req.body.assigned_to;


      if (
        !assignedTo ||
        !String(assignedTo).trim()
      ) {

        return res.status(400).json({
          error:
            "L'operatore è obbligatorio."
        });

      }


      const task = db
        .prepare(`
          SELECT *
          FROM tasks
          WHERE id = ?
        `)
        .get(taskId);


      if (!task) {

        return res.status(404).json({
          error: "Task non trovata."
        });

      }


      if (task.status !== "PROBLEM") {

        return res.status(400).json({
          error:
            "La task non è in stato PROBLEMA."
        });

      }


      if (
        task.problem_status &&
        task.problem_status !== "OPEN"
      ) {

        return res.status(400).json({
          error:
            "Il problema è già stato preso in carico o risolto."
        });

      }


      db.prepare(`
        UPDATE tasks

        SET

          problem_status = 'IN_PROGRESS',

          problem_assigned_to = ?,

          problem_assigned_at =
            CURRENT_TIMESTAMP,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id = ?
      `)
      .run(

        String(assignedTo).trim(),

        taskId

      );


      const updatedTask = db
        .prepare(`
          SELECT

            tasks.*,

            ports.number AS port_number,
            ports.name AS port_name

          FROM tasks

          INNER JOIN ports
            ON tasks.port_id = ports.id

          WHERE tasks.id = ?
        `)
        .get(taskId);


      broadcast({

        type: "TASK_PROBLEM_TAKEN",

        task: updatedTask

      });


      res.json(updatedTask);

    } catch (error) {

      console.error(
        "Error taking problem:",
        error
      );

      res.status(500).json({
        error:
          "Errore durante la presa in carico del problema."
      });

    }

  }
);


// ========================================
// RESOLVE PROBLEM
// ========================================

app.post(
  "/api/tasks/:id/problem/resolve",
  (req, res) => {

    try {

      const taskId = Number(req.params.id);

      // ------------------------------------
      // 1. TROVA TASK
      // ------------------------------------

      const task = db
        .prepare(`
          SELECT *
          FROM tasks
          WHERE id = ?
        `)
        .get(taskId);

      if (!task) {

        return res.status(404).json({
          error: "Task non trovata."
        });

      }


      if (task.status !== "PROBLEM") {

        return res.status(400).json({
          error: "La task non è in stato PROBLEMA."
        });

      }


      // ------------------------------------
      // 2. RISOLVE IL PROBLEMA
      // ------------------------------------

      db.prepare(`
        UPDATE tasks
        SET
          problem_status = 'RESOLVED',
          problem_resolved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(taskId);


      // ------------------------------------
      // 3. CONTROLLA GLI ARTICOLI
      // ------------------------------------

      const taskProgress = db
        .prepare(`
          SELECT
            COUNT(*) AS total_items,
            SUM(
              CASE
                WHEN status = 'COMPLETED'
                THEN 1
                ELSE 0
              END
            ) AS completed_items
          FROM task_items
          WHERE task_id = ?
        `)
        .get(taskId);


      const totalItems =
        Number(taskProgress.total_items || 0);

      const completedItems =
        Number(taskProgress.completed_items || 0);


      const allItemsCompleted =
        totalItems > 0 &&
        completedItems === totalItems;


      // ------------------------------------
      // 4. AGGIORNA STATO TASK
      // ------------------------------------

      if (allItemsCompleted) {

        // Tutti gli articoli erano già completati.
        // La task può essere chiusa definitivamente.

        db.prepare(`
          UPDATE task_operators
          SET
            status = 'COMPLETED',
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE task_id = ?
        `).run(taskId);


        db.prepare(`
          UPDATE task_items
          SET
            inspection_status = 'COMPLETED',
            updated_at = CURRENT_TIMESTAMP
          WHERE task_id = ?
        `).run(taskId);


        db.prepare(`
          UPDATE tasks
          SET
            status = 'COMPLETED',
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(taskId);


        console.log(
          `Task ${taskId} completata automaticamente dopo la risoluzione del problema.`
        );


      } else {

        // Ci sono ancora articoli da completare.
        // La task torna in lavorazione.

        db.prepare(`
          UPDATE tasks
          SET
            status = 'IN_PROGRESS',
            completed_at = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(taskId);

      }


      // ------------------------------------
      // 5. RECUPERA TASK AGGIORNATA
      // ------------------------------------

      const updatedTask = db
        .prepare(`
          SELECT
            tasks.*,
            ports.number AS port_number,
            ports.name AS port_name
          FROM tasks
          INNER JOIN ports
            ON tasks.port_id = ports.id
          WHERE tasks.id = ?
        `)
        .get(taskId);


      // ------------------------------------
      // 6. WEBSOCKET
      // ------------------------------------

      broadcast({
        type: "TASK_STATUS_UPDATED",
        task: updatedTask
      });


      // ------------------------------------
      // 7. RISPOSTA
      // ------------------------------------

      res.json({
        success: true,
        task: updatedTask,
        task_completed: allItemsCompleted
      });


    } catch (error) {

      console.error(
        "Error resolving problem:",
        error
      );


      res.status(500).json({
        error:
          "Errore durante la risoluzione del problema."
      });

    }

  }
);

// ========================================
// PORT PAGE
// ========================================

app.get(
  "/port/:number",
  (req, res) => {

    const portNumber =
      Number(req.params.number);


    const port = db
      .prepare(`
        SELECT *
        FROM ports
        WHERE number = ?
      `)
      .get(portNumber);


    if (!port) {

      return res.status(404).send(
        "Porta non trovata"
      );

    }


    res.sendFile(
      __dirname + "/public/port.html"
    );

  }
);


// ========================================
// START SERVER
// ========================================

server.listen(
  PORT,
  () => {

    console.log(
      `Picking App server running on http://localhost:${PORT}`
    );

    console.log(
      "WebSocket server ready."
    );

  }
);