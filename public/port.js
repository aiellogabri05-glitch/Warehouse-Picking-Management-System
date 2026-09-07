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

  if (!currentTasks || currentTasks.length === 0) {

    tasksContainer.innerHTML = `
      <div class="empty-box">
        <h2>Nessuna task</h2>
        <p>Non ci sono attività assegnate a questa porta.</p>
      </div>
    `;

    return;
  }


  tasksContainer.innerHTML =
    currentTasks
      .map(task => renderTask(task))
      .join("");
}

// ============================================================
// RENDER SINGLE TASK
// ============================================================

function renderTask(task) {

  const operators = Array.isArray(task.operators)
    ? task.operators
    : [];

  const items = Array.isArray(task.items)
    ? task.items
    : [];


  const completedItems =
    items.filter(item => item.status === "COMPLETED").length;

  const totalItems =
    items.length;


  const progressPercentage =
    totalItems > 0
      ? Math.round(
          (completedItems / totalItems) * 100
        )
      : 0;


  return `
    <div
      class="task-card ${getStatusClass(task.status)}"
      data-task-id="${task.id}"
    >

      <!-- ================================================= -->
      <!-- HEADER -->
      <!-- ================================================= -->

      <div class="task-header">

        <div>

          <div class="task-title">
            ${escapeHtml(
              task.order_number
                ? `Ordine ${task.order_number}`
                : task.title
            )}
          </div>

          <div class="task-subtitle">
            Task #${task.id}
          </div>

        </div>


        <div class="task-status">
          ${escapeHtml(
            formatStatus(task.status)
          )}
        </div>

      </div>


      <!-- ================================================= -->
      <!-- INFO ORDINE -->
      <!-- ================================================= -->

      <div class="order-info">

        <div class="info-box">

          <span class="info-label">
            Tipo ordine
          </span>

          <strong>
            ${escapeHtml(
              formatOrderType(task.order_type)
            )}
          </strong>

        </div>


        <div class="info-box">

          <span class="info-label">
            Operazione
          </span>

          <strong>
            ${escapeHtml(
              formatOperationType(
                task.operation_type
              )
            )}
          </strong>

        </div>


        <div class="info-box">

          <span class="info-label">
            Responsabile
          </span>

          <strong>
            ${escapeHtml(
              task.responsible || "-"
            )}
          </strong>

        </div>


        <div class="info-box">

          <span class="info-label">
            Priorità
          </span>

          <strong>
            ${escapeHtml(
              task.priority || "NORMAL"
            )}
          </strong>

        </div>

      </div>


      <!-- ================================================= -->
      <!-- OPERATORI -->
      <!-- ================================================= -->

      <div class="operators-section">

        <div class="section-title">
          👷 Operatori assegnati
        </div>


        ${
          operators.length === 0

            ? `
              <div class="no-data">
                Nessun operatore assegnato.
              </div>
            `

            : `
              <div class="operators-list">

                ${
                  operators
                    .map(operator => `
                      <div class="operator-badge">

                        <span>
                          ${escapeHtml(
                            operator.operator_name
                          )}
                        </span>

                        <span class="operator-status">
                          ${escapeHtml(
                            formatStatus(
                              operator.status
                            )
                          )}
                        </span>

                      </div>
                    `)
                    .join("")
                }

              </div>
            `
        }

      </div>


      <!-- ================================================= -->
      <!-- PROGRESS -->
      <!-- ================================================= -->

      ${
        totalItems > 0

          ? `
            <div class="progress-section">

              <div class="progress-header">

                <span>
                  Progresso articoli
                </span>

                <strong>
                  ${completedItems} / ${totalItems}
                </strong>

              </div>


              <div class="progress-bar">

                <div
                  class="progress-fill"
                  style="width: ${progressPercentage}%"
                ></div>

              </div>

            </div>
          `

          : ""
      }


      <!-- ================================================= -->
      <!-- ARTICOLI -->
      <!-- ================================================= -->

      <div class="items-section">

        <div class="section-title">
          📦 Articoli
        </div>


        ${
          items.length === 0

            ? `
              <div class="no-data">
                Nessun articolo presente.
              </div>
            `

            : `
              <div class="items-list">

                ${
                  items
                    .map((item, index) =>
                      renderItem(
                        item,
                        index + 1
                      )
                    )
                    .join("")
                }

              </div>
            `
        }

      </div>


      <!-- ================================================= -->
      <!-- AZIONI TASK -->
      <!-- ================================================= -->

      <div class="task-actions">

        ${
          task.status === "PENDING"

            ? `
              <button
                class="btn btn-primary"
                onclick="changeTaskStatus(
                  ${task.id},
                  'IN_PROGRESS'
                )"
              >
                ▶ Inizia
              </button>
            `

            : ""
        }


        ${
          task.status === "IN_PROGRESS"

            ? `
              <button
                class="btn btn-success"
                onclick="changeTaskStatus(
                  ${task.id},
                  'COMPLETED'
                )"
              >
                ✓ Completa task
              </button>
            `

            : ""
        }


        ${
          task.status !== "COMPLETED" &&
          task.status !== "CANCELLED"

            ? `
              <button
                class="btn btn-warning"
                onclick="reportProblem(
                  ${task.id}
                )"
              >
                ⚠ Segnala problema
              </button>
            `

            : ""
        }

      </div>

    </div>
  `;
}

// ============================================================
// RENDER ITEM
// ============================================================

function renderItem(item, index) {

  const operatorName =
    item.operator_name || "-";


  return `
    <div
      class="item-card ${getItemStatusClass(
        item.status
      )}"
    >

      <div class="item-number">
        ${index}
      </div>


      <div class="item-main">

        <div class="item-name">

          ${
            escapeHtml(
              item.product_name ||
              item.product_id ||
              "Articolo senza nome"
            )
          }

        </div>


        <div class="item-details">

          ${
            item.product_id
              ? `
                <span>
                  Product ID:
                  <strong>
                    ${escapeHtml(
                      item.product_id
                    )}
                  </strong>
                </span>
              `
              : ""
          }


          ${
            item.sku
              ? `
                <span>
                  SKU:
                  <strong>
                    ${escapeHtml(
                      item.sku
                    )}
                  </strong>
                </span>
              `
              : ""
          }


          ${
            item.sku_fba
              ? `
                <span>
                  SKU FBA:
                  <strong>
                    ${escapeHtml(
                      item.sku_fba
                    )}
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
                    ${escapeHtml(
                      item.ean
                    )}
                  </strong>
                </span>
              `
              : ""
          }

        </div>


        <div class="item-details">

          ${
            item.quantity !== null &&
            item.quantity !== undefined

              ? `
                <span>
                  Quantità:
                  <strong>
                    ${escapeHtml(
                      item.quantity
                    )}
                  </strong>
                </span>
              `

              : ""
          }


          ${
            item.number_of_boxes !== null &&
            item.number_of_boxes !== undefined

              ? `
                <span>
                  Colli:
                  <strong>
                    ${escapeHtml(
                      item.number_of_boxes
                    )}
                  </strong>
                </span>
              `

              : ""
          }


          ${
            item.pieces_per_box !== null &&
            item.pieces_per_box !== undefined

              ? `
                <span>
                  Pezzi/box:
                  <strong>
                    ${escapeHtml(
                      item.pieces_per_box
                    )}
                  </strong>
                </span>
              `

              : ""
          }

        </div>


        ${
          item.note

            ? `
              <div class="item-note">

                📝
                ${escapeHtml(
                  item.note
                )}

              </div>
            `

            : ""
        }

      </div>


      <div class="item-side">

        <div class="item-operator">

          👷

          ${escapeHtml(
            operatorName
          )}

        </div>


        <div class="item-status">

          ${escapeHtml(
            formatStatus(
              item.status
            )
          )}

        </div>


        ${
          item.status !== "COMPLETED"

            ? `
              <button
                class="item-complete-btn"
                onclick="completeItem(
                  ${item.id}
                )"
              >
                ✓
              </button>
            `

            : `
              <div class="item-completed-icon">
                ✓
              </div>
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

    /*
     * Per ora utilizziamo l'endpoint task status
     * solo quando sarà disponibile la gestione
     * specifica degli articoli.
     *
     * Questa funzione viene preparata ora.
     */

    console.log(
      "Completamento articolo:",
      itemId
    );


    alert(
      "La gestione del completamento del singolo articolo verrà collegata al backend nel prossimo passaggio."
    );

  } catch (error) {

    console.error(
      "Errore completamento articolo:",
      error
    );
  }
}

// ============================================================
// REPORT PROBLEM
// ============================================================

async function reportProblem(taskId) {

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
          problem_description:
            description
        })
      }
    );


    if (!response.ok) {
      throw new Error(
        "Errore segnalazione problema"
      );
    }


    await loadTasks();

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
            "TASK_PROBLEM_RESOLVED"
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