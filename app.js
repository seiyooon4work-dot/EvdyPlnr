const STORAGE_KEY = "daylist-planner-v1";
const DAY_NAMES = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
const DAY_SHORT_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
const ENERGY_LABELS = {
  1: "천천히 회복하는 날",
  2: "조용히 흐르는 날",
  3: "균형을 찾는 날",
  4: "가볍게 나아가는 날",
  5: "마음이 꽉 찬 날",
};

const today = new Date();
const state = {
  entries: loadEntries(),
  selectedDate: toISODate(today),
  calendarDate: new Date(today.getFullYear(), today.getMonth(), 1),
  view: "today",
};

let saveTimer;
let toastTimer;

const elements = {
  todayView: document.querySelector("#todayView"),
  calendarView: document.querySelector("#calendarView"),
  insightsView: document.querySelector("#insightsView"),
  todayWeekday: document.querySelector("#todayWeekday"),
  todayDateLabel: document.querySelector("#todayDateLabel"),
  heroKicker: document.querySelector("#heroKicker"),
  heroMessage: document.querySelector("#heroMessage"),
  heroDayNumber: document.querySelector("#heroDayNumber"),
  focusInput: document.querySelector("#focusInput"),
  noteInput: document.querySelector("#noteInput"),
  noteCount: document.querySelector("#noteCount"),
  taskForm: document.querySelector("#taskForm"),
  taskInput: document.querySelector("#taskInput"),
  taskList: document.querySelector("#taskList"),
  taskEmpty: document.querySelector("#taskEmpty"),
  taskProgress: document.querySelector("#taskProgress"),
  energyPicker: document.querySelector("#energyPicker"),
  energyFeedback: document.querySelector("#energyFeedback"),
  calendarMonthLabel: document.querySelector("#calendarMonthLabel"),
  calendarGrid: document.querySelector("#calendarGrid"),
  selectedDayTitle: document.querySelector("#selectedDayTitle"),
  selectedDaySummary: document.querySelector("#selectedDaySummary"),
  selectedDayDone: document.querySelector("#selectedDayDone"),
  selectedDayEnergy: document.querySelector("#selectedDayEnergy"),
  weekChart: document.querySelector("#weekChart"),
  weekChartCount: document.querySelector("#weekChartCount"),
  insightHeadline: document.querySelector("#insightHeadline"),
  insightSubline: document.querySelector("#insightSubline"),
  insightScore: document.querySelector("#insightScore"),
  metricLoggedDays: document.querySelector("#metricLoggedDays"),
  metricDoneTasks: document.querySelector("#metricDoneTasks"),
  metricStreak: document.querySelector("#metricStreak"),
  sidebarLoggedDays: document.querySelector("#sidebarLoggedDays"),
  sidebarDoneTasks: document.querySelector("#sidebarDoneTasks"),
  backupModal: document.querySelector("#backupModal"),
  backupSummary: document.querySelector("#backupSummary"),
  importInput: document.querySelector("#importInput"),
  toast: document.querySelector("#toast"),
};

function createEmptyEntry() {
  return { focus: "", tasks: [], note: "", energy: null };
}

function loadEntries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const source = parsed.entries && typeof parsed.entries === "object" ? parsed.entries : parsed;
    return Object.fromEntries(
      Object.entries(source || {}).map(([date, entry]) => [date, normalizeEntry(entry)]),
    );
  } catch {
    return {};
  }
}

function normalizeEntry(entry) {
  const tasks = Array.isArray(entry?.tasks) ? entry.tasks : [];
  return {
    focus: typeof entry?.focus === "string" ? entry.focus : "",
    tasks: tasks
      .filter((task) => task && typeof task.text === "string")
      .map((task) => ({
        id: String(task.id || createId()),
        text: task.text.slice(0, 120),
        done: Boolean(task.done),
      })),
    note: typeof entry?.note === "string" ? entry.note : "",
    energy: Number.isInteger(entry?.energy) && entry.energy >= 1 && entry.energy <= 5 ? entry.energy : null,
  };
}

function getEntry(date = state.selectedDate) {
  if (!state.entries[date]) state.entries[date] = createEmptyEntry();
  return state.entries[date];
}

function saveEntries() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), entries: state.entries }),
    );
  } catch {
    showToast("이 브라우저에서는 자동 저장을 사용할 수 없어요.");
  }
}

function queueSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveEntries, 180);
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function shiftDate(value, amount) {
  const date = parseISODate(value);
  date.setDate(date.getDate() + amount);
  return toISODate(date);
}

function formatDateLabel(value) {
  const date = parseISODate(value);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatMonthLabel(date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function hasEntry(entry) {
  return Boolean(entry && (entry.focus.trim() || entry.note.trim() || entry.tasks.length || entry.energy));
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderAll() {
  renderView();
  renderToday();
  renderCalendar();
  renderInsights();
  renderSidebarStats();
  updateDocumentTitle();
}

function renderView() {
  const views = { today: elements.todayView, calendar: elements.calendarView, insights: elements.insightsView };
  Object.entries(views).forEach(([name, element]) => {
    const active = name === state.view;
    element.hidden = !active;
    element.classList.toggle("is-active", active);
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.view);
  });
}

function renderToday() {
  const entry = getEntry();
  const date = parseISODate(state.selectedDate);
  const isToday = state.selectedDate === toISODate(today);
  const isFuture = state.selectedDate > toISODate(today);
  const dayNumber = String(date.getDate()).padStart(2, "0");

  elements.todayWeekday.textContent = isToday ? "오늘" : DAY_NAMES[date.getDay()];
  elements.todayDateLabel.textContent = formatDateLabel(state.selectedDate);
  elements.heroDayNumber.textContent = dayNumber;
  elements.heroKicker.textContent = isToday ? "TODAY · 기록을 시작해보세요" : `${DAY_SHORT_NAMES[date.getDay()].toUpperCase()} · ${date.getMonth() + 1}월의 기록`;
  elements.heroMessage.textContent = isToday
    ? "완벽하게 채우지 않아도 괜찮아요. 오늘 남기고 싶은 한 가지부터 적어보세요."
    : isFuture
      ? "미리 적어두고 싶은 일을 남겨보세요. 그날의 나에게 도움이 될 거예요."
      : "그날의 나에게 잠시 다녀왔어요. 남겨둔 기록을 천천히 다시 펼쳐보세요.";

  if (document.activeElement !== elements.focusInput) elements.focusInput.value = entry.focus;
  if (document.activeElement !== elements.noteInput) elements.noteInput.value = entry.note;
  elements.noteCount.textContent = `${entry.note.length}자`;
  renderTasks(entry);
  renderEnergy(entry);
}

function renderTasks(entry) {
  const doneCount = entry.tasks.filter((task) => task.done).length;
  elements.taskProgress.textContent = `${doneCount} / ${entry.tasks.length}`;
  elements.taskEmpty.hidden = entry.tasks.length > 0;
  elements.taskList.innerHTML = entry.tasks
    .map(
      (task) => `
        <li class="task-item${task.done ? " is-done" : ""}">
          <button class="task-check${task.done ? " is-done" : ""}" type="button" data-task-toggle="${escapeHTML(task.id)}" aria-label="${task.done ? "완료 취소" : "완료 처리"}: ${escapeHTML(task.text)}"><span>✓</span></button>
          <span class="task-text" title="${escapeHTML(task.text)}">${escapeHTML(task.text)}</span>
          <button class="task-delete" type="button" data-task-delete="${escapeHTML(task.id)}" aria-label="할 일 삭제">×</button>
        </li>`,
    )
    .join("");
}

function renderEnergy(entry) {
  elements.energyPicker.querySelectorAll("[data-energy]").forEach((button) => {
    const selected = Number(button.dataset.energy) === entry.energy;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  elements.energyFeedback.textContent = entry.energy ? `${entry.energy} · ${ENERGY_LABELS[entry.energy]}` : "아직 선택하지 않았어요.";
}

function renderCalendar() {
  elements.calendarMonthLabel.textContent = formatMonthLabel(state.calendarDate);
  const firstDay = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(1 - firstDay.getDay());
  const month = state.calendarDate.getMonth();
  const todayISO = toISODate(today);
  const cells = [];

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const iso = toISODate(date);
    const entry = state.entries[iso];
    const isOutside = date.getMonth() !== month;
    const isToday = iso === todayISO;
    const isSelected = iso === state.selectedDate;
    const markerNote = hasEntry(entry);
    const markerDone = entry?.tasks?.some((task) => task.done);
    cells.push(`
      <button class="calendar-day${isOutside ? " is-outside" : ""}${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}" type="button" role="gridcell" data-calendar-date="${iso}" aria-label="${formatDateLabel(iso)}${markerNote ? ", 기록 있음" : ""}">
        <span class="day-number">${date.getDate()}</span>
        <span class="day-markers" aria-hidden="true">${markerNote ? '<i class="has-note"></i>' : ""}${markerDone ? '<i class="is-complete"></i>' : ""}</span>
      </button>`);
  }
  elements.calendarGrid.innerHTML = cells.join("");

  const selectedEntry = getEntry(state.selectedDate);
  const done = selectedEntry.tasks.filter((task) => task.done).length;
  elements.selectedDayTitle.textContent = formatDateLabel(state.selectedDate);
  elements.selectedDaySummary.textContent = selectedEntry.focus.trim() || selectedEntry.note.trim() || (selectedEntry.tasks.length ? `${selectedEntry.tasks.length}개의 할 일이 있어요.` : "아직 기록이 없어요.");
  elements.selectedDayDone.textContent = `${done} / ${selectedEntry.tasks.length}`;
  elements.selectedDayEnergy.textContent = selectedEntry.energy ? `${selectedEntry.energy} / 5` : "—";
}

function getLastSevenDates(endValue = toISODate(today)) {
  return Array.from({ length: 7 }, (_, index) => shiftDate(endValue, index - 6));
}

function getStats() {
  const dates = getLastSevenDates();
  const entries = dates.map((date) => ({ date, entry: state.entries[date] }));
  const loggedDays = entries.filter(({ entry }) => hasEntry(entry)).length;
  const doneTasks = entries.reduce((sum, { entry }) => sum + (entry?.tasks?.filter((task) => task.done).length || 0), 0);
  let streak = 0;
  for (let index = dates.length - 1; index >= 0; index -= 1) {
    if (!hasEntry(state.entries[dates[index]])) break;
    streak += 1;
  }
  return { dates, entries, loggedDays, doneTasks, streak };
}

function renderSidebarStats() {
  const stats = getStats();
  elements.sidebarLoggedDays.textContent = stats.loggedDays;
  elements.sidebarDoneTasks.textContent = stats.doneTasks;
}

function renderInsights() {
  const stats = getStats();
  elements.insightScore.textContent = stats.loggedDays;
  elements.weekChartCount.textContent = `${stats.loggedDays}일`;
  elements.metricLoggedDays.textContent = `${stats.loggedDays}일`;
  elements.metricDoneTasks.textContent = `${stats.doneTasks}개`;
  elements.metricStreak.textContent = `${stats.streak}일`;
  elements.insightHeadline.textContent = stats.loggedDays === 0 ? "오늘부터 나의 리듬을 시작해요." : stats.loggedDays >= 5 ? "꾸준함이 조용히 빛나고 있어요." : "나만의 속도로 잘 가고 있어요.";
  elements.insightSubline.textContent = stats.loggedDays === 0 ? "짧은 한 줄도 이 페이지에서는 충분한 기록이에요." : `${stats.loggedDays}일의 기록이 지난 한 주를 만들었어요.`;
  elements.weekChart.innerHTML = stats.entries
    .map(({ date, entry }) => {
      const logged = hasEntry(entry);
      const done = entry?.tasks?.filter((task) => task.done).length || 0;
      const taskTotal = entry?.tasks?.length || 0;
      const amount = logged ? Math.max(24, Math.min(100, 35 + done * 14 + (entry?.focus?.trim() ? 20 : 0) + (entry?.note?.trim() ? 12 : 0))) : 8;
      const isToday = date === toISODate(today);
      return `<div class="week-bar-group" title="${formatDateLabel(date)}"><div class="week-bar-track"><span class="week-bar${logged ? " has-entry" : ""}${isToday ? " is-today" : ""}" style="height:${amount}%"></span></div><span class="week-bar-label${isToday ? " is-today" : ""}">${DAY_SHORT_NAMES[parseISODate(date).getDay()]}${taskTotal ? ` · ${done}` : ""}</span></div>`;
    })
    .join("");
}

function updateDocumentTitle() {
  document.title = state.view === "today" ? `${formatDateLabel(state.selectedDate)} · 하루기록` : state.view === "calendar" ? "달력 · 하루기록" : "기록 돌아보기 · 하루기록";
}

function switchView(view) {
  if (!["today", "calendar", "insights"].includes(view)) return;
  state.view = view;
  renderAll();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function selectDate(date, openToday = false) {
  state.selectedDate = date;
  const parsed = parseISODate(date);
  state.calendarDate = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
  if (openToday) state.view = "today";
  renderAll();
}

function addTask(value) {
  const text = value.trim();
  if (!text) return;
  getEntry().tasks.push({ id: createId(), text, done: false });
  queueSave();
  elements.taskInput.value = "";
  renderAll();
  elements.taskInput.focus();
}

function toggleTask(id) {
  const task = getEntry().tasks.find((item) => item.id === id);
  if (!task) return;
  task.done = !task.done;
  queueSave();
  renderAll();
}

function deleteTask(id) {
  getEntry().tasks = getEntry().tasks.filter((task) => task.id !== id);
  queueSave();
  renderAll();
}

function openBackup() {
  const count = Object.values(state.entries).filter(hasEntry).length;
  elements.backupSummary.textContent = `${count}일의 기록이 이 기기에 저장되어 있어요.`;
  elements.backupModal.hidden = false;
  document.body.classList.add("modal-open");
  elements.backupModal.querySelector(".modal-close").focus();
}

function closeBackup() {
  elements.backupModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function exportData() {
  const payload = {
    app: "하루기록",
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: state.entries,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `하루기록-${toISODate(new Date())}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("기록을 파일로 내보냈어요.");
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const source = parsed.entries && typeof parsed.entries === "object" ? parsed.entries : parsed;
      const incoming = Object.fromEntries(Object.entries(source).map(([date, entry]) => [date, normalizeEntry(entry)]));
      if (!Object.keys(incoming).length) throw new Error("empty");
      const shouldReplace = window.confirm("현재 기록을 가져온 파일로 바꿀까요?\n취소를 누르면 기존 기록에 이어서 합칩니다.");
      state.entries = shouldReplace ? incoming : { ...state.entries, ...incoming };
      saveEntries();
      renderAll();
      closeBackup();
      showToast(shouldReplace ? "기록을 불러왔어요." : "기록을 기존 기록에 합쳤어요.");
    } catch {
      showToast("불러올 수 있는 하루기록 파일이 아니에요.");
    } finally {
      elements.importInput.value = "";
    }
  });
  reader.readAsText(file);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
}

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    switchView(viewButton.dataset.view);
    return;
  }

  const dateAction = event.target.closest("[data-date-action]");
  if (dateAction) {
    if (dateAction.dataset.dateAction === "today") selectDate(toISODate(today), true);
    if (dateAction.dataset.dateAction === "prev") selectDate(shiftDate(state.selectedDate, -1));
    if (dateAction.dataset.dateAction === "next") selectDate(shiftDate(state.selectedDate, 1));
    return;
  }

  const monthAction = event.target.closest("[data-month-action]");
  if (monthAction) {
    state.calendarDate.setMonth(state.calendarDate.getMonth() + (monthAction.dataset.monthAction === "next" ? 1 : -1));
    renderCalendar();
    return;
  }

  const calendarDate = event.target.closest("[data-calendar-date]");
  if (calendarDate) {
    selectDate(calendarDate.dataset.calendarDate);
    return;
  }

  const taskToggle = event.target.closest("[data-task-toggle]");
  if (taskToggle) {
    toggleTask(taskToggle.dataset.taskToggle);
    return;
  }

  const taskDelete = event.target.closest("[data-task-delete]");
  if (taskDelete) {
    deleteTask(taskDelete.dataset.taskDelete);
    return;
  }

  const energyButton = event.target.closest("[data-energy]");
  if (energyButton) {
    const value = Number(energyButton.dataset.energy);
    getEntry().energy = getEntry().energy === value ? null : value;
    queueSave();
    renderAll();
    return;
  }

  const action = event.target.closest("[data-action]");
  if (!action) return;
  if (action.dataset.action === "open-backup") openBackup();
  if (action.dataset.action === "close-backup") closeBackup();
  if (action.dataset.action === "export-data") exportData();
  if (action.dataset.action === "import-data") elements.importInput.click();
  if (action.dataset.action === "open-selected-day") switchView("today");
});

document.addEventListener("input", (event) => {
  const field = event.target.closest("[data-field]");
  if (!field) return;
  const entry = getEntry();
  entry[field.dataset.field] = field.value;
  if (field.dataset.field === "note") elements.noteCount.textContent = `${field.value.length}자`;
  queueSave();
});

elements.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addTask(elements.taskInput.value);
});

elements.importInput.addEventListener("change", (event) => importData(event.target.files?.[0]));

elements.backupModal.addEventListener("click", (event) => {
  if (event.target === elements.backupModal) closeBackup();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.backupModal.hidden) closeBackup();
});

window.addEventListener("beforeunload", () => {
  window.clearTimeout(saveTimer);
  saveEntries();
});

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}

renderAll();
