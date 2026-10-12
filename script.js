
const STORAGE_KEY = "my-todo-list-tasks";

const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const dueDateInput = document.querySelector("#task-due-date");
const dueTimeInput = document.querySelector("#task-due-time");
const priorityInput = document.querySelector("#task-priority");

const taskList = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const taskCount = document.querySelector("#task-count");
const completionSummary = document.querySelector("#completion-summary");
const clearCompletedButton = document.querySelector("#clear-completed");
const filterButtons = document.querySelectorAll(".filter-button");

// Dashboard elements
const totalTasksElement = document.querySelector("#total-tasks");
const pendingTasksElement = document.querySelector("#pending-tasks");
const completedTasksElement = document.querySelector("#completed-tasks");
const completionRateElement = document.querySelector("#completion-rate");
const progressLabel = document.querySelector("#progress-label");
const progressFill = document.querySelector("#progress-fill");
const progressTrack = document.querySelector("#progress-track");

let tasks = loadTasks();
let currentFilter = "all";

function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    const parsedTasks = savedTasks ? JSON.parse(savedTasks) : [];

    if (!Array.isArray(parsedTasks)) return [];

    // Old tasks without deadlines remain compatible.
    return parsedTasks.map(task => ({
      ...task,
      dueDate: task.dueDate || "",
      dueTime: task.dueTime || ""
    }));
  } catch (error) {
    console.error("Could not load tasks:", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error("Could not save tasks:", error);
    alert("Tasks could not be saved. Check browser storage settings.");
  }
}

function createTask(text, dueDate, dueTime, priority) {
  return {
    id: (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    completed: false,
    dueDate,
    dueTime,
    priority: priority || "medium"
  };
}

function getDeadlineStatus(task) {
  if (!task.dueDate) return null;

  const dateTime = task.dueTime
    ? `${task.dueDate}T${task.dueTime}:00`
    : `${task.dueDate}T23:59:59`;

  const deadline = new Date(dateTime);

  if (Number.isNaN(deadline.getTime())) return null;

  if (task.completed) {
    return { label: "Completed", className: "deadline-completed" };
  }

  if (deadline.getTime() < Date.now()) {
    return { label: "Overdue", className: "deadline-overdue" };
  }

  const today = new Date();
  const deadlineDay = new Date(
    deadline.getFullYear(),
    deadline.getMonth(),
    deadline.getDate()
  );
  const todayDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  if (deadlineDay.getTime() === todayDay.getTime()) {
    return { label: "Due today", className: "deadline-today" };
  }

  return { label: "Upcoming", className: "deadline-upcoming" };
}

function formatDeadline(task) {
  if (!task.dueDate) return "";

  const date = new Date(`${task.dueDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  const dateText = date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  if (!task.dueTime) return dateText;

  const [hours, minutes] = task.dueTime.split(":").map(Number);
  const timeText = new Date(2000, 0, 1, hours, minutes)
    .toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit"
    });

  return `${dateText} at ${timeText}`;
}

function updateDashboard() {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  const pending = total - completed;
  const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

  totalTasksElement.textContent = total;
  pendingTasksElement.textContent = pending;
  completedTasksElement.textContent = completed;
  completionRateElement.textContent = `${rate}%`;
  progressLabel.textContent = `${rate}%`;
  progressFill.style.width = `${rate}%`;
  progressTrack.setAttribute("aria-valuenow", String(rate));
}

function renderTasks() {
  taskList.replaceChildren();

  const visibleTasks = tasks.filter(task => {
    if (currentFilter === "pending") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true;
  });

  visibleTasks.forEach(task => {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " completed" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute(
      "aria-label",
      `Mark ${task.text} as ${task.completed ? "pending" : "completed"}`
    );
    checkbox.addEventListener("change", () => toggleTask(task.id));

    const content = document.createElement("div");
    content.className = "task-content";

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;
    content.append(text);

   const priorityBadge = document.createElement("span");

const priority = ["high", "medium", "low"].includes(task.priority)
  ? task.priority
  : "medium";

priorityBadge.className = `priority-badge priority-${priority}`;
priorityBadge.textContent =
  `${priority.charAt(0).toUpperCase()}${priority.slice(1)} Priority`;

content.append(priorityBadge);

    if (task.dueDate) {
      const deadlineInfo = document.createElement("div");
      deadlineInfo.className = "deadline-info";

      const dateText = document.createElement("span");
      dateText.className = "deadline-date";
      dateText.textContent = `📅 ${formatDeadline(task)}`;

      deadlineInfo.append(dateText);

      const status = getDeadlineStatus(task);
      if (status) {
        const badge = document.createElement("span");
        badge.className = `deadline-badge ${status.className}`;
        badge.textContent = status.label;
        deadlineInfo.append(badge);
      }

      content.append(deadlineInfo);
    }

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "icon-button";
    editButton.textContent = "✎";
    editButton.title = "Edit task";
    editButton.setAttribute("aria-label", `Edit ${task.text}`);
    editButton.addEventListener("click", () => editTask(task.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-button delete";
    deleteButton.textContent = "×";
    deleteButton.title = "Delete task";
    deleteButton.setAttribute("aria-label", `Delete ${task.text}`);
    deleteButton.addEventListener("click", () => deleteTask(task.id));

    actions.append(editButton, deleteButton);
    item.append(checkbox, content, actions);
    taskList.append(item);
  });

  const pendingCount = tasks.filter(task => !task.completed).length;
  const completedCount = tasks.length - pendingCount;

  taskCount.textContent =
    `${pendingCount} ${pendingCount === 1 ? "task" : "tasks"} left`;

  completionSummary.textContent = `${completedCount} completed`;
  emptyState.hidden = visibleTasks.length > 0;
  clearCompletedButton.disabled = completedCount === 0;

  updateDashboard();
}


function addTask(text, dueDate, dueTime, priority) {
  tasks.unshift(createTask(text, dueDate, dueTime, priority));
  saveTasks();
  renderTasks();
}

function toggleTask(id) {
  tasks = tasks.map(task =>
    task.id === id
      ? { ...task, completed: !task.completed }
      : task
  );

  saveTasks();
  renderTasks();
}

function editTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  const updatedText = prompt("Edit your task:", task.text);
  if (updatedText === null) return;

  const cleanText = updatedText.trim();
  if (!cleanText) {
    alert("Task cannot be empty.");
    return;
  }

  const updatedDate = prompt(
    "Enter due date (YYYY-MM-DD), or leave blank:",
    task.dueDate || ""
  );
  if (updatedDate === null) return;

  const updatedTime = prompt(
    "Enter due time (HH:MM), or leave blank:",
    task.dueTime || ""
  );
  if (updatedTime === null) return;

  if (updatedDate && !/^\\d{4}-\\d{2}-\\d{2}$/.test(updatedDate)) {
    alert("Please enter the date in YYYY-MM-DD format.");
    return;
  }

  if (updatedTime && !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(updatedTime)) {
    alert("Please enter the time in HH:MM format.");
    return;
  }

  tasks = tasks.map(item =>
    item.id === id
      ? {
          ...item,
          text: cleanText.slice(0, 160),
          dueDate: updatedDate,
          dueTime: updatedTime
        }
      : item
  );

  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(task => task.id !== id);
  saveTasks();
  renderTasks();
}

taskForm.addEventListener("submit", event => {
  event.preventDefault();

  const text = taskInput.value.trim();
  if (!text) {
    taskInput.focus();
    return;
  }

  const dueDate = dueDateInput.value;
  const dueTime = dueTimeInput.value;

  if (dueTime && !dueDate) {
    alert("Please select a due date when setting a due time.");
    dueDateInput.focus();
    return;
  }

  const priority = priorityInput.value;

addTask(text, dueDate, dueTime, priority);

taskInput.value = "";
dueDateInput.value = "";
dueTimeInput.value = "";
priorityInput.value = "medium";

taskInput.focus();
});

filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;

    filterButtons.forEach(item => {
      const isActive = item === button;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    renderTasks();
  });
});

clearCompletedButton.addEventListener("click", () => {
  tasks = tasks.filter(task => !task.completed);
  saveTasks();
  renderTasks();
});

// Refresh deadline status when the page is reopened or becomes active.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) renderTasks();
});

renderTasks();
