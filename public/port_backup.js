// ========================================
// PORT PAGE - OPERATOR UI
// ========================================

const pathParts = window.location.pathname.split("/");
const portNumber = Number(pathParts[pathParts.length - 1]);

let currentTasks = [];


// ========================================
// LABELS
// ========================================

const priorityLabels = {
  LOW: "BASSA",
  NORMAL: "NORMALE",
  HIGH: "ALTA",
  URGENT: "URGENTE"
};

const statusLabels = {
  PENDING: "IN ATTESA",
  IN_PROGRESS: "IN CORSO",
  PROBLEM: "PROBLEMA",
  COMPLETED: "COMPLETATA",
  BLOCKED: "BLOCCATA",
  CANCELLED: "ANNULLATA"
};


// ========================================
// LOAD PORT
// ========================================

async function loadPort() {

  try {

    const response = await fetch(`/api/ports/${portNumber}`);

    if (!response.ok) {
      throw new Error("Porta non trovata");
    }

    const port = await response.json();

    renderPort(port);

  } catch (error) {

    console.error(error);

    document.getElementById("app").innerHTML = `
      <div class="page-error">
        <h2>Errore</h2>
        <p>Impossibile caricare la porta ${portNumber}.</p>
      </div>
    `;
  }
}


// ========================================
// LOAD TASKS
// ========================================

async function loadTasks() {

  try {

    const response = await fetch(
      `/api/ports/${portNumber}/tasks`
    );

    if (!response.ok) {
      throw new Error("Errore caricamento task");
    }

    currentTasks = await response.json();

    renderTasks(currentTasks);

  } catch (error) {

    console.error(error);

    const container = document.getElementById("tasks");

    if (container) {
      container.innerHTML = `
        <div class="page-error">
          <h2>Errore</h2>
          <p>Impossibile caricare le task.</p>
        </div>
      `;
    }
  }
}


// ========================================
// RENDER PORT
// ========================================

function renderPort(port) {

  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="operator-page">

      <header class="operator-header">

        <div>
          <div class="header-label">
            PICKING APP
          </div>

          <h1>${escapeHtml(port.name)}</h1>

          <div class="port-number">
            PORTA ${port.number}
          </div>
        </div>

        <div class="connection-status">
          <span class="connection-dot"></span>
          SISTEMA ONLINE
        </div>

      </header>


      <section class="operator-summary">

        <div class="summary-card">
          <span>ATTIVITÀ</span>
          <strong id="task-count">0</strong>
        </div>

        <div class="summary-card">
          <span>IN CORSO</span>
          <strong id="progress-count">0</strong>
        </div>

        <div class="summary-card">
          <span>PROBLEMI</span>
          <strong id="problem-count">0</strong>
        </div>

      </section>


      <main id="tasks">
        <div class="loading">
          Caricamento attività...
        </div>
      </main>

    </div>


    <!-- ================================= -->
    <!-- PROBLEM MODAL -->
    <!-- ================================= -->

    <div
      id="problem-modal"
      class="modal-overlay hidden"
    >

      <div class="problem-modal">

        <div class="modal-header">

          <div>
            <span class="modal-label">
              SEGNALAZIONE
            </span>

            <h2>Segnala un problema</h2>
          </div>

          <button
            class="close-modal"
            onclick="closeProblemModal()"
          >
            ×
          </button>

        </div>


        <div class="modal-task-info">
          <span>Task</span>
          <strong id="problem-task-id">#</strong>
        </div>


        <div class="problem-section">

          <label>
            Tipo di problema
          </label>

          <div class="problem-options">

            <button
              type="button"
              class="problem-option"
              data-problem="QUANTITA_ERRATA"
              onclick="selectProblemType(this)"
            >
              <span>🔢</span>
              <span>Quantità errata</span>
            </button>


            <button
              type="button"
              class="problem-option"
              data-problem="ARTICOLO_MANCANTE"
              onclick="selectProblemType(this)"
            >
              <span>📦</span>
              <span>Articolo mancante</span>
            </button>


            <button
              type="button"
              class="problem-option"
              data-problem="ARTICOLO_DANNEGGIATO"
              onclick="selectProblemType(this)"
            >
              <span>⚠️</span>
              <span>Articolo danneggiato</span>
            </button>


            <button
              type="button"
              class="problem-option"
              data-problem="CODICE_ERRATO"
              onclick="selectProblemType(this)"
            >
              <span>🏷️</span>
              <span>Codice errato</span>
            </button>


            <button
              type="button"
              class="problem-option"
              data-problem="IMPOSSIBILE_COMPLETARE"
              onclick="selectProblemType(this)"
            >
              <span>🚫</span>
              <span>Impossibile completare</span>
            </button>


            <button
              type="button"
              class="problem-option"
              data-problem="ALTRO"
              onclick="selectProblemType(this)"
            >
              <span>📝</span>
              <span>Altro</span>
            </button>

          </div>

        </div>


        <div class="problem-section">

          <label for="problem-description">
            Descrizione
          </label>

          <textarea
            id="problem-description"
            rows="4"
            placeholder="Descrivi il problema..."
          ></textarea>

        </div>


        <div class="modal-actions">

          <button
            class="secondary-button"
            onclick="closeProblemModal()"
          >
            ANNULLA
          </button>

          <button
            class="danger-button"
            onclick="submitProblem()"
          >
            ⚠ INVIA SEGNALAZIONE
          </button>

        </div>

      </div>

    </div>
  `;

}


// ========================================
// RENDER TASKS
// ========================================

function renderTasks(tasks) {

  const container = document.getElementById("tasks");

  if (!container) {
    return;
  }


  updateSummary(tasks);


  if (!tasks.length) {

    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">
          ✓
        </div>

        <h2>Nessuna attività</h2>

        <p>
          Non ci sono task assegnate a questa porta.
        </p>

      </div>
    `;

    return;
  }


  container.innerHTML = tasks
    .map(task => createTaskCard(task))
    .join("");
}


// ========================================
// SUMMARY
// ========================================

function updateSummary(tasks) {

  const activeTasks = tasks.filter(
    task =>
      task.status !== "COMPLETED" &&
      task.status !== "CANCELLED"
  );

  const inProgress = tasks.filter(
    task => task.status === "IN_PROGRESS"
  );

  const problems = tasks.filter(
    task => task.status === "PROBLEM"
  );


  const taskCount = document.getElementById("task-count");
  const progressCount = document.getElementById("progress-count");
  const problemCount = document.getElementById("problem-count");


  if (taskCount) {
    taskCount.textContent = activeTasks.length;
  }

  if (progressCount) {
    progressCount.textContent = inProgress.length;
  }

  if (problemCount) {
    problemCount.textContent = problems.length;
  }
}


// ========================================
// TASK CARD
// ========================================

function createTaskCard(task) {

  const priority =
    priorityLabels[task.priority] ||
    task.priority;


  const status =
    statusLabels[task.status] ||
    task.status;


  let actionArea = "";


  // ------------------------------------
  // PENDING
  // ------------------------------------

  if (task.status === "PENDING") {

    actionArea = `
      <button
        class="primary-task-button"
        onclick="startTask(${task.id})"
      >
        ▶ INIZIA TASK
      </button>
    `;
  }


  // ------------------------------------
  // IN PROGRESS
  // ------------------------------------

  else if (task.status === "IN_PROGRESS") {

    actionArea = `
      <div class="task-actions">

        <button
          class="success-task-button"
          onclick="completeTask(${task.id})"
        >
          ✓ ORDINE OK
        </button>

        <button
          class="problem-task-button"
          onclick="openProblemModal(${task.id})"
        >
          ⚠ PROBLEMA
        </button>

      </div>
    `;
  }


  // ------------------------------------
  // PROBLEM
  // ------------------------------------

  else if (task.status === "PROBLEM") {

    actionArea = `
      <div class="problem-banner">
        <span>⚠</span>
        <div>
          <strong>PROBLEMA SEGNALATO</strong>

          ${
            task.problem_type
              ? `<small>${formatProblemType(task.problem_type)}</small>`
              : ""
          }
        </div>
      </div>
    `;
  }


  // ------------------------------------
  // COMPLETED
  // ------------------------------------

  else if (task.status === "COMPLETED") {

    actionArea = `
      <div class="completed-banner">
        ✓ TASK COMPLETATA
      </div>
    `;
  }


  return `
    <article
      class="task-card status-${task.status.toLowerCase()}"
    >

      <div class="task-card-header">

        <div class="task-number">
          TASK #${task.id}
        </div>

        <div class="priority-badge priority-${task.priority}">
          ${priority}
        </div>

      </div>


      <div class="task-main">

        <div class="task-operation">

          <span class="section-label">
            OPERAZIONE
          </span>

          <h2>
            ${escapeHtml(task.title)}
          </h2>

          ${
            task.description
              ? `
                <p>
                  ${escapeHtml(task.description)}
                </p>
              `
              : ""
          }

        </div>


        <div class="task-info-grid">

          ${
            task.order_number
              ? `
                <div class="info-box">

                  <span>ORDINE</span>

                  <strong>
                    ${escapeHtml(task.order_number)}
                  </strong>

                </div>
              `
              : ""
          }


          ${
            task.item_code
              ? `
                <div class="info-box">

                  <span>ARTICOLO</span>

                  <strong>
                    ${escapeHtml(task.item_code)}
                  </strong>

                </div>
              `
              : ""
          }


          ${
            task.quantity !== null &&
            task.quantity !== undefined
              ? `
                <div class="info-box quantity-box">

                  <span>QUANTITÀ</span>

                  <strong>
                    ${task.quantity}
                  </strong>

                </div>
              `
              : ""
          }


          <div class="info-box">

            <span>TEMPO PREVISTO</span>

            <strong>
              ${task.estimated_minutes} min
            </strong>

          </div>

        </div>


        <div class="task-status-row">

          <div>
            <span>STATO</span>
            <strong>${status}</strong>
          </div>

          ${
            task.started_at
              ? `
                <div>
                  <span>AVVIATA</span>
                  <strong>
                    ${formatDate(task.started_at)}
                  </strong>
                </div>
              `
              : ""
          }

        </div>

        ${
  task.status === "IN_PROGRESS" && task.started_at
    ? `
      <div
        class="task-timer"
        data-started-at="${task.started_at}"
        data-estimated-minutes="${task.estimated_minutes}"
      >

        <div class="task-timer-header">

          <div>
            <span class="timer-label">
              TEMPO DI LAVORAZIONE
            </span>

            <strong class="task-timer-value">
              00:00
            </strong>
          </div>

          <div class="task-timer-status">
            IN CORSO
          </div>

        </div>


        <div class="task-timer-bar">

          <div
            class="task-timer-progress"
            style="width: 0%"
          ></div>

        </div>


        <div class="task-timer-footer">

          <span>
            Previsto:
            ${formatTimerMinutes(task.estimated_minutes)}
          </span>

          <span class="task-timer-percentage">
            0%
          </span>

        </div>

      </div>
    `
    : ""
}
        ${actionArea}

      </div>

    </article>
  `;
}


// ========================================
// START TASK
// ========================================

async function startTask(taskId) {

  try {

    const response = await fetch(
      `/api/tasks/${taskId}/status`,
      {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          status: "IN_PROGRESS"
        })
      }
    );


    const result = await response.json();


    if (!response.ok) {

      alert(
        result.error ||
        "Errore durante l'avvio della task."
      );

      return;
    }


    await loadTasks();

  } catch (error) {

    console.error(error);

    alert(
      "Impossibile comunicare con il server."
    );
  }
}


// ========================================
// COMPLETE TASK
// ========================================

async function completeTask(taskId) {

  const confirmed = confirm(
    "Confermi che l'ordine è completamente corretto?"
  );


  if (!confirmed) {
    return;
  }


  try {

    const response = await fetch(
      `/api/tasks/${taskId}/status`,
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

      alert(
        result.error ||
        "Errore durante il completamento."
      );

      return;
    }


    await loadTasks();

  } catch (error) {

    console.error(error);

    alert(
      "Impossibile comunicare con il server."
    );
  }
}


// ========================================
// PROBLEM MODAL
// ========================================

let selectedProblemType = null;
let selectedTaskId = null;


function openProblemModal(taskId) {

  selectedTaskId = taskId;
  selectedProblemType = null;


  const task = currentTasks.find(
    item => item.id === taskId
  );


  const modal = document.getElementById(
    "problem-modal"
  );


  const taskIdElement = document.getElementById(
    "problem-task-id"
  );


  const description = document.getElementById(
    "problem-description"
  );


  if (taskIdElement) {
    taskIdElement.textContent =
      task
        ? `#${task.id}`
        : `#${taskId}`;
  }


  if (description) {
    description.value = "";
  }


  document
    .querySelectorAll(".problem-option")
    .forEach(button => {
      button.classList.remove("selected");
    });


  modal.classList.remove("hidden");
}


// ========================================
// CLOSE MODAL
// ========================================

function closeProblemModal() {

  const modal = document.getElementById(
    "problem-modal"
  );

  if (modal) {
    modal.classList.add("hidden");
  }


  selectedProblemType = null;
  selectedTaskId = null;
}


// ========================================
// SELECT PROBLEM
// ========================================

function selectProblemType(button) {

  document
    .querySelectorAll(".problem-option")
    .forEach(item => {
      item.classList.remove("selected");
    });


  button.classList.add("selected");

  selectedProblemType =
    button.dataset.problem;
}


// ========================================
// SUBMIT PROBLEM
// ========================================

async function submitProblem() {

  if (!selectedTaskId) {

    alert("Task non selezionata.");

    return;
  }


  if (!selectedProblemType) {

    alert(
      "Seleziona prima il tipo di problema."
    );

    return;
  }


  const descriptionElement =
    document.getElementById(
      "problem-description"
    );


  const description =
    descriptionElement
      ? descriptionElement.value.trim()
      : "";


  try {

    const response = await fetch(
      `/api/tasks/${selectedTaskId}/problem`,
      {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          problem_type:
            selectedProblemType,

          problem_description:
            description

        })
      }
    );


    const result = await response.json();


    if (!response.ok) {

      alert(
        result.error ||
        "Errore durante la segnalazione."
      );

      return;
    }


    closeProblemModal();

    await loadTasks();

  } catch (error) {

    console.error(error);

    alert(
      "Impossibile comunicare con il server."
    );
  }
}

// ========================================
// TASK TIMER
// ========================================

function parseServerDate(value) {

  if (!value) {
    return null;
  }

  return new Date(
    value.replace(" ", "T") + "Z"
  );

}


function formatTimer(totalSeconds) {

  totalSeconds = Math.max(
    0,
    Math.floor(totalSeconds)
  );


  const hours =
    Math.floor(totalSeconds / 3600);


  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60
    );


  const seconds =
    totalSeconds % 60;


  if (hours > 0) {

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  }


  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

}


function formatTimerMinutes(minutes) {

  return formatTimer(
    Number(minutes || 0) * 60
  );

}


function updateTaskTimers() {

  const timers =
    document.querySelectorAll(
      ".task-timer"
    );


  timers.forEach(timer => {

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
      Math.floor(
        (
          Date.now() -
          startDate.getTime()
        ) / 1000
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
        ".task-timer-value"
      );


    const progress =
      timer.querySelector(
        ".task-timer-progress"
      );


    const status =
      timer.querySelector(
        ".task-timer-status"
      );


    const percentageElement =
      timer.querySelector(
        ".task-timer-percentage"
      );


    // -----------------------------
    // TEMPO
    // -----------------------------

    if (value) {

      value.textContent =
        formatTimer(
          elapsedSeconds
        );

    }


    // -----------------------------
    // PROGRESS BAR
    // -----------------------------

    if (progress) {

      progress.style.width =
        `${visualPercentage}%`;

    }


    // -----------------------------
    // PERCENTUALE
    // -----------------------------

    if (percentageElement) {

      percentageElement.textContent =
        `${Math.floor(percentage)}%`;

    }


    // -----------------------------
    // RITARDO
    // -----------------------------

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

}


// Aggiornamento ogni secondo

setInterval(
  updateTaskTimers,
  1000
);


// ========================================
// FORMAT PROBLEM
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


  return labels[type] || type;
}


// ========================================
// FORMAT DATE
// ========================================

function formatDate(value) {

  if (!value) {
    return "";
  }


  const date = new Date(
    value.replace(" ", "T") + "Z"
  );


  if (Number.isNaN(date.getTime())) {
    return value;
  }


  return date.toLocaleTimeString(
    "it-IT",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
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
// CLOSE MODAL WITH ESC
// ========================================

document.addEventListener(
  "keydown",
  event => {

    if (event.key === "Escape") {
      closeProblemModal();
    }

  }
);


// ========================================
// INITIAL LOAD
// ========================================

loadPort();
loadTasks();
setTimeout(
  updateTaskTimers,
  100
);