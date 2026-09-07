// ========================================
// WAREHOUSE CONTROL - DASHBOARD
// ========================================

const app = document.getElementById("app");

let ports = [];
let tasks = [];


// ========================================
// LOAD DATA
// ========================================

async function loadDashboard() {

  try {

    const [portsResponse, tasksResponse] = await Promise.all([
      fetch("/api/ports"),
      fetch("/api/tasks")
    ]);

    if (!portsResponse.ok || !tasksResponse.ok) {
      throw new Error("Errore caricamento dati");
    }

    ports = await portsResponse.json();
    tasks = await tasksResponse.json();

    renderDashboard();

  } catch (error) {

    console.error(error);

    app.innerHTML = `
      <div class="dashboard-error">
        <h2>Errore di connessione</h2>

        <p>
          Impossibile comunicare con il server.
        </p>

        <button onclick="loadDashboard()">
          Riprova
        </button>
      </div>
    `;
  }
}


// ========================================
// RENDER DASHBOARD
// ========================================

function renderDashboard() {

  const activeTasks = tasks.filter(task =>
    task.status !== "COMPLETED" &&
    task.status !== "CANCELLED"
  );


  const inProgressTasks = tasks.filter(
    task => task.status === "IN_PROGRESS"
  );


  const problemTasks = tasks.filter(
    task => task.status === "PROBLEM"
  );


  const completedTasks = tasks.filter(
    task => task.status === "COMPLETED"
  );

  const overdueTasks = tasks.filter(
  task =>
    task.status === "IN_PROGRESS" &&
    task.started_at &&
    isTaskOverdue(task)
);


  app.innerHTML = `

    <div class="dashboard">

      <!-- ================================= -->
      <!-- HEADER -->
      <!-- ================================= -->

      <header class="dashboard-header">

        <div>

          <div class="dashboard-label">
            WAREHOUSE CONTROL
          </div>

          <h1>
            Control Room
          </h1>

         <p>
  Controllo operativo del magazzino
</p>

</div>

<div style="
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
">

  <button
    class="primary-button"
    onclick="openAmazonImportModal()"
  >
    📦 IMPORTA AMAZON
  </button>

  <button
    class="primary-button"
    onclick="openTaskModal()"
  >
    + NUOVA TASK
  </button>

</div>

<div class="server-status">

          <span class="server-dot"></span>

          SERVER ONLINE

        </div>

      </header>


      <!-- ================================= -->
      <!-- KPI -->
      <!-- ================================= -->

      <section class="dashboard-kpis">

        <div class="kpi-card">

          <span>
            TASK ATTIVE
          </span>

          <strong>
            ${activeTasks.length}
          </strong>

        </div>


        <div class="kpi-card">

          <span>
            IN CORSO
          </span>

          <strong>
            ${inProgressTasks.length}
          </strong>

        </div>


        <div class="kpi-card problem-kpi">

          <span>
            PROBLEMI
          </span>

          <strong>
            ${problemTasks.length}
          </strong>

        </div>


        <div class="kpi-card">

          <span>
            COMPLETATE
          </span>

          <strong>
            ${completedTasks.length}
          </strong>

        </div>
        <div class="kpi-card overdue-kpi">

            <span>
                TASK IN RITARDO
            </span>

            <strong>
            ${overdueTasks.length}
            </strong>

        </div>
      </section>


      <!-- ================================= -->
      <!-- PORTS -->
      <!-- ================================= -->

      <section class="dashboard-section">

        <div class="section-heading">

          <div>

            <span>
              OPERATIONS
            </span>

            <h2>
              Porte di picking
            </h2>

          </div>

          <div class="port-counter">
            ${ports.length} / 8 ONLINE
          </div>

        </div>


        <div class="ports-grid">

          ${
            ports
              .map(port => renderPortCard(port))
              .join("")
          }

        </div>

      </section>


      <!-- ================================= -->
      <!-- PROBLEMS -->
      <!-- ================================= -->

      <section class="dashboard-section problems-section">

        <div class="section-heading">

          <div>

            <span>
              ATTENTION REQUIRED
            </span>

            <h2>
              Problemi da gestire
            </h2>

          </div>

          <div class="problem-counter">
            ${problemTasks.length}
          </div>

        </div>


        ${
          problemTasks.length

            ? `

              <div class="problems-list">

                ${problemTasks
                  .map(task => renderProblem(task))
                  .join("")
                }

              </div>

            `

            : `

              <div class="no-problems">

                <div class="no-problems-icon">
                  ✓
                </div>

                <div>

                  <strong>
                    Nessun problema aperto
                  </strong>

                  <p>
                    Tutte le attività procedono regolarmente.
                  </p>

                </div>

              </div>

            `
        }

      </section>

    </div>

  `;
}


// ========================================
// PORT CARD
// ========================================

function renderPortCard(port) {

  const portTasks = tasks.filter(
    task => task.port_number === port.number
  );


  const activeTasks = portTasks.filter(
    task =>
      task.status !== "COMPLETED" &&
      task.status !== "CANCELLED"
  );


  const inProgress = portTasks.filter(
    task => task.status === "IN_PROGRESS"
  );


  const problems = portTasks.filter(
    task => task.status === "PROBLEM"
  );

  const runningTask =
  portTasks.find(
    task => task.status === "IN_PROGRESS"
  );


  let state = "IDLE";
let stateClass = "idle";


const runningTaskOverdue =
  runningTask &&
  runningTask.started_at &&
  isTaskOverdue(runningTask);


if (problems.length > 0) {

  state = "PROBLEMA";
  stateClass = "problem";

} else if (runningTaskOverdue) {

  state = "IN RITARDO";
  stateClass = "overdue";

} else if (inProgress.length > 0) {

  state = "IN CORSO";
  stateClass = "working";

} else if (activeTasks.length > 0) {

  state = "ATTIVA";
  stateClass = "active";

}

  let timerHtml = "";

if (runningTask && runningTask.started_at) {

  timerHtml = `

    <div
      class="port-timer"
      data-started-at="${runningTask.started_at}"
      data-estimated-minutes="${runningTask.estimated_minutes}"
    >

      <div class="port-timer-header">

        <span>
          ⏱ TEMPO TASK
        </span>

        <strong class="port-timer-value">
          00:00
        </strong>

      </div>

      <div class="port-timer-bar">

        <div
          class="port-timer-progress"
          style="width: 0%"
        ></div>

      </div>

      <div class="port-timer-footer">

        <span>
          Previsto:
          ${formatTimerMinutes(
            runningTask.estimated_minutes
          )}
        </span>

        <span class="port-timer-status">
          IN CORSO
        </span>

      </div>

    </div>

  `;

}


  return `

    <article
      class="port-card ${stateClass}"
      onclick="openPort(${port.number})"
    >

      <div class="port-card-top">

        <div>

          <span class="port-label">
            PORTA
          </span>

          <h3>
            ${port.number}
          </h3>

        </div>


        <div class="port-state">

          <span class="state-dot"></span>

          ${state}

        </div>

      </div>


      <div class="port-card-body">

        <div class="port-main-number">
          ${port.number}
        </div>


        <div class="port-metrics">

          <div>

            <span>
              TASK
            </span>

            <strong>
              ${activeTasks.length}
            </strong>

          </div>


          <div>

            <span>
              IN CORSO
            </span>

            <strong>
              ${inProgress.length}
            </strong>

          </div>


          <div>

            <span>
              PROBLEMI
            </span>

            <strong>
              ${problems.length}
            </strong>

          </div>

        </div>

      </div>

      ${timerHtml}

      <div class="port-card-footer">

        <span>
          ${port.name}
        </span>

        <span>
          APRI →
        </span>

      </div>

    </article>

  `;
}


// ========================================
// PROBLEM CARD
// ========================================

function renderProblem(task) {

  const problemStatus =
    task.problem_status || "OPEN";


  let statusLabel = "APERTO";
  let statusClass = "problem-open";


  if (problemStatus === "IN_PROGRESS") {

    statusLabel = "IN GESTIONE";
    statusClass = "problem-in-progress";

  }


  return `

    <article class="problem-card">

      <div class="problem-indicator">
        ⚠
      </div>


      <div class="problem-content">

        <div class="problem-header">

          <strong>
            PORTA ${task.port_number}
          </strong>

          <span>
            TASK #${task.id}
          </span>

        </div>


        <h3>
          ${escapeHtml(
            task.order_number
              ? `Ordine ${task.order_number}`
              : task.title
          )}
        </h3>


        ${
          task.item_code
            ? `
              <p>
                Articolo:
                <strong>
                  ${escapeHtml(task.item_code)}
                </strong>
              </p>
            `
            : ""
        }


        ${
          task.quantity
            ? `
              <p>
                Quantità:
                <strong>
                  ${task.quantity}
                </strong>
              </p>
            `
            : ""
        }


        <div class="problem-type">

          ${formatProblemType(task.problem_type)}

        </div>


        ${
          task.problem_description

            ? `

              <p class="problem-description">

                ${escapeHtml(
                  task.problem_description
                )}

              </p>

            `

            : ""
        }


        <div class="problem-workflow ${statusClass}">

          ${statusLabel}

          ${
            task.problem_assigned_to
              ? `
                · ${escapeHtml(
                  task.problem_assigned_to
                )}
              `
              : ""
          }

        </div>

      </div>


      <div class="problem-actions">

        <button
          onclick="event.stopPropagation(); openPort(${task.port_number})"
        >
          APRI PORTA
        </button>


        ${
          problemStatus === "OPEN"

            ? `

              <button
                class="take-button"
                onclick="event.stopPropagation(); takeProblem(${task.id})"
              >
                PRENDI IN CARICO
              </button>

            `

            : `

              <button
                class="take-button"
                onclick="event.stopPropagation(); resolveProblem(${task.id})"
              >
                RISOLVI PROBLEMA
              </button>

            `
        }

      </div>

    </article>

  `;
}


// ========================================
// OPEN PORT
// ========================================

function openPort(portNumber) {

  window.location.href =
    `/port/${portNumber}`;

}


// ========================================
// TAKE PROBLEM
// ========================================

async function takeProblem(taskId) {

  const modal = document.createElement("div");

  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.background = "rgba(15, 23, 42, 0.55)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "9999";

  modal.innerHTML = `

    <div style="
      width: min(420px, calc(100% - 40px));
      background: white;
      border-radius: 16px;
      padding: 28px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.25);
    ">

      <div style="
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 1px;
        color: #64748b;
        margin-bottom: 8px;
      ">
        PROBLEMA TASK #${taskId}
      </div>

      <h2 style="
        margin: 0 0 10px 0;
        color: #0f172a;
      ">
        Prendi in carico
      </h2>

      <p style="
        margin: 0 0 20px 0;
        color: #64748b;
        line-height: 1.5;
      ">
        Inserisci il nome dell'operatore che gestirà questo problema.
      </p>

      <input
        id="problemOperatorInput"
        type="text"
        placeholder="Nome operatore"
        autocomplete="off"
        style="
          width: 100%;
          box-sizing: border-box;
          padding: 13px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 15px;
          outline: none;
          margin-bottom: 18px;
        "
      >

      <div style="
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      ">

        <button
          id="cancelProblemButton"
          style="
            border: 0;
            padding: 11px 18px;
            border-radius: 9px;
            background: #e2e8f0;
            color: #334155;
            font-weight: 700;
            cursor: pointer;
          "
        >
          ANNULLA
        </button>

        <button
          id="confirmProblemButton"
          style="
            border: 0;
            padding: 11px 18px;
            border-radius: 9px;
            background: #2563eb;
            color: white;
            font-weight: 700;
            cursor: pointer;
          "
        >
          PRENDI IN CARICO
        </button>

      </div>

    </div>

  `;


  document.body.appendChild(modal);


  const input =
    document.getElementById("problemOperatorInput");

  const cancelButton =
    document.getElementById("cancelProblemButton");

  const confirmButton =
    document.getElementById("confirmProblemButton");


  input.focus();


  function closeModal() {

    modal.remove();

  }


  cancelButton.addEventListener(
    "click",
    closeModal
  );


  confirmButton.addEventListener(
    "click",
    async () => {

      const assignedTo =
        input.value.trim();


      if (!assignedTo) {

        input.focus();

        return;

      }


      confirmButton.disabled = true;

      confirmButton.textContent =
        "SALVATAGGIO...";


      try {

        const response = await fetch(
          `/api/tasks/${taskId}/problem/take`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json"
            },

            body: JSON.stringify({

              assigned_to: assignedTo

            })
          }
        );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.error ||
            "Errore durante la presa in carico."
          );

        }


        closeModal();

        await loadDashboard();


      } catch (error) {

        console.error(error);

        confirmButton.disabled = false;

        confirmButton.textContent =
          "PRENDI IN CARICO";

        alert(error.message);

      }

    }
  );


  input.addEventListener(
    "keydown",
    (event) => {

      if (event.key === "Enter") {

        confirmButton.click();

      }


      if (event.key === "Escape") {

        closeModal();

      }

    }
  );

}

// ========================================
// RESOLVE PROBLEM
// ========================================

async function resolveProblem(taskId) {

  const modal = document.createElement("div");

  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.background = "rgba(15, 23, 42, 0.55)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "9999";

  modal.innerHTML = `

    <div style="
      width: min(420px, calc(100% - 40px));
      background: white;
      border-radius: 16px;
      padding: 28px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.25);
    ">

      <div style="
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 1px;
        color: #64748b;
        margin-bottom: 8px;
      ">
        CHIUSURA PROBLEMA
      </div>

      <h2 style="
        margin: 0 0 10px 0;
        color: #0f172a;
      ">
        Problema risolto?
      </h2>

      <p style="
        margin: 0 0 24px 0;
        color: #64748b;
        line-height: 1.5;
      ">
        Confermi che il problema della Task #${taskId}
        è stato risolto?
      </p>

      <div style="
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      ">

        <button
          id="cancelResolveButton"
          style="
            border: 0;
            padding: 11px 18px;
            border-radius: 9px;
            background: #e2e8f0;
            color: #334155;
            font-weight: 700;
            cursor: pointer;
          "
        >
          ANNULLA
        </button>

        <button
          id="confirmResolveButton"
          style="
            border: 0;
            padding: 11px 18px;
            border-radius: 9px;
            background: #16a34a;
            color: white;
            font-weight: 700;
            cursor: pointer;
          "
        >
          SÌ, RISOLTO
        </button>

      </div>

    </div>

  `;


  document.body.appendChild(modal);


  const cancelButton =
    document.getElementById("cancelResolveButton");

  const confirmButton =
    document.getElementById("confirmResolveButton");


  cancelButton.addEventListener(
    "click",
    () => {

      modal.remove();

    }
  );


  confirmButton.addEventListener(
    "click",
    async () => {

      confirmButton.disabled = true;

      confirmButton.textContent =
        "SALVATAGGIO...";


      try {

        const response = await fetch(
          `/api/tasks/${taskId}/problem/resolve`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json"
            }
          }
        );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.error ||
            "Errore durante la risoluzione del problema."
          );

        }


        modal.remove();

        await loadDashboard();


      } catch (error) {

        console.error(error);

        confirmButton.disabled = false;

        confirmButton.textContent =
          "SÌ, RISOLTO";

        alert(error.message);

      }

    }
  );

}


// ========================================
// PROBLEM LABEL
// ========================================

function formatProblemType(type) {

  const labels = {

    QUANTITA_ERRATA:
      "Quantità errata",

    ARTICOLO_MANCANTE:
      "Articolo mancante",

    ARTICOLO_DANNEGGIATO:
      "Articolo danneggiato",

    CODICE_ERRATO:
      "Codice errato",

    IMPOSSIBILE_COMPLETARE:
      "Impossibile completare",

    ALTRO:
      "Altro"

  };


  return labels[type] || "Problema";

}


// ========================================
// ESCAPE HTML
// ========================================

function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

// ========================================
// NUOVA TASK
// ========================================

async function openTaskModal() {

  const modal = document.getElementById("task-modal");
  const portSelect = document.getElementById("task-port");

  if (!modal || !portSelect) {
    console.error("Modal Nuova Task non trovato.");
    return;
  }

  portSelect.innerHTML = `
    <option value="">Caricamento porte...</option>
  `;

  portSelect.disabled = true;

  try {

    const response = await fetch("/api/ports");

    if (!response.ok) {
      throw new Error("Impossibile caricare le porte.");
    }

    const availablePorts = await response.json();

    portSelect.innerHTML = availablePorts
      .map(port => `
        <option value="${port.number}">
          Porta ${port.number}
        </option>
      `)
      .join("");

    portSelect.disabled = false;

  } catch (error) {

    console.error(error);

    portSelect.innerHTML = `
      <option value="">
        Errore caricamento porte
      </option>
    `;

    alert(
      "Non riesco a caricare le porte. Controlla che il server sia attivo."
    );

    return;
  }

  modal.classList.remove("hidden");

  setTimeout(() => {

    const titleInput =
      document.getElementById("task-title");

    if (titleInput) {
      titleInput.focus();
    }

  }, 50);
}


function closeTaskModal() {

  const modal =
    document.getElementById("task-modal");

  const form =
    document.getElementById("task-form");

  if (modal) {
    modal.classList.add("hidden");
  }

  if (form) {
    form.reset();

    const priority =
      document.getElementById("task-priority");

    if (priority) {
      priority.value = "NORMAL";
    }
  }
}


async function createTask(event) {

  event.preventDefault();

  const portNumber =
    Number(
      document.getElementById("task-port").value
    );

  const orderType =
    document.getElementById("task-order-type").value;

  const operationType =
    document.getElementById("task-operation-type").value;

  const orderNumber =
    document
      .getElementById("task-order-number")
      .value
      .trim();

  const itemCode =
    document
      .getElementById("task-item-code")
      .value
      .trim();

  const quantityValue =
    document
      .getElementById("task-quantity")
      .value;

  const quantity =
    quantityValue
      ? Number(quantityValue)
      : null;

  const title =
    document
      .getElementById("task-title")
      .value
      .trim();

  const description =
    document
      .getElementById("task-description")
      .value
      .trim();

  const priority =
    document
      .getElementById("task-priority")
      .value;

  const estimatedMinutes =
    Number(
      document
        .getElementById("task-time")
        .value
    );


  // ========================================
  // VALIDAZIONE
  // ========================================

  if (!portNumber) {

    alert("Seleziona una porta.");

    return;
  }


  if (!orderType) {

    alert("Seleziona il tipo di ordine.");

    return;
  }


  if (!operationType) {

    alert("Seleziona il tipo di operazione.");

    return;
  }


  if (
    orderType === "AMAZON_FBA" &&
    operationType !== "INSPECTION"
  ) {

    alert(
      "Per gli ordini Amazon FBA è disponibile solo INSPECTION."
    );

    return;
  }


  if (!title) {

    alert(
      "Inserisci cosa deve essere fatto."
    );

    return;
  }


  if (
    quantity !== null &&
    (
      !Number.isFinite(quantity) ||
      quantity <= 0
    )
  ) {

    alert(
      "Inserisci una quantità valida."
    );

    return;
  }


  if (
    !estimatedMinutes ||
    estimatedMinutes <= 0
  ) {

    alert(
      "Inserisci un tempo previsto valido."
    );

    return;
  }


  // ========================================
  // BUTTON
  // ========================================

  const submitButton =
    document.querySelector(
      '#task-form button[type="submit"]'
    );


  if (submitButton) {

    submitButton.disabled = true;

    submitButton.textContent =
      "CREAZIONE...";
  }


  // ========================================
  // CREAZIONE TASK
  // ========================================

  try {

    const response =
      await fetch(
        "/api/tasks",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({

            port_number:
              portNumber,

            order_type:
              orderType,

            operation_type:
              operationType,

            order_number:
              orderNumber || null,

            item_code:
              itemCode || null,

            quantity:
              quantity,

            title:
              title,

            description:
              description || null,

            priority:
              priority,

            estimated_minutes:
              estimatedMinutes

          })
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Errore durante la creazione della task."
      );
    }


    closeTaskModal();

    await loadDashboard();


  } catch (error) {

    console.error(
      "Errore creazione task:",
      error
    );

    alert(error.message);


  } finally {

    if (submitButton) {

      submitButton.disabled = false;

      submitButton.textContent =
        "CREA TASK";
    }
  }
}


// ========================================
// INIZIALIZZAZIONE FORM
// ========================================

function initializeTaskForm() {

  const form =
    document.getElementById("task-form");

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    createTask
  );
}


initializeTaskForm();

const orderTypeSelect =
  document.getElementById("task-order-type");

const operationTypeSelect =
  document.getElementById("task-operation-type");


if (
  orderTypeSelect &&
  operationTypeSelect
) {

  orderTypeSelect.addEventListener(
    "change",
    () => {

      if (
        orderTypeSelect.value === "AMAZON_FBA"
      ) {

        operationTypeSelect.value =
          "INSPECTION";

        operationTypeSelect.disabled =
          true;

      } else {

        operationTypeSelect.disabled =
          false;
      }

    }
  );

}


document.addEventListener(
  "keydown",
  (event) => {

    if (event.key !== "Escape") {
      return;
    }

    const modal =
      document.getElementById("task-modal");

    if (
      modal &&
      !modal.classList.contains("hidden")
    ) {

      closeTaskModal();
    }
  }
);


document.addEventListener(
  "click",
  (event) => {

    const modal =
      document.getElementById("task-modal");

    if (
      modal &&
      event.target === modal
    ) {

      closeTaskModal();
    }
  }
);

// ========================================
// TASK TIMER HELPERS
// ========================================

function isTaskOverdue(task) {

  if (
    !task ||
    task.status !== "IN_PROGRESS" ||
    !task.started_at
  ) {
    return false;
  }


  const startDate =
    parseServerDate(task.started_at);


  if (
    !startDate ||
    Number.isNaN(startDate.getTime())
  ) {
    return false;
  }


  const elapsedSeconds =
    Math.floor(
      (Date.now() - startDate.getTime()) / 1000
    );


  const estimatedSeconds =
    Number(task.estimated_minutes || 0) * 60;


  return (
    estimatedSeconds > 0 &&
    elapsedSeconds > estimatedSeconds
  );

}

// ========================================
// TASK TIMER
// ========================================

function parseServerDate(value) {

  if (!value) {
    return null;
  }

  // SQLite CURRENT_TIMESTAMP:
  // 2026-09-07 00:30:00

  // Lo convertiamo esplicitamente in UTC
  return new Date(
    value.replace(" ", "T") + "Z"
  );

}


function formatTimer(seconds) {

  seconds = Math.max(
    0,
    Math.floor(seconds)
  );

  const hours =
    Math.floor(seconds / 3600);

  const minutes =
    Math.floor(
      (seconds % 3600) / 60
    );

  const secs =
    seconds % 60;


  if (hours > 0) {

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  }


  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

}


function formatTimerMinutes(minutes) {

  const totalSeconds =
    Number(minutes || 0) * 60;

  return formatTimer(totalSeconds);

}


function updateTimers() {

  const timerElements =
    document.querySelectorAll(
      ".port-timer"
    );


  timerElements.forEach(timer => {

    const startedAt =
      timer.dataset.startedAt;

    const estimatedMinutes =
      Number(
        timer.dataset.estimatedMinutes
      );


    const startDate =
      parseServerDate(startedAt);


    if (
      !startDate ||
      Number.isNaN(
        startDate.getTime()
      )
    ) {
      return;
    }


    const elapsedSeconds =
      Math.max(
        0,
        Math.floor(
          (Date.now() - startDate.getTime()) /
          1000
        )
      );


    const estimatedSeconds =
      estimatedMinutes * 60;


    const percentage =
      estimatedSeconds > 0
        ? (
            elapsedSeconds /
            estimatedSeconds
          ) * 100
        : 0;


    const visualPercentage =
      Math.min(
        100,
        Math.max(0, percentage)
      );


    const value =
      timer.querySelector(
        ".port-timer-value"
      );


    const progress =
      timer.querySelector(
        ".port-timer-progress"
      );


    const status =
      timer.querySelector(
        ".port-timer-status"
      );


    if (value) {

      value.textContent =
        formatTimer(elapsedSeconds);

    }


    if (progress) {

      progress.style.width =
        `${visualPercentage}%`;

    }


    if (
      elapsedSeconds >
      estimatedSeconds
    ) {

      timer.classList.add(
        "timer-overdue"
      );


      if (status) {

        status.textContent =
          "⚠ IN RITARDO";

      }

    } else {

      timer.classList.remove(
        "timer-overdue"
      );


      if (status) {

        status.textContent =
          "IN CORSO";

      }

    }

  });


  // ========================================
  // AGGIORNA KPI RITARDI
  // ========================================

  const overdueCount =
    tasks.filter(task =>
      task.status === "IN_PROGRESS" &&
      task.started_at &&
      isTaskOverdue(task)
    ).length;


  const overdueKpi =
    document.querySelector(
      ".overdue-kpi strong"
    );


  if (overdueKpi) {

    overdueKpi.textContent =
      overdueCount;

  }


  // ========================================
  // AGGIORNA STATO PORTE
  // ========================================

  const currentOverduePorts =
    ports
      .filter(port => {

        const task =
          tasks.find(item =>
            item.port_number === port.number &&
            item.status === "IN_PROGRESS"
          );


        return (
          task &&
          task.started_at &&
          isTaskOverdue(task)
        );

      })
      .map(port => port.number)
      .sort()
      .join(",");


  const renderedOverduePorts =
    Array.from(
      document.querySelectorAll(
        ".port-card.overdue"
      )
    )
      .map(card =>
        Number(
          card.querySelector(
            ".port-main-number"
          )?.textContent
        )
      )
      .filter(Boolean)
      .sort()
      .join(",");


  const runningPortNumbers =
    ports
      .filter(port => {

        const task =
          tasks.find(item =>
            item.port_number === port.number &&
            item.status === "IN_PROGRESS"
          );

        return !!task;

      })
      .map(port => port.number)
      .sort()
      .join(",");


  const renderedRunningPortNumbers =
    Array.from(
      document.querySelectorAll(
        ".port-card"
      )
    )
      .filter(card =>
        card.querySelector(".port-timer")
      )
      .map(card =>
        Number(
          card.querySelector(
            ".port-main-number"
          )?.textContent
        )
      )
      .filter(Boolean)
      .sort()
      .join(",");


  if (
    currentOverduePorts !== renderedOverduePorts ||
    runningPortNumbers !== renderedRunningPortNumbers
  ) {

    renderDashboard();


    setTimeout(
      updateTimers,
      50
    );

  }

}


// Aggiorna il timer ogni secondo

setInterval(
  updateTimers,
  1000
);


// ========================================
// REALTIME WEBSOCKET
// ========================================

function connectWebSocket() {

  const protocol =
    window.location.protocol === "https:"
      ? "wss:"
      : "ws:";


  const socket = new WebSocket(
    `${protocol}//${window.location.host}`
  );


  socket.addEventListener("open", () => {

    console.log(
      "WebSocket connected."
    );

  });


  socket.addEventListener("message", (event) => {

    try {

      const data =
        JSON.parse(event.data);


      console.log(
        "WebSocket event:",
        data
      );


      if (

        data.type === "TASK_CREATED" ||

        data.type === "TASK_STATUS_UPDATED" ||

        data.type === "TASK_PROBLEM" ||

        data.type === "TASK_PROBLEM_TAKEN" ||

        data.type === "TASK_PROBLEM_RESOLVED"

      ) {

        loadDashboard();

      }


    } catch (error) {

      console.error(
        "WebSocket message error:",
        error
      );

    }

  });


  socket.addEventListener("close", () => {

    console.log(
      "WebSocket disconnected. Reconnecting..."
    );


    setTimeout(() => {

      connectWebSocket();

    }, 2000);

  });


  socket.addEventListener("error", (error) => {

    console.error(
      "WebSocket error:",
      error
    );

  });

}


// ========================================
// INITIAL LOAD
// ========================================

loadDashboard();

connectWebSocket();

setTimeout(
  updateTimers,
  100
);

// ============================================================
// IMPORT AMAZON EXCEL
// ============================================================

function openAmazonImportModal() {

  const modal = document.createElement("div");

  modal.id = "amazon-import-modal";

  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.background = "rgba(15, 23, 42, 0.60)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "9999";

  modal.innerHTML = `
    <div style="
      width: min(520px, calc(100% - 40px));
      background: white;
      border-radius: 18px;
      padding: 30px;
      box-shadow: 0 25px 70px rgba(0,0,0,0.25);
    ">

      <div style="
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 1px;
        color: #64748b;
        margin-bottom: 8px;
      ">
        IMPORTAZIONE ORDINE
      </div>

      <h2 style="
        margin: 0 0 8px 0;
        color: #0f172a;
      ">
        Importa ordine Amazon FBA
      </h2>

      <p style="
        margin: 0 0 24px 0;
        color: #64748b;
        line-height: 1.5;
      ">
        Carica il file Excel Amazon e scegli la porta
        alla quale assegnare l'ordine.
      </p>


      <label style="
        display: block;
        font-weight: 700;
        margin-bottom: 8px;
        color: #334155;
      ">
        Porta
      </label>

      <select
        id="amazon-import-port"
        style="
          width: 100%;
          box-sizing: border-box;
          padding: 12px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 15px;
          margin-bottom: 20px;
          background: white;
        "
      >
        <option value="">
          Caricamento porte...
        </option>
      </select>


      <label style="
        display: block;
        font-weight: 700;
        margin-bottom: 8px;
        color: #334155;
      ">
        File Excel Amazon
      </label>

      <input
        id="amazon-import-file"
        type="file"
        accept=".xlsx,.xls"
        style="
          width: 100%;
          box-sizing: border-box;
          padding: 12px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 14px;
          margin-bottom: 24px;
          background: #f8fafc;
        "
      >


      <div style="
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      ">

        <button
          id="amazon-import-cancel"
          style="
            border: 0;
            padding: 12px 18px;
            border-radius: 10px;
            background: #e2e8f0;
            color: #334155;
            font-weight: 700;
            cursor: pointer;
          "
        >
          ANNULLA
        </button>


        <button
          id="amazon-import-confirm"
          style="
            border: 0;
            padding: 12px 18px;
            border-radius: 10px;
            background: #2563eb;
            color: white;
            font-weight: 700;
            cursor: pointer;
          "
        >
          IMPORTA ORDINE
        </button>

      </div>

    </div>
  `;


  document.body.appendChild(modal);


  const portSelect =
    document.getElementById(
      "amazon-import-port"
    );

  const fileInput =
    document.getElementById(
      "amazon-import-file"
    );

  const cancelButton =
    document.getElementById(
      "amazon-import-cancel"
    );

  const confirmButton =
    document.getElementById(
      "amazon-import-confirm"
    );


  // ----------------------------------------------------------
  // CARICA PORTE
  // ----------------------------------------------------------

  fetch("/api/ports")
    .then(response => {

      if (!response.ok) {
        throw new Error(
          "Impossibile caricare le porte."
        );
      }

      return response.json();

    })
    .then(availablePorts => {

      portSelect.innerHTML =
        availablePorts
          .map(port => `
            <option value="${port.number}">
              Porta ${port.number}
            </option>
          `)
          .join("");

    })
    .catch(error => {

      console.error(error);

      portSelect.innerHTML = `
        <option value="">
          Errore caricamento porte
        </option>
      `;

    });


  // ----------------------------------------------------------
  // CHIUDI
  // ----------------------------------------------------------

  cancelButton.addEventListener(
    "click",
    () => {
      modal.remove();
    }
  );


  // ----------------------------------------------------------
  // IMPORTA
  // ----------------------------------------------------------

  confirmButton.addEventListener(
    "click",
    async () => {

      const portNumber =
        portSelect.value;

      const file =
        fileInput.files[0];


      if (!portNumber) {

        alert(
          "Seleziona una porta."
        );

        return;
      }


      if (!file) {

        alert(
          "Seleziona il file Excel Amazon."
        );

        return;
      }


      confirmButton.disabled = true;

      confirmButton.textContent =
        "IMPORTAZIONE...";


      try {

        const formData =
          new FormData();


        formData.append(
          "file",
          file
        );


        formData.append(
          "port_number",
          portNumber
        );


        const response =
          await fetch(
            "/api/tasks/import/amazon",
            {
              method: "POST",
              body: formData
            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.details ||
            data.error ||
            "Errore durante l'importazione Amazon."
          );

        }


        console.log(
          "Ordine Amazon importato:",
          data
        );


        modal.remove();


        await loadDashboard();


        alert(
          `Ordine Amazon ${data.task.order_number} importato correttamente nella porta ${data.task.port_number}.`
        );


      } catch (error) {

        console.error(
          "Errore importazione Amazon:",
          error
        );


        alert(
          error.message
        );


        confirmButton.disabled =
          false;

        confirmButton.textContent =
          "IMPORTA ORDINE";

      }

    }
  );


  // ----------------------------------------------------------
  // CLICK FUORI DAL MODALE
  // ----------------------------------------------------------

  modal.addEventListener(
    "click",
    event => {

      if (
        event.target === modal
      ) {

        modal.remove();

      }

    }
  );

}