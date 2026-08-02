const STORAGE_KEY = "daylist-planner-v1";
const DAY_NAMES = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
const DAY_SHORT_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
const MEAL_LABELS = { breakfast: "아침", lunch: "점심", dinner: "저녁" };

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
  doneForm: document.querySelector("#doneForm"),
  doneTime: document.querySelector("#doneTime"),
  doneText: document.querySelector("#doneText"),
  doneList: document.querySelector("#doneList"),
  doneEmpty: document.querySelector("#doneEmpty"),
  doneCount: document.querySelector("#doneCount"),
  taskForm: document.querySelector("#taskForm"),
  taskInput: document.querySelector("#taskInput"),
  taskList: document.querySelector("#taskList"),
  taskEmpty: document.querySelector("#taskEmpty"),
  taskProgress: document.querySelector("#taskProgress"),
  reminderForm: document.querySelector("#reminderForm"),
  reminderTime: document.querySelector("#reminderTime"),
  reminderText: document.querySelector("#reminderText"),
  reminderList: document.querySelector("#reminderList"),
  reminderEmpty: document.querySelector("#reminderEmpty"),
  notificationPermissionButton: document.querySelector("#notificationPermissionButton"),
  notificationStatus: document.querySelector("#notificationStatus"),
  meals: {
    breakfast: document.querySelector("#breakfastInput"),
    lunch: document.querySelector("#lunchInput"),
    dinner: document.querySelector("#dinnerInput"),
  },
  calendarMonthLabel: document.querySelector("#calendarMonthLabel"),
  calendarGrid: document.querySelector("#calendarGrid"),
  selectedDayTitle: document.querySelector("#selectedDayTitle"),
  selectedDaySummary: document.querySelector("#selectedDaySummary"),
  selectedDayDone: document.querySelector("#selectedDayDone"),
  selectedDayReminders: document.querySelector("#selectedDayReminders"),
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
  return {
    done: "",
    doneItems: [],
    tasks: [],
    meals: { breakfast: "", lunch: "", dinner: "" },
    reminders: [],
    review: null,
  };
}

function loadEntries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const source = parsed.entries && typeof parsed.entries === "object" ? parsed.entries : parsed;
    return Object.fromEntries(Object.entries(source || {}).map(([date, entry]) => [date, normalizeEntry(entry)]));
  } catch {
    return {};
  }
}

function normalizeEntry(entry) {
  const oldDone = [entry?.done, entry?.note, entry?.focus].find((value) => typeof value === "string") || "";
  const sourceDoneItems = Array.isArray(entry?.doneItems) ? entry.doneItems : [];
  const normalizedDoneItems = sourceDoneItems
    .filter((item) => item && typeof item.text === "string" && item.text.trim())
    .map((item) => ({
      id: String(item.id || createId()),
      time: /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time) ? item.time : "",
      text: item.text.trim().slice(0, 120),
    }));
  if (!normalizedDoneItems.length && oldDone.trim()) {
    oldDone
      .split(/\r?\n/)
      .map((text) => text.trim())
      .filter(Boolean)
      .forEach((text) => normalizedDoneItems.push({ id: createId(), time: "", text: text.slice(0, 120) }));
  }
  const tasks = Array.isArray(entry?.tasks) ? entry.tasks : [];
  const reminders = Array.isArray(entry?.reminders) ? entry.reminders : [];
  const sourceMeals = entry?.meals && typeof entry.meals === "object" ? entry.meals : {};
  return {
    done: normalizedDoneItems.map((item) => item.text).join("\n"),
    doneItems: normalizedDoneItems,
    tasks: tasks
      .filter((task) => task && typeof task.text === "string")
      .map((task) => ({
        id: String(task.id || createId()),
        text: task.text.slice(0, 120),
        done: Boolean(task.done),
      })),
    meals: {
      breakfast: typeof sourceMeals.breakfast === "string" ? sourceMeals.breakfast.slice(0, 120) : "",
      lunch: typeof sourceMeals.lunch === "string" ? sourceMeals.lunch.slice(0, 120) : "",
      dinner: typeof sourceMeals.dinner === "string" ? sourceMeals.dinner.slice(0, 120) : "",
    },
    reminders: reminders
      .filter((reminder) => reminder && /^([01]\d|2[0-3]):[0-5]\d$/.test(reminder.time) && typeof reminder.text === "string")
      .map((reminder) => ({
        id: String(reminder.id || createId()),
        time: reminder.time,
        text: reminder.text.slice(0, 80),
        enabled: reminder.enabled !== false,
        notifiedDate: typeof reminder.notifiedDate === "string" ? reminder.notifiedDate : null,
      })),
    review: entry?.review && typeof entry.review === "object" ? entry.review : null,
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
      JSON.stringify({ version: 3, updatedAt: new Date().toISOString(), entries: state.entries }),
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

function summarizeText(value) {
  return value.trim().split("\n")[0].slice(0, 70);
}

function hasEntry(entry) {
  return Boolean(
    entry &&
      (entry.done.trim() ||
        Object.values(entry.meals).some((meal) => meal.trim()) ||
        entry.tasks.length ||
        entry.reminders.length ||
        (entry.review && Object.values(entry.review).some(Boolean))),
  );
}

function countMeals(entry) {
  return Object.values(entry?.meals || {}).filter((meal) => meal.trim()).length;
}

function getNotificationPermission() {
  if (!window.isSecureContext || !("Notification" in window)) return "unsupported";
  return Notification.permission;
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

  elements.todayWeekday.textContent = isToday ? "오늘" : DAY_NAMES[date.getDay()];
  elements.todayDateLabel.textContent = formatDateLabel(state.selectedDate);
  elements.heroDayNumber.textContent = String(date.getDate()).padStart(2, "0");
  elements.heroKicker.textContent = isToday ? "TODAY · 오늘을 남겨보세요" : `${DAY_SHORT_NAMES[date.getDay()].toUpperCase()} · 하루 기록`;
  elements.heroMessage.textContent = isToday
    ? "한 일, 할 일, 먹은 것만 간단하게 적어도 충분해요."
    : isFuture
      ? "미리 적어두고 싶은 할 일을 남겨보세요."
      : "그날의 기록을 다시 펼쳐보세요. 한 줄이면 충분해요.";

  elements.doneCount.textContent = `${entry.doneItems.length}개`;
  Object.entries(elements.meals).forEach(([meal, input]) => {
    if (document.activeElement !== input) input.value = entry.meals[meal];
  });
  renderDoneItems(entry);
  renderTasks(entry);
  renderReminders(entry);
}

function renderDoneItems(entry) {
  elements.doneEmpty.hidden = entry.doneItems.length > 0;
  elements.doneList.innerHTML = entry.doneItems
    .map(
      (item) => `
        <li class="done-item">
          <span class="done-check" aria-hidden="true">✓</span>
          <time class="done-time${item.time ? "" : " is-empty"}" datetime="${item.time}">${item.time || "기록"}</time>
          <span class="done-text" title="${escapeHTML(item.text)}">${escapeHTML(item.text)}</span>
          <button class="done-delete" type="button" data-done-delete="${escapeHTML(item.id)}" aria-label="한 일 삭제">×</button>
        </li>`,
    )
    .join("");
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

function renderReminders(entry) {
  const permission = getNotificationPermission();
  const canRequest = permission !== "unsupported";
  const granted = permission === "granted";
  const hasSecureContext = window.isSecureContext;

  elements.notificationPermissionButton.disabled = !canRequest || granted;
  elements.notificationPermissionButton.classList.toggle("is-granted", granted);
  elements.notificationPermissionButton.textContent = granted ? "알림 켜짐" : permission === "denied" ? "알림 차단됨" : "알림 켜기";
  if (!hasSecureContext || !canRequest) {
    elements.notificationStatus.textContent = "GitHub Pages 주소나 홈 화면 앱에서 알림을 켤 수 있어요.";
  } else if (granted) {
    elements.notificationStatus.textContent = "알림을 켜두면 정한 시간에 이 기기에서 알려드려요.";
  } else if (permission === "denied") {
    elements.notificationStatus.textContent = "브라우저 설정에서 하루기록의 알림 권한을 허용해주세요.";
  } else {
    elements.notificationStatus.textContent = "알림을 켜면 정한 시간에 이 기기에서 알려드려요.";
  }

  elements.reminderEmpty.hidden = entry.reminders.length > 0;
  elements.reminderList.innerHTML = entry.reminders
    .map(
      (reminder) => `
        <li class="reminder-item${reminder.enabled ? "" : " is-disabled"}">
          <button class="reminder-toggle${reminder.enabled ? " is-enabled" : ""}" type="button" data-reminder-toggle="${escapeHTML(reminder.id)}" aria-label="${reminder.enabled ? "알림 끄기" : "알림 켜기"}: ${escapeHTML(reminder.text)}">${reminder.enabled ? "✓" : ""}</button>
          <time class="reminder-time" datetime="${reminder.time}">${reminder.time}</time>
          <span class="reminder-text" title="${escapeHTML(reminder.text)}">${escapeHTML(reminder.text)}</span>
          <button class="reminder-delete" type="button" data-reminder-delete="${escapeHTML(reminder.id)}" aria-label="알림 삭제">×</button>
        </li>`,
    )
    .join("");
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
    const markerRecord = hasEntry(entry);
    const markerDone = entry?.tasks?.some((task) => task.done);
    cells.push(`
      <button class="calendar-day${isOutside ? " is-outside" : ""}${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}" type="button" role="gridcell" data-calendar-date="${iso}" aria-label="${formatDateLabel(iso)}${markerRecord ? ", 기록 있음" : ""}">
        <span class="day-number">${date.getDate()}</span>
        <span class="day-markers" aria-hidden="true">${markerRecord ? '<i class="has-note"></i>' : ""}${markerDone ? '<i class="is-complete"></i>' : ""}</span>
      </button>`);
  }
  elements.calendarGrid.innerHTML = cells.join("");

  const selectedEntry = getEntry(state.selectedDate);
  const done = selectedEntry.tasks.filter((task) => task.done).length;
  const meals = Object.entries(selectedEntry.meals)
    .filter(([, meal]) => meal.trim())
    .map(([meal, text]) => `${MEAL_LABELS[meal]} ${summarizeText(text)}`)
    .join(" · ");
  elements.selectedDayTitle.textContent = formatDateLabel(state.selectedDate);
  elements.selectedDaySummary.textContent = summarizeText(selectedEntry.done) || meals || (selectedEntry.tasks.length ? `${selectedEntry.tasks.length}개의 할 일이 있어요.` : selectedEntry.reminders.length ? `${selectedEntry.reminders.length}개의 알림이 있어요.` : "아직 기록이 없어요.");
  elements.selectedDayDone.textContent = `${done} / ${selectedEntry.tasks.length}`;
  elements.selectedDayReminders.textContent = selectedEntry.reminders.length;
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
  elements.insightHeadline.textContent = stats.loggedDays === 0 ? "오늘부터 하루를 시작해요." : stats.loggedDays >= 5 ? "꾸준함이 조용히 쌓이고 있어요." : "나만의 속도로 잘 가고 있어요.";
  elements.insightSubline.textContent = stats.loggedDays === 0 ? "한 일, 할 일, 식단 중 하나만 적어도 기록이에요." : `${stats.loggedDays}일의 기록이 지난 한 주를 만들었어요.`;
  elements.weekChart.innerHTML = stats.entries
    .map(({ date, entry }) => {
      const logged = hasEntry(entry);
      const done = entry?.tasks?.filter((task) => task.done).length || 0;
      const amount = logged ? Math.max(24, Math.min(100, 35 + done * 14 + (entry?.done?.trim() ? 20 : 0) + countMeals(entry) * 10 + (entry?.reminders?.length || 0) * 7)) : 8;
      const isToday = date === toISODate(today);
      return `<div class="week-bar-group" title="${formatDateLabel(date)}"><div class="week-bar-track"><span class="week-bar${logged ? " has-entry" : ""}${isToday ? " is-today" : ""}" style="height:${amount}%"></span></div><span class="week-bar-label${isToday ? " is-today" : ""}">${DAY_SHORT_NAMES[parseISODate(date).getDay()]}${entry?.tasks?.length ? ` · ${done}` : ""}</span></div>`;
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

function syncDoneText(entry) {
  entry.done = entry.doneItems.map((item) => item.text).join("\n");
}

function setDefaultDoneTime() {
  const now = new Date();
  elements.doneTime.value = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function addDoneItem() {
  const time = elements.doneTime.value;
  const text = elements.doneText.value.trim();
  if (!time || !text) {
    showToast("시간과 한 일 내용을 모두 적어주세요.");
    return;
  }
  const entry = getEntry();
  entry.doneItems.push({ id: createId(), time, text });
  syncDoneText(entry);
  queueSave();
  elements.doneText.value = "";
  renderAll();
  elements.doneText.focus();
}

function deleteDoneItem(id) {
  const entry = getEntry();
  entry.doneItems = entry.doneItems.filter((item) => item.id !== id);
  syncDoneText(entry);
  queueSave();
  renderAll();
}

function setDefaultReminderTime() {
  const rounded = new Date();
  rounded.setSeconds(0, 0);
  rounded.setMinutes(rounded.getMinutes() + (30 - (rounded.getMinutes() % 30)));
  elements.reminderTime.value = `${String(rounded.getHours()).padStart(2, "0")}:${String(rounded.getMinutes()).padStart(2, "0")}`;
}

function addReminder() {
  const time = elements.reminderTime.value;
  const text = elements.reminderText.value.trim();
  if (!time || !text) {
    showToast("시간과 알림 내용을 모두 적어주세요.");
    return;
  }
  getEntry().reminders.push({ id: createId(), time, text, enabled: true, notifiedDate: null });
  queueSave();
  elements.reminderText.value = "";
  renderAll();
  elements.reminderText.focus();
}

function toggleReminder(id) {
  const reminder = getEntry().reminders.find((item) => item.id === id);
  if (!reminder) return;
  reminder.enabled = !reminder.enabled;
  reminder.notifiedDate = null;
  queueSave();
  renderAll();
}

function deleteReminder(id) {
  getEntry().reminders = getEntry().reminders.filter((reminder) => reminder.id !== id);
  queueSave();
  renderAll();
}

async function requestNotifications() {
  if (getNotificationPermission() === "unsupported") {
    showToast("GitHub Pages 주소나 홈 화면 앱에서 알림을 켤 수 있어요.");
    return;
  }
  let permission = "denied";
  try {
    permission = await Notification.requestPermission();
  } catch {
    showToast("브라우저 설정에서 알림 권한을 확인해주세요.");
    return;
  }
  renderAll();
  showToast(permission === "granted" ? "알림을 켰어요." : "알림 권한이 허용되지 않았어요.");
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function checkDueReminders() {
  const dateKey = toISODate(new Date());
  const entry = state.entries[dateKey];
  if (!entry?.reminders?.length) return;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  entry.reminders.forEach((reminder) => {
    const elapsed = currentMinutes - timeToMinutes(reminder.time);
    if (!reminder.enabled || reminder.notifiedDate === dateKey || elapsed < 0 || elapsed > 5) return;
    reminder.notifiedDate = dateKey;
    queueSave();
    void fireReminder(reminder);
  });
}

async function fireReminder(reminder) {
  const permission = getNotificationPermission();
  if (permission === "granted") {
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification("하루기록 알림", {
          body: reminder.text,
          icon: "./icon.svg",
          tag: `daylist-reminder-${reminder.id}`,
          data: { url: "./" },
        });
        return;
      }
      new Notification("하루기록 알림", { body: reminder.text, icon: "./icon.svg" });
      return;
    } catch {
      // Fall through to the in-app message when the browser notification is unavailable.
    }
  }
  showToast(`알림 · ${reminder.text}`);
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
    version: 3,
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

  const doneDelete = event.target.closest("[data-done-delete]");
  if (doneDelete) {
    deleteDoneItem(doneDelete.dataset.doneDelete);
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

  const reminderToggle = event.target.closest("[data-reminder-toggle]");
  if (reminderToggle) {
    toggleReminder(reminderToggle.dataset.reminderToggle);
    return;
  }

  const reminderDelete = event.target.closest("[data-reminder-delete]");
  if (reminderDelete) {
    deleteReminder(reminderDelete.dataset.reminderDelete);
    return;
  }

  const action = event.target.closest("[data-action]");
  if (!action) return;
  if (action.dataset.action === "open-backup") openBackup();
  if (action.dataset.action === "close-backup") closeBackup();
  if (action.dataset.action === "export-data") exportData();
  if (action.dataset.action === "import-data") elements.importInput.click();
  if (action.dataset.action === "open-selected-day") switchView("today");
  if (action.dataset.action === "request-notifications") void requestNotifications();
});

document.addEventListener("input", (event) => {
  const field = event.target.closest("[data-field]");
  if (!field) return;
  const entry = getEntry();
  if (field.dataset.field === "done") {
    entry.done = field.value;
    elements.doneCount.textContent = `${field.value.length}자`;
  } else if (field.dataset.field.startsWith("meal-")) {
    const meal = field.dataset.field.replace("meal-", "");
    if (meal in entry.meals) entry.meals[meal] = field.value;
  }
  queueSave();
});

elements.doneForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addDoneItem();
});

elements.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addTask(elements.taskInput.value);
});

elements.reminderForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addReminder();
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
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js?v=4").catch(() => {}));
}

setDefaultDoneTime();
setDefaultReminderTime();
window.setInterval(checkDueReminders, 15000);
renderAll();
