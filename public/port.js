const pathParts = window.location.pathname.split("/");
const portNumber = Number(pathParts[pathParts.length - 1]);

const portTitle = document.getElementById("port-title");
const tasksContainer = document.getElementById("tasks-container");

let currentTasks = [];

// ============================================================
// UTILS
// ============================================================

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatStatus(status) {
  const labels = {
    PENDING: "In attesa",
    IN_PROGRESS: "In lavorazione",
    COMPLETED: "Completata",
    BLOCKED: "Bloccata",
    CANCELLED: "Annullata"
  };

  return labels[status] || status || "Sconosciuto";
}

function formatOrderType(type) {
  const labels = {
    B2B: "B2B",
    KOSICE: "KOSICE",
    AMAZON_FBA: "Amazon FBA",
    OTHER: "Altro"
  };

  return labels[type] || type || "-";
}

function formatOperationType(type) {
  const labels = {
    INSPECTION: "Ispezione",
    SINGLE_PICK_LIST: "Single Pick List",
    GENERIC: "Generica"
  };

  return labels[type] || type || "-";
}

function getStatusClass(status) {
  switch (status) {
    case "COMPLETED":
      return "status-completed";

    case "IN_PROGRESS":
      return "status-progress";

    case "BLOCKED":
      return "status-blocked";

    case "CANCELLED":
      return "status-cancelled";

    default:
      return "status-pending";
  }
}

function getItemStatusClass(status) {
  switch (status) {
    case "COMPLETED":
      return "item-completed";

    case "IN_PROGRESS":
      return "item-progress";

    case "BLOCKED":
      return "item-blocked";

    default:
      return "item-pending";
  }
}

// ============================================================
// LOAD PORT
// ============================================================

async function loadPort() {
  try {
    const response = await fetch(`/api/ports/${portNumber}`);

    if (!response.ok) {
      throw new Error("Porta non trovata");
    }

    const port = await response.json();

    portTitle.textContent =
      `PORTA ${port.number}${port.name ? ` - ${port.name}` : ""}`;

  } catch (error) {
    console.error("Errore caricamento porta:", error);

    portTitle.textContent =
      `PORTA ${portNumber}`;
  }
}

// ============================================================
// LOAD TASKS
// ============================================================

async function loadTasks() {
  try {
    const response =
      await fetch(`/api/ports/${portNumber}/tasks`);

    if (!response.ok) {
      throw new Error("Errore caricamento task");
    }

    currentTasks = await response.json();

    renderTasks();

  } catch (error) {
    console.error("Errore caricamento task:", error);

    tasksContainer.innerHTML = `
      <div class="error-box">
        Errore nel caricamento delle task.
      </div>
    `;
  }
}

// ============================================================
// RENDER TASKS
// ============================================================

function renderTasks() {

  // Mostra sulla porta solo le task ancora operative.
  // Le task COMPLETED rimangono nel database
  // e saranno visibili successivamente nel Manager.

  const activeTasks =
    currentTasks.filter(
      task =>
        task.status !== "COMPLETED" &&
        task.status !== "CANCELLED"
    );


  if (activeTasks.length === 0) {

    tasksContainer.innerHTML = `
      <div class="empty-box">

        <h2>Nessuna task attiva</h2>

        <p>
          Tutte le attività di questa porta sono state completate.
        </p>

      </div>
    `;

    return;
  }


  tasksContainer.innerHTML =
    activeTasks
      .map(task => renderTask(task))
      .join("");
}

// ============================================================
// RENDER SINGLE TASK - OPERATOR UI
// ============================================================

function renderTask(task) {

  const operators =
    Array.isArray(task.operators)
      ? task.operators
      : [];

  const items =
    Array.isArray(task.items)
      ? task.items
      : [];


  const completedItems =
    items.filter(
      item => item.status === "COMPLETED"
    ).length;


  const totalItems =
    items.length;


  const progressPercentage =
    totalItems > 0
      ? Math.round(
          (completedItems / totalItems) * 100
        )
      : 0;


  const operatorNames =
    operators
      .map(
        operator =>
          operator.operator_name
      )
      .filter(Boolean);


  const operatorText =
    operatorNames.length > 0
      ? operatorNames.join(", ")
      : "Non assegnato";


  let statusClass =
    "task-status-pending";

  if (task.status === "IN_PROGRESS") {
    statusClass = "task-status-progress";
  }

  if (task.status === "COMPLETED") {
    statusClass = "task-status-completed";
  }

  if (task.status === "BLOCKED") {
    statusClass = "task-status-blocked";
  }

  if (task.status === "CANCELLED") {
    statusClass = "task-status-cancelled";
  }


  return `

    <article
      class="operator-task-card"
      data-task-id="${task.id}"
    >

      <!-- HEADER ORDINE -->

      <div class="operator-task-header">

        <div class="operator-task-header-left">

          <div class="operator-task-label">
            ORDINE
          </div>

          <div class="operator-order-number">
            ${escapeHtml(
              task.order_number ||
              task.title ||
              "-"
            )}
          </div>

          <div class="operator-order-type">
            ${escapeHtml(
              formatOrderType(
                task.order_type
              )
            )}

            <span class="separator">
              ·
            </span>

            ${escapeHtml(
              formatOperationType(
                task.operation_type
              )
            )}
          </div>

        </div>


        <div class="operator-task-header-right">

          <div class="${statusClass}">
            ${escapeHtml(
              formatStatus(task.status)
            )}
          </div>

        </div>

      </div>


      <!-- INFO OPERATORE -->

      <div class="operator-task-meta">

        <div class="operator-meta-item">

          <span class="meta-label">
            OPERATORE
          </span>

          <strong>
            ${escapeHtml(
              operatorText
            )}
          </strong>

        </div>


        <div class="operator-meta-item">

          <span class="meta-label">
            PRIORITÀ
          </span>

          <strong>
            ${escapeHtml(
              task.priority || "NORMAL"
            )}
          </strong>

        </div>


        ${
          task.responsible
            ? `
              <div class="operator-meta-item">

                <span class="meta-label">
                  RESPONSABILE
                </span>

                <strong>
                  ${escapeHtml(
                    task.responsible
                  )}
                </strong>

              </div>
            `
            : ""
        }

      </div>


      <!-- PROGRESSO -->

      ${
        totalItems > 0
          ? `

            <div class="operator-progress-section">

              <div class="operator-progress-top">

                <div>

                  <span class="progress-label">
                    PROGRESSO
                  </span>

                  <strong class="progress-count">
                    ${completedItems} / ${totalItems}
                  </strong>

                </div>


                <strong class="progress-percentage">
                  ${progressPercentage}%
                </strong>

              </div>


              <div class="operator-progress-bar">

                <div
                  class="operator-progress-fill"
                  style="width: ${progressPercentage}%"
                ></div>

              </div>

            </div>

          `
          : ""
      }


      <!-- ARTICOLI -->

      <div class="operator-items-section">

        <div class="operator-section-header">

          <div>
            ARTICOLI
          </div>

          <div class="operator-items-count">
            ${totalItems}
          </div>

        </div>


        <div class="operator-items-list">

          ${
            items.length === 0
              ? `
                <div class="operator-empty">
                  Nessun articolo presente.
                </div>
              `
              : items
                  .map(
                    (item, index) =>
                      renderItem(
                        item,
                        index + 1
                      )
                  )
                  .join("")
          }

        </div>

      </div>


      <!-- AZIONI -->

      <div class="operator-task-actions">

        ${
          task.status === "PENDING"
            ? `
              <button
                class="operator-start-button"
                onclick="changeTaskStatus(
                  ${task.id},
                  'IN_PROGRESS'
                )"
              >
                INIZIA LAVORAZIONE
              </button>
            `
            : ""
        }


        ${
          task.status !== "COMPLETED" &&
          task.status !== "CANCELLED"
            ? `
              <button
                class="operator-problem-button"
                onclick="reportProblem(
                  ${task.id}
                )"
              >
                SEGNALA PROBLEMA
              </button>
            `
            : ""
        }

      </div>

    </article>

  `;
}

// ============================================================
// RENDER ITEM - CLEAN INSPECTION LIST
// ============================================================

function renderItem(item, index) {

  const isCompleted =
    item.status === "COMPLETED";

  const operatorName =
    item.operator_name || "-";


  return `
    <div
      class="
        inspection-item
        ${isCompleted
          ? "inspection-item-completed"
          : "inspection-item-pending"}
      "
    >

      <!-- NUMERO -->

      <div class="inspection-number">
        ${String(index).padStart(2, "0")}
      </div>


      <!-- PRODOTTO -->

      <div class="inspection-product">

        <div class="inspection-product-name">
          ${escapeHtml(
            item.product_name ||
            item.product_id ||
            "Articolo senza nome"
          )}
        </div>


        <div class="inspection-product-details">

          ${
            item.sku_fba
              ? `
                <span>
                  SKU:
                  <strong>
                    ${escapeHtml(item.sku_fba)}
                  </strong>
                </span>
              `
              : ""
          }

          ${
            item.product_id
              ? `
                <span>
                  ID:
                  <strong>
                    ${escapeHtml(item.product_id)}
                  </strong>
                </span>
              `
              : ""
          }

          ${
            item.ean
              ? `
                <span>
                  EAN:
                  <strong>
                    ${escapeHtml(item.ean)}
                  </strong>
                </span>
              `
              : ""
          }

        </div>

      </div>


      <!-- QUANTITÀ -->

      <div class="inspection-value">

        <span>Q.TÀ</span>

        <strong>
          ${
            item.quantity !== null &&
            item.quantity !== undefined
              ? escapeHtml(item.quantity)
              : "-"
          }
        </strong>

      </div>


      <!-- COLLI -->

      <div class="inspection-value">

        <span>COLLI</span>

        <strong>
          ${
            item.number_of_boxes !== null &&
            item.number_of_boxes !== undefined
              ? escapeHtml(item.number_of_boxes)
              : "-"
          }
        </strong>

      </div>


      <!-- PEZZI PER BOX -->

      <div class="inspection-value">

        <span>PZ/BOX</span>

        <strong>
          ${
            item.pieces_per_box !== null &&
            item.pieces_per_box !== undefined
              ? escapeHtml(item.pieces_per_box)
              : "-"
          }
        </strong>

      </div>


      <!-- OPERATORE -->

      <div class="inspection-operator">

        <span>OPERATORE</span>

        <strong>
          ${escapeHtml(operatorName)}
        </strong>

      </div>


      <!-- AZIONE -->

      <div class="inspection-action">

        ${
          isCompleted
            ? `
              <div class="inspection-check completed">
                ✓
              </div>

              <span class="inspection-status completed">
                OK
              </span>
            `
            : `
              <button
                class="inspection-check"
                onclick="completeItem(${item.id})"
                title="Completa articolo"
              >
                ✓
              </button>

              <span class="inspection-status pending">
                DA FARE
              </span>
            `
        }

      </div>

    </div>
  `;
}

// ============================================================
// CHANGE TASK STATUS
// ============================================================

async function changeTaskStatus(
  taskId,
  status
) {

  try {

    const response = await fetch(
      `/api/tasks/${taskId}/status`,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          status
        })
      }
    );


    if (!response.ok) {
      throw new Error(
        "Errore aggiornamento stato"
      );
    }


    await loadTasks();

  } catch (error) {

    console.error(
      "Errore cambio stato:",
      error
    );

    alert(
      "Impossibile aggiornare lo stato della task."
    );
  }
}

// ============================================================
// COMPLETE ITEM
// ============================================================

async function completeItem(itemId) {

  try {

    const response = await fetch(
      `/api/task-items/${itemId}/status`,
      {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          status: "COMPLETED"
        })
      }
    );


    const result = await response.json();


    if (!response.ok) {

      throw new Error(
        result.error ||
        "Errore completamento articolo"
      );

    }


    // Ricarica le task per aggiornare:
    // - stato articolo
    // - progresso
    // - barra percentuale
    // - eventuale completamento della task

    await loadTasks();


  } catch (error) {

    console.error(
      "Errore completamento articolo:",
      error
    );

    alert(
      "Impossibile completare l'articolo."
    );

  }

}

// ============================================================
// REPORT PROBLEM
// ============================================================

async function reportProblem(taskId) {

  const problemType =
    prompt(
      "Tipo di problema:\n\n" +
      "1 = Articolo mancante\n" +
      "2 = Quantità errata\n" +
      "3 = Prodotto danneggiato\n" +
      "4 = Problema operativo\n" +
      "5 = Altro"
    );

  if (!problemType) {
    return;
  }

  const problemTypes = {
    "1": "ITEM_MISSING",
    "2": "WRONG_QUANTITY",
    "3": "DAMAGED_PRODUCT",
    "4": "OPERATIONAL_PROBLEM",
    "5": "OTHER"
  };

  const selectedType =
    problemTypes[problemType.trim()];

  if (!selectedType) {
    alert(
      "Tipo di problema non valido. " +
      "Inserisci un numero da 1 a 5."
    );
    return;
  }

  const description =
    prompt(
      "Descrivi il problema:"
    );

  if (!description) {
    return;
  }

  try {

    const response = await fetch(
      `/api/tasks/${taskId}/problem`,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          problem_type: selectedType,
          problem_description: description
        })
      }
    );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        "Errore segnalazione problema"
      );
    }

    await loadTasks();

    alert(
      "Problema segnalato correttamente."
    );

  } catch (error) {

    console.error(
      "Errore problema:",
      error
    );

    alert(
      "Impossibile segnalare il problema."
    );
  }
}

// ============================================================
// WEBSOCKET
// ============================================================

let socket = null;


function connectWebSocket() {

  const protocol =
    window.location.protocol === "https:"
      ? "wss:"
      : "ws:";


  socket = new WebSocket(
    `${protocol}//${window.location.host}`
  );


  socket.addEventListener(
    "open",
    () => {

      console.log(
        "WebSocket connesso."
      );

    }
  );


  socket.addEventListener(
    "message",
    event => {

      try {

        const message =
          JSON.parse(event.data);


        console.log(
          "WebSocket message:",
          message
        );


        /*
         * Quando arriva un cambiamento
         * ricarichiamo le task.
         */

        if (
          message.type ===
            "TASK_CREATED" ||

          message.type ===
            "TASK_IMPORTED" ||

          message.type ===
            "TASK_STATUS_UPDATED" ||

          message.type ===
            "TASK_PROBLEM_UPDATED" ||

          message.type ===
            "TASK_PROBLEM_TAKEN" ||

          message.type ===
            "TASK_PROBLEM_RESOLVED" ||
          
          message.type ===
            "TASK_ITEM_UPDATED"
        ) {

          loadTasks();

        }

      } catch (error) {

        console.error(
          "Errore messaggio WebSocket:",
          error
        );

      }

    }
  );


  socket.addEventListener(
    "close",
    () => {

      console.log(
        "WebSocket disconnesso. Riconnessione..."
      );


      setTimeout(
        connectWebSocket,
        2000
      );

    }
  );


  socket.addEventListener(
    "error",
    error => {

      console.error(
        "WebSocket error:",
        error
      );

    }
  );
}

// ============================================================
// START
// ============================================================

async function init() {

  await loadPort();

  await loadTasks();

  connectWebSocket();
}


init();